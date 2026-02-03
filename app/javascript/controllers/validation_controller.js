import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "body", "count", "chevron"]

  connect() {
    this.collapsed = false
    this.element.addEventListener('pipeline:changed', (e) => this.validate(e.detail))
  }

  toggle() {
    this.collapsed = !this.collapsed
    this.bodyTarget.classList.toggle('collapsed', this.collapsed)
    this.chevronTarget.textContent = this.collapsed ? '▸' : '▾'
  }

  validate(pipelines) {
    const w = []

    const any = Object.values(pipelines).some(p =>
      (p.receivers?.length || 0) + (p.processors?.length || 0) + (p.exporters?.length || 0) > 0
    )
    if (!any) {
      w.push({ l: 'warning', m: '⚠️ Pipeline has no components' })
      this.render(w); return
    }

    Object.keys(pipelines).forEach(type => {
      const p = pipelines[type]
      const rLen = p.receivers?.length || 0
      const pLen = p.processors?.length || 0
      const eLen = p.exporters?.length || 0
      if (!rLen && !pLen && !eLen) return

      const procs = (p.processors || []).map(c => c.type)
      const recvs = (p.receivers || []).map(c => c.type)
      const exps = (p.exporters || []).map(c => c.type)
      const T = type.charAt(0).toUpperCase() + type.slice(1)

      if (!rLen && (pLen || eLen))
        w.push({ l: 'error', m: `⚠️ ${T}: No receivers — nothing will send data to your collector` })

      if (!eLen && rLen)
        w.push({ l: 'error', m: `⚠️ ${T}: No exporters — data has nowhere to go` })

      if ((rLen || pLen || eLen) && !procs.includes('memory_limiter'))
        w.push({ l: 'warning', m: `⚠️ ${T}: No memory_limiter processor — your collector risks OOM under load` })

      if ((rLen || pLen || eLen) && !procs.includes('batch'))
        w.push({ l: 'warning', m: `⚠️ ${T}: No batch processor — individual sends are inefficient, consider adding one` })

      if (exps.includes('debug'))
        w.push({ l: 'info', m: `ℹ️ ${T}: Debug exporter is great for testing — remember to remove in production` })

      const batch = (p.processors || []).find(c => c.type === 'batch')
      if (batch && !procs.includes('memory_limiter')) {
        const sz = batch.settings?.send_batch_size || 8192
        if (sz > 16384) w.push({ l: 'warning', m: `⚠️ ${T}: Large batch_size (${sz}) without memory_limiter is risky` })
      }

      if (recvs.includes('hostmetrics') && type !== 'metrics')
        w.push({ l: 'warning', m: `⚠️ ${T}: hostmetrics receiver only emits metrics, but this is a ${type} pipeline` })

      if ((recvs.includes('filelog') || recvs.includes('journald')) && type !== 'logs') {
        const r = recvs.includes('filelog') ? 'filelog' : 'journald'
        w.push({ l: 'warning', m: `⚠️ ${T}: ${r} receiver only emits logs, but this is a ${type} pipeline` })
      }
    })

    this.render(w)
  }

  render(warnings) {
    this.countTarget.textContent = warnings.length
    this.panelTarget.style.display = warnings.length ? '' : 'none'
    if (!warnings.length) { this.bodyTarget.innerHTML = ''; return }

    this.bodyTarget.innerHTML = warnings.map(w =>
      `<div class="val-item val-${w.l}">${w.m}</div>`
    ).join('')
  }
}
