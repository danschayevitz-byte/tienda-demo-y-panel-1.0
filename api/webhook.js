/* /api/webhook — Mercado Pago avisa acá cuando un pago cambia de estado.
   No se confía en lo que dice el aviso: se le pregunta a Mercado Pago por ese pago con tu Access Token. */
"use strict";
const N = require("../lib/nucleo");

module.exports = N.envolver(["GET", "POST"], async (req, res) => {
  const q = N.consulta(req);
  let body = {}; try { if (req.method === "POST") body = await N.cuerpo(req); } catch (e) { body = {}; }
  const tipo = q.get("type") || q.get("topic") || body.type || body.topic || "";
  const id = q.get("data.id") || q.get("id") || (body.data && body.data.id) || "";
  if (!process.env.MP_ACCESS_TOKEN || !/payment/.test(tipo) || !/^\d{3,20}$/.test(String(id))) return N.responder(res, 200, { ok: true, ignorado: true });

  const r = await N.mp("/v1/payments/" + encodeURIComponent(id));
  if (!r.ok) return N.responder(res, 200, { ok: true, ignorado: true });
  const pago = await r.json();
  const ref = String(pago.external_reference || "");
  if (!N.REF.test(ref)) return N.responder(res, 200, { ok: true, ignorado: true });

  if (pago.status === "approved") await N.aprobar(ref, pago.id);
  else if (pago.status === "rejected" || pago.status === "cancelled") await N.rechazar(ref);
  N.responder(res, 200, { ok: true });
});
