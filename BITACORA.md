# Bitácora de práctica: Tu primer microservicio gRPC con streaming

## 1. Datos generales

| Campo   | Detalle                                                              |
|---------|----------------------------------------------------------------------|
| Materia | Integración de Sistemas                                              |
| Práctica| Tu primer microservicio gRPC con streaming                           |
| Autor   | Anthony Rosero                                                       |
| Fecha   | 23 de septiembre de 2026                                             |
| Stack   | Node.js, NestJS 12, gRPC, `@grpc/grpc-js`, `@grpc/proto-loader`      |

## 2. Desarrollo por pasos

### Paso 0-1: Entorno y creación del proyecto

Se verificó la instalación de Node.js y del CLI de NestJS y se creó el proyecto
`nestjs-productos-grpc` con el formato de módulos **CommonJS (CJS)**. Se eligió CJS
porque `main.ts` usa `__dirname` para construir la ruta del archivo `.proto`
(variable que no existe en ES Modules) y porque `cliente.js` carga sus
dependencias con `require`.

### Paso 2: Dependencias

- `@nestjs/microservices`: permite crear aplicaciones Nest que se comunican por
  transportes distintos a HTTP, entre ellos gRPC (`Transport.GRPC`), y aporta
  los decoradores `@GrpcMethod` y la clase `RpcException`.
- `@grpc/grpc-js`: implementación de gRPC en JavaScript puro. La usa Nest
  internamente como servidor y el cliente para conectarse; también expone los
  códigos de estado (`status.NOT_FOUND`).
- `@grpc/proto-loader`: lee el archivo `.proto` en tiempo de ejecución y lo
  convierte en una definición que `grpc-js` puede usar.

### Paso 3: Contrato `productos.proto`

El contrato define el paquete `productos` con:

- **Mensajes (`message`)**: `ProductoRequest` (id), `ProductoResponse` (id,
  nombre, precio) y `FiltroPrecioRequest` (precioMaximo). Cada campo lleva un
  número de etiqueta que identifica el campo en la serialización binaria.
- **Servicio (`service`)** `ProductoService` con tres RPC:
  - `ObtenerProducto`: **unary**, una petición y una respuesta.
  - `ListarProductos`: **server streaming** (`returns (stream ProductoResponse)`),
    el servidor envía varios mensajes sobre la misma llamada.
  - `BuscarPorPrecioMaximo`: también server streaming (reto del paso 8).
- **`google.protobuf.Empty`**: se importa desde `google/protobuf/empty.proto` y
  se usa como parámetro de `ListarProductos`, ya que esa operación no necesita
  datos de entrada.

### Paso 4: `main.ts` y `nest-cli.json`

En `main.ts` se reemplazó el servidor HTTP por
`NestFactory.createMicroservice` con `Transport.GRPC`, indicando el paquete
`productos`, la ruta del `.proto` (`join(__dirname, 'productos.proto')`) y la
dirección `0.0.0.0:5000`.

Como TypeScript solo compila archivos `.ts`, se agregó en `nest-cli.json`
`"assets": ["**/*.proto"]` para copiar el contrato a `dist` y
`"watchAssets": true` para que se vuelva a copiar cuando cambia en modo
`--watch`. Sin esto, el servidor compilado no encuentra el `.proto` al arrancar.

### Paso 5: Controlador (`app.controller.ts`)

- Cada método se enlaza a un RPC con `@GrpcMethod('ProductoService', '<Rpc>')`.
- Las interfaces `ProductoRequest`, `ProductoResponse` y `FiltroPrecioRequest`
  se escribieron a mano porque `proto-loader` no genera tipos.
- `ObtenerProducto` busca el producto en un arreglo en memoria; si no existe,
  lanza `RpcException({ code: status.NOT_FOUND, message: ... })`, que Nest
  traduce a un error gRPC con código 5.
- `ListarProductos` devuelve un `Observable`: con un `setInterval` de 300 ms se
  emite cada producto mediante `subscriber.next(...)` y, al terminar, se llama a
  `subscriber.complete()`, lo que cierra el stream en el cliente.

### Paso 6: Cliente (`cliente.js`)

Es un script de Node independiente de Nest que usa directamente
`@grpc/proto-loader` y `@grpc/grpc-js` para cargar el mismo `.proto` y crear un
`ProductoService` apuntando a `localhost:5000`.

- **Unary**: `client.obtenerProducto({ id }, callback)`; el callback recibe
  `(err, producto)`.
- **Server streaming**: `client.listarProductos({})` devuelve un stream con los
  eventos `data` (cada producto recibido), `end` (fin del stream) y `error`.

### Paso 7: Prueba de error

Se llamó a `obtenerProducto({ id: 999 })` y se obtuvo:

```
Error gRPC: 5 - Producto 999 no existe
```

El código `5` corresponde a `NOT_FOUND`. En la salida, este mensaje aparece antes
que el resultado del producto 1 aunque en el código se escribió después. Esto
ocurre porque las llamadas gRPC en Node son asíncronas: el script lanza ambas
peticiones sin esperar respuesta y los `console.log` se ejecutan en el orden en
que llegan las respuestas, no en el orden en que se escribieron las llamadas.

### Paso 8: Reto `BuscarPorPrecioMaximo`

Se agregó al `.proto` el mensaje `FiltroPrecioRequest` y el RPC
`BuscarPorPrecioMaximo` con respuesta en stream. En el controlador se filtran
los productos con `precio <= precioMaximo` y se emiten con el mismo patrón de
`Observable`; si no hay coincidencias, se completa el stream sin emitir datos.

La llamada `buscarPorPrecioMaximo({ precioMaximo: 50 })` devolvió solo
**Teclado mecánico ($45.9)** y **Mouse inalámbrico ($19.5)**.

Fue necesario reiniciar el servidor después de modificar el `.proto`, porque
`proto-loader` lee el contrato una sola vez al arrancar; los cambios no se
reflejan en un proceso que ya está en ejecución.

## 3. Salida real de `node cliente.js`

```
== ObtenerProducto (unary) ==
== Prueba de error (id inexistente) ==
Error gRPC: 5 - Producto 999 no existe
1 - Teclado mecánico - $45.9
== ListarProductos (server streaming) ==
1 - Teclado mecánico - $45.9  (llegó en streaming)
2 - Mouse inalámbrico - $19.5  (llegó en streaming)
3 - Monitor 24" - $129.99  (llegó en streaming)
Streaming finalizado.
== BuscarPorPrecioMaximo(50) (server streaming) ==
1 - Teclado mecánico - $45.9  (llegó en streaming)
2 - Mouse inalámbrico - $19.5  (llegó en streaming)
Búsqueda finalizada.
```

## 4. Reto: ¿por qué `BuscarPorPrecioMaximo` es server streaming y no unary?

[ESCRIBE AQUÍ TU RESPUESTA]

## 5. `@grpc/proto-loader` frente a `Grpc.Tools` en C#

| Aspecto            | `@grpc/proto-loader` (Node.js)                                  | `Grpc.Tools` (C#)                                           |
|--------------------|-----------------------------------------------------------------|-------------------------------------------------------------|
| Momento de carga   | Dinámica, en tiempo de ejecución, al iniciar el proceso         | Estática, genera clases al compilar                         |
| Tipos              | No genera tipos; las interfaces se escriben a mano              | Genera clases de mensajes y servicios con tipado fuerte     |
| Detección de errores | Los desajustes con el contrato aparecen al ejecutar           | Los errores se detectan en el build                         |
| Cambios al `.proto`| Basta con reiniciar el proceso                                  | Requiere recompilar el proyecto                             |

## 6. Comparación: gRPC (NestJS) frente a REST (semana 2)

REST fue más rápido de escribir y de probar: Swagger permite ejecutar los
endpoints desde el navegador y las respuestas en JSON se leen directamente.
gRPC exige definir primero el contrato `.proto` y escribir un cliente propio
para probarlo. Además, es más difícil de depurar, porque los mensajes viajan en
formato binario y los errores llegan como códigos numéricos (por ejemplo, `5`
para `NOT_FOUND`).

## 7. Declaración de uso de IA

| Campo                                 | Detalle                                                                                                   |
|---------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Herramienta(s)                        | Claude (Anthropic) y Claude Code                                                                          |
| Nivel de uso                          | 2-3 (borrador / revisor)                                                                                  |
| Qué se le pidió                       | Guía paso a paso de la práctica y redacción de esta bitácora                                              |
| Qué se modificó/verificó manualmente  | Ejecuté cada paso, verifiqué el streaming uno por uno, el error `NOT_FOUND` y el filtro de precios.       |

## 8. Despliegue en Azure

- **Demo web:** <http://productos-grpc-ajrm18.northcentralus.cloudapp.azure.com>
- **Endpoint gRPC:** `productos-grpc-ajrm18.northcentralus.cloudapp.azure.com:5000`
  (sin TLS). Prueba: `node cliente.js productos-grpc-ajrm18.northcentralus.cloudapp.azure.com:5000`
- **Infraestructura:** VM Ubuntu 24.04 `vm-integracion` (Standard_B2ats_v2, grupo
  `rg-vm-integracion`, región northcentralus) con Docker. El repo está clonado en
  `/opt/nestjs-productos-grpc` y `docker compose` levanta dos contenedores con
  `restart: always`: `productos-grpc` (puerto 5000) y `demo-web` (puerto 80). En el
  NSG solo están abiertos el 5000, el 80 y el 22 que Azure deja por defecto.

**¿Por qué una VM?** gRPC necesita HTTP/2 de punta a punta. La suscripción Azure
for Students fuerza Azure Container Apps en modo Express, que no soporta HTTP/2,
y ACR Tasks (builds en la nube) no está permitido en esta suscripción. Una VM con
Docker expone el puerto gRPC directamente y además se puede reutilizar para los
demás microservicios del semestre.

**Actualizar la VM** después de hacer push a `main`:

```bash
az vm run-command invoke -g rg-vm-integracion -n vm-integracion \
  --command-id RunShellScript --scripts "\
cd /opt/nestjs-productos-grpc && git pull --ff-only && \
docker compose up -d --build && docker image prune -f && docker compose ps"
```

### 8.1 Server reflection y página de demostración

- **Server reflection:** con `@grpc/reflection` y la opción `onLoadPackageDefinition`
  de Nest (`new ReflectionService(pkg).addToServer(server)` en `src/main.ts`), el
  servidor publica su propio contrato. Así Postman o `grpcurl` pueden listar
  `productos.ProductoService` y llamar a sus métodos sin tener el `.proto`.
- **Página de demostración (`demo-web/`):** es un servidor Express que actúa como
  cliente gRPC (`@grpc/grpc-js` + `@grpc/proto-loader` con el mismo
  `src/productos.proto`) y lee la dirección del servicio de `GRPC_TARGET`. Los
  navegadores no pueden hablar gRPC nativo, así que la página llama a endpoints
  HTTP. Los streams se reenvían con Server-Sent Events, un evento por producto,
  y así se ve que llegan uno a uno. La prueba con id 999 muestra el código gRPC
  `5 NOT_FOUND`. Dentro de la red de compose, la demo llega al servicio como
  `productos-grpc:5000`.
