/* Almacén Don Manolo — reglas del negocio que corren en el servidor.
   Lo importante: los precios y el stock SIEMPRE se calculan acá, nunca se confía en lo que manda el navegador.
*/
"use strict";
const crypto = require("crypto");
const almacen = require("./almacen");
const BASE = require("./base.json");

const MP = () => process.env.MP_API || "https://api.mercadopago.com";

/* ---------- utilidades ---------- */
const slug = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const num = (v, d) => { const n = Number(String(v == null ? "" : v).replace(",", ".")); return Number.isFinite(n) ? n : (d === undefined ? 0 : d); };
const txt = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
const bool = (v, d) => (v === undefined || v === null ? d : v === true || v === "true" || v === 1 || v === "SI");
const plata = (v) => Math.round(num(v, 0) * 100) / 100;
const error = (msg, status) => Object.assign(new Error(msg), { status: status || 400 });

function foto(v) {
  v = txt(v, 600);
  if (/^img\/[\w\-./]+$/.test(v) && v.indexOf("..") < 0) return v;
  if (/^https:\/\/[^\s"'<>]+$/.test(v)) return v;
  if (/^\/almacen\/[\w\-./]+$/.test(v)) return v; // solo pruebas en la compu
  return "";
}

/* ---------- validar y limpiar el catálogo que manda el panel ---------- */
function limpiarCatalogo(c) {
  if (!c || typeof c !== "object") throw error("No llegaron datos para guardar.");
  const cats = (Array.isArray(c.categorias) ? c.categorias : []).slice(0, 60).map((k, i) => ({
    id: slug(k.id || k.nombre), nombre: txt(k.nombre, 60), descripcion: txt(k.descripcion, 140), imagen: foto(k.imagen), orden: Math.round(num(k.orden, i + 1))
  })).filter((k) => k.id && k.nombre);
  if (!cats.length) throw error("Tiene que haber al menos una categoría.");
  const idsCat = {}; cats.forEach((k) => { if (idsCat[k.id]) throw error("Hay dos categorías con el mismo nombre: " + k.nombre); idsCat[k.id] = 1; });

  const vistos = {};
  const prods = (Array.isArray(c.productos) ? c.productos : []).slice(0, 1500).map((p, i) => {
    const precio = plata(p.precio);
    const ant = plata(p.precioAnterior);
    const med = p.medida || {};
    const u = String(med.unidad || "").toLowerCase();
    let id = slug(p.id || p.nombre) || "producto";
    let n = 2; const idBase = id; while (vistos[id]) id = idBase + "-" + n++;
    vistos[id] = 1;
    const o = {
      id, nombre: txt(p.nombre, 120), marca: txt(p.marca, 60), categoria: slug(p.categoria), precio,
      precioAnterior: ant > precio ? ant : null, contenido: txt(p.contenido, 40),
      medida: { valor: Math.max(0, num(med.valor, 0)), unidad: ["g", "ml", "u"].indexOf(u) > -1 ? u : "" },
      descripcion: txt(p.descripcion, 1200), imagen: foto(p.imagen),
      stock: Math.max(0, Math.min(999999, Math.floor(num(p.stock, 0)))), destacado: bool(p.destacado, false), activo: bool(p.activo, true),
      orden: Math.round(num(p.orden, i + 1))
    };
    return o;
  });
  prods.forEach((p) => {
    if (!p.nombre) throw error("Hay un producto sin nombre.");
    if (!idsCat[p.categoria]) throw error('El producto "' + p.nombre + '" tiene una categoría que no existe.');
    if (!(p.precio >= 0)) throw error('El precio de "' + p.nombre + '" no es válido.');
  });

  const envios = (Array.isArray(c.envios) ? c.envios : []).slice(0, 20).map((z) => ({
    id: slug(z.id || z.nombre), nombre: txt(z.nombre, 90), costo: Math.max(0, plata(z.costo)), envio: bool(z.envio, plata(z.costo) > 0), activo: bool(z.activo, true)
  })).filter((z) => z.id && z.nombre);
  if (!envios.some((z) => z.activo)) throw error("Tiene que haber al menos una forma de entrega activa.");
  envios.forEach((z) => { if (!z.envio) z.costo = 0; });

  const k = c.config || {};
  const config = {
    nombre: txt(k.nombre, 60) || "Almacén", lema: txt(k.lema, 120), whatsapp: String(k.whatsapp || "").replace(/[^0-9]/g, "").slice(0, 16),
    instagram: txt(k.instagram, 40).replace(/^@/, ""), email: txt(k.email, 120), direccion: txt(k.direccion, 140), horario: txt(k.horario, 140),
    envioGratisDesde: Math.max(0, plata(k.envioGratisDesde)), transferencia: txt(k.transferencia, 200), mensajeConfirmacion: txt(k.mensajeConfirmacion, 240)
  };
  Object.keys(config).forEach((x) => { if (config[x] === "" || config[x] === 0) delete config[x]; });

  return { productos: prods, categorias: cats, envios, config, actualizado: new Date().toISOString() };
}

/* Si el panel no tocó el stock de un producto, se queda con el stock actual del servidor
   (que ya descontó las ventas que hubo mientras se editaba). */
function fusionarStock(nuevo, actual, stockBase) {
  if (!stockBase || !actual) return nuevo;
  const hoy = {}; actual.productos.forEach((p) => { hoy[p.id] = p.stock; });
  nuevo.productos.forEach((p) => { if (p.id in stockBase && Number(stockBase[p.id]) === p.stock && p.id in hoy) p.stock = hoy[p.id]; });
  return nuevo;
}

/* ---------- leer el catálogo (de Blob, o el que viene con la tienda) ---------- */
async function cargarCatalogo() {
  const c = await almacen.leerCatalogo();
  if (c && Array.isArray(c.productos) && c.productos.length) return { catalogo: c, origen: "nube" };
  return { catalogo: JSON.parse(JSON.stringify(BASE)), origen: "base" };
}

/* ---------- clave del panel ---------- */
const hash = (s) => crypto.createHash("sha256").update(String(s)).digest();
async function autorizado(req) {
  const clave = process.env.ADMIN_PASSWORD;
  if (!clave) throw error("Falta crear la variable ADMIN_PASSWORD en Vercel (Settings > Environment Variables) y volver a publicar.", 503);
  const dada = req.headers["x-clave"] || "";
  const ok = crypto.timingSafeEqual(hash(clave), hash(dada));
  if (!ok) { await new Promise((r) => setTimeout(r, 700)); throw error("La clave no es correcta.", 401); }
}

/* ---------- http ---------- */
function responder(res, status, obj, headers) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  Object.keys(headers || {}).forEach((h) => res.setHeader(h, headers[h]));
  res.end(JSON.stringify(obj));
}
async function cuerpo(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  let raw = req.body;
  if (raw == null) {
    raw = await new Promise((ok, mal) => { const a = []; req.on("data", (d) => a.push(d)); req.on("end", () => ok(Buffer.concat(a))); req.on("error", mal); });
  }
  const s = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw || "");
  if (!s) return {};
  try { return JSON.parse(s); } catch (e) { throw error("Los datos no se entendieron."); }
}
function envolver(metodos, fn) {
  return async (req, res) => {
    try {
      if (metodos.indexOf(req.method) < 0) { res.setHeader("Allow", metodos.join(", ")); return responder(res, 405, { error: "Método no permitido." }); }
      await fn(req, res);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500 && !e.status) console.error(e);
      responder(res, status, { error: status >= 500 && !e.status ? "Algo salió mal del lado del servidor." : e.message });
    }
  };
}
function consulta(req) { return new URL(req.url || "/", "http://x").searchParams; }
function origen(req) {
  const h = req.headers;
  const host = String(h["x-forwarded-host"] || h.host || "").split(",")[0].trim();
  const proto = String(h["x-forwarded-proto"] || (/^(localhost|127\.)/.test(host) ? "http" : "https")).split(",")[0].trim();
  return proto + "://" + host;
}

/* ---------- pedido: precios y stock del servidor ---------- */
function armarPedido(cat, body) {
  const porId = {}; cat.productos.filter((p) => p.activo).forEach((p) => { porId[p.id] = p; });
  const items = []; const lineas = []; let subtotal = 0;
  const entrada = Array.isArray(body.items) ? body.items.slice(0, 80) : [];
  for (const it of entrada) {
    const p = porId[String(it.id)]; const qty = Math.floor(Number(it.qty));
    if (!p || !(qty > 0)) throw error("Hay un producto que ya no está disponible. Revisá tu pedido.");
    if (qty > p.stock) throw error('De "' + p.nombre + '" quedan ' + p.stock + " unidades.");
    subtotal += p.precio * qty;
    lineas.push({ id: p.id, nombre: p.nombre, contenido: p.contenido, qty, precio: p.precio });
    items.push({ id: p.id, title: (p.nombre + (p.contenido ? " (" + p.contenido + ")" : "")).slice(0, 250), quantity: qty, unit_price: Number(p.precio), currency_id: "UYU" });
  }
  if (!items.length) throw error("Tu pedido está vacío.");
  const zona = (cat.envios || []).find((z) => z.id === body.zona && z.activo !== false);
  if (!zona) throw error("Elegí una forma de entrega.");
  const gratis = (cat.config && cat.config.envioGratisDesde) || 0;
  const envio = zona.envio && !(gratis && subtotal >= gratis) ? zona.costo : 0;
  if (envio > 0) items.push({ id: "envio", title: ("Envío: " + zona.nombre).slice(0, 250), quantity: 1, unit_price: Number(envio), currency_id: "UYU" });
  return { items, lineas, zona, envio, subtotal, total: subtotal + envio };
}

function nuevaRef() { return "DM-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
const REF = /^DM-[A-Z0-9-]{4,30}$/;

/* ---------- Mercado Pago ---------- */
async function mp(ruta, opciones) {
  return fetch(MP() + ruta, Object.assign({}, opciones, { headers: Object.assign({ Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN }, (opciones && opciones.headers) || {}) }));
}

/* Un pago aprobado: marca el pedido como pagado y descuenta el stock una sola vez. */
async function aprobar(ref, pagoId) {
  const ped = await almacen.leerPedido(ref);
  if (!ped) return { ok: false, motivo: "sin_pedido" };
  const primera = await almacen.reclamarVenta(ref);
  if (primera) {
    const { catalogo } = await cargarCatalogo();
    (ped.items || []).forEach((it) => { const p = catalogo.productos.find((x) => x.id === it.id); if (p) p.stock = Math.max(0, p.stock - it.qty); });
    catalogo.actualizado = new Date().toISOString();
    await almacen.guardarCatalogo(catalogo);
  }
  if (ped.estado !== "pagado" && ped.estado !== "entregado") {
    ped.estado = "pagado"; ped.pagoId = String(pagoId || ""); ped.pagadoEn = new Date().toISOString();
    await almacen.guardarPedido(ref, ped);
  }
  return { ok: true, primera };
}
async function rechazar(ref) {
  const ped = await almacen.leerPedido(ref);
  if (ped && ped.estado === "pendiente") { ped.estado = "rechazado"; await almacen.guardarPedido(ref, ped); }
}

module.exports = { slug, num, limpiarCatalogo, fusionarStock, cargarCatalogo, autorizado, responder, cuerpo, envolver, consulta, origen, armarPedido, nuevaRef, REF, mp, aprobar, rechazar, error, BASE };
