import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadPresets, resolveTarget, resolveStyle, metaForClient, taskTypes, targets } from '../lib/presets.js'

test('preset document has targets, styles and task types', () => {
  const p = loadPresets()
  assert.ok(p.targets.length >= 10)
  assert.ok(p.styles.length >= 20)
  assert.ok(p.taskTypes.length >= 8)
  assert.ok(Array.isArray(p.rubric.dimensions))
  assert.equal(p.rubric.dimensions.reduce((sum, d) => sum + d.weight, 0), 100)
})

test('doubao is a first-class target for both image and video', () => {
  const all = targets()
  const image = all.find((t) => t.id === 'doubao-seedream')
  const video = all.find((t) => t.id === 'doubao-seedance')
  assert.ok(image, 'doubao image preset missing')
  assert.ok(video, 'doubao video preset missing')
  assert.equal(image.kind, 'image')
  assert.equal(video.kind, 'video')
  assert.ok(image.label.includes('豆包'))
  assert.ok(image.aliases.includes('豆包'))
  assert.ok(video.aliases.includes('豆包'))
  assert.equal(resolveTarget('豆包'), image)
  assert.equal(resolveTarget('豆包视频'), video)
})

test('resolveTarget is case and space insensitive', () => {
  assert.equal(resolveTarget('Midjourney').id, 'midjourney')
  assert.equal(resolveTarget('SDXL').id, 'sdxl')
  assert.equal(resolveTarget('不存在的东西'), null)
})

test('resolveStyle works by id and label', () => {
  assert.ok(resolveStyle('cinematic-photo'))
  assert.ok(resolveStyle('电影感摄影'))
  assert.equal(resolveStyle('cinematic-photo').id, 'cinematic-photo')
})

test('metaForClient is JSON serializable and slim', () => {
  const meta = metaForClient()
  assert.ok(meta.targets.every((t) => !t.syntaxRules))
  assert.ok(meta.styles.length >= 20)
  assert.ok(meta.taskTypes.length >= 8)
  JSON.stringify(meta)
})
