import { Controller } from "@hotwired/stimulus"

// Component default settings definitions
const COMPONENT_DEFAULTS = {
  receivers: {
    otlp: {
      label: "OTLP Receiver",
      settings: {
        protocols: {
          grpc: { endpoint: "0.0.0.0:4317" },
          http: { endpoint: "0.0.0.0:4318" }
        }
      },
      fields: [
        { key: "protocols.grpc.endpoint", label: "gRPC Endpoint", type: "text", default: "0.0.0.0:4317" },
        { key: "protocols.http.endpoint", label: "HTTP Endpoint", type: "text", default: "0.0.0.0:4318" }
      ]
    },
    prometheus: {
      label: "Prometheus Receiver",
      settings: {
        config: {
          scrape_configs: [{ job_name: "otel-collector", scrape_interval: "10s", static_configs: [{ targets: ["localhost:8888"] }] }]
        }
      },
      fields: [
        { key: "config.scrape_configs.0.job_name", label: "Job Name", type: "text", default: "otel-collector" },
        { key: "config.scrape_configs.0.scrape_interval", label: "Scrape Interval", type: "text", default: "10s" },
        { key: "config.scrape_configs.0.static_configs.0.targets.0", label: "Target", type: "text", default: "localhost:8888" }
      ]
    },
    hostmetrics: {
      label: "Host Metrics Receiver",
      settings: {
        collection_interval: "30s",
        scrapers: { cpu: {}, memory: {}, disk: {}, network: {} }
      },
      fields: [
        { key: "collection_interval", label: "Collection Interval", type: "text", default: "30s" },
        { key: "scrapers.cpu", label: "CPU Scraper", type: "toggle", default: true },
        { key: "scrapers.memory", label: "Memory Scraper", type: "toggle", default: true },
        { key: "scrapers.disk", label: "Disk Scraper", type: "toggle", default: true },
        { key: "scrapers.network", label: "Network Scraper", type: "toggle", default: true }
      ]
    },
    filelog: {
      label: "Filelog Receiver",
      settings: {
        include: ["/var/log/**/*.log"]
      },
      fields: [
        { key: "include.0", label: "Include Path", type: "text", default: "/var/log/**/*.log" },
        { key: "start_at", label: "Start At", type: "select", default: "end", options: ["beginning", "end"] }
      ]
    },
    journald: {
      label: "Journald Receiver",
      settings: { directory: "/run/log/journal" },
      fields: [
        { key: "directory", label: "Directory", type: "text", default: "/run/log/journal" },
        { key: "units", label: "Units (comma-sep)", type: "text", default: "" }
      ]
    },
    k8s_events: {
      label: "K8s Events Receiver",
      settings: { namespaces: [] },
      fields: [
        { key: "namespaces", label: "Namespaces (comma-sep)", type: "text", default: "" }
      ]
    },
    zipkin: {
      label: "Zipkin Receiver",
      settings: { endpoint: "0.0.0.0:9411" },
      fields: [
        { key: "endpoint", label: "Endpoint", type: "text", default: "0.0.0.0:9411" }
      ]
    },
    jaeger: {
      label: "Jaeger Receiver",
      settings: {
        protocols: {
          grpc: { endpoint: "0.0.0.0:14250" },
          thrift_http: { endpoint: "0.0.0.0:14268" }
        }
      },
      fields: [
        { key: "protocols.grpc.endpoint", label: "gRPC Endpoint", type: "text", default: "0.0.0.0:14250" },
        { key: "protocols.thrift_http.endpoint", label: "Thrift HTTP Endpoint", type: "text", default: "0.0.0.0:14268" }
      ]
    }
  },
  processors: {
    batch: {
      label: "Batch Processor",
      settings: { timeout: "200ms", send_batch_size: 8192 },
      fields: [
        { key: "timeout", label: "Timeout", type: "text", default: "200ms" },
        { key: "send_batch_size", label: "Send Batch Size", type: "number", default: 8192 },
        { key: "send_batch_max_size", label: "Max Batch Size", type: "number", default: 0 }
      ]
    },
    memory_limiter: {
      label: "Memory Limiter",
      settings: { limit_mib: 512, spike_limit_mib: 128, check_interval: "5s" },
      fields: [
        { key: "limit_mib", label: "Limit (MiB)", type: "number", default: 512 },
        { key: "spike_limit_mib", label: "Spike Limit (MiB)", type: "number", default: 128 },
        { key: "check_interval", label: "Check Interval", type: "text", default: "5s" }
      ]
    },
    attributes: {
      label: "Attributes Processor",
      settings: { actions: [{ key: "env", value: "production", action: "upsert" }] },
      fields: [
        { key: "actions.0.key", label: "Attribute Key", type: "text", default: "env" },
        { key: "actions.0.value", label: "Attribute Value", type: "text", default: "production" },
        { key: "actions.0.action", label: "Action", type: "select", default: "upsert", options: ["insert", "update", "upsert", "delete"] }
      ]
    },
    filter: {
      label: "Filter Processor",
      settings: { error_mode: "ignore" },
      fields: [
        { key: "error_mode", label: "Error Mode", type: "select", default: "ignore", options: ["ignore", "propagate"] },
        { key: "traces.span", label: "Trace Span Filter (OTTL)", type: "text", default: "" },
        { key: "metrics.metric", label: "Metric Filter (OTTL)", type: "text", default: "" },
        { key: "logs.log_record", label: "Log Filter (OTTL)", type: "text", default: "" }
      ]
    },
    transform: {
      label: "Transform Processor",
      settings: { error_mode: "ignore" },
      fields: [
        { key: "error_mode", label: "Error Mode", type: "select", default: "ignore", options: ["ignore", "propagate"] }
      ]
    },
    resource: {
      label: "Resource Processor",
      settings: { attributes: [{ key: "service.name", value: "my-service", action: "upsert" }] },
      fields: [
        { key: "attributes.0.key", label: "Attribute Key", type: "text", default: "service.name" },
        { key: "attributes.0.value", label: "Attribute Value", type: "text", default: "my-service" },
        { key: "attributes.0.action", label: "Action", type: "select", default: "upsert", options: ["insert", "update", "upsert", "delete"] }
      ]
    },
    probabilistic_sampler: {
      label: "Probabilistic Sampler",
      settings: { sampling_percentage: 10 },
      fields: [
        { key: "sampling_percentage", label: "Sampling %", type: "number", default: 10 }
      ]
    },
    tail_sampling: {
      label: "Tail Sampling",
      settings: { decision_wait: "10s", num_traces: 100 },
      fields: [
        { key: "decision_wait", label: "Decision Wait", type: "text", default: "10s" },
        { key: "num_traces", label: "Num Traces", type: "number", default: 100 }
      ]
    },
    k8s_attributes: {
      label: "K8s Attributes",
      settings: { extract: { metadata: ["k8s.pod.name", "k8s.namespace.name", "k8s.node.name"] } },
      fields: [
        { key: "extract.metadata", label: "Metadata Fields (comma-sep)", type: "text", default: "k8s.pod.name,k8s.namespace.name,k8s.node.name" }
      ]
    },
    resourcedetection: {
      label: "Resource Detection",
      settings: { detectors: ["env", "system"], timeout: "5s" },
      fields: [
        { key: "detectors", label: "Detectors (comma-sep)", type: "text", default: "env,system" },
        { key: "timeout", label: "Timeout", type: "text", default: "5s" }
      ]
    }
  },
  exporters: {
    otlp: {
      label: "OTLP Exporter",
      settings: { endpoint: "localhost:4317", tls: { insecure: true } },
      fields: [
        { key: "endpoint", label: "Endpoint", type: "text", default: "localhost:4317" },
        { key: "tls.insecure", label: "TLS Insecure", type: "toggle", default: true },
        { key: "compression", label: "Compression", type: "select", default: "gzip", options: ["gzip", "zstd", "none"] }
      ]
    },
    otlphttp: {
      label: "OTLP HTTP Exporter",
      settings: { endpoint: "http://localhost:4318" },
      fields: [
        { key: "endpoint", label: "Endpoint", type: "text", default: "http://localhost:4318" },
        { key: "tls.insecure", label: "TLS Insecure", type: "toggle", default: true },
        { key: "compression", label: "Compression", type: "select", default: "gzip", options: ["gzip", "zstd", "none"] }
      ]
    },
    prometheus: {
      label: "Prometheus Exporter",
      settings: { endpoint: "0.0.0.0:8889", namespace: "otel" },
      fields: [
        { key: "endpoint", label: "Endpoint", type: "text", default: "0.0.0.0:8889" },
        { key: "namespace", label: "Namespace", type: "text", default: "otel" },
        { key: "send_timestamps", label: "Send Timestamps", type: "toggle", default: true }
      ]
    },
    debug: {
      label: "Debug Exporter",
      settings: { verbosity: "basic" },
      fields: [
        { key: "verbosity", label: "Verbosity", type: "select", default: "basic", options: ["basic", "normal", "detailed"] }
      ]
    },
    file: {
      label: "File Exporter",
      settings: { path: "./otel-output.json" },
      fields: [
        { key: "path", label: "File Path", type: "text", default: "./otel-output.json" }
      ]
    },
    elasticsearch: {
      label: "Elasticsearch Exporter",
      settings: { endpoints: ["http://localhost:9200"], logs_index: "otel-logs" },
      fields: [
        { key: "endpoints.0", label: "Endpoint", type: "text", default: "http://localhost:9200" },
        { key: "logs_index", label: "Logs Index", type: "text", default: "otel-logs" },
        { key: "traces_index", label: "Traces Index", type: "text", default: "otel-traces" }
      ]
    },
    loki: {
      label: "Loki Exporter",
      settings: { endpoint: "http://localhost:3100/loki/api/v1/push" },
      fields: [
        { key: "endpoint", label: "Endpoint", type: "text", default: "http://localhost:3100/loki/api/v1/push" }
      ]
    }
  },
  connectors: {
    spanmetrics: {
      label: "Span Metrics Connector",
      settings: { histogram: { explicit: { buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000] } } },
      fields: [
        { key: "histogram.explicit.buckets", label: "Histogram Buckets", type: "text", default: "1,5,10,25,50,100,250,500,1000" }
      ]
    },
    count: {
      label: "Count Connector",
      settings: {},
      fields: []
    }
  }
}

// Template definitions
const TEMPLATES = {
  basic: {
    pipelines: {
      traces: {
        receivers: [{ type: "otlp", id: "otlp", settings: COMPONENT_DEFAULTS.receivers.otlp.settings }],
        processors: [{ type: "batch", id: "batch", settings: COMPONENT_DEFAULTS.processors.batch.settings }],
        exporters: [{ type: "debug", id: "debug", settings: COMPONENT_DEFAULTS.exporters.debug.settings }]
      }
    }
  },
  kubernetes: {
    pipelines: {
      traces: {
        receivers: [
          { type: "otlp", id: "otlp", settings: COMPONENT_DEFAULTS.receivers.otlp.settings },
          { type: "k8s_events", id: "k8s_events", settings: COMPONENT_DEFAULTS.receivers.k8s_events.settings }
        ],
        processors: [
          { type: "k8s_attributes", id: "k8s_attributes", settings: COMPONENT_DEFAULTS.processors.k8s_attributes.settings },
          { type: "batch", id: "batch", settings: COMPONENT_DEFAULTS.processors.batch.settings }
        ],
        exporters: [{ type: "otlp", id: "otlp", settings: { endpoint: "tempo:4317", tls: { insecure: true } } }]
      }
    }
  },
  hostmonitoring: {
    pipelines: {
      metrics: {
        receivers: [{ type: "hostmetrics", id: "hostmetrics", settings: COMPONENT_DEFAULTS.receivers.hostmetrics.settings }],
        processors: [
          { type: "batch", id: "batch", settings: COMPONENT_DEFAULTS.processors.batch.settings },
          { type: "memory_limiter", id: "memory_limiter", settings: COMPONENT_DEFAULTS.processors.memory_limiter.settings }
        ],
        exporters: [{ type: "prometheus", id: "prometheus", settings: COMPONENT_DEFAULTS.exporters.prometheus.settings }]
      }
    }
  },
  logpipeline: {
    pipelines: {
      logs: {
        receivers: [{ type: "filelog", id: "filelog", settings: COMPONENT_DEFAULTS.receivers.filelog.settings }],
        processors: [
          { type: "attributes", id: "attributes", settings: COMPONENT_DEFAULTS.processors.attributes.settings },
          { type: "filter", id: "filter", settings: COMPONENT_DEFAULTS.processors.filter.settings }
        ],
        exporters: [{ type: "otlphttp", id: "otlphttp", settings: COMPONENT_DEFAULTS.exporters.otlphttp.settings }]
      }
    }
  },
  fullstack: {
    pipelines: {
      traces: {
        receivers: [{ type: "otlp", id: "otlp", settings: COMPONENT_DEFAULTS.receivers.otlp.settings }],
        processors: [
          { type: "batch", id: "batch", settings: COMPONENT_DEFAULTS.processors.batch.settings },
          { type: "memory_limiter", id: "memory_limiter", settings: COMPONENT_DEFAULTS.processors.memory_limiter.settings },
          { type: "resource", id: "resource", settings: COMPONENT_DEFAULTS.processors.resource.settings }
        ],
        exporters: [{ type: "otlp", id: "otlp", settings: { endpoint: "tempo:4317", tls: { insecure: true } } }]
      },
      metrics: {
        receivers: [{ type: "hostmetrics", id: "hostmetrics", settings: COMPONENT_DEFAULTS.receivers.hostmetrics.settings }],
        processors: [
          { type: "batch", id: "batch", settings: COMPONENT_DEFAULTS.processors.batch.settings },
          { type: "memory_limiter", id: "memory_limiter", settings: COMPONENT_DEFAULTS.processors.memory_limiter.settings }
        ],
        exporters: [{ type: "prometheus", id: "prometheus", settings: COMPONENT_DEFAULTS.exporters.prometheus.settings }]
      },
      logs: {
        receivers: [{ type: "filelog", id: "filelog", settings: COMPONENT_DEFAULTS.receivers.filelog.settings }],
        processors: [
          { type: "batch", id: "batch", settings: COMPONENT_DEFAULTS.processors.batch.settings },
          { type: "resource", id: "resource", settings: COMPONENT_DEFAULTS.processors.resource.settings }
        ],
        exporters: [{ type: "otlp", id: "otlp", settings: { endpoint: "loki:4317", tls: { insecure: true } } }]
      }
    }
  }
}

export default class extends Controller {
  static targets = [
    "receiversDrop", "processorsDrop", "exportersDrop",
    "tracesCount", "metricsCount", "logsCount",
    "configPanel", "yamlPanel", "noSelection", "configFields",
    "yamlOutput", "deployPanel", "instrumentPanel", "saveModal", "saveName", "saveDescription", "saveTags"
  ]

  static values = { template: String, loadConfig: String }

  connect() {
    this.currentPipelineType = "traces"
    this.pipelines = { traces: { receivers: [], processors: [], exporters: [] }, metrics: { receivers: [], processors: [], exporters: [] }, logs: { receivers: [], processors: [], exporters: [] } }
    this.selectedComponent = null
    this.dragData = null

    // Load template if specified
    if (this.templateValue && TEMPLATES[this.templateValue]) {
      this.loadTemplate(TEMPLATES[this.templateValue])
    }

    // Load config from gallery
    if (this.loadConfigValue) {
      try {
        const configData = JSON.parse(this.loadConfigValue)
        this.loadTemplate(configData)
      } catch(e) {}
    }

    this.render()
  }

  loadTemplate(template) {
    if (!template.pipelines) return
    Object.keys(template.pipelines).forEach(pipelineType => {
      const pipeline = template.pipelines[pipelineType]
      if (!this.pipelines[pipelineType]) {
        this.pipelines[pipelineType] = { receivers: [], processors: [], exporters: [] }
      }
      ;["receivers", "processors", "exporters"].forEach(cat => {
        if (pipeline[cat]) {
          this.pipelines[pipelineType][cat] = JSON.parse(JSON.stringify(pipeline[cat]))
        }
      })
    })
  }

  // Drag and drop
  dragStart(event) {
    const item = event.currentTarget
    this.dragData = {
      category: item.dataset.category,
      component: item.dataset.component
    }
    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData("text/plain", JSON.stringify(this.dragData))
    item.style.opacity = "0.5"
    setTimeout(() => { item.style.opacity = "1" }, 200)
  }

  dragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    event.currentTarget.classList.add("drag-over")
  }

  dragLeave(event) {
    event.currentTarget.classList.remove("drag-over")
  }

  drop(event) {
    event.preventDefault()
    event.currentTarget.classList.remove("drag-over")

    let data
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"))
    } catch(e) {
      data = this.dragData
    }

    if (!data) return

    const dropCategory = event.currentTarget.dataset.dropCategory
    if (data.category !== dropCategory) return

    this.addComponentToPipeline(data.category, data.component)
  }

  // Click to add
  addComponent(event) {
    const item = event.currentTarget
    const category = item.dataset.category
    const component = item.dataset.component
    this.addComponentToPipeline(category, component)
  }

  addComponentToPipeline(category, componentType) {
    const pipeline = this.pipelines[this.currentPipelineType]
    if (!pipeline[category]) pipeline[category] = []

    const defaults = COMPONENT_DEFAULTS[category]?.[componentType]
    const settings = defaults ? JSON.parse(JSON.stringify(defaults.settings)) : {}

    // Generate unique ID
    const existing = pipeline[category].filter(c => c.type === componentType)
    const id = existing.length > 0 ? `${componentType}/${existing.length + 1}` : componentType

    pipeline[category].push({
      type: componentType,
      id: id,
      settings: settings
    })

    this.render()
    this.generateYaml()

    // Notify tutorial controller
    document.dispatchEvent(new CustomEvent("tutorial:component-added", {
      detail: { category, component: componentType }
    }))
  }

  removeComponent(event) {
    event.stopPropagation()
    const category = event.currentTarget.dataset.category
    const index = parseInt(event.currentTarget.dataset.index)

    this.pipelines[this.currentPipelineType][category].splice(index, 1)

    if (this.selectedComponent &&
        this.selectedComponent.category === category &&
        this.selectedComponent.index === index) {
      this.selectedComponent = null
      this.showNoSelection()
    }

    this.render()
    this.generateYaml()
  }

  selectComponent(event) {
    const category = event.currentTarget.dataset.category
    const index = parseInt(event.currentTarget.dataset.index)

    this.selectedComponent = { category, index }
    this.renderConfigPanel()
    this.render()
  }

  // Tab switching
  switchTab(event) {
    const type = event.params.type
    this.currentPipelineType = type

    document.querySelectorAll(".pipeline-tab").forEach(tab => tab.classList.remove("active"))
    event.currentTarget.classList.add("active")

    this.selectedComponent = null
    this.showNoSelection()
    this.render()
  }

  switchConfigTab(event) {
    const tab = event.currentTarget.dataset.tab
    document.querySelectorAll(".config-panel-tab").forEach(t => t.classList.remove("active"))
    event.currentTarget.classList.add("active")

    const panels = {
      config: this.configPanelTarget,
      yaml: this.yamlPanelTarget,
      deploy: this.hasDeployPanelTarget ? this.deployPanelTarget : null,
      instrument: this.hasInstrumentPanelTarget ? this.instrumentPanelTarget : null
    }
    Object.values(panels).forEach(p => { if (p) p.classList.add("hidden") })
    if (panels[tab]) panels[tab].classList.remove("hidden")

    if (tab === "yaml") this.generateYaml()
    if (tab === "deploy") {
      const dc = this.application.getControllerForElementAndIdentifier(panels.deploy, "deploy")
      if (dc) dc.generate()
    }
    if (tab === "instrument") {
      const ic = this.application.getControllerForElementAndIdentifier(panels.instrument, "instrument")
      if (ic) ic.generate()
    }
  }

  showNoSelection() {
    this.noSelectionTarget.style.display = "block"
    this.configFieldsTarget.style.display = "none"
  }

  // Render pipeline components
  render() {
    const pipeline = this.pipelines[this.currentPipelineType]

    const renderComponents = (container, category) => {
      const items = pipeline[category] || []
      container.innerHTML = ""
      container.classList.toggle("empty", items.length === 0)

      items.forEach((comp, index) => {
        const categoryClass = category === "receivers" ? "receiver" :
                              category === "processors" ? "processor" :
                              category === "exporters" ? "exporter" : "connector"
        const isSelected = this.selectedComponent &&
                           this.selectedComponent.category === category &&
                           this.selectedComponent.index === index

        const div = document.createElement("div")
        div.className = `pipeline-component ${categoryClass}${isSelected ? " selected" : ""}`
        div.dataset.category = category
        div.dataset.index = index
        div.dataset.action = "click->pipeline#selectComponent"
        div.innerHTML = `
          <span>${comp.type}</span>
          <button class="comp-remove" data-category="${category}" data-index="${index}" data-action="click->pipeline#removeComponent">✕</button>
        `
        container.appendChild(div)
      })
    }

    renderComponents(this.receiversDropTarget, "receivers")
    renderComponents(this.processorsDropTarget, "processors")
    renderComponents(this.exportersDropTarget, "exporters")

    // Update tab counts
    ;["traces", "metrics", "logs"].forEach(type => {
      const p = this.pipelines[type]
      const count = (p.receivers?.length || 0) + (p.processors?.length || 0) + (p.exporters?.length || 0)
      const target = this[`${type}CountTarget`]
      if (target) target.textContent = count
    })

    // Dispatch for validation controller
    this.element.dispatchEvent(new CustomEvent('pipeline:changed', { detail: this.pipelines }))
  }

  // Render component config panel
  renderConfigPanel() {
    if (!this.selectedComponent) return this.showNoSelection()

    const { category, index } = this.selectedComponent
    const comp = this.pipelines[this.currentPipelineType][category]?.[index]
    if (!comp) return this.showNoSelection()

    const defaults = COMPONENT_DEFAULTS[category]?.[comp.type]
    if (!defaults) {
      this.configFieldsTarget.innerHTML = `<div class="no-selection">No configurable fields for ${comp.type}</div>`
      this.noSelectionTarget.style.display = "none"
      this.configFieldsTarget.style.display = "block"
      return
    }

    this.noSelectionTarget.style.display = "none"
    this.configFieldsTarget.style.display = "block"

    let html = `<h4 style="color:var(--green);margin-bottom:0.75rem;font-size:0.9rem">${defaults.label}</h4>`
    html += `<div style="color:var(--text-dim);font-size:0.75rem;margin-bottom:0.5rem">ID: ${comp.id}</div>`
    html += `<button class="btn btn-sm btn-cyan" style="margin-bottom:0.75rem;font-size:0.7rem" data-action="click->simulation#previewSelected">👁 Preview Data</button>`

    defaults.fields.forEach(field => {
      const currentValue = this.getNestedValue(comp.settings, field.key) ?? field.default
      html += `<div class="config-field">`
      html += `<label>${field.label}</label>`

      if (field.type === "text") {
        html += `<input type="text" value="${this.escapeHtml(String(currentValue))}" data-field-key="${field.key}" data-action="input->pipeline#updateField">`
      } else if (field.type === "number") {
        html += `<input type="number" value="${currentValue}" data-field-key="${field.key}" data-action="input->pipeline#updateField">`
      } else if (field.type === "select") {
        html += `<select data-field-key="${field.key}" data-action="change->pipeline#updateField">`
        field.options.forEach(opt => {
          html += `<option value="${opt}"${String(currentValue) === opt ? " selected" : ""}>${opt}</option>`
        })
        html += `</select>`
      } else if (field.type === "toggle") {
        const checked = currentValue === true || currentValue === "true" || (typeof currentValue === "object" && currentValue !== null)
        html += `<div class="toggle-row">
          <label class="toggle-switch">
            <input type="checkbox" ${checked ? "checked" : ""} data-field-key="${field.key}" data-action="change->pipeline#updateToggle">
            <span class="slider"></span>
          </label>
          <span style="color:var(--text-dim);font-size:0.8rem">${checked ? "Enabled" : "Disabled"}</span>
        </div>`
      }

      html += `</div>`
    })

    this.configFieldsTarget.innerHTML = html
  }

  updateField(event) {
    if (!this.selectedComponent) return
    const { category, index } = this.selectedComponent
    const comp = this.pipelines[this.currentPipelineType][category][index]
    const key = event.currentTarget.dataset.fieldKey
    let value = event.currentTarget.value

    // Convert numbers
    if (event.currentTarget.type === "number" && value !== "") {
      value = Number(value)
    }

    this.setNestedValue(comp.settings, key, value)
    this.generateYaml()
  }

  updateToggle(event) {
    if (!this.selectedComponent) return
    const { category, index } = this.selectedComponent
    const comp = this.pipelines[this.currentPipelineType][category][index]
    const key = event.currentTarget.dataset.fieldKey
    const checked = event.currentTarget.checked

    // For scrapers, set to empty object if enabled, delete if disabled
    if (key.startsWith("scrapers.")) {
      const scraper = key.split(".")[1]
      if (checked) {
        if (!comp.settings.scrapers) comp.settings.scrapers = {}
        comp.settings.scrapers[scraper] = {}
      } else {
        if (comp.settings.scrapers) delete comp.settings.scrapers[scraper]
      }
    } else {
      this.setNestedValue(comp.settings, key, checked)
    }

    // Update label
    const label = event.currentTarget.closest(".toggle-row").querySelector("span:last-child")
    if (label) label.textContent = checked ? "Enabled" : "Disabled"

    this.generateYaml()
  }

  // YAML generation
  generateYaml() {
    const data = { pipelines: {} }
    let hasContent = false

    Object.keys(this.pipelines).forEach(pipelineType => {
      const pipeline = this.pipelines[pipelineType]
      const hasComponents = (pipeline.receivers?.length || 0) + (pipeline.processors?.length || 0) + (pipeline.exporters?.length || 0) > 0
      if (hasComponents) {
        data.pipelines[pipelineType] = pipeline
        hasContent = true
      }
    })

    if (!hasContent) {
      this.yamlOutputTarget.textContent = "# Add components to your pipeline to generate config"
      return
    }

    // Generate YAML client-side for instant feedback
    this.yamlOutputTarget.textContent = this.buildYaml(data)
  }

  buildYaml(data) {
    const pipelines = data.pipelines || {}
    let receiversYaml = {}
    let processorsYaml = {}
    let exportersYaml = {}
    let servicePipelines = {}

    Object.keys(pipelines).forEach(pipelineType => {
      const pipeline = pipelines[pipelineType]
      const recNames = [];
      const procNames = [];
      const expNames = [];

      ;(pipeline.receivers || []).forEach(comp => {
        const id = comp.id || comp.type
        receiversYaml[id] = this.cleanSettings(comp.settings)
        recNames.push(id)
      })
      ;(pipeline.processors || []).forEach(comp => {
        const id = comp.id || comp.type
        processorsYaml[id] = this.cleanSettings(comp.settings)
        procNames.push(id)
      })
      ;(pipeline.exporters || []).forEach(comp => {
        const id = comp.id || comp.type
        exportersYaml[id] = this.cleanSettings(comp.settings)
        expNames.push(id)
      })

      servicePipelines[pipelineType] = {}
      if (recNames.length) servicePipelines[pipelineType].receivers = recNames
      if (procNames.length) servicePipelines[pipelineType].processors = procNames
      if (expNames.length) servicePipelines[pipelineType].exporters = expNames
    })

    let yaml = ""
    if (Object.keys(receiversYaml).length) {
      yaml += this.renderYamlSection("receivers", receiversYaml)
    }
    if (Object.keys(processorsYaml).length) {
      yaml += this.renderYamlSection("processors", processorsYaml)
    }
    if (Object.keys(exportersYaml).length) {
      yaml += this.renderYamlSection("exporters", exportersYaml)
    }

    yaml += "\nservice:\n  pipelines:\n"
    Object.keys(servicePipelines).forEach(pType => {
      yaml += `    ${pType}:\n`
      const p = servicePipelines[pType]
      if (p.receivers) yaml += `      receivers: [${p.receivers.join(", ")}]\n`
      if (p.processors) yaml += `      processors: [${p.processors.join(", ")}]\n`
      if (p.exporters) yaml += `      exporters: [${p.exporters.join(", ")}]\n`
    })

    return yaml
  }

  renderYamlSection(name, items) {
    let yaml = `${name}:\n`
    Object.keys(items).forEach(key => {
      const settings = items[key]
      if (settings && Object.keys(settings).length > 0) {
        yaml += `  ${key}:\n`
        yaml += this.renderYamlObject(settings, 4)
      } else {
        yaml += `  ${key}:\n`
      }
    })
    yaml += "\n"
    return yaml
  }

  renderYamlObject(obj, indent) {
    let yaml = ""
    const prefix = " ".repeat(indent)

    Object.keys(obj).forEach(key => {
      const value = obj[key]
      if (value === null || value === undefined || value === "") return

      if (Array.isArray(value)) {
        if (value.length === 0) return
        if (value.every(v => typeof v !== "object")) {
          yaml += `${prefix}${key}: [${value.map(v => this.formatYamlValue(v)).join(", ")}]\n`
        } else {
          yaml += `${prefix}${key}:\n`
          value.forEach(item => {
            if (typeof item === "object" && item !== null) {
              const keys = Object.keys(item)
              if (keys.length > 0) {
                yaml += `${prefix}  - ${keys[0]}: ${this.formatYamlValue(item[keys[0]])}\n`
                keys.slice(1).forEach(k => {
                  yaml += `${prefix}    ${k}: ${this.formatYamlValue(item[k])}\n`
                })
              }
            } else {
              yaml += `${prefix}  - ${this.formatYamlValue(item)}\n`
            }
          })
        }
      } else if (typeof value === "object" && value !== null) {
        yaml += `${prefix}${key}:\n`
        yaml += this.renderYamlObject(value, indent + 2)
      } else {
        yaml += `${prefix}${key}: ${this.formatYamlValue(value)}\n`
      }
    })

    return yaml
  }

  formatYamlValue(value) {
    if (typeof value === "boolean") return String(value)
    if (typeof value === "number") return String(value)
    if (typeof value === "string") {
      if (value.match(/^[0-9]+$/) || value.includes(":") || value.includes(" ") || value.includes("#") ||
          value.includes("*") || value.includes("/") || value.includes("{") || value.includes("}") || value === "") {
        return `"${value}"`
      }
      if (value.match(/^\d+(\.\d+)?(ms|s|m|h)$/)) return value
      return value
    }
    return String(value)
  }

  cleanSettings(settings) {
    if (!settings || typeof settings !== "object") return {}
    const cleaned = {}
    Object.keys(settings).forEach(key => {
      const val = settings[key]
      if (val === null || val === undefined || val === "") return
      if (typeof val === "object" && !Array.isArray(val)) {
        const sub = this.cleanSettings(val)
        if (Object.keys(sub).length > 0) cleaned[key] = sub
      } else {
        cleaned[key] = val
      }
    })
    return cleaned
  }

  // Nested value helpers
  getNestedValue(obj, path) {
    const parts = path.split(".")
    let current = obj
    for (const part of parts) {
      if (current === null || current === undefined) return undefined
      if (Array.isArray(current)) {
        const idx = parseInt(part)
        current = current[idx]
      } else {
        current = current[part]
      }
    }
    return current
  }

  setNestedValue(obj, path, value) {
    const parts = path.split(".")
    let current = obj
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const nextPart = parts[i + 1]
      if (Array.isArray(current)) {
        const idx = parseInt(part)
        if (!current[idx]) current[idx] = isNaN(parseInt(nextPart)) ? {} : []
        current = current[idx]
      } else {
        if (!current[part]) current[part] = isNaN(parseInt(nextPart)) ? {} : []
        current = current[part]
      }
    }
    const lastPart = parts[parts.length - 1]
    if (Array.isArray(current)) {
      current[parseInt(lastPart)] = value
    } else {
      current[lastPart] = value
    }
  }

  // Copy YAML
  copyYaml() {
    const yaml = this.yamlOutputTarget.textContent
    navigator.clipboard.writeText(yaml).then(() => {
      const feedback = document.createElement("div")
      feedback.className = "copy-feedback"
      feedback.textContent = "✓ Copied to clipboard"
      document.body.appendChild(feedback)
      setTimeout(() => feedback.remove(), 2000)
    })
  }

  // Clear pipeline
  clearPipeline() {
    this.pipelines[this.currentPipelineType] = { receivers: [], processors: [], exporters: [] }
    this.selectedComponent = null
    this.showNoSelection()
    this.render()
    this.generateYaml()
  }

  // Save modal
  openSaveModal() {
    this.saveModalTarget.classList.add("active")
  }

  closeSaveModal() {
    this.saveModalTarget.classList.remove("active")
  }

  saveConfig() {
    const name = this.saveNameTarget.value.trim()
    if (!name) {
      this.saveNameTarget.style.borderColor = "var(--red)"
      setTimeout(() => { this.saveNameTarget.style.borderColor = "" }, 2000)
      return
    }

    const description = this.saveDescriptionTarget.value.trim()
    const pipelineData = JSON.stringify({ pipelines: this.pipelines })
    const yamlOutput = this.yamlOutputTarget.textContent

    // Collect selected tags
    const tags = []
    if (this.hasSaveTagsTarget) {
      this.saveTagsTarget.querySelectorAll("input:checked").forEach(cb => tags.push(cb.value))
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    fetch("/configs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        config: {
          name: name,
          description: description,
          pipeline_data: pipelineData,
          yaml_output: yamlOutput,
          tags: JSON.stringify(tags)
        }
      })
    }).then(response => {
      if (response.ok) return response.json()
      throw new Error("Save failed")
    }).then(data => {
      this.closeSaveModal()
      const feedback = document.createElement("div")
      feedback.className = "copy-feedback"
      feedback.textContent = `✓ Saved! Share: /configs/${data.share_token}`
      document.body.appendChild(feedback)
      setTimeout(() => feedback.remove(), 3000)
    }).catch(err => {
      const feedback = document.createElement("div")
      feedback.className = "copy-feedback"
      feedback.style.borderColor = "var(--red)"
      feedback.style.color = "var(--red)"
      feedback.textContent = "✕ Failed to save"
      document.body.appendChild(feedback)
      setTimeout(() => feedback.remove(), 2000)
    })
  }

  escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}
