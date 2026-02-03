import { Controller } from "@hotwired/stimulus"

const STEPS = [
  {
    id: "welcome",
    title: "🎓 Build Your First Pipeline",
    body: "Let's build your first OpenTelemetry Collector pipeline in 5 minutes.\n\nThe OTel Collector is a vendor-agnostic proxy that receives, processes, and exports telemetry data. It sits between your apps and your observability backend, giving you full control over your data pipeline.",
    highlight: null,
    action: null
  },
  {
    id: "receiver",
    title: "Step 1: Add a Receiver",
    body: "First, we need something to receive telemetry.\n\nClick on 'otlp' in the Receivers palette to add it to your pipeline.",
    highlight: "[data-category='receivers'][data-component='otlp']",
    waitFor: { category: "receivers", component: "otlp" },
    successMsg: "Nice! The OTLP receiver accepts traces, metrics, and logs via gRPC (port 4317) and HTTP (port 4318). It's the standard receiver for most setups."
  },
  {
    id: "processor_batch",
    title: "Step 2: Add Processors",
    body: "Now let's add some processors. Every production pipeline should have these two.\n\nFirst, click 'batch' in the Processors palette.",
    highlight: "[data-category='processors'][data-component='batch']",
    waitFor: { category: "processors", component: "batch" },
    successMsg: "Batch groups telemetry before sending — way more efficient than individual sends. Now add one more..."
  },
  {
    id: "processor_memory",
    title: "Step 2: Add Processors (2/2)",
    body: "Now click 'memory_limiter' in the Processors palette.",
    highlight: "[data-category='processors'][data-component='memory_limiter']",
    waitFor: { category: "processors", component: "memory_limiter" },
    successMsg: "Memory limiter prevents your collector from eating all available RAM. Essential for production!"
  },
  {
    id: "exporter",
    title: "Step 3: Add an Exporter",
    body: "Finally, where should the data go?\n\nClick 'otlp' in the Exporters palette.",
    highlight: "[data-category='exporters'][data-component='otlp']",
    waitFor: { category: "exporters", component: "otlp" },
    successMsg: "This sends your processed telemetry to any OTLP-compatible backend — Elastic, Jaeger, Grafana Tempo, you name it."
  },
  {
    id: "celebrate",
    title: "🎉 You Did It!",
    body: "You just built a production-ready OTel Collector pipeline!\n\nNext steps:\n▸ Try the Simulate button to see data flow\n▸ Check the Deploy tab for Kubernetes manifests\n▸ Browse Templates for more complex setups\n▸ Save & share your config with the community",
    highlight: null,
    action: null
  }
]

export default class extends Controller {
  static targets = ["overlay"]

  connect() {
    this.currentStep = -1
    this.active = false
    this._onComponentAdded = this._onComponentAdded.bind(this)
  }

  start() {
    this.active = true
    this.currentStep = 0
    this._buildOverlay()
    this._renderStep()
    document.addEventListener("tutorial:component-added", this._onComponentAdded)
  }

  skip() {
    this._cleanup()
  }

  next() {
    if (this.currentStep < STEPS.length - 1) {
      this.currentStep++
      this._renderStep()
    } else {
      this._cleanup()
    }
  }

  _onComponentAdded(e) {
    if (!this.active) return
    const step = STEPS[this.currentStep]
    if (!step || !step.waitFor) return
    const { category, component } = e.detail
    if (step.waitFor.category === category && step.waitFor.component === component) {
      // Show success message briefly then advance
      if (step.successMsg) {
        this._showSuccess(step.successMsg)
      } else {
        this.next()
      }
    }
  }

  _showSuccess(msg) {
    const card = this.overlay.querySelector(".tutorial-card-body")
    if (card) {
      card.innerHTML = `<p class="tutorial-success">${msg}</p>`
    }
    const actions = this.overlay.querySelector(".tutorial-actions")
    if (actions) {
      actions.innerHTML = `<button class="btn btn-green btn-sm tutorial-next-btn" data-action="click->tutorial#next">Continue →</button>`
    }
  }

  _buildOverlay() {
    if (this.overlay) this.overlay.remove()
    this.overlay = document.createElement("div")
    this.overlay.className = "tutorial-overlay"
    this.overlay.innerHTML = `
      <div class="tutorial-backdrop"></div>
      <div class="tutorial-spotlight"></div>
      <div class="tutorial-card">
        <div class="tutorial-step-indicator"></div>
        <h3 class="tutorial-card-title"></h3>
        <div class="tutorial-card-body"></div>
        <div class="tutorial-actions"></div>
      </div>
    `
    document.body.appendChild(this.overlay)
  }

  _renderStep() {
    const step = STEPS[this.currentStep]
    if (!step) return

    const card = this.overlay.querySelector(".tutorial-card")
    const title = this.overlay.querySelector(".tutorial-card-title")
    const body = this.overlay.querySelector(".tutorial-card-body")
    const actions = this.overlay.querySelector(".tutorial-actions")
    const indicator = this.overlay.querySelector(".tutorial-step-indicator")
    const spotlight = this.overlay.querySelector(".tutorial-spotlight")
    const backdrop = this.overlay.querySelector(".tutorial-backdrop")

    // Step indicator
    indicator.innerHTML = Array.from({ length: STEPS.length }, (_, i) =>
      `<span class="tutorial-dot ${i === this.currentStep ? 'active' : i < this.currentStep ? 'done' : ''}"></span>`
    ).join("")

    title.textContent = step.title
    body.innerHTML = step.body.split("\n").map(l => l ? `<p>${l}</p>` : "").join("")

    // Actions
    let actionsHtml = `<button class="btn btn-sm tutorial-skip-btn" data-action="click->tutorial#skip">✕ Skip</button>`
    if (!step.waitFor) {
      const isLast = this.currentStep === STEPS.length - 1
      actionsHtml += `<button class="btn btn-green btn-sm tutorial-next-btn" data-action="click->tutorial#next">${isLast ? "Finish ✓" : "Next →"}</button>`
    } else {
      actionsHtml += `<span class="tutorial-hint">👆 Click the highlighted component</span>`
    }
    actions.innerHTML = actionsHtml

    // Spotlight
    if (step.highlight) {
      const el = document.querySelector(step.highlight)
      if (el) {
        const rect = el.getBoundingClientRect()
        const pad = 8
        spotlight.style.display = "block"
        spotlight.style.top = `${rect.top - pad + window.scrollY}px`
        spotlight.style.left = `${rect.left - pad}px`
        spotlight.style.width = `${rect.width + pad * 2}px`
        spotlight.style.height = `${rect.height + pad * 2}px`
        backdrop.style.display = "block"

        // Position card near the highlighted element
        const cardRect = card.getBoundingClientRect()
        const spaceRight = window.innerWidth - rect.right
        const spaceBelow = window.innerHeight - rect.bottom

        if (spaceRight > 350) {
          card.style.top = `${rect.top + window.scrollY}px`
          card.style.left = `${rect.right + 20}px`
          card.style.right = "auto"
          card.style.bottom = "auto"
        } else if (spaceBelow > 250) {
          card.style.top = `${rect.bottom + 15 + window.scrollY}px`
          card.style.left = `${Math.max(20, rect.left)}px`
          card.style.right = "auto"
          card.style.bottom = "auto"
        } else {
          card.style.top = "auto"
          card.style.bottom = "2rem"
          card.style.right = "2rem"
          card.style.left = "auto"
        }

        // Make highlighted element clickable above overlay
        el.style.position = "relative"
        el.style.zIndex = "10002"
        this._highlightedEl = el
      }
    } else {
      spotlight.style.display = "none"
      backdrop.style.display = "block"
      // Center the card
      card.style.top = "50%"
      card.style.left = "50%"
      card.style.right = "auto"
      card.style.bottom = "auto"
      card.style.transform = "translate(-50%, -50%)"
      this._clearHighlight()
    }

    // Reset transform for positioned cards
    if (step.highlight) {
      card.style.transform = "none"
    }
  }

  _clearHighlight() {
    if (this._highlightedEl) {
      this._highlightedEl.style.position = ""
      this._highlightedEl.style.zIndex = ""
      this._highlightedEl = null
    }
  }

  _cleanup() {
    this.active = false
    this.currentStep = -1
    this._clearHighlight()
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    document.removeEventListener("tutorial:component-added", this._onComponentAdded)
  }

  disconnect() {
    this._cleanup()
  }
}
