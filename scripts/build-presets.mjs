#!/usr/bin/env node
/** Rebuild lib/presets.json from the researched knowledge base.
 * research/presets.json is the source of truth for model specs; this script
 * normalizes it into the compact runtime schema consumed by lib/engine.js.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pluginDir = join(here, '..')
const research = JSON.parse(readFileSync(join(pluginDir, 'research', 'presets.json'), 'utf8'))

const ID_MAP = {
  'midjourney-v7': 'midjourney',
  sdxl: 'sdxl',
  sd35: 'stable-diffusion-3.5',
  flux1: 'flux',
  'gpt-image': 'gpt-image',
  'doubao-seedream': 'doubao-seedream',
  jimeng: 'jimeng',
  kling: 'kling',
  hailuo: 'hailuo',
  sora2: 'sora',
  veo31: 'veo',
  'runway-gen4': 'runway',
  pika22: 'pika',
  vidu: 'vidu',
  wan22: 'wan',
  seedance: 'doubao-seedance',
  'generic-t2i': 'generic-image',
  'generic-t2v': 'generic-video',
  'generic-text': 'generic-text',
}

const ALIASES = {
  midjourney: ['mj', 'mj7', 'midjourney', 'midjourney v7'],
  sdxl: ['sd', 'sdxl', 'stable diffusion', 'sd1.5', 'sd webui'],
  'stable-diffusion-3.5': ['sd3.5', 'sd35', 'stable diffusion 3.5'],
  flux: ['flux', 'flux.1', 'flux1', 'bfl'],
  'gpt-image': ['gpt-image', 'gpt image', 'dall-e', 'dalle', 'gpt4o image', 'gpt-4o image', 'chatgpt 出图'],
  'doubao-seedream': ['豆包', 'doubao', '豆包图片', '豆包图像', 'seedream', '豆包生图'],
  jimeng: ['即梦', 'dreamina', 'jimeng', '即梦ai'],
  kling: ['kling', '可灵', '可灵ai', '可灵视频'],
  hailuo: ['hailuo', '海螺', '海螺ai', 'minimax', '海螺视频'],
  sora: ['sora', 'sora2', 'sora 2', 'openai 视频'],
  veo: ['veo', 'veo3', 'veo 3.1', 'google 视频'],
  runway: ['runway', 'gen-4', 'gen4', 'runway gen-4'],
  pika: ['pika', 'pika2.2', 'pika 2.2'],
  vidu: ['vidu', '维渡', '生数'],
  wan: ['wan', '万相', '通义万相', 'wan2.2', '通义'],
  'doubao-seedance': ['豆包视频', 'seedance', 'doubao video', '豆包', 'seedance 1.0'],
  'generic-image': ['通用图片', '通用文生图', 'generic image'],
  'generic-video': ['通用视频', '通用文生视频', 'generic video'],
  'generic-text': ['通用文本', '通用', 'text'],
}

const FORCE_KIND = { jimeng: 'image' }
const KIND_ORDER = { image: 0, video: 1, text: 2 }

function hintText(value) {
  if (value === true) return '支持'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (!value || typeof value !== 'object') return ''
  if (value.syntax) return String(value.syntax)
  if (value.value !== undefined) return String(value.value)
  if (value.values) return value.values.join(' / ')
  const range = value.min !== undefined || value.max !== undefined ? String(value.min ?? '0') + '-' + String(value.max ?? '最大') : ''
  return [range, value.note].filter(Boolean).join('（') + (range && value.note ? '）' : '')
}

function syntaxTexts(rules) {
  return (rules || []).map((rule) => {
    if (typeof rule === 'string') return rule
    const text = String(rule.rule || '').trim()
    if (!text) return ''
    return rule.verified === false && !text.includes('待核实') ? text + '（待核实）' : text
  }).filter(Boolean)
}

function targetToRuntime(target) {
  const id = ID_MAP[target.id] || target.id
  const kind = FORCE_KIND[id] || target.kind || 'image'
  const paramHints = {}
  for (const [key, value] of Object.entries(target.paramHints || {})) {
    const text = hintText(value)
    if (text) paramHints[key] = text
  }
  let examplePrompt = ''
  let negativeHint = ''
  if (typeof target.examplePrompt === 'string') examplePrompt = target.examplePrompt
  else if (target.examplePrompt && typeof target.examplePrompt === 'object') {
    examplePrompt = String(target.examplePrompt.text || '')
    negativeHint = String(target.examplePrompt.negativePrompt || '')
  }
  const notes = [target.versionNote, target.confidence ? '置信度：' + target.confidence : ''].filter(Boolean).join(' ')
  const aliases = Array.from(new Set([].concat(ALIASES[id] || [], target.id, target.label, target.vendor || []).filter(Boolean)))
  return {
    id,
    label: target.label || id,
    kind,
    vendor: target.vendor || '通用',
    languageHint: target.languageHint || 'auto',
    aliases,
    confidence: target.confidence || 'unknown',
    versionNote: target.versionNote || '',
    syntaxRules: syntaxTexts(target.syntaxRules),
    paramHints,
    do: Array.isArray(target.do) ? target.do : [],
    dont: Array.isArray(target.dont) ? target.dont : [],
    examplePrompt,
    negativeHint,
    notes,
  }
}

const targets = (research.targets || []).map(targetToRuntime).sort((a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9))

const BEST_FOR_KIND = { t2i: 'image', i2i: 'image', t2v: 'video', i2v: 'video', text: 'text' }
const styles = (research.styles || []).map((style) => {
  const appliesTo = Array.from(new Set((style.bestFor || []).map((key) => BEST_FOR_KIND[key]).filter(Boolean)))
  return {
    id: style.id,
    label: style.label,
    kind: appliesTo[0] || 'image',
    appliesTo: appliesTo.length ? appliesTo : ['image'],
    fragment: style.promptFragment || '',
    category: style.category || '',
    targets: Array.isArray(style.targets) ? style.targets : [],
  }
})

const TASK_MAP = {
  t2i: 'text2image', i2i: 'image2image', t2v: 'text2video', i2v: 'image2video',
  writing: 'writing', coding: 'code', translation: 'translate', analysis: 'analysis', general: 'general',
}
const DEFAULTS = {
  text2image: 'generic-image', image2image: 'gpt-image', text2video: 'generic-video',
  image2video: 'kling', writing: 'generic-text', code: 'generic-text', translate: 'generic-text',
  analysis: 'generic-text', general: 'generic-text',
}
const taskTypes = (research.taskTypes || []).map((task) => {
  const id = TASK_MAP[task.id] || task.id
  const kind = { text2image: 'image', image2image: 'image', text2video: 'video', image2video: 'video' }[id] || 'text'
  return { id, label: task.label, labelEn: task.labelEn || '', kind, desc: task.description || '', defaultTarget: DEFAULTS[id] || 'generic-image' }
})

const rubric = research.rubric || { dimensions: [] }
rubric.dimensions = (rubric.dimensions || []).map((dim) => ({
  ...dim,
  desc: (dim.levels && (dim.levels['4'] || dim.levels['3'])) || '',
}))

const doc = {
  version: (research.version || 1) + '-research',
  updatedAt: research.updatedAt || research.timeBasis || '2026-11-05',
  timeBasis: research.timeBasis || '',
  note: '内置提示词规范库：由网络公开资料调研生成（见 sources）。标注「待核实」的参数请以各平台官方文档为准，插件仅作建议不做硬校验。',
  sources: Array.isArray(research.sources) ? research.sources : [],
  taskTypes,
  targets,
  styles,
  rubric,
  outputSchema: research.outputSchema || null,
}

writeFileSync(join(pluginDir, 'lib', 'presets.json'), JSON.stringify(doc, null, 2) + '\n')
console.log('[build-presets] wrote lib/presets.json: ' + targets.length + ' targets / ' + styles.length + ' styles / ' + taskTypes.length + ' taskTypes / ' + doc.sources.length + ' sources')
