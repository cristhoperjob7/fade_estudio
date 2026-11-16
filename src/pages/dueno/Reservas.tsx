import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { fechaCorta, fechaLarga, hm, hoyChile, sumarDias } from "../../lib/fecha";
import { enlaceWhatsapp, formatearTelefono, mensajeConfirmacion, mensajeRechazo } from "../../lib/whatsapp";
import { useToast } from "../../components/Toast";
import Hoja from "../../components/Hoja";
import Icon from "../../components/Icon";
import type { EstadoCita } from "../../lib/types";

type Fila = {
  id: string;
  codigo: string;
  servicio_nombre: string;
  precio: number;
  fecha: string;
  inicio_min: number;
  cliente_nombre: string;
  cliente_telefono: string;
  estado: EstadoCita;
  comprobante_path: string | null;
  comprobante_en: string | null;
  comprobante_mime: string | null;
  comprobante_bytes: number | null;
  barbero: { nombre: string } | { nombre: string }[] | null;
};

const CAMPOS =
  "id,codigo,servicio_nombre,precio,fecha,inicio_min,cliente_nombre,cliente_telefono,estado,comprobante_path,comprobante_en,comprobante_mime,comprobante_bytes,barbero:perfiles!barbero_id(nombre)";
const MOTIVOS = ["No llegó la transferencia", "El monto no coincide", "El comprobante no se ve bien"];

const nombreBarbero = (b: Fila["barbero"]) => (Array.isArray(b) ? b[0]?.nombre : b?.nombre) ?? "—";
const primerNombre = (n: string) => n.trim().split(/\s+/)[0] ?? n;

export default function Reservas() {
  const avisar = useToast();
  const [porRevisar, setPorRevisar] = useState<Fila[] | null>(null);
  const [confirmadas, setConfirmadas] = useState<Fila[]>([]);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<Fila | null>(null);
  const [aj, setAj] = useState({ direccion: "", tolerancia: 15 });

  const cargar = useCallback(async () => {
    const hoy = hoyChile();
    const [a, b] = await Promise.all([
      supabase.from("citas").select(CAMPOS).eq("estado", "por_revisar").order("fecha").order("inicio_min"),
      supabase
        .from("citas")
        .select(CAMPOS)
        .eq("estado", "confirmada")
        .gte("fecha", sumarDias(hoy, -1))
        .order("fecha")
        .order("inicio_min")
        .limit(40),
    ]);
    if (a.error || b.error) {
      setError("No pudimos cargar las reservas. Revisa tu conexión.");
      return;
    }
    setError("");
    setPorRevisar((a.data ?? []) as unknown as Fila[]);
    setConfirmadas((b.data ?? []) as unknown as Fila[]);
  }, []);

  useEffect(() => {
    void cargar();
    supabase
      .from("ajustes")
      .select("direccion,tolerancia_min")
      .maybeSingle()
      .then(({ data }) => {
        const d = data as { direccion: string; tolerancia_min: number } | null;
        if (d) setAj({ direccion: d.direccion, tolerancia: d.tolerancia_min });
      });
    const canal = supabase
      .channel("reservas-dueno")
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => void cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [cargar]);

  return (
    <>
      <h1 className="titulo">Reservas</h1>
      <p className="suave">Revisa los comprobantes y confirma las horas.</p>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <h2 className="seccion">Por revisar{porRevisar && porRevisar.length > 0 ? ` (${porRevisar.length})` : ""}</h2>
      {porRevisar === null ? (
        <p className="suave">Cargando…</p>
      ) : porRevisar.length === 0 ? (
        <div className="vacio">No hay comprobantes pendientes.</div>
      ) : (
        <ul className="lista">
          {porRevisar.map((c) => (
            <li key={c.id}>
              <button className="fila fila-btn" onClick={() => setSel(c)}>
                <span className="hora num">{hm(c.inicio_min)}</span>
                <span className="fila-cuerpo">
                  <b>{c.cliente_nombre}</b>
                  <small>
                    {c.servicio_nombre} · {fechaCorta(c.fecha)} · {clp(c.precio)}
                  </small>
                </span>
                <span className="chip dorado">Revisar</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="seccion">Confirmadas</h2>
      {confirmadas.length === 0 ? (
        <div className="vacio">Aún no hay horas confirmadas.</div>
      ) : (
        <ul className="lista">
          {confirmadas.map((c) => (
            <li key={c.id}>
              <button className="fila fila-btn" onClick={() => setSel(c)}>
                <span className="hora num">{hm(c.inicio_min)}</span>
                <span className="fila-cuerpo">
                  <b>{c.cliente_nombre}</b>
                  <small>
                    {fechaCorta(c.fecha)} · {c.servicio_nombre}
                  </small>
                </span>
                <span className="chip azul">{nombreBarbero(c.barbero)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sel && (
        <Revision
          cita={sel}
          direccion={aj.direccion}
          tolerancia={aj.tolerancia}
          onCerrar={() => setSel(null)}
          onCambio={() => void cargar()}
          avisar={avisar}
        />
      )}
    </>
  );
}

type Modo = "ver" | "rechazar" | "aprobada" | "rechazada";

function Revision({
  cita,
  direccion,
  tolerancia,
  onCerrar,
  onCambio,
  avisar,
}: {
  cita: Fila;
  direccion: string;
  tolerancia: number;
  onCerrar: () => void;
  onCambio: () => void;
  avisar: (m: string, t?: "ok" | "error") => void;
}) {
  const [modo, setModo] = useState<Modo>(cita.estado === "confirmada" ? "aprobada" : "ver");
  const [checks, setChecks] = useState([false, false, false]);
  const [url, setUrl] = useState("");
  const [esPdf, setEsPdf] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    if (!cita.comprobante_path || cita.estado !== "por_revisar") return;
    setEsPdf(cita.comprobante_path.toLowerCase().endsWith(".pdf"));
    supabase.storage
      .from("comprobantes")
      .createSignedUrl(cita.comprobante_path, 600)
      .then(({ data }) => setUrl(data?.signedUrl ?? ""));
  }, [cita.comprobante_path, cita.estado]);

  const todo = checks.every(Boolean);
  const lista = [
    `El monto es ${clp(cita.precio)}`,
    "La transferencia aparece en mi cuenta",
    "El nombre y la fecha corresponden",
  ];

  const aprobar = async () => {
    setTrabajando(true);
    const { error } = await supabase.rpc("aprobar_cita", { p_cita: cita.id });
    setTrabajando(false);
    if (error) return avisar(error.message || "No se pudo aprobar.", "error");
    setModo("aprobada");
    onCambio();
  };
  const rechazar = async () => {
    setTrabajando(true);
    const { error } = await supabase.rpc("rechazar_cita", { p_cita: cita.id, p_motivo: motivo });
    setTrabajando(false);
    if (error) return avisar(error.message || "No se pudo rechazar.", "error");
    setModo("rechazada");
    onCambio();
  };

  const base = {
    cliente: primerNombre(cita.cliente_nombre),
    servicio: cita.servicio_nombre,
    fecha: cita.fecha,
    inicioMin: cita.inicio_min,
  };
  const wspConfirmacion = enlaceWhatsapp(
    cita.cliente_telefono,
    mensajeConfirmacion({ ...base, barbero: nombreBarbero(cita.barbero), direccion, toleranciaMin: tolerancia }),
  );
  const wspRechazo = enlaceWhatsapp(cita.cliente_telefono, mensajeRechazo({ ...base, motivo }));

  const datos = (
    <div className="datos">
      <div>
        <span>Cliente</span>
        <b>{cita.cliente_nombre}</b>
      </div>
      <div>
        <span>WhatsApp</span>
        <b className="num">{formatearTelefono(cita.cliente_telefono)}</b>
      </div>
      <div>
        <span>Servicio</span>
        <b>{cita.servicio_nombre}</b>
      </div>
      <div>
        <span>Día y hora</span>
        <b className="capital">
          {fechaLarga(cita.fecha)}, {hm(cita.inicio_min)}
        </b>
      </div>
      <div>
        <span>Barbero</span>
        <b>{nombreBarbero(cita.barbero)}</b>
      </div>
      <div>
        <span>Monto</span>
        <b className="num">{clp(cita.precio)}</b>
      </div>
    </div>
  );

  if (modo === "aprobada" || modo === "rechazada") {
    const ok = modo === "aprobada";
    return (
      <Hoja titulo={ok ? (cita.estado === "confirmada" ? "Hora confirmada" : "Hora aprobada") : "Reserva rechazada"} onCerrar={onCerrar}>
        {datos}
        <div className="acciones">
          <a className="btn btn-primario" target="_blank" rel="noreferrer" href={ok ? wspConfirmacion : wspRechazo}>
            <Icon nombre="whatsapp" size={20} />
            {ok ? "Avisar al cliente por WhatsApp" : "Explicarle al cliente por WhatsApp"}
          </a>
          <button className="btn btn-texto" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <p className="suave chico">
          {ok
            ? "El mensaje sale escrito, con el día, la hora y la dirección. Solo presiona enviar."
            : "La hora quedó libre para otros clientes."}
        </p>
      </Hoja>
    );
  }

  return (
    <Hoja titulo="Revisar comprobante" onCerrar={onCerrar}>
      {datos}

      {cita.comprobante_mime && (
        <p className="suave">
          Archivo revisado por el sistema ({cita.comprobante_mime === "application/pdf" ? "PDF" : cita.comprobante_mime.replace("image/", "").toUpperCase()}
          {cita.comprobante_bytes ? `, ${Math.max(1, Math.round(cita.comprobante_bytes / 1024))} KB` : ""}). Aun así, confirma en tu banco que llegó el dinero.
        </p>
      )}

      <div className="comprobante">
        {!url ? (
          <p className="suave">Cargando comprobante…</p>
        ) : esPdf ? (
          <a className="btn btn-borde" href={url} target="_blank" rel="noreferrer">
            Abrir comprobante (PDF)
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" aria-label="Abrir el comprobante en grande">
            <img src={url} alt="Comprobante de transferencia" />
          </a>
        )}
      </div>

      {modo === "ver" ? (
        <>
          <fieldset className="checks">
            <legend>Antes de aprobar, revisa:</legend>
            {lista.map((t, i) => (
              <label key={t} className="check">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                <span>{t}</span>
              </label>
            ))}
          </fieldset>
          <div className="acciones">
            <button className="btn btn-primario" disabled={!todo || trabajando} onClick={aprobar}>
              <Icon nombre="check" size={20} />
              {trabajando ? "Aprobando…" : "Aprobar hora"}
            </button>
            <button className="btn btn-borde" disabled={trabajando} onClick={() => setModo("rechazar")}>
              Rechazar
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="motivos">
            {MOTIVOS.map((m) => (
              <button key={m} className={`chip ${motivo === m ? "azul" : ""}`} onClick={() => setMotivo(m)}>
                {m}
              </button>
            ))}
          </div>
          <label className="campo">
            Motivo (se lo puedes mandar al cliente)
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ej: no llegó la transferencia" />
          </label>
          <div className="acciones">
            <button className="btn btn-primario peligro" disabled={trabajando} onClick={rechazar}>
              {trabajando ? "Rechazando…" : "Confirmar rechazo"}
            </button>
            <button className="btn btn-texto" onClick={() => setModo("ver")}>
              Volver
            </button>
          </div>
        </>
      )}
    </Hoja>
  );
}
