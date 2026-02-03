# ⬡ OTel Playground

A visual, drag-and-drop OpenTelemetry Collector configuration builder. Build pipelines, simulate data flow, generate deploy manifests, and get instrumentation snippets — all from your browser with a retro CRT terminal aesthetic.

**[Try it live →](http://socialmediaposter.ai:88)**

![Ruby](https://img.shields.io/badge/Ruby-3.2.3-red) ![Rails](https://img.shields.io/badge/Rails-8.1-red) ![License](https://img.shields.io/badge/license-MIT-green)

---

## What Is This?

Configuring the OpenTelemetry Collector usually means hand-editing YAML and hoping you got the indentation right. OTel Playground gives you a visual pipeline builder instead — drag receivers, processors, and exporters into place, tweak their settings, and get production-ready YAML instantly.

No signup. No backend dependencies. Just open it and start building.

## ✨ Features

### 🔧 Visual Pipeline Builder
- **Drag-and-drop** components into your pipeline (or just click to add)
- Separate tabs for **Traces**, **Metrics**, and **Logs** pipelines
- Configure every component with inline settings panels
- Supports **connectors** (e.g., `spanmetrics` for traces → metrics)
- Real-time YAML generation as you build

### 📡 Supported Components

**Receivers:** OTLP, Prometheus, Host Metrics, Filelog, Journald, K8s Events, Zipkin, Jaeger, Windows Event Log

**Processors:** Batch, Memory Limiter, Attributes, Filter, Transform, Resource, Probabilistic Sampler, Tail Sampling, K8s Attributes, Resource Detection

**Exporters:** OTLP (gRPC), OTLP HTTP, Prometheus, Debug, File, Elasticsearch, Loki

**Connectors:** Span Metrics (traces → metrics), Count (any → metrics)

### ▶ Live Pipeline Simulation
Hit the **Simulate** button to watch telemetry data flow through your pipeline in real time:
- Animated particles moving through receivers → processors → exporters
- See batch buffering, memory limiter gauges, and sampling rates in action
- Filter/sampler processors actually drop particles visually
- Event log showing every operation
- Summary stats (throughput, dropped items, per-component counts)

### ✅ Real-Time Validation
- Warnings for missing `memory_limiter` or `batch` processors
- Errors for pipelines with no receivers or exporters
- Hints like "Debug exporter is great for testing — remember to remove in production"
- Updates as you build, not after

### 📦 Deploy Manifest Generation
Switch to the **Deploy** tab and get ready-to-use manifests for:
- **Docker Compose** — single-file deployment with resource limits
- **Kubernetes DaemonSet** — per-node collector for host telemetry
- **Kubernetes Deployment** — gateway pattern with HPA autoscaling
- **Helm Values** — for the official `opentelemetry-collector` chart

All manifests include your actual pipeline config embedded as a ConfigMap.

### 🚀 Instrumentation Snippets
The **Instrument** tab generates OTel SDK setup code for your app, matching your pipeline's receivers:
- **Python** — `opentelemetry-sdk` with OTLP exporters
- **Node.js** — `@opentelemetry/sdk-node` with traces/metrics
- **Go** — Full `go.opentelemetry.io/otel` setup with shutdown handling
- **Java** — Maven/Gradle deps with `OpenTelemetrySdk` builder

Snippets auto-detect whether you're using gRPC or HTTP OTLP, and which signal types your pipeline handles.

### 📥 Import Existing Configs
Already have a collector config? Paste YAML or upload a `.yaml` file — the builder parses it and populates the visual editor. Edit visually, then export the updated config.

### 🎓 Guided Tutorial
A step-by-step walkthrough that teaches you to build your first pipeline in 5 minutes. Highlights the right components to click and explains what each one does.

### 📚 Starter Templates
Pre-built pipelines to get you started quickly:

| Template | What It Does |
|----------|-------------|
| **Basic Pipeline** | OTLP → Batch → Debug (hello world) |
| **Kubernetes** | OTLP + K8s Events → K8s Attributes → OTLP export |
| **Host Monitoring** | Host Metrics → Batch + Memory Limiter → Prometheus |
| **Log Pipeline** | Filelog → Attributes + Filter → OTLP HTTP |
| **Full Stack** | All three signal types with multiple receivers/exporters |
| **Windows Event Logs** | Application/System/Security logs → Elastic Cloud |

### 🏛 Community Gallery
Save your configs to a shared gallery with tags, descriptions, and upvotes. Browse what others have built, load their configs into the builder, and remix them.

- Share via unique URLs (`/configs/<token>`)
- Filter by tags (kubernetes, docker, logs, traces, metrics, etc.)
- Sort by newest, most popular, or most viewed

## 🛠 Tech Stack

- **Ruby on Rails 8.1** with Hotwire (Turbo + Stimulus)
- **Stimulus controllers** for all interactivity (no React/Vue/etc.)
- **Propshaft** asset pipeline
- **Import Maps** — no webpack, no node_modules, no build step
- **SQLite** for the community gallery database
- **Puma** web server
- Custom **CRT terminal CSS** with scanlines, glow effects, and monospace everything

## 🚀 Running Locally

### Prerequisites
- Ruby 3.2.3+
- SQLite3
- Bundler

### Setup

```bash
git clone https://github.com/davidgeorgehope/otel-playground.git
cd otel-playground

# Install dependencies
bundle install

# Set up the database
bin/rails db:prepare

# Start the server
bin/rails server
```

Open [http://localhost:3000](http://localhost:3000) and start dragging components.

### Environment Variables

No environment variables are required for local development. The app works out of the box with SQLite and default Rails settings.

## 📁 Project Structure

```
app/
├── controllers/
│   ├── pipeline_controller.rb    # Builder + YAML generation
│   └── configs_controller.rb     # Community gallery CRUD
├── javascript/controllers/
│   ├── pipeline_controller.js    # Core drag-and-drop builder
│   ├── simulation_controller.js  # Live pipeline simulation
│   ├── deploy_controller.js      # Deploy manifest generation
│   ├── instrument_controller.js  # SDK snippet generation
│   ├── tutorial_controller.js    # Guided walkthrough
│   └── validation_controller.js  # Real-time pipeline validation
├── models/
│   └── config.rb                 # Saved configs (gallery)
├── services/
│   └── yaml_generator.rb         # Server-side YAML generation
└── views/
    ├── pipeline/
    │   ├── builder.html.erb      # Main builder UI
    │   └── templates.html.erb    # Template gallery page
    └── configs/
        ├── index.html.erb        # Community gallery
        └── show.html.erb         # Single config view
```

## 🤝 Contributing

PRs welcome! Some ideas:

- **New components** — Add more receivers/processors/exporters to `COMPONENT_DEFAULTS` in `pipeline_controller.js`
- **More templates** — Add entries to the `TEMPLATES` object and `templates.html.erb`
- **Better simulation** — More realistic processor behaviors, connector simulation
- **New deploy targets** — Nomad, ECS, systemd service files
- **More languages** — Rust, .NET, PHP instrumentation snippets

## 📄 License

MIT
