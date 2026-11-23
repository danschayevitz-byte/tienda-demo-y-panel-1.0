/* GET /api/catalogo — lo que ve la tienda: productos, precios, stock, categorías y datos del negocio. */
"use strict";
const N = require("../lib/nucleo");

module.exports = N.envolver(["GET"], async (req, res) => {
  const { catalogo, origen } = await N.cargarCatalogo();
  const fresco = N.consulta(req).get("fresh") === "1";
  N.responder(res, 200, Object.assign({}, catalogo, { origen }), { "Cache-Control": fresco ? "no-store" : "public, s-maxage=10, stale-while-revalidate=50" });
});
