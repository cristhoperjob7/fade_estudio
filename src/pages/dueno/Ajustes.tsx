import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import AvisosPush from "../../components/AvisosPush";
import CambiarClave from "../../components/CambiarClave";
import ServiciosEditor from "../../components/ServiciosEditor";
import { useAuth } from "../../lib/auth";
import { aMinutos, hm } from "../../lib/fecha";
import { formatearTelefono, normalizarTelefono } from "../../lib/whatsapp";
import type { Ajustes as TAjustes, DatosTransferencia } from "../../lib/types";

const TIPOS_CUENTA = ["Cuenta corriente", "Cuenta vista", "Cuenta RUT", "Cuenta de ahorro"];

export default function Ajustes() {
  const avisar = useToast();
  const { barberia } = useAuth();
  const [a, setA] = useState<TAjustes | null>(null);
  const [t, setT] = useState<DatosTransferencia | null>(null);
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState("");

  // El WhatsApp y los horarios se editan como texto y se convierten al guardar.
  const [whatsapp, setWhatsapp] = useState("");
  const [apertura, setApertura] = useState("10:00");
  const [cierre, setCierre] = useState("20:00");

  useEffect(() => {
    void (async () => {
      const [ra, rt] = await Promise.all([
        supabase.from("ajustes").select("*").maybeSingle(),
        supabase.from("datos_transferencia").select("*").maybeSingle(),
      ]);
      const aj = ra.data as TAjustes | null;
      const tr = rt.data as DatosTransferencia | null;
      if (aj) {
        setA(aj);
        setWhatsapp(aj.whatsapp ? formatearTelefono(aj.whatsapp) : "");
        setApertura(hm(aj.hora_apertura));
        setCierre(hm(aj.hora_cierre));
      }
      if (tr) setT(tr);
      setCargado(true);
    })();
  }, []);

  if (!cargado) return <p className="suave">Cargando…</p>;
  if (!a || !t) {
    return (
      <p className="aviso error" role="alert">
        No encontramos los ajustes. Ejecuta paso01.sql en Supabase y recarga.
      </p>
    );
  }

  const guardar = async (clave: string, tabla: "ajustes" | "datos_transferencia", cambios: Record<string, unknown>) => {
    setGuardando(clave);
    const { data, error } = await supabase.from(tabla).update(cambios).eq("barberia_id", a.barberia_id).select("barberia_id");
    setGuardando("");
    if (error || !data || data.length === 0) {
      avisar("No se pudo guardar. Revisa tu conexión o tus permisos.", "error");
      return false;
    }
    avisar("Cambios guardados");
    return true;
  };

  const guardarBarberia = async (e: FormEvent) => {
    e.preventDefault();
    const tel = whatsapp.trim() ? normalizarTelefono(whatsapp) : "";
    if (whatsapp.trim() && !tel) {
      avisar("El WhatsApp debe ser un celular chileno de 9 dígitos. Ej: +56 9 1234 5678", "error");
      return;
    }
    if (!a.nombre.trim()) {
      avisar("Escribe el nombre de la barbería.", "error");
      return;
    }
    if (await guardar("barberia", "ajustes", { nombre: a.nombre.trim(), direccion: a.direccion.trim(), whatsapp: tel })) {
      setWhatsapp(tel ? formatearTelefono(tel) : "");
    }
  };

  const guardarTransferencia = async (e: FormEvent) => {
    e.preventDefault();
    await guardar("transferencia", "datos_transferencia", {
      banco: t.banco.trim(),
      tipo_cuenta: t.tipo_cuenta,
      numero_cuenta: t.numero_cuenta.trim(),
      rut: t.rut.trim(),
      titular: t.titular.trim(),
      correo: t.correo.trim(),
    });
  };

  const guardarHorario = async (e: FormEvent) => {
    e.preventDefault();
    const desde = aMinutos(apertura);
    const hasta = aMinutos(cierre);
    if (hasta <= desde) {
      avisar("La hora de cierre debe ser después de la apertura.", "error");
      return;
    }
    await guardar("horario", "ajustes", {
      hora_apertura: desde,
      hora_cierre: hasta,
      paso_min: a.paso_min,
      dias_agenda: a.dias_agenda,
      hold_min: a.hold_min,
      tolerancia_min: a.tolerancia_min,
    });
  };

  const num = (v: string, min: number, max: number, previo: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : previo;
  };

  return (
    <>
      <h1 className="titulo">Ajustes</h1>
      <p className="suave">Lo que cambies aquí se refleja en la página de reservas.</p>

      {barberia && (
        <div className="tarjeta">
          <h2>Tu página de reservas</h2>
          <p className="suave">Comparte este enlace con tus clientes (Instagram, WhatsApp, Google).</p>
          <input className="enlace-pagina" readOnly value={`${window.location.origin}/b/${barberia.slug}`} onFocus={(e) => e.currentTarget.select()} />
          <button
            className="btn btn-borde btn-chico"
            onClick={() =>
              navigator.clipboard
                ?.writeText(`${window.location.origin}/b/${barberia.slug}`)
                .then(() => avisar("Enlace copiado"))
                .catch(() => avisar("No se pudo copiar. Mantén presionado el enlace para copiarlo.", "error"))
            }
          >
            Copiar enlace
          </button>
        </div>
      )}

      <AvisosPush />
      <CambiarClave />

      <ServiciosEditor />

      <form className="tarjeta" onSubmit={guardarBarberia}>
        <h2>Barbería</h2>
        <Campo etiqueta="Nombre">
          <input value={a.nombre} onChange={(e) => setA({ ...a, nombre: e.target.value })} maxLength={60} />
        </Campo>
        <Campo etiqueta="Dirección">
          <input value={a.direccion} onChange={(e) => setA({ ...a, direccion: e.target.value })} maxLength={120} />
        </Campo>
        <Campo etiqueta="WhatsApp del dueño" ayuda="Aquí te escriben los clientes cuando envían su comprobante.">
          <input
            inputMode="tel"
            placeholder="+56 9 1234 5678"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </Campo>
        <button className="btn btn-primario" disabled={guardando === "barberia"}>
          {guardando === "barberia" ? "Guardando…" : "Guardar"}
        </button>
      </form>

      <form className="tarjeta" onSubmit={guardarTransferencia}>
        <h2>Datos de transferencia</h2>
        <p className="suave chico">Solo aparecen en el paso de pago, cuando el cliente ya eligió su hora.</p>
        <Campo etiqueta="Banco">
          <input value={t.banco} onChange={(e) => setT({ ...t, banco: e.target.value })} maxLength={60} />
        </Campo>
        <Campo etiqueta="Tipo de cuenta">
          <select value={t.tipo_cuenta} onChange={(e) => setT({ ...t, tipo_cuenta: e.target.value })}>
            <option value="">Selecciona…</option>
            {TIPOS_CUENTA.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Número de cuenta">
          <input
            inputMode="numeric"
            value={t.numero_cuenta}
            onChange={(e) => setT({ ...t, numero_cuenta: e.target.value })}
            maxLength={30}
          />
        </Campo>
        <Campo etiqueta="RUT del titular">
          <input value={t.rut} onChange={(e) => setT({ ...t, rut: e.target.value })} maxLength={14} placeholder="12.345.678-9" />
        </Campo>
        <Campo etiqueta="Nombre del titular">
          <input value={t.titular} onChange={(e) => setT({ ...t, titular: e.target.value })} maxLength={80} />
        </Campo>
        <Campo etiqueta="Correo para comprobantes (opcional)">
          <input type="email" inputMode="email" value={t.correo} onChange={(e) => setT({ ...t, correo: e.target.value })} maxLength={80} />
        </Campo>
        <button className="btn btn-primario" disabled={guardando === "transferencia"}>
          {guardando === "transferencia" ? "Guardando…" : "Guardar"}
        </button>
      </form>

      <form className="tarjeta" onSubmit={guardarHorario}>
        <h2>Horario y reservas</h2>
        <div className="dos">
          <Campo etiqueta="Abre">
            <input type="time" value={apertura} onChange={(e) => setApertura(e.target.value)} required />
          </Campo>
          <Campo etiqueta="Cierra">
            <input type="time" value={cierre} onChange={(e) => setCierre(e.target.value)} required />
          </Campo>
        </div>
        <Campo etiqueta="Intervalo entre horas">
          <select value={a.paso_min} onChange={(e) => setA({ ...a, paso_min: Number(e.target.value) })}>
            <option value={15}>Cada 15 minutos</option>
            <option value={30}>Cada 30 minutos</option>
            <option value={60}>Cada 60 minutos</option>
          </select>
        </Campo>
        <Campo etiqueta="Días de anticipación" ayuda="Hasta cuántos días adelante se puede reservar.">
          <input type="number" min={1} max={90} value={a.dias_agenda} onChange={(e) => setA({ ...a, dias_agenda: num(e.target.value, 1, 90, a.dias_agenda) })} />
        </Campo>
        <Campo etiqueta="Minutos para enviar el comprobante" ayuda="Mientras tanto la hora queda guardada.">
          <input type="number" min={5} max={120} value={a.hold_min} onChange={(e) => setA({ ...a, hold_min: num(e.target.value, 5, 120, a.hold_min) })} />
        </Campo>
        <Campo etiqueta="Minutos de tolerancia por atraso" ayuda="Pasado este tiempo, la hora se libera.">
          <input type="number" min={0} max={60} value={a.tolerancia_min} onChange={(e) => setA({ ...a, tolerancia_min: num(e.target.value, 0, 60, a.tolerancia_min) })} />
        </Campo>
        <button className="btn btn-primario" disabled={guardando === "horario"}>
          {guardando === "horario" ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </>
  );
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </label>
  );
}
