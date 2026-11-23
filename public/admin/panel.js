/* Panel del almacén — precios, productos, fotos, stock, categorías, envíos, datos del negocio y pedidos.
   En Vercel guarda con /api/admin/*. En la vista de ejemplo (window.PANEL_DEMO) todo pasa en memoria. */
(function () {
  "use strict";
  var DEMO = !!window.PANEL_DEMO;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var BAJO = 8;

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var nf = new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 });
  function money(n) { return "$ " + nf.format(Number(n) || 0); }
  function parseNum(v) { var n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : NaN; }
  function plain(n) { return String(Math.round((Number(n) || 0) * 100) / 100).replace(".", ","); }
  function src(u) { return /^img\//.test(u || "") ? "/" + u : (u || ""); }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} return null; }

  var ICON = {
    home: '<path d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    box: '<path d="M3 7.500 12 3l9 4.500v9L12 21l-9-4.500z"/><path d="M3 7.500 12 12l9-4.500M12 12v9"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.500" cy="8.500" r="1.300"/>',
    truck: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.800"/><circle cx="17" cy="18" r="1.800"/>',
    store: '<path d="M4 9l1.500-5h13L20 9M4 9v11h16V9M4 9c0 1.700 1.300 3 3 3s3-1.300 3-3c0 1.700 1.300 3 3 3s3-1.300 3-3c0 1.700 1.300 3 3 3M9 20v-5h6v5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.800"/><path d="m21 16-5-5-8 8"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7"/>', alert: '<path d="M12 4 2.500 20h19z"/><path d="M12 10v4.500M12 17.500v.1"/>',
    dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', ul: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    pct: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.500"/><circle cx="17" cy="17" r="2.500"/>',
    out: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
    wa: '<path d="M4 20l1.300-4.200A8 8 0 1 1 8.300 18.800z"/><path d="M9 9c0 3 3 6 6 6l1.200-1.500-2-1-1 .7c-1-.5-1.800-1.300-2.300-2.300l.7-1-1-2z"/>',
    pin: '<path d="M12 21s-7-6.200-7-11a7 7 0 0 1 14 0c0 4.800-7 11-7 11z"/><circle cx="12" cy="10" r="2.500"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'
  };
  function ic(n, c) { return '<svg class="ic ' + (c || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[n] || "") + "</svg>"; }

  var TABS = [["resumen", "Resumen", "home"], ["productos", "Productos", "box"], ["pedidos", "Pedidos", "receipt"], ["categorias", "Categorías", "tag"], ["envios", "Envíos", "truck"], ["tienda", "Mi almacén", "store"]];
  var TITULOS = { resumen: "Resumen", productos: "Productos", pedidos: "Pedidos", categorias: "Categorías", envios: "Envíos", tienda: "Mi almacén" };

  /* ---------- estado ---------- */
  var S = { tab: "resumen", cat: null, orig: null, stockBase: {}, q: "", fc: "", fl: "todos", lim: 60, pedidos: null, pf: "entregar", clave: "", info: { almacen: true, mercadopago: true }, drawer: null, saving: false, ids: {}, fotoDe: null };

  /* ---------- avisos ---------- */
  var tT;
  function toast(t, mal) { var el = $("#toast"); el.textContent = t; el.classList.toggle("mal", !!mal); el.classList.add("on"); clearTimeout(tT); tT = setTimeout(function () { el.classList.remove("on"); }, mal ? 6000 : 3200); }

  /* ---------- servidor ---------- */
  function api(ruta, o) {
    o = o || {};
    var h = { "x-clave": S.clave }; if (o.body) h["Content-Type"] = "application/json";
    return fetch(ruta, { method: o.method || (o.body ? "POST" : "GET"), headers: h, body: o.body ? JSON.stringify(o.body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.status === 401) { cerrarSesion(); throw new Error(d.error || "La clave no es correcta."); }
        if (!r.ok) throw new Error(d.error || "No se pudo completar. Probá de nuevo.");
        return d;
      });
    }, function () { throw new Error("No hay conexión con la tienda. Revisá tu internet y probá de nuevo."); });
  }

  /* ---------- cambios sin guardar ---------- */
  function cambios() {
    var o = {}, ids = {}, mod = 0, nue = 0;
    S.orig.productos.forEach(function (p) { o[p.id] = JSON.stringify(p); });
    S.cat.productos.forEach(function (p) {
      if (!(p.id in o)) { nue++; ids[p.id] = "nuevo"; } else if (o[p.id] !== JSON.stringify(p)) { mod++; ids[p.id] = "mod"; }
    });
    var bor = S.orig.productos.filter(function (p) { return !S.cat.productos.some(function (q) { return q.id === p.id; }); }).length;
    var otros = [];
    if (JSON.stringify(S.cat.categorias) !== JSON.stringify(S.orig.categorias)) otros.push("categorías");
    if (JSON.stringify(S.cat.envios) !== JSON.stringify(S.orig.envios)) otros.push("envíos");
    if (JSON.stringify(S.cat.config) !== JSON.stringify(S.orig.config)) otros.push("datos del almacén");
    S.ids = ids;
    return { mod: mod, nue: nue, bor: bor, otros: otros, total: mod + nue + bor + otros.length };
  }
  function barra() {
    var c = cambios(), e = $("#estado"), g = $("#guardar"), d = $("#descartar");
    var partes = [];
    if (c.mod) partes.push(c.mod + (c.mod === 1 ? " producto cambiado" : " productos cambiados"));
    if (c.nue) partes.push(c.nue + (c.nue === 1 ? " producto nuevo" : " productos nuevos"));
    if (c.bor) partes.push(c.bor + (c.bor === 1 ? " eliminado" : " eliminados"));
    c.otros.forEach(function (x) { partes.push(x); });
    e.className = "estado" + (c.total ? " sucio" : "");
    e.innerHTML = c.total ? "<b>Cambios sin guardar</b>" + esc(partes.slice(0, 2).join(" · ")) + (partes.length > 2 ? " …" : "") : (S.saving ? "Guardando…" : "Todo guardado");
    g.disabled = !c.total || S.saving;
    g.innerHTML = S.saving ? '<span class="cargando"></span> Guardando' : "Guardar cambios";
    d.hidden = !c.total || S.saving;
    return c;
  }

  /* ---------- carga ---------- */
  function fijarBase() {
    S.orig = clone(S.cat); S.stockBase = {};
    S.cat.productos.forEach(function (p) { S.stockBase[p.id] = p.stock; });
  }
  function normalizar(d) {
    return { productos: d.productos || [], categorias: (d.categorias || []).slice().sort(function (a, b) { return a.orden - b.orden; }), envios: d.envios || [], config: d.config || {} };
  }
  function cargar() {
    if (DEMO) {
      S.cat = normalizar(clone(window.PANEL_DATA)); S.pedidos = clone(window.PANEL_PEDIDOS || []); fijarBase(); return Promise.resolve();
    }
    return fetch("/api/catalogo?fresh=1").then(function (r) { if (!r.ok) throw new Error("No se pudo leer el catálogo."); return r.json(); }).then(function (d) {
      S.cat = normalizar(d); fijarBase();
    });
  }
  function cargarPedidos() {
    if (DEMO) { S.pedidos = S.pedidos || []; render(); return Promise.resolve(); }
    return api("/api/admin/pedidos").then(function (d) { S.pedidos = d.pedidos || []; render(); }).catch(function (e) { if (S.pedidos === null) S.pedidos = []; toast(e.message, true); render(); });
  }

  /* ---------- entrar / salir ---------- */
  function mostrarLogin(msg) {
    $("#app").hidden = true; $("#login").hidden = false; $("#lg-demo").hidden = !DEMO; $("#lg-err").textContent = msg || "";
    var i = $("#clave"); i.value = ""; setTimeout(function () { i.focus(); }, 30);
  }
  function cerrarSesion() { S.clave = ""; ss("dm_clave", null); cerrarCajon(true); mostrarLogin("Tu sesión terminó. Entrá de nuevo."); }
  function entrar() {
    $("#login").hidden = true; $("#app").hidden = false; $("#demo").hidden = !DEMO;
    var nom = (S.cat.config.nombre || "Mi almacén").replace(/^Almac[eé]n\s+/i, ""); $("#side-nombre").textContent = nom; $("#mb-nombre").textContent = nom;
    $("#ver-tienda").innerHTML = ic("ext") + "Ver la tienda"; $("#ver-tienda").href = DEMO ? "#" : "/";
    $("#salir").innerHTML = ic("out") + "Salir";
    render();
    if (!DEMO) cargarPedidos();
  }
  function iniciar(clave) {
    var go = $("#lg-go"); go.disabled = true; go.innerHTML = '<span class="cargando"></span> Entrando';
    var fin = function () { go.disabled = false; go.textContent = "Entrar al panel"; };
    S.clave = clave;
    var paso = DEMO ? esperar(500).then(function () { return { almacen: true, mercadopago: true }; }) : api("/api/admin/ping");
    paso.then(function (info) { S.info = info; ss("dm_clave", clave); return cargar(); }).then(function () { fin(); entrar(); }).catch(function (e) { fin(); S.clave = ""; $("#lg-err").textContent = e.message; });
  }

  /* ---------- navegación y dibujo ---------- */
  function ir(tab) {
    S.tab = tab; if (tab === "productos") S.lim = 60;
    cerrarCajon(true); render(); window.scrollTo(0, 0);
    if (tab === "pedidos" && !DEMO) cargarPedidos();
  }
  function porEntregar() { return (S.pedidos || []).filter(function (p) { return p.estado === "pagado"; }).length; }
  function nav() {
    var n = porEntregar();
    var side = TABS.map(function (t) { return '<button type="button" data-go="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : "") + ">" + ic(t[2]) + t[1] + (t[0] === "pedidos" && n ? '<span class="n">' + n + "</span>" : "") + "</button>"; }).join("");
    var tabs = TABS.map(function (t) { return '<button type="button" data-go="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : "") + ">" + ic(t[2]) + (t[0] === "tienda" ? "Almacén" : t[1]) + (t[0] === "pedidos" && n ? '<span class="n">' + n + "</span>" : "") + "</button>"; }).join("");
    $("#nav-side").innerHTML = side; $("#nav-tabs").innerHTML = tabs;
  }
  function render() {
    nav(); $("#titulo").textContent = TITULOS[S.tab]; barra();
    var v = $("#view");
    v.innerHTML = ({ resumen: vResumen, productos: vProductos, pedidos: vPedidos, categorias: vCategorias, envios: vEnvios, tienda: vTienda })[S.tab]();
    if (S.tab === "productos") pintarLista();
  }

  /* ---------- piezas de producto ---------- */
  function foto(o, cls) {
    return o && o.imagen ? '<span class="ph ' + (cls || "") + '"><img src="' + esc(src(o.imagen)) + '" alt="" loading="lazy" decoding="async"></span>' : '<span class="ph vac ' + (cls || "") + '">' + ic("image") + "</span>";
  }
  function estadoStock(p) { return p.stock < 1 ? "sin" : p.stock <= BAJO ? "bajo" : "ok"; }
  function enOferta(p) { return p.precioAnterior && p.precioAnterior > p.precio; }
  function etiquetas(p) {
    var b = [];
    if (S.ids[p.id] === "nuevo") b.push('<span class="bg nue">Nuevo</span>');
    if (!p.activo) b.push('<span class="bg hid">Oculto en la tienda</span>');
    if (p.stock < 1) b.push('<span class="bg sin">Sin stock</span>'); else if (p.stock <= BAJO) b.push('<span class="bg low">Quedan ' + p.stock + "</span>");
    if (enOferta(p)) b.push('<span class="bg off">Oferta -' + Math.round((1 - p.precio / p.precioAnterior) * 100) + "%</span>");
    if (p.destacado) b.push('<span class="bg top">Más pedido</span>');
    return b.join("");
  }
  function fila(p) {
    var st = estadoStock(p);
    return '<article class="prow' + (p.activo ? "" : " oculto") + (S.ids[p.id] ? " mod" : "") + '" data-id="' + esc(p.id) + '">' +
      '<button type="button" class="ph-b" data-act="editar" aria-label="Editar ' + esc(p.nombre) + '" style="display:contents;background:none;border:0">' + foto(p) + "</button>" +
      '<button type="button" class="nm" data-act="editar"><b>' + esc(p.nombre || "Producto sin nombre") + "</b><span>" + esc([p.marca, p.contenido].filter(Boolean).join(" · ")) + '</span><span class="bgs">' + etiquetas(p) + "</span></button>" +
      '<div class="ctl">' +
      '<label class="tag"><i>$</i><input data-f="precio" inputmode="decimal" autocomplete="off" value="' + plain(p.precio) + '" aria-label="Precio de ' + esc(p.nombre) + '"></label>' +
      '<div class="stk ' + st + '"><button type="button" data-act="menos" aria-label="Uno menos">' + ic("minus") + '</button><input data-f="stock" inputmode="numeric" autocomplete="off" value="' + p.stock + '" aria-label="Stock de ' + esc(p.nombre) + '"><button type="button" data-act="mas" aria-label="Uno más">' + ic("plus") + "</button></div>" +
      '<button type="button" class="sw" role="switch" data-act="activo" aria-checked="' + !!p.activo + '" aria-label="Mostrar en la tienda"><span></span></button>' +
      '<button type="button" class="btn btn-o btn-s edit" data-act="editar">Editar</button>' +
      "</div></article>";
  }
  function pintarFila(row) {
    var p = prod(row.dataset.id); if (!p) return;
    row.classList.toggle("oculto", !p.activo); row.classList.toggle("mod", !!S.ids[p.id]);
    $(".bgs", row).innerHTML = etiquetas(p);
    $(".nm b", row).textContent = p.nombre || "Producto sin nombre";
    $(".nm > span", row).textContent = [p.marca, p.contenido].filter(Boolean).join(" · ");
    $(".stk", row).className = "stk " + estadoStock(p);
    var sw = $(".sw", row); sw.setAttribute("aria-checked", String(!!p.activo));
    var si = $('[data-f="stock"]', row); if (document.activeElement !== si) si.value = p.stock;
    var pi = $('[data-f="precio"]', row); if (document.activeElement !== pi) pi.value = plain(p.precio);
    var im = $(".ph", row); if (im) im.outerHTML = foto(p);
  }
  function prod(id) { return S.cat.productos.filter(function (p) { return p.id === id; })[0]; }
  function catDe(id) { return S.cat.categorias.filter(function (k) { return k.id === id; })[0]; }

  /* ---------- Resumen ---------- */
  function saludo() { var h = new Date().getHours(); return h < 12 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches"; }
  function conteos() {
    var P = S.cat.productos;
    return { total: P.length, visibles: P.filter(function (p) { return p.activo; }).length, sin: P.filter(function (p) { return p.stock < 1; }).length, bajo: P.filter(function (p) { return p.stock > 0 && p.stock <= BAJO; }).length, oferta: P.filter(enOferta).length, oculto: P.filter(function (p) { return !p.activo; }).length };
  }
  function vResumen() {
    var c = conteos(), c2 = cambios(), n = porEntregar();
    var h = "";
    if (!DEMO && S.info && S.info.almacen === false) h += '<div class="aviso">' + ic("alert") + "<div><b>Falta conectar el almacenamiento</b>En Vercel: Storage → Create → Blob (Public) → Connect al proyecto, y después Redeploy. Sin eso no se pueden guardar cambios.</div></div>";
    if (!DEMO && S.info && S.info.mercadopago === false) h += '<div class="aviso">' + ic("alert") + "<div><b>Mercado Pago sin conectar</b>Agregá la variable MP_ACCESS_TOKEN en Vercel (Settings → Environment Variables) y volvé a publicar.</div></div>";
    h += '<section class="pizarra"><h2>' + saludo() + "</h2><p class=\"sub\">Así está " + esc(S.cat.config.nombre || "tu almacén") + " hoy.</p><div class=\"nums\">" +
      '<button type="button" class="num" data-act="filtro" data-v="todos"><b>' + c.visibles + "</b><span>productos en la tienda</span></button>" +
      '<button type="button" class="num' + (c.sin ? " al" : "") + '" data-act="filtro" data-v="sin"><b>' + c.sin + "</b><span>sin stock</span></button>" +
      '<button type="button" class="num" data-act="filtro" data-v="bajo"><b>' + c.bajo + "</b><span>con poco stock</span></button>" +
      '<button type="button" class="num" data-act="irpedidos"><b>' + n + "</b><span>pedidos para entregar</span></button></div></section>";
    var rep = S.cat.productos.filter(function (p) { return p.stock <= BAJO && p.activo; }).sort(function (a, b) { return a.stock - b.stock; }).slice(0, 6);
    h += '<div class="two"><section class="card pad box"><h3>' + ic("box") + "Para reponer</h3>" +
      (rep.length ? rep.map(function (p) { return '<div class="mini" data-id="' + esc(p.id) + '">' + foto(p) + '<div style="min-width:0"><b>' + esc(p.nombre) + "</b><span>" + (p.stock < 1 ? "Sin stock" : "Quedan " + p.stock) + '</span></div><button type="button" class="btn btn-o btn-s" data-act="mas10">+10</button></div>'; }).join("") : '<div class="vacio"><b>Todo en orden</b>No hay productos con poco stock.</div>') +
      '</section><section class="card pad box"><h3>' + ic("receipt") + "Pedidos para entregar</h3>";
    var pe = (S.pedidos || []).filter(function (p) { return p.estado === "pagado"; }).slice(0, 4);
    h += pe.length ? pe.map(function (p) { return '<div class="mini" style="grid-template-columns:minmax(0,1fr) auto"><div style="min-width:0"><b>' + esc(p.cliente.nombre) + "</b><span>" + esc(p.zona.nombre) + " · " + p.items.length + (p.items.length === 1 ? " producto" : " productos") + "</span></div><b>" + money(p.total) + "</b></div>"; }).join("") + '<div style="margin-top:10px"><button type="button" class="btn btn-g btn-s" data-act="irpedidos">Ver todos los pedidos</button></div>' : '<div class="vacio"><b>Nada pendiente</b>Los pedidos pagados aparecen acá.</div>';
    h += "</section></div>";
    h += '<div class="chips" style="margin-top:18px"><button type="button" class="btn btn-m" data-act="nuevo">' + ic("plus") + 'Nuevo producto</button><button type="button" class="btn btn-o" data-act="ajuste">' + ic("pct") + 'Ajustar precios</button></div>';
    return h;
  }

  /* ---------- Productos ---------- */
  function vProductos() {
    var c = conteos();
    var f = [["todos", "Todos", c.total], ["sin", "Sin stock", c.sin], ["bajo", "Poco stock", c.bajo], ["oferta", "En oferta", c.oferta], ["oculto", "Ocultos", c.oculto]];
    return '<div class="sec-h"><div><h2>Productos</h2><p>Cambiá precio y stock acá mismo. Tocá un producto para editar todo.</p></div><div class="ac"><button type="button" class="btn btn-o" data-act="ajuste">' + ic("pct") + 'Ajustar precios</button><button type="button" class="btn btn-m" data-act="nuevo">' + ic("plus") + "Nuevo producto</button></div></div>" +
      '<div class="tools"><label class="find">' + ic("search") + '<span class="sr">Buscar</span><input class="inp" id="q" type="search" placeholder="Buscar por nombre o marca" value="' + esc(S.q) + '" autocomplete="off"></label>' +
      '<div class="chips" id="fl">' + f.map(function (x) { return '<button type="button" class="chip" data-act="filtro" data-v="' + x[0] + '" aria-pressed="' + (S.fl === x[0]) + '">' + x[1] + " <em>" + x[2] + "</em></button>"; }).join("") + "</div>" +
      '<div class="chips" id="fc"><button type="button" class="chip" data-act="fcat" data-v="" aria-pressed="' + (S.fc === "") + '">Todas las categorías</button>' + S.cat.categorias.map(function (k) { return '<button type="button" class="chip" data-act="fcat" data-v="' + esc(k.id) + '" aria-pressed="' + (S.fc === k.id) + '">' + esc(k.nombre) + "</button>"; }).join("") + "</div></div>" +
      '<div class="lista" id="lista"></div><div class="mas" id="mas"></div>';
  }
  function visibles() {
    var q = norm(S.q);
    return S.cat.productos.filter(function (p) {
      if (S.fc && p.categoria !== S.fc) return false;
      if (q && norm(p.nombre + " " + p.marca + " " + p.contenido).indexOf(q) < 0) return false;
      if (S.fl === "sin") return p.stock < 1;
      if (S.fl === "bajo") return p.stock > 0 && p.stock <= BAJO;
      if (S.fl === "oferta") return enOferta(p);
      if (S.fl === "oculto") return !p.activo;
      return true;
    }).sort(function (a, b) { return a.orden - b.orden; });
  }
  function pintarLista() {
    var l = visibles(), el = $("#lista"); if (!el) return;
    cambios();
    el.innerHTML = l.length ? l.slice(0, S.lim).map(fila).join("") : '<div class="card vacio"><b>No encontramos productos</b>Probá con otra búsqueda o sacá los filtros.</div>';
    $("#mas").innerHTML = l.length > S.lim ? '<button type="button" class="btn btn-o" data-act="mas-lista">Mostrar más (' + (l.length - S.lim) + ")</button>" : "";
    $$("#fl .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === S.fl)); });
    $$("#fc .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === S.fc)); });
  }

  /* ---------- cajón de edición ---------- */
  var UN = { kg: ["g", 1000], g: ["g", 1], gr: ["g", 1], grs: ["g", 1], l: ["ml", 1000], lt: ["ml", 1000], lts: ["ml", 1000], litro: ["ml", 1000], litros: ["ml", 1000], ml: ["ml", 1], cc: ["ml", 1], u: ["u", 1], un: ["u", 1], und: ["u", 1], unid: ["u", 1], unidad: ["u", 1], unidades: ["u", 1] };
  function medidaDe(txt) {
    var m = String(txt || "").trim().toLowerCase().match(/^(?:x\s*)?(\d+(?:[.,]\d+)?)\s*([a-z]+)?$/);
    if (!m) return null;
    var u = m[2] || "u", d = UN[u]; if (!d) return null;
    return { valor: Math.round(parseFloat(m[1].replace(",", ".")) * d[1] * 100) / 100, unidad: d[0] };
  }
  function porUnidad(p) {
    var m = p.medida || {}, v = Number(m.valor) || 0; if (!v || !p.precio) return "";
    if (m.unidad === "g") return money(p.precio * 1000 / v) + " el kilo";
    if (m.unidad === "ml") return money(p.precio * 1000 / v) + " el litro";
    if (m.unidad === "u" && v > 1) return money(p.precio / v) + " c/u";
    return "";
  }
  function vistaTienda(p) {
    var off = enOferta(p), bd = "";
    if (off) bd += '<span class="bg off">-' + Math.round((1 - p.precio / p.precioAnterior) * 100) + "%</span>";
    if (p.stock < 1) bd += '<span class="bg">Sin stock</span>'; else if (p.stock <= BAJO) bd += '<span class="bg low">Últimas ' + p.stock + "</span>"; else if (p.destacado) bd += '<span class="bg top">Más pedido</span>';
    return '<div class="mc">' + (bd ? '<div class="bd">' + bd + "</div>" : "") + foto(p) + '<div class="in"><span class="brand">' + esc(p.marca || " ") + "</span><h4>" + esc(p.nombre || "Nombre del producto") + '</h4><span class="cont">' + esc(p.contenido || " ") + '</span><div class="pr">' + (off ? '<span class="was">' + money(p.precioAnterior) + "</span>" : "") + '<span class="p' + (off ? " off" : "") + '"><small>$</small>' + nf.format(p.precio || 0) + "</span></div>" + (porUnidad(p) ? '<span class="u">' + esc(porUnidad(p)) + "</span>" : "") + '<div class="add">Agregar</div></div></div>';
  }
  function nuevoProd() {
    var mx = 0; S.cat.productos.forEach(function (p) { mx = Math.max(mx, p.orden || 0); });
    return { id: "", nombre: "", marca: "", categoria: (S.fc || (S.cat.categorias[0] || {}).id || ""), precio: 0, precioAnterior: null, contenido: "", medida: { valor: 0, unidad: "" }, descripcion: "", imagen: "", stock: 0, destacado: false, activo: true, orden: mx + 1 };
  }
  function cuerpoCajon(p, nuevo) {
    var hid = nuevo ? "" : "";
    return '<header class="dr-h"><h2 id="dr-t">' + (nuevo ? "Producto nuevo" : "Editar producto") + '</h2><button type="button" class="x" data-act="cerrar" aria-label="Cerrar">' + ic("x") + "</button></header>" +
      '<div class="dr-b">' +
      '<div class="vista"><div id="prev">' + vistaTienda(p) + '</div><div class="cap"><span class="lbl">Foto</span><button type="button" class="btn btn-g btn-s" data-act="foto">' + ic("camera") + ' <span id="foto-t">' + (p.imagen ? "Cambiar foto" : "Subir foto") + '</span></button>' + (p.imagen ? '<button type="button" class="btn btn-o btn-s" data-act="quitarfoto">Quitar foto</button>' : '<button type="button" class="btn btn-o btn-s" data-act="quitarfoto" hidden>Quitar foto</button>') + '<p>Se ve mejor con fondo blanco y el producto bien centrado. Así lo van a ver tus clientes.</p></div></div>' +
      '<label class="fld"><span>Nombre del producto</span><input class="inp" data-d="nombre" value="' + esc(p.nombre) + '" placeholder="Ej: Yerba mate" maxlength="120" autocomplete="off"></label>' +
      '<div class="dos"><label class="fld"><span>Marca</span><input class="inp" data-d="marca" value="' + esc(p.marca) + '" maxlength="60" autocomplete="off"></label>' +
      '<label class="fld"><span>Categoría</span><select class="inp" data-d="categoria">' + S.cat.categorias.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === p.categoria ? " selected" : "") + ">" + esc(k.nombre) + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="dos"><label class="fld"><span>Precio</span><span class="dpr"><b>$</b><input class="inp" data-d="precio" inputmode="decimal" value="' + plain(p.precio) + '" autocomplete="off"></span></label>' +
      '<label class="fld"><span>Precio anterior <small>(opcional)</small></span><span class="dpr"><b>$</b><input class="inp" data-d="precioAnterior" inputmode="decimal" value="' + (p.precioAnterior ? plain(p.precioAnterior) : "") + '" placeholder="—" autocomplete="off"></span></label></div>' +
      '<p class="hint" id="hint-of">' + hintOferta(p) + "</p>" +
      '<div class="dos"><label class="fld"><span>Contenido</span><input class="inp" data-d="contenido" value="' + esc(p.contenido) + '" placeholder="Ej: 500 g, 1 L, 12 u" maxlength="40" autocomplete="off"></label>' +
      '<label class="fld"><span>Stock</span><input class="inp" data-d="stock" inputmode="numeric" value="' + p.stock + '" autocomplete="off"></label></div>' +
      '<p class="hint" id="hint-un">' + hintUnidad(p) + "</p>" +
      '<label class="fld"><span>Descripción</span><textarea class="inp" data-d="descripcion" maxlength="1200" placeholder="Contá en una o dos frases de qué se trata">' + esc(p.descripcion) + "</textarea></label>" +
      '<div class="row-sw"><div><b>Mostrar en la tienda</b><small>Si lo apagás, no lo ven los clientes.</small></div><button type="button" class="sw" role="switch" data-act="dsw" data-k="activo" aria-checked="' + !!p.activo + '" aria-label="Mostrar en la tienda"><span></span></button></div>' +
      '<div class="row-sw"><div><b>Marcar como "Más pedido"</b><small>Aparece destacado en el inicio.</small></div><button type="button" class="sw" role="switch" data-act="dsw" data-k="destacado" aria-checked="' + !!p.destacado + '" aria-label="Más pedido"><span></span></button></div>' +
      (nuevo ? "" : '<button type="button" class="peligro" data-act="borrar">' + ic("trash") + "Eliminar este producto</button>") +
      "</div>" +
      '<footer class="dr-f">' + (nuevo ? '<button type="button" class="btn btn-o" data-act="cerrar">Cancelar</button><button type="button" class="btn btn-m" data-act="agregar">Agregar al almacén</button>' : '<button type="button" class="btn btn-g" data-act="cerrar">Listo</button>') + "</footer>";
  }
  function hintOferta(p) { return enOferta(p) ? "En la tienda se muestra tachado <b>" + money(p.precioAnterior) + "</b> y un cartel de <b>-" + Math.round((1 - p.precio / p.precioAnterior) * 100) + "%</b>." : "Si completás el precio anterior, el producto sale como oferta."; }
  function hintUnidad(p) { var u = porUnidad(p); return u ? "En la tienda también se muestra <b>" + esc(u) + "</b>." : "Escribí el contenido como “500 g”, “1 kg” o “1 L” y la tienda calcula el precio por kilo o litro."; }
  function abrirProd(id) {
    var nuevo = !id, p = nuevo ? nuevoProd() : prod(id); if (!p) return;
    S.drawer = { id: id, nuevo: nuevo, p: p };
    var dr = $("#dr"); dr.innerHTML = cuerpoCajon(p, nuevo); dr.setAttribute("aria-hidden", "false");
    $("#vel").classList.add("on"); dr.classList.add("on"); document.body.style.overflow = "hidden";
    setTimeout(function () { var i = $('[data-d="nombre"]', dr); if (nuevo && i) i.focus({ preventScroll: true }); }, 280);
  }
  function cerrarCajon(rapido) {
    var dr = $("#dr"); if (!dr.classList.contains("on")) return;
    dr.classList.remove("on"); $("#vel").classList.remove("on"); dr.setAttribute("aria-hidden", "true"); document.body.style.overflow = "";
    S.drawer = null; if (S.tab === "productos" || S.tab === "resumen") { if (!rapido) render(); }
  }
  function sincCajon() {
    if (!S.drawer) return; var p = S.drawer.p;
    $("#prev").innerHTML = vistaTienda(p); $("#hint-of").innerHTML = hintOferta(p); $("#hint-un").innerHTML = hintUnidad(p);
    $("#foto-t").textContent = p.imagen ? "Cambiar foto" : "Subir foto";
    var q = $('[data-act="quitarfoto"]', $("#dr")); if (q) q.hidden = !p.imagen;
    if (!S.drawer.nuevo) { var row = $('.prow[data-id="' + CSS.escape(p.id) + '"]'); if (row) { cambios(); pintarFila(row); } }
    barra();
  }
  function campoCajon(el) {
    var p = S.drawer && S.drawer.p; if (!p) return; var k = el.dataset.d, v = el.value;
    if (k === "precio") { var n = parseNum(v); p.precio = isFinite(n) && n >= 0 ? n : 0; }
    else if (k === "precioAnterior") { var a = parseNum(v); p.precioAnterior = isFinite(a) && a > 0 ? a : null; }
    else if (k === "stock") { var s = parseInt(v, 10); p.stock = isFinite(s) && s >= 0 ? s : 0; }
    else if (k === "contenido") { p.contenido = v; var m = medidaDe(v); if (m) p.medida = m; else if (!v.trim()) p.medida = { valor: 0, unidad: "" }; }
    else p[k] = v;
    sincCajon();
  }

  /* ---------- fotos ---------- */
  function achicar(file) {
    return new Promise(function (ok, mal) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var max = 900, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
        var c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h); URL.revokeObjectURL(u);
        c.toBlob(function (b) { if (b && b.type === "image/webp") return ok(b); c.toBlob(function (j) { j ? ok(j) : mal(new Error("x")); }, "image/jpeg", 0.86); }, "image/webp", 0.84);
      };
      im.onerror = function () { URL.revokeObjectURL(u); mal(new Error("No pude leer esa foto. Probá con una JPG o PNG.")); };
      im.src = u;
    });
  }
  function aBase64(blob) { return new Promise(function (ok, mal) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = mal; r.readAsDataURL(blob); }); }
  function subirFoto(file, nombre) {
    return achicar(file).then(function (blob) {
      return aBase64(blob).then(function (uri) {
        if (DEMO) return uri;
        return api("/api/admin/imagen", { body: { nombre: nombre, tipo: blob.type, datos: uri.split(",")[1] } }).then(function (d) { return d.url; });
      });
    });
  }
  function elegirFoto(ctx) { S.fotoDe = ctx; var a = $("#archivo"); a.value = ""; a.click(); }

  /* ---------- ventanas ---------- */
  function ventana(html, cierra) {
    var m = $("#mw"); m.hidden = false; m.className = "mod-w"; m.innerHTML = '<div class="mod-c" role="dialog" aria-modal="true">' + html + "</div>";
    m.onclick = function (e) { if (e.target === m) cerrarVentana(); };
    var f = $("input,select,button.btn-m,button.btn-g", m); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 30);
  }
  function cerrarVentana() { var m = $("#mw"); m.hidden = true; m.innerHTML = ""; m.onclick = null; }
  function confirmar(titulo, texto, si, peligro, alSi, alNo, noTxt) {
    ventana('<div class="in"><h3>' + esc(titulo) + "</h3><p>" + texto + '</p></div><div class="bt">' + (alNo ? '<button type="button" class="btn btn-o" data-w="no">' + esc(noTxt || "Mejor no") + "</button>" : '<button type="button" class="btn btn-o" data-w="cancel">Cancelar</button>') + '<button type="button" class="btn ' + (peligro ? "btn-d" : "btn-m") + '" data-w="si">' + esc(si) + "</button></div>");
    var m = $("#mw");
    m.querySelector('[data-w="si"]').onclick = function () { cerrarVentana(); alSi(); };
    var n = m.querySelector('[data-w="no"]'); if (n) n.onclick = function () { cerrarVentana(); alNo(); };
    var c = m.querySelector('[data-w="cancel"]'); if (c) c.onclick = cerrarVentana;
  }

  /* ---------- ajustar precios ---------- */
  function redondear(n, paso) { return paso > 0 ? Math.round(n / paso) * paso : Math.round(n * 100) / 100; }
  function calcAjuste(f) {
    var pct = parseNum(f.pct.value), dir = f.dir.value === "bajar" ? -1 : 1, paso = parseInt(f.paso.value, 10), cat = f.cat.value;
    var lista = S.cat.productos.filter(function (p) { return !cat || p.categoria === cat; });
    var cambios_ = isFinite(pct) && pct > 0 ? lista.map(function (p) { var n = Math.max(0, redondear(p.precio * (1 + dir * pct / 100), paso)); return { p: p, n: n }; }).filter(function (x) { return x.n !== x.p.precio; }) : [];
    return { lista: lista, cambios: cambios_ };
  }
  function abrirAjuste() {
    ventana('<form id="fa"><div class="in"><h3>Ajustar precios</h3><p>Sube o baja varios precios de una vez. Revisás cómo queda antes de aplicarlo.</p>' +
      '<div class="dos"><label class="fld"><span>Qué hacer</span><select class="inp" name="dir"><option value="subir">Subir</option><option value="bajar">Bajar</option></select></label><label class="fld"><span>Cuánto (%)</span><input class="inp" name="pct" inputmode="decimal" placeholder="Ej: 5" autocomplete="off"></label></div>' +
      '<label class="fld"><span>A qué productos</span><select class="inp" name="cat"><option value="">A todos</option>' + S.cat.categorias.map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k.nombre) + "</option>"; }).join("") + '</select></label>' +
      '<label class="fld"><span>Redondear a</span><select class="inp" name="paso"><option value="1">$ 1</option><option value="5">$ 5</option><option value="10">$ 10</option><option value="0">Sin redondear</option></select></label>' +
      '<div class="pv" id="pv"><div><span>Escribí el porcentaje para ver cómo queda.</span></div></div></div><div class="bt"><button type="button" class="btn btn-o" data-w="cancel">Cancelar</button><button type="submit" class="btn btn-m" id="aj-go" disabled>Aplicar</button></div></form>');
    var f = $("#fa"), pv = $("#pv");
    function ver() {
      var r = calcAjuste(f), go = $("#aj-go");
      pv.innerHTML = r.cambios.length ? r.cambios.slice(0, 5).map(function (x) { return "<div><span>" + esc(x.p.nombre) + "</span><b>" + money(x.p.precio) + " → " + money(x.n) + "</b></div>"; }).join("") + (r.cambios.length > 5 ? "<div><span>y " + (r.cambios.length - 5) + " más…</span></div>" : "") : "<div><span>Escribí el porcentaje para ver cómo queda.</span></div>";
      go.disabled = !r.cambios.length; go.textContent = r.cambios.length ? "Aplicar a " + r.cambios.length + (r.cambios.length === 1 ? " producto" : " productos") : "Aplicar";
    }
    f.addEventListener("input", ver); f.addEventListener("change", ver);
    $('[data-w="cancel"]', f).onclick = cerrarVentana;
    f.onsubmit = function (e) { e.preventDefault(); var r = calcAjuste(f); r.cambios.forEach(function (x) { if (x.p.precioAnterior && x.p.precioAnterior <= x.n) x.p.precioAnterior = null; x.p.precio = x.n; }); cerrarVentana(); render(); toast("Listo: se cambiaron " + r.cambios.length + " precios. Falta guardar."); };
  }

  /* ---------- categorías ---------- */
  function cuentaCat(id) { return S.cat.productos.filter(function (p) { return p.categoria === id; }).length; }
  function vCategorias() {
    var L = S.cat.categorias;
    return '<div class="sec-h"><div><h2>Categorías</h2><p>Los grupos en que se ordenan tus productos en la tienda.</p></div><div class="ac"><button type="button" class="btn btn-m" data-act="nuevacat">' + ic("plus") + "Nueva categoría</button></div></div>" +
      '<div class="grid2">' + L.map(function (k, i) {
        var n = cuentaCat(k.id);
        return '<article class="card kcard" data-kid="' + esc(k.id) + '"><button type="button" class="ph-b" data-act="fotocat" aria-label="Cambiar foto" style="border:0;background:none;padding:0">' + foto(k) + '</button><div class="campos"><label class="fld"><span>Nombre</span><input class="inp" data-kf="nombre" value="' + esc(k.nombre) + '" maxlength="60" autocomplete="off"></label><label class="fld"><span>Descripción corta</span><input class="inp" data-kf="descripcion" value="' + esc(k.descripcion) + '" maxlength="140" autocomplete="off"></label></div>' +
          '<div class="pie"><span>' + n + (n === 1 ? " producto" : " productos") + '</span><span class="sp"><button type="button" class="ib" data-act="catup" aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + ic("up") + '</button><button type="button" class="ib" data-act="catdown" aria-label="Bajar"' + (i === L.length - 1 ? " disabled" : "") + ">" + ic("down") + '</button><button type="button" class="btn btn-o" data-act="fotocat">' + ic("camera") + ' Foto</button><button type="button" class="ib" data-act="borrarcat" aria-label="Eliminar categoría"' + (n ? ' title="Primero mové sus productos a otra categoría"' : "") + ">" + ic("trash") + "</button></span></div></article>";
      }).join("") + "</div>";
  }
  function normOrden(arr) { arr.forEach(function (x, i) { x.orden = i + 1; }); }

  /* ---------- envíos ---------- */
  function vEnvios() {
    var Z = S.cat.envios, g = S.cat.config.envioGratisDesde || 0;
    return '<div class="sec-h"><div><h2>Envíos</h2><p>Cómo reciben el pedido tus clientes y cuánto cuesta.</p></div><div class="ac"><button type="button" class="btn btn-m" data-act="nuevazona">' + ic("plus") + "Nueva forma de entrega</button></div></div>" +
      '<div class="card form" style="margin-bottom:16px"><label class="fld"><span>Envío gratis a partir de</span><span class="dpr" style="max-width:260px"><b>$</b><input class="inp" data-cf="envioGratisDesde" inputmode="decimal" value="' + (g ? plain(g) : "") + '" placeholder="0" autocomplete="off"></span><small>Si el pedido llega a ese monto, el envío no se cobra. Dejalo vacío para cobrar siempre.</small></label></div>' +
      '<div class="lista">' + Z.map(function (z, i) {
        return '<article class="card zcard" data-zi="' + i + '"><label class="fld"><span>Nombre</span><input class="inp" data-zf="nombre" value="' + esc(z.nombre) + '" maxlength="90" autocomplete="off"></label>' +
          '<div class="fld"><span>Tipo</span><div class="seg"><button type="button" data-act="ztipo" data-v="0" aria-pressed="' + !z.envio + '">Retiro</button><button type="button" data-act="ztipo" data-v="1" aria-pressed="' + !!z.envio + '">A domicilio</button></div></div>' +
          '<label class="fld"><span>Costo</span><span class="dpr"><b>$</b><input class="inp" data-zf="costo" inputmode="decimal" value="' + plain(z.costo) + '"' + (z.envio ? "" : " disabled") + ' autocomplete="off"></span></label>' +
          '<div style="display:flex;align-items:center;gap:10px;justify-content:space-between"><button type="button" class="sw" role="switch" data-act="zact" aria-checked="' + (z.activo !== false) + '" aria-label="Disponible"><span></span></button><button type="button" class="ib" data-act="borrarzona" aria-label="Eliminar">' + ic("trash") + "</button></div></article>";
      }).join("") + "</div>";
  }

  /* ---------- mi almacén ---------- */
  function vTienda() {
    var c = S.cat.config;
    function f(k, et, ph, extra) { return '<label class="fld"><span>' + et + '</span><input class="inp" data-cf="' + k + '" value="' + esc(c[k] || "") + '" placeholder="' + esc(ph || "") + '" autocomplete="off"' + (extra || "") + "></label>"; }
    return '<div class="sec-h"><div><h2>Mi almacén</h2><p>Los datos que se ven en la tienda y en los mensajes a tus clientes.</p></div></div>' +
      '<div class="card form"><div class="dos2">' + f("nombre", "Nombre del almacén", "", ' maxlength="60"') + f("lema", "Frase de portada", "Ej: Lo de todos los días, a la vuelta de casa", ' maxlength="120"') + "</div>" +
      '<div class="dos2">' + '<label class="fld"><span>WhatsApp</span><input class="inp" data-cf="whatsapp" inputmode="tel" value="' + esc(c.whatsapp || "") + '" placeholder="59899123456" autocomplete="off"><small>Con el código de país y sin espacios. Para Uruguay: 598 y el celular sin el 0.</small></label>' + f("instagram", "Instagram", "tu_almacen") + "</div>" +
      '<div class="dos2">' + f("direccion", "Dirección", "Calle y número, barrio") + f("horario", "Horarios", "Lun a sáb 8 a 20 h") + "</div>" + f("email", "Email de contacto", "almacen@mail.com") +
      f("mensajeConfirmacion", "Mensaje cuando el cliente termina de pagar", "¡Gracias por tu compra! Te escribimos por WhatsApp.") + "</div>" +
      '<div class="sec-h" style="margin-top:26px"><div><h2 style="font-size:26px">Copia de seguridad</h2><p>Descargá todo tu catálogo en un archivo, por si algún día lo necesitás.</p></div></div>' +
      '<div class="card pad cop"><button type="button" class="btn btn-o" data-act="bajar">' + ic("dl") + 'Descargar copia</button><button type="button" class="btn btn-o" data-act="restaurar">' + ic("ul") + 'Cargar una copia</button><span class="hint">Al cargar una copia, los cambios quedan sin guardar hasta que toques “Guardar cambios”.</span></div>';
  }

  /* ---------- pedidos ---------- */
  function tel(t) { var d = String(t || "").replace(/\D/g, ""); if (!d) return ""; if (d.indexOf("598") === 0) return d; if (d.charAt(0) === "0") d = d.slice(1); return "598" + d; }
  function fecha(s) { try { return new Date(s).toLocaleString("es-UY", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
  var EST = { pendiente: ["", "Esperando pago"], pagado: ["pag", "Para entregar"], entregado: ["ent", "Entregado"], rechazado: ["rec", "Pago rechazado"] };
  function vPedidos() {
    var P = S.pedidos;
    var head = '<div class="sec-h"><div><h2>Pedidos</h2><p>Lo que compraron tus clientes, con los datos para entregar.</p></div><div class="ac"><button type="button" class="btn btn-o" data-act="recargar">Actualizar</button></div></div>';
    if (P === null) return head + '<div class="card vacio"><span class="cargando"></span></div>';
    var gr = { entregar: P.filter(function (p) { return p.estado === "pagado"; }), entregados: P.filter(function (p) { return p.estado === "entregado"; }), otros: P.filter(function (p) { return p.estado === "pendiente" || p.estado === "rechazado"; }) };
    var chips = [["entregar", "Para entregar"], ["entregados", "Entregados"], ["otros", "Sin pagar"]].map(function (x) { return '<button type="button" class="chip" data-act="pf" data-v="' + x[0] + '" aria-pressed="' + (S.pf === x[0]) + '">' + x[1] + " <em>" + gr[x[0]].length + "</em></button>"; }).join("");
    var L = gr[S.pf] || [];
    return head + '<div class="chips" style="margin-bottom:14px">' + chips + "</div>" +
      (L.length ? '<div class="lista">' + L.map(pedido).join("") + "</div>" : '<div class="card vacio"><b>' + (S.pf === "entregar" ? "No hay pedidos para entregar" : "No hay pedidos acá") + "</b>" + (S.pf === "entregar" ? "Cuando un cliente pague, aparece en esta lista." : "") + "</div>");
  }
  function pedido(p) {
    var e = EST[p.estado] || EST.pendiente, c = p.cliente || {}, t = tel(c.telefono);
    var nombre = S.cat.config.nombre || "el almacén";
    var msg = "Hola " + String(c.nombre || "").split(" ")[0] + "! Te escribimos de " + nombre + ". Tu pedido " + p.ref + (p.zona && p.zona.envio ? " ya va camino a tu casa." : " ya está listo para retirar.");
    return '<article class="card ped" data-ref="' + esc(p.ref) + '"><div class="ped-h"><b>' + esc(c.nombre || "Cliente") + "</b><time>" + esc(fecha(p.creado)) + "</time><span style=\"color:var(--mut);font-size:13px\">" + esc(p.ref) + '</span><span class="est ' + e[0] + '">' + e[1] + "</span></div>" +
      '<div class="ped-b"><div><h4>Para entregar</h4><p><b>' + esc(p.zona ? p.zona.nombre : "") + "</b></p>" + (c.direccion ? "<p>" + ic("pin") + " " + esc(c.direccion) + "</p>" : "") + (c.telefono ? "<p>" + esc(c.telefono) + "</p>" : "") + (c.email ? "<p>" + esc(c.email) + "</p>" : "") + (c.nota ? '<p class="nota">“' + esc(c.nota) + "”</p>" : "") + "</div>" +
      "<div><h4>Productos</h4>" + (p.items || []).map(function (i) { return '<div class="lin"><span>' + i.qty + " × " + esc(i.nombre) + (i.contenido ? " (" + esc(i.contenido) + ")" : "") + "</span><b>" + money(i.precio * i.qty) + "</b></div>"; }).join("") + (p.envio ? '<div class="lin"><span>Envío</span><b>' + money(p.envio) + "</b></div>" : "") + '<div class="tot"><span>Total</span><span>' + money(p.total) + "</span></div></div></div>" +
      '<div class="ped-f">' + (t ? '<a class="btn btn-o btn-s" target="_blank" rel="noopener" href="https://wa.me/' + t + "?text=" + encodeURIComponent(msg) + '">' + ic("wa") + "Escribirle por WhatsApp</a>" : "") +
      (p.estado === "pagado" ? '<button type="button" class="btn btn-g btn-s" data-act="entregar">' + ic("check") + "Marcar como entregado</button>" : "") + (p.estado === "entregado" ? '<button type="button" class="btn btn-o btn-s" data-act="desentregar">' + ic("undo") + "Volver a “para entregar”</button>" : "") + "</div></article>";
  }
  function marcarPedido(ref, estado) {
    var p = (S.pedidos || []).filter(function (x) { return x.ref === ref; })[0]; if (!p) return;
    var fin = function () { p.estado = estado; render(); toast(estado === "entregado" ? "Pedido entregado ✓" : "Listo, volvió a “para entregar”."); };
    if (DEMO) return fin();
    api("/api/admin/pedidos", { body: { ref: ref, estado: estado } }).then(fin).catch(function (e) { toast(e.message, true); });
  }

  /* ---------- guardar / descartar ---------- */
  function validar() {
    for (var i = 0; i < S.cat.productos.length; i++) {
      var p = S.cat.productos[i];
      if (!String(p.nombre).trim()) return 'Hay un producto sin nombre. Escribile uno o eliminalo.';
      if (!(Number(p.precio) >= 0)) return 'El precio de "' + p.nombre + '" no es válido.';
    }
    for (var k = 0; k < S.cat.categorias.length; k++) if (!String(S.cat.categorias[k].nombre).trim()) return "Hay una categoría sin nombre.";
    for (var z = 0; z < S.cat.envios.length; z++) if (!String(S.cat.envios[z].nombre).trim()) return "Hay una forma de entrega sin nombre.";
    if (!S.cat.envios.some(function (x) { return x.activo !== false; })) return "Dejá al menos una forma de entrega activa.";
    return "";
  }
  function guardar() {
    if (S.saving || !cambios().total) return;
    var m = validar(); if (m) return toast(m, true);
    S.saving = true; barra();
    var p = DEMO ? esperar(900).then(function () { return { catalogo: clone(S.cat) }; }) : api("/api/admin/guardar", { body: { catalogo: S.cat, stockBase: S.stockBase } });
    p.then(function (d) {
      S.cat = normalizar(d.catalogo); fijarBase();
      toast(DEMO ? "Listo. En esta vista de ejemplo no se publica; en tu tienda los cambios aparecen en menos de un minuto." : "¡Listo! La tienda ya tiene los cambios.");
    }).catch(function (e) { toast(e.message, true); }).then(function () { S.saving = false; render(); });
  }
  function descartar() {
    confirmar("¿Descartar los cambios?", "Vuelve todo a como estaba la última vez que guardaste.", "Sí, descartar", true, function () { cerrarCajon(true); S.cat = clone(S.orig); render(); toast("Cambios descartados."); });
  }

  /* ---------- eventos ---------- */
  var VIEW = $("#view");
  function filaDe(el) { var r = el.closest(".prow,.mini"); return r ? r.dataset.id : ""; }
  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); return ir(go.dataset.go); }
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.dataset.act, id = filaDe(b), p = id ? prod(id) : null;
    switch (a) {
      case "editar": abrirProd(id); break;
      case "nuevo": abrirProd(null); break;
      case "cerrar": cerrarCajon(); break;
      case "menos": case "mas": if (p) { p.stock = Math.max(0, p.stock + (a === "mas" ? 1 : -1)); pintarFila(b.closest(".prow")); barra(); } break;
      case "mas10": if (p) { p.stock += 10; render(); toast("Sumaste 10 a " + p.nombre + ". Falta guardar."); } break;
      case "activo": if (p) { p.activo = !p.activo; pintarFila(b.closest(".prow")); cambios(); pintarFila(b.closest(".prow")); barra(); } break;
      case "filtro": S.fl = b.dataset.v; S.fc = S.tab === "productos" ? S.fc : ""; if (S.tab !== "productos") { S.q = ""; ir("productos"); } else pintarLista(); break;
      case "fcat": S.fc = b.dataset.v; S.lim = 60; pintarLista(); break;
      case "mas-lista": S.lim += 60; pintarLista(); break;
      case "irpedidos": S.pf = "entregar"; ir("pedidos"); break;
      case "ajuste": abrirAjuste(); break;
      case "foto": if (S.drawer) elegirFoto({ obj: S.drawer.p, nombre: S.drawer.p.nombre, cajon: true }); break;
      case "quitarfoto": if (S.drawer) { S.drawer.p.imagen = ""; sincCajon(); } break;
      case "dsw": if (S.drawer) { var k = b.dataset.k; S.drawer.p[k] = !S.drawer.p[k]; b.setAttribute("aria-checked", String(!!S.drawer.p[k])); sincCajon(); } break;
      case "agregar": agregarProd(); break;
      case "borrar": if (S.drawer && !S.drawer.nuevo) { var q = S.drawer.p; confirmar("¿Eliminar \"" + q.nombre + "\"?", "Se borra de tu almacén para siempre. Si solo querés que no se vea en la tienda, mejor ocultalo.", "Eliminar", true, function () { S.cat.productos = S.cat.productos.filter(function (x) { return x !== q; }); cerrarCajon(true); render(); toast("Producto eliminado. Falta guardar."); }, function () { q.activo = false; sincCajon(); cerrarCajon(); toast("Producto oculto. Falta guardar."); }, "Mejor ocultarlo"); } break;
      case "nuevacat": nuevaCat(); break;
      case "fotocat": var kc = catDe(b.closest(".kcard").dataset.kid); if (kc) elegirFoto({ obj: kc, nombre: kc.nombre }); break;
      case "catup": case "catdown": moverCat(b.closest(".kcard").dataset.kid, a === "catup" ? -1 : 1); break;
      case "borrarcat": borrarCat(b.closest(".kcard").dataset.kid); break;
      case "nuevazona": var nz = { id: "", nombre: "Nueva forma de entrega", costo: 0, envio: true, activo: true }; var n = S.cat.envios.length + 1; while (S.cat.envios.some(function (z) { return z.id === "entrega-" + n; })) n++; nz.id = "entrega-" + n; S.cat.envios.push(nz); render(); var inp = $$("[data-zf=nombre]").pop(); if (inp) { inp.focus(); inp.select(); } break;
      case "ztipo": var z1 = S.cat.envios[+b.closest(".zcard").dataset.zi]; z1.envio = b.dataset.v === "1"; if (!z1.envio) z1.costo = 0; render(); break;
      case "zact": var z2 = S.cat.envios[+b.closest(".zcard").dataset.zi]; z2.activo = !(z2.activo !== false); render(); break;
      case "borrarzona": var zi = +b.closest(".zcard").dataset.zi, zz = S.cat.envios[zi]; if (S.cat.envios.length < 2) return toast("Tiene que quedar al menos una forma de entrega.", true); confirmar("¿Eliminar esta forma de entrega?", esc(zz.nombre), "Eliminar", true, function () { S.cat.envios.splice(zi, 1); render(); }); break;
      case "pf": S.pf = b.dataset.v; render(); break;
      case "recargar": S.pedidos = DEMO ? S.pedidos : null; render(); cargarPedidos(); break;
      case "entregar": marcarPedido(b.closest(".ped").dataset.ref, "entregado"); break;
      case "desentregar": marcarPedido(b.closest(".ped").dataset.ref, "pagado"); break;
      case "bajar": bajarCopia(); break;
      case "restaurar": $("#restaurar").click(); break;
    }
  });
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el.id === "q") { S.q = el.value; S.lim = 60; return pintarLista(); }
    if (el.dataset.d) return campoCajon(el);
    var row = el.closest(".prow");
    if (row && el.dataset.f) {
      var p = prod(row.dataset.id); if (!p) return;
      if (el.dataset.f === "precio") { var n = parseNum(el.value); p.precio = isFinite(n) && n >= 0 ? n : 0; }
      else { var s = parseInt(el.value, 10); p.stock = isFinite(s) && s >= 0 ? s : 0; }
      cambios(); pintarFila(row); barra(); return;
    }
    var kc = el.closest(".kcard");
    if (kc && el.dataset.kf) { var k = catDe(kc.dataset.kid); if (k) { k[el.dataset.kf] = el.value; barra(); } return; }
    var zc = el.closest(".zcard");
    if (zc && el.dataset.zf) { var z = S.cat.envios[+zc.dataset.zi]; if (z) { if (el.dataset.zf === "costo") { var c = parseNum(el.value); z.costo = isFinite(c) && c >= 0 ? c : 0; } else z[el.dataset.zf] = el.value; barra(); } return; }
    if (el.dataset.cf) {
      var key = el.dataset.cf, v = el.value;
      if (key === "envioGratisDesde") { var g = parseNum(v); if (isFinite(g) && g > 0) S.cat.config[key] = g; else delete S.cat.config[key]; }
      else if (key === "whatsapp") { var w = v.replace(/\D/g, ""); if (w) S.cat.config[key] = w; else delete S.cat.config[key]; }
      else if (v.trim()) S.cat.config[key] = v; else delete S.cat.config[key];
      barra();
    }
  });
  document.addEventListener("change", function (e) {
    var el = e.target, row = el.closest(".prow");
    if (row && el.dataset.f) { var p = prod(row.dataset.id); if (p) { el.value = el.dataset.f === "precio" ? plain(p.precio) : p.stock; } }
    if (el.dataset.d === "categoria" || el.dataset.d === "precio" || el.dataset.d === "precioAnterior" || el.dataset.d === "stock") { var q = S.drawer && S.drawer.p; if (q) { var k = el.dataset.d; el.value = k === "stock" ? q.stock : (k === "precioAnterior" ? (q.precioAnterior ? plain(q.precioAnterior) : "") : (k === "precio" ? plain(q.precio) : el.value)); } }
    if (el.dataset.d === "categoria") campoCajon(el);
    if (el.dataset.kf === "nombre" && !el.value.trim()) { var kc = catDe(el.closest(".kcard").dataset.kid); if (kc) { el.value = kc.nombre; } }
    if (el.dataset.cf === "envioGratisDesde") { var g = S.cat.config.envioGratisDesde; el.value = g ? plain(g) : ""; }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!$("#mw").hidden) cerrarVentana(); else cerrarCajon(); }
    if (e.key === "Enter" && e.target.matches && e.target.matches(".tag input,.stk input")) e.target.blur();
  });
  $("#vel").addEventListener("click", function () { cerrarCajon(); });
  $("#guardar").addEventListener("click", guardar);
  $("#descartar").addEventListener("click", descartar);
  $("#salir").addEventListener("click", function () { var sal = function () { S.clave = ""; ss("dm_clave", null); S.cat = null; mostrarLogin(""); }; if (cambios().total) confirmar("Tenés cambios sin guardar", "Si salís ahora se pierden.", "Salir igual", true, sal); else sal(); });
  $("#lf").addEventListener("submit", function (e) { e.preventDefault(); var v = $("#clave").value; if (!v) { $("#lg-err").textContent = "Escribí tu clave."; return; } $("#lg-err").textContent = ""; iniciar(v); });
  window.addEventListener("beforeunload", function (e) { if (S.cat && S.orig && !DEMO && cambios().total) { e.preventDefault(); e.returnValue = ""; } });

  /* foto elegida */
  $("#archivo").addEventListener("change", function () {
    var f = this.files && this.files[0], ctx = S.fotoDe; if (!f || !ctx) return;
    toast("Subiendo la foto…");
    subirFoto(f, ctx.nombre || "foto").then(function (url) {
      ctx.obj.imagen = url;
      if (ctx.cajon) sincCajon(); else { render(); barra(); }
      toast("Foto lista. Falta guardar.");
    }).catch(function (e) { toast(e.message || "No se pudo subir la foto.", true); });
  });

  /* ---------- alta de producto / categoría ---------- */
  function idLibre(base, lista) { var id = slug(base) || "producto", n = 2, b = id; while (lista.some(function (x) { return x.id === id; })) id = b + "-" + n++; return id; }
  function agregarProd() {
    var d = S.drawer; if (!d) return; var p = d.p;
    if (!String(p.nombre).trim()) { toast("Escribile un nombre al producto.", true); var i = $('[data-d="nombre"]'); if (i) i.focus(); return; }
    if (!(parseNum($('[data-d="precio"]').value) > 0)) { toast("Ponele un precio.", true); $('[data-d="precio"]').focus(); return; }
    p.id = idLibre(p.nombre, S.cat.productos);
    S.cat.productos.push(p); S.drawer = null; cerrarCajon(true);
    S.tab = "productos"; S.q = ""; S.fl = "todos"; S.fc = ""; S.lim = 1e9; render(); window.scrollTo(0, 0);
    var row = $('.prow[data-id="' + CSS.escape(p.id) + '"]'); if (row) { row.scrollIntoView({ block: "center" }); row.classList.add("res"); }
    S.lim = 60; toast("Producto agregado. Falta guardar.");
  }
  function nuevaCat() {
    ventana('<form id="fk"><div class="in"><h3>Nueva categoría</h3><p>Por ejemplo: Verdulería, Carnes, Mascotas.</p><label class="fld"><span>Nombre</span><input class="inp" name="n" maxlength="60" autocomplete="off" required></label></div><div class="bt"><button type="button" class="btn btn-o" data-w="cancel">Cancelar</button><button type="submit" class="btn btn-m">Crear</button></div></form>');
    var f = $("#fk"); $('[data-w="cancel"]', f).onclick = cerrarVentana;
    f.onsubmit = function (e) { e.preventDefault(); var n = f.n.value.trim(); if (!n) return; S.cat.categorias.push({ id: idLibre(n, S.cat.categorias), nombre: n, descripcion: "", imagen: "", orden: S.cat.categorias.length + 1 }); cerrarVentana(); render(); toast("Categoría creada. Agregale una foto y productos."); };
  }
  function moverCat(id, d) {
    var L = S.cat.categorias, i = L.map(function (k) { return k.id; }).indexOf(id), j = i + d; if (j < 0 || j >= L.length) return;
    var t = L[i]; L[i] = L[j]; L[j] = t; normOrden(L); render();
  }
  function borrarCat(id) {
    var k = catDe(id), n = cuentaCat(id);
    if (S.cat.categorias.length < 2) return toast("Tiene que quedar al menos una categoría.", true);
    if (n) return toast("“" + k.nombre + "” tiene " + n + (n === 1 ? " producto" : " productos") + ". Primero movelos a otra categoría.", true);
    confirmar("¿Eliminar “" + k.nombre + "”?", "Está vacía, así que no se pierde ningún producto.", "Eliminar", true, function () { S.cat.categorias = S.cat.categorias.filter(function (x) { return x.id !== id; }); normOrden(S.cat.categorias); render(); });
  }

  /* ---------- copia de seguridad ---------- */
  function bajarCopia() {
    if (DEMO) return toast("En la vista de ejemplo no se descarga. En tu panel real baja un archivo con todo el catálogo.");
    var blob = new Blob([JSON.stringify(S.cat, null, 1)], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "copia-" + (slug(S.cat.config.nombre) || "almacen") + "-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  $("#restaurar").addEventListener("change", function () {
    var f = this.files && this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(String(r.result));
        if (!d || !Array.isArray(d.productos) || !Array.isArray(d.categorias) || !d.productos.length) throw new Error("x");
        confirmar("¿Cargar esta copia?", "Reemplaza lo que estás viendo por " + d.productos.length + " productos de la copia. Después tenés que tocar “Guardar cambios”.", "Cargar copia", false, function () { S.cat = normalizar(d); render(); toast("Copia cargada. Falta guardar."); });
      } catch (e) { toast("Ese archivo no es una copia válida.", true); }
    };
    r.readAsText(f);
  });

  /* ---------- arranque ---------- */
  var guardada = DEMO ? null : ss("dm_clave");
  if (guardada) {
    S.clave = guardada; $("#login").hidden = true;
    api("/api/admin/ping").then(function (info) { S.info = info; return cargar(); }).then(entrar).catch(function (e) { mostrarLogin(e.message); });
  } else mostrarLogin("");
})();
