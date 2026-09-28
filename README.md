# Microservicio de productos (NestJS + gRPC)

Microservicio gRPC hecho con NestJS que expone un catálogo de productos con tres
métodos: `ObtenerProducto` (unary, devuelve `5 NOT_FOUND` si el id no existe),
`ListarProductos` y `BuscarPorPrecioMaximo` (ambos con server streaming). Está
desplegado en una VM de Azure y tiene server reflection activado.

| | Dirección |
|---|---|
| **Demo web** (navegador) | <http://productos-grpc-ajrm18.northcentralus.cloudapp.azure.com> |
| **Servicio gRPC** (sin TLS) | `productos-grpc-ajrm18.northcentralus.cloudapp.azure.com:5000` |

La demo web es un cliente: llama al servicio gRPC por dentro y muestra los
streams en tiempo real.

## Probar desde Postman (sin el `.proto`)

1. **New → gRPC**.
2. Pega la dirección `productos-grpc-ajrm18.northcentralus.cloudapp.azure.com:5000`
   y deja TLS desactivado (candado abierto).
3. En **Service definition** elige **Using server reflection**.
4. Elige un método, por ejemplo `productos.ProductoService/ObtenerProducto`, y
   escribe el mensaje:
   - `ObtenerProducto`: `{ "id": 1 }` (o `{ "id": 999 }` para ver el error `5 NOT_FOUND`)
   - `ListarProductos`: `{}`
   - `BuscarPorPrecioMaximo`: `{ "precioMaximo": 50 }`
5. Pulsa **Invoke**. En los métodos con streaming, los productos llegan uno a uno.

## Probar con `cliente.js`

```bash
git clone https://github.com/ajrm18/nestjs-productos-grpc
cd nestjs-productos-grpc
npm install
node cliente.js productos-grpc-ajrm18.northcentralus.cloudapp.azure.com:5000
```

Sin argumento, el cliente se conecta a `localhost:5000`.

## Ejecutar en local

```bash
npm install
npm run build && npm run start:prod            # solo el servicio gRPC en :5000
docker compose up -d --build                  # servicio gRPC (:5000) + demo web (:80)
```

Los detalles de la práctica y del despliegue están en [BITACORA.md](BITACORA.md).
