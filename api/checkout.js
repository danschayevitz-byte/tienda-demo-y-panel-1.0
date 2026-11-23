/* POST /api/checkout — crea el pago en Mercado Pago (Checkout Pro).
   Variables en Vercel: MP_ACCESS_TOKEN (Access Token de la cuenta de Mercado Pago del negocio). */
"use strict";
const N = require("../lib/nucleo");
const almacen = require("../lib/almacen");

module.exports = N.envolver(["POST"], async (req, res) => {
  if (!process.env.MP_ACCESS_TOKEN) throw N.error("El pago con Mercado Pago todavía no está configurado.", 503);
  const body = await N.cuerpo(req);
  const { catalogo } = await N.cargarCatalogo();
  const P = N.armarPedido(catalogo, body);

  const c = body.cliente || {};
  const nombre = String(c.nombre || "").trim().slice(0, 80);
  const email = String(c.email || "").trim().slice(0, 120);
  const telefono = String(c.telefono || "").replace(/[^0-9+]/g, "").slice(0, 20);
  const direccion = String(c.direccion || "").trim().slice(0, 200);
  const nota = String(c.nota || "").trim().slice(0, 200);
  if (nombre.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) throw N.error("Revisá tu nombre y tu email.");
  if (P.zona.envio && direccion.length < 4) throw N.error("Escribí la dirección para el envío.");

  const ref = N.nuevaRef();
  const origen = N.origen(req);
  const seguro = origen.indexOf("https://") === 0;

  /* se anota el pedido ANTES de pagar: así el webhook sabe qué descontar y vos ves los datos de entrega en el panel */
  if (almacen.configurado()) {
    await almacen.guardarPedido(ref, {
      ref, creado: new Date().toISOString(), estado: "pendiente", cliente: { nombre, email, telefono, direccion, nota },
      zona: { id: P.zona.id, nombre: P.zona.nombre, envio: !!P.zona.envio }, items: P.lineas, subtotal: P.subtotal, envio: P.envio, total: P.total
    });
  }

  const nom = String((catalogo.config && catalogo.config.nombre) || "TIENDA").normalize("NFD").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().slice(0, 16) || "TIENDA";
  const pref = {
    items: P.items,
    payer: { name: nombre, email, phone: { number: telefono } },
    back_urls: { success: origen + "/?pago=ok&ref=" + ref, pending: origen + "/?pago=pendiente&ref=" + ref, failure: origen + "/?pago=fallo&ref=" + ref },
    external_reference: ref,
    statement_descriptor: nom,
    metadata: { zona: P.zona.id, direccion, nota, telefono, nombre }
  };
  if (seguro) { pref.auto_return = "approved"; pref.notification_url = origen + "/api/webhook"; }

  const r = await N.mp("/checkout/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pref) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.init_point) {
    console.error("Mercado Pago rechazó la preferencia", r.status, JSON.stringify(data).slice(0, 400));
    throw N.error("No pudimos iniciar el pago. Probá de nuevo en unos minutos.", 502);
  }
  N.responder(res, 200, { init_point: data.init_point, ref, total: P.total });
});
