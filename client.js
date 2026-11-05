/**
 * dsh-prompt-workshop — client half (browser bundle).
 *
 * Loaded by the DSH client module system as a single self-contained bundle:
 *   window.__ModuleLoader__.load({ id: 'dsh-prompt-workshop', factory })
 * The factory returns Cordis plugin exports (apply/inject). Slots come from
 * ctx.get('slots'); all data goes through the host route /dsh-prompt-workshop.
 */
window.__ModuleLoader__.load({
  id: 'dsh-prompt-workshop',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var React = require('react')
    var h = React.createElement

    var PLUGIN_ID = 'dsh-prompt-workshop'
    var API_BASE = '/dsh-prompt-workshop'
    var KIND_LABEL = { image: '图像', video: '视频', text: '文本' }
    var TASK_LABEL_KIND = { text2image: 'image', image2image: 'image', text2video: 'video', image2video: 'video' }

    var CSS = [
      '.psp-trigger{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:15px;line-height:1;padding:0}',
      '.psp-trigger:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.psp-trigger.on{color:var(--dsw-alias-brand-primary)}',
      '.psp-panel{position:fixed;left:50%;bottom:112px;transform:translateX(-50%);z-index:70;width:min(620px,calc(100vw - 28px));max-height:min(74vh,700px);overflow:auto;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 16px 48px rgba(0,0,0,.30);font-size:13px;color:var(--dsw-alias-label-primary)}',
      '.psp-head{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600}',
      '.psp-head .psp-badge{font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:1px 8px}',
      '.psp-close{margin-left:auto;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:17px;line-height:1;padding:2px 7px;border-radius:6px}',
      '.psp-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.psp-label{font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.psp-panel textarea,.psp-panel select,.psp-panel input[type=text]{box-sizing:border-box;width:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;outline:none}',
      '.psp-panel textarea{resize:vertical;min-height:72px;line-height:1.55}',
      '.psp-panel textarea:focus,.psp-panel select:focus,.psp-panel input[type=text]:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.psp-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}',
      '.psp-row>.psp-field{flex:1;min-width:150px}',
      '.psp-field{display:flex;flex-direction:column;gap:4px}',
      '.psp-panel button{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit}',
      '.psp-panel button:hover{border-color:var(--dsw-alias-brand-primary)}',
      '.psp-panel button:disabled{opacity:.5;cursor:default}',
      '.psp-panel .psp-primary{background:var(--dsw-alias-button-primary-fill);border-color:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:600}',
      '.psp-panel .psp-primary:hover{background:var(--dsw-alias-button-primary-hover);border-color:var(--dsw-alias-button-primary-hover)}',
      '.psp-note{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.5}',
      '.psp-error{font-size:12px;color:#e5484d;line-height:1.5;white-space:pre-wrap}',
      '.psp-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px;background:var(--dsw-alias-bg-base);display:flex;flex-direction:column;gap:7px}',
      '.psp-card .psp-title{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.psp-card .psp-score{margin-left:auto;font-weight:600;color:var(--dsw-alias-brand-primary)}',
      '.psp-prompt{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.65;max-height:220px;overflow:auto;background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:8px 10px}',
      '.psp-acts{display:flex;gap:6px;flex-wrap:wrap}',
      '.psp-acts button{padding:3px 10px;font-size:12px}',
      '.psp-chiprow{display:flex;gap:6px;flex-wrap:wrap}',
      '.psp-chip{border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;background:transparent;color:var(--dsw-alias-label-secondary)}',
      '.psp-chip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.psp-kv{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:12px}',
      '.psp-kv .k{color:var(--dsw-alias-label-secondary)}',
      '.psp-list{margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-primary)}',
      '.psp-history{display:flex;flex-direction:column;gap:6px}',
      '.psp-history .psp-hrow{display:flex;align-items:center;gap:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;font-size:12px}',
      '.psp-history .psp-hrow .psp-hmeta{color:var(--dsw-alias-label-secondary);flex:none}',
      '.psp-history .psp-hrow .psp-htext{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.psp-settings{display:flex;flex-direction:column;gap:12px;padding:6px 2px;font-size:13px;color:var(--dsw-alias-label-primary);max-width:620px}',
      '.psp-settings .psp-field{display:flex;flex-direction:column;gap:5px}',
      '.psp-settings .psp-field>span{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.psp-settings select,.psp-settings input[type=text]{box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 10px;font-size:13px;outline:none;max-width:360px}',
      '.psp-settings .psp-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.psp-settings button{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:5px 14px;font-size:13px;cursor:pointer}',
      '.psp-settings button.psp-primary{background:var(--dsw-alias-button-primary-fill);border-color:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.psp-settings button:disabled{opacity:.5;cursor:default}',
      '.psp-divider{height:1px;background:var(--dsw-alias-border-l1);margin:2px 0}',
      '.psp-section-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.04em}',
    ].join('')

    function createOwnedStyle(css) {
      var el = document.createElement('style')
      el.setAttribute('data-plugin', PLUGIN_ID)
      el.textContent = css
      document.head.appendChild(el)
      return el
    }

    function apiGet(path) {
      return fetch(API_BASE + path, { headers: { Accept: 'application/json' } }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
    }
    function apiPost(path, payload) {
      return fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload || {}),
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok && (!data || data.ok !== false)) throw new Error('HTTP ' + res.status)
          return data
        })
      })
    }

    function makeStore() {
      var value = false
      var subs = new Set()
      return {
        get: function () { return value },
        set: function (next) { value = !!next; subs.forEach(function (fn) { fn() }) },
        subscribe: function (fn) { subs.add(fn); return function () { subs.delete(fn) } },
      }
    }
    var panelStore = makeStore()

    var stateCache = null
    function loadState(force) {
      if (stateCache && !force) return Promise.resolve(stateCache)
      return apiGet('/state').then(function (data) { stateCache = data; return data })
    }
    function invalidateState() { stateCache = null }

    function flattenModels(catalog) {
      var out = []
      var providers = (catalog && catalog.providers) || []
      providers.forEach(function (provider) {
        ;(provider.models || []).forEach(function (model) {
          out.push({ key: provider.id + '/' + model.id, provider: provider.id, providerName: provider.name || provider.id, model: model.id, name: model.name || model.id })
        })
      })
      return out
    }
    function splitModelKey(key) {
      if (!key || typeof key !== 'string' || key.indexOf('/') < 0) return null
      var index = key.indexOf('/')
      return { provider: key.slice(0, index), model: key.slice(index + 1) }
    }
    function findModel(models, key) {
      for (var i = 0; i < models.length; i += 1) if (models[i].key === key) return models[i]
      return null
    }
    function findTarget(presets, id) {
      var list = (presets && presets.targets) || []
      for (var i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i]
      return null
    }
    function firstTaskOfKind(taskTypes, kind) {
      for (var i = 0; i < taskTypes.length; i += 1) if (taskTypes[i].kind === kind) return taskTypes[i].id
      return ''
    }
    function formatTime(ts) {
      try {
        var d = new Date(ts)
        var pad = function (n) { return n < 10 ? '0' + n : '' + n }
        return (d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
      } catch (e) { return '' }
    }
    function copyToClipboard(text) {
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text) } catch (e) { /* ignore */ }
    }

    // ------------------------------------------------------------ trigger button
    function SparkButton() {
      var open = React.useSyncExternalStore(panelStore.subscribe, panelStore.get)
      return h('button', {
        type: 'button',
        className: open ? 'psp-trigger on' : 'psp-trigger',
        title: '提示词工坊：把粗糙想法变成精准提示词',
        'aria-label': '打开提示词工坊',
        onClick: function (event) { event.preventDefault(); event.stopPropagation(); panelStore.set(!open) },
      }, '✨')
    }

    // ---------------------------------------------------------------- panel
    function StudioPanel(props) {
      var actions = props && props.inputActions
      var useInput = props && typeof props.useInput === 'function' ? props.useInput : null
      var inputState = useInput ? useInput(function (s) { return s }) : null
      var draft = inputState && typeof inputState.draft === 'string' ? inputState.draft : ''
      var open = React.useSyncExternalStore(panelStore.subscribe, panelStore.get)

      var dataState = React.useState(null); var data = dataState[0]; var setData = dataState[1]
      var ideaState = React.useState(''); var idea = ideaState[0]; var setIdea = ideaState[1]
      var formState = React.useState({ targetId: '', taskType: '', styleId: '', language: 'auto', variants: 3, enhancer: '', extra: '' })
      var form = formState[0]; var setForm = formState[1]
      var resultState = React.useState(null); var result = resultState[0]; var setResult = resultState[1]
      var busyState = React.useState(false); var busy = busyState[0]; var setBusy = busyState[1]
      var errorState = React.useState(''); var error = errorState[0]; var setError = errorState[1]
      var historyState = React.useState([]); var history = historyState[0]; var setHistory = historyState[1]
      var showAdvState = React.useState(false); var showAdv = showAdvState[0]; var setShowAdv = showAdvState[1]
      var imageState = React.useState(null); var image = imageState[0]; var setImage = imageState[1]
      var reverseBusyState = React.useState(false); var reverseBusy = reverseBusyState[0]; var setReverseBusy = reverseBusyState[1]

      React.useEffect(function () {
        if (!open) return undefined
        var alive = true
        loadState(false).then(function (next) {
          if (!alive) return
          setData(next)
          setHistory((next && next.history) || [])
          var conf = (next && next.settings && next.settings.defaults) || {}
          var presets = (next && next.presets) || {}
          var target = findTarget(presets, conf.targetId) || (presets.targets || [])[0] || null
          var kind = target ? target.kind : 'image'
          var enhancerKey = conf.enhancerProvider && conf.enhancerModel ? conf.enhancerProvider + '/' + conf.enhancerModel : ''
          setForm(function (prev) {
            return {
              targetId: target ? target.id : prev.targetId,
              taskType: firstTaskOfKind(presets.taskTypes || [], kind) || prev.taskType,
              styleId: conf.styleId || '',
              language: conf.language || 'auto',
              variants: conf.variants || 3,
              enhancer: enhancerKey,
              extra: '',
            }
          })
        }).catch(function (err) {
          if (alive) setError('加载配置失败：' + ((err && err.message) || err))
        })
        return function () { alive = false }
      }, [open])

      React.useEffect(function () {
        if (!open) return undefined
        var onKey = function (event) { if (event.key === 'Escape') panelStore.set(false) }
        document.addEventListener('keydown', onKey)
        return function () { document.removeEventListener('keydown', onKey) }
      }, [open])

      if (!open) return null

      var settings = (data && data.settings) || {}
      var conf = settings.defaults || {}
      var presets = (data && data.presets) || { targets: [], taskTypes: [], styles: [] }
      var models = flattenModels(data && data.catalog)
      var targetList = presets.targets || []
      var taskTypes = presets.taskTypes || []
      var styleList = presets.styles || []
      var currentTarget = findTarget(presets, form.targetId) || (conf.targetId ? findTarget(presets, conf.targetId) : null)
      var targetKind = currentTarget ? currentTarget.kind : 'image'
      var taskOptions = taskTypes.filter(function (task) { return task.kind === targetKind })
      var styleOptions = styleList.filter(function (style) { return !style.appliesTo || style.appliesTo.indexOf(targetKind) >= 0 })
      var agentDefaultKey = data && data.agentDefault ? (data.agentDefault.provider + '/' + data.agentDefault.model) : ''

      function updateForm(patch) { setForm(function (prev) { var next = {}; for (var k in prev) next[k] = prev[k]; for (var key in patch) next[key] = patch[key]; return next }) }

      function onTargetChange(id) {
        var target = findTarget(presets, id)
        var kind = target ? target.kind : 'image'
        updateForm({ targetId: id, taskType: firstTaskOfKind(taskTypes, kind) })
      }

      function insertToComposer(text) {
        if (!text) return
        var inserted = false
        try {
          if (actions && typeof actions.captureInsertion === 'function' && typeof actions.insertText === 'function') {
            inserted = actions.insertText(text, actions.captureInsertion()) === true
          }
        } catch (e) { inserted = false }
        if (!inserted) {
          try { if (actions && typeof actions.setDraft === 'function') actions.setDraft(text) } catch (e2) { /* ignore */ }
        }
        panelStore.set(false)
      }
      function sendToComposer(text) {
        if (!text) return
        try {
          if (actions && typeof actions.setDraft === 'function') actions.setDraft(text)
          if (actions && typeof actions.submit === 'function') actions.submit()
        } catch (e) { /* ignore */ }
        panelStore.set(false)
      }

      function generate(extraOverride) {
        var text = idea.trim()
        if (!text) { setError('先写一句你的想法，哪怕很粗糙。'); return }
        if (busy) return
        setBusy(true)
        setError('')
        var payload = {
          input: text,
          targetId: form.targetId,
          taskType: form.taskType,
          styleId: form.styleId,
          language: form.language,
          variants: form.variants,
          extra: extraOverride != null ? extraOverride : form.extra,
          model: form.enhancer || '',
        }
        apiPost('/enhance', payload).then(function (res) {
          if (res && res.ok) {
            setResult(res)
            invalidateState()
            if (res.historyEntry) setHistory(function (prev) { return [res.historyEntry].concat(prev || []).slice(0, 10) })
          } else {
            setError((res && (res.error || res.message)) || '生成失败，请稍后重试。')
          }
        }).catch(function (err) {
          setError('生成失败：' + ((err && err.message) || err))
        }).then(function () { setBusy(false) })
      }

      function refine(instruction) {
        if (!result || !result.result) return
        var previous = result.result.prompt || ''
        var extra = '上一版提示词：' + previous + '；优化方向：' + instruction
        if (form.extra) extra = extra + '；' + form.extra
        generate(extra)
      }

      function pickImageFile(file) {
        if (!file) return
        if (!/^image\/(png|jpeg|webp)$/.test(file.type || '')) { setError('仅支持 PNG / JPEG / WebP 图片'); return }
        if (file.size > 8 * 1024 * 1024) { setError('图片超过 8MB，请压缩后再试'); return }
        var reader = new FileReader()
        reader.onload = function () {
          var dataUrl = String(reader.result || '')
          var comma = dataUrl.indexOf(',')
          setImage({ dataUrl: dataUrl, dataBase64: comma >= 0 ? dataUrl.slice(comma + 1) : '', mime: file.type, name: file.name || 'image.png' })
        }
        reader.onerror = function () { setError('读取图片失败') }
        reader.readAsDataURL(file)
      }
      function reverseFromImage() {
        if (!image || reverseBusy) return
        setReverseBusy(true)
        setError('')
        apiPost('/reverse', {
          image: { dataBase64: image.dataBase64, mime: image.mime, name: image.name },
          targetId: form.targetId,
          language: form.language,
          variants: form.variants,
          model: form.enhancer || '',
        }).then(function (res) {
          if (res && res.ok) {
            setResult(res)
            invalidateState()
            if (res.historyEntry) setHistory(function (prev) { return [res.historyEntry].concat(prev || []).slice(0, 10) })
          } else {
            setError((res && (res.error || res.message)) || '图片反推失败')
          }
        }).catch(function (err) {
          setError('图片反推失败：' + ((err && err.message) || err))
        }).then(function () { setReverseBusy(false) })
      }

      function renderResult() {
        if (!result || !result.result) return null
        var res = result.result
        var meta = result.target ? result.target.label : ''
        if (result.enhancer && result.enhancer.label) meta += ' · ' + result.enhancer.label
        var params = res.params || {}
        var paramKeys = Object.keys(params)
        return h('div', { className: 'psp-card' },
          h('div', { className: 'psp-title' }, '生成结果', h('span', { className: 'psp-badge' }, meta)),
          h('div', { className: 'psp-prompt' }, res.prompt || ''),
          h('div', { className: 'psp-acts' },
            h('button', { type: 'button', onClick: function () { copyToClipboard(res.prompt || '') } }, '复制'),
            h('button', { type: 'button', onClick: function () { insertToComposer(res.prompt || '') } }, '插入输入框'),
            h('button', { type: 'button', onClick: function () { sendToComposer(res.prompt || '') } }, '直接发送')),
          h('div', { className: 'psp-chiprow' },
            h('button', { type: 'button', className: 'psp-chip', disabled: busy, onClick: function () { refine('更简洁，删繁就简') } }, '更简洁'),
            h('button', { type: 'button', className: 'psp-chip', disabled: busy, onClick: function () { refine('更有电影感，强化镜头与光影') } }, '更电影感'),
            h('button', { type: 'button', className: 'psp-chip', disabled: busy, onClick: function () { refine('更写实，减少风格化') } }, '更写实'),
            h('button', { type: 'button', className: 'psp-chip', disabled: busy, onClick: function () { refine('增加材质与细节描写') } }, '加细节')),
          res.negativePrompt ? h('div', null,
            h('div', { className: 'psp-label' }, '负向提示词'),
            h('div', { className: 'psp-prompt' }, res.negativePrompt),
            h('div', { className: 'psp-acts' }, h('button', { type: 'button', onClick: function () { copyToClipboard(res.negativePrompt) } }, '复制负向词'))) : null,
          paramKeys.length ? h('div', null,
            h('div', { className: 'psp-label' }, '参数建议'),
            h('div', { className: 'psp-kv' }, paramKeys.map(function (key) {
              return [h('span', { key: 'k-' + key, className: 'k' }, key), h('span', { key: 'v-' + key }, String(params[key]))]
            }))) : null,
          (res.variations && res.variations.length) ? h('div', null,
            h('div', { className: 'psp-label' }, '变体'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, res.variations.map(function (variation, index) {
              return h('div', { key: 'var-' + index, className: 'psp-card', style: { padding: '8px' } },
                h('div', { className: 'psp-prompt', style: { maxHeight: '110px' } }, variation),
                h('div', { className: 'psp-acts' },
                  h('button', { type: 'button', onClick: function () { copyToClipboard(variation) } }, '复制'),
                  h('button', { type: 'button', onClick: function () { insertToComposer(variation) } }, '插入')))
            }))) : null,
          res.explanation ? h('div', null, h('div', { className: 'psp-label' }, '说明'), h('div', { className: 'psp-note' }, res.explanation)) : null,
          (typeof res.score === 'number' || (res.gaps && res.gaps.length)) ? h('div', null,
            h('div', { className: 'psp-label' }, '自评'),
            h('div', { className: 'psp-note' }, (typeof res.score === 'number' ? res.score + '/100' : '未评分') +
              (res.gaps && res.gaps.length ? '；建议补充：' + res.gaps.join('；') : ''))) : null,
          res.targetNotes ? h('div', { className: 'psp-note' }, '目标模型注意：' + res.targetNotes) : null,
          res.parseWarning ? h('div', { className: 'psp-note' }, '模型返回的不是标准 JSON，已按纯文本展示。') : null)
      }

      function renderHistory() {
        if (!history || history.length === 0) return null
        return h('div', null,
          h('div', { className: 'psp-divider' }),
          h('div', { className: 'psp-label' }, '最近生成'),
          h('div', { className: 'psp-history' }, history.slice(0, 6).map(function (entry) {
            return h('div', { key: entry.id || String(entry.ts), className: 'psp-hrow' },
              h('span', { className: 'psp-hmeta' }, formatTime(entry.ts) + ' · ' + (entry.targetLabel || entry.targetId || '')),
              h('span', { className: 'psp-htext' }, (entry.result && entry.result.prompt) || entry.input || ''),
              h('button', {
                type: 'button',
                onClick: function () {
                  if (entry.kind === 'score') return
                  setResult({ ok: true, result: entry.result, target: { id: entry.targetId, label: entry.targetLabel || entry.targetId, kind: 'image' }, enhancer: entry.enhancer || null })
                },
              }, '恢复'))
          })))
      }

      return h('div', { className: 'psp-panel', role: 'dialog', 'aria-label': '提示词工坊', onPaste: function (event) {
          try {
            var items = event.clipboardData && event.clipboardData.items ? event.clipboardData.items : []
            for (var i = 0; i < items.length; i += 1) {
              var item = items[i]
              if (item && item.kind === 'file' && item.type && item.type.indexOf('image/') === 0) {
                event.preventDefault()
                pickImageFile(item.getAsFile())
                return
              }
            }
          } catch (e) { /* paste is best effort */ }
        } },
        h('div', { className: 'psp-head' }, '✨ 提示词工坊',
          h('span', { className: 'psp-badge' }, (presets.targets || []).length + ' 个目标模型'),
          h('button', { type: 'button', className: 'psp-close', title: '关闭', onClick: function () { panelStore.set(false) } }, '×')),
        h('div', { className: 'psp-field' },
          h('span', { className: 'psp-label' }, '粗糙想法'),
          h('textarea', {
            value: idea,
            placeholder: '例：一只戴墨镜的柴犬在海边冲浪，黄昏，电影感；或：帮我写一段新品发布的种草文案',
            onChange: function (event) { setIdea(event.target.value) },
          })),
        h('div', { className: 'psp-acts', style: { justifyContent: 'space-between' } },
          h('button', { type: 'button', disabled: !draft, title: '把当前输入框草稿带进工坊', onClick: function () { setIdea(draft) } }, '带入输入框草稿'),
          h('button', { type: 'button', onClick: function () { setShowAdv(!showAdv) } }, showAdv ? '收起高级选项' : '高级选项')),
        h('div', { className: 'psp-row' },
          h('label', { className: 'psp-field' },
            h('span', { className: 'psp-label' }, '目标生成器'),
            h('select', { value: form.targetId, onChange: function (event) { onTargetChange(event.target.value) } },
              targetList.map(function (target) {
                return h('option', { key: target.id, value: target.id }, target.label + '（' + KIND_LABEL[target.kind] + '）')
              }))),
          h('label', { className: 'psp-field' },
            h('span', { className: 'psp-label' }, '任务类型'),
            h('select', { value: form.taskType, onChange: function (event) { updateForm({ taskType: event.target.value }) } },
              taskOptions.map(function (task) { return h('option', { key: task.id, value: task.id }, task.label) })))),
        h('div', { className: 'psp-row' },
          h('label', { className: 'psp-field' },
            h('span', { className: 'psp-label' }, '风格（可选）'),
            h('select', { value: form.styleId, onChange: function (event) { updateForm({ styleId: event.target.value }) } },
              [h('option', { key: 'none', value: '' }, '不指定风格')].concat(styleOptions.map(function (style) {
                return h('option', { key: style.id, value: style.id }, style.label)
              })))),
          h('label', { className: 'psp-field' },
            h('span', { className: 'psp-label' }, '增强大模型'),
            h('select', { value: form.enhancer, onChange: function (event) { updateForm({ enhancer: event.target.value }) } },
              [h('option', { key: 'default', value: '' }, agentDefaultKey ? '跟随设置 / DSH 默认（' + agentDefaultKey + '）' : '跟随设置 / DSH 默认')].concat(
                (function () {
                  var groups = {}
                  models.forEach(function (model) {
                    if (!groups[model.provider]) groups[model.provider] = { name: model.providerName, list: [] }
                    groups[model.provider].list.push(model)
                  })
                  return Object.keys(groups).map(function (providerId) {
                    return h('optgroup', { key: providerId, label: groups[providerId].name },
                      groups[providerId].list.map(function (model) {
                        return h('option', { key: model.key, value: model.key }, model.name || model.model)
                      }))
                  })
                })())))),
        showAdv ? h('div', null,
          h('div', { className: 'psp-row' },
            h('label', { className: 'psp-field' },
              h('span', { className: 'psp-label' }, '输出语言'),
              h('select', { value: form.language, onChange: function (event) { updateForm({ language: event.target.value }) } },
                h('option', { key: 'auto', value: 'auto' }, '自动（按目标模型习惯）'),
                h('option', { key: 'zh', value: 'zh' }, '中文'),
                h('option', { key: 'en', value: 'en' }, '英文'))),
            h('label', { className: 'psp-field' },
              h('span', { className: 'psp-label' }, '变体数量'),
              h('select', { value: String(form.variants), onChange: function (event) { updateForm({ variants: Number(event.target.value) }) } },
                [1, 2, 3, 4, 5].map(function (n) { return h('option', { key: n, value: String(n) }, String(n) + ' 个') })))),
          h('label', { className: 'psp-field' },
            h('span', { className: 'psp-label' }, '附加要求（可选）'),
            h('input', { type: 'text', value: form.extra, placeholder: '例：预算低的小成本产品图；更简洁；保留中文文字「新品上市」', onChange: function (event) { updateForm({ extra: event.target.value }) } }))) : null,
        h('div', { className: 'psp-acts', style: { flexWrap: 'wrap' } },
          h('button', { type: 'button', className: 'psp-primary', disabled: busy || !idea.trim(), onClick: function () { generate(null) } }, busy ? '正在生成…' : '生成精准提示词'),
          h('label', { className: 'psp-chip', style: { cursor: 'pointer' }, title: '上传图片，反推出可复现它的精准提示词' }, '🖼️ 图片反推',
            h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', style: { display: 'none' }, onChange: function (event) { pickImageFile(event.target.files && event.target.files[0]); event.target.value = '' } })),
          image ? h('button', { type: 'button', className: 'psp-primary', disabled: reverseBusy, onClick: reverseFromImage }, reverseBusy ? '反推中…' : '反推提示词') : null,
          image ? h('button', { type: 'button', onClick: function () { setImage(null) } }, '移除图片') : null),
        image ? h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          h('img', { src: image.dataUrl, alt: '参考图', style: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l1)' } }),
          h('span', { className: 'psp-note' }, '已选择图片：' + (image.name || '') + '（也可以直接把图片粘贴进面板）。反推会按当前目标生成器输出可复现的提示词。')) : null,
        error ? h('div', { className: 'psp-error' }, error) : null,
        renderResult(),
        renderHistory(),
        h('div', { className: 'psp-note' }, '提示：目标模型规范来自内置知识库（' + ((data && data.presetMeta && data.presetMeta.updatedAt) || '') + '），可在「设置 → 提示词工坊」调整默认值。'),
        h('div', { className: 'psp-note' }, !(data && data.knowledge) ? '' : (data.knowledge.lastCheckedAt
          ? '知识库自动更新：上次收集 ' + formatTime(data.knowledge.lastCheckedAt) + '，下次 ' + (data.knowledge.nextCheckAt ? formatTime(data.knowledge.nextCheckAt) : '待安排') + '。'
          : '知识库自动更新尚未运行；可在「设置 → 提示词工坊」设置周期或立即收集。')))
    }

    // --------------------------------------------------------------- settings
    function SettingsSection(props) {
      var ctx = props && props.ctx
      var loadingState = React.useState(true); var loading = loadingState[0]; var setLoading = loadingState[1]
      var dataState = React.useState(null); var data = dataState[0]; var setData = dataState[1]
      var formState = React.useState(null); var form = formState[0]; var setForm = formState[1]
      var statusState = React.useState(''); var status = statusState[0]; var setStatus = statusState[1]
      var busyState = React.useState(false); var busy = busyState[0]; var setBusy = busyState[1]
      var collectBusyState = React.useState(false); var collectBusy = collectBusyState[0]; var setCollectBusy = collectBusyState[1]
      var reportState = React.useState(''); var report = reportState[0]; var setReport = reportState[1]

      React.useEffect(function () {
        var alive = true
        loadState(true).then(function (next) {
          if (!alive) return
          setData(next)
          var conf = (next && next.settings && next.settings.defaults) || {}
          setForm({
            targetId: conf.targetId || '',
            styleId: conf.styleId || '',
            enhancer: conf.enhancerProvider && conf.enhancerModel ? conf.enhancerProvider + '/' + conf.enhancerModel : '',
            language: conf.language || 'auto',
            variants: conf.variants || 3,
            insertMode: conf.insertMode || 'manual',
            promptInjection: conf.promptInjection !== false,
            knowledgeAuto: !conf.knowledge || conf.knowledge.autoUpdate !== false,
            knowledgeDays: (conf.knowledge && conf.knowledge.intervalDays) || 5,
          })
          setLoading(false)
        }).catch(function (err) {
          if (alive) { setStatus('加载失败：' + ((err && err.message) || err)); setLoading(false) }
        })
        return function () { alive = false }
      }, [])

      if (loading) return h('div', { className: 'psp-settings' }, h('div', { className: 'psp-note' }, '加载中…'))
      if (!form) return h('div', { className: 'psp-settings' }, h('div', { className: 'psp-note' }, status || '暂无配置'))

      var presets = (data && data.presets) || { targets: [], styles: [], taskTypes: [] }
      var models = flattenModels(data && data.catalog)
      var targets = presets.targets || []
      var styleList = presets.styles || []
      var currentTarget = findTarget(presets, form.targetId)
      var kind = currentTarget ? currentTarget.kind : (targets[0] ? targets[0].kind : 'image')

      function patch(patchValue) { setForm(function (prev) { var next = {}; for (var k in prev) next[k] = prev[k]; for (var key in patchValue) next[key] = patchValue[key]; return next }) }

      function save() {
        setBusy(true)
        setStatus('')
        var split = splitModelKey(form.enhancer)
        var patchBody = {
          defaults: {
            targetId: form.targetId,
            styleId: form.styleId,
            enhancerProvider: split ? split.provider : '',
            enhancerModel: split ? split.model : '',
            language: form.language,
            variants: form.variants,
            insertMode: form.insertMode,
            promptInjection: form.promptInjection,
            knowledge: { autoUpdate: form.knowledgeAuto, intervalDays: form.knowledgeDays },
          },
        }
        apiPost('/settings', { patch: patchBody }).then(function (res) {
          if (res && res.ok) {
            setStatus('已保存')
            invalidateState()
            if (res.settings) setData(function (prev) { var next = prev ? JSON.parse(JSON.stringify(prev)) : {}; next.settings = res.settings; return next })
          } else {
            setStatus('保存失败：' + ((res && (res.error || res.message)) || '未知错误'))
          }
        }).catch(function (err) { setStatus('保存失败：' + ((err && err.message) || err)) }).then(function () { setBusy(false) })
      }

      function clearHistory() {
        apiPost('/history-clear', {}).then(function () { setStatus('历史已清空'); invalidateState() }).catch(function (err) { setStatus('清空失败：' + ((err && err.message) || err)) })
      }

      function collectNow() {
        if (collectBusy) return
        setCollectBusy(true)
        setReport('')
        setStatus('正在联网收集（可能需要 1-3 分钟）…')
        apiPost('/knowledge/collect', {}).then(function (res) {
          if (res && res.ok) {
            setStatus('知识库已更新')
            setReport(String(res.report || ''))
            invalidateState()
            loadState(true).then(function (next) { setData(next) }).catch(function () {})
          } else {
            setStatus('收集失败：' + ((res && (res.error || res.message)) || '未知错误'))
            setReport((res && res.knowledge && res.knowledge.lastError) || '')
          }
        }).catch(function (err) {
          setStatus('收集失败：' + ((err && err.message) || err))
        }).then(function () { setCollectBusy(false) })
      }
      function resetKnowledge() {
        apiPost('/knowledge/reset', {}).then(function (res) {
          if (res && res.ok) {
            setStatus('已恢复内置知识库')
            invalidateState()
            loadState(true).then(function (next) { setData(next) }).catch(function () {})
          } else { setStatus('恢复失败') }
        }).catch(function (err) { setStatus('恢复失败：' + ((err && err.message) || err)) })
      }

      var knowledge = (data && data.knowledge) || null
      var meta = (data && data.presetMeta) || {}
      var usage = (data && data.settings && data.settings.usage) || {}
      return h('div', { className: 'psp-settings' },
        h('div', { className: 'psp-note' }, '提示词工坊把粗糙想法变成目标生成器可直接使用的精准提示词。模型调用复用 DSH 已配置的模型，不额外保存 API Key。'),
        h('div', { className: 'psp-field' }, h('span', null, '默认目标生成器'),
          h('select', { value: form.targetId, onChange: function (event) { patch({ targetId: event.target.value }) } },
            [h('option', { key: 'none', value: '' }, '（不指定）')].concat(targets.map(function (target) {
              return h('option', { key: target.id, value: target.id }, target.label + '（' + KIND_LABEL[target.kind] + '）')
            })))),
        h('div', { className: 'psp-field' }, h('span', null, '默认风格'),
          h('select', { value: form.styleId, onChange: function (event) { patch({ styleId: event.target.value }) } },
            [h('option', { key: 'none', value: '' }, '不指定')].concat(styleList.filter(function (style) {
              return !style.appliesTo || style.appliesTo.indexOf(kind) >= 0
            }).map(function (style) { return h('option', { key: style.id, value: style.id }, style.label) })))),
        h('div', { className: 'psp-field' }, h('span', null, '默认增强大模型'),
          h('select', { value: form.enhancer, onChange: function (event) { patch({ enhancer: event.target.value }) } },
            [h('option', { key: 'auto', value: '' }, '跟随 DSH 默认 / 当前会话模型')].concat(models.map(function (model) {
              return h('option', { key: model.key, value: model.key }, model.providerName + ' / ' + model.name)
            })))),
        h('div', { className: 'psp-actions' },
          h('label', { className: 'psp-field', style: { maxWidth: '170px' } }, h('span', null, '输出语言'),
            h('select', { value: form.language, onChange: function (event) { patch({ language: event.target.value }) } },
              h('option', { key: 'auto', value: 'auto' }, '自动'),
              h('option', { key: 'zh', value: 'zh' }, '中文'),
              h('option', { key: 'en', value: 'en' }, '英文'))),
          h('label', { className: 'psp-field', style: { maxWidth: '120px' } }, h('span', null, '变体数量'),
            h('select', { value: String(form.variants), onChange: function (event) { patch({ variants: Number(event.target.value) }) } },
              [1, 2, 3, 4, 5].map(function (n) { return h('option', { key: n, value: String(n) }, String(n) + ' 个') }))),
          h('label', { className: 'psp-field', style: { maxWidth: '190px' } }, h('span', null, '生成后'),
            h('select', { value: form.insertMode, onChange: function (event) { patch({ insertMode: event.target.value }) } },
              h('option', { key: 'manual', value: 'manual' }, '只显示结果'),
              h('option', { key: 'insert', value: 'insert' }, '自动插入输入框'),
              h('option', { key: 'copy', value: 'copy' }, '自动复制'),
              h('option', { key: 'send', value: 'send' }, '自动发送'))),
          h('label', { className: 'psp-field', style: { maxWidth: '180px' } }, h('span', null, '系统提示注入'),
            h('select', { value: form.promptInjection ? 'on' : 'off', onChange: function (event) { patch({ promptInjection: event.target.value === 'on' }) } },
              h('option', { key: 'on', value: 'on' }, '开启（让 AI 主动用工具）'),
              h('option', { key: 'off', value: 'off' }, '关闭')))),
        h('div', { className: 'psp-actions' },
          h('button', { type: 'button', className: 'psp-primary', disabled: busy, onClick: save }, busy ? '保存中…' : '保存设置'),
          h('button', { type: 'button', disabled: busy, onClick: clearHistory }, '清空历史'),
          status ? h('span', { className: 'psp-note' }, status) : null),
        h('div', { className: 'psp-divider' }),
        h('div', { className: 'psp-section-title' }, '知识库自动更新'),
        h('div', { className: 'psp-actions' },
          h('label', { className: 'psp-field', style: { maxWidth: '150px' } }, h('span', null, '自动收集'),
            h('select', { value: form.knowledgeAuto ? 'on' : 'off', onChange: function (event) { patch({ knowledgeAuto: event.target.value === 'on' }) } },
              h('option', { key: 'on', value: 'on' }, '开启'),
              h('option', { key: 'off', value: 'off' }, '关闭'))),
          h('label', { className: 'psp-field', style: { maxWidth: '130px' } }, h('span', null, '周期（天）'),
            h('input', { type: 'number', min: '1', max: '30', value: String(form.knowledgeDays), onChange: function (event) { patch({ knowledgeDays: Math.max(1, Math.min(30, Number(event.target.value) || 5)) }) } })),
          h('button', { type: 'button', disabled: collectBusy, onClick: collectNow }, collectBusy ? '收集中…' : '立即收集'),
          h('button', { type: 'button', disabled: collectBusy, onClick: resetKnowledge }, '恢复内置知识库')),
        h('div', { className: 'psp-note' },
          knowledge
            ? ('状态：' + (knowledge.lastCheckedAt ? ('上次收集 ' + formatTime(knowledge.lastCheckedAt)) : '尚未收集') +
              (knowledge.nextCheckAt ? ('，下次 ' + formatTime(knowledge.nextCheckAt)) : '') +
              '。已应用更新：' + knowledge.counts.targets + ' 个目标规范、' + knowledge.counts.newTargets + ' 个新目标、' + knowledge.counts.styles + ' 个新风格。')
            : '尚未读取知识库状态。'),
        report ? h('div', { className: 'psp-prompt', style: { maxHeight: '200px' } }, '本轮报告：' + report) : null,
        h('div', { className: 'psp-note' },
          '开启后，插件每 N 天联网检索一次相关模型/提示词的新消息，提炼成知识更新应用到本地（保存在 ~/.dsh/prompt-workshop-knowledge.json），不会改动插件包本身；每次收集会调用一次大模型。'),
        h('div', { className: 'psp-divider' }),
        h('div', { className: 'psp-note' },
          '内置规范库：' + (meta.targetCount || targets.length) + ' 个目标模型 / ' + (meta.styleCount || styleList.length) + ' 个风格，版本 ' + (meta.version || 1) + '（更新于 ' + (meta.updatedAt || '未知') + '）。'),
        h('div', { className: 'psp-note' },
          '累计调用 ' + (usage.calls || 0) + ' 次，失败 ' + (usage.failures || 0) + ' 次。数据保存在 ~/.dsh/prompt-workshop.json。'),
        h('div', { className: 'psp-note' },
          '提示词质量取决于两点：原始想法越具体越好；增强模型越强越好（可在上方选择，或直接跟随 DSH 当前模型）。'))
    }

    // -------------------------------------------------------------- slot wiring
    var inject = ['slots']

    function apply(ctx) {
      var styleEl = createOwnedStyle(CSS)
      ctx.effect(function () { return function () { styleEl.remove() } }, 'dsh-prompt-workshop: styles')

      var slots = ctx.get('slots')
      if (slots === undefined) return

      slots.inject('conversation.input.left', function () {
        return slots.register(
          { name: 'conversation.input.left', id: 'prompt-workshop-trigger', order: 6, label: '提示词工坊' },
          function () { return h(SparkButton) },
        )
      })
      slots.inject('conversation.input.overlay', function () {
        return slots.register(
          { name: 'conversation.input.overlay', id: 'prompt-workshop-panel', order: 6, label: '提示词工坊' },
          function (props) { return h(StudioPanel, { inputActions: props.inputActions, useInput: props.useInput }) },
        )
      })
      slots.inject('settings.section', function () {
        return slots.register(
          { name: 'settings.section', id: 'prompt-workshop', order: 26, label: '提示词工坊' },
          function () { return h(SettingsSection, { ctx: ctx }) },
        )
      })
      slots.inject('plugins.bundle.config', function () {
        return slots.register(
          { name: 'plugins.bundle.config', key: PLUGIN_ID },
          function () { return h(SettingsSection, { ctx: ctx }) },
        )
      })
    }

    exports.apply = apply
    exports.inject = inject
    exports.__test = { makeStore: makeStore, flattenModels: flattenModels, splitModelKey: splitModelKey, findModel: findModel, formatTime: formatTime }
    return module.exports
  },
})
