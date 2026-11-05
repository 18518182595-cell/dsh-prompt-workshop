/** dsh-prompt-workshop — persistence for user settings + history.
 * Stores one JSON document under the DSH home directory so upgrades of the
 * plugin package never lose user data. Writes are atomic (tmp + rename).
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const STORE_VERSION = 1
export const HISTORY_LIMIT = 60

/** Resolve the DSH home directory (DSH_HOME wins; otherwise ~/.dsh). */
export function dshHome(env = process.env) {
  const fromEnv = env && typeof env.DSH_HOME === 'string' ? env.DSH_HOME.trim() : ''
  return fromEnv || join(homedir(), '.dsh')
}

/** Absolute path of the plugin's settings/history document. */
export function storePath(env = process.env) {
  return join(dshHome(env), 'prompt-workshop.json')
}

/** Default settings. Kept free of nulls so the client can render without guards. */
export function defaultSettings() {
  return {
    version: STORE_VERSION,
    defaults: {
      enhancerProvider: '',
      enhancerModel: '',
      language: 'auto',
      taskType: 'text2image',
      targetId: 'generic-image',
      styleId: '',
      variants: 3,
      maxTokens: 4096,
      insertMode: 'manual',
      promptInjection: true,
      knowledge: { autoUpdate: true, intervalDays: 5 },
    },
    ui: { panelMode: 'floating', lastTargetId: '', showAdvanced: false },
    history: [],
    usage: { calls: 0, failures: 0, lastUsedAt: 0 },
  }
}

function mergeDefaults(base, patch) {
  if (!patch || typeof patch !== 'object') return base
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'history' || key === 'file') continue
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      next[key] = { ...base[key], ...value }
    } else if (value !== undefined) {
      next[key] = value
    }
  }
  return next
}

/** Read settings + history; never throws (returns defaults on corrupt files). */
export function loadStore(env = process.env) {
  const file = storePath(env)
  const base = defaultSettings()
  try {
    if (!existsSync(file)) return { ...base, file }
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const merged = mergeDefaults(base, parsed)
    merged.file = file
    merged.history = Array.isArray(parsed.history) ? parsed.history : []
    return merged
  } catch {
    return { ...base, file }
  }
}

/** Atomic write of the whole document. */
export function saveStore(doc, env = process.env) {
  const file = storePath(env)
  const dir = dshHome(env)
  mkdirSync(dir, { recursive: true })
  const tmp = file + '.' + process.pid + '.tmp'
  writeFileSync(tmp, JSON.stringify(doc, null, 2) + '\n', 'utf8')
  renameSync(tmp, file)
  return file
}

/** Patch top-level/defaults/ui sections and persist. */
export function patchStore(patch, env = process.env) {
  const doc = loadStore(env)
  const next = mergeDefaults(doc, patch)
  if (!next.usage) next.usage = defaultSettings().usage
  if (Array.isArray(patch && patch.history)) next.history = patch.history.slice(0, HISTORY_LIMIT)
  saveStore(next, env)
  return next
}

/** Append one history entry (newest first) and persist. */
export function appendHistory(entry, env = process.env) {
  const doc = loadStore(env)
  const list = [{ ...entry, ts: entry.ts || Date.now() }, ...(Array.isArray(doc.history) ? doc.history : [])]
  doc.history = list.slice(0, HISTORY_LIMIT)
  doc.usage = {
    calls: ((doc.usage && doc.usage.calls) || 0) + (entry.ok === false ? 0 : 1),
    failures: ((doc.usage && doc.usage.failures) || 0) + (entry.ok === false ? 1 : 0),
    lastUsedAt: Date.now(),
  }
  saveStore(doc, env)
  return doc.history
}

/** Remove one entry by id; returns the remaining list. */
export function removeHistory(id, env = process.env) {
  const doc = loadStore(env)
  doc.history = (Array.isArray(doc.history) ? doc.history : []).filter((e) => e && e.id !== id)
  saveStore(doc, env)
  return doc.history
}

/** Clear history. */
export function clearHistory(env = process.env) {
  const doc = loadStore(env)
  doc.history = []
  saveStore(doc, env)
  return []
}
