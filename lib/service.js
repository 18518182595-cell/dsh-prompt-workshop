/** dsh-prompt-workshop — high-level operations shared by tools and HTTP routes.
 * Everything user-visible goes through here so the agent tool and the panel
 * always behave identically.
 */
import { loadStore, patchStore, appendHistory, removeHistory, clearHistory } from './store.js'
import {
  loadPresets, resolveTarget, resolveTaskType, resolveStyle, defaultTargetFor,
  targets, styles, metaForClient,
} from './presets.js'
import {
  buildEnhanceRequest, buildScoreRequest, buildReverseRequest, parseJsonLoose, normalizeResult,
  formatResultForTool, reviewPromptText,
} from './engine.js'
import {
  listCatalog, resolveEnhancer, labelOf, complete, completeWithImage, newEntryId, PromptStudioError, agentDefaultSelection,
  modelRef, isModelRef, errorText,
} from './llm.js'
import { loadKnowledge, knowledgeSummary, defaultKnowledge, saveKnowledge } from './knowledge.js'
import { collectKnowledge } from './collector.js'

export const MAX_INPUT_CHARS = 20000

/** Errors are converted to a safe JSON payload for tools and routes. */
export function fail(code, message, extra) {
  return { ok: false, code, error: message, message: '提示词工坊：' + message, ...(extra || {}) }
}

function unwrap(error) {
  if (error instanceof PromptStudioError) return fail(error.code, error.message)
  return fail('UNEXPECTED', errorText(error))
}

function defaultTaskForKind(kind) {
  if (kind === 'video') return 'text2video'
  if (kind === 'text') return 'general'
  return 'text2image'
}

function parseModelArg(arg, catalog) {
  if (!arg || typeof arg !== 'string') return null
  const text = arg.trim()
  if (!text) return null
  if (text.includes('/')) {
    const index = text.indexOf('/')
    return modelRef(text.slice(0, index), text.slice(index + 1))
  }
  const providers = (catalog && catalog.providers) || []
  for (const provider of providers) {
    const hit = provider.models.find((model) => model.id === text || model.name === text)
    if (hit) return modelRef(provider.id, hit.id)
  }
  return null
}

/** Resolve the target/task/style/enhancer tuple for one operation. */
export function resolveContext(ctx, store, request) {
  const conf = (store && store.defaults) || {}
  const wantTarget = request && (request.targetId || request.target)
  let target = wantTarget ? resolveTarget(wantTarget) : null
  if (wantTarget && !target) {
    return { error: fail('UNKNOWN_TARGET', '未知目标模型「' + wantTarget + '」，可用 ' + targets().map((t) => t.id).join(', ')) }
  }
  const taskType = resolveTaskType((request && (request.taskType || request.task_type)) || conf.taskType)
  if (!target) {
    const kind = taskType ? taskType.kind : 'image'
    target = defaultTargetFor(kind)
  }
  if (!target) return { error: fail('NO_TARGET', '内置目标模型库为空，请检查插件安装是否完整') }
  const kind = target.kind
  const task = taskType || resolveTaskType(defaultTaskForKind(kind))
  const style = resolveStyle((request && (request.styleId || request.style)) || conf.styleId) || null
  const variants = Math.max(1, Math.min(5, Number((request && (request.variants == null ? conf.variants : request.variants)) || 3)))
  const language = String((request && request.language) || conf.language || 'auto')
  const maxTokens = Math.max(512, Math.min(32000, Number((request && request.maxTokens) || conf.maxTokens || 4096)))
  return { target, taskType: task, style, variants, language, maxTokens, conf }
}

function trimHistoryResult(result) {
  if (!result || typeof result !== 'object') return null
  return {
    prompt: String(result.prompt || '').slice(0, 8000),
    negativePrompt: String(result.negativePrompt || '').slice(0, 4000),
    params: result.params || {},
    variations: Array.isArray(result.variations) ? result.variations.slice(0, 6) : [],
    explanation: String(result.explanation || '').slice(0, 2000),
    score: typeof result.score === 'number' ? result.score : null,
    gaps: Array.isArray(result.gaps) ? result.gaps.slice(0, 8) : [],
    targetNotes: String(result.targetNotes || '').slice(0, 1000),
    parseWarning: result.parseWarning || null,
  }
}

/** Enhance one rough idea into a target-ready prompt. */
export async function enhancePrompt(ctx, request, options) {
  try {
    const input = String((request && request.input) || '').trim()
    if (!input) return fail('EMPTY_INPUT', '请先输入你的原始想法（一句话也可以）')
    if (input.length > MAX_INPUT_CHARS) return fail('INPUT_TOO_LONG', '原始想法超过 ' + MAX_INPUT_CHARS + ' 字符，请精简后重试')
    const store = loadStore()
    const resolved = resolveContext(ctx, store, request)
    if (resolved.error) return resolved.error
    const catalog = await listCatalog(ctx)
    const enhancerArg = (request && (request.enhancer || (request.enhancerProvider && request.enhancerModel ? { provider: request.enhancerProvider, model: request.enhancerModel } : null))) || parseModelArg(request && request.model, catalog)
    const sessionModel = options && isModelRef(options.sessionModel) ? options.sessionModel : null
    const enhancer = resolveEnhancer(ctx, store, enhancerArg, catalog, sessionModel)
    if (!enhancer) return fail('NO_MODEL', '没有可用的大模型：请先在 DSH「设置 → 模型」配置模型，或在提示词工坊设置页选择增强模型')
    const enhancerLabel = labelOf(catalog, enhancer) || (enhancer.provider + ' / ' + enhancer.model)
    const text = buildEnhanceRequest({
      input,
      target: resolved.target,
      taskType: resolved.taskType,
      style: resolved.style,
      language: resolved.language,
      variants: resolved.variants,
      extra: request && request.extra,
    })
    const completion = await complete(ctx, {
      provider: enhancer.provider,
      model: enhancer.model,
      text,
      maxTokens: resolved.maxTokens,
      signal: options && options.signal,
    })
    const parsed = parseJsonLoose(completion.text)
    const result = normalizeResult(parsed, { target: resolved.target, variants: resolved.variants, rawText: completion.text })
    if (typeof result.score !== 'number') {
      result.score = reviewPromptText(result.prompt, resolved.target).score
    }
    const historyEntry = {
      id: newEntryId(),
      ts: Date.now(),
      kind: 'enhance',
      input: input.slice(0, 600),
      targetId: resolved.target.id,
      targetLabel: resolved.target.label,
      taskType: resolved.taskType ? resolved.taskType.id : '',
      styleId: resolved.style ? resolved.style.id : '',
      enhancer: { provider: enhancer.provider, model: enhancer.model, label: enhancerLabel, source: enhancer.source },
      result: trimHistoryResult(result),
    }
    appendHistory(historyEntry)
    return {
      ok: true,
      result,
      target: { id: resolved.target.id, label: resolved.target.label, kind: resolved.target.kind, vendor: resolved.target.vendor || '' },
      taskType: resolved.taskType ? { id: resolved.taskType.id, label: resolved.taskType.label, kind: resolved.taskType.kind } : null,
      style: resolved.style ? { id: resolved.style.id, label: resolved.style.label } : null,
      enhancer: { provider: enhancer.provider, model: enhancer.model, label: enhancerLabel, source: enhancer.source },
      message: formatResultForTool(result, resolved.target, enhancerLabel),
      historyEntry,
    }
  } catch (error) {
    return unwrap(error)
  }
}

/** Score an existing prompt, using the LLM when available and local rules otherwise. */
export async function scorePrompt(ctx, request, options) {
  try {
    const prompt = String((request && request.prompt) || '').trim()
    if (!prompt) return fail('EMPTY_PROMPT', '请先粘贴要诊断的提示词')
    if (prompt.length > MAX_INPUT_CHARS) return fail('INPUT_TOO_LONG', '提示词超过 ' + MAX_INPUT_CHARS + ' 字符，请精简后重试')
    const store = loadStore()
    const resolved = resolveContext(ctx, store, request)
    if (resolved.error) return resolved.error
    const negativePrompt = String((request && (request.negativePrompt || request.negative_prompt)) || '').trim()
    const catalog = await listCatalog(ctx)
    const enhancerArg = parseModelArg(request && request.model, catalog)
    const sessionModel = options && isModelRef(options.sessionModel) ? options.sessionModel : null
    const enhancer = resolveEnhancer(ctx, store, enhancerArg, catalog, sessionModel)
    let result = null
    let method = 'rules'
    let enhancerOut = null
    if (enhancer) {
      const text = buildScoreRequest({ prompt, negativePrompt, target: resolved.target })
      const completion = await complete(ctx, {
        provider: enhancer.provider,
        model: enhancer.model,
        text,
        maxTokens: Math.min(resolved.maxTokens, 4096),
        signal: options && options.signal,
      })
      const parsed = parseJsonLoose(completion.text)
      if (parsed) {
        method = 'llm'
        enhancerOut = { provider: enhancer.provider, model: enhancer.model, label: labelOf(catalog, enhancer) || (enhancer.provider + ' / ' + enhancer.model) }
        result = {
          score: Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.score)))) : null,
          dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions.slice(0, 15).map((d) => ({
            id: String(d && d.id || ''),
            label: String(d && d.label || ''),
            score: Number.isFinite(Number(d && d.score)) ? Math.max(0, Math.min(100, Math.round(Number(d.score)))) : null,
            comment: String(d && d.comment || ''),
          })) : [],
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps.filter((x) => typeof x === 'string').slice(0, 10) : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((x) => typeof x === 'string').slice(0, 10) : [],
          rewrittenPrompt: String(parsed.rewrittenPrompt || ''),
        }
      }
    }
    if (!result) {
      const review = reviewPromptText(prompt, resolved.target)
      result = {
        score: review.score,
        dimensions: review.dimensions,
        gaps: review.gaps,
        suggestions: review.gaps.slice(0, 6).map((gap) => '补充' + gap),
        rewrittenPrompt: '',
      }
    }
    const historyEntry = {
      id: newEntryId(),
      ts: Date.now(),
      kind: 'score',
      input: prompt.slice(0, 600),
      targetId: resolved.target.id,
      targetLabel: resolved.target.label,
      method,
      result: { score: result.score, gaps: result.gaps, suggestions: result.suggestions, dimensions: result.dimensions },
    }
    appendHistory(historyEntry)
    return {
      ok: true,
      method,
      result,
      target: { id: resolved.target.id, label: resolved.target.label, kind: resolved.target.kind },
      enhancer: enhancerOut,
      message: formatScoreForTool(result, resolved.target, method),
      historyEntry,
    }
  } catch (error) {
    return unwrap(error)
  }
}

function formatScoreForTool(result, target, method) {
  const lines = []
  lines.push('【目标】' + (target ? target.label : '通用') + (method === 'rules' ? '（本地规则估算）' : '（大模型诊断）'))
  lines.push('【评分】' + (result.score == null ? '未知' : result.score + '/100'))
  if (result.dimensions && result.dimensions.length) {
    lines.push('【维度】')
    for (const dim of result.dimensions) lines.push('- ' + dim.label + '：' + (dim.score == null ? '?' : dim.score) + (dim.comment ? '（' + dim.comment + '）' : ''))
  }
  if (result.gaps && result.gaps.length) {
    lines.push('【缺口】')
    for (const gap of result.gaps) lines.push('- ' + gap)
  }
  if (result.suggestions && result.suggestions.length) {
    lines.push('【建议】')
    for (const suggestion of result.suggestions) lines.push('- ' + suggestion)
  }
  if (result.rewrittenPrompt) {
    lines.push('【改写参考】')
    lines.push(result.rewrittenPrompt)
  }
  return lines.join(String.fromCharCode(10))
}

/** List the bundled target model library. */
export function listTargets(request) {
  const kind = String((request && request.kind) || '').trim()
  const q = String((request && (request.q || request.query)) || '').trim().toLowerCase()
  const list = targets().filter((target) => {
    if (kind && target.kind !== kind) return false
    if (!q) return true
    return (target.id + ' ' + target.label + ' ' + (target.vendor || '') + ' ' + (Array.isArray(target.aliases) ? target.aliases.join(' ') : '')).toLowerCase().includes(q)
  })
  const rows = list.map((target) => ({
    id: target.id,
    label: target.label,
    kind: target.kind,
    vendor: target.vendor || '',
    languageHint: target.languageHint || 'auto',
    keyRules: (target.syntaxRules || []).slice(0, 2),
  }))
  const lines = rows.map((row) => '- ' + row.label + '（' + row.id + '，' + row.kind + '）：' + row.keyRules.join('；'))
  return {
    ok: true,
    count: rows.length,
    targets: rows,
    message: '可用目标模型 ' + rows.length + ' 个：' + String.fromCharCode(10) + lines.join(String.fromCharCode(10)),
  }
}

/** Everything the browser panel needs on first paint. */
export async function clientState(ctx) {
  const store = loadStore()
  const catalog = await listCatalog(ctx)
  const p = loadPresets()
  return {
    ok: true,
    settings: {
      defaults: store.defaults,
      ui: store.ui,
      usage: store.usage,
      storeVersion: store.version,
      historyCount: Array.isArray(store.history) ? store.history.length : 0,
    },
    catalog,
    agentDefault: agentDefaultSelection(ctx),
    presets: metaForClient(),
    presetMeta: { version: p.version || 0, updatedAt: p.updatedAt || '', targetCount: targets().length, styleCount: styles().length, note: p.note || '' },
    knowledge: knowledgeSummary(loadKnowledge(), (store.defaults && store.defaults.knowledge) || {}),
    history: Array.isArray(store.history) ? store.history.slice(0, 20) : [],
  }
}

/** Read full details for one target/style (advanced view). */
export function presetDetails(request) {
  const id = request && (request.id || request.targetId)
  const target = resolveTarget(id)
  const style = resolveStyle(id)
  if (!target && !style) return fail('NOT_FOUND', '没有找到对应的目标模型或风格')
  return { ok: true, target: target || null, style: style || null }
}

/** Knowledge-base state for the settings page. */
export function knowledgeState() {
  const store = loadStore()
  return { ok: true, knowledge: knowledgeSummary(loadKnowledge(), (store.defaults && store.defaults.knowledge) || {}) }
}

/** Run one web collection round on demand. */
export async function runKnowledgeCollection(ctx, options) {
  try {
    const outcome = await collectKnowledge(ctx, options || {})
    return { ok: true, ...outcome, knowledge: knowledgeState().knowledge }
  } catch (error) {
    const code = error instanceof PromptStudioError ? error.code : 'KNOWLEDGE_FAILED'
    return fail(code, errorText(error), { knowledge: knowledgeState().knowledge })
  }
}

/** Drop the user overlay and return to the bundled baseline knowledge. */
export function resetKnowledgeState() {
  const doc = defaultKnowledge()
  saveKnowledge(doc)
  const store = loadStore()
  return { ok: true, knowledge: knowledgeSummary(doc, (store.defaults && store.defaults.knowledge) || {}) }
}

function base64Bytes(value) {
  const text = String(value || '')
  const comma = text.indexOf(',')
  const payload = /^data:/i.test(text) && comma >= 0 ? text.slice(comma + 1) : text
  return Buffer.from(payload, 'base64')
}

function resolveVisionEnhancer(ctx, store, override, catalog) {
  const refs = []
  const settings = (store && store.defaults) || {}
  if (isModelRef(override)) refs.push({ ...modelRef(override.provider, override.model), source: 'request' })
  if (settings.enhancerProvider && settings.enhancerModel) refs.push({ ...modelRef(settings.enhancerProvider, settings.enhancerModel), source: 'settings' })
  const agent = agentDefaultSelection(ctx)
  if (agent) refs.push({ ...agent, source: 'agent-default' })
  const candidates = []
  for (const provider of (catalog && catalog.providers) || []) {
    for (const model of provider.models || []) {
      if (Array.isArray(model.inputModalities) && model.inputModalities.includes('image')) {
        candidates.push({ provider: provider.id, model: model.id, source: 'catalog-image' })
      }
    }
  }
  for (const ref of refs) {
    const provider = ((catalog && catalog.providers) || []).find((p) => p.id === ref.provider)
    const model = provider && provider.models.find((m) => m.id === ref.model)
    if (model && Array.isArray(model.inputModalities) && model.inputModalities.includes('image')) return ref
  }
  return candidates[0] || refs[0] || null
}

/** Reverse-engineer a target-ready prompt from an uploaded image. */
export async function reversePrompt(ctx, request, options) {
  try {
    const image = request && request.image
    const raw = image && (image.dataBase64 || image.data || image.dataUrl)
    if (!raw) return fail('NO_IMAGE', '请先选择或粘贴一张图片')
    const buffer = base64Bytes(raw)
    if (buffer.length === 0) return fail('BAD_IMAGE', '图片数据为空')
    if (buffer.length > 8 * 1024 * 1024) return fail('IMAGE_TOO_LARGE', '图片超过 8MB，请压缩后再试')
    const mediaType = String((image && image.mime) || request.mime || 'image/png').toLowerCase()
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(mediaType)) return fail('BAD_IMAGE_TYPE', '仅支持 PNG / JPEG / WebP 图片')
    const attachments = typeof ctx.get === 'function' ? ctx.get('attachments') : undefined
    if (!attachments || typeof attachments.saveImage !== 'function') return fail('NO_ATTACHMENTS', '当前 DSH 组合没有附件服务，无法处理图片')
    const ref = await attachments.saveImage({ data: buffer, mediaType: mediaType === 'image/jpg' ? 'image/jpeg' : mediaType, name: (image && image.name) || ('prompt-workshop-' + Date.now() + '.png') })
    const store = loadStore()
    const resolved = resolveContext(ctx, store, request)
    if (resolved.error) return resolved.error
    if (resolved.target.kind === 'text') {
      resolved.target = resolveTarget('generic-image') || resolved.target
    }
    const catalog = await listCatalog(ctx)
    const override = parseModelArg(request && request.model, catalog)
    const enhancer = resolveVisionEnhancer(ctx, store, override, catalog)
    if (!enhancer) return fail('NO_MODEL', '没有可用的视觉模型：请先在 DSH 设置中配置支持图片输入的模型')
    const enhancerLabel = labelOf(catalog, enhancer) || (enhancer.provider + ' / ' + enhancer.model)
    const text = buildReverseRequest({
      target: resolved.target,
      language: resolved.language,
      variants: resolved.variants,
      extra: request && request.extra,
    })
    const completion = await completeWithImage(ctx, {
      provider: enhancer.provider,
      model: enhancer.model,
      text,
      attachment: ref,
      maxTokens: Math.min(resolved.maxTokens, 8000),
      signal: options && options.signal,
    })
    const parsed = parseJsonLoose(completion.text)
    const result = normalizeResult(parsed, { target: resolved.target, variants: resolved.variants, rawText: completion.text })
    if (typeof result.score !== 'number') result.score = reviewPromptText(result.prompt, resolved.target).score
    const historyEntry = {
      id: newEntryId(),
      ts: Date.now(),
      kind: 'reverse',
      input: '（图片反推）',
      targetId: resolved.target.id,
      targetLabel: resolved.target.label,
      enhancer: { provider: enhancer.provider, model: enhancer.model, label: enhancerLabel, source: enhancer.source },
      result: trimHistoryResult(result),
    }
    appendHistory(historyEntry)
    return {
      ok: true,
      result,
      target: { id: resolved.target.id, label: resolved.target.label, kind: resolved.target.kind, vendor: resolved.target.vendor || '' },
      taskType: { id: 'image2image', label: '图生图', kind: resolved.target.kind },
      enhancer: { provider: enhancer.provider, model: enhancer.model, label: enhancerLabel, source: enhancer.source },
      message: formatResultForTool(result, resolved.target, enhancerLabel),
      historyEntry,
    }
  } catch (error) {
    return unwrap(error)
  }
}

export { patchStore, removeHistory, clearHistory, loadStore, metaForClient, targets, styles }
