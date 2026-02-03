import { Controller } from "@hotwired/stimulus"

const SIGNAL_COLORS = { traces: '#00ff41', metrics: '#ffb000', logs: '#00ffff' }
const SIGNAL_LABELS = { traces: 'span', metrics: 'metric', logs: 'log' }

const SAMPLE_DATA = {
  traces: [
    { name: "GET /api/users", traceId: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", spanId: "1234567890abcdef", attributes: { "http.method": "GET", "http.url": "/api/users", "http.status_code": 200, "service.name": "api-gateway" }, duration_ms: 45 },
    { name: "SELECT * FROM users", traceId: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", spanId: "abcdef1234567890", attributes: { "db.system": "postgresql", "db.statement": "SELECT * FROM users WHERE id = ?", "service.name": "user-service" }, duration_ms: 12 },
    { name: "POST /api/orders", traceId: "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3", spanId: "654321fedcba9876", attributes: { "http.method": "POST", "http.url": "/api/orders", "http.status_code": 201, "service.name": "order-service" }, duration_ms: 120 },
    { name: "redis.GET session:abc", traceId: "1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d", spanId: "aabb11223344ccdd", attributes: { "db.system": "redis", "db.operation": "GET", "service.name": "session-cache" }, duration_ms: 2 },
  ],
  metrics: [
    { name: "http_request_duration_seconds", type: "histogram", value: 0.045, attributes: { method: "GET", path: "/api/users", status: "200" } },
    { name: "system_cpu_utilization", type: "gauge", value: 0.67, attributes: { cpu: "cpu0", state: "user" } },
    { name: "http_requests_total", type: "sum", value: 15234, attributes: { method: "GET", status: "200" } },
    { name: "process_memory_usage_bytes", type: "gauge", value: 134217728, attributes: { process: "collector" } },
  ],
  logs: [
    { body: "Request processed successfully", severityText: "INFO", attributes: { "service.name": "api-gateway", "request.id": "req_abc123" } },
    { body: "Connection pool exhausted, waiting", severityText: "WARN", attributes: { "db.system": "postgresql", "pool.size": 20 } },
    { body: "User authenticated via OAuth2", severityText: "INFO", attributes: { "user.id": "usr_12345", "auth.method": "oauth2" } },
    { body: "Failed to process message: timeout", severityText: "ERROR", attributes: { "messaging.system": "kafka", "messaging.destination": "orders" } },
  ]
}

export default class extends Controller {
  static targets = ["overlay", "simCanvas", "logEntries", "summaryPanel", "summaryContent", "previewPanel", "previewBefore", "previewAfter", "previewTitle"]

  connect() {
    this.running = false
    this.particles = []
    this.animFrameId = null
  }

  disconnect() { if (this.running) this.stop() }

  getPipelineCtrl() {
    return this.application.getControllerForElementAndIdentifier(this.element, 'pipeline')
  }

  start() {
    if (this.running) { this.stop(); return }

    const pc = this.getPipelineCtrl()
    if (!pc) return

    const pipeline = pc.pipelines[pc.currentPipelineType]
    const total = (pipeline.receivers?.length || 0) + (pipeline.processors?.length || 0) + (pipeline.exporters?.length || 0)

    if (!total || !pipeline.receivers?.length) {
      this.flash(pipeline.receivers?.length ? "Add exporters to simulate" : "Add at least one receiver")
      return
    }

    this.pipelineData = JSON.parse(JSON.stringify(pipeline))
    this.signalType = pc.currentPipelineType
    this.running = true
    this.startTime = Date.now()
    this.duration = 30000
    this.particles = []
    this.pid = 0
    this.memUsage = 30

    // Stats
    this.stats = {}
    this.pipelineData.receivers.forEach(c => this.stats[`r_${c.id}`] = { in: 0, out: 0, dropped: 0 })
    this.pipelineData.processors.forEach(c => this.stats[`p_${c.id}`] = { in: 0, out: 0, dropped: 0 })
    this.pipelineData.exporters.forEach(c => this.stats[`e_${c.id}`] = { in: 0, out: 0, dropped: 0 })

    // Batch state
    this.batches = {}
    this.pipelineData.processors.forEach(p => {
      if (p.type === 'batch') {
        const sz = p.settings?.send_batch_size || 8192
        this.batches[p.id] = { buf: [], max: Math.min(6, Math.max(3, Math.floor(sz / 2000))), timer: null }
      }
    })

    this.buildLayout()
    this.overlayTarget.classList.add('active')
    this.summaryPanelTarget.classList.remove('active')
    this.logEntriesTarget.innerHTML = ''

    // Set type label
    const lbl = this.overlayTarget.querySelector('.sim-type-label')
    if (lbl) lbl.textContent = this.signalType

    this.updateBtn(true)
    this.lastEmit = 0
    this.emitRate = 500
    this.animate(performance.now())
  }

  stop() {
    this.running = false
    if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null }
    Object.values(this.batches || {}).forEach(b => { if (b.timer) clearTimeout(b.timer) })
    this.updateBtn(false)
    if (this.startTime && Date.now() - this.startTime > 2000) this.showSummary()
    this.particles.forEach(p => p.el?.remove())
    this.particles = []
  }

  closeOverlay() {
    this.stop()
    this.overlayTarget.classList.remove('active')
  }

  updateBtn(on) {
    const btn = this.element.querySelector('[data-sim-btn]')
    if (!btn) return
    btn.textContent = on ? '■ Stop' : '▶ Simulate'
    btn.style.borderColor = on ? 'var(--red)' : ''
    btn.style.color = on ? 'var(--red)' : ''
  }

  buildLayout() {
    const c = this.simCanvasTarget
    c.innerHTML = ''
    const flow = document.createElement('div')
    flow.className = 'sim-flow'

    flow.appendChild(this.mkStage(this.pipelineData.receivers, 'receivers'))

    this.pipelineData.processors.forEach(p => {
      flow.appendChild(this.mkArrow())
      flow.appendChild(this.mkStage([p], 'processors'))
    })

    if (this.pipelineData.exporters.length) {
      flow.appendChild(this.mkArrow())
      flow.appendChild(this.mkStage(this.pipelineData.exporters, 'exporters'))
    }

    c.appendChild(flow)
    this.nodeMap = {}
    c.querySelectorAll('.sim-node').forEach(n => { this.nodeMap[n.dataset.statKey] = n })
  }

  mkStage(comps, cat) {
    const s = document.createElement('div')
    s.className = 'sim-stage'
    comps.forEach(comp => {
      const pfx = cat === 'receivers' ? 'r' : cat === 'processors' ? 'p' : 'e'
      const sk = `${pfx}_${comp.id}`
      const n = document.createElement('div')
      n.className = `sim-node sim-${cat}`
      n.dataset.statKey = sk
      n.dataset.compType = comp.type
      n.dataset.category = cat
      n.dataset.compId = comp.id
      n.addEventListener('click', () => this.showPreview(comp, cat))
      let extra = ''
      if (comp.type === 'memory_limiter') extra = '<div class="sim-mem-gauge"><div class="sim-mem-fill" style="width:30%"></div></div>'
      else if (comp.type === 'batch') extra = '<div class="sim-batch-info">Buffer: <span class="batch-ct">0</span></div>'
      else if (comp.type === 'probabilistic_sampler') extra = `<div class="sim-sample-rt">Sample: ${comp.settings?.sampling_percentage || 10}%</div>`
      n.innerHTML = `<div class="sim-node-name">${comp.type}</div><div class="sim-node-stats"><span class="si">0</span> in · <span class="so">0</span> out${cat === 'processors' ? ' · <span class="sd">0</span> drop' : ''}</div>${extra}`
      s.appendChild(n)
    })
    return s
  }

  mkArrow() {
    const a = document.createElement('div')
    a.className = 'sim-arrow'
    a.innerHTML = '→'
    return a
  }

  animate(ts) {
    if (!this.running) return
    const elapsed = Date.now() - this.startTime
    if (elapsed >= this.duration) { this.stop(); return }
    if (ts - this.lastEmit > this.emitRate) { this.lastEmit = ts; this.emitParticles() }
    this.moveParticles()
    this.refreshStats()
    this.updateMem()
    const bar = this.overlayTarget.querySelector('.sim-progress-fill')
    if (bar) bar.style.width = `${(elapsed / this.duration) * 100}%`
    this.animFrameId = requestAnimationFrame(t => this.animate(t))
  }

  emitParticles() {
    const cr = this.simCanvasTarget.getBoundingClientRect()
    this.pipelineData.receivers.forEach(recv => {
      const node = this.nodeMap[`r_${recv.id}`]
      if (!node) return
      const nr = node.getBoundingClientRect()
      const sx = nr.right - cr.left + 4
      const sy = nr.top - cr.top + nr.height / 2 + (Math.random() - 0.5) * 10

      const tgt = this.nextTarget(-1)
      if (!tgt) return

      const el = document.createElement('div')
      el.className = `sim-particle sim-particle-${this.signalType}`
      el.style.transform = `translate(${sx}px, ${sy}px)`
      this.simCanvasTarget.appendChild(el)

      const si = Math.floor(Math.random() * SAMPLE_DATA[this.signalType].length)
      this.particles.push({
        id: this.pid++, el, x: sx, y: sy,
        tx: tgt.x, ty: tgt.y, speed: 2 + Math.random() * 1.5,
        alive: true, waiting: false,
        procIdx: tgt.procIdx, stage: tgt.stage, tsk: tgt.sk,
        data: SAMPLE_DATA[this.signalType][si], born: Date.now()
      })
      this.stats[`r_${recv.id}`].in++
      this.stats[`r_${recv.id}`].out++
      this.addLog(`${recv.type} → emitted ${SIGNAL_LABELS[this.signalType]}`, 'recv')
    })
  }

  nextTarget(curProcIdx) {
    const cr = this.simCanvasTarget.getBoundingClientRect()
    const procs = this.pipelineData.processors
    const exps = this.pipelineData.exporters
    const nxt = curProcIdx + 1

    if (nxt < procs.length) {
      const p = procs[nxt]
      const n = this.nodeMap[`p_${p.id}`]
      if (!n) return null
      const r = n.getBoundingClientRect()
      return { x: r.left - cr.left - 4, y: r.top - cr.top + r.height / 2 + (Math.random() - 0.5) * 6, procIdx: nxt, stage: 'proc', sk: `p_${p.id}` }
    }
    if (exps.length) {
      const idx = Math.floor(Math.random() * exps.length)
      const e = exps[idx]
      const n = this.nodeMap[`e_${e.id}`]
      if (!n) return null
      const r = n.getBoundingClientRect()
      return { x: r.left - cr.left - 4, y: r.top - cr.top + r.height / 2 + (Math.random() - 0.5) * 6, procIdx: -1, stage: 'exp', sk: `e_${e.id}` }
    }
    return null
  }

  moveParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      if (!p.alive) {
        if (!p.removeAt) p.removeAt = Date.now() + 400
        else if (Date.now() > p.removeAt) { p.el.remove(); this.particles.splice(i, 1) }
        continue
      }
      if (p.waiting) continue
      if (Date.now() - p.born > 12000) { p.el.remove(); this.particles.splice(i, 1); continue }

      const dx = p.tx - p.x, dy = p.ty - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 5) {
        this.onArrived(p)
      } else {
        p.x += (dx / dist) * p.speed
        p.y += (dy / dist) * p.speed
        p.el.style.transform = `translate(${p.x}px, ${p.y}px)`
      }
    }
  }

  onArrived(p) {
    if (p.stage === 'proc') {
      const proc = this.pipelineData.processors[p.procIdx]
      this.stats[p.tsk].in++
      const result = this.applyProc(p, proc)

      if (result === 'dropped') {
        p.alive = false
        p.el.classList.add('dropped')
        this.stats[p.tsk].dropped++
        this.addLog(`${proc.type} ✕ dropped ${SIGNAL_LABELS[this.signalType]}`, 'drop')
        return
      }
      if (result === 'batched') return // waiting in batch

      this.stats[p.tsk].out++
      this.addLog(`${proc.type} → processed`, 'proc')
      const nxt = this.nextTarget(p.procIdx)
      if (nxt) { p.tx = nxt.x; p.ty = nxt.y; p.procIdx = nxt.procIdx; p.stage = nxt.stage; p.tsk = nxt.sk }
      else { p.alive = false; p.el.style.opacity = '0' }
    } else if (p.stage === 'exp') {
      this.stats[p.tsk].in++
      this.stats[p.tsk].out++
      p.alive = false
      p.el.classList.add('absorbed')
      const exp = this.pipelineData.exporters.find(e => p.tsk === `e_${e.id}`)
      if (exp) this.addLog(`${exp.type} ← exported`, 'exp')
      const node = this.nodeMap[p.tsk]
      if (node) { node.classList.add('sim-glow'); setTimeout(() => node.classList.remove('sim-glow'), 200) }
    }
  }

  applyProc(particle, proc) {
    switch (proc.type) {
      case 'filter': {
        if (Math.random() < 0.3) return 'dropped'
        particle.el.classList.add('flash')
        setTimeout(() => particle.el.classList.remove('flash'), 200)
        return 'ok'
      }
      case 'probabilistic_sampler': {
        const pct = (proc.settings?.sampling_percentage || 10) / 100
        if (Math.random() > pct) return 'dropped'
        return 'ok'
      }
      case 'batch': {
        const b = this.batches[proc.id]
        if (!b) return 'ok'
        particle.waiting = true
        particle.el.style.opacity = '0.3'
        b.buf.push(particle)
        const node = this.nodeMap[`p_${proc.id}`]
        if (node) { const ct = node.querySelector('.batch-ct'); if (ct) ct.textContent = b.buf.length }
        if (b.buf.length >= b.max) { this.releaseBatch(proc.id) }
        else if (!b.timer) { b.timer = setTimeout(() => this.releaseBatch(proc.id), 2000) }
        return 'batched'
      }
      case 'memory_limiter': {
        this.memUsage = Math.min(95, this.memUsage + Math.random() * 5 - 2)
        if (this.memUsage > 85 && Math.random() < 0.1) return 'dropped'
        return 'ok'
      }
      case 'attributes':
      case 'resource':
      case 'k8s_attributes':
      case 'resourcedetection':
      case 'transform': {
        particle.el.classList.add('flash')
        setTimeout(() => particle.el.classList.remove('flash'), 200)
        return 'ok'
      }
      default: return 'ok'
    }
  }

  releaseBatch(procId) {
    const b = this.batches[procId]
    if (!b || !b.buf.length) return
    if (b.timer) { clearTimeout(b.timer); b.timer = null }

    const procIdx = this.pipelineData.processors.findIndex(p => p.id === procId)
    const sk = `p_${procId}`

    this.addLog(`batch → released ${b.buf.length} items`, 'proc')

    b.buf.forEach((p, i) => {
      setTimeout(() => {
        if (!p.el.parentNode) return
        p.waiting = false
        p.el.style.opacity = '1'
        p.el.classList.add('flash')
        setTimeout(() => p.el.classList.remove('flash'), 200)
        this.stats[sk].out++
        const nxt = this.nextTarget(procIdx)
        if (nxt) { p.tx = nxt.x; p.ty = nxt.y; p.procIdx = nxt.procIdx; p.stage = nxt.stage; p.tsk = nxt.sk }
        else { p.alive = false; p.el.style.opacity = '0' }
      }, i * 50) // stagger release for visual effect
    })

    b.buf = []
    const node = this.nodeMap[sk]
    if (node) { const ct = node.querySelector('.batch-ct'); if (ct) ct.textContent = '0' }
  }

  refreshStats() {
    Object.keys(this.stats).forEach(key => {
      const node = this.nodeMap[key]
      if (!node) return
      const s = this.stats[key]
      const si = node.querySelector('.si')
      const so = node.querySelector('.so')
      const sd = node.querySelector('.sd')
      if (si) si.textContent = s.in
      if (so) so.textContent = s.out
      if (sd) sd.textContent = s.dropped
    })
  }

  updateMem() {
    this.pipelineData.processors.forEach(p => {
      if (p.type !== 'memory_limiter') return
      const node = this.nodeMap[`p_${p.id}`]
      if (!node) return
      const fill = node.querySelector('.sim-mem-fill')
      if (fill) {
        this.memUsage += (Math.random() - 0.48) * 3
        this.memUsage = Math.max(15, Math.min(95, this.memUsage))
        fill.style.width = `${this.memUsage}%`
        fill.style.background = this.memUsage > 80 ? 'var(--red)' : this.memUsage > 60 ? 'var(--amber)' : 'var(--green)'
      }
    })
  }

  addLog(msg, type) {
    const div = document.createElement('div')
    div.className = `sim-log-entry sim-log-${type}`
    const ts = ((Date.now() - this.startTime) / 1000).toFixed(1)
    div.textContent = `[${ts}s] ${msg}`
    this.logEntriesTarget.appendChild(div)
    this.logEntriesTarget.scrollTop = this.logEntriesTarget.scrollHeight
    // Limit entries
    while (this.logEntriesTarget.children.length > 100) this.logEntriesTarget.removeChild(this.logEntriesTarget.firstChild)
  }

  showSummary() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
    let totalIn = 0, totalOut = 0, totalDropped = 0

    let rows = ''
    const mkRow = (label, cls, s) => {
      totalIn += s.in; totalOut += s.out; totalDropped += s.dropped
      return `<div class="sim-stat-row"><span class="sim-stat-name ${cls}">${label}</span><span class="sim-stat-val">${s.in} in</span><span class="sim-stat-val">${s.out} out</span><span class="sim-stat-val sim-stat-drop">${s.dropped ? s.dropped + ' dropped' : '—'}</span></div>`
    }

    this.pipelineData.receivers.forEach(c => { rows += mkRow(c.type, 'green', this.stats[`r_${c.id}`]) })
    this.pipelineData.processors.forEach(c => { rows += mkRow(c.type, 'amber', this.stats[`p_${c.id}`]) })
    this.pipelineData.exporters.forEach(c => { rows += mkRow(c.type, 'cyan', this.stats[`e_${c.id}`]) })

    const throughput = (totalOut / parseFloat(elapsed)).toFixed(1)

    this.summaryContentTarget.innerHTML = `
      <div class="sim-summary-overview">
        <div class="sim-ov-card"><div class="sim-ov-val green">${totalIn}</div><div class="sim-ov-label">Total In</div></div>
        <div class="sim-ov-card"><div class="sim-ov-val cyan">${totalOut}</div><div class="sim-ov-label">Total Out</div></div>
        <div class="sim-ov-card"><div class="sim-ov-val red">${totalDropped}</div><div class="sim-ov-label">Dropped</div></div>
        <div class="sim-ov-card"><div class="sim-ov-val amber">${throughput}/s</div><div class="sim-ov-label">Throughput</div></div>
      </div>
      <div class="sim-summary-table">${rows}</div>
      <div class="sim-summary-time">Simulation ran for ${elapsed}s on ${this.signalType} pipeline</div>
    `
    this.summaryPanelTarget.classList.add('active')
  }

  // Data Preview
  showPreview(comp, category) {
    const type = this.signalType || 'traces'
    const sample = JSON.parse(JSON.stringify(SAMPLE_DATA[type][0]))
    let before = null, after = null

    if (category === 'receivers') {
      before = null
      after = sample
    } else if (category === 'exporters') {
      before = sample
      after = this.fmtExport(comp, sample)
    } else {
      before = sample
      after = this.fmtProcessor(comp, JSON.parse(JSON.stringify(sample)))
    }

    this.previewTitleTarget.textContent = `${comp.type} — ${type} data preview`
    this.previewBeforeTarget.textContent = before ? JSON.stringify(before, null, 2) : '(source — no input)'
    this.previewAfterTarget.textContent = JSON.stringify(after, null, 2)
    this.previewPanelTarget.classList.add('active')
  }

  previewSelected() {
    const pc = this.getPipelineCtrl()
    if (!pc || !pc.selectedComponent) return
    const { category, index } = pc.selectedComponent
    const comp = pc.pipelines[pc.currentPipelineType]?.[category]?.[index]
    if (!comp) return
    this.signalType = this.signalType || pc.currentPipelineType
    this.showPreview(comp, category)
  }

  closePreview() {
    this.previewPanelTarget.classList.remove('active')
  }

  fmtProcessor(comp, data) {
    switch (comp.type) {
      case 'attributes': {
        const actions = comp.settings?.actions || [{ key: 'env', value: 'production', action: 'upsert' }]
        actions.forEach(a => {
          if (a.action === 'delete') delete data.attributes[a.key]
          else data.attributes[a.key] = a.value
        })
        return data
      }
      case 'resource': {
        const attrs = comp.settings?.attributes || [{ key: 'service.name', value: 'my-service', action: 'upsert' }]
        if (!data.resource) data.resource = { attributes: {} }
        attrs.forEach(a => { data.resource.attributes[a.key] = a.value })
        return data
      }
      case 'filter':
        data._filtered = 'This item passed the filter (30% of items are dropped)'
        return data
      case 'batch':
        data._batched = 'Grouped with other items before forwarding'
        return data
      case 'memory_limiter':
        data._memory_check = 'Passed memory check (current: 340MiB / 512MiB limit)'
        return data
      case 'probabilistic_sampler': {
        const pct = comp.settings?.sampling_percentage || 10
        data._sampled = `Kept (${pct}% sampling rate — ${100 - pct}% of items are dropped)`
        return data
      }
      case 'k8s_attributes':
        data.attributes = data.attributes || {}
        data.attributes['k8s.pod.name'] = 'api-7f8d9c4b2a'
        data.attributes['k8s.namespace.name'] = 'production'
        data.attributes['k8s.node.name'] = 'node-pool-abc-12345'
        return data
      case 'resourcedetection':
        if (!data.resource) data.resource = { attributes: {} }
        data.resource.attributes['host.name'] = 'ip-10-0-1-42'
        data.resource.attributes['os.type'] = 'linux'
        data.resource.attributes['cloud.provider'] = 'aws'
        return data
      case 'transform':
        data._transformed = 'OTTL transformation applied'
        return data
      default:
        return data
    }
  }

  fmtExport(comp, data) {
    switch (comp.type) {
      case 'debug':
        return { output: 'stdout', verbosity: comp.settings?.verbosity || 'basic', data }
      case 'prometheus':
        return { format: 'prometheus_exposition', text: `# HELP ${data.name || 'metric'}\n# TYPE ${data.name || 'metric'} ${data.type || 'gauge'}\n${data.name || 'metric'}{} ${data.value || 0}` }
      case 'file':
        return { file: comp.settings?.path || './output.json', format: 'json', data }
      case 'loki':
        return { endpoint: comp.settings?.endpoint || 'http://loki:3100', stream: { job: 'otel-collector' }, values: [[String(Date.now()), JSON.stringify(data)]] }
      default:
        return { protocol: 'otlp', encoding: 'protobuf', endpoint: comp.settings?.endpoint || 'localhost:4317', resource_spans: [data] }
    }
  }

  flash(msg) {
    const f = document.createElement('div')
    f.className = 'copy-feedback'
    f.style.borderColor = 'var(--amber)'
    f.style.color = 'var(--amber)'
    f.textContent = msg
    document.body.appendChild(f)
    setTimeout(() => f.remove(), 2000)
  }
}
