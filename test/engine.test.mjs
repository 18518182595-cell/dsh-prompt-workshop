import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadPresets, resolveTarget } from '../lib/presets.js'
import {
  buildEnhanceRequest, buildScoreRequest, parseJsonLoose, normalizeResult, reviewPromptText,
} from '../lib/engine.js'

const target = resolveTarget('midjourney')
const doubao = resolveTarget('豆包')
const tasks = loadPresets().taskTypes

test('enhance request carries target rules, task, style, checklist and JSON contract', () => {
  const text = buildEnhanceRequest({
    input: '一个女孩在海边看日落',
    target,
    taskType: tasks.find((t) => t.id === 'text2image'),
    style: loadPresets().styles[0],
    language: 'auto',
    variants: 4,
  })
  assert.ok(text.includes('Midjourney'))
  assert.ok(text.includes('--ar'))
  assert.ok(text.includes('一个女孩在海边看日落'))
  assert.ok(text.includes('variations 恰好 4 条'))
  assert.ok(text.includes('严格输出一个 JSON 对象'))
  assert.ok(text.includes('质量检查清单'))
})

test('enhance request uses Chinese-native instruction for doubao', () => {
  const text = buildEnhanceRequest({ input: '江南水乡', target: doubao, taskType: tasks.find((t) => t.id === 'text2image'), variants: 2 })
  assert.ok(text.includes('豆包'))
  assert.ok(text.includes('简体中文'))
})

test('parseJsonLoose tolerates fences and prose', () => {
  const parsed = parseJsonLoose('前言\n~~~json\n' + JSON.stringify({ prompt: 'a photo', score: 88 }) + '\n~~~\n后记')
  assert.equal(parsed && parsed.prompt, 'a photo') // brace extraction still finds it
  const fenced = parseJsonLoose('前言\n```json\n' + JSON.stringify({ prompt: 'a photo', score: 88 }) + '\n```\n后记')
  assert.equal(fenced.prompt, 'a photo')
  const direct = parseJsonLoose(JSON.stringify({ prompt: 'b' }))
  assert.equal(direct.prompt, 'b')
  const broken = parseJsonLoose('no json here at all')
  assert.equal(broken, null)
})

test('normalizeResult fills defaults and clamps score', () => {
  const result = normalizeResult({ prompt: 'x', score: 150, variations: ['v1', 2, 'v2'], gaps: ['g'] }, { target, variants: 2 })
  assert.equal(result.prompt, 'x')
  assert.equal(result.score, 100)
  assert.deepEqual(result.variations, ['v1', 'v2'])
  assert.deepEqual(result.gaps, ['g'])
})

test('normalizeResult falls back to plain text', () => {
  const result = normalizeResult(null, { target, rawText: 'a rusty robot in the rain', variants: 3 })
  assert.ok(result.prompt.includes('rusty robot'))
  assert.equal(result.parseWarning, 'non-json')
  assert.equal(typeof result.score, 'number')
})

test('review flags missing technical syntax for midjourney', () => {
  const review = reviewPromptText('a cat sitting on a chair in a cozy room, soft light', target)
  assert.ok(review.gaps.some((gap) => gap.includes('参数适配')))
  assert.ok(review.score < 100)
})

test('review rewards a complete prompt', () => {
  const complete = 'a lone astronaut on a rust-red dune, golden light, wide cinematic shot, 35mm lens, shallow depth of field, muted teal palette, film grain --ar 21:9 --v 7 --stylize 300'
  const review = reviewPromptText(complete, target)
  assert.ok(review.score > 50, 'score was ' + review.score)
})

test('score request includes rubric and strict JSON format', () => {
  const text = buildScoreRequest({ prompt: 'a cat', target })
  assert.ok(text.includes('评分维度'))
  assert.ok(text.includes('rewrittenPrompt'))
  assert.ok(text.includes('严格输出 JSON'))
})
