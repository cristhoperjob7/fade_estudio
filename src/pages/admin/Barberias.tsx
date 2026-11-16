import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { aSlug, diasHasta, estadoSuscripcion, fechaMes } from "../../lib/admin";
import { claveAleatoria, llamarFuncion } from "../../lib/equipo";
import { hoyChile } from "../../lib/fecha";
import { enlaceWhatsapp, formatearTelefono } from "../../lib/whatsapp";
import type { BarberiaAdmin, PagoSuscripcion, Plan } from "../../lib/types";
import { PLAN_LABEL } from "../../lib/types";
import { DIAS_PRUEBA, usePlanes } from "../../lib/planes";
import type { Solicitud } from "./Solicitudes";
import { useToast } from "../../components/Toast";
import Hoja from "../../components/Hoja";
import Icon from "../../components/Icon";
import SelectorComuna from "../../components/SelectorComuna";

type Filtro = "todas" | "recientes" | "vencer";

export default function Barberias() {
  const [q, setQ] = useSearchParams();
  const [lista, setLista] = useState<BarberiaAdmin[] | null>(null);
  const [error, setError] = useState("");
  const [nueva, setNueva] = useState(false);
  const [desdeSolicitud, setDesdeSolicitud] = useState<Solicitud | null>(null);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [fComuna, setFComuna] = useState("");
  const [fPlan, setFPlan] = useState("");
  const ubicacion = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    const sol = (ubicacion.state as { solicitud?: Solicitud } | null)?.solicitud;
    if (!sol) return;
    setDesdeSolicitud(sol);
    setNueva(true);
    nav(ubicacion.pathname, { replace: true, state: null }); // limpia el estado para no reabrir al volver
  }, [ubicacion.state, ubicacion.pathname, nav]);

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("admin_barberias");
    if (err) return setError("No pudimos cargar las barberías. Revisa que paso17-ubicacion-solicitudes.sql esté ejecutado.");
    setError("");
    setLista((data ?? []) as BarberiaAdmin[]);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abierta = lista?.find((b) => b.id === q.get("id")) ?? null;
  const cerrar = () => setQ({}, { replace: true });

  const comunas = useMemo(() => [...new Set((lista ?? []).map((b) => b.comuna).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [lista]);

  const grupos = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    const hoy = hoyChile();
    const f = (lista ?? []).filter((b) => {
      if (t && ![b.nombre, b.comuna, b.region, b.dueno_nombre ?? "", b.slug].some((x) => x.toLowerCase().includes(t))) return false;
      if (fComuna && b.comuna !== fComuna) return false;
      if (fPlan && b.plan !== fPlan) return false;
      if (filtro === "recientes" && diasHasta(hoy, b.creada_en.slice(0, 10)) > 30) return false;
      if (filtro === "vencer" && !(b.vence_el && diasHasta(b.vence_el) <= 7)) return false;
      return true;
    });
    const mapa = new Map<string, BarberiaAdmin[]>();
    for (const b of f) mapa.set(b.comuna || "", [...(mapa.get(b.comuna || "") ?? []), b]);
    return [...mapa.entries()].sort((a, b) => Number(a[0] === "") - Number(b[0] === "") || b[1].length - a[1].length || a[0].localeCompare(b[0], "es"));
  }, [lista, buscar, filtro, fComuna, fPlan]);

  const total = lista?.length ?? 0;
  const porVencer = (lista ?? []).filter((b) => b.vence_el && diasHasta(b.vence_el) <= 7).length;

  return (
    <>
      <div className="sol-cab">
        <h1 className="titulo">Barberías</h1>
        <span className="suave chico">
          {total} {total === 1 ? "barbería" : "barberías"} · {comunas.length} {comunas.length === 1 ? "comuna" : "comunas"}
        </span>
      </div>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <label className="barb-buscar">
        <Icon nombre="search" size={18} />
        <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre, comuna o dueño" aria-label="Buscar barbería" />
      </label>
      <div className="sol-tabs" role="group" aria-label="Filtros">
        {([["todas", "Todas"], ["recientes", "Recientes"], ["vencer", `Por vencer · ${porVencer}`]] as [Filtro, string][]).map(([v, t]) => (
          <button key={v} className={filtro === v ? "on" : ""} aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
            {t}
          </button>
        ))}
        <select aria-label="Comuna" value={fComuna} onChange={(e) => setFComuna(e.target.value)} className="barb-sel">
          <option value="">Comuna</option>
          {comunas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select aria-label="Plan" value={fPlan} onChange={(e) => setFPlan(e.target.value)} className="barb-sel">
          <option value="">Plan</option>
          <option value="basico">Básico</option>
          <option value="pro">Pro</option>
          <option value="vip">VIP</option>
        </select>
      </div>

      {grupos.map(([comuna, items]) => (
        <section key={comuna || "sin"} className="barb-grupo">
          <h2 className="barb-comuna">
            <span>{comuna || "Sin comuna"}</span>
            <small>
              {items.length} {items.length === 1 ? "barbería" : "barberías"}
            </small>
          </h2>
          <ul className="lista">
            {items.map((b) => {
              const e = estadoSuscripcion(b);
              return (
                <li key={b.id}>
                  <button className="fila fila-btn" onClick={() => setQ({ id: b.id }, { replace: true })}>
                    <span className="fila-cuerpo">
                      <b>{b.nombre}</b>
                      <small>
                        {PLAN_LABEL[b.plan]} · {b.citas_30d} {b.citas_30d === 1 ? "cita" : "citas"} en 30 días
                        {!b.comuna ? " · falta la comuna" : ""}
                      </small>
                    </span>
                    <span className={`chip sus-${e.tono}`}>{e.texto}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {lista && grupos.length === 0 && <div className="vacio">{total === 0 ? "Aún no tienes barberías. Crea la primera." : "Ninguna barbería coincide con la búsqueda."}</div>}

      <button className="btn btn-primario btn-ancho" style={{ marginTop: 18 }} onClick={() => setNueva(true)}>
        <Icon nombre="shop" size={20} />
        Nueva barbería
      </button>

      {nueva && (
        <Nueva
          inicial={desdeSolicitud}
          onCerrar={() => {
            setNueva(false);
            setDesdeSolicitud(null);
          }}
          onListo={() => {
            setNueva(false);
            void cargar();
          }}
        />
      )}
      {abierta && <Detalle b={abierta} onCerrar={cerrar} onCambio={() => void cargar()} />}
    </>
  );
}

/* ---------------------------------------------------------------- nueva */

function Nueva({ onCerrar, onListo, inicial }: { onCerrar: () => void; onListo: () => void; inicial: Solicitud | null }) {
  const avisar = useToast();
  const planes = usePlanes();
  const precioDe = (p: Plan) => planes.find((x) => x.clave === p)?.precio_mensual ?? 0;
  const hoy = hoyChile();
  const [nombre, setNombre] = useState(inicial?.nombre_barberia ?? "");
  const [slug, setSlug] = useState(inicial ? aSlug(inicial.nombre_barberia) : "");
  const [slugEditado, setSlugEditado] = useState(false);
  const [plan, setPlan] = useState<Plan>(inicial?.plan ?? "basico");
  const [prueba, setPrueba] = useState(inicial && inicial.ciclo !== "prueba" ? "0" : String(DIAS_PRUEBA));
  const [dueno, setDueno] = useState(inicial?.contacto ?? "");
  const [correo, setCorreo] = useState(inicial?.correo ?? "");
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");
  const [clave, setClave] = useState(claveAleatoria());
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [creada, setCreada] = useState<string | null>(null);

  const vence = (() => {
    const n = Math.max(0, Math.round(Number(prueba) || 0));
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  })();

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setError("");
    const motivo = await llamarFuncion("superadmin", {
      accion: "crear_barberia",
      nombre,
      slug,
      plan,
      precio_mensual: precioDe(plan),
      vence_el: vence,
      dueno_nombre: dueno,
      dueno_correo: correo,
      clave,
    });
    setOcupado(false);
    if (motivo) return setError(motivo);
    if (region && comuna) await supabase.from("barberias").update({ region, comuna }).eq("slug", slug);
    if (inicial) await supabase.rpc("admin_estado_solicitud", { p_id: inicial.id, p_estado: "creada" });
    if (inicial?.descuento_codigo) {
      const { data: nueva } = await supabase.from("barberias").select("id").eq("slug", slug).maybeSingle();
      if (nueva) await supabase.rpc("admin_aplicar_descuento", { p_barberia: (nueva as { id: string }).id, p_codigo: inicial.descuento_codigo });
    }
    avisar("Barbería creada");
    setCreada(slug);
  };

  if (creada) {
    const enlace = `${window.location.origin}/b/${creada}`;
    return (
      <Hoja titulo="Barbería creada" onCerrar={onListo}>
        <p className="suave">Entrégale estos datos al dueño. La clave no se vuelve a mostrar.</p>
        <div className="datos">
          <div>
            <span>Entra en</span>
            <b>{window.location.origin}/login</b>
          </div>
          <div>
            <span>Correo</span>
            <b>{correo.toLowerCase()}</b>
          </div>
          <div>
            <span>Clave</span>
            <b className="num">{clave}</b>
          </div>
          <div>
            <span>Página de reservas</span>
            <b>{enlace}</b>
          </div>
          <div>
            <span>Prueba hasta</span>
            <b>{fechaMes(vence)}</b>
          </div>
        </div>
        <p className="suave">Pídele que entre a Ajustes y complete WhatsApp, datos de transferencia, servicios y su equipo.</p>
        <button className="btn btn-primario" style={{ marginTop: 14 }} onClick={onListo}>
          Listo
        </button>
      </Hoja>
    );
  }

  return (
    <Hoja titulo="Nueva barbería" onCerrar={onCerrar}>
      <form className="form-hoja" onSubmit={crear}>
        <label className="campo">
          <span>Nombre de la barbería</span>
          <input
            value={nombre}
            required
            maxLength={80}
            onChange={(e) => {
              setNombre(e.target.value);
              if (!slugEditado) setSlug(aSlug(e.target.value));
            }}
          />
        </label>
        <label className="campo">
          <span>Dirección web</span>
          <input
            value={slug}
            required
            minLength={3}
            maxLength={40}
            onChange={(e) => {
              setSlugEditado(true);
              setSlug(aSlug(e.target.value));
            }}
          />
          <small>{window.location.origin}/b/{slug || "..."}</small>
        </label>
        <div className="fila-dos">
          <label className="campo">
            <span>Plan</span>
            <select
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value as Plan);
              }}
            >
              <option value="basico">Básico</option>
              <option value="pro">Pro</option>
              <option value="vip">VIP</option>
            </select>
          </label>
          <div className="campo">
            <span>Precio al mes</span>
            <b style={{ minHeight: 48, display: "flex", alignItems: "center" }}>{clp(precioDe(plan))}</b>
            <small>Es el precio del plan, igual para todos.</small>
          </div>
        </div>
        <label className="campo">
          <span>Días de prueba gratis</span>
          <input type="number" inputMode="numeric" min={0} max={365} value={prueba} onChange={(e) => setPrueba(e.target.value)} />
          <small>Vence el {fechaMes(vence)}. Después se bloquea hasta que registres un pago.</small>
        </label>
        <SelectorComuna region={region} comuna={comuna} onCambio={(r, c) => { setRegion(r); setComuna(c); }} />
        <div className="sep" />
        <label className="campo">
          <span>Nombre del dueño</span>
          <input value={dueno} onChange={(e) => setDueno(e.target.value)} required maxLength={60} autoComplete="off" />
        </label>
        <label className="campo">
          <span>Correo del dueño (con este entra)</span>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="off" />
        </label>
        <label className="campo">
          <span>Clave inicial</span>
          <input value={clave} onChange={(e) => setClave(e.target.value)} required minLength={8} autoComplete="off" />
        </label>
        <button type="button" className="btn btn-borde btn-chico" onClick={() => setClave(claveAleatoria())}>
          Generar otra clave
        </button>
        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primario" disabled={ocupado}>
          {ocupado ? "Creando…" : "Crear barbería"}
        </button>
      </form>
    </Hoja>
  );
}

/* -------------------------------------------------------------- detalle */

const PLANES_ORDEN: Plan[] = ["basico", "pro", "vip"];
const DESC_PLAN: Record<Plan, string> = { basico: "1 barbero adicional", pro: "Página propia y avisos", vip: "Página a medida" };

/** Fecha en que quedaría pagada la barbería si se suman N meses hoy. */
function vencimientoCon(b: BarberiaAdmin, meses: number): string {
  const hoy = hoyChile();
  const base = !b.vence_el || b.vence_el < hoy ? hoy : b.vence_el;
  const d = new Date(`${base}T12:00:00Z`);
  const dia = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + meses);
  if (d.getUTCDate() !== dia) d.setUTCDate(0); // 31 ene + 1 mes -> 28 feb
  return d.toISOString().slice(0, 10);
}

/** Ficha de la barbería: quién es y cómo está a la izquierda; cobrar, plan y datos a la derecha. */
function Detalle({ b, onCerrar, onCambio }: { b: BarberiaAdmin; onCerrar: () => void; onCambio: () => void }) {
  const avisar = useToast();
  const planes = usePlanes();
  const e = estadoSuscripcion(b);
  const enlace = `${window.location.origin}/b/${b.slug}`;
  const [pagos, setPagos] = useState<PagoSuscripcion[] | null>(null);
  const [plan, setPlan] = useState<Plan>(b.plan);
  const [region, setRegion] = useState(b.region);
  const [comuna, setComuna] = useState(b.comuna);
  const [notas, setNotas] = useState(b.notas);
  const [gracia, setGracia] = useState(String(b.gracia_dias));
  const [vence, setVence] = useState(b.vence_el ?? "");
  const [confirmar, setConfirmar] = useState<"" | "mes" | "anio" | "suspender">("");
  const [otra, setOtra] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const suspendida = b.estado === "suspendida";
  const precio = (p: Plan) => planes.find((x) => x.clave === p);
  const pct = b.precio_mensual && precio(b.plan) && precio(b.plan)!.precio_mensual ? 1 - b.precio_mensual / precio(b.plan)!.precio_mensual : 0;
  const montoMes = b.precio_mensual;
  const montoAnio = Math.round((precio(b.plan)?.precio_anual ?? b.precio_mensual * 12) * (1 - pct));
  const dias = b.vence_el ? diasHasta(b.vence_el) : null;
  const avance = dias === null ? 100 : Math.max(4, Math.min(100, Math.round((Math.max(0, dias) / 30) * 100)));
  const cambios = plan !== b.plan || region !== b.region || comuna !== b.comuna || notas !== b.notas || gracia !== String(b.gracia_dias) || vence !== (b.vence_el ?? "");

  const cargarPagos = useCallback(async () => {
    const { data } = await supabase
      .from("pagos_suscripcion")
      .select("*")
      .eq("barberia_id", b.id)
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false })
      .limit(12);
    setPagos((data ?? []) as PagoSuscripcion[]);
  }, [b.id]);
  useEffect(() => {
    void cargarPagos();
  }, [cargarPagos]);

  async function cobrar(meses: number, monto: number) {
    setOcupado(true);
    setError("");
    const { data, error: err } = await supabase.rpc("admin_registrar_pago", { p_barberia: b.id, p_monto: monto, p_meses: meses, p_nota: meses === 12 ? "Pago anual" : "Pago mensual" });
    setOcupado(false);
    setConfirmar("");
    if (err) return setError(err.message || "No se pudo registrar el pago.");
    avisar(`Pago registrado. Vence el ${fechaMes(String(data))}`);
    onCambio();
    void cargarPagos();
  }

  async function guardar() {
    const g = Math.round(Number(gracia));
    if (!Number.isFinite(g) || g < 0 || g > 30) return setError("Los días de gracia deben ser entre 0 y 30.");
    if ((region && !comuna) || (!region && comuna)) return setError("Elige la región y la comuna.");
    setOcupado(true);
    setError("");
    const { data, error: err } = await supabase
      .from("barberias")
      .update({ plan, region, comuna, notas: notas.trim(), gracia_dias: g, vence_el: vence || null })
      .eq("id", b.id)
      .select("id");
    setOcupado(false);
    if (err || !data || data.length === 0) return setError("No se pudo guardar.");
    avisar("Cambios guardados");
    onCambio();
  }

  async function suspender() {
    if (confirmar !== "suspender") return setConfirmar("suspender");
    setConfirmar("");
    const { data, error: err } = await supabase.from("barberias").update({ estado: suspendida ? "activa" : "suspendida" }).eq("id", b.id).select("id");
    if (err || !data || data.length === 0) return avisar("No se pudo cambiar el estado", "error");
    avisar(suspendida ? "Barbería reactivada" : "Barbería suspendida");
    onCambio();
  }

  return (
    <Hoja titulo={b.nombre} onCerrar={onCerrar} ancha>
      <div className="ficha">
        <aside className="ficha-izq">
          <div className="ficha-id">
            <div className="bar-ini" aria-hidden="true">
              {b.nombre.trim().slice(0, 2).toUpperCase()}
            </div>
            <div className="bar-txt">
              <b>{b.nombre}</b>
              <small>/b/{b.slug} · desde {fechaMes(b.creada_en.slice(0, 10))}</small>
            </div>
          </div>
          <div className="ficha-chips">
            <span className={`chip sus-${e.tono}`}>● {e.texto}</span>
            <span className={`chip plan-${b.plan}`}>Plan {PLAN_LABEL[b.plan]}</span>
          </div>

          <h3 className="ficha-lab">Suscripción</h3>
          <div className="ficha-fila">
            <b>{b.vence_el ? `Vence el ${fechaMes(b.vence_el)}` : "Sin vencimiento"}</b>
            {dias !== null && <span className="suave chico">{dias >= 0 ? `en ${dias} ${dias === 1 ? "día" : "días"}` : `hace ${-dias} días`}</span>}
          </div>
          <div className="mi-plan-barra" aria-hidden="true">
            <i style={{ width: `${avance}%` }} />
          </div>
          <p className="suave chico" style={{ margin: 0 }}>
            {b.ultimo_pago ? `Último pago: ${fechaMes(b.ultimo_pago)}` : "Todavía sin pagos"} · {b.gracia_dias} {b.gracia_dias === 1 ? "día" : "días"} de gracia
          </p>

          <div className="ficha-kpis">
            <div>
              <span>Barberos</span>
              <b>{b.barberos}</b>
            </div>
            <div>
              <span>Citas en 30 días</span>
              <b>{b.citas_30d}</b>
            </div>
          </div>

          <h3 className="ficha-lab">Contacto</h3>
          <ul className="ficha-contacto">
            <li>{b.dueno_nombre ?? "Sin dueño"}</li>
            {b.dueno_telefono && (
              <li>
                {formatearTelefono(b.dueno_telefono)}
                <a href={enlaceWhatsapp(b.dueno_telefono, `Hola ${b.dueno_nombre ?? ""}, te escribo de Fade Studio.`)} target="_blank" rel="noreferrer">
                  Abrir
                </a>
              </li>
            )}
            {b.dueno_correo && <li>{b.dueno_correo}</li>}
            <li>{b.comuna ? `${b.comuna}, ${b.region}` : "Sin comuna todavía"}</li>
          </ul>
          <div className="acciones">
            <a className="btn btn-borde btn-chico" href={enlace} target="_blank" rel="noreferrer">
              Ver su página ↗
            </a>
            <button
              className="btn btn-borde btn-chico"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(enlace)
                  .then(() => avisar("Enlace copiado"))
                  .catch(() => avisar("No se pudo copiar", "error"))
              }
            >
              Copiar enlace
            </button>
          </div>
        </aside>

        <div className="ficha-der">
          <h3 className="ficha-lab">Registrar pago</h3>
          <div className="ficha-cobro">
            <button className="btn btn-primario" disabled={ocupado} onClick={() => (confirmar === "mes" ? void cobrar(1, montoMes) : setConfirmar("mes"))} onBlur={() => setConfirmar("")}>
              {confirmar === "mes" ? "¿Confirmar el pago?" : `+ 1 mes · ${clp(montoMes)}`}
              <small>vence el {fechaMes(vencimientoCon(b, 1))}</small>
            </button>
            <button className="btn btn-borde" disabled={ocupado} onClick={() => (confirmar === "anio" ? void cobrar(12, montoAnio) : setConfirmar("anio"))} onBlur={() => setConfirmar("")}>
              {confirmar === "anio" ? "¿Confirmar el pago?" : `+ 1 año · ${clp(montoAnio)}`}
              <small>vence el {fechaMes(vencimientoCon(b, 12))}</small>
            </button>
            <button className="btn btn-borde" onClick={() => setOtra(!otra)}>
              Otra fecha
            </button>
          </div>
          {otra && <RegistrarPago b={b} onListo={() => { onCambio(); void cargarPagos(); setOtra(false); }} />}

          <h3 className="ficha-lab">Plan</h3>
          <div className="ficha-planes" role="radiogroup" aria-label="Plan">
            {PLANES_ORDEN.map((p) => (
              <button key={p} role="radio" aria-checked={plan === p} className={`ficha-plan plan-${p}${plan === p ? " on" : ""}`} onClick={() => setPlan(p)}>
                <span className="ficha-plan-n">
                  {PLAN_LABEL[p]}
                  {b.plan === p ? " · actual" : ""}
                </span>
                <b>{clp(precio(p)?.precio_mensual ?? 0)}</b>
                <small>{DESC_PLAN[p]}</small>
              </button>
            ))}
          </div>
          <p className="suave chico" style={{ margin: 0 }}>
            Los precios salen de «Planes». {plan !== b.plan ? "Se aplica al guardar y cierra su solicitud de cambio." : "Si cambias el plan, el precio se actualiza solo."}
          </p>

          <h3 className="ficha-lab">Ubicación</h3>
          <SelectorComuna region={region} comuna={comuna} onCambio={(r, c) => { setRegion(r); setComuna(c); }} />

          <label className="campo">
            <span>Nota privada (solo tú la ves)</span>
            <input value={notas} onChange={(ev) => setNotas(ev.target.value)} maxLength={300} placeholder="Ej. cliente recomendado, paga los primeros de mes" />
          </label>

          <details className="ficha-mas">
            <summary>Más opciones</summary>
            <div className="form-hoja">
              <div className="fila-dos">
                <label className="campo">
                  <span>Vence el</span>
                  <input type="date" value={vence} onChange={(ev) => setVence(ev.target.value)} />
                </label>
                <label className="campo">
                  <span>Días de gracia</span>
                  <input type="number" inputMode="numeric" min={0} max={30} value={gracia} onChange={(ev) => setGracia(ev.target.value)} />
                  <small>Días que puede entrar después de vencer.</small>
                </label>
              </div>
            </div>
            <DescuentoBarberia b={b} onListo={onCambio} />
            <h3 style={{ fontSize: 15, margin: "18px 0 6px" }}>Historial de pagos</h3>
            {pagos && pagos.length === 0 && <p className="suave">Todavía no hay pagos registrados.</p>}
            <ul className="lista">
              {(pagos ?? []).map((p) => (
                <li key={p.id} className="fila">
                  <span className="fila-cuerpo">
                    <b className="num">{clp(p.monto)}</b>
                    <small>
                      {fechaMes(p.fecha)}
                      {p.periodo_hasta ? ` · cubre hasta ${fechaMes(p.periodo_hasta)}` : ""}
                      {p.nota ? ` · ${p.nota}` : ""}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            <ClaveDueno b={b} />
          </details>

          {error && (
            <p className="aviso error" role="alert">
              {error}
            </p>
          )}
          <div className="ficha-pie">
            <button className="btn btn-peligro btn-chico" onClick={() => void suspender()} onBlur={() => setConfirmar("")}>
              {confirmar === "suspender" ? "¿Seguro?" : suspendida ? "Reactivar barbería" : "Suspender barbería"}
            </button>
            <div className="ficha-pie-der">
              <button className="btn btn-borde btn-chico" onClick={onCerrar}>
                Cerrar
              </button>
              <button className="btn btn-primario btn-chico" disabled={ocupado || !cambios} onClick={() => void guardar()}>
                {ocupado ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Hoja>
  );
}

function DescuentoBarberia({ b, onListo }: { b: BarberiaAdmin; onListo: () => void }) {
  const avisar = useToast();
  const [d, setD] = useState<{ descuento_codigo: string | null; descuento_pct: number; descuento_meses: number } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("barberias").select("descuento_codigo,descuento_pct,descuento_meses").eq("id", b.id).maybeSingle();
    setD(data as typeof d);
  }, [b.id]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function aplicar(c: string) {
    setOcupado(true);
    setError("");
    const { error: err } = await supabase.rpc("admin_aplicar_descuento", { p_barberia: b.id, p_codigo: c });
    setOcupado(false);
    if (err) return setError(err.message);
    avisar(c ? "Descuento aplicado" : "Descuento quitado");
    setCodigo("");
    void cargar();
    onListo();
  }

  return (
    <div className="form-hoja" style={{ marginTop: 18 }}>
      <h3 style={{ fontSize: 15 }}>Descuento</h3>
      {d?.descuento_codigo ? (
        <p className="suave">
          <b className="num">{d.descuento_codigo}</b> · −{d.descuento_pct}% · quedan {d.descuento_meses} {d.descuento_meses === 1 ? "mes" : "meses"} con descuento.
        </p>
      ) : (
        <p className="suave">Sin descuento. Paga el precio completo del plan.</p>
      )}
      <div className="fila-dos">
        <label className="campo">
          <span>Código</span>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={20} placeholder="Ej. AMIGO20" autoComplete="off" />
        </label>
        <button type="button" className="btn btn-borde btn-chico" style={{ alignSelf: "end" }} disabled={ocupado || !codigo} onClick={() => void aplicar(codigo)}>
          Aplicar
        </button>
      </div>
      {d?.descuento_codigo && (
        <button type="button" className="btn btn-texto" disabled={ocupado} onClick={() => void aplicar("")}>
          Quitar descuento
        </button>
      )}
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function RegistrarPago({ b, onListo }: { b: BarberiaAdmin; onListo: () => void }) {
  const avisar = useToast();
  const [monto, setMonto] = useState(String(b.precio_mensual));
  const [meses, setMeses] = useState("1");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const registrar = async (ev: FormEvent) => {
    ev.preventDefault();
    const m = Number(meses);
    setOcupado(true);
    setError("");
    const { data, error: err } = await supabase.rpc("admin_registrar_pago", {
      p_barberia: b.id,
      p_monto: Math.round(Number(monto)),
      p_meses: m,
      p_nota: nota,
    });
    setOcupado(false);
    if (err) return setError(err.message || "No se pudo registrar el pago.");
    avisar(`Pago registrado. Vence el ${fechaMes(String(data))}`);
    setNota("");
    onListo();
  };

  return (
    <form className="form-hoja" onSubmit={registrar}>
      <div className="fila-dos">
        <label className="campo">
          <span>Monto (CLP)</span>
          <input type="number" inputMode="numeric" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Meses que cubre</span>
          <select value={meses} onChange={(e) => setMeses(e.target.value)}>
            {[1, 2, 3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "mes" : "meses"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="campo">
        <span>Nota (opcional)</span>
        <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120} placeholder="Ej. transferencia del 15" />
      </label>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primario" disabled={ocupado}>
        {ocupado ? "Guardando…" : "Registrar pago y reactivar"}
      </button>
    </form>
  );
}

function ClaveDueno({ b }: { b: BarberiaAdmin }) {
  const avisar = useToast();
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cambiar = async () => {
    if (clave.length < 8) return setError("La clave debe tener al menos 8 caracteres.");
    setOcupado(true);
    setError("");
    const motivo = await llamarFuncion("superadmin", { accion: "clave_dueno", barberia_id: b.id, clave });
    setOcupado(false);
    if (motivo) return setError(motivo);
    avisar("Clave del dueño cambiada");
    setClave("");
  };

  return (
    <div className="form-hoja" style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 15 }}>Clave del dueño</h3>
      <label className="campo">
        <span>Clave nueva</span>
        <input value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="off" placeholder="Mínimo 8 caracteres" />
      </label>
      <div className="fila-dos">
        <button type="button" className="btn btn-borde btn-chico" onClick={() => setClave(claveAleatoria())}>
          Generar
        </button>
        <button type="button" className="btn btn-borde btn-chico" disabled={ocupado || !clave} onClick={cambiar}>
          Cambiar clave
        </button>
      </div>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
