const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, 'src', 'productos.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true });
const proto = grpc.loadPackageDefinition(packageDef).productos;

const client = new proto.ProductoService('localhost:5000', grpc.credentials.createInsecure());

console.log('== ObtenerProducto (unary) ==');
client.obtenerProducto({ id: 1 }, (err, producto) => {
  if (err) {
    console.error('Error gRPC:', err.code, err.details);
    return;
  }
  console.log(`${producto.id} - ${producto.nombre} - $${producto.precio}`);

  console.log('\n== ListarProductos (server streaming) ==');
  const call = client.listarProductos({});
  call.on('data', (p) => {
    console.log(`${p.id} - ${p.nombre} - $${p.precio}  (llegó en streaming)`);
  });
    call.on('end', () => {
    console.log('Streaming finalizado.');

    console.log('\n== BuscarPorPrecioMaximo(50) (server streaming) ==');
    const busqueda = client.buscarPorPrecioMaximo({ precioMaximo: 50 });
    busqueda.on('data', (p) => {
      console.log(`${p.id} - ${p.nombre} - $${p.precio}  (llegó en streaming)`);
    });
    busqueda.on('end', () => console.log('Búsqueda finalizada.'));
    busqueda.on('error', (err) => console.error('Error en la búsqueda:', err.code, err.details));
  });
  call.on('error', (err) => console.error('Error en el stream:', err.code, err.details));
});

console.log('\n== Prueba de error (id inexistente) ==');
client.obtenerProducto({ id: 999 }, (err, producto) => {
  if (err) {
    console.log(`Error gRPC: ${err.code} - ${err.details}`);
  } else {
    console.log('No debería llegar aquí:', producto);
  }
});