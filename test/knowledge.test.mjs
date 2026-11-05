import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const temp = mkdtempSync(join(tmpdir(), 'pst-knowledge-'))
process.env.DSH_HOME = temp

const knowledge = await import('../lib/knowledge.js')

test('default knowledge is coherent', () => {
  const doc = knowledge.defaultKnowledge()
  assert.equal(doc.version, 1)
  assert.deepEqual(doc.overlay.targets, {})
  assert.deepEqual(doc.reports, [])
  assert.equal(doc.nextCheckAt, 0)
})

test('overlay merges into a runtime preset document', async () => {
  const base = {
    version: '1.0.0',
    sources: ['https://old.example'],
    targets: [{
      id: 'midjourney', label: 'Midjourney', kind: 'image', vendor: 'MJ', languageHint: 'en',
      syntaxRules: ['--ar 16:9'], paramHints: { stylize: '--s 100' }, do: ['a'], dont: ['b'], notes: 'old',
    }],
    styles: [{ id: 'cinematic', label: '电影感', fragment: 'cinematic', appliesTo: ['image'] }],
  }
  const overlay = {
    updatedAt: '2026-11-06T00:00:00.000Z',
    targets: {
      midjourney: {
        id: 'midjourney', versionNote: 'V8.2 默认', syntaxRulesAdd: ['--no 排除', '--ar 16:9'],
        paramHints: { weird: '--weird 0-3000' }, doAdd: ['a2'], dontAdd: ['b2'], notesAdd: ['n1'],
      },
      unknown: { id: 'unknown', versionNote: 'ignored' },
    },
    newTargets: [{ id: 'doubao-x', label: '豆包 X', kind: 'image', vendor: '豆包', syntaxRules: ['中文'], examples: [] }],
    styles: [{ id: 'new-style', label: '新风格', fragment: 'frag', appliesTo: ['image', 'video'] }],
    notes: ['note-1'],
    sources: [{ url: 'https://new.example', title: 'new' }, { url: 'https://old.example', title: 'dup' }],
  }
  const merged = knowledge.applyOverlayToPresets(base, overlay)
  const mj = merged.targets.find((target) => target.id === 'midjourney')
  assert.equal(mj.syntaxRules.filter((rule) => rule === '--ar 16:9').length, 1)
  assert.ok(mj.syntaxRules.includes('--no 排除'))
  assert.equal(mj.paramHints.weird, '--weird 0-3000')
  assert.ok(mj.notes.includes('V8.2'))
  assert.ok(merged.targets.find((target) => target.id === 'doubao-x'))
  assert.ok(merged.styles.find((style) => style.id === 'new-style'))
  assert.deepEqual(merged.knowledgeNotes, ['note-1'])
  assert.equal(merged.sources.length, 2)
  assert.equal(merged.updatedAt, '2026-11-06T00:00:00.000Z')
  assert.equal(merged.targets.find((target) => target.id === 'unknown'), undefined)
})

test('parseCollectorResult sanitizes and caps model output', () => {
  const raw = JSON.stringify({
    report: '本轮发现 X',
    updatedAt: '2026-11-06',
    targets: [
      { id: 'midjourney', syntaxRulesAdd: ['new rule', 42], paramHints: { weird: '--w 0-3000', bad: { nested: true } }, doAdd: ['d1'] },
      { id: '', syntaxRulesAdd: ['no id'] },
      null,
    ],
    newTargets: [
      { id: 'doubao-new', label: '豆包新模型', kind: 'image', vendor: '豆包', syntaxRules: ['中文'], languageHint: 'zh' },
      { id: 'bad', label: '', kind: 'image' },
    ],
    styles: [{ id: 'ink', label: '水墨', fragment: 'ink wash', appliesTo: ['image'] }, { id: 'bad' }],
    notes: ['技巧1'],
    sources: [{ url: 'https://a.example', title: 'A' }, 'https://b.example', { title: 'no url' }],
  })
  const parsed = knowledge.parseCollectorResult('前缀\n' + raw + '\n后缀')
  assert.ok(parsed)
  assert.equal(parsed.report, '本轮发现 X')
  assert.equal(parsed.targets.length, 1)
  assert.deepEqual(parsed.targets[0].syntaxRulesAdd, ['new rule'])
  assert.equal(parsed.targets[0].paramHints.bad, undefined)
  assert.equal(parsed.newTargets.length, 1)
  assert.equal(parsed.newTargets[0].languageHint, 'zh')
  assert.equal(parsed.styles.length, 1)
  assert.equal(parsed.sources.length, 2)
  assert.equal(knowledge.parseCollectorResult('no json here'), null)
})

test('foldCollectorResult updates overlay, stats and schedule', () => {
  const now = Date.parse('2026-11-06T00:00:00Z')
  const base = knowledge.defaultKnowledge()
  const parsed = knowledge.parseCollectorResult(JSON.stringify({
    report: '发现新参数',
    targets: [{ id: 'flux', syntaxRulesAdd: ['rule-a'] }],
    newTargets: [{ id: 'new-model', label: '新模型', kind: 'video', vendor: 'X' }],
    styles: [],
    notes: ['note'],
    sources: [{ url: 'https://x.example', title: 'X' }],
  }))
  const folded = knowledge.foldCollectorResult(base, parsed, {
    now,
    sinceDays: 5,
    settings: { intervalDays: 5, autoUpdate: true },
    model: 'deepseek-account / deepseek-flash',
  })
  assert.equal(folded.lastCheckedAt, now)
  assert.equal(folded.nextCheckAt, now + 5 * 24 * 3600 * 1000)
  assert.equal(folded.stats.runs, 1)
  assert.equal(folded.reports[0].counts.targetsUpdated, 1)
  assert.equal(folded.reports[0].counts.newTargets, 1)
  assert.ok(folded.overlay.targets.flux.syntaxRulesAdd.includes('rule-a'))
  assert.equal(folded.overlay.newTargets[0].id, 'new-model')
  assert.equal(folded.overlay.sources.length, 1)
  const summary = knowledge.knowledgeSummary(folded, { intervalDays: 5 })
  assert.equal(summary.counts.targets, 1)
  assert.equal(summary.counts.sources, 1)
  assert.equal(summary.lastReport.report, '发现新参数')
})

test('shouldCollect respects switch and due time', () => {
  const now = Date.now()
  assert.equal(knowledge.shouldCollect({ nextCheckAt: now - 1000 }, { autoUpdate: false }, now), false)
  assert.equal(knowledge.shouldCollect({ nextCheckAt: 0 }, { autoUpdate: true }, now), false)
  assert.equal(knowledge.shouldCollect({ nextCheckAt: now + 1000 }, { autoUpdate: true }, now), false)
  assert.equal(knowledge.shouldCollect({ nextCheckAt: now - 1000 }, { autoUpdate: true }, now), true)
  const next = knowledge.nextCheckAt({ intervalDays: 5 }, now)
  assert.ok(next > now)
})

test('buildCollectorPrompt carries targets, materials and strict JSON contract', () => {
  const prompt = knowledge.buildCollectorPrompt({
    base: { targets: [{ id: 'midjourney', label: 'Midjourney', kind: 'image', vendor: 'MJ', versionNote: 'V8.2' }] },
    sinceDays: 5,
    now: Date.parse('2026-11-06T00:00:00Z'),
    materials: '### 来源 1\nURL：https://x\n新参数 --weird',
    pendingText: '上次待核实：--ow 范围',
  })
  assert.ok(prompt.includes('最近 5 天'))
  assert.ok(prompt.includes('2026-11-06'))
  assert.ok(prompt.includes('midjourney'))
  assert.ok(prompt.includes('--weird'))
  assert.ok(prompt.includes('newTargets'))
  assert.ok(prompt.includes('严格 JSON'))
})

test('knowledge file round-trips through DSH_HOME', () => {
  const doc = knowledge.defaultKnowledge()
  doc.lastCheckedAt = 123
  doc.overlay.notes = ['x']
  knowledge.saveKnowledge(doc)
  const loaded = knowledge.loadKnowledge()
  assert.equal(loaded.lastCheckedAt, 123)
  assert.deepEqual(loaded.overlay.notes, ['x'])
  assert.ok(knowledge.knowledgePath().startsWith(temp))
  rmSync(temp, { recursive: true, force: true })
})
