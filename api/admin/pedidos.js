/* Pedidos del panel: GET los lista; POST marca uno como entregado (o lo vuelve a "pagado"). */
"use strict";
const N = require("../../lib/nucleo");
const almacen = require("../../lib/almacen");

module.exports = N.envolver(["GET", "POST"], async (req, res) => {
  await N.autorizado(req);
  if (req.method === "POST") {
    const b = await N.cuerpo(req);
    if (!N.REF.test(String(b.ref || "")) || ["entregado", "pagado"].indexOf(b.estado) < 0) throw N.error("Pedido inválido.");
    const ped = await almacen.leerPedido(b.ref);
    if (!ped) throw N.error("No encontramos ese pedido.", 404);
    if (ped.estado !== "pagado" && ped.estado !== "entregado") throw N.error("Solo se pueden marcar los pedidos pagados.");
    ped.estado = b.estado; ped.entregadoEn = b.estado === "entregado" ? new Date().toISOString() : undefined;
    await almacen.guardarPedido(b.ref, ped);
    return N.responder(res, 200, { ok: true, pedido: ped });
  }
  const pedidos = await almacen.listarPedidos(120);
  pedidos.sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
  N.responder(res, 200, { ok: true, pedidos });
});
