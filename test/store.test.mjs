import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadStore, patchStore, appendHistory, removeHistory, clearHistory, defaultSettings, storePath } from '../lib/store.js'

function sandboxEnv() {
  const dir = mkdtempSync(join(tmpdir(), 'pst-store-'))
  return { env: { DSH_HOME: dir }, dir }
}

test('defaults are coherent', () => {
  const d = defaultSettings()
  assert.equal(d.defaults.targetId, 'generic-image')
  assert.equal(d.defaults.variants, 3)
  assert.equal(d.defaults.insertMode, 'manual')
  assert.ok(Array.isArray(d.history))
})

test('store round-trips and patches defaults', () => {
  const { env, dir } = sandboxEnv()
  try {
    const empty = loadStore(env)
    assert.equal(empty.defaults.targetId, 'generic-image')
    assert.ok(storePath(env).startsWith(dir))
    const next = patchStore({ defaults: { targetId: 'doubao-seedream', variants: 2 } }, env)
    assert.equal(next.defaults.targetId, 'doubao-seedream')
    assert.equal(next.defaults.variants, 2)
    assert.equal(next.defaults.language, 'auto')
    const reread = loadStore(env)
    assert.equal(reread.defaults.targetId, 'doubao-seedream')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('history appends newest first, dedupes removal and clears', () => {
  const { env, dir } = sandboxEnv()
  try {
    appendHistory({ id: 'a', input: 'first' }, env)
    const list = appendHistory({ id: 'b', input: 'second' }, env)
    assert.equal(list.length, 2)
    assert.equal(list[0].id, 'b')
    const afterRemove = removeHistory('b', env)
    assert.equal(afterRemove.length, 1)
    assert.equal(afterRemove[0].id, 'a')
    clearHistory(env)
    assert.equal(loadStore(env).history.length, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('history is capped', () => {
  const { env, dir } = sandboxEnv()
  try {
    for (let i = 0; i < 70; i += 1) appendHistory({ id: 'e' + i, input: 'x' }, env)
    assert.equal(loadStore(env).history.length, 60)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
