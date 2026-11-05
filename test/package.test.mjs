import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

test('all package.json declared resources exist', () => {
  const refs = new Set()
  const add = (value) => { if (typeof value === 'string' && value && !value.includes('*')) refs.add(value.replace(/^\.\//, '')) }
  add(pkg.main); add(pkg.icon)
  for (const value of Object.values(pkg.exports || {})) add(value)
  add(pkg.dsh?.bundle?.patch)
  for (const value of pkg.files || []) add(value)
  for (const ref of refs) assert.ok(existsSync(join(root, ref)), 'missing declared resource: ' + ref)
})

test('plugin icon follows app-boot metadata constraints', () => {
  const icon = pkg.icon
  assert.ok(typeof icon === 'string' && icon.length > 0)
  assert.ok(!icon.startsWith('/') && !/^[A-Za-z]:/.test(icon), 'icon must be a relative path')
  const file = join(root, icon)
  assert.ok(existsSync(file))
  const stat = statSync(file)
  assert.ok(stat.isFile())
  assert.ok(stat.size <= 256 * 1024, 'icon must be <= 256 KiB')
  assert.ok(['.svg', '.png', '.jpg', '.jpeg', '.webp'].includes(extname(icon).toLowerCase()))
})

test('locale metadata is valid and exported', () => {
  assert.ok(pkg.exports['./locale/*.json'], 'locale subpath must be exported for plugin metadata')
  for (const lang of ['zh', 'en']) {
    const file = join(root, 'locale', lang + '.json')
    assert.ok(existsSync(file), 'missing locale ' + lang)
    const doc = JSON.parse(readFileSync(file, 'utf8'))
    assert.ok(doc.meta && typeof doc.meta.title === 'string' && doc.meta.title.trim())
    assert.ok(doc.meta && typeof doc.meta.description === 'string' && doc.meta.description.trim())
    assert.ok(doc.meta.description.length <= 260, 'description should stay short')
  }
})

test('package description is short and comprehensive', () => {
  assert.ok(pkg.description.length >= 40)
  assert.ok(pkg.description.length <= 220)
  assert.ok(pkg.description.includes('提示词'))
})
