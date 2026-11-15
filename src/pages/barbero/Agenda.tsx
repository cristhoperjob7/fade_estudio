import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { fechaCorta, fechaLarga, hm, hoyChile, minutosChile, sumarDias } from "../../lib/fecha";
import { enlaceWhatsapp, formatearTelefono, mensajeClienteNoLlega } from "../../lib/whatsapp";
import { ESTADO_LABEL } from "../../lib/types";
import type { Cita, EstadoCita } from "../../lib/types";
import { useToast } from "../../components/Toast";
import Hoja from "../../components/Hoja";
import Icon from "../../components/Icon";

const PX_HORA = 64; // alto en pantalla de una hora
const CAMPOS = "id,codigo,barbero_id,servicio_nombre,precio,fecha,inicio_min,dur_min,cliente_nombre,cliente_telefono,estado";
const VISIBLES: EstadoCita[] = ["confirmada", "atendida", "no_llego"];

export default function Agenda() {
  const { perfil } = useAuth();
  const avisar = useToast();
  const hoy = hoyChile();
  const [fecha, setFecha] = useState(hoy);
  const [citas, setCitas] = useState<Cita[] | null>(null);
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
  }, []);

  const cargar = useCallback(async () => {
    if (!perfil) return;
    const { data, error: err } = await supabase
      .from("citas")
      .select(CAMPOS)
      .eq("fecha", fecha)
      .eq("barbero_id", perfil.id)
      .in("estado", VISIBLES)
      .order("inicio_min");
    if (err) {
      setError("No pudimos cargar tu agenda. Revisa tu conexión.");
      return;
    }
    setError("");
    setCitas((data ?? []) as Cita[]);
  }, [fecha, perfil]);

  useEffect(() => {
    setCitas(null);
    void cargar();
  }, [cargar]);

  // En vivo: cuando el dueño aprueba una hora, aparece sola.
  useEffect(() => {
    const canal = supabase
      .channel("agenda-barbero")
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => void cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [cargar]);

  // La línea roja de "ahora" se mueve cada minuto.
  useEffect(() => {
    const id = window.setInterval(() => setAhora(minutosChile()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const cambiar = async (c: Cita, estado: EstadoCita, mensaje: string) => {
    const { data, error: err } = await supabase.from("citas").update({ estado }).eq("id", c.id).select("id");
    if (err || !data || data.length === 0) {
      avisar("No se pudo guardar el cambio.", "error");
      return;
    }
    setSel(null);
    avisar(mensaje);
    void cargar();
  };

  const desde = Math.floor(horario.apertura / 60) * 60;
  const hasta = Math.ceil(horario.cierre / 60) * 60;
  const horas = useMemo(() => Array.from({ length: (hasta - desde) / 60 + 1 }, (_, i) => desde + i * 60), [desde, hasta]);
  const y = (min: number) => ((min - desde) / 60) * PX_HORA;
  const lineaAhora = fecha === hoy && ahora >= desde && ahora <= hasta ? y(ahora) : null;

  const lista = citas ?? [];
  const siguiente = fecha === hoy ? lista.find((c) => c.estado === "confirmada" && c.inicio_min + c.dur_min > ahora) : undefined;
  const opciones = [
    { f: sumarDias(hoy, -1), t: "Ayer" },
    { f: hoy, t: "Hoy" },
    { f: sumarDias(hoy, 1), t: "Mañana" },
  ];

  return (
    <>
      <h1 className="titulo">Tu agenda</h1>
      <p className="suave capital">
        {fechaLarga(fecha)} · {lista.length} {lista.length === 1 ? "cita" : "citas"}
        {siguiente ? ` · siguiente ${hm(siguiente.inicio_min)}` : ""}
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

      <div className="grilla" style={{ height: (hasta - desde) / 60 * PX_HORA }}>
        {horas.map((m) => (
          <div key={m} className="grilla-hora" style={{ top: y(m) }}>
            <em className="num">{hm(m)}</em>
          </div>
        ))}
        {lineaAhora !== null && <div className="ahora" style={{ top: lineaAhora }} aria-label="Hora actual" />}
        {lista.map((c) => (
          <button
            key={c.id}
            className={`ev ${c.estado === "atendida" ? "ok" : c.estado === "no_llego" ? "nollego" : ""} ${c.dur_min <= 30 ? "corto" : ""}`}
            style={{ top: y(c.inicio_min) + 1, height: (c.dur_min / 60) * PX_HORA - 3 }}
            onClick={() => setSel(c)}
          >
            <b className="num">
              {hm(c.inicio_min)} · {c.cliente_nombre}
            </b>
            <small>{c.servicio_nombre}</small>
          </button>
        ))}
      </div>

      {citas && lista.length === 0 && <div className="vacio">No tienes citas confirmadas para este día.</div>}

      {sel && (
        <Hoja titulo={sel.cliente_nombre} onCerrar={() => setSel(null)}>
          <div className="datos">
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

          {sel.estado === "confirmada" ? (
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
                    barbero: perfil?.nombre.split(" ")[0] ?? "tu barbero",
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
            </div>
          ) : (
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
