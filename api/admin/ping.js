/* Entrar al panel: comprueba la clave y dice si todo está conectado. */
"use strict";
const N = require("../../lib/nucleo");
const almacen = require("../../lib/almacen");

module.exports = N.envolver(["GET", "POST"], async (req, res) => {
  await N.autorizado(req);
  N.responder(res, 200, { ok: true, almacen: almacen.configurado(), mercadopago: !!process.env.MP_ACCESS_TOKEN });
});
