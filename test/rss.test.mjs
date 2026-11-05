import { test } from 'node:test'
import assert from 'node:assert/strict'
const collector = await import('../lib/collector.js')
const knowledge = await import('../lib/knowledge.js')

const SAMPLE = '<?xml version="1.0" encoding="utf-8" ?><rss version="2.0"><channel><title>必应：test</title><item><title>Midjourney Docs</title><link>https://docs.midjourney.com/hc/en-us</link><description>Official &amp; updated parameter guide</description><pubDate>Wed, 04 Nov 2026 11:31:00 GMT</pubDate></item><item><title>No link</title><description>x</description></item><item><title>中文条目</title><link>https://example.com/zh</link><description><![CDATA[<b>加粗</b> 描述]]></description></item></channel></rss>'

test('parseBingRss extracts valid items', () => {
  const items = collector.parseBingRss(SAMPLE, 'q1')
  assert.equal(items.length, 2)
  assert.equal(items[0].url, 'https://docs.midjourney.com/hc/en-us')
  assert.ok(items[0].title.includes('Midjourney'))
  assert.ok(items[0].snippet.includes('Official'))
  assert.equal(items[1].snippet, '加粗 描述')
  assert.equal(items[1].publishedAt, '')
})

test('collector queries include site filters and 豆包/Kling topics', () => {
  const q1 = collector.buildQueries(5, Date.now())
  assert.ok(q1.length >= 6)
  assert.ok(q1.some((q) => q.includes('最近 5 天')))
})

test('rssSearch degrades cleanly when fetch fails', async () => {
  const ctx = { get: () => undefined, web: undefined }
  const out = await collector.rssSearch(ctx, ['x'], undefined)
  assert.ok(Array.isArray(out.sources))
  assert.ok(out.errors.length >= 1)
})

test('rssSearch parses fetched RSS via injectable web service', async () => {
  const ctx = {
    web: {
      async fetch() { return { status: 200, body: { kind: 'text', content: SAMPLE } } },
    },
  }
  const out = await collector.rssSearch(ctx, ['q'], undefined)
  assert.equal(out.sources.length, 2)
  assert.equal(out.errors.length, 0)
})

test('buildCollectorPrompt tolerates RSS materials', () => {
  const prompt = knowledge.buildCollectorPrompt({ base: { targets: [] }, sinceDays: 5, materials: '### 来源 1\nURL：https://x\n最近更新', now: Date.now() })
  assert.ok(prompt.includes('最近 5 天'))
  assert.ok(prompt.includes('https://x'))
})
