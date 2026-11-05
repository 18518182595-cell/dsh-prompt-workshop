/** dsh-prompt-workshop — model catalog discovery and one-shot completion.
 *
 * All model calls go through the host LLM service (ctx.llm): the plugin never
 * stores API keys and reuses whatever providers the user configured in DSH.
 */
import { randomUUID } from 'node:crypto'

/** True when the value looks like a provider/model pair. */
export function isModelRef(ref) {
  return Boolean(ref && typeof ref.provider === 'string' && ref.provider.trim() && typeof ref.model === 'string' && ref.model.trim())
}

export function modelRef(provider, model) {
  return { provider: String(provider || '').trim(), model: String(model || '').trim() }
}

export function modelKey(ref) {
  return isModelRef(ref) ? ref.provider + '/' + ref.model : ''
}

/** The host LLM service, or undefined when this deployment composes none. */
export function getLlm(ctx) {
  try {
    const direct = ctx && ctx.llm
    if (direct && typeof direct.stream === 'function') return direct
  } catch { /* fall through */ }
  try {
    const viaGet = ctx && typeof ctx.get === 'function' ? ctx.get('llm') : undefined
    if (viaGet && typeof viaGet.stream === 'function') return viaGet
  } catch { /* ignore */ }
  return undefined
}

/** Read provider/model catalog from the host. Never throws; reports problems inline. */
export async function listCatalog(ctx) {
  const llm = getLlm(ctx)
  if (!llm) return { ok: false, error: '当前 DSH 组合未提供 LLM 服务（ctx.llm 不可用）', providers: [] }
  let providers = []
  try {
    providers = typeof llm.listProviders === 'function' ? await llm.listProviders() : []
  } catch (error) {
    return { ok: false, error: '读取模型提供方失败：' + errorText(error), providers: [] }
  }
  const out = []
  for (const provider of providers || []) {
    const id = String(provider && provider.id ? provider.id : provider)
    if (!id) continue
    let models = []
    let error = ''
    try {
      models = typeof llm.listModels === 'function' ? await llm.listModels(id) : []
    } catch (cause) {
      error = errorText(cause)
    }
    out.push({
      id,
      name: String((provider && provider.name) || id),
      error,
      models: (Array.isArray(models) ? models : []).map((model) => ({
        id: String(model && model.id ? model.id : model),
        name: String((model && model.name) || (model && model.id) || model),
        inputModalities: model && Array.isArray(model.inputModalities) ? model.inputModalities.slice() : null,
        contextWindow: model && typeof model.contextWindow === 'number' ? model.contextWindow : null,
        maxTokens: model && typeof model.maxTokens === 'number' ? model.maxTokens : null,
      })),
    })
  }
  return { ok: true, providers: out }
}

/** The deployment default model selection, when the service exists. */
export function agentDefaultSelection(ctx) {
  try {
    const service = ctx && (ctx.agentDefaultModel || (typeof ctx.get === 'function' ? ctx.get('agentDefaultModel') : undefined))
    if (service && typeof service.currentSelection === 'function') {
      const selection = service.currentSelection()
      if (isModelRef(selection)) return modelRef(selection.provider, selection.model)
    }
  } catch { /* optional service */ }
  return null
}

/** Human label for one provider/model pair. */
export function labelOf(catalog, ref) {
  if (!isModelRef(ref)) return ''
  const provider = (catalog && catalog.providers ? catalog.providers : []).find((p) => p.id === ref.provider)
  const model = provider && provider.models.find((m) => m.id === ref.model)
  return (provider ? provider.name : ref.provider) + ' / ' + (model ? model.name : ref.model)
}

/**
 * Resolve which model should enhance the prompt.
 * Priority: explicit override > user settings > agent default > first catalog model.
 * @returns {{provider:string,model:string,source:string}|null}
 */
export function resolveEnhancer(ctx, store, override, catalog, sessionModel) {
  const settings = (store && store.defaults) || {}
  if (isModelRef(override)) return { ...modelRef(override.provider, override.model), source: 'request' }
  if (settings.enhancerProvider && settings.enhancerModel) {
    return { ...modelRef(settings.enhancerProvider, settings.enhancerModel), source: 'settings' }
  }
  if (isModelRef(sessionModel)) return { ...modelRef(sessionModel.provider, sessionModel.model), source: 'session' }
  const fallback = agentDefaultSelection(ctx)
  if (fallback) return { ...fallback, source: 'agent-default' }
  const first = (catalog && catalog.providers || []).find((p) => p.models && p.models.length > 0)
  if (first) return { ...modelRef(first.id, first.models[0].id), source: 'catalog-first' }
  return null
}

/** Build the user-role message content for a one-shot completion. */
export function textMessage(text) {
  return [{ type: 'text', text: String(text == null ? '' : text) }]
}

/**
 * Run one completion and return the assembled text.
 * Request-only inputs must stay user-role; system-like instructions are folded
 * into that single message so no persistent message identity is required.
 */
export async function complete(ctx, options) {
  const llm = getLlm(ctx)
  if (!llm) throw new PromptStudioError('NO_LLM', '当前 DSH 组合未提供 LLM 服务，无法调用大模型')
  const provider = String(options.provider || '').trim()
  const model = String(options.model || '').trim()
  if (!provider || !model) throw new PromptStudioError('NO_MODEL', '未选择增强模型：请先在面板或设置页选择模型')
  const signal = options.signal
  let out = ''
  let reasoning = ''
  let usage = null
  const request = {
    provider,
    model,
    messages: [{ role: 'user', content: textMessage(options.text) }],
    ...(typeof options.maxTokens === 'number' && options.maxTokens > 0 ? { maxTokens: Math.min(32000, Math.round(options.maxTokens)) } : {}),
    ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
    ...(signal ? { signal } : {}),
  }
  try {
    for await (const chunk of llm.stream(request)) {
      if (!chunk || typeof chunk !== 'object') continue
      if (chunk.type === 'text-delta') out += chunk.text || ''
      else if (chunk.type === 'reasoning-delta') reasoning += chunk.text || ''
      else if (chunk.type === 'usage') usage = chunk
      else if (chunk.type === 'finish') {
        const reason = chunk.reason
        if (reason && reason.kind === 'error') {
          const failure = reason.failure || {}
          throw new PromptStudioError(String(failure.code || 'LLM_FAILED'), '模型调用失败：' + (failure.message || failure.code || '未知错误'))
        }
        if (reason && reason.kind === 'aborted') throw new PromptStudioError('ABORTED', '模型调用已取消')
      }
    }
  } catch (error) {
    if (error instanceof PromptStudioError) throw error
    throw new PromptStudioError('LLM_FAILED', '模型调用失败：' + errorText(error))
  }
  if (!out.trim()) {
    // Some reasoning-heavy models put the whole answer into reasoning; accept it as a last resort.
    if (reasoning.trim()) out = reasoning
    else throw new PromptStudioError('EMPTY_RESPONSE', '模型没有返回内容（可能是该模型不支持当前调用方式）')
  }
  return { text: out, reasoning, usage, provider, model }
}

/** Run one completion whose user message carries an image plus text. */
export async function completeWithImage(ctx, options) {
  const llmService = getLlm(ctx)
  if (!llmService) throw new PromptStudioError('NO_LLM', '当前 DSH 组合未提供 LLM 服务，无法调用大模型')
  const provider = String(options.provider || '').trim()
  const model = String(options.model || '').trim()
  if (!provider || !model) throw new PromptStudioError('NO_MODEL', '未选择增强模型：请先在面板或设置页选择模型')
  const attachment = options.attachment
  if (!attachment) throw new PromptStudioError('NO_IMAGE', '没有可用的图片附件')
  const content = [{ type: 'text', text: String(options.text || '') }]
  content.push({ type: 'image', attachment })
  const request = {
    provider,
    model,
    messages: [{ role: 'user', content }],
    ...(typeof options.maxTokens === 'number' && options.maxTokens > 0 ? { maxTokens: Math.min(32000, Math.round(options.maxTokens)) } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  }
  let out = ''
  let reasoning = ''
  let usage = null
  try {
    for await (const chunk of llmService.stream(request)) {
      if (!chunk || typeof chunk !== 'object') continue
      if (chunk.type === 'text-delta') out += chunk.text || ''
      else if (chunk.type === 'reasoning-delta') reasoning += chunk.text || ''
      else if (chunk.type === 'usage') usage = chunk
      else if (chunk.type === 'finish') {
        const reason = chunk.reason
        if (reason && reason.kind === 'error') {
          const failure = reason.failure || {}
          throw new PromptStudioError(String(failure.code || 'LLM_FAILED'), '模型调用失败：' + (failure.message || failure.code || '未知错误'))
        }
        if (reason && reason.kind === 'aborted') throw new PromptStudioError('ABORTED', '模型调用已取消')
      }
    }
  } catch (error) {
    if (error instanceof PromptStudioError) throw error
    throw new PromptStudioError('LLM_FAILED', '模型调用失败：' + errorText(error))
  }
  if (!out.trim()) {
    if (reasoning.trim()) out = reasoning
    else throw new PromptStudioError('EMPTY_RESPONSE', '模型没有返回内容（可能是该模型不支持图片输入）')
  }
  return { text: out, reasoning, usage, provider, model }
}

/** A plugin-local error carrying a stable code for the UI. */
export class PromptStudioError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'PromptStudioError'
    this.code = code
  }
}

export function errorText(error) {
  if (!error) return '未知错误'
  if (typeof error === 'string') return error
  if (error.code && error.message) return String(error.code) + ': ' + String(error.message)
  return String(error.message || error)
}

/** Stable id for history entries. */
export function newEntryId() {
  try { return randomUUID() } catch { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }
}
