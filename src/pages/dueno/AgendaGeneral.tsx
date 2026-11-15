import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { fechaCorta, fechaLarga, hm, hoyChile, minutosChile, sumarDias } from "../../lib/fecha";
import { enlaceWhatsapp, formatearTelefono, mensajeClienteNoLlega } from "../../lib/whatsapp";
import { ESTADO_LABEL } from "../../lib/types";
import type { Cita, EstadoCita } from "../../lib/types";
import { useToast } from "../../components/Toast";
import Hoja from "../../components/Hoja";
import Icon from "../../components/Icon";

const PX_HORA = 64;
const CAMPOS = "id,codigo,barbero_id,servicio_nombre,precio,fecha,inicio_min,dur_min,cliente_nombre,cliente_telefono,estado";
const VISIBLES: EstadoCita[] = ["por_revisar", "confirmada", "atendida", "no_llego"];

type Col = { id: string; nombre: string };

/** Agenda general del dueño: una columna por barbero, todas las citas del día. */
export default function AgendaGeneral() {
  const avisar = useToast();
  const hoy = hoyChile();
  const [fecha, setFecha] = useState(hoy);
  const [citas, setCitas] = useState<Cita[] | null>(null);
  const [cols, setCols] = useState<Col[]>([]);
  const [horario, setHorario] = useState({ nombre: "", apertura: 600, cierre: 1200 });
  const [sel, setSel] = useState<Cita | null>(null);
  const [ahora, setAhora] = useState(minutosChile());
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("ajustes")
      .select("nombre,hora_apertura,hora_cierre")
      .maybeSingle()
      .then(({ data }) => {
        const d = data as { nombre: string; hora_apertura: number; hora_cierre: number } | null;
        if (d) setHorario({ nombre: d.nombre, apertura: d.hora_apertura, cierre: d.hora_cierre });
      });
    supabase
      .from("perfiles")
      .select("id,nombre,rol,atiende,activo")
      .eq("activo", true)
      .eq("atiende", true)
      .order("nombre")
      .then(({ data }) => setCols(((data ?? []) as Col[]).map((p) => ({ id: p.id, nombre: p.nombre }))));
  }, []);

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.from("citas").select(CAMPOS).eq("fecha", fecha).in("estado", VISIBLES).order("inicio_min");
    if (err) return setError("No pudimos cargar la agenda. Revisa tu conexión.");
    setError("");
    setCitas((data ?? []) as Cita[]);
  }, [fecha]);

  useEffect(() => {
    setCitas(null);
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const canal = supabase
      .channel("agenda-general")
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => void cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [cargar]);

  useEffect(() => {
    const id = window.setInterval(() => setAhora(minutosChile()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const cambiar = async (c: Cita, estado: EstadoCita, mensaje: string) => {
    const { data, error: err } = await supabase.from("citas").update({ estado }).eq("id", c.id).select("id");
    if (err || !data || data.length === 0) return avisar("No se pudo guardar el cambio.", "error");
    setSel(null);
    avisar(mensaje);
    void cargar();
  };

  const lista = citas ?? [];
  // Si una cita es de alguien que ya no atiende, igual aparece (columna extra).
  const columnas = useMemo(() => {
    const extra = lista.filter((c) => !cols.some((k) => k.id === c.barbero_id)).map((c) => c.barbero_id);
    return [...cols, ...Array.from(new Set(extra)).map((id) => ({ id, nombre: "Otro" }))];
  }, [cols, lista]);
  const nombreDe = (id: string) => columnas.find((k) => k.id === id)?.nombre ?? "";

  const desde = Math.floor(horario.apertura / 60) * 60;
  const hasta = Math.ceil(horario.cierre / 60) * 60;
  const horas = useMemo(() => Array.from({ length: (hasta - desde) / 60 + 1 }, (_, i) => desde + i * 60), [desde, hasta]);
  const y = (min: number) => ((min - desde) / 60) * PX_HORA;
  const lineaAhora = fecha === hoy && ahora >= desde && ahora <= hasta ? y(ahora) : null;
  const n = Math.max(columnas.length, 1);
  const ancho = 100 / n;
  const pendientes = lista.filter((c) => c.estado === "por_revisar").length;
  const opciones = [
    { f: sumarDias(hoy, -1), t: "Ayer" },
    { f: hoy, t: "Hoy" },
    { f: sumarDias(hoy, 1), t: "Mañana" },
  ];

  return (
    <>
      <h1 className="titulo">Agenda</h1>
      <p className="suave capital">
        {fechaLarga(fecha)} · {lista.length} {lista.length === 1 ? "cita" : "citas"}
        {pendientes > 0 ? ` · ${pendientes} por revisar` : ""}
      </p>

      <div className="seg" role="tablist" aria-label="Día">
        {opciones.map((o) => (
          <button key={o.f} role="tab" aria-selected={fecha === o.f} className={fecha === o.f ? "on" : ""} onClick={() => setFecha(o.f)}>
            {o.t}
            <small>{fechaCorta(o.f)}</small>
          </button>
        ))}
      </div>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <div className="cols-cab" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {columnas.map((k) => (
          <span key={k.id}>{k.nombre.split(" ")[0]}</span>
        ))}
      </div>

      <div className="grilla grilla-cols" style={{ height: ((hasta - desde) / 60) * PX_HORA }}>
        {horas.map((m) => (
          <div key={m} className="grilla-hora" style={{ top: y(m) }}>
            <em className="num">{hm(m)}</em>
          </div>
        ))}
        {lineaAhora !== null && <div className="ahora" style={{ top: lineaAhora }} aria-label="Hora actual" />}
        {columnas.map((k, i) => (
          <div key={k.id} className="col" style={{ left: `${i * ancho}%`, width: `${ancho}%` }}>
            {lista
              .filter((c) => c.barbero_id === k.id)
              .map((c) => (
                <button
                  key={c.id}
                  className={`ev ${c.estado === "por_revisar" ? "pend" : c.estado === "atendida" ? "ok" : c.estado === "no_llego" ? "nollego" : ""} ${
                    c.dur_min <= 30 ? "corto" : ""
                  } ${n > 2 ? "estrecho" : ""}`}
                  style={{ top: y(c.inicio_min) + 1, height: (c.dur_min / 60) * PX_HORA - 3, left: 3, right: 3 }}
                  onClick={() => setSel(c)}
                >
                  <b className="num">{c.cliente_nombre}</b>
                  <small>
                    {hm(c.inicio_min)} · {c.servicio_nombre}
                  </small>
                </button>
              ))}
          </div>
        ))}
      </div>

      {citas && lista.length === 0 && <div className="vacio">No hay citas para este día.</div>}

      {sel && (
        <Hoja titulo={sel.cliente_nombre} onCerrar={() => setSel(null)}>
          <div className="datos">
            <div>
              <span>Barbero</span>
              <b>{nombreDe(sel.barbero_id) || "—"}</b>
            </div>
            <div>
              <span>Hora</span>
              <b className="num">
                {hm(sel.inicio_min)} – {hm(sel.inicio_min + sel.dur_min)}
              </b>
            </div>
            <div>
              <span>Servicio</span>
              <b>{sel.servicio_nombre}</b>
            </div>
            <div>
              <span>Teléfono</span>
              <b className="num">{formatearTelefono(sel.cliente_telefono)}</b>
            </div>
            <div>
              <span>Precio</span>
              <b className="num">{clp(sel.precio)}</b>
            </div>
            <div>
              <span>Estado</span>
              <b>{ESTADO_LABEL[sel.estado]}</b>
            </div>
          </div>

          {sel.estado === "por_revisar" && (
            <div className="acciones">
              <Link className="btn btn-primario" to="/panel/reservas">
                <Icon nombre="receipt" size={20} />
                Revisar comprobante
              </Link>
            </div>
          )}

          {sel.estado === "confirmada" && (
            <div className="acciones">
              <button className="btn btn-primario" onClick={() => cambiar(sel, "atendida", "Cita marcada como atendida")}>
                <Icon nombre="check" size={20} />
                Marcar atendida
              </button>
              <a
                className="btn btn-borde"
                target="_blank"
                rel="noreferrer"
                href={enlaceWhatsapp(
                  sel.cliente_telefono,
                  mensajeClienteNoLlega({
                    cliente: sel.cliente_nombre.split(" ")[0],
                    servicio: sel.servicio_nombre,
                    fecha: sel.fecha,
                    inicioMin: sel.inicio_min,
                    barbero: (nombreDe(sel.barbero_id) || "tu barbero").split(" ")[0],
                    barberia: horario.nombre || "la barbería",
                  }),
                )}
              >
                <Icon nombre="whatsapp" size={20} />
                Escribirle por WhatsApp
              </a>
              <button className="btn btn-texto" onClick={() => cambiar(sel, "no_llego", "Marcada como «no llegó»")}>
                El cliente no llegó
              </button>
              <button className="btn btn-texto" onClick={() => cambiar(sel, "cancelada", "Cita cancelada")}>
                Cancelar la cita
              </button>
            </div>
          )}

          {(sel.estado === "atendida" || sel.estado === "no_llego") && (
            <div className="acciones">
              <button className="btn btn-borde" onClick={() => cambiar(sel, "confirmada", "Cita restaurada")}>
                Deshacer
              </button>
            </div>
          )}
        </Hoja>
      )}
    </>
  );
}
