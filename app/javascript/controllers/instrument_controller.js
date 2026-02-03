import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["output", "langtab", "installCmd"]

  connect() {
    this.activeLang = "python"
  }

  switchLang(event) {
    this.activeLang = event.currentTarget.dataset.lang
    this.langtabTargets.forEach(t => t.classList.toggle("active", t.dataset.lang === this.activeLang))
    this.generate()
  }

  generate() {
    const pipelineCtrl = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller*="pipeline"]'), "pipeline"
    )
    if (!pipelineCtrl) return

    const ctx = this._analyzeReceivers(pipelineCtrl)
    if (!ctx.hasContent) {
      this.outputTarget.textContent = "# Add receivers to your pipeline first"
      this.installCmdTarget.textContent = ""
      return
    }

    const generators = {
      python: () => this._python(ctx),
      nodejs: () => this._nodejs(ctx),
      go: () => this._go(ctx),
      java: () => this._java(ctx)
    }

    const result = (generators[this.activeLang] || generators.python)()
    this.outputTarget.textContent = result.code
    this.installCmdTarget.textContent = result.install
  }

  copy() {
    const text = this.outputTarget.textContent
    navigator.clipboard.writeText(text).then(() => {
      const btn = this.element.querySelector("[data-action*='copy']")
      if (btn) { const orig = btn.textContent; btn.textContent = "✓ Copied!"; setTimeout(() => btn.textContent = orig, 1500) }
    })
  }

  _analyzeReceivers(ctrl) {
    const signals = new Set()
    let hasOtlpGrpc = false, hasOtlpHttp = false, hasPrometheus = false
    let hasContent = false

    Object.entries(ctrl.pipelines).forEach(([type, p]) => {
      const has = (p.receivers?.length || 0) + (p.exporters?.length || 0) > 0
      if (has) { signals.add(type); hasContent = true }
      ;(p.receivers || []).forEach(r => {
        if (r.type === "otlp") {
          const s = r.settings || {}
          if (s.protocols?.grpc) hasOtlpGrpc = true
          if (s.protocols?.http) hasOtlpHttp = true
          if (!s.protocols) { hasOtlpGrpc = true; hasOtlpHttp = true }
        }
        if (r.type === "prometheus") hasPrometheus = true
      })
    })

    // Default to gRPC if OTLP is present or no specific receiver
    if (!hasOtlpGrpc && !hasOtlpHttp && !hasPrometheus) hasOtlpGrpc = true

    return { signals: Array.from(signals), hasOtlpGrpc, hasOtlpHttp, hasPrometheus, hasContent }
  }

  _python(ctx) {
    const parts = []
    const pkgs = ["opentelemetry-api", "opentelemetry-sdk"]
    const imports = []

    if (ctx.hasOtlpGrpc || ctx.hasOtlpHttp) {
      const proto = ctx.hasOtlpGrpc ? "grpc" : "http"
      const port = ctx.hasOtlpGrpc ? "4317" : "4318"

      if (ctx.signals.includes("traces")) {
        pkgs.push(ctx.hasOtlpGrpc ? "opentelemetry-exporter-otlp-proto-grpc" : "opentelemetry-exporter-otlp-proto-http")
        imports.push("from opentelemetry import trace")
        imports.push("from opentelemetry.sdk.trace import TracerProvider")
        imports.push("from opentelemetry.sdk.trace.export import BatchSpanProcessor")
        if (ctx.hasOtlpGrpc) {
          imports.push("from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter")
        } else {
          imports.push("from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter")
        }
        parts.push(`# Traces
provider = TracerProvider()
exporter = OTLPSpanExporter(endpoint="http://localhost:${port}")
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)`)
      }

      if (ctx.signals.includes("metrics")) {
        pkgs.push(ctx.hasOtlpGrpc ? "opentelemetry-exporter-otlp-proto-grpc" : "opentelemetry-exporter-otlp-proto-http")
        imports.push("from opentelemetry import metrics")
        imports.push("from opentelemetry.sdk.metrics import MeterProvider")
        imports.push("from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader")
        if (ctx.hasOtlpGrpc) {
          imports.push("from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter")
        } else {
          imports.push("from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter")
        }
        parts.push(`# Metrics
metric_exporter = OTLPMetricExporter(endpoint="http://localhost:${port}")
reader = PeriodicExportingMetricReader(metric_exporter)
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)
meter = metrics.get_meter(__name__)`)
      }

      if (ctx.signals.includes("logs")) {
        pkgs.push(ctx.hasOtlpGrpc ? "opentelemetry-exporter-otlp-proto-grpc" : "opentelemetry-exporter-otlp-proto-http")
        imports.push("from opentelemetry._logs import set_logger_provider")
        imports.push("from opentelemetry.sdk._logs import LoggerProvider")
        imports.push("from opentelemetry.sdk._logs.export import BatchLogRecordProcessor")
        if (ctx.hasOtlpGrpc) {
          imports.push("from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter")
        } else {
          imports.push("from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter")
        }
        parts.push(`# Logs
log_exporter = OTLPLogExporter(endpoint="http://localhost:${port}")
logger_provider = LoggerProvider()
logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
set_logger_provider(logger_provider)`)
      }
    }

    if (ctx.hasPrometheus) {
      pkgs.push("prometheus-client")
      parts.push(`# Prometheus metrics (scraped by collector)
from prometheus_client import start_http_server, Counter, Histogram
start_http_server(8000)
requests_total = Counter("requests_total", "Total requests")
request_duration = Histogram("request_duration_seconds", "Request duration")`)
    }

    const dedupImports = [...new Set(imports)]
    const install = `pip install ${[...new Set(pkgs)].join(" ")}`
    const code = dedupImports.join("\n") + "\n\n" + parts.join("\n\n")

    return { install, code }
  }

  _nodejs(ctx) {
    const parts = []
    const pkgs = ["@opentelemetry/sdk-node", "@opentelemetry/api"]
    const requires = []

    if (ctx.hasOtlpGrpc || ctx.hasOtlpHttp) {
      const port = ctx.hasOtlpGrpc ? "4317" : "4318"

      requires.push("const { NodeSDK } = require('@opentelemetry/sdk-node');")

      if (ctx.signals.includes("traces")) {
        if (ctx.hasOtlpGrpc) {
          pkgs.push("@opentelemetry/exporter-trace-otlp-grpc")
          requires.push("const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');")
        } else {
          pkgs.push("@opentelemetry/exporter-trace-otlp-http")
          requires.push("const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');")
        }
      }

      if (ctx.signals.includes("metrics")) {
        pkgs.push("@opentelemetry/sdk-metrics")
        if (ctx.hasOtlpGrpc) {
          pkgs.push("@opentelemetry/exporter-metrics-otlp-grpc")
          requires.push("const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');")
        } else {
          pkgs.push("@opentelemetry/exporter-metrics-otlp-http")
          requires.push("const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');")
        }
        requires.push("const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');")
      }

      const sdkOpts = []
      if (ctx.signals.includes("traces")) {
        sdkOpts.push(`  traceExporter: new OTLPTraceExporter({ url: 'http://localhost:${port}' })`)
      }
      if (ctx.signals.includes("metrics")) {
        sdkOpts.push(`  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: 'http://localhost:${port}' }),
  })`)
      }

      parts.push(`const sdk = new NodeSDK({
${sdkOpts.join(",\n")}
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => sdk.shutdown().then(() => process.exit(0)));`)
    }

    if (ctx.hasPrometheus) {
      pkgs.push("prom-client")
      parts.push(`// Prometheus metrics (scraped by collector)
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Expose /metrics endpoint
const http = require('http');
http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}).listen(8000);`)
    }

    const dedupRequires = [...new Set(requires)]
    const install = `npm install ${[...new Set(pkgs)].join(" ")}`
    const code = dedupRequires.join("\n") + "\n\n" + parts.join("\n\n")

    return { install, code }
  }

  _go(ctx) {
    const parts = []
    const mods = []
    const imports = []

    if (ctx.hasOtlpGrpc || ctx.hasOtlpHttp) {
      const port = ctx.hasOtlpGrpc ? "4317" : "4318"

      if (ctx.signals.includes("traces")) {
        if (ctx.hasOtlpGrpc) {
          mods.push("go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc")
          imports.push('"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"')
        } else {
          mods.push("go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp")
          imports.push('"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"')
        }
        mods.push("go.opentelemetry.io/otel", "go.opentelemetry.io/otel/sdk/trace")
        imports.push('"go.opentelemetry.io/otel"', 'sdktrace "go.opentelemetry.io/otel/sdk/trace"')

        if (ctx.hasOtlpGrpc) {
          parts.push(`  // Traces
  traceExporter, err := otlptracegrpc.New(ctx,
    otlptracegrpc.WithEndpoint("localhost:${port}"),
    otlptracegrpc.WithInsecure(),
  )
  if err != nil { log.Fatal(err) }
  tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(traceExporter))
  defer tp.Shutdown(ctx)
  otel.SetTracerProvider(tp)`)
        } else {
          parts.push(`  // Traces
  traceExporter, err := otlptracehttp.New(ctx,
    otlptracehttp.WithEndpoint("localhost:${port}"),
    otlptracehttp.WithInsecure(),
  )
  if err != nil { log.Fatal(err) }
  tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(traceExporter))
  defer tp.Shutdown(ctx)
  otel.SetTracerProvider(tp)`)
        }
      }

      if (ctx.signals.includes("metrics")) {
        if (ctx.hasOtlpGrpc) {
          mods.push("go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc")
          imports.push('"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"')
        } else {
          mods.push("go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp")
          imports.push('"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"')
        }
        mods.push("go.opentelemetry.io/otel/sdk/metric")
        imports.push('sdkmetric "go.opentelemetry.io/otel/sdk/metric"')

        const grpcOrHttp = ctx.hasOtlpGrpc ? "otlpmetricgrpc" : "otlpmetrichttp"
        parts.push(`  // Metrics
  metricExporter, err := ${grpcOrHttp}.New(ctx,
    ${grpcOrHttp}.WithEndpoint("localhost:${port}"),
    ${grpcOrHttp}.WithInsecure(),
  )
  if err != nil { log.Fatal(err) }
  mp := sdkmetric.NewMeterProvider(sdkmetric.WithReader(
    sdkmetric.NewPeriodicReader(metricExporter),
  ))
  defer mp.Shutdown(ctx)
  otel.SetMeterProvider(mp)`)
      }
    }

    const dedupImports = [...new Set(imports)]
    const dedupMods = [...new Set(mods)]

    const install = dedupMods.map(m => `go get ${m}`).join("\n")
    const code = `package main

import (
  "context"
  "log"
  ${dedupImports.join("\n  ")}
)

func initTelemetry(ctx context.Context) func() {
${parts.join("\n\n")}

  return func() {${ctx.signals.includes("traces") ? "\n    tp.Shutdown(ctx)" : ""}${ctx.signals.includes("metrics") ? "\n    mp.Shutdown(ctx)" : ""}
  }
}`

    return { install, code }
  }

  _java(ctx) {
    const parts = []
    const deps = []

    if (ctx.hasOtlpGrpc || ctx.hasOtlpHttp) {
      const port = ctx.hasOtlpGrpc ? "4317" : "4318"

      if (ctx.signals.includes("traces")) {
        if (ctx.hasOtlpGrpc) {
          deps.push("io.opentelemetry:opentelemetry-exporter-otlp:1.40.0")
          parts.push(`// Traces
OtlpGrpcSpanExporter spanExporter = OtlpGrpcSpanExporter.builder()
    .setEndpoint("http://localhost:${port}")
    .build();

SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .addSpanProcessor(BatchSpanProcessor.builder(spanExporter).build())
    .build();

OpenTelemetrySdk.builder()
    .setTracerProvider(tracerProvider)
    .buildAndRegisterGlobal();`)
        } else {
          deps.push("io.opentelemetry:opentelemetry-exporter-otlp:1.40.0")
          parts.push(`// Traces
OtlpHttpSpanExporter spanExporter = OtlpHttpSpanExporter.builder()
    .setEndpoint("http://localhost:${port}/v1/traces")
    .build();

SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .addSpanProcessor(BatchSpanProcessor.builder(spanExporter).build())
    .build();

OpenTelemetrySdk.builder()
    .setTracerProvider(tracerProvider)
    .buildAndRegisterGlobal();`)
        }
      }

      if (ctx.signals.includes("metrics")) {
        deps.push("io.opentelemetry:opentelemetry-exporter-otlp:1.40.0")
        const exporterClass = ctx.hasOtlpGrpc ? "OtlpGrpcMetricExporter" : "OtlpHttpMetricExporter"
        parts.push(`// Metrics
${exporterClass} metricExporter = ${exporterClass}.builder()
    .setEndpoint("http://localhost:${port}${ctx.hasOtlpHttp ? "/v1/metrics" : ""}")
    .build();

SdkMeterProvider meterProvider = SdkMeterProvider.builder()
    .registerMetricReader(PeriodicMetricReader.builder(metricExporter).build())
    .build();`)
      }
    }

    const dedupDeps = [...new Set(deps)]
    const install = `<!-- Maven -->
${dedupDeps.map(d => {
  const [g, a, v] = d.split(":")
  return `<dependency>
  <groupId>${g}</groupId>
  <artifactId>${a}</artifactId>
  <version>${v}</version>
</dependency>`
}).join("\n")}

// Gradle
${dedupDeps.map(d => `implementation '${d}'`).join("\n")}`

    const code = `import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.trace.*;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.exporter.otlp.trace.*;
import io.opentelemetry.sdk.metrics.*;
import io.opentelemetry.exporter.otlp.metrics.*;

public class TelemetryConfig {
    public static OpenTelemetry init() {
${parts.map(p => "        " + p.split("\n").join("\n        ")).join("\n\n")}

        return OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .build();
    }
}`

    return { install, code }
  }
}
