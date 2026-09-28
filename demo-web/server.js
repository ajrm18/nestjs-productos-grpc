// Cliente web de demostración: traduce HTTP/SSE del navegador a llamadas gRPC.
const path = require('path');
const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const GRPC_TARGET = process.env.GRPC_TARGET || 'localhost:5000';
const PORT = Number(process.env.PORT) || 3000;
const PROTO_PATH = process.env.PROTO_PATH || path.join(__dirname, '..', 'src', 'productos.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true });
const proto = grpc.loadPackageDefinition(packageDef).productos;
const credenciales = GRPC_TARGET.endsWith(':443')
  ? grpc.credentials.createSsl()
  : grpc.credentials.createInsecure();
const client = new proto.ProductoService(GRPC_TARGET, credenciales);

// Nombre legible del código gRPC (5 -> NOT_FOUND)
const nombreCodigo = (code) => Object.keys(grpc.status).find((k) => grpc.status[k] === code) || 'UNKNOWN';
const errorGrpc = (err) => ({ code: err.code, codeName: nombreCodigo(err.code), details: err.details });
const deadline = () => Date.now() + 10_000;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Unary: ObtenerProducto
app.get('/api/productos/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id debe ser un número entero' });
  client.obtenerProducto({ id }, { deadline: deadline() }, (err, producto) => {
    if (err) return res.status(err.code === grpc.status.NOT_FOUND ? 404 : 502).json({ error: errorGrpc(err) });
    res.json({ producto });
  });
});

// Reenvía un stream gRPC al navegador como Server-Sent Events, un evento por producto
function streamSSE(req, res, llamada) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  const enviar = (evento, datos) => res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);

  const call = llamada();
  call.on('data', (p) => enviar('producto', p));
  call.on('end', () => { enviar('fin', {}); res.end(); });
  call.on('error', (err) => {
    if (err.code !== grpc.status.CANCELLED) enviar('grpc-error', errorGrpc(err));
    res.end();
  });
  req.on('close', () => call.cancel());
}

// Server streaming: ListarProductos
app.get('/api/stream/productos', (req, res) => {
  streamSSE(req, res, () => client.listarProductos({}, { deadline: deadline() }));
});

// Server streaming: BuscarPorPrecioMaximo
app.get('/api/stream/precio-maximo', (req, res) => {
  const precioMaximo = Number.parseFloat(req.query.max);
  if (!Number.isFinite(precioMaximo)) return res.status(400).json({ error: 'max debe ser un número' });
  streamSSE(req, res, () => client.buscarPorPrecioMaximo({ precioMaximo }, { deadline: deadline() }));
});

app.listen(PORT, () => console.log(`Demo web en http://0.0.0.0:${PORT} -> gRPC ${GRPC_TARGET}`));
