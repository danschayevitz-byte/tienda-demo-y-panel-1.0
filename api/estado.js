/* GET /api/estado?ref=DM-… — dice si el pedido está pagado, consultando a Mercado Pago (no se confía en la URL de vuelta).
   Si está aprobado, además se asegura de que el pedido figure pagado y el stock esté descontado. */
"use strict";
const N = require("../lib/nucleo");

module.exports = N.envolver(["GET"], async (req, res) => {
  const ref = N.consulta(req).get("ref") || "";
  if (!N.REF.test(ref) || !process.env.MP_ACCESS_TOKEN) return N.responder(res, 200, { estado: "desconocido" });
  const r = await N.mp("/v1/payments/search?sort=date_created&criteria=desc&external_reference=" + encodeURIComponent(ref));
  if (!r.ok) return N.responder(res, 200, { estado: "desconocido" });
  const pagos = (await r.json()).results || [];
  if (!pagos.length) return N.responder(res, 200, { estado: "sin_pago" });
  const bueno = pagos.find((p) => p.status === "approved");
  if (bueno) { try { await N.aprobar(ref, bueno.id); } catch (e) { console.error("aprobar", e); } return N.responder(res, 200, { estado: "aprobado" }); }
  if (pagos.some((p) => p.status === "pending" || p.status === "in_process" || p.status === "authorized")) return N.responder(res, 200, { estado: "pendiente" });
  N.responder(res, 200, { estado: "rechazado" });
});
