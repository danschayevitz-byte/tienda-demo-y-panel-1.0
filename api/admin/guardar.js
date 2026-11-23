/* Botón "Guardar cambios" del panel: valida y guarda el catálogo. La tienda lo lee enseguida. */
"use strict";
const N = require("../../lib/nucleo");
const almacen = require("../../lib/almacen");

module.exports = N.envolver(["POST"], async (req, res) => {
  await N.autorizado(req);
  if (!almacen.configurado()) throw N.error("Falta conectar el almacenamiento (Blob) en Vercel: Storage > Create > Blob (Public) > Connect, y después Redeploy.", 503);
  const body = await N.cuerpo(req);
  const limpio = N.limpiarCatalogo(body.catalogo);
  const { catalogo: actual } = await N.cargarCatalogo();
  N.fusionarStock(limpio, actual, body.stockBase);
  await almacen.guardarCatalogo(limpio);
  N.responder(res, 200, { ok: true, catalogo: limpio });
});
