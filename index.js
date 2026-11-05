/** dsh-prompt-workshop (host half) — tools + HTTP API for the prompt workbench.
 *
 * The host plugin owns:
 *   - prompt_enhance / prompt_score / prompt_targets tools for the agent
 *   - a /dsh-prompt-workshop HTTP namespace consumed by client.js
 *   - a compact system-prompt hint so the agent reaches for the tools
 *
 * All model calls go through ctx.llm; no credentials are stored by this plugin.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { loadStore, patchStore, removeHistory, clearHistory } from './lib/store.js'
import {
  enhancePrompt, scorePrompt, listTargets, clientState, presetDetails, fail,
  knowledgeState, runKnowledgeCollection, resetKnowledgeState, reversePrompt,
} from './lib/service.js'
import { knowledgeTick, collectKnowledge } from './lib/collector.js'
import { metaForClient } from './lib/presets.js'
import { listCatalog, errorText } from './lib/llm.js'

export const name = 'dsh-prompt-workshop'
export const inject = ['tools', 'llm', 'webServer', 'agentDefaultModel', 'attachments', 'web']

const ROUTE = '/dsh-prompt-workshop'
const MAX_BODY_BYTES = 512 * 1024
const VERSION = '0.2.0'

const SYSTEM_HINT = '【提示词工坊】当用户要写图片/视频/文本生成提示词、或抱怨提示词效果不准时：优先用 prompt_enhance 把粗糙想法改写成目标模型可直接使用的精准提示词（含目标模型规范、负向词、参数与变体）；列举支持的目标模型用 prompt_targets；诊断已有提示词用 prompt_score。回复时直接给出可用提示词与关键参数，不要原样粘贴工具返回的 JSON。'

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload == null ? {} : payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function isLoopback(req) {
  const raw = req && req.socket ? (req.socket.remoteAddress || '') : ''
  const address = String(raw).toLowerCase()
  if (!address) return true
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1' || address === '::ffff:7f00:1'
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        const error = new Error('请求体过大（上限 ' + MAX_BODY_BYTES + ' 字节）')
        error.code = 'BODY_TOO_LARGE'
        reject(error)
        try { req.destroy() } catch { /* ignore */ }
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (size === 0) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        const error = new Error('请求体不是合法 JSON')
        error.code = 'BAD_JSON'
        reject(error)
      }
    })
    req.on('error', (error) => reject(error))
  })
}

function settingsView(store) {
  return {
    defaults: store.defaults,
    ui: store.ui,
    usage: store.usage,
    storeVersion: store.version,
    historyCount: Array.isArray(store.history) ? store.history.length : 0,
  }
}

function clientError(res, error) {
  const status = error && error.code === 'BODY_TOO_LARGE' ? 413 : error && error.code === 'BAD_JSON' ? 400 : 500
  sendJson(res, status, { ok: false, error: errorText(error) })
}

function makeHandler(ctx) {
  return async function handler(req, res) {
    if (!isLoopback(req)) {
      sendJson(res, 403, { ok: false, error: '提示词工坊 API 仅接受本机回环请求' })
      return
    }
    let url
    try { url = new URL(req.url || '/', 'http://localhost') } catch { sendJson(res, 400, { ok: false, error: '无效 URL' }); return }
    const sub = url.pathname.startsWith(ROUTE) ? url.pathname.slice(ROUTE.length) : url.pathname
    const route = sub.replace(/\/+$/, '') || '/'
    try {
      if (req.method === 'GET') {
        if (route === '/health') return sendJson(res, 200, { ok: true, name, version: VERSION })
        if (route === '/graph') {
          let graph = null
          let error = ''
          try {
            const modules = typeof ctx.get === 'function' ? ctx.get('clientModules') : undefined
            if (modules && typeof modules.graph === 'function') {
              const composed = modules.graph()
              graph = {
                rev: composed && composed.rev,
                hasSelf: !!(composed && composed.entries || []).find((entry) => entry.id === name),
                entries: (composed && composed.entries || []).map((entry) => ({
                  id: entry.id,
                  client: !!(modules.clientPath && modules.clientPath(entry.id)),
                  batch: !!(composed.batches || []).find((batch) => (batch.entries || batch.rows || []).some?.((row) => (row && row.id || row) === entry.id)),
                })),
                batches: (composed && composed.batches || []).map((batch) => ({ id: batch.id, url: batch.url })),
              }
            } else {
              error = 'clientModules service unavailable'
            }
          } catch (cause) {
            error = errorText(cause)
          }
          return sendJson(res, 200, { ok: !error, error, graph })
        }
        if (route === '/state') return sendJson(res, 200, await clientState(ctx))
        if (route === '/models') {
          const catalog = await listCatalog(ctx)
          return sendJson(res, 200, { ok: catalog.ok, catalog, error: catalog.error || '' })
        }
        if (route === '/targets') {
          return sendJson(res, 200, listTargets({ kind: url.searchParams.get('kind') || '', q: url.searchParams.get('q') || '' }))
        }
        if (route === '/preset') {
          return sendJson(res, 200, presetDetails({ id: url.searchParams.get('id') || '' }))
        }
        if (route === '/presets') {
          return sendJson(res, 200, { ok: true, presets: metaForClient() })
        }
        if (route === '/knowledge') {
          return sendJson(res, 200, knowledgeState())
        }
        sendJson(res, 404, { ok: false, error: '未知接口：' + route })
        return
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req)
        if (route === '/enhance') return sendJson(res, 200, await enhancePrompt(ctx, body, {}))
        if (route === '/score') return sendJson(res, 200, await scorePrompt(ctx, body, {}))
        if (route === '/reverse') return sendJson(res, 200, await reversePrompt(ctx, body, {}))
        if (route === '/knowledge/collect') {
          return sendJson(res, 200, await runKnowledgeCollection(ctx, { sinceDays: body && body.sinceDays }))
        }
        if (route === '/knowledge/reset') {
          return sendJson(res, 200, resetKnowledgeState())
        }
        if (route === '/settings') {
          const patch = body && body.patch && typeof body.patch === 'object' ? body.patch : body
          const next = patchStore(patch || {})
          return sendJson(res, 200, { ok: true, settings: settingsView(next), history: Array.isArray(next.history) ? next.history.slice(0, 20) : [] })
        }
        if (route === '/history-remove') {
          const list = removeHistory(body && body.id)
          return sendJson(res, 200, { ok: true, history: list.slice(0, 20) })
        }
        if (route === '/history-clear') {
          clearHistory()
          return sendJson(res, 200, { ok: true, history: [] })
        }
        sendJson(res, 404, { ok: false, error: '未知接口：' + route })
        return
      }
      sendJson(res, 405, { ok: false, error: '不支持的方法：' + (req.method || '') })
    } catch (error) {
      clientError(res, error)
    }
  }
}

function sessionModelOf(exec) {
  try {
    const context = exec && exec.agent && exec.agent.session && typeof exec.agent.session.requestContext === 'function' ? exec.agent.session.requestContext() : null
    if (context && context.provider && context.model) return { provider: String(context.provider), model: String(context.model) }
  } catch { /* optional */ }
  return null
}

function registerTools(ctx) {
  ctx.tools.register(defineTool({
    name: 'prompt_enhance',
    description: '把用户粗糙的想法改写成目标生成模型可直接使用的精准提示词。适用：文生图、图生图、文生视频、图生视频、写作、代码、分析等。会按目标模型语法规范输出主提示词、负向提示词、参数建议、变体、中文说明与自评缺口。支持目标模型包括 Midjourney、Stable Diffusion、FLUX、GPT-Image、豆包 Seedream（图片）、即梦、Sora、Veo、可灵 Kling、海螺 Hailuo、Runway、Pika、Vidu、通义万相、豆包 Seedance（视频）等。',
    parameters: {
      input: { type: 'string', required: true, description: '用户的原始想法/需求（口语化、一句话也可以）' },
      target: { type: 'string', description: '目标生成模型 id 或名称，例如 midjourney、flux、豆包、kling、sora、generic-image、generic-video' },
      task_type: { type: 'string', description: '任务类型 id：text2image/image2image/text2video/image2video/writing/code/analysis/translate/general' },
      style: { type: 'string', description: '风格 preset，例如 cinematic（电影感）、product-photo、guofeng（国风）、cyberpunk' },
      language: { type: 'string', description: '提示词语言：auto/zh/en' },
      variants: { type: 'number', description: '变体数量 1-5，默认 3' },
      extra: { type: 'string', description: '额外要求，例如「更简洁」「预算低的小成本产品图」' },
      model: { type: 'string', description: '可选：指定增强用大模型，格式 provider/model 或模型 id' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: value && value.message ? value.message : JSON.stringify(value) }],
    },
    async execute(args, exec) {
      return enhancePrompt(ctx, {
        input: args.input,
        target: args.target,
        taskType: args.task_type,
        style: args.style,
        language: args.language,
        variants: args.variants,
        extra: args.extra,
        model: args.model,
      }, { signal: exec && exec.signal, sessionModel: sessionModelOf(exec) })
    },
    presentCall: (args) => ({ card: 'generic', title: 'prompt_enhance', rawInput: args }),
  }))

  ctx.tools.register(defineTool({
    name: 'prompt_targets',
    description: '列出提示词工坊内置的目标生成模型规范（图片/视频/文本），含每个模型的语法规则要点。写提示词前想确认目标模型支持什么时使用。',
    parameters: {
      kind: { type: 'string', description: '筛选类型：image/video/text，不填则全部' },
      q: { type: 'string', description: '关键词筛选，如 豆包、视频、midjourney' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: value && value.message ? value.message : JSON.stringify(value) }],
    },
    async execute(args) {
      return listTargets({ kind: args.kind, q: args.q })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'prompt_knowledge',
    description: '维护提示词工坊的模型知识库：status 查看知识库状态（上次联网收集时间、下期计划、最近报告）；collect 立刻在后台联网收集最近的新模型/新参数/新提示词技巧并更新本地知识库（约 1-3 分钟，返回后可用 status 查看结果）；reset 恢复为内置知识库。适用于用户说「更新一下提示词知识库」「看看知识库状态」。',
    parameters: {
      action: { type: 'string', required: true, description: 'status（默认）| collect | reset' },
      since_days: { type: 'number', description: 'collect 时收集最近多少天的新消息，默认取设置里的周期（5 天）' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: value && value.message ? value.message : JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const action = String(args.action || 'status').trim().toLowerCase()
      if (action === 'reset') {
        const res = resetKnowledgeState()
        return { ...res, message: '已恢复内置知识库（本地收集的增量已清空，插件包内置规范不受影响）。' }
      }
      if (action === 'collect') {
        const store = loadStore()
        const knowledgeSettings = (store.defaults && store.defaults.knowledge) || {}
        const sinceDays = Number(args.since_days) || Number(knowledgeSettings.intervalDays) || 5
        collectKnowledge(ctx, { sinceDays, signal: exec && exec.signal }).catch((error) => {
          try { ctx.logger?.warn?.('[dsh-prompt-workshop] manual collection failed: ' + errorText(error)) } catch { /* ignore */ }
        })
        return { ok: true, started: true, sinceDays, message: '已在后台开始联网收集最近 ' + sinceDays + ' 天的模型/提示词更新，约需 1-3 分钟。完成后用 prompt_knowledge（action=status）查看最近报告。' }
      }
      const state = knowledgeState()
      const k = state.knowledge
      const last = k.lastReport
      const lines = [
        '知识库状态：',
        '- 自动收集：' + (k.autoUpdate ? '开启' : '关闭') + '，周期 ' + k.intervalDays + ' 天',
        '- 上次收集：' + (k.lastCheckedAt ? new Date(k.lastCheckedAt).toLocaleString('zh-CN') : '尚未收集'),
        '- 下次计划：' + (k.nextCheckAt ? new Date(k.nextCheckAt).toLocaleString('zh-CN') : '待安排'),
        '- 已应用增量：' + k.counts.targets + ' 个目标规范 / ' + k.counts.newTargets + ' 个新目标 / ' + k.counts.styles + ' 个新风格',
        k.runs || k.failures ? '- 运行统计：成功 ' + k.runs + ' 次，失败 ' + k.failures + ' 次' + (k.lastError ? '（最近错误：' + k.lastError.slice(0, 200) + '）' : '') : '',
        last && last.report ? '- 最近报告：' + String(last.report).slice(0, 800) : '',
      ].filter(Boolean)
      return { ok: true, knowledge: k, message: lines.join('\n') }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'prompt_score',
    description: '诊断一段已有提示词的质量：按目标生成模型规范给出 0-100 评分、各维度点评、缺口与改写建议。适用于用户说「这段提示词为什么效果不准」「帮我看看这个 prompt」。',
    parameters: {
      prompt: { type: 'string', required: true, description: '要诊断的提示词原文' },
      target: { type: 'string', description: '目标模型 id 或名称，例如 midjourney、豆包、kling' },
      negative_prompt: { type: 'string', description: '当前负向提示词（若有）' },
      model: { type: 'string', description: '可选：指定诊断用大模型，格式 provider/model 或模型 id' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: value && value.message ? value.message : JSON.stringify(value) }],
    },
    async execute(args, exec) {
      return scorePrompt(ctx, {
        prompt: args.prompt,
        target: args.target,
        negativePrompt: args.negative_prompt,
        model: args.model,
      }, { signal: exec && exec.signal, sessionModel: sessionModelOf(exec) })
    },
  }))

  ctx.logger?.info?.('[dsh-prompt-workshop] tools registered: prompt_enhance, prompt_targets, prompt_score')
}

export function apply(ctx) {
  // ---- system prompt hint (toggleable from the settings panel) ----
  try {
    ctx.on('system-prompt/assemble', async (assembly, _context, next) => {
      const assembled = await next()
      try {
        const store = loadStore()
        if (store.defaults && store.defaults.promptInjection === false) return assembled
        if (assembled && Array.isArray(assembled.sections)) {
          assembled.sections.push({ name: 'dsh-prompt-workshop:hint', text: SYSTEM_HINT })
        }
      } catch { /* hint is best effort */ }
      return assembled
    })
  } catch (error) {
    ctx.logger?.warn?.('[dsh-prompt-workshop] system-prompt hook unavailable: ' + errorText(error))
  }

  // ---- scheduled knowledge collection (every few hours; due check inside) ----
  try {
    ctx.effect(() => {
      let stopped = false
      const tick = () => { if (stopped) return; knowledgeTick(ctx).catch(() => {}) }
      const timer = setInterval(tick, 6 * 3600 * 1000)
      const first = setTimeout(tick, 90 * 1000)
      return () => { stopped = true; clearInterval(timer); clearTimeout(first) }
    }, 'dsh-prompt-workshop: knowledge scheduler')
  } catch (error) {
    ctx.logger?.warn?.('[dsh-prompt-workshop] knowledge scheduler unavailable: ' + errorText(error))
  }

  // ---- HTTP namespace for the browser panel ----
  try {
    const webServer = ctx.webServer || (typeof ctx.get === 'function' ? ctx.get('webServer') : undefined)
    if (webServer && typeof webServer.register === 'function') {
      ctx.effect(() => webServer.register({ kind: 'prefix', path: ROUTE, handler: makeHandler(ctx) }))
    } else {
      ctx.logger?.warn?.('[dsh-prompt-workshop] webServer service unavailable; panel API disabled')
    }
  } catch (error) {
    ctx.logger?.error?.('[dsh-prompt-workshop] failed to register HTTP routes: ' + errorText(error))
  }

  // ---- tools (register after the tools service is ready) ----
  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['tools'], () => {
        try { registerTools(ctx) } catch (error) {
          ctx.logger?.error?.('[dsh-prompt-workshop] tool registration failed: ' + errorText(error))
        }
      })
    } else {
      registerTools(ctx)
    }
  } catch (error) {
    ctx.logger?.error?.('[dsh-prompt-workshop] tools unavailable: ' + errorText(error))
  }
}
