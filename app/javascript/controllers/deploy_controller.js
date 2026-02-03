import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["output", "subtab"]

  connect() {
    this.activeFormat = "docker-compose"
  }

  switchFormat(event) {
    this.activeFormat = event.currentTarget.dataset.format
    this.subtabTargets.forEach(t => t.classList.toggle("active", t.dataset.format === this.activeFormat))
    this.generate()
  }

  generate() {
    const pipelineCtrl = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller*="pipeline"]'), "pipeline"
    )
    if (!pipelineCtrl) return

    const state = this._getPipelineState(pipelineCtrl)
    if (!state.hasContent) {
      this.outputTarget.textContent = "# Add components to your pipeline first"
      return
    }

    const yamlConfig = pipelineCtrl.buildYaml({ pipelines: state.pipelines })
    const ports = this._detectPorts(state)

    const generators = {
      "docker-compose": () => this._dockerCompose(yamlConfig, ports),
      "k8s-daemonset": () => this._k8sDaemonSet(yamlConfig, ports, state),
      "k8s-deployment": () => this._k8sDeployment(yamlConfig, ports, state),
      "helm-values": () => this._helmValues(yamlConfig, ports, state)
    }

    this.outputTarget.textContent = (generators[this.activeFormat] || generators["docker-compose"])()
  }

  copy() {
    const text = this.outputTarget.textContent
    navigator.clipboard.writeText(text).then(() => {
      const btn = this.element.querySelector("[data-action*='copy']")
      if (btn) { const orig = btn.textContent; btn.textContent = "✓ Copied!"; setTimeout(() => btn.textContent = orig, 1500) }
    })
  }

  _getPipelineState(ctrl) {
    const pipelines = {}
    let hasContent = false
    Object.keys(ctrl.pipelines).forEach(type => {
      const p = ctrl.pipelines[type]
      const has = (p.receivers?.length || 0) + (p.processors?.length || 0) + (p.exporters?.length || 0) > 0
      if (has) { pipelines[type] = p; hasContent = true }
    })
    return { pipelines, hasContent }
  }

  _detectPorts(state) {
    const ports = new Set()
    Object.values(state.pipelines).forEach(p => {
      (p.receivers || []).forEach(r => {
        if (r.type === "otlp") { ports.add("4317"); ports.add("4318") }
        if (r.type === "prometheus") ports.add("8888")
        if (r.type === "zipkin") ports.add("9411")
        if (r.type === "jaeger") { ports.add("14250"); ports.add("14268") }
      })
      ;(p.exporters || []).forEach(e => {
        if (e.type === "prometheus") ports.add("8889")
      })
    })
    if (ports.size === 0) { ports.add("4317"); ports.add("4318") }
    return Array.from(ports)
  }

  _memoryLimit(state) {
    let limit = "512Mi"
    Object.values(state.pipelines).forEach(p => {
      (p.processors || []).forEach(proc => {
        if (proc.type === "memory_limiter" && proc.settings?.limit_mib) {
          limit = proc.settings.limit_mib + "Mi"
        }
      })
    })
    return limit
  }

  _dockerCompose(yamlConfig, ports) {
    const portLines = ports.map(p => `      - "${p}:${p}"`).join("\n")
    return `# Docker Compose - OpenTelemetry Collector
# Usage:
#   1. Save collector config as otel-config.yaml
#   2. docker compose up -d

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    restart: unless-stopped
    command: ["--config=/etc/otel/config.yaml"]
    volumes:
      - ./otel-config.yaml:/etc/otel/config.yaml:ro
    ports:
${portLines}
    environment:
      - GOMEMLIMIT=400MiB
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M

# --- otel-config.yaml ---
# Save the YAML Output tab content as otel-config.yaml
`
  }

  _k8sDaemonSet(yamlConfig, ports, state) {
    const memLimit = this._memoryLimit(state)
    const portSpecs = ports.map(p => `          - containerPort: ${p}\n            protocol: TCP`).join("\n")
    const svcPorts = ports.map(p => `    - port: ${p}\n      targetPort: ${p}\n      protocol: TCP\n      name: port-${p}`).join("\n")
    const indent = (s, n) => s.split("\n").map(l => " ".repeat(n) + l).join("\n")

    return `# Kubernetes DaemonSet - OpenTelemetry Collector
# Deploys collector on every node for host-level telemetry collection
# Usage: kubectl apply -f otel-collector-daemonset.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: otel
  labels:
    app.kubernetes.io/name: otel-collector
    app.kubernetes.io/component: collector
data:
  config.yaml: |
${indent(yamlConfig, 4)}

---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: otel
  labels:
    app.kubernetes.io/name: otel-collector
    app.kubernetes.io/component: collector
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: otel-collector
  template:
    metadata:
      labels:
        app.kubernetes.io/name: otel-collector
        app.kubernetes.io/component: collector
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/config.yaml"]
          ports:
${portSpecs}
          resources:
            limits:
              memory: ${memLimit}
              cpu: "500m"
            requests:
              memory: "128Mi"
              cpu: "100m"
          volumeMounts:
            - name: config
              mountPath: /etc/otel
              readOnly: true
          livenessProbe:
            httpGet:
              path: /
              port: 13133
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 13133
      volumes:
        - name: config
          configMap:
            name: otel-collector-config

---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: otel
  labels:
    app.kubernetes.io/name: otel-collector
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: otel-collector
  ports:
${svcPorts}

---
apiVersion: v1
kind: Namespace
metadata:
  name: otel
`
  }

  _k8sDeployment(yamlConfig, ports, state) {
    const memLimit = this._memoryLimit(state)
    const portSpecs = ports.map(p => `          - containerPort: ${p}\n            protocol: TCP`).join("\n")
    const svcPorts = ports.map(p => `    - port: ${p}\n      targetPort: ${p}\n      protocol: TCP\n      name: port-${p}`).join("\n")
    const indent = (s, n) => s.split("\n").map(l => " ".repeat(n) + l).join("\n")

    return `# Kubernetes Deployment - OpenTelemetry Collector
# Gateway/aggregation pattern with configurable replicas
# Usage: kubectl apply -f otel-collector-deployment.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: otel
  labels:
    app.kubernetes.io/name: otel-collector
    app.kubernetes.io/component: gateway
data:
  config.yaml: |
${indent(yamlConfig, 4)}

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: otel
  labels:
    app.kubernetes.io/name: otel-collector
    app.kubernetes.io/component: gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: otel-collector
  template:
    metadata:
      labels:
        app.kubernetes.io/name: otel-collector
        app.kubernetes.io/component: gateway
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/config.yaml"]
          ports:
${portSpecs}
          resources:
            limits:
              memory: ${memLimit}
              cpu: "1"
            requests:
              memory: "256Mi"
              cpu: "200m"
          volumeMounts:
            - name: config
              mountPath: /etc/otel
              readOnly: true
          livenessProbe:
            httpGet:
              path: /
              port: 13133
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 13133
      volumes:
        - name: config
          configMap:
            name: otel-collector-config

---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: otel
  labels:
    app.kubernetes.io/name: otel-collector
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: otel-collector
  ports:
${svcPorts}

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-collector
  namespace: otel
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-collector
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

---
apiVersion: v1
kind: Namespace
metadata:
  name: otel
`
  }

  _helmValues(yamlConfig, ports, state) {
    const portEntries = ports.map(p => {
      let name = `port-${p}`
      let proto = "TCP"
      if (p === "4317") name = "otlp-grpc"
      if (p === "4318") name = "otlp-http"
      if (p === "8888" || p === "8889") name = "prometheus"
      if (p === "9411") name = "zipkin"
      return `    ${name}:\n      enabled: true\n      containerPort: ${p}\n      servicePort: ${p}\n      protocol: ${proto}`
    }).join("\n")

    const indent = (s, n) => s.split("\n").map(l => " ".repeat(n) + l).join("\n")
    const memLimit = this._memoryLimit(state)

    return `# Helm Values - open-telemetry/opentelemetry-collector chart
# Usage:
#   helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
#   helm install otel-collector open-telemetry/opentelemetry-collector -f values.yaml

mode: daemonset  # or "deployment" for gateway pattern

image:
  repository: otel/opentelemetry-collector-contrib

resources:
  limits:
    memory: ${memLimit}
    cpu: 500m
  requests:
    memory: 128Mi
    cpu: 100m

ports:
${portEntries}

config:
${indent(yamlConfig, 2)}

serviceAccount:
  create: true
  name: otel-collector

service:
  enabled: true
  type: ClusterIP
`
  }
}
