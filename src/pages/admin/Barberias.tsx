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
import PanelLateral from "../../components/PanelLateral";
import "../../styles/panel-lateral.css";
import Icon from "../../components/Icon";
import SelectorComuna from "../../components/SelectorComuna";
import Selector from "../../components/Selector";

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
        <Selector
          clase="sel-pildora"
          etiqueta="Comuna"
          valor={fComuna}
          onCambio={setFComuna}
          placeholder="Comuna"
          opciones={[{ valor: "", etiqueta: "Todas las comunas" }, ...comunas.map((c) => ({ valor: c, etiqueta: c }))]}
        />
        <Selector
          clase="sel-pildora"
          etiqueta="Plan"
          valor={fPlan}
          onCambio={setFPlan}
          placeholder="Plan"
          opciones={[
            { valor: "", etiqueta: "Todos los planes" },
            { valor: "basico", etiqueta: "Básico" },
            { valor: "pro", etiqueta: "Pro" },
            { valor: "vip", etiqueta: "VIP" },
          ]}
        />
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
    if (inicial?.apellido && inicial.edad && inicial.sexo && inicial.region && inicial.comuna) {
      // El dueño ya queda con los datos que escribió al contratar (si no, los completa al entrar).
      const { data: nueva } = await supabase.from("barberias").select("id").eq("slug", slug).maybeSingle();
      const ap = inicial.apellido.trim();
      const nom = inicial.contacto.endsWith(ap) ? inicial.contacto.slice(0, inicial.contacto.length - ap.length).trim() : inicial.contacto;
      if (nueva) {
        await supabase.rpc("admin_completar_perfil_dueno", {
          p_barberia: (nueva as { id: string }).id, p_nombre: nom, p_apellidos: ap, p_celular: inicial.telefono ?? "",
          p_sexo: inicial.sexo, p_region: inicial.region, p_comuna: inicial.comuna, p_edad: inicial.edad,
        });
      }
    }
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
          <div className="campo">
            <span>Plan</span>
            <Selector
              etiqueta="Plan"
              valor={plan}
              onCambio={(v) => setPlan(v as Plan)}
              opciones={[
                { valor: "basico", etiqueta: "Básico" },
                { valor: "pro", etiqueta: "Pro" },
                { valor: "vip", etiqueta: "VIP" },
              ]}
            />
          </div>
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

type Sec = "resumen" | "pagos" | "plan" | "datos" | "avanzado";
type ModoCambio = "cobrar" | "gratis" | "proximo";

/** Ficha de la barbería: menú lateral con Resumen, Pagos, Plan, Datos y Avanzado. Cada sección muestra poco. */
function Detalle({ b, onCerrar, onCambio }: { b: BarberiaAdmin; onCerrar: () => void; onCambio: () => void }) {
  const avisar = useToast();
  const planes = usePlanes();
  const e = estadoSuscripcion(b);
  const enlace = `${window.location.origin}/b/${b.slug}`;
  const [sec, setSec] = useState<Sec>("resumen");
  const [pagos, setPagos] = useState<PagoSuscripcion[] | null>(null);
  const [plan, setPlan] = useState<Plan>(b.plan);
  const [planSig, setPlanSig] = useState<Plan | null>(null);
  const [modo, setModo] = useState<ModoCambio | "">("");
  const [region, setRegion] = useState(b.region);
  const [comuna, setComuna] = useState(b.comuna);
  const [notas, setNotas] = useState(b.notas);
  const [gracia, setGracia] = useState(String(b.gracia_dias));
  const [vence, setVence] = useState(b.vence_el ?? "");
  const [confirmar, setConfirmar] = useState<"" | "mes" | "anio" | "suspender" | "reiniciar">("");
  const [otra, setOtra] = useState(false);
  const [claveAbierta, setClaveAbierta] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [claveBorrar, setClaveBorrar] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const suspendida = b.estado === "suspendida";
  const precio = (p: Plan) => planes.find((x) => x.clave === p);
  const precioActual = precio(b.plan);
  const pct = b.precio_mensual && precioActual && precioActual.precio_mensual ? Math.min(1, Math.max(0, 1 - b.precio_mensual / precioActual.precio_mensual)) : 0;
  const dias = b.vence_el ? diasHasta(b.vence_el) : null;
  const diasQuedan = dias !== null && dias > 0 ? dias : 0;
  const cambios = region !== b.region || comuna !== b.comuna || notas !== b.notas || gracia !== String(b.gracia_dias) || vence !== (b.vence_el ?? "");

  // El próximo pago se cobra con el plan al que va a pasar (si hay un cambio programado).
  const planCobro = planSig ?? b.plan;
  const montoMes = Math.round((precio(planCobro)?.precio_mensual ?? b.precio_mensual) * (1 - pct));
  const montoAnio = Math.round((precio(planCobro)?.precio_anual ?? b.precio_mensual * 12) * (1 - pct));

  // Cambio de plan: cuánto cobrar por la diferencia mientras le quedan días.
  const precioNuevo = Math.round((precio(plan)?.precio_mensual ?? 0) * (1 - pct));
  const cambiando = plan !== b.plan;
  const sube = precioNuevo > b.precio_mensual;
  const diferencia = sube && diasQuedan > 0 ? Math.round(((precioNuevo - b.precio_mensual) * diasQuedan) / 30) : 0;
  const puedeCobrar = diferencia > 0;
  const puedeProximo = diasQuedan > 0;
  const modoEf: ModoCambio = modo === "cobrar" && puedeCobrar ? "cobrar" : modo === "proximo" && puedeProximo ? "proximo" : modo === "gratis" ? "gratis" : puedeCobrar ? "cobrar" : "gratis";

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
  const cargarSiguiente = useCallback(async () => {
    const { data, error: err } = await supabase.from("barberias").select("plan_siguiente").eq("id", b.id).maybeSingle();
    setPlanSig(err ? null : ((data as { plan_siguiente: Plan | null } | null)?.plan_siguiente ?? null));
  }, [b.id]);
  useEffect(() => {
    void cargarPagos();
    void cargarSiguiente();
  }, [cargarPagos, cargarSiguiente]);

  async function cobrar(meses: number, monto: number) {
    setOcupado(true);
    setError("");
    const { data, error: err } = await supabase.rpc("admin_registrar_pago", { p_barberia: b.id, p_monto: monto, p_meses: meses, p_nota: meses === 12 ? "Pago anual" : "Pago mensual" });
    setConfirmar("");
    if (err) {
      setOcupado(false);
      return setError(err.message || "No se pudo registrar el pago.");
    }
    let extra = "";
    if (planSig) {
      const r = await supabase.from("barberias").update({ plan: planSig, plan_siguiente: null }).eq("id", b.id).select("id");
      if (!r.error && r.data && r.data.length > 0) {
        extra = ` Pasó al plan ${PLAN_LABEL[planSig]}.`;
        setPlan(planSig);
        setPlanSig(null);
      }
    }
    setOcupado(false);
    avisar(`Pago registrado. Vence el ${fechaMes(String(data))}.${extra}`);
    onCambio();
    void cargarPagos();
  }

  async function guardar() {
    const g = Math.round(Number(gracia));
    if (!Number.isFinite(g) || g < 0 || g > 30) {
      setSec("avanzado");
      return setError("Los días de gracia deben ser entre 0 y 30.");
    }
    if ((region && !comuna) || (!region && comuna)) {
      setSec("datos");
      return setError("Elige la región y la comuna.");
    }
    setOcupado(true);
    setError("");
    const { data, error: err } = await supabase
      .from("barberias")
      .update({ region, comuna, notas: notas.trim(), gracia_dias: g, vence_el: vence || null })
      .eq("id", b.id)
      .select("id");
    setOcupado(false);
    if (err || !data || data.length === 0) return setError("No se pudo guardar.");
    avisar("Cambios guardados");
    onCambio();
  }

  async function aplicarCambioPlan() {
    setOcupado(true);
    setError("");
    if (modoEf === "proximo") {
      const r = await supabase.from("barberias").update({ plan_siguiente: plan }).eq("id", b.id).select("id");
      setOcupado(false);
      if (r.error || !r.data || r.data.length === 0) return setError("No se pudo programar el cambio. Revisa que paso28-cambio-de-plan.sql esté ejecutado.");
      setPlanSig(plan);
      setPlan(b.plan);
      avisar(`Quedó programado: pasa a ${PLAN_LABEL[plan]} en su próximo pago`);
      return onCambio();
    }
    if (modoEf === "cobrar") {
      const { error: err } = await supabase.rpc("admin_registrar_diferencia", { p_barberia: b.id, p_monto: diferencia, p_nota: `Diferencia por cambio a ${PLAN_LABEL[plan]}` });
      if (err) {
        setOcupado(false);
        return setError(err.message.includes("admin_registrar_diferencia") ? "Falta ejecutar paso28-cambio-de-plan.sql en Supabase." : err.message);
      }
    }
    const cambio: Record<string, unknown> = { plan };
    if (planSig) cambio.plan_siguiente = null;
    const r = await supabase.from("barberias").update(cambio).eq("id", b.id).select("id");
    setOcupado(false);
    if (r.error || !r.data || r.data.length === 0) return setError("No se pudo cambiar el plan.");
    setPlanSig(null);
    avisar(modoEf === "cobrar" ? `Plan cambiado a ${PLAN_LABEL[plan]}. Diferencia anotada: ${clp(diferencia)}` : `Plan cambiado a ${PLAN_LABEL[plan]}`);
    onCambio();
    void cargarPagos();
  }

  async function cancelarProgramado() {
    setOcupado(true);
    const r = await supabase.from("barberias").update({ plan_siguiente: null }).eq("id", b.id).select("id");
    setOcupado(false);
    if (r.error || !r.data || r.data.length === 0) return setError("No se pudo cancelar el cambio.");
    setPlanSig(null);
    avisar("Cambio programado cancelado");
  }

  /** Deja la suscripción en 0 días: el vencimiento pasa a hoy. */
  async function reiniciar() {
    if (confirmar !== "reiniciar") return setConfirmar("reiniciar");
    setConfirmar("");
    setOcupado(true);
    setError("");
    const hoy = hoyChile();
    const { data, error: err } = await supabase.from("barberias").update({ vence_el: hoy }).eq("id", b.id).select("id");
    setOcupado(false);
    if (err || !data || data.length === 0) return setError("No se pudo reiniciar la suscripción.");
    setVence(hoy);
    avisar("Suscripción reiniciada: quedó en 0 días");
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

  async function eliminar() {
    if (!claveBorrar) return setError("Escribe tu clave para confirmar.");
    setOcupado(true);
    setError("");
    const motivo = await llamarFuncion("superadmin", { accion: "eliminar_barberia", barberia_id: b.id, clave: claveBorrar });
    setOcupado(false);
    if (motivo) return setError(motivo);
    avisar("Barbería eliminada");
    onCambio();
    onCerrar();
  }

  const secciones = [
    { id: "resumen", titulo: "Resumen", resumen: e.texto },
    { id: "pagos", titulo: "Pagos", resumen: b.ultimo_pago ? `Último pago: ${fechaMes(b.ultimo_pago)}` : "Sin pagos todavía" },
    { id: "plan", titulo: "Plan", resumen: `${PLAN_LABEL[b.plan]} · ${clp(b.precio_mensual)} al mes${planSig ? ` → ${PLAN_LABEL[planSig]}` : ""}` },
    { id: "datos", titulo: "Datos", resumen: `${b.dueno_nombre ?? "Sin dueño"} · ${b.comuna || "sin comuna"}` },
    { id: "avanzado", titulo: "Avanzado", resumen: "Fechas, clave, eliminar" },
  ];
  const editable = sec === "datos" || sec === "avanzado";

  return (
    <PanelLateral
      titulo={b.nombre}
      onCerrar={onCerrar}
      secciones={secciones}
      activa={sec}
      onActiva={(id) => {
        setSec(id as Sec);
        setError("");
      }}
      cabecera={
        <>
          <div className="bar-ini" aria-hidden="true">
            {b.nombre.trim().slice(0, 2).toUpperCase()}
          </div>
          <div className="bar-txt">
            <b>{b.nombre}</b>
            <small>/b/{b.slug} · desde {fechaMes(b.creada_en.slice(0, 10))}</small>
          </div>
          <span className={`chip sus-${e.tono}`}>● {e.texto}</span>
          <span className={`chip plan-${b.plan}`}>Plan {PLAN_LABEL[b.plan]}</span>
        </>
      }
      pie={
        <>
          <span className="pl-nota">
            {error ? (
              <span style={{ color: "var(--bad)" }} role="alert">
                {error}
              </span>
            ) : editable ? (
              "Los cambios de esta sección se guardan con el botón."
            ) : sec === "pagos" || sec === "plan" ? (
              "Aquí cada acción se guarda al instante."
            ) : (
              ""
            )}
          </span>
          <button className="btn btn-borde btn-chico" onClick={onCerrar}>
            Cerrar
          </button>
          {editable && (
            <button className="btn btn-primario btn-chico" disabled={ocupado || !cambios} onClick={() => void guardar()}>
              {ocupado ? "Guardando…" : "Guardar cambios"}
            </button>
          )}
        </>
      }
    >
      {sec === "resumen" && (
        <>
          {e.tono === "mal" || suspendida ? (
            <div className="pl-caja mal">
              <b>{suspendida ? "Esta barbería está suspendida" : "Esta barbería está bloqueada"}</b>
              <span className="pl-exp">
                {suspendida
                  ? "La pausaste a mano. Nadie puede reservar hasta que la reactives."
                  : `Venció el ${b.vence_el ? fechaMes(b.vence_el) : "—"}${dias !== null ? ` (hace ${-dias} ${-dias === 1 ? "día" : "días"})` : ""} y tiene ${b.gracia_dias} ${b.gracia_dias === 1 ? "día" : "días"} de gracia.`}
              </span>
            </div>
          ) : (
            <div className="pl-caja ok">
              <b>{b.vence_el ? `Vence el ${fechaMes(b.vence_el)}` : "Sin vencimiento"}</b>
              <span className="pl-exp">{dias !== null ? (dias >= 0 ? `Le quedan ${dias} ${dias === 1 ? "día" : "días"}.` : `Venció hace ${-dias} días, está en gracia.`) : ""}</span>
            </div>
          )}
          <div className="pl-caja guia">
            <b>¿Qué hago ahora?</b>
            {suspendida ? (
              <span className="pl-exp">Ve a <b>Avanzado</b> y toca «Reactivar barbería».</span>
            ) : e.tono === "mal" ? (
              <>
                <span className="pl-exp">1. Cuando el cliente te transfiera, ve a <b>Pagos</b> y toca «+ 1 mes».</span>
                <span className="pl-exp">2. Eso suma el tiempo y la reactiva sola. No hace falta cambiar nada más.</span>
              </>
            ) : (
              <span className="pl-exp">Todo en orden. Cuando te transfiera o esté por vencer, registra el pago en <b>Pagos</b>. Si quiere subir de plan, usa <b>Plan</b>.</span>
            )}
            <button className="btn btn-primario btn-chico" style={{ justifySelf: "start" }} onClick={() => setSec("pagos")}>
              Ir a Pagos
            </button>
          </div>
          <div className="pl-fichas">
            <div>
              <small>Barberos</small>
              <b>{b.barberos}</b>
            </div>
            <div>
              <small>Citas en 30 días</small>
              <b>{b.citas_30d}</b>
            </div>
          </div>
        </>
      )}

      {sec === "pagos" && (
        <>
          <div>
            <h3 className="pl-h">Registrar un pago</h3>
            <p className="pl-exp">
              Úsalo cuando el cliente te <b>transfiere</b>. Suma tiempo a la suscripción y reactiva la barbería. <b>No cambia el plan</b>
              {planSig ? `, salvo el cambio programado a ${PLAN_LABEL[planSig]}, que se aplica con este pago.` : "."}
            </p>
          </div>
          <div className="pl-pagos">
            <button className="pl-pago pri" disabled={ocupado} onClick={() => (confirmar === "mes" ? void cobrar(1, montoMes) : setConfirmar("mes"))} onBlur={() => setConfirmar("")}>
              {confirmar === "mes" ? "¿Confirmar el pago?" : `+ 1 mes · ${clp(montoMes)}`}
              <small>vence el {fechaMes(vencimientoCon(b, 1))}</small>
            </button>
            <button className="pl-pago" disabled={ocupado} onClick={() => (confirmar === "anio" ? void cobrar(12, montoAnio) : setConfirmar("anio"))} onBlur={() => setConfirmar("")}>
              {confirmar === "anio" ? "¿Confirmar el pago?" : `+ 1 año · ${clp(montoAnio)}`}
              <small>vence el {fechaMes(vencimientoCon(b, 12))}</small>
            </button>
            <button className="pl-pago" onClick={() => setOtra(!otra)}>
              Otra fecha
              <small>monto a mano</small>
            </button>
          </div>
          {otra && <RegistrarPago b={b} onListo={() => { onCambio(); void cargarPagos(); setOtra(false); }} />}
          <div className="pl-lab" style={{ marginTop: 6 }}>Historial de pagos</div>
          {pagos && pagos.length === 0 && <p className="suave" style={{ margin: 0 }}>Todavía no hay pagos registrados.</p>}
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
        </>
      )}

      {sec === "plan" && (
        <>
          <div>
            <h3 className="pl-h">Plan contratado</h3>
            <p className="pl-exp">
              Elige a qué plan quieres pasarlo. <b>Cambiar el plan no suma días ni cobra solo</b>: abajo decides cómo hacerlo.
            </p>
          </div>
          <div className="pl-planes" role="radiogroup" aria-label="Plan">
            {PLANES_ORDEN.map((p) => (
              <button key={p} role="radio" aria-checked={plan === p} className={`pl-plan${plan === p ? " on" : ""}`} onClick={() => setPlan(p)}>
                <b>
                  {PLAN_LABEL[p]}
                  {b.plan === p ? " · actual" : ""}
                </b>
                <strong>{clp(precio(p)?.precio_mensual ?? 0)}</strong>
                <small>{DESC_PLAN[p]}</small>
              </button>
            ))}
          </div>

          {planSig && (
            <div className="pl-caja guia">
              <b>Cambio programado a {PLAN_LABEL[planSig]}</b>
              <span className="pl-exp">Sigue con {PLAN_LABEL[b.plan]} hasta que registres su próximo pago; ahí pasa solo a {PLAN_LABEL[planSig]}.</span>
              <button className="btn btn-borde btn-chico" style={{ justifySelf: "start" }} disabled={ocupado} onClick={() => void cancelarProgramado()}>
                Cancelar el cambio
              </button>
            </div>
          )}

          {cambiando && (
            <div className="pl-caja">
              <b>
                Pasar de {PLAN_LABEL[b.plan]} a {PLAN_LABEL[plan]}
              </b>
              <span className="pl-exp">
                Hoy paga {clp(b.precio_mensual)} al mes y pasaría a {clp(precioNuevo)} al mes.
                {diasQuedan > 0 ? ` Le quedan ${diasQuedan} ${diasQuedan === 1 ? "día" : "días"} de suscripción.` : " No le quedan días: el plan nuevo parte con su próximo pago."}
              </span>
              <div style={{ display: "grid", gap: 8, marginTop: 4 }} role="radiogroup" aria-label="Cómo hacer el cambio">
                {puedeCobrar && (
                  <label className="interruptor">
                    <input type="radio" name="modo" checked={modoEf === "cobrar"} onChange={() => setModo("cobrar")} />
                    <span>
                      <b>Cambiar ahora y cobrar la diferencia: {clp(diferencia)}</b>
                      <small>({clp(precioNuevo)} − {clp(b.precio_mensual)}) × {diasQuedan} días ÷ 30. Queda anotado en el historial y no suma días.</small>
                    </span>
                  </label>
                )}
                <label className="interruptor">
                  <input type="radio" name="modo" checked={modoEf === "gratis"} onChange={() => setModo("gratis")} />
                  <span>
                    <b>{sube ? "Cambiar ahora, sin cobrar" : "Cambiar ahora"}</b>
                    <small>{sube ? "Es un regalo: tiene el plan nuevo por los días que le quedan." : "No se devuelve dinero; el precio nuevo rige desde su próximo pago."}</small>
                  </span>
                </label>
                {puedeProximo && (
                  <label className="interruptor">
                    <input type="radio" name="modo" checked={modoEf === "proximo"} onChange={() => setModo("proximo")} />
                    <span>
                      <b>Cambiar al próximo pago</b>
                      <small>Sigue con {PLAN_LABEL[b.plan]} hasta que venza. Cuando registres su pago, pasa a {PLAN_LABEL[plan]}.</small>
                    </span>
                  </label>
                )}
              </div>
              <button className="btn btn-primario" style={{ marginTop: 6 }} disabled={ocupado} onClick={() => void aplicarCambioPlan()}>
                {ocupado ? "Aplicando…" : modoEf === "cobrar" ? `Cambiar a ${PLAN_LABEL[plan]} y anotar ${clp(diferencia)}` : modoEf === "proximo" ? `Programar cambio a ${PLAN_LABEL[plan]}` : `Cambiar a ${PLAN_LABEL[plan]}`}
              </button>
            </div>
          )}

          <DescuentoBarberia b={b} onListo={onCambio} />
        </>
      )}

      {sec === "datos" && (
        <>
          <div>
            <h3 className="pl-h">Contacto</h3>
          </div>
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
          <div className="pl-lab">Ubicación</div>
          <SelectorComuna region={region} comuna={comuna} onCambio={(r, c) => { setRegion(r); setComuna(c); }} />
          <label className="campo">
            <span>Nota privada (solo tú la ves)</span>
            <input value={notas} onChange={(ev) => setNotas(ev.target.value)} maxLength={300} placeholder="Ej. cliente recomendado, paga los primeros de mes" />
          </label>
        </>
      )}

      {sec === "avanzado" && (
        <>
          <div>
            <div className="pl-lab">Fechas a mano (solo si hace falta corregir)</div>
            <p className="pl-exp">Para sumar tiempo por un pago usa la sección <b>Pagos</b>. Aquí solo corriges la fecha directamente.</p>
          </div>
          <div className="pl-fila2">
            <label className="campo">
              <span>Vence el</span>
              <input type="date" value={vence} onChange={(ev) => setVence(ev.target.value)} />
            </label>
            <label className="campo">
              <span>Días de gracia</span>
              <input type="number" inputMode="numeric" min={0} max={30} value={gracia} onChange={(ev) => setGracia(ev.target.value)} />
            </label>
          </div>
          <div className="acciones">
            <button type="button" className="btn btn-borde btn-chico" disabled={ocupado} onClick={() => void reiniciar()} onBlur={() => setConfirmar("")}>
              {confirmar === "reiniciar" ? "¿Dejar en 0 días?" : "Reiniciar suscripción"}
            </button>
            <button type="button" className="btn btn-borde btn-chico" onClick={() => setClaveAbierta(true)}>
              <Icon nombre="key" size={18} /> Cambiar clave del dueño
            </button>
          </div>

          <div className="pl-caja peligro">
            <div className="pl-lab" style={{ color: "var(--bad)" }}>Zona de peligro</div>
            <div className="acciones">
              <button className="btn btn-borde btn-chico" onClick={() => void suspender()} onBlur={() => setConfirmar("")}>
                {confirmar === "suspender" ? "¿Seguro?" : suspendida ? "Reactivar barbería" : "Suspender (se puede revertir)"}
              </button>
              {!borrar && (
                <button className="btn btn-peligro btn-chico" onClick={() => { setBorrar(true); setError(""); }}>
                  <Icon nombre="trash" size={18} /> Eliminar barbería…
                </button>
              )}
            </div>
            {borrar && (
              <>
                <p className="pl-exp" style={{ color: "#ffb4b4" }}>
                  <b style={{ color: "#ffb4b4" }}>Se borra para siempre</b>: sus {b.barberos} {b.barberos === 1 ? "barbero" : "barberos"}, clientes, citas, pagos, fotos y las cuentas de acceso. No se puede deshacer. Para confirmar, escribe <b style={{ color: "#ffb4b4" }}>tu clave</b> de superadmin:
                </p>
                <div className="pl-fila2">
                  <input
                    type="password"
                    className="pl-clave"
                    value={claveBorrar}
                    onChange={(ev) => setClaveBorrar(ev.target.value)}
                    autoComplete="current-password"
                    placeholder="Tu clave"
                    aria-label="Tu clave de superadmin"
                    style={{ minHeight: 44, padding: "0 12px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--bg)", color: "inherit", font: "inherit" }}
                  />
                  <div className="acciones">
                    <button className="btn btn-borde btn-chico" onClick={() => { setBorrar(false); setClaveBorrar(""); setError(""); }} disabled={ocupado}>
                      Cancelar
                    </button>
                    <button className="pl-peligro" onClick={() => void eliminar()} disabled={ocupado || !claveBorrar}>
                      {ocupado ? "Eliminando…" : "Eliminar definitivamente"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {claveAbierta && (
        <Hoja titulo="Clave del dueño" onCerrar={() => setClaveAbierta(false)}>
          <ClaveDueno b={b} onListo={() => setClaveAbierta(false)} />
        </Hoja>
      )}
    </PanelLateral>
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
        <div className="campo">
          <span>Meses que cubre</span>
          <Selector etiqueta="Meses que cubre" valor={meses} onCambio={setMeses} opciones={[1, 2, 3, 6, 12].map((n) => ({ valor: String(n), etiqueta: `${n} ${n === 1 ? "mes" : "meses"}` }))} />
        </div>
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

function ClaveDueno({ b, onListo }: { b: BarberiaAdmin; onListo?: () => void }) {
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
    onListo?.();
  };

  return (
    <div className="form-hoja">
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
