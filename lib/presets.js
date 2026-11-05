/** dsh-prompt-workshop — bundled knowledge base access (targets/styles/tasks/rubric).
 * The bundled JSON is researched from public model documentation; the cache is
 * invalidated by file metadata so hot-reloaded / edited knowledge is picked up
 * without restarting the host.
 */
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { knowledgeStamp, loadKnowledge, applyOverlayToPresets } from './knowledge.js'

const here = dirname(fileURLToPath(import.meta.url))
const presetsPath = join(here, 'presets.json')
let cached = null
let cachedStamp = ''

function stampOf(file) {
  try {
    const stat = statSync(file)
    return stat.size + ':' + stat.mtimeMs
  } catch {
    return ''
  }
}

/** Load the effective preset document = bundled baseline + knowledge overlay. */
export function loadPresets() {
  const stamp = stampOf(presetsPath) + '|' + knowledgeStamp()
  if (cached && stamp === cachedStamp) return cached
  const base = JSON.parse(readFileSync(presetsPath, 'utf8'))
  const overlay = loadKnowledge().overlay
  cached = overlay && (Object.keys(overlay.targets || {}).length || (overlay.newTargets || []).length || (overlay.styles || []).length)
    ? applyOverlayToPresets(base, overlay)
    : base
  cachedStamp = stamp
  return cached
}

export function taskTypes() {
  return Array.isArray(loadPresets().taskTypes) ? loadPresets().taskTypes : []
}

export function targets() {
  return Array.isArray(loadPresets().targets) ? loadPresets().targets : []
}

export function styles() {
  return Array.isArray(loadPresets().styles) ? loadPresets().styles : []
}

export function rubric() {
  const r = loadPresets().rubric
  return r && Array.isArray(r.dimensions) ? r : { dimensions: [] }
}

function norm(value) {
  return String(value == null ? '' : value).trim().toLowerCase()
}

/** Find a target by id, label, or alias (case/space-insensitive). */
export function resolveTarget(idOrLabel) {
  const key = norm(idOrLabel)
  if (!key) return null
  const all = targets()
  return all.find((t) => norm(t.id) === key)
    || all.find((t) => norm(t.label) === key)
    || all.find((t) => Array.isArray(t.aliases) && t.aliases.some((a) => norm(a) === key))
    || all.find((t) => norm(t.label).includes(key) || norm(t.id).includes(key))
    || null
}

/** Default target for a task type kind. */
export function defaultTargetFor(kind) {
  const all = targets()
  const specific = all.find((t) => t.kind === kind && t.id.indexOf('generic') !== 0)
  return specific || all.find((t) => t.kind === kind) || all[0] || null
}

/** Find a style preset by id or label. */
export function resolveStyle(idOrLabel) {
  const key = norm(idOrLabel)
  if (!key) return null
  const all = styles()
  return all.find((s) => norm(s.id) === key)
    || all.find((s) => norm(s.label) === key)
    || all.find((s) => Array.isArray(s.aliases) && s.aliases.some((a) => norm(a) === key))
    || null
}

/** Find a task type by id or label. */
export function resolveTaskType(idOrLabel) {
  const key = norm(idOrLabel)
  if (!key) return null
  const all = taskTypes()
  return all.find((t) => norm(t.id) === key) || all.find((t) => norm(t.label) === key) || null
}

/** Compact catalog for the browser panel. */
export function metaForClient() {
  const p = loadPresets()
  return {
    version: p.version || 0,
    updatedAt: p.updatedAt || '',
    note: p.note || '',
    sources: Array.isArray(p.sources) ? p.sources.slice(0, 6) : [],
    taskTypes: taskTypes().map((t) => ({ id: t.id, label: t.label, kind: t.kind })),
    targets: targets().map((t) => ({
      id: t.id, label: t.label, kind: t.kind, vendor: t.vendor || '', languageHint: t.languageHint || 'auto',
      hint: (Array.isArray(t.syntaxRules) && t.syntaxRules[0]) || '', tags: Array.isArray(t.tags) ? t.tags : [],
    })),
    styles: styles().map((s) => ({ id: s.id, label: s.label, appliesTo: Array.isArray(s.appliesTo) ? s.appliesTo : [s.kind || 'image'] })),
  }
}
