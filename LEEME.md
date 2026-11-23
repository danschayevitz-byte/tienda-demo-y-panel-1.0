# Almacén Don Manolo — tienda + panel (Vercel)

Esta carpeta tiene todo junto:

- **La tienda** en la dirección principal (`tu-sitio.vercel.app`).
- **El panel** para cambiar precios, productos, fotos, stock, categorías, envíos y ver los pedidos, en `tu-sitio.vercel.app/admin`.
- **Mercado Pago** ya integrado: el cliente paga, el pedido queda anotado y el stock baja solo.

No hay que tocar código. Son 6 pasos y se hacen una sola vez.

---

## Publicarlo (una sola vez)

**1. Subir la carpeta a GitHub.** Creá un repositorio nuevo en github.com y subí el contenido de esta carpeta (los archivos, no el .zip).

**2. Crear el proyecto en Vercel.** En vercel.com → *Add New → Project* → elegí ese repositorio → *Deploy*. No cambies ninguna opción.

**3. Conectar el almacenamiento (Blob).** Es el "disco" donde se guardan tus cambios y las fotos.
En tu proyecto: *Storage → Create → Blob* → elegí **Public** (importante: tiene que ser Public) → *Connect to Project*.

**4. Poner las dos claves.** En el proyecto: *Settings → Environment Variables*. Agregá estas dos (tildá Production, Preview y Development):

| Nombre | Qué poner |
|---|---|
| `ADMIN_PASSWORD` | La clave para entrar al panel. Que sea larga y que solo la sepa el dueño. |
| `MP_ACCESS_TOKEN` | El *Access Token* de la cuenta de Mercado Pago del almacén (Mercado Pago → Tus integraciones → tu aplicación → Credenciales de producción). |

**5. Volver a publicar.** *Deployments →* los tres puntitos del último → *Redeploy*. (Hace falta para que tome el Blob y las claves.)

**6. Probar.** Entrá a `tu-sitio.vercel.app/admin`, escribí la clave, cambiale el precio a un producto y tocá **Guardar cambios**. Abrí la tienda en otra pestaña: en menos de un minuto tiene el precio nuevo.

Si algo falta, el panel te lo dice en la pantalla de *Resumen* (por ejemplo "Falta conectar el almacenamiento").

---

## Cómo se usa el panel

- **Resumen:** cuántos productos hay, cuáles se quedaron sin stock o con poco, y los pedidos para entregar.
- **Productos:** el precio y el stock se cambian directo en la lista. Tocá un producto para editar nombre, descripción, foto, oferta ("precio anterior") y si se muestra o no. Con **Nuevo producto** agregás uno, y con **Ajustar precios** subís o bajás un porcentaje a todo o a una categoría.
- **Pedidos:** cada compra pagada aparece con nombre, teléfono, dirección y productos. Un botón te abre WhatsApp con el mensaje armado y otro lo marca como entregado.
- **Categorías, Envíos y Mi almacén:** los grupos de la tienda, las zonas con su costo (y desde qué monto el envío es gratis), y los datos del negocio (WhatsApp, dirección, horarios).
- **Guardar cambios:** nada se publica hasta que lo tocás. Si te arrepentís, **Descartar** vuelve todo a como estaba.
- **Copia de seguridad:** en *Mi almacén* podés descargar todo el catálogo en un archivo.

### Stock
- Baja **solo** cuando un pago de Mercado Pago se aprueba (una sola vez por pedido).
- Si vos cambiás el stock a mano, manda lo que escribiste. Si no lo tocás, el panel respeta las ventas que hubo mientras editabas.
- Los pedidos que el cliente manda **por WhatsApp** no descuentan stock solos: ajustalo a mano.

### Fotos
Se suben desde el panel (se achican solas). Funcionan mejor con fondo blanco y el producto centrado.

---

## Probar Mercado Pago sin plata real

Mercado Pago permite crear usuarios y tarjetas de prueba (buscá "credenciales de prueba" y "tarjetas de prueba" en su sitio de desarrolladores). Poné el Access Token de prueba en `MP_ACCESS_TOKEN`, hacé una compra de prueba y mirá que el pedido aparezca en *Pedidos* y el stock baje. Después cambiá al Access Token de producción y volvé a publicar.

Los avisos de pago (webhook) no necesitan configuración: la tienda le dice a Mercado Pago a dónde avisar cada vez que crea un pago.

---

## Cosas para saber

- La clave del panel viaja protegida (https) y el panel no aparece en Google. Aun así, usá una clave larga y no la compartas.
- Los pedidos (con los datos de entrega) se guardan en tu Blob con nombres imposibles de adivinar. Si algún día querés más privacidad, se puede pasar a un almacenamiento privado.
- Los cambios del panel tardan hasta un minuto en verse en la tienda (la tienda guarda una copia por unos segundos para ir rápido).
- Para usar tu propio dominio: *Settings → Domains*.
- Lo que había en la planilla de Excel ahora se edita desde el panel. El catálogo inicial viene dentro de la tienda y se reemplaza la primera vez que guardás.

## Qué hay en cada carpeta (por si algún día hace falta)

- `public/` — la tienda (`index.html`) y el panel (`admin/`) y las fotos iniciales (`img/`).
- `api/` — las funciones del servidor: catálogo, pago, estado del pago, avisos de Mercado Pago y las del panel.
- `lib/` — las reglas del negocio y el catálogo inicial (`base.json`).
- `vercel.json` y `package.json` — configuración de Vercel.
