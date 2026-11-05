import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const temp = mkdtempSync(join(tmpdir(), 'pst-service-'))
process.env.DSH_HOME = temp
const service = await import('../lib/service.js')

test('knowledgeState/reset work without DSH services', () => {
  const state = service.knowledgeState()
  assert.equal(state.ok, true)
  assert.equal(state.knowledge.autoUpdate, true)
  assert.equal(state.knowledge.intervalDays, 5)
  const reset = service.resetKnowledgeState()
  assert.equal(reset.ok, true)
  assert.equal(reset.knowledge.counts.targets, 0)
})

test('runKnowledgeCollection fails cleanly without ctx.web', async () => {
  const result = await service.runKnowledgeCollection({}, {})
  assert.equal(result.ok, false)
  assert.equal(result.code, 'KNOWLEDGE_NO_WEB')
  assert.ok(result.error.includes('web'))
})

test('reversePrompt fails cleanly without image/attachments', async () => {
  const noImage = await service.reversePrompt({}, {}, {})
  assert.equal(noImage.ok, false)
  assert.equal(noImage.code, 'NO_IMAGE')
  const noAttachments = await service.reversePrompt({}, { image: { dataBase64: Buffer.from('x').toString('base64'), mime: 'image/png' } }, {})
  assert.equal(noAttachments.ok, false)
  assert.ok(['NO_ATTACHMENTS', 'NO_MODEL'].includes(noAttachments.code))
})

test('clientState reports knowledge summary even without llm', async () => {
  const state = await service.clientState({ get: () => undefined })
  assert.equal(state.ok, true)
  assert.ok(state.knowledge)
  assert.ok(Array.isArray(state.presets.targets))
  assert.ok(state.catalog && state.catalog.ok === false)
})

test('listTargets filters by kind and keyword', () => {
  const video = service.listTargets({ kind: 'video' })
  assert.equal(video.ok, true)
  assert.ok(video.targets.length >= 8)
  assert.ok(video.targets.every((target) => target.kind === 'video'))
  const doubao = service.listTargets({ q: '豆包' })
  assert.ok(doubao.targets.length >= 2)
})

test('cleanup', () => { rmSync(temp, { recursive: true, force: true }) })
