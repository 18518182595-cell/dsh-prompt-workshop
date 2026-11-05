import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function makeElementTree() {
  function element(type, props, ...children) {
    const next = { type, props: Object.assign({}, props || {}) }
    if (children.length === 1) next.props.children = children[0]
    else if (children.length > 1) next.props.children = children
    return next
  }
  return {
    createElement: element,
    useState(initial) {
      let value = typeof initial === 'function' ? initial() : initial
      return [value, (next) => { value = typeof next === 'function' ? next(value) : next }]
    },
    useEffect() {},
    useMemo(fn) { return fn() },
    useCallback(fn) { return fn },
    useRef(initial) { return { current: initial } },
    useSyncExternalStore(_subscribe, getSnapshot) { return getSnapshot() },
  }
}

function loadBundle() {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  let captured = null
  const styles = []
  const document = {
    head: { appendChild(el) { styles.push(el) } },
    createElement() { return { setAttribute() {}, remove() {}, textContent: '' } },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null },
  }
  const navigator = { clipboard: { writeText() {} } }
  const window = { __ModuleLoader__: { load(description) { captured = description } }, document }
  const context = vm.createContext({ window, document, navigator, console, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }), setTimeout, clearTimeout, URL, Promise, JSON, Object, Array, String, Number, Boolean, Date, Set, Map, Math, Symbol })
  vm.runInContext(source, context)
  const React = makeElementTree()
  const loaded = captured.factory((name) => {
    if (name === 'react') return React
    throw new Error('unexpected require: ' + name)
  })
  return { captured, loaded, React, styles }
}

function walk(node, visit) {
  if (node == null || typeof node === 'boolean') return
  if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return }
  if (typeof node === 'object') {
    visit(node)
    if (node.props && node.props.children != null) walk(node.props.children, visit)
  }
}

function findText(tree, needle) {
  let found = false
  function visit(value) {
    if (value == null || typeof value === 'boolean') return
    if (typeof value === 'string') { if (value === needle) found = true; return }
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (typeof value === 'object' && value.props) {
      if (value.props.children !== undefined) visit(value.props.children)
      for (const key of ['title', 'label', 'alt']) if (value.props[key] === needle) found = true
    }
  }
  visit(tree)
  return found
}

test('client bundle registers under its package id', () => {
  const { captured } = loadBundle()
  assert.ok(captured, 'ModuleLoader.load was not called')
  assert.equal(captured.id, 'dsh-prompt-workshop')
  assert.equal(typeof captured.factory, 'function')
})

test('client exports apply/inject and registers four slots', () => {
  const { loaded } = loadBundle()
  assert.equal(typeof loaded.apply, 'function')
  assert.deepEqual(Array.from(loaded.inject), ['slots'])
  const registered = []
  const slots = {
    inject(_name, callback) { callback() },
    register(meta, Component) { registered.push({ meta, Component }); return () => {} },
  }
  const effects = []
  const ctx = {
    get(name) { return name === 'slots' ? slots : undefined },
    effect(fn, label) { effects.push(label); const dispose = fn(); return dispose },
  }
  loaded.apply(ctx)
  assert.equal(registered.length, 4)
  const names = registered.map((r) => r.meta.name).sort()
  assert.deepEqual(names, ['conversation.input.left', 'conversation.input.overlay', 'plugins.bundle.config', 'settings.section'])
  assert.ok(effects.some((label) => String(label).includes('styles')))
})

test('trigger renders a spark button and toggles the panel store', () => {
  const { loaded, React } = loadBundle()
  const registered = []
  const slots = { inject(_n, cb) { cb() }, register(meta, Component) { registered.push({ meta, Component }) } }
  loaded.apply({ get: () => slots, effect: (fn) => fn() })
  const triggerSlot = registered.find((r) => r.meta.name === 'conversation.input.left')
  const triggerElement = triggerSlot.Component()
  assert.equal(typeof triggerElement.type, 'function')
  const button = triggerElement.type()
  assert.equal(button.props.children, '✨')
  assert.equal(typeof button.props.onClick, 'function')
  assert.equal(button.props.className.indexOf('on') >= 0, false)
  button.props.onClick({ preventDefault() {}, stopPropagation() {} })
  const buttonAfter = triggerElement.type()
  assert.ok(buttonAfter.props.className.indexOf('on') >= 0)
})

test('panel renders the workbench skeleton when open', () => {
  const { loaded } = loadBundle()
  const registered = []
  const slots = { inject(_n, cb) { cb() }, register(meta, Component) { registered.push({ meta, Component }) } }
  loaded.apply({ get: () => slots, effect: (fn) => fn() })
  const trigger = registered.find((r) => r.meta.name === 'conversation.input.left')
  // open the panel through the shared store
  trigger.Component().type().props.onClick({ preventDefault() {}, stopPropagation() {} })
  const overlay = registered.find((r) => r.meta.name === 'conversation.input.overlay')
  const panelElement = overlay.Component({ inputActions: {}, useInput: null })
  const panel = panelElement.type(panelElement.props)
  assert.notEqual(panel, null)
  assert.ok(findText(panel, '✨ 提示词工坊') || findText(panel, '生成精准提示词'))
  assert.ok(findText(panel, '生成精准提示词') || findText(panel, '高级选项'))
})

function loadSettingsWithFakeState() {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const start = source.indexOf('function SettingsSection(props)')
  const end = source.indexOf('// -------------------------------------------------------------- slot wiring')
  let section = source.slice(start, end)
  const fakeData = {
    settings: { defaults: { targetId: 'doubao-seedream', styleId: '', language: 'auto', variants: 3, insertMode: 'manual', promptInjection: true, knowledge: { autoUpdate: true, intervalDays: 5 } }, usage: { calls: 2, failures: 0 } },
    catalog: { ok: true, providers: [{ id: 'deepseek-account', name: 'DeepSeek Account', models: [{ id: 'deepseek-flash', name: 'Flash', inputModalities: ['text', 'image'] }] }] },
    presets: { targets: [{ id: 'doubao-seedream', label: '豆包 Seedream', kind: 'image' }], styles: [{ id: 'cinematic-photo', label: '电影感', appliesTo: ['image'] }], taskTypes: [] },
    presetMeta: { targetCount: 19, styleCount: 24, version: '1.0.0', updatedAt: '2026-11-05' },
    knowledge: { autoUpdate: true, intervalDays: 5, lastCheckedAt: Date.now(), nextCheckAt: Date.now() + 1000, counts: { targets: 2, newTargets: 0, styles: 0, sources: 14 }, runs: 5, failures: 2, lastError: '', lastReport: { report: 'test report' } },
    agentDefault: { provider: 'deepseek-account', model: 'deepseek-flash' },
  }
  const fakeForm = { targetId: 'doubao-seedream', styleId: '', enhancer: '', language: 'auto', variants: 3, insertMode: 'manual', promptInjection: true, knowledgeAuto: true, knowledgeDays: 5 }
  section = section.replace('var loadingState = React.useState(true)', 'var loadingState = React.useState(false)')
  section = section.replace('var dataState = React.useState(null)', 'var dataState = React.useState(' + JSON.stringify(fakeData) + ')')
  section = section.replace('var formState = React.useState(null)', 'var formState = React.useState(' + JSON.stringify(fakeForm) + ')')
  const patched = source.slice(0, start) + section + source.slice(end)
  let captured = null
  const document = {
    head: { appendChild() {} },
    createElement() { return { setAttribute() {}, remove() {}, textContent: '' } },
    addEventListener() {}, removeEventListener() {}, querySelector() { return null },
  }
  const context = vm.createContext({ window: { __ModuleLoader__: { load(description) { captured = description } } }, document, navigator: { clipboard: { writeText() {} } }, console, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }), setTimeout, clearTimeout, URL, Promise, JSON, Object, Array, String, Number, Boolean, Date, Set, Map, Math, Symbol })
  vm.runInContext(patched, context)
  const React = makeElementTree()
  const loaded = captured.factory((name) => { if (name === 'react') return React; throw new Error('unexpected require: ' + name) })
  const registered = []
  const slots = { inject(_n, cb) { cb() }, register(meta, Component) { registered.push({ meta, Component }); return () => {} } }
  loaded.apply({ get: (name) => name === 'slots' ? slots : undefined, effect: (fn) => fn() })
  const sectionSlot = registered.find((r) => r.meta.name === 'settings.section')
  const wrapper = sectionSlot.Component({ ctx: {} })
  return wrapper.type(wrapper.props)
}

test('settings section renders with loaded state (blank-page regression)', () => {
  const tree = loadSettingsWithFakeState()
  assert.notEqual(tree, null)
  assert.ok(findText(tree, '知识库自动更新'), 'knowledge section title missing')
  assert.ok(findText(tree, '默认目标生成器'))
  assert.ok(findText(tree, '保存设置'))
  assert.ok(findText(tree, '立即收集'))
})

function loadPanelWithFakeState() {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const start = source.indexOf('function StudioPanel(props)')
  const end = source.indexOf('// --------------------------------------------------------------- settings')
  if (end < 0) throw new Error('settings marker not found')
  let panel = source.slice(start, end)
  const fakeData = {
    settings: { defaults: { targetId: 'doubao-seedream', styleId: '', language: 'auto', variants: 3 } },
    catalog: { ok: true, providers: [{ id: 'deepseek-account', name: 'DeepSeek', models: [{ id: 'deepseek-flash', name: 'Flash', inputModalities: ['text', 'image'] }] }] },
    presets: { targets: [{ id: 'doubao-seedream', label: '豆包 Seedream', kind: 'image' }], styles: [{ id: 'cinematic-photo', label: '电影感', appliesTo: ['image'] }], taskTypes: [{ id: 'text2image', label: '文生图', kind: 'image' }] },
    presetMeta: { version: '1.0.0', updatedAt: '2026-11-05' },
    knowledge: { autoUpdate: true, intervalDays: 5, lastCheckedAt: Date.now(), nextCheckAt: Date.now() + 1000, counts: { targets: 2, newTargets: 0, styles: 0, sources: 14 } },
    agentDefault: { provider: 'deepseek-account', model: 'deepseek-flash' },
    history: [],
  }
  panel = panel.replace('var dataState = React.useState(null)', 'var dataState = React.useState(' + JSON.stringify(fakeData) + ')')
  const patched = source.slice(0, start) + panel + source.slice(end)
  let captured = null
  const document = {
    head: { appendChild() {} },
    createElement() { return { setAttribute() {}, remove() {}, textContent: '' } },
    addEventListener() {}, removeEventListener() {}, querySelector() { return null },
  }
  const context = vm.createContext({ window: { __ModuleLoader__: { load(description) { captured = description } } }, document, navigator: { clipboard: { writeText() {} } }, console, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }), setTimeout, clearTimeout, URL, Promise, JSON, Object, Array, String, Number, Boolean, Date, Set, Map, Math, Symbol })
  vm.runInContext(patched, context)
  const React = makeElementTree()
  const loaded = captured.factory((name) => { if (name === 'react') return React; throw new Error('unexpected require: ' + name) })
  const registered = []
  const slots = { inject(_n, cb) { cb() }, register(meta, Component) { registered.push({ meta, Component }); return () => {} } }
  loaded.apply({ get: (n) => n === 'slots' ? slots : undefined, effect: (fn) => fn() })
  const trigger = registered.find((r) => r.meta.name === 'conversation.input.left')
  trigger.Component().type().props.onClick({ preventDefault() {}, stopPropagation() {} })
  const overlay = registered.find((r) => r.meta.name === 'conversation.input.overlay')
  const element = overlay.Component({ inputActions: {}, useInput: null })
  return element.type(element.props)
}

test('panel renders with loaded state and target list', () => {
  const tree = loadPanelWithFakeState()
  assert.notEqual(tree, null)
  assert.ok(findText(tree, '✨ 提示词工坊'))
  assert.ok(findText(tree, '🖼️ 图片反推'))
  assert.ok(findText(tree, '生成精准提示词'))
})

test('client helper exports work', () => {
  const { loaded } = loadBundle()
  const helpers = loaded.__test
  assert.equal(helpers.splitModelKey('deepseek-account/deepseek-flash').provider, 'deepseek-account')
  const models = helpers.flattenModels({ providers: [{ id: 'p', name: 'P', models: [{ id: 'm1', name: 'M1' }, { id: 'm2' }] }] })
  assert.equal(models.length, 2)
  assert.equal(models[0].key, 'p/m1')
  assert.equal(helpers.findModel(models, 'p/m2').name, 'm2')
  assert.equal(helpers.formatTime(0).length > 0, true)
})
