/* Almacén Don Manolo — dónde se guardan los datos que cambia el panel.
   En Vercel usa "Blob" (el disco de Vercel). Para probar en la compu usa una carpeta (ALMACEN_DIR).
   Qué se guarda:
     catalogo.json            productos, categorías, envíos y datos de la tienda
     productos/<foto>.webp    las fotos que se suben desde el panel
     pedidos/<ref>-<azar>.json cada pedido (nombre, teléfono, dirección, productos)
     ventas/<ref>.json        marca "este pedido ya descontó stock" (evita descontar dos veces)
*/
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = () => process.env.ALMACEN_DIR || "";
const ACCESS = () => (process.env.BLOB_ACCESS === "private" ? "private" : "public");

function configurado() {
  return !!(DIR() || process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

let _sdk;
async function sdk() {
  if (!_sdk) _sdk = await import("@vercel/blob");
  return _sdk;
}

function falla(msg, status) {
  return Object.assign(new Error(msg), { status: status || 500 });
}
function traducir(e) {
  const m = String((e && e.message) || e);
  if (/access/i.test(m) && /(private|public)/i.test(m))
    return falla("El almacenamiento (Blob) de Vercel tiene que crearse como PÚBLICO. Creá uno nuevo en Storage > Blob > Public y conectalo al proyecto.", 500);
  if (/token|unauthor|forbidden|store/i.test(m))
    return falla("Vercel no encuentra el almacenamiento (Blob). Entrá a tu proyecto > Storage > Create > Blob (Public) > Connect, y después Redeploy.", 500);
  return e;
}

/* ---------- carpeta local (pruebas) ---------- */
const L = {
  p(rel) { return path.join(DIR(), rel); },
  async leer(rel) {
    try { return JSON.parse(await fs.promises.readFile(L.p(rel), "utf8")); } catch (e) { return null; }
  },
  async escribir(rel, data, flag) {
    const f = L.p(rel); await fs.promises.mkdir(path.dirname(f), { recursive: true });
    await fs.promises.writeFile(f, data, flag ? { flag } : undefined);
    return "/almacen/" + rel;
  },
  async listar(prefijo) {
    const carpeta = prefijo.endsWith("/") ? prefijo.slice(0, -1) : path.posix.dirname(prefijo);
    const pre = prefijo.endsWith("/") ? "" : path.posix.basename(prefijo);
    let out = [];
    try { out = await fs.promises.readdir(L.p(carpeta)); } catch (e) { return []; }
    return Promise.all(out.filter((n) => n.startsWith(pre)).map(async (n) => {
      const rel = path.posix.join(carpeta, n);
      const st = await fs.promises.stat(L.p(rel));
      return { pathname: rel, subido: st.mtimeMs };
    }));
  }
};

/* ---------- Blob de Vercel ---------- */
const B = {
  async buscar(pathname) {
    const { list } = await sdk();
    const r = await list({ prefix: pathname, limit: 10 });
    return (r.blobs || []).find((b) => b.pathname === pathname) || null;
  },
  async leerUrl(url) {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  },
  async escribirJSON(pathname, obj, opts) {
    const { put } = await sdk();
    return put(pathname, JSON.stringify(obj), Object.assign(
      { access: ACCESS(), contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 }, opts || {}));
  }
};

/* ---------- catálogo ---------- */
async function leerCatalogo() {
  try {
    if (DIR()) return await L.leer("catalogo.json");
    if (!configurado()) return null;
    const b = await B.buscar("catalogo.json");
    return b ? await B.leerUrl(b.url) : null;
  } catch (e) { throw traducir(e); }
}
async function guardarCatalogo(obj) {
  try {
    if (DIR()) return void (await L.escribir("catalogo.json", JSON.stringify(obj)));
    if (!configurado()) throw falla("Falta conectar el almacenamiento (Blob) en Vercel.", 503);
    await B.escribirJSON("catalogo.json", obj);
  } catch (e) { throw traducir(e); }
}

/* ---------- fotos ---------- */
async function subirImagen(nombre, buffer, tipo) {
  const limpio = String(nombre || "foto").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "foto";
  const ext = tipo === "image/png" ? "png" : tipo === "image/jpeg" ? "jpg" : "webp";
  const rel = "productos/" + limpio + "-" + Date.now().toString(36) + "." + ext;
  try {
    if (DIR()) return await L.escribir(rel, buffer);
    if (!configurado()) throw falla("Falta conectar el almacenamiento (Blob) en Vercel.", 503);
    const { put } = await sdk();
    const r = await put(rel, buffer, { access: ACCESS(), contentType: tipo, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 31536000 });
    return r.url;
  } catch (e) { throw traducir(e); }
}

/* ---------- pedidos ---------- */
const azar = () => Math.random().toString(36).slice(2, 10);

async function buscarPedido(ref) {
  if (DIR()) {
    const l = await L.listar("pedidos/" + ref + "-");
    return l[0] ? { pathname: l[0].pathname } : null;
  }
  const { list } = await sdk();
  const r = await list({ prefix: "pedidos/" + ref + "-", limit: 5 });
  const b = (r.blobs || [])[0];
  return b ? { pathname: b.pathname, url: b.url } : null;
}
async function leerPedido(ref) {
  try {
    const f = await buscarPedido(ref); if (!f) return null;
    return DIR() ? await L.leer(f.pathname) : await B.leerUrl(f.url);
  } catch (e) { throw traducir(e); }
}
async function guardarPedido(ref, obj) {
  try {
    const f = await buscarPedido(ref);
    const rel = f ? f.pathname : "pedidos/" + ref + "-" + azar() + ".json";
    if (DIR()) return void (await L.escribir(rel, JSON.stringify(obj)));
    await B.escribirJSON(rel, obj);
  } catch (e) { throw traducir(e); }
}
async function listarPedidos(max) {
  try {
    let items;
    if (DIR()) {
      items = (await L.listar("pedidos/")).sort((a, b) => b.subido - a.subido).slice(0, max);
      return (await Promise.all(items.map((i) => L.leer(i.pathname)))).filter(Boolean);
    }
    if (!configurado()) return [];
    const { list } = await sdk();
    let blobs = [], cursor;
    do {
      const r = await list({ prefix: "pedidos/", limit: 1000, cursor });
      blobs = blobs.concat(r.blobs || []); cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor && blobs.length < 3000);
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return (await Promise.all(blobs.slice(0, max).map((b) => B.leerUrl(b.url).catch(() => null)))).filter(Boolean);
  } catch (e) { throw traducir(e); }
}

/* Devuelve true si es la primera vez que se reclama este pedido (y entonces hay que descontar stock). */
async function reclamarVenta(ref) {
  const rel = "ventas/" + ref + ".json";
  const cuerpo = JSON.stringify({ ref, cuando: new Date().toISOString() });
  try {
    if (DIR()) { await L.escribir(rel, cuerpo, "wx"); return true; }
    const { put } = await sdk();
    await put(rel, cuerpo, { access: ACCESS(), contentType: "application/json", addRandomSuffix: false, allowOverwrite: false });
    return true;
  } catch (e) {
    if (e && (e.code === "EEXIST" || /already exists|exist/i.test(String(e.message)))) return false;
    throw traducir(e);
  }
}

module.exports = { configurado, leerCatalogo, guardarCatalogo, subirImagen, leerPedido, guardarPedido, listarPedidos, reclamarVenta };
