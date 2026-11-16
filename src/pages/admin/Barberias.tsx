import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { aSlug, estadoSuscripcion, fechaMes } from "../../lib/admin";
import { claveAleatoria, llamarFuncion } from "../../lib/equipo";
import { hoyChile } from "../../lib/fecha";
import type { BarberiaAdmin, PagoSuscripcion, Plan } from "../../lib/types";
import { PLAN_LABEL } from "../../lib/types";
import { DIAS_PRUEBA, usePlanes } from "../../lib/planes";
import type { Solicitud } from "./Solicitudes";
import { useToast } from "../../components/Toast";
import Hoja from "../../components/Hoja";
import Seccion from "../../components/Seccion";
import Icon from "../../components/Icon";


export default function Barberias() {
  const [q, setQ] = useSearchParams();
  const [lista, setLista] = useState<BarberiaAdmin[] | null>(null);
  const [error, setError] = useState("");
  const [nueva, setNueva] = useState(false);
  const [desdeSolicitud, setDesdeSolicitud] = useState<Solicitud | null>(null);
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
    if (err) return setError("No pudimos cargar las barberías. Revisa que paso02-superadmin.sql esté ejecutado.");
    setError("");
    setLista((data ?? []) as BarberiaAdmin[]);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abierta = lista?.find((b) => b.id === q.get("id")) ?? null;
  const cerrar = () => setQ({}, { replace: true });

  return (
    <>
      <h1 className="titulo">Barberías</h1>
      <p className="suave">Tus clientes, su plan y hasta cuándo pagaron.</p>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <ul className="lista">
        {(lista ?? []).map((b) => {
          const e = estadoSuscripcion(b);
          return (
            <li key={b.id}>
              <button className="fila fila-btn" onClick={() => setQ({ id: b.id }, { replace: true })}>
                <span className="fila-cuerpo">
                  <b>{b.nombre}</b>
                  <small>
                    {PLAN_LABEL[b.plan]} · {clp(b.precio_mensual)}/mes · {b.citas_30d} {b.citas_30d === 1 ? "cita" : "citas"} en 30 días
                  </small>
                </span>
                <span className={`chip sus-${e.tono}`}>{e.texto}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {lista && lista.length === 0 && <div className="vacio">Aún no tienes barberías. Crea la primera.</div>}

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

function Detalle({ b, onCerrar, onCambio }: { b: BarberiaAdmin; onCerrar: () => void; onCambio: () => void }) {
  const avisar = useToast();
  const e = estadoSuscripcion(b);
  const [pagos, setPagos] = useState<PagoSuscripcion[] | null>(null);
  const enlace = `${window.location.origin}/b/${b.slug}`;

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

  const [abierta, setAbierta] = useState<"pago" | "plan" | "historial" | "dueno" | "">("pago");
  const [confirmar, setConfirmar] = useState(false);
  const alternar = (k: typeof abierta) => setAbierta(abierta === k ? "" : k);
  const suspendida = b.estado === "suspendida";

  async function suspender() {
    if (!confirmar) return setConfirmar(true);
    setConfirmar(false);
    const { data, error: err } = await supabase
      .from("barberias")
      .update({ estado: suspendida ? "activa" : "suspendida" })
      .eq("id", b.id)
      .select("id");
    if (err || !data || data.length === 0) return avisar("No se pudo cambiar el estado", "error");
    avisar(suspendida ? "Barbería reactivada" : "Barbería suspendida");
    onCambio();
  }

  return (
    <Hoja titulo="Barbería" onCerrar={onCerrar}>
      <div className="bar-resumen">
        <div className="bar-ini" aria-hidden="true">
          {b.nombre.trim().slice(0, 2).toUpperCase()}
        </div>
        <div className="bar-txt">
          <b>{b.nombre}</b>
          <small>
            {PLAN_LABEL[b.plan]} · {b.dueno_nombre ?? "sin dueño"}
          </small>
        </div>
        <span className={`chip sus-${e.tono}`}>{e.texto}</span>
      </div>

      <div className="bar-rapidas">
        <button className="btn btn-primario btn-chico" onClick={() => setAbierta("pago")}>
          Registrar pago
        </button>
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
        <button className="btn btn-borde btn-chico" onClick={() => void suspender()} onBlur={() => setConfirmar(false)}>
          {confirmar ? "¿Seguro?" : suspendida ? "Reactivar" : "Suspender"}
        </button>
      </div>

      <Seccion titulo="Registrar pago" resumen={b.vence_el ? `Vence el ${fechaMes(b.vence_el)}` : "Sin vencimiento"} icono="receipt" abierta={abierta === "pago"} onToggle={() => alternar("pago")}>
        <RegistrarPago b={b} onListo={() => { onCambio(); void cargarPagos(); }} />
      </Seccion>
      <Seccion titulo="Plan y vencimiento" resumen={`${PLAN_LABEL[b.plan]} · ${clp(b.precio_mensual)}/mes`} icono="tag" abierta={abierta === "plan"} onToggle={() => alternar("plan")}>
        <Editar b={b} onListo={onCambio} />
        <DescuentoBarberia b={b} onListo={onCambio} />
      </Seccion>
      <Seccion titulo="Historial de pagos" resumen={pagos ? `${pagos.length} ${pagos.length === 1 ? "pago" : "pagos"}` : ""} icono="clock" abierta={abierta === "historial"} onToggle={() => alternar("historial")}>
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
      </Seccion>
      <Seccion titulo="Datos y clave del dueño" resumen={b.dueno_correo ?? ""} icono="user" abierta={abierta === "dueno"} onToggle={() => alternar("dueno")}>
        <div className="datos">
          <div>
            <span>Dueño</span>
            <b>{b.dueno_nombre ?? "—"}</b>
          </div>
          <div>
            <span>Correo</span>
            <b>{b.dueno_correo ?? "—"}</b>
          </div>
          <div>
            <span>Página</span>
            <b>/b/{b.slug}</b>
          </div>
        </div>
        <ClaveDueno b={b} />
      </Seccion>
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

function Editar({ b, onListo }: { b: BarberiaAdmin; onListo: () => void }) {
  const avisar = useToast();
  const [nombre, setNombre] = useState(b.nombre);
  const [plan, setPlan] = useState<Plan>(b.plan);
  const [vence, setVence] = useState(b.vence_el ?? "");
  const [gracia, setGracia] = useState(String(b.gracia_dias));
  const [suspendida, setSuspendida] = useState(b.estado === "suspendida");
  const [notas, setNotas] = useState(b.notas);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault();
    const g = Math.round(Number(gracia));
    if (nombre.trim().length < 2) return setError("Escribe el nombre.");
    if (!Number.isFinite(g) || g < 0 || g > 30) return setError("Los días de gracia deben ser entre 0 y 30.");
    setOcupado(true);
    setError("");
    const { data, error: err } = await supabase
      .from("barberias")
      .update({
        nombre: nombre.trim(),
        plan,
        vence_el: vence || null,
        gracia_dias: g,
        estado: suspendida ? "suspendida" : "activa",
        notas: notas.trim(),
      })
      .eq("id", b.id)
      .select("id");
    setOcupado(false);
    if (err || !data || data.length === 0) return setError("No se pudo guardar.");
    avisar("Cambios guardados");
    onListo();
  };

  return (
    <form className="form-hoja" onSubmit={guardar}>
      <label className="campo">
        <span>Nombre (para ti)</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} required />
      </label>
      <div className="fila-dos">
        <label className="campo">
          <span>Plan</span>
          <select value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
            <option value="basico">Básico</option>
            <option value="pro">Pro</option>
            <option value="vip">VIP</option>
          </select>
        </label>
        <div className="campo">
          <span>Precio al mes</span>
          <b style={{ minHeight: 48, display: "flex", alignItems: "center" }}>{clp(b.precio_mensual)}</b>
          <small>Sale del plan{b.precio_mensual !== 0 ? " y del descuento aplicado" : ""}. Se cambia en Planes.</small>
        </div>
      </div>
      <div className="fila-dos">
        <label className="campo">
          <span>Vence el</span>
          <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
        </label>
        <label className="campo">
          <span>Días de gracia</span>
          <input type="number" inputMode="numeric" min={0} max={30} value={gracia} onChange={(e) => setGracia(e.target.value)} />
        </label>
      </div>
      <label className="campo">
        <span>Notas privadas</span>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} placeholder="Ej. cliente recomendado" />
      </label>
      <label className="interruptor">
        <input type="checkbox" checked={suspendida} onChange={(e) => setSuspendida(e.target.checked)} />
        <span>
          <b>Suspender barbería</b>
          <small>Bloquea el panel y las reservas al instante. Sus datos se conservan.</small>
        </span>
      </label>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primario" disabled={ocupado}>
        {ocupado ? "Guardando…" : "Guardar cambios"}
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
