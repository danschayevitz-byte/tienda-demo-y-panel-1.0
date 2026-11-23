/* Subir la foto de un producto (el panel ya la achica a ~900 px antes de mandarla). */
"use strict";
const N = require("../../lib/nucleo");
const almacen = require("../../lib/almacen");

const TIPOS = { "image/webp": (b) => b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP", "image/png": (b) => b[0] === 0x89 && b.slice(1, 4).toString() === "PNG", "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 };

module.exports = N.envolver(["POST"], async (req, res) => {
  await N.autorizado(req);
  const b = await N.cuerpo(req);
  const tipo = String(b.tipo || "");
  if (!TIPOS[tipo]) throw N.error("La foto tiene que ser JPG, PNG o WEBP.");
  const buf = Buffer.from(String(b.datos || ""), "base64");
  if (buf.length < 200 || buf.length > 2.5 * 1024 * 1024) throw N.error("La foto es muy grande o está vacía (máximo 2,5 MB).");
  if (!TIPOS[tipo](buf)) throw N.error("El archivo no parece una foto válida.");
  const url = await almacen.subirImagen(b.nombre, buf, tipo);
  N.responder(res, 200, { ok: true, url });
});
