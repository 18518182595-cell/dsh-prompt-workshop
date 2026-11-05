/** dsh-prompt-workshop — periodic web collection that feeds the knowledge overlay.
 *
 * Uses the host's provider-neutral web service (ctx.web) for search/fetch and
 * ctx.llm for one structured extraction call. Everything is guarded: a missing
 * web provider, credential problem or model failure is reported, recorded in
 * the knowledge stats and never crashes the host plugin.
 */
import { loadPresets, targets } from './presets.js'
import { loadStore } from './store.js'
import {
  loadKnowledge, saveKnowledge, knowledgeSummary, buildCollectorPrompt,
  parseCollectorResult, foldCollectorResult, addReport, nextCheckAt, shouldCollect,
  DEFAULT_INTERVAL_DAYS,
} from './knowledge.js'
import { listCatalog, resolveEnhancer, labelOf, complete, PromptStudioError, isModelRef, modelRef, errorText } from './llm.js'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dshHome } from './store.js'

const MAX_QUERIES = 8
const MAX_SOURCES_PER_QUERY = 5
const MAX_FETCH_PAGES = 5
const MAX_PAGE_CHARS = 14000
const MAX_MATERIALS_CHARS = 45000
const COLLECT_MAX_TOKENS = 12000

let running = null

export function isCollecting() {
  return running !== null
}

function getWeb(ctx) {
  try {
    const direct = ctx && ctx.web
    if (direct && (typeof direct.search === 'function' || typeof direct.fetch === 'function')) return direct
  } catch { /* not injected */ }
  try {
    return ctx && typeof ctx.get === 'function' ? ctx.get('web') : undefined
  } catch {
    return undefined
  }
}

function getService(ctx, name) {
  try {
    const direct = ctx && ctx[name]
    if (direct) return direct
  } catch { /* fall through */ }
  try {
    return ctx && typeof ctx.get === 'function' ? ctx.get(name) : undefined
  } catch {
    return undefined
  }
}

/** web.fetch with a hard per-request timeout so one slow source cannot stall a round. */
async function fetchWithTimeout(web, url, signal, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs || 20000)
  let combined = controller.signal
  try {
    if (signal && typeof AbortSignal.any === 'function') combined = AbortSignal.any([signal, controller.signal])
    else if (signal) combined = controller.signal
  } catch { combined = controller.signal }
  try {
    return await web.fetch({ url, signal: combined })
  } finally {
    clearTimeout(timer)
  }
}

function currentEnhancer(ctx, store, catalog) {
  const settings = (store && store.defaults) || {}
  if (settings.enhancerProvider && settings.enhancerModel) {
    return { provider: settings.enhancerProvider, model: settings.enhancerModel, label: labelOf(catalog, modelRef(settings.enhancerProvider, settings.enhancerModel)), source: 'settings' }
  }
  const enhancer = resolveEnhancer(ctx, store, null, catalog)
  if (!enhancer) return null
  return { ...enhancer, label: labelOf(catalog, enhancer) || (enhancer.provider + ' / ' + enhancer.model) }
}

const ZENDESK_ARTICLE_SOURCES = [
  'https://docs.midjourney.com/api/v2/help_center/en-us/articles.json?per_page=30',
]

/** Flatten a Zendesk help-center article list into page-like text blocks. */
export function zendeskArticles(json) {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const articles = data && Array.isArray(data.articles) ? data.articles : []
    const wanted = /parameter|version|prompt|style|reference|video|sref|oref|stylize|weird|raw|image/i
    return articles
      .filter((article) => article && wanted.test(String(article.title || '')))
      .map((article) => ({
        url: String(article.html_url || article.url || 'https://docs.midjourney.com/'),
        title: String(article.title || ''),
        status: 200,
        text: stripHtml(String(article.body || '')).slice(0, MAX_PAGE_CHARS),
      }))
      .filter((article) => article.text.length >= 120)
      .slice(0, 8)
  } catch {
    return []
  }
}

const OFFICIAL_DOC_SEEDS = [
  'https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List',
  'https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version',
  'https://platform.openai.com/docs/guides/image-generation',
  'https://ai.google.dev/gemini-api/docs/video',
  'https://docs.dev.runwayml.com/guides/prompting/',
  'https://github.com/Wan-Video/Wan2.2',
  'https://www.volcengine.com/docs/82379/1520757',
  'https://docs.bfl.ai/',
]

const RSS_BASE = 'https://cn.bing.com/search?format=rss&count=10&q='
const RSS_QUERIES = [
  'site:docs.midjourney.com Midjourney parameter prompt guide',
  'site:platform.openai.com image generation prompt guide',
  'site:docs.blackforestlabs.ai FLUX prompt guide',
  'site:ai.google.dev Veo video generation prompt guide',
  'site:docs.dev.runwayml.com Gen-4 prompt guide',
  'site:platform.minimaxi.com Hailuo video prompt',
  'site:volcengine.com 豆包 Seedream Seedance 提示词',
  'site:github.com Wan2.2 prompt guide',
  'Midjourney 新版本 参数 提示词 2026 年 11 月 更新',
  '可灵 Kling 4.0 提示词 运镜 参数 新版本',
  '豆包 Seedream 5.0 提示词 指南 更新',
  'Sora 2 Veo 3.1 提示词 指南 新版本',
]

function decodeXml(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function xmlTag(block, tag) {
  const match = new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>').exec(block)
  return match ? decodeXml(match[1]) : ''
}

/** Parse one Bing RSS document into search-source entries. */
export function parseBingRss(xml, query) {
  const text = String(xml || '')
  const items = []
  const blocks = text.match(/<item>[\s\S]*?<\/item>/g) || []
  for (const block of blocks) {
    const url = xmlTag(block, 'link')
    if (!/^https?:\/\//i.test(url)) continue
    items.push({
      query: query || '',
      url,
      title: xmlTag(block, 'title') || url,
      snippet: xmlTag(block, 'description').slice(0, 1400),
      publishedAt: xmlTag(block, 'pubDate'),
    })
  }
  return items
}

/** Anonymous Bing RSS fallback used when ctx.web.search has no credential. */
export async function rssSearch(ctx, queries, signal) {
  const web = getWeb(ctx)
  const sources = []
  const errors = []
  const seen = new Set()
  for (const query of queries) {
    if (signal && signal.aborted) break
    try {
      const page = await fetchWithTimeout(web, RSS_BASE + encodeURIComponent(query), signal, 20000)
      const body = page && page.body ? page.body.content : ''
      for (const item of parseBingRss(body, query)) {
        if (seen.has(item.url)) continue
        seen.add(item.url)
        sources.push(item)
      }
    } catch (error) {
      errors.push('Bing RSS（' + query + '）：' + errorText(error))
    }
  }
  return { sources, errors }
}

/** Search queries for one collection round: generic + high-value targets. */
export function buildQueries(sinceDays, nowMs) {
  const year = new Date(nowMs || Date.now()).getFullYear()
  const base = [
    'AI image generation prompt guide update ' + year + ' new model parameters',
    'AI video generation prompt guide update ' + year + ' new model',
    'Midjourney latest version new parameters prompt guide ' + year,
    'FLUX model prompt guide update ' + year,
    'GPT-Image prompt guide update ' + year,
    '豆包 Seedream Seedance 提示词 新版本 参数 指南 ' + year,
    '可灵 Kling 提示词 运镜 参数 新版本 ' + year,
    'Sora Veo Runway video prompt guide new version ' + year,
  ]
  return base.slice(0, MAX_QUERIES).map((query) => query + '（关注最近 ' + sinceDays + ' 天的新消息）')
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function pageText(page) {
  if (!page) return ''
  const body = page.body || {}
  if (body.kind === 'text') return String(body.content || '')
  return stripHtml(body.content || '')
}

/** Run one full collection round (shared by the schedule tick and the HTTP route). */
export async function collectKnowledge(ctx, options) {
  if (running) return running
  const works = (async () => {
    const startedAt = Date.now()
    const store = loadStore()
    const settings = store.defaults || {}
    const knowledgeSettings = settings.knowledge || {}
    const sinceDays = Number((options && options.sinceDays) || knowledgeSettings.intervalDays) > 0
      ? Number((options && options.sinceDays) || knowledgeSettings.intervalDays)
      : DEFAULT_INTERVAL_DAYS
    const signal = options && options.signal
    const web = getWeb(ctx)
    if (!web || typeof web.fetch !== 'function') {
      throw new PromptStudioError('KNOWLEDGE_NO_WEB', '当前 DSH 组合没有可用的 web 服务（ctx.web），无法自动收集知识更新')
    }
    const queries = buildQueries(sinceDays, Date.now())
    const foundSources = []
    const seenUrls = new Set()
    const searchErrors = []
    if (typeof web.search === 'function') for (const query of queries) {
      if (signal && signal.aborted) throw new PromptStudioError('ABORTED', '知识库收集已取消')
      try {
        const result = await web.search({ query, maxResults: MAX_SOURCES_PER_QUERY, signal })
        const answer = result && typeof result.answer === 'string' ? result.answer.trim() : ''
        if (answer) foundSources.push({ query, url: '', title: '搜索摘要', snippet: answer.slice(0, 1500) })
        for (const source of (result && result.sources) || []) {
          if (!source || typeof source.url !== 'string' || !/^https?:\/\//i.test(source.url)) continue
          if (seenUrls.has(source.url)) continue
          seenUrls.add(source.url)
          foundSources.push({ query, url: source.url, title: String(source.title || source.url), snippet: String(source.snippet || '').slice(0, 1200), publishedAt: source.publishedAt || '' })
        }
      } catch (error) {
        searchErrors.push(query + '：' + errorText(error))
      }
    }
    if (foundSources.length === 0 || foundSources.filter((source) => source.url).length < 6) {
      // No credential for the model-backed search provider (e.g. scheduled runs
      // outside a session) — fall back to anonymous Bing RSS, which needs no key.
      const rss = await rssSearch(ctx, RSS_QUERIES.slice(0, 10), signal)
      if (rss.sources.length > 0) searchErrors.push('（web.search 结果不足，已补充 Bing RSS 结果 ' + rss.sources.length + ' 条）')
      for (const item of rss.sources) {
        if (seenUrls.has(item.url)) continue
        seenUrls.add(item.url)
        foundSources.push(item)
      }
      if (rss.errors.length) searchErrors.push(...rss.errors.slice(0, 3))
    }
    if (foundSources.filter((source) => source.url).length === 0) {
      throw new PromptStudioError('KNOWLEDGE_NO_RESULTS', '联网检索没有返回可用结果：' + (searchErrors.slice(0, 3).join('；') || '未知原因'))
    }
    // Fetch a few pages for real content (prefer results that look official).
    const pages = []
    const fetchCandidates = foundSources.filter((source) => source.url)
    const ranked = fetchCandidates.slice().sort((a, b) => scoreUrl(b.url) - scoreUrl(a.url)).slice(0, MAX_FETCH_PAGES)
    for (const source of ranked) {
      if (signal && signal.aborted) throw new PromptStudioError('ABORTED', '知识库收集已取消')
      try {
        const page = await fetchWithTimeout(web, source.url, signal, 20000)
        const text = pageText(page)
        if (text.length >= 80) pages.push({ url: page.finalUrl || source.url, title: source.title, status: page.status, text: text.slice(0, MAX_PAGE_CHARS) })
      } catch { /* one fetch failure must not kill the round */ }
    }
    // Always try a small set of official documentation pages; RSS results often
    // lack authoritative rule text, and these URLs rarely change path.
    const seeded = []
    for (const url of OFFICIAL_DOC_SEEDS.slice(0, 6)) {
      if (signal && signal.aborted) break
      try {
        const page = await fetchWithTimeout(web, url, signal, 20000)
        const text = pageText(page)
        if (text.length >= 200) seeded.push({ url: (page && page.finalUrl) || url, title: page.title || url, status: page.status, text: text.slice(0, MAX_PAGE_CHARS) })
      } catch { /* seeds are best effort */ }
    }
    for (const page of seeded) {
      if (!pages.some((existing) => existing.url === page.url)) pages.push(page)
    }
    for (const source of ZENDESK_ARTICLE_SOURCES) {
      if (signal && signal.aborted) break
      try {
        const page = await fetchWithTimeout(web, source, signal, 15000)
        const body = page && page.body ? page.body.content : ''
        const articles = zendeskArticles(body)
        for (const article of articles) {
          if (!pages.some((existing) => existing.url === article.url)) pages.push(article)
        }
      } catch { /* help-center API is best effort */ }
    }
    seeded.push(...pages.filter((page) => !seeded.includes(page)))
    const materials = buildMaterials(foundSources, pages).slice(0, MAX_MATERIALS_CHARS)
    const catalog = await listCatalog(ctx)
    const enhancer = currentEnhancer(ctx, store, catalog)
    if (!enhancer || !isModelRef(enhancer)) {
      throw new PromptStudioError('KNOWLEDGE_NO_MODEL', '没有可用的大模型来提炼知识更新，请先在 DSH 设置中配置模型')
    }
    const prompt = buildCollectorPrompt({
      base: loadPresets(),
      sinceDays,
      now: Date.now(),
      pendingText: (knowledgeSummary(loadKnowledge(), knowledgeSettings).lastReport || {}).report || '',
      materials,
    })
    const completion = await complete(ctx, {
      provider: enhancer.provider,
      model: enhancer.model,
      text: prompt,
      maxTokens: COLLECT_MAX_TOKENS,
      signal,
    })
    const parsed = parseCollectorResult(completion.text)
    if (!parsed) {
      saveCollectorDebug({
        reason: 'non-json',
        model: enhancer.label || (enhancer.provider + ' / ' + enhancer.model),
        promptChars: prompt.length,
        materialsChars: materials.length,
        rawHead: String(completion.text || '').slice(0, 3000),
        rawTail: String(completion.text || '').slice(-1500),
        rawChars: String(completion.text || '').length,
      })
      throw new PromptStudioError('KNOWLEDGE_BAD_JSON', '知识库提炼模型没有返回可解析的 JSON（原始输出已存到 ~/.dsh/prompt-workshop-collect-debug.json），本轮未应用更新；片段：' + String(completion.text || '').slice(0, 200).replace(/\s+/g, ' '))
    }
    const previous = loadKnowledge()
    const next = foldCollectorResult(previous, parsed, {
      now: Date.now(),
      sinceDays,
      settings: knowledgeSettings,
      model: enhancer.label || (enhancer.provider + ' / ' + enhancer.model),
    })
    saveKnowledge(next)
    const tookMs = Date.now() - startedAt
    return {
      ok: true,
      tookMs,
      sinceDays,
      model: enhancer.label || (enhancer.provider + ' / ' + enhancer.model),
      queries: queries.length,
      sources: parsed.sources.length,
      foundSources: foundSources.length,
      fetchedPages: pages.length,
      seedPages: seeded.length,
      counts: next.reports[0].counts,
      report: parsed.report,
      updatedAt: next.updatedAt,
      nextCheckAt: next.nextCheckAt,
      knowledge: knowledgeSummary(next, knowledgeSettings),
      searchErrors,
    }
  })()
  running = works
  try {
    return await works
  } catch (error) {
    try {
      const knowledge = loadKnowledge()
      const doc = addReport(knowledge, {
        at: Date.now(),
        sinceDays: (options && options.sinceDays) || DEFAULT_INTERVAL_DAYS,
        model: '',
        report: errorText(error),
        ok: false,
        counts: { targetsUpdated: 0, newTargets: 0, styles: 0, sources: 0 },
      })
      doc.nextCheckAt = nextCheckAt((loadStore().defaults || {}).knowledge || {}, Date.now())
      saveKnowledge(doc)
    } catch { /* stats are best effort */ }
    throw error
  } finally {
    running = null
  }
}

function saveCollectorDebug(payload) {
  try {
    const file = join(dshHome(), 'prompt-workshop-collect-debug.json')
    writeFileSync(file, JSON.stringify({ ...payload, at: new Date().toISOString() }, null, 2) + '\n', 'utf8')
  } catch { /* debug snapshot is best effort */ }
}

function scoreUrl(url) {
  const text = String(url || '').toLowerCase()
  let score = 0
  if (/midjourney|openai|deepmind|stability|blackforest|runway|kling|volcengine|bytedance|minimax|sora|veo|klingai|doubao/.test(text)) score += 3
  if (/docs|help|official|guide|prompt/.test(text)) score += 2
  if (/github/.test(text)) score += 1
  if (/reddit|twitter|x\.com|youtube/.test(text)) score -= 1
  return score
}

function buildMaterials(sources, pages) {
  const lines = []
  let index = 1
  for (const source of sources.slice(0, 24)) {
    lines.push('### 来源 ' + index + '：' + (source.title || source.url))
    if (source.url) lines.push('URL：' + source.url)
    if (source.snippet) lines.push('摘要：' + source.snippet)
    lines.push('')
    index += 1
  }
  lines.push('### 页面正文（抓取到的原文，已去标签）')
  for (const page of pages) {
    lines.push('#### ' + (page.title || page.url))
    lines.push('URL：' + page.url)
    lines.push(page.text)
    lines.push('')
  }
  return lines.join('\n')
}

/** Scheduler tick: run when due; schedule the first check when unset. */
export async function knowledgeTick(ctx) {
  try {
    const store = loadStore()
    const settings = store.defaults || {}
    const knowledgeSettings = settings.knowledge || {}
    if (knowledgeSettings.autoUpdate === false) return { skipped: 'disabled' }
    const knowledge = loadKnowledge()
    if (!knowledge.nextCheckAt) {
      knowledge.nextCheckAt = nextCheckAt(knowledgeSettings, Date.now())
      saveKnowledge(knowledge)
      return { skipped: 'scheduled-first' }
    }
    if (!shouldCollect(knowledge, knowledgeSettings, Date.now())) return { skipped: 'not-due' }
    if (running) return { skipped: 'running' }
    const outcome = await collectKnowledge(ctx, {})
    try { ctx.logger?.info?.('[dsh-prompt-workshop] knowledge updated: ' + JSON.stringify(outcome.counts)) } catch { /* ignore */ }
    return outcome
  } catch (error) {
    try { ctx.logger?.warn?.('[dsh-prompt-workshop] knowledge tick failed: ' + errorText(error)) } catch { /* ignore */ }
    return { error: errorText(error) }
  }
}

export { loadKnowledge, knowledgeSummary }
