// Uncomment this file to enable instrumentation and observability using OpenTelemetry
// Refer to the docs for installation instructions: https://docs.shopenup.com/v2/debugging-and-testing/instrumentation

// const { registerOtel } = require("@shopenup/shopenup")
// // If using an exporter other than Zipkin, require it here.
// const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin')

// // If using an exporter other than Zipkin, initialize it here.
// const exporter = new ZipkinExporter({
//   serviceName: 'my-shopenup-project',
// })

// export function register() {
//   registerOtel({
//     serviceName: 'shopenup',
//     // pass exporter
//     exporter,
//     instrument: {
//       http: true,
//       workflows: true,
//       remoteQuery: true
//     },
//   })
// }