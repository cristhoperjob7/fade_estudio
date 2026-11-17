import CodigoDescuento from "../components/CodigoDescuento";
import type { CodigoValido } from "../components/CodigoDescuento";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { configurado, supabase } from "../lib/supabase";
import { enlaceWhatsapp } from "../lib/whatsapp";
import { DIAS_PRUEBA, usePlanes } from "../lib/planes";
import type { PlanClave } from "../lib/planes";
import { NOMBRES_REGION, REGIONES } from "../lib/chile";
import { DOMINIOS_CORREO, limpiar, soloOchoDigitos, validarBarberia, validarCelular, validarCorreo, validarNombre, validarObligatorio } from "../lib/validacion";
import { CabeceraPortada, Ic, PiePortada } from "../components/Portada";
import "../styles/landing.css";
import "../styles/contratar.css";

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");
type Ciclo = "mensual" | "anual" | "prueba";
type Campo = "nombre" | "apellido" | "barberia" | "celular" | "sexo" | "correo" | "region" | "comuna";
/** Orden de los campos en pantalla (sirve para llevar el cursor al primer error). */
const ORDEN: Campo[] = ["nombre", "apellido", "barberia", "celular", "sexo", "correo", "region", "comuna"];

const CLAVES: PlanClave[] = ["basico", "pro", "vip"];
const esPlan = (x: string | null): x is PlanClave => !!x && (CLAVES as string[]).includes(x);
const esCiclo = (x: string | null): x is Ciclo => x === "mensual" || x === "anual" || x === "prueba";
const clp = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

/** Proceso de contratación: un solo formulario con tus datos. */
export default function Contratar() {
  const [q] = useSearchParams();
  const precios = usePlanes();
  const plan: PlanClave = esPlan(q.get("plan")) ? (q.get("plan") as PlanClave) : q.get("ciclo") === "prueba" ? "basico" : "pro";
  const pedido: Ciclo = esCiclo(q.get("ciclo")) ? (q.get("ciclo") as Ciclo) : "mensual";
  const [ciclo, setCiclo] = useState<Ciclo>(pedido === "prueba" && plan !== "basico" ? "mensual" : pedido);

  const [v, setV] = useState({ nombre: "", apellido: "", barberia: "", celular: "", sexo: "", correo: "", region: "", comuna: "" });
  const [tocado, setTocado] = useState<Partial<Record<Campo, boolean>>>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [desc, setDesc] = useState<CodigoValido | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // El cursor parte en el primer campo.
  useEffect(() => {
    document.getElementById("c-nombre")?.focus({ preventScroll: true });
  }, []);

  const p = precios.find((x) => x.clave === plan) ?? precios[0]!;
  const ciclos: { v: Ciclo; t: string }[] = [
    { v: "mensual", t: "Mensual" },
    { v: "anual", t: "Anual" },
    ...(plan === "basico" ? [{ v: "prueba" as Ciclo, t: `Probar ${DIAS_PRUEBA} días` }] : []),
  ];

  // ---- precios ----
  const original = ciclo === "prueba" ? 0 : ciclo === "anual" ? p.precio_anual : p.precio_mensual;
  const pct = ciclo !== "prueba" && desc ? desc.porcentaje : 0;
  const final = Math.round((original * (100 - pct)) / 100);
  const unidad = ciclo === "anual" ? "año" : "mes";

  // ---- validación ----
  const errores: Record<Campo, string> = {
    nombre: validarNombre(v.nombre, "tu nombre"),
    apellido: validarNombre(v.apellido, "tu apellido"),
    barberia: validarBarberia(v.barberia),
    celular: validarCelular(v.celular),
    sexo: validarObligatorio(v.sexo, "Elige una opción."),
    correo: validarCorreo(v.correo),
    region: validarObligatorio(v.region, "Elige tu región."),
    comuna: validarObligatorio(v.comuna, "Elige tu comuna."),
  };
  const mostrar = (c: Campo) => (tocado[c] ? errores[c] : "");
  const tocar = (c: Campo) => setTocado((t) => ({ ...t, [c]: true }));
  const poner = (c: Campo, valor: string) => setV((x) => ({ ...x, [c]: valor }));
  const props = (c: Campo) => ({
    id: `c-${c}`,
    "aria-invalid": !!mostrar(c),
    "aria-describedby": mostrar(c) ? `e-${c}` : undefined,
    onBlur: () => tocar(c),
  });
  const msg = (c: Campo) =>
    mostrar(c) ? (
      <small className="fs-campo-error" id={`e-${c}`} role="alert">
        {mostrar(c)}
      </small>
    ) : null;

  const resumen = `Plan ${p.nombre} · ${ciclo === "prueba" ? `prueba de ${DIAS_PRUEBA} días gratis` : ciclo === "anual" ? "pago anual" : "pago mensual"}`;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const falla = ORDEN.find((c) => errores[c]);
    if (falla) {
      setTocado(Object.fromEntries(ORDEN.map((c) => [c, true])));
      const el = document.getElementById(`c-${falla}`);
      (el?.matches("input,select,button") ? el : el?.querySelector<HTMLElement>("button,input"))?.focus();
      return;
    }
    setEnviando(true);
    const { error: err } = await supabase.rpc("crear_solicitud_completa", {
      p_nombre: limpiar(v.nombre),
      p_apellido: limpiar(v.apellido),
      p_barberia: limpiar(v.barberia),
      p_celular: v.celular,
      p_sexo: v.sexo,
      p_correo: v.correo.trim().toLowerCase(),
      p_region: v.region,
      p_comuna: v.comuna,
      p_plan: plan,
      p_ciclo: ciclo,
      p_codigo: ciclo === "prueba" ? null : desc?.codigo ?? null,
    });
    setEnviando(false);
    if (err) return setError(err.message.length < 140 ? err.message : "No pudimos enviar tu solicitud. Intenta de nuevo.");
    setEnviado(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const detalle =
    ciclo === "prueba"
      ? `Plan ${p.nombre} con prueba gratis de ${DIAS_PRUEBA} días (después ${clp(p.precio_mensual)}/mes).`
      : `Plan ${p.nombre} (${ciclo === "anual" ? "anual" : "mensual"}). Precio original: ${clp(original)}.` +
        (desc ? ` Código ${desc.codigo}: −${desc.porcentaje}%. Precio con descuento: ${clp(final)}.` : ` Sin código de descuento. Precio a pagar: ${clp(final)}.`);
  const aviso = SOPORTE
    ? enlaceWhatsapp(
        SOPORTE,
        `Hola, soy ${limpiar(v.nombre)} ${limpiar(v.apellido)} de ${limpiar(v.barberia)}. Acabo de enviar mi solicitud en Fade Studio.\n${detalle}`,
      )
    : "";

  const comunas = REGIONES[v.region] ?? [];

  return (
    <div className="fs-landing">
      <CabeceraPortada />
      <main className="fs-con fs-con-form">
        <Link to="/fade-studio#planes" className="fs-volver">
          <Ic n="back" s={20} /> Volver a los planes
        </Link>

        <ol className="fs-etapas" aria-label="Pasos">
          {["Tu plan", "Tus datos", "Listo"].map((t, i) => {
            const paso = enviado ? 3 : 2;
            return (
              <li key={t} className={i + 1 === paso ? "on" : i + 1 < paso ? "hecho" : ""}>
                <span>{i + 1 < paso ? <Ic n="check" s={16} sw={3} /> : i + 1}</span>
                {t}
              </li>
            );
          })}
        </ol>

        {enviado ? (
          <section className="fs-gracias" aria-live="polite">
            <span className="fs-gracias-i">
              <Ic n="check" s={34} sw={2.4} />
            </span>
            <h1>¡Recibimos tu solicitud!</h1>
            <p className="fs-lead">
              {resumen}. Te escribimos por WhatsApp al <b>+569 {v.celular.slice(0, 4)} {v.celular.slice(4)}</b> para dejar todo listo.
            </p>

            {ciclo !== "prueba" && (
              <div className="fs-pagar">
                <span>Monto a transferir</span>
                <b>{clp(final)}</b>
                <small>
                  {desc
                    ? `Plan ${p.nombre} ${clp(original)} · código ${desc.codigo} −${desc.porcentaje}%`
                    : `Plan ${p.nombre} · ${ciclo === "anual" ? "pago anual" : "pago mensual"}`}
                </small>
                <small>Te enviamos los datos de transferencia por WhatsApp cuando tu barbería esté lista.</small>
              </div>
            )}

            <ol className="fs-sigue">
              <li>
                <span>
                  <Ic n="chat" s={22} />
                </span>
                <div>
                  <b>Te escribimos</b>
                  <small>Para confirmar tus datos.</small>
                </div>
              </li>
              <li>
                <span>
                  <Ic n="store" s={22} />
                </span>
                <div>
                  <b>Creamos tu barbería</b>
                  <small>Te damos tu link y tu clave de acceso.</small>
                </div>
              </li>
              <li>
                <span>
                  <Ic n="cash" s={22} />
                </span>
                <div>
                  <b>{ciclo === "prueba" ? "Pruebas sin pagar" : "Transfieres"}</b>
                  <small>{ciclo === "prueba" ? `${DIAS_PRUEBA} días con todo incluido.` : "Por transferencia, cuando tu barbería ya esté lista."}</small>
                </div>
              </li>
            </ol>
            {aviso && (
              <a className="fs-btn fs-btn-oro" href={aviso} target="_blank" rel="noreferrer">
                <Ic n="chat" s={20} /> Avisar por WhatsApp para ir más rápido
              </a>
            )}
            <Link className="fs-enlace" to="/fade-studio">
              Volver al inicio
            </Link>
          </section>
        ) : (
          <form className="fs-form fs-form-solo" onSubmit={enviar} noValidate ref={formRef}>
            <div className="fs-mini">
              <div className="fs-mini-top">
                <span>Tu plan</span>
                <Link to="/fade-studio#planes">Cambiar plan</Link>
              </div>
              <b className="fs-mini-plan">{p.nombre}</b>
              <div className="fs-ciclos" role="radiogroup" aria-label="Forma de pago" style={{ gridTemplateColumns: `repeat(${ciclos.length}, 1fr)` }}>
                {ciclos.map((c) => (
                  <button key={c.v} type="button" role="radio" aria-checked={ciclo === c.v} className={ciclo === c.v ? "on" : ""} onClick={() => setCiclo(c.v)}>
                    {c.t}
                  </button>
                ))}
              </div>
              <div className="fs-mini-precio" aria-live="polite">
                {ciclo === "prueba" ? (
                  <>
                    <b>$0</b>
                    <small>por {DIAS_PRUEBA} días. Después {clp(p.precio_mensual)}/mes. Cancelas antes y no pagas nada.</small>
                  </>
                ) : (
                  <>
                    {desc && <s>{clp(original)}</s>}
                    <b>{clp(final)}</b>
                    <small>/{unidad}</small>
                  </>
                )}
              </div>
              {desc && ciclo !== "prueba" && (
                <p className="fs-mini-desc">
                  Código <b>{desc.codigo}</b>: −{desc.porcentaje}% por {desc.meses} {desc.meses === 1 ? "mes" : "meses"}. Ahorras {clp(original - final)}.
                </p>
              )}
            </div>

            <h1 className="fs-form-h">Tus datos</h1>
            <p className="fs-form-sub">Con esto creamos tu barbería. Todos los campos son obligatorios.</p>
            {!configurado && (
              <p className="fs-error" role="alert">
                Falta conectar Supabase en este sitio.
              </p>
            )}

            <div className="fs-par">
              <label>
                <span>Nombre</span>
                <input {...props("nombre")} value={v.nombre} onChange={(e) => poner("nombre", e.target.value)} maxLength={40} autoComplete="given-name" enterKeyHint="next" />
                {msg("nombre")}
              </label>
              <label>
                <span>Apellido</span>
                <input {...props("apellido")} value={v.apellido} onChange={(e) => poner("apellido", e.target.value)} maxLength={40} autoComplete="family-name" enterKeyHint="next" />
                {msg("apellido")}
              </label>
            </div>

            <label>
              <span>Nombre de tu barbería</span>
              <input {...props("barberia")} value={v.barberia} onChange={(e) => poner("barberia", e.target.value)} maxLength={60} autoComplete="organization" enterKeyHint="next" />
              {msg("barberia")}
            </label>

            <label>
              <span>Celular</span>
              <div className={`fs-tel${mostrar("celular") ? " mal" : ""}`}>
                <i aria-hidden="true">+569</i>
                <input
                  {...props("celular")}
                  type="tel"
                  inputMode="numeric"
                  placeholder="1234 5678"
                  value={v.celular}
                  onChange={(e) => poner("celular", soloOchoDigitos(e.target.value))}
                  autoComplete="tel-national"
                  aria-label="Celular, 8 números después del +569"
                  enterKeyHint="next"
                />
              </div>
              {msg("celular")}
            </label>

            <fieldset className="fs-sexo" id="c-sexo" tabIndex={-1} aria-invalid={!!mostrar("sexo")} onBlur={() => tocar("sexo")}>
              <legend>Sexo</legend>
              <div>
                {[
                  ["masculino", "Masculino"],
                  ["femenino", "Femenino"],
                ].map(([val, t]) => (
                  <label key={val} className={v.sexo === val ? "on" : ""}>
                    <input type="radio" name="sexo" value={val} checked={v.sexo === val} onChange={() => poner("sexo", val!)} />
                    {t}
                  </label>
                ))}
              </div>
              {msg("sexo")}
            </fieldset>

            <label>
              <span>Correo</span>
              <input
                {...props("correo")}
                type="email"
                inputMode="email"
                value={v.correo}
                onChange={(e) => poner("correo", e.target.value.replace(/\s/g, ""))}
                maxLength={80}
                autoComplete="email"
                autoCapitalize="none"
                placeholder="nombre@gmail.com"
                enterKeyHint="next"
              />
              {mostrar("correo") ? msg("correo") : <small className="fs-ayuda">Aceptamos {DOMINIOS_CORREO.map((d) => "@" + d).join(", ")}</small>}
            </label>

            <div className="fs-par">
              <label>
                <span>Región</span>
                <select
                  {...props("region")}
                  value={v.region}
                  onChange={(e) => {
                    setV((x) => ({ ...x, region: e.target.value, comuna: "" }));
                    setTocado((t) => ({ ...t, comuna: false }));
                  }}
                >
                  <option value="">Elige tu región</option>
                  {NOMBRES_REGION.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {msg("region")}
              </label>
              <label>
                <span>Comuna</span>
                <select {...props("comuna")} value={v.comuna} disabled={!v.region} onChange={(e) => poner("comuna", e.target.value)}>
                  <option value="">{v.region ? "Elige tu comuna" : "Primero la región"}</option>
                  {comunas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {msg("comuna")}
              </label>
            </div>

            {ciclo !== "prueba" && <CodigoDescuento valor={desc} onCambio={setDesc} clase="en-portada" />}

            {error && (
              <p className="fs-error" role="alert">
                {error}
              </p>
            )}
            <button className="fs-btn fs-btn-oro" type="submit" disabled={enviando || !configurado}>
              {enviando ? "Enviando…" : ciclo === "prueba" ? `Empezar mi prueba de ${DIAS_PRUEBA} días` : `Enviar solicitud · ${clp(final)}`}
            </button>
            <p className="fs-form-pie">
              <Ic n="shield" s={18} /> {ciclo === "prueba" ? "No pagas nada ahora." : "Todavía no pagas: primero te escribimos."}
            </p>
          </form>
        )}
      </main>
      <PiePortada />
    </div>
  );
}
