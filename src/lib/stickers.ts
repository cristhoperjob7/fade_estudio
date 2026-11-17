/**
 * Emoticones del chat: caritas animadas pequeñas. Cada una es un dibujo SVG (24×24) propio.
 * La clave que se guarda en el mensaje es «pack:nombre» (ej: pro:cool).
 */
const OJO = "#5b3a00";
const TRAZO = `stroke="${OJO}" fill="none" stroke-width="1.5" stroke-linecap="round"`;
const CORAZON = "M0 1.7C-3.2-.8-2.2-3.4 0-1.9 2.2-3.4 3.2-.8 0 1.7z";
const ESTRELLA = "M0 -2.8l.8 1.9 2.1.2-1.6 1.4.5 2.1-1.8-1.1-1.8 1.1.5-2.1-1.6-1.4 2.1-.2z";
const SONRISA = `<path d="M7.2 14q4.8 4.6 9.6 0" ${TRAZO}/>`;
const OJOS = `<circle cx="8.4" cy="10.4" r="1.4" fill="${OJO}"/><circle cx="15.6" cy="10.4" r="1.4" fill="${OJO}"/>`;
const OJOS_FELIZ = `<path d="M6.8 10.8q1.7-2.6 3.4 0M13.8 10.8q1.7-2.6 3.4 0" ${TRAZO}/>`;
const chispa = (x: number, y: number, c = "#fff", d = 0) =>
  `<path class="a-tw" style="animation-delay:${d}s" d="M${x} ${y - 2.2}l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" fill="${c}"/>`;

/** Cara redonda con degradado; lo que va fuera (sombreros, coronas) se dibuja aparte. */
const cara = (g: string, dentro: string, anim = "", fuera = "", antes = "") =>
  `${antes}<g transform="translate(12 13.2) scale(.92) translate(-12 -12)"><g class="${anim}"><circle cx="12" cy="12" r="10.5" fill="url(#${g})" stroke="#0004" stroke-width=".7"/>${dentro}</g></g>${fuera}`;

export const DIBUJOS: Record<string, string> = {
  /* ---------- Básicos ---------- */
  sonrisa: cara("gYel", `${OJOS}${SONRISA}`),
  feliz: cara("gYel", `${OJOS_FELIZ}<path d="M6.8 13.6h10.4a5.2 5.2 0 0 1-10.4 0z" fill="#5b1a1a"/>`),
  triste: cara("gYel", `${OJOS}<path d="M8.4 17.2q3.6-3 7.2 0" ${TRAZO}/>`),
  serio: cara("gYel", `${OJOS}<path d="M8.4 16h7.2" ${TRAZO}/>`),
  asombro: cara("gYel", `${OJOS}<ellipse cx="12" cy="16.4" rx="1.8" ry="2.2" fill="#5b1a1a"/>`),
  ojitos: cara("gYel", `<circle cx="8.4" cy="10.4" r="2.3" fill="#fff" stroke="${OJO}" stroke-width=".6"/><circle cx="15.6" cy="10.4" r="2.3" fill="#fff" stroke="${OJO}" stroke-width=".6"/><circle cx="9" cy="10.8" r="1" fill="${OJO}"/><circle cx="16.2" cy="10.8" r="1" fill="${OJO}"/>${SONRISA}`),

  /* ---------- Pro ---------- */
  risa: cara("gYel", `<path d="M7 10.4q2-2.8 4 0M13 10.4q2-2.8 4 0" ${TRAZO}/><path d="M6.6 13.6h10.8a5.4 5.4 0 0 1-10.8 0z" fill="#5b1a1a"/><path d="M9 18q3-2.2 6 0" fill="#ff6b81"/>`, "a-bounce"),
  guino: cara("gYel", `<circle cx="8.4" cy="10" r="1.5" fill="${OJO}"/><path class="a-blink" d="M14 10h3.4" ${TRAZO}/>${SONRISA}<path d="M13 16.4q1.8 3 3.2.6z" fill="#ff6b81"/>`),
  enamorado: cara("gYel", `<g transform="translate(8.2 10.3)" class="a-beat"><path d="${CORAZON}" fill="#ff2d55"/></g><g transform="translate(15.8 10.3)" class="a-beat"><path d="${CORAZON}" fill="#ff2d55"/></g>${SONRISA}`),
  cool: cara("gYel", `<path d="M4.2 8.6h15.6v2.6a3 3 0 0 1-3 3h-2.4a3 3 0 0 1-3-2.6h-1.4a3 3 0 0 1-3 2.6H7.2a3 3 0 0 1-3-3z" fill="#141414"/><g clip-path="url(#cGafas)"><path class="a-sh" d="M5 8l2-1 4 7-2 1z" fill="#fff" opacity=".5"/></g><path d="M8 16.2q4 2.8 8 0" ${TRAZO}/>`),
  llora: cara("gYel", `<path d="M6.8 10.8q1.8-2.2 3.6 0M13.6 10.8q1.8-2.2 3.6 0" ${TRAZO}/><path class="a-tear" d="M8.4 12.4q-1.6 2.8 0 3.5 1.6-.7 0-3.5z" fill="#4db8ff"/><path class="a-tear" style="animation-delay:.5s" d="M15.6 12.4q-1.6 2.8 0 3.5 1.6-.7 0-3.5z" fill="#4db8ff"/><path d="M8.4 17.4q3.6-3 7.2 0" ${TRAZO}/>`),
  enojo: cara("gRed", `<path d="M5.6 7.2l4.6 2.2M18.4 7.2l-4.6 2.2" stroke="#3b0606" stroke-width="1.7" stroke-linecap="round"/><circle cx="8.5" cy="11" r="1.3" fill="#3b0606"/><circle cx="15.5" cy="11" r="1.3" fill="#3b0606"/><path d="M8 17.4q4-3.4 8 0" stroke="#3b0606" fill="none" stroke-width="1.6" stroke-linecap="round"/>`, "a-shake"),
  beso: cara("gYel", `<circle cx="8.4" cy="10" r="1.4" fill="${OJO}"/><path d="M14 10.4q1.7-2.2 3.4 0" ${TRAZO}/><ellipse cx="12" cy="15.8" rx="2.2" ry="1.6" fill="#ff3b5c"/>`, "", `<g class="a-float"><path transform="translate(20 6)" d="${CORAZON}" fill="#ff2d55"/></g>`),
  fiesta: cara("gYel", `<path d="M7 10.6q2-2.6 4 0M13 10.6q2-2.6 4 0" ${TRAZO}/><path d="M7 14q5 5 10 0z" fill="#5b1a1a"/>`, "", `<path d="M12 .6 8.4 6.4h7.2z" fill="#ff4fa3" stroke="#0004" stroke-width=".5"/><circle class="a-tw" cx="4" cy="6" r="1.1" fill="#3bb4ff"/><circle class="a-tw" style="animation-delay:.4s" cx="20" cy="5" r="1.1" fill="#4be37a"/><rect class="a-tw" style="animation-delay:.8s" x="18.4" y="14.4" width="2" height="2" fill="#ff5b5b"/>`),
  sorpresa: cara("gYel", `<path d="M6 6.6q2.4-1.4 4.6 0M13.4 6.6q2.4-1.4 4.6 0" ${TRAZO}/><circle cx="8.4" cy="10.4" r="2.2" fill="#fff" stroke="${OJO}" stroke-width=".6"/><circle cx="15.6" cy="10.4" r="2.2" fill="#fff" stroke="${OJO}" stroke-width=".6"/><circle cx="8.4" cy="10.4" r="1" fill="${OJO}"/><circle cx="15.6" cy="10.4" r="1" fill="${OJO}"/><ellipse class="a-pulse" cx="12" cy="16.6" rx="2" ry="2.6" fill="#5b1a1a"/>`),
  sueno: cara("gYel", `<path d="M6.8 10.4q1.7 1.8 3.4 0M13.8 10.4q1.7 1.8 3.4 0" ${TRAZO}/><ellipse cx="12" cy="16" rx="1.4" ry="1.1" fill="#5b1a1a"/>`, "", `<text class="a-float" x="17" y="7" font-size="7" font-weight="800" fill="#7aa8ff">z</text><text class="a-float" style="animation-delay:.7s" x="20" y="4" font-size="5" font-weight="800" fill="#7aa8ff">z</text>`),
  pensando: cara("gYel", `<path d="M5.8 7.2h4.4M13.6 6q2.4-1 4.4.4" ${TRAZO}/><circle cx="8.4" cy="10.4" r="1.4" fill="${OJO}"/><circle cx="15.6" cy="10" r="1.4" fill="${OJO}"/><path d="M8.5 16.4q1.5-1.2 3 0t3 0" ${TRAZO}/>`, "", `<text class="a-float" x="18" y="7" font-size="7" font-weight="800" fill="#7aa8ff">?</text>`),
  rubor: cara("gYel", `${OJOS_FELIZ}<ellipse class="a-pulse" cx="6" cy="13.8" rx="2" ry="1.2" fill="#ff7a9a" opacity=".8"/><ellipse class="a-pulse" cx="18" cy="13.8" rx="2" ry="1.2" fill="#ff7a9a" opacity=".8"/><path d="M9.6 15.4q2.4 2 4.8 0" ${TRAZO}/>`),
  lengua: cara("gYel", `<path d="M6.8 8.6l3 1.6-3 1.6M17.2 8.6l-3 1.6 3 1.6" ${TRAZO}/><path d="M7 14q5 4 10 0z" fill="#5b1a1a"/><path class="a-bounce" d="M10 15.6h4v2.8a2 2 0 0 1-4 0z" fill="#ff6b81"/>`),
  miedo: cara("gYel", `<circle cx="8.4" cy="10" r="2.3" fill="#fff" stroke="${OJO}" stroke-width=".6"/><circle cx="15.6" cy="10" r="2.3" fill="#fff" stroke="${OJO}" stroke-width=".6"/><circle cx="8.4" cy="10.4" r=".8" fill="${OJO}"/><circle cx="15.6" cy="10.4" r=".8" fill="${OJO}"/><path d="M7.4 17l1.5-1.5 1.5 1.5 1.6-1.5 1.5 1.5 1.5-1.5 1.5 1.5" ${TRAZO}/>`, "a-shiver", `<path class="a-tear" d="M20 7q-1.6 2.6 0 3.4 1.6-.8 0-3.4z" fill="#4db8ff"/>`),
  lol: cara("gYel", `<path d="M6.8 8.6l3 1.6-3 1.6M17.2 8.6l-3 1.6 3 1.6" ${TRAZO}/><path d="M6.6 13.4h10.8a5.4 5.4 0 0 1-10.8 0z" fill="#5b1a1a"/><path class="a-tear" d="M4.6 11q-1.8 2.2 0 3 1.8-.8 0-3z" fill="#4db8ff"/><path class="a-tear" style="animation-delay:.4s" d="M19.4 11q-1.8 2.2 0 3 1.8-.8 0-3z" fill="#4db8ff"/>`, "a-bounce"),
  barba: cara("gYel", `${OJOS}<path d="M3 12.8c.6 8 4.4 10.2 9 10.2s8.4-2.2 9-10.2c-1.8 1.8-4 2.4-9 2.4s-7.2-.6-9-2.4z" fill="#5a3a1e"/><path d="M9.4 16.4q2.6 2 5.2 0" stroke="#fff" fill="none" stroke-width="1.3" stroke-linecap="round"/>`),
  bigote: cara("gYel", `${OJOS}<path class="a-bounce" d="M12 14.6c-1.2-1.6-3.2-2.2-5.4-.8 1 3 3.8 3.2 5.4 1.6 1.6 1.6 4.4 1.4 5.4-1.6-2.2-1.4-4.2-.8-5.4.8z" fill="#3a2410"/>`),
  peinado: cara("gYel", `${OJOS}${SONRISA}`, "", `<path d="M3.2 9C2.6 3.4 7.6 1 12 2.4c4.4-1.4 9.4 1 8.8 6.6-2.2-2.8-5.2-3.6-8.8-3.6S5.4 6.2 3.2 9z" fill="#3a2410" stroke="#0006" stroke-width=".4"/><path class="a-sh" d="M8 3.4h2l3 3h-2z" fill="#fff" opacity=".35"/>`),
  angel: cara("gYel", `${OJOS_FELIZ}<path d="M8.6 15q3.4 2.6 6.8 0" ${TRAZO}/>`, "", `<ellipse class="a-bounce" cx="12" cy="2.2" rx="4.6" ry="1.5" fill="none" stroke="#ffd93d" stroke-width="1.4"/>`),
  diablo: cara("gRed", `<path d="M6 8.6l3.6 1.6M18 8.6l-3.6 1.6" stroke="#3b0606" stroke-width="1.6" stroke-linecap="round"/><circle cx="8.4" cy="11.2" r="1.2" fill="#3b0606"/><circle cx="15.6" cy="11.2" r="1.2" fill="#3b0606"/><path d="M7 14.6q5 4.4 10 0z" fill="#3b0606"/>`, "", `<path d="M5 6 3.4 1 8.6 3.6zM19 6l1.6-5L15.4 3.6z" fill="#c01818" stroke="#5a0808" stroke-width=".5"/>`),

  /* ---------- VIP ---------- */
  rey: cara("gYel", `<circle cx="8.4" cy="11.2" r="1.4" fill="${OJO}"/><circle cx="15.6" cy="11.2" r="1.4" fill="${OJO}"/><path d="M7.2 15q4.8 4.6 9.6 0" ${TRAZO}/>`, "", `<path d="M5.5 7.4 7 2.4l3 2.6 2-3.4 2 3.4 3-2.6 1.5 5z" fill="#ffcc33" stroke="#8a5a00" stroke-width=".7" stroke-linejoin="round"/>${chispa(12, 3.8)}`),
  reina: cara("gYel", `<path d="M6 8.4 4.6 7.6M8.4 8.2V6.8M10.8 8.6l1-1M13.2 8.6l-1-1M15.6 8.2V6.8M18 8.4l1.4-.8" stroke="${OJO}" stroke-width=".9" stroke-linecap="round"/><circle cx="8.4" cy="11" r="1.4" fill="${OJO}"/><circle cx="15.6" cy="11" r="1.4" fill="${OJO}"/><path d="M8.6 15.4q3.4 3 6.8 0z" fill="#e0203c"/>`, "", `<path d="M5.5 7.4 7 2.4l3 2.6 2-3.4 2 3.4 3-2.6 1.5 5z" fill="#ff8ad2" stroke="#9a2a78" stroke-width=".7" stroke-linejoin="round"/><circle class="a-pulse" cx="12" cy="5.6" r="1" fill="#fff"/>`),
  diamantes: cara("gYel", `<path class="a-pulse" d="M8.4 7.4l2.2 2.6-2.2 2.8-2.2-2.8z" fill="#5be3ff" stroke="#0a6a8a" stroke-width=".6"/><path class="a-pulse" d="M15.6 7.4l2.2 2.6-2.2 2.8-2.2-2.8z" fill="#5be3ff" stroke="#0a6a8a" stroke-width=".6"/>${SONRISA}${chispa(19, 5)}${chispa(5, 6, "#fff", 0.6)}`),
  galaxia: cara("gPurp", `${chispa(7, 6)}${chispa(17, 8, "#cfe", 0.5)}${chispa(14, 19, "#fff", 0.9)}${chispa(6, 16, "#cfe", 0.3)}<circle cx="8.4" cy="11" r="1.5" fill="#fff"/><circle cx="15.6" cy="11" r="1.5" fill="#fff"/><path d="M8 15.4q4 3.4 8 0" stroke="#fff" fill="none" stroke-width="1.4" stroke-linecap="round"/>`),
  fuego: cara("gFire", `<path d="M7 11q2-2.6 4 0M13 11q2-2.6 4 0" ${TRAZO}/><path d="M7.6 14.6h8.8a4.4 4.4 0 0 1-8.8 0z" fill="#5b1a1a"/>`, "", `<path class="a-flick" d="M12 .6c1 2.2 3.4 3 3.4 5.4a3.4 3.4 0 0 1-6.8 0c0-1.2.8-2 1.4-2.6 0 1.2.8 1.8 1.4 1.8 0-1.8-.8-2.6.6-4.6z" fill="#ff7a1a" stroke="#a02800" stroke-width=".5"/>`),
  hielo: cara("gIce", `<circle cx="8.4" cy="11" r="1.4" fill="#16467a"/><circle cx="15.6" cy="11" r="1.4" fill="#16467a"/><path d="M8 16.2h8M9 16.2l.6 1.4M12 16.2v1.6M15 16.2l-.6 1.4" stroke="#16467a" stroke-width="1.2" fill="none" stroke-linecap="round"/>${chispa(5, 6)}${chispa(19, 17, "#fff", 0.7)}`, "a-shiver"),
  arcoiris: cara("gRain", `<circle cx="8.4" cy="10.6" r="1.6" fill="#fff"/><circle cx="15.6" cy="10.6" r="1.6" fill="#fff"/><path d="M7.2 14.4q4.8 4.6 9.6 0" stroke="#fff" fill="none" stroke-width="1.6" stroke-linecap="round"/>`, "a-hue"),
  millonario: cara("gMon", `<text x="8.4" y="12.6" font-size="7" font-weight="900" text-anchor="middle" fill="#fff7a0" stroke="#7a5a00" stroke-width=".3">$</text><text x="15.6" y="12.6" font-size="7" font-weight="900" text-anchor="middle" fill="#fff7a0" stroke="#7a5a00" stroke-width=".3">$</text><path d="M7.4 14.4q4.6 4.4 9.2 0z" fill="#fff"/><path d="M12 15.6q2 3 3.4.8z" fill="#ff6b81"/>`, "a-bounce"),
  robot: cara("gRob", `<rect class="a-blink" x="6" y="8.6" width="4.4" height="4" rx="1" fill="#27d6ff"/><rect class="a-blink" x="13.6" y="8.6" width="4.4" height="4" rx="1" fill="#27d6ff"/><path d="M7.6 16.4h8.8M10 15.2v2.4M12 15.2v2.4M14 15.2v2.4" stroke="#3a4560" stroke-width="1.1"/><path d="M12 1.4v3" stroke="#3a4560" stroke-width="1.2"/><circle class="a-pulse" cx="12" cy="1.4" r="1.2" fill="#ff4d6a"/>`),
  alien: cara("gAli", `<path d="M4.4 8.6q3.4-1.2 5.8 2.6-3.2 2-5.8-2.6zM19.6 8.6q-3.4-1.2-5.8 2.6 3.2 2 5.8-2.6z" fill="#10241a"/><circle class="a-tw" cx="7.2" cy="10" r=".7" fill="#fff"/><circle class="a-tw" style="animation-delay:.5s" cx="16.8" cy="10" r=".7" fill="#fff"/><path d="M10 16.4q2 1.2 4 0" stroke="#10241a" fill="none" stroke-width="1.3" stroke-linecap="round"/>`, "a-bounce"),
  fantasma: cara("gGho", `<ellipse cx="8.4" cy="10.6" rx="1.5" ry="2.1" fill="#1a1a2e"/><ellipse cx="15.6" cy="10.6" rx="1.5" ry="2.1" fill="#1a1a2e"/><ellipse class="a-pulse" cx="12" cy="16.4" rx="1.6" ry="2.1" fill="#1a1a2e"/>`, "a-fly"),
  calavera: cara("gBone", `<circle cx="8.4" cy="10.6" r="2.7" fill="#14141c"/><circle cx="15.6" cy="10.6" r="2.7" fill="#14141c"/><circle class="a-pulse" cx="8.4" cy="10.6" r=".9" fill="#ff3b3b"/><circle class="a-pulse" cx="15.6" cy="10.6" r=".9" fill="#ff3b3b"/><path d="M12 13.2l-1.1 2.2h2.2z" fill="#14141c"/><path d="M7.6 18h8.8M10 16.8v2.4M12 16.8v2.4M14 16.8v2.4" stroke="#14141c" stroke-width="1" fill="none"/>`),
  oro: cara("gOro", `${OJOS}${SONRISA}<g clip-path="url(#cCara)"><path class="a-sh" d="M5 4l3-1 6 17-3 1z" fill="#fff" opacity=".55"/></g>`),
  rayo: cara("gYel", `<path class="a-flash" d="M9.8 6 6.4 10.6h2.2l-.8 3.6 3.6-4.8H9.2z" fill="#ff9d00" stroke="#8a4a00" stroke-width=".4"/><path class="a-flash" d="M17.6 6l-3.4 4.6h2.2l-.8 3.6 3.6-4.8h-2.2z" fill="#ff9d00" stroke="#8a4a00" stroke-width=".4"/>${SONRISA}`),
  estrellas: cara("gYel", `<g transform="translate(8.4 10.4)"><path class="a-spin" d="${ESTRELLA}" fill="#ff4fa3"/></g><g transform="translate(15.6 10.4)"><path class="a-spin" d="${ESTRELLA}" fill="#ff4fa3"/></g><path d="M7.2 14q4.8 4.6 9.6 0z" fill="#5b1a1a"/>${chispa(19, 5)}`),
  sol: cara("gSun", `${OJOS_FELIZ}<path d="M8.6 14.6q3.4 3.6 6.8 0" ${TRAZO}/>`, "", "", `<g class="a-spin" style="transform-origin:12px 13.2px"><path d="M12 .8v2.6M12 23v2.6M-.4 13.2H2.2M21.8 13.2h2.6M3.2 4.4l1.8 1.8M19 20.2l1.8 1.8M20.8 4.4 19 6.2M5 20.2 3.2 22" stroke="#ffb300" stroke-width="1.7" stroke-linecap="round"/></g>`),
  luna: cara("gMoon", `<circle cx="16.4" cy="15.4" r="2" fill="#0002"/><circle cx="6.4" cy="14.6" r="1.4" fill="#0002"/><circle cx="14" cy="5.6" r="1.2" fill="#0002"/><path d="M6.8 10.4q1.7 1.8 3.4 0M13.8 10.4q1.7 1.8 3.4 0" stroke="#3a3470" fill="none" stroke-width="1.4" stroke-linecap="round"/><path d="M9.6 15.6q2.4 1.8 4.8 0" stroke="#3a3470" fill="none" stroke-width="1.4" stroke-linecap="round"/>`, "", `${chispa(3, 4, "#fff")}${chispa(21, 9, "#ffe98a", 0.6)}`),
  cyber: cara("gDark", `<rect x="4" y="8.4" width="16" height="4.2" rx="2.1" fill="#0b2a33"/><g clip-path="url(#cVisor)"><rect class="a-sh" x="6" y="8" width="3" height="5" fill="#27d6ff"/></g><rect class="a-pulse" x="4" y="8.4" width="16" height="4.2" rx="2.1" fill="none" stroke="#27d6ff" stroke-width=".8"/><path d="M8.6 16.8h6.8" stroke="#27d6ff" stroke-width="1.2" stroke-linecap="round"/>`),
  vampiro: cara("gPale", `<circle cx="8.4" cy="10.8" r="1.5" fill="#d3122a"/><circle cx="15.6" cy="10.8" r="1.5" fill="#d3122a"/><path d="M8 15.2q4 2.2 8 0" stroke="#3a1020" fill="none" stroke-width="1.3" stroke-linecap="round"/><path d="M9.4 15.8l.8 2.6.8-2.6zM15 15.8l-.8 2.6-.8-2.6z" fill="#fff" stroke="#0005" stroke-width=".4"/>`, "", `<path d="M3.2 9C3.4 3 8 1.6 12 3c4-1.4 8.6 0 8.8 6-2.4-3.2-5.6-3.4-8.8-3.4S5.6 5.8 3.2 9z" fill="#14101c"/><path class="a-tear" d="M16.6 16q-1.4 2.2 0 3 1.4-.8 0-3z" fill="#d3122a"/>`),
  mago: cara("gYel", `<circle cx="8.4" cy="10.8" r="1.3" fill="${OJO}"/><circle cx="15.6" cy="10.8" r="1.3" fill="${OJO}"/><path d="M7 14c.6 5.4 2.6 7.6 5 7.6s4.4-2.2 5-7.6c-1.6 1-3 1.4-5 1.4s-3.4-.4-5-1.4z" fill="#fff" stroke="#0003" stroke-width=".5"/>`, "", `<path d="M12 .2 6.2 7.6h11.6z" fill="#6b3ae0" stroke="#2a1470" stroke-width=".5"/><rect x="4.6" y="7" width="14.8" height="1.8" rx=".9" fill="#4a2bb8"/><circle class="a-tw" cx="11" cy="4.6" r=".7" fill="#ffe98a"/><circle class="a-tw" style="animation-delay:.6s" cx="13.4" cy="6" r=".6" fill="#ffe98a"/>`),
};

/** Dibujos que necesitan degradados: se declaran una vez en la página del chat. */
export const DEFS = `
<radialGradient id="gYel" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff6a0"/><stop offset=".55" stop-color="#ffd21f"/><stop offset="1" stop-color="#e59a00"/></radialGradient>
<radialGradient id="gRed" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ff9a8a"/><stop offset=".6" stop-color="#f03a2a"/><stop offset="1" stop-color="#a30f12"/></radialGradient>
<radialGradient id="gPurp" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#9a7dff"/><stop offset=".6" stop-color="#4a2bb8"/><stop offset="1" stop-color="#1c0e55"/></radialGradient>
<radialGradient id="gFire" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="#fff0a0"/><stop offset=".5" stop-color="#ffa21f"/><stop offset="1" stop-color="#e03a00"/></radialGradient>
<radialGradient id="gIce" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#f2fcff"/><stop offset=".55" stop-color="#8fd8ff"/><stop offset="1" stop-color="#3a8fe0"/></radialGradient>
<radialGradient id="gMon" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#a9ffbf"/><stop offset=".6" stop-color="#2fcf6a"/><stop offset="1" stop-color="#0c8a3c"/></radialGradient>
<radialGradient id="gRob" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#b8c3d6"/><stop offset="1" stop-color="#6d7a92"/></radialGradient>
<radialGradient id="gAli" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#d4ffb8"/><stop offset=".6" stop-color="#4bcf3a"/><stop offset="1" stop-color="#1a7a22"/></radialGradient>
<radialGradient id="gGho" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#dfe6ff"/><stop offset="1" stop-color="#a9b6ee"/></radialGradient>
<radialGradient id="gBone" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#ebe2c9"/><stop offset="1" stop-color="#b9ad8e"/></radialGradient>
<radialGradient id="gOro" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff6b0"/><stop offset=".55" stop-color="#ffc61a"/><stop offset="1" stop-color="#a8700a"/></radialGradient>
<radialGradient id="gSun" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="#fffbb0"/><stop offset=".55" stop-color="#ffd21f"/><stop offset="1" stop-color="#ff9a00"/></radialGradient>
<radialGradient id="gMoon" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fffdf0"/><stop offset=".6" stop-color="#e6e0f8"/><stop offset="1" stop-color="#9d92d8"/></radialGradient>
<radialGradient id="gPale" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f3e3ea"/><stop offset="1" stop-color="#c9aab6"/></radialGradient>
<radialGradient id="gDark" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#6d7ea6"/><stop offset=".6" stop-color="#2c3652"/><stop offset="1" stop-color="#10141f"/></radialGradient>
<linearGradient id="gRain" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5b5b"/><stop offset=".25" stop-color="#ffd21f"/><stop offset=".5" stop-color="#4be37a"/><stop offset=".75" stop-color="#3bb4ff"/><stop offset="1" stop-color="#b45bff"/></linearGradient>
<clipPath id="cGafas"><path d="M4.2 8.6h15.6v2.6a3 3 0 0 1-3 3h-2.4a3 3 0 0 1-3-2.6h-1.4a3 3 0 0 1-3 2.6H7.2a3 3 0 0 1-3-3z"/></clipPath>
<clipPath id="cCara"><circle cx="12" cy="12" r="10.5"/></clipPath>
<clipPath id="cVisor"><rect x="4" y="8.4" width="16" height="4.2" rx="2.1"/></clipPath>
<linearGradient id="pR" gradientUnits="userSpaceOnUse" x1="-8" y1="0" x2="2" y2="10"><stop offset="0" stop-color="#d81f26"/><stop offset=".45" stop-color="#ff5a5a"/><stop offset=".5" stop-color="#fff"/><stop offset=".55" stop-color="#ff5a5a"/><stop offset="1" stop-color="#b3121a"/><animateTransform attributeName="gradientTransform" type="translate" values="0 0;22 0;22 0" keyTimes="0;.5;1" dur="2.4s" repeatCount="indefinite"/></linearGradient>
<linearGradient id="pO" gradientUnits="userSpaceOnUse" x1="-8" y1="0" x2="2" y2="10"><stop offset="0" stop-color="#d49a00"/><stop offset=".45" stop-color="#ffd24a"/><stop offset=".5" stop-color="#fffbe0"/><stop offset=".55" stop-color="#ffd24a"/><stop offset="1" stop-color="#c08400"/><animateTransform attributeName="gradientTransform" type="translate" values="0 0;22 0;22 0" keyTimes="0;.5;1" dur="2.8s" repeatCount="indefinite"/></linearGradient>
<linearGradient id="pV" gradientUnits="userSpaceOnUse" x1="-8" y1="0" x2="2" y2="10"><stop offset="0" stop-color="#7ad8ff"/><stop offset=".4" stop-color="#b58cff"/><stop offset=".5" stop-color="#fff"/><stop offset=".6" stop-color="#8fe3ff"/><stop offset="1" stop-color="#7a5cff"/><animateTransform attributeName="gradientTransform" type="translate" values="0 0;22 0;22 0" keyTimes="0;.5;1" dur="2.2s" repeatCount="indefinite"/></linearGradient>
<linearGradient id="pB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb0ff"/><stop offset="1" stop-color="#2f62cf"/></linearGradient>`;

export const NOMBRES: Record<string, string> = {
  sonrisa: "Sonrisa", feliz: "Feliz", triste: "Triste", serio: "Serio", asombro: "Asombro", ojitos: "Ojitos",
  risa: "Risa", guino: "Guiño", enamorado: "Enamorado", cool: "Cool", llora: "Llorando", enojo: "Enojo", beso: "Beso", fiesta: "Fiesta",
  sorpresa: "Sorpresa", sueno: "Sueño", pensando: "Pensando", rubor: "Rubor", lengua: "Lengua", miedo: "Miedo", lol: "Jajaja",
  barba: "Barba", bigote: "Bigote", peinado: "Peinado", angel: "Ángel", diablo: "Diablo",
  rey: "Rey", reina: "Reina", diamantes: "Diamantes", galaxia: "Galaxia", fuego: "Fuego", hielo: "Hielo", arcoiris: "Arcoíris",
  millonario: "Millonario", robot: "Robot", alien: "Alien", fantasma: "Fantasma", calavera: "Calavera", oro: "Oro", rayo: "Rayo",
  estrellas: "Estrellas", sol: "Sol", luna: "Luna", cyber: "Cyber", vampiro: "Vampiro", mago: "Mago",
};
