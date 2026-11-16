// Revisión del archivo de un comprobante. Funciones puras (sin Deno ni red) para poder probarlas.
// No lee el contenido de la transferencia: solo confirma que sea de verdad una imagen o PDF razonable.

export const MAX_BYTES = 5 * 1024 * 1024;
export const MIN_BYTES = 3 * 1024;
export const MIN_LADO = 200; // píxeles

export type Resultado =
  | { ok: true; mime: string; ext: string; bytes: number; senales: Record<string, unknown> }
  | { ok: false; error: string };

const igual = (b: Uint8Array, desde: number, firma: number[]) => firma.every((v, i) => b[desde + i] === v);
const texto = (b: Uint8Array, desde: number, n: number) => String.fromCharCode(...b.slice(desde, desde + n));

function dimensionesPng(b: Uint8Array): [number, number] | null {
  if (b.length < 24 || texto(b, 12, 4) !== "IHDR") return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return [v.getUint32(16), v.getUint32(20)];
}

function dimensionesJpeg(b: Uint8Array): [number, number] | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const largo = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return [(b[i + 7] << 8) | b[i + 8], (b[i + 5] << 8) | b[i + 6]];
    }
    i += 2 + largo;
  }
  return null;
}

function dimensionesWebp(b: Uint8Array): [number, number] | null {
  if (b.length < 30) return null;
  const tipo = texto(b, 12, 4);
  if (tipo === "VP8X") return [1 + (b[24] | (b[25] << 8) | (b[26] << 16)), 1 + (b[27] | (b[28] << 8) | (b[29] << 16))];
  if (tipo === "VP8 ") return [(b[26] | (b[27] << 8)) & 0x3fff, (b[28] | (b[29] << 8)) & 0x3fff];
  if (tipo === "VP8L") {
    const n = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1];
  }
  return null;
}

/** Revisa el archivo real (no confía en el tipo que declaró el navegador). */
export function validarArchivo(b: Uint8Array, mimeDeclarado = ""): Resultado {
  if (b.length > MAX_BYTES) return { ok: false, error: "El archivo pesa más de 5 MB." };
  if (b.length < MIN_BYTES) return { ok: false, error: "El archivo es demasiado pequeño para ser un comprobante." };

  let mime = "";
  let dim: [number, number] | null = null;
  if (igual(b, 0, [0xff, 0xd8, 0xff])) { mime = "image/jpeg"; dim = dimensionesJpeg(b); }
  else if (igual(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) { mime = "image/png"; dim = dimensionesPng(b); }
  else if (texto(b, 0, 4) === "RIFF" && texto(b, 8, 4) === "WEBP") { mime = "image/webp"; dim = dimensionesWebp(b); }
  else if (texto(b, 0, 5) === "%PDF-") mime = "application/pdf";
  else return { ok: false, error: "Sube una foto (JPG, PNG, WEBP) o un PDF." };

  const senales: Record<string, unknown> = { mime_declarado: mimeDeclarado.slice(0, 40), mime_real: mime };
  if (mimeDeclarado && mimeDeclarado !== mime) senales.mime_distinto = true;

  if (mime === "application/pdf") {
    const cola = texto(b, Math.max(0, b.length - 1100), Math.min(1100, b.length));
    if (!cola.includes("%%EOF")) return { ok: false, error: "El PDF está incompleto o dañado." };
    const cabeza = texto(b, 0, Math.min(b.length, 200000));
    // Un PDF con código activo no es un comprobante.
    if (/\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(cabeza)) return { ok: false, error: "Ese PDF no es válido. Sube una foto o captura del comprobante." };
    return { ok: true, mime, ext: "pdf", bytes: b.length, senales };
  }

  if (!dim) return { ok: false, error: "No pudimos leer la imagen. Sube otra captura o foto." };
  const [w, h] = dim;
  senales.ancho = w;
  senales.alto = h;
  if (w < MIN_LADO || h < MIN_LADO) return { ok: false, error: "La imagen es muy pequeña. Sube la captura completa del comprobante." };
  if (w > 12000 || h > 12000) return { ok: false, error: "La imagen es demasiado grande." };
  if (mime === "image/jpeg") senales.tiene_exif = b.slice(0, 4000).some((v, i, a) => v === 0x45 && a[i + 1] === 0x78 && a[i + 2] === 0x69 && a[i + 3] === 0x66);
  return { ok: true, mime, ext: mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg", bytes: b.length, senales };
}

export async function sha256(b: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", b));
  return Array.from(h, (x) => x.toString(16).padStart(2, "0")).join("");
}

export const ipDe = (cabeceras: Headers): string =>
  (cabeceras.get("cf-connecting-ip") ?? (cabeceras.get("x-forwarded-for") ?? "").split(",")[0] ?? "").trim();
