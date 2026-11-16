import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import AvisosPush from "../../components/AvisosPush";
import Cuadro from "../../components/Cuadro";
import Selector from "../../components/Selector";
import Ficha from "../../components/Ficha";
import CambiarClave from "../../components/CambiarClave";
import ServiciosEditor from "../../components/ServiciosEditor";
import MiPagina from "../../components/MiPagina";
import UbicacionBarberia from "../../components/UbicacionBarberia";
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
  const [abierta, setAbierta] = useState("");

  // Borradores: lo que se escribe mientras se edita. Los datos guardados se ven en solo lectura.
  const [bar, setBar] = useState({ nombre: "", direccion: "", whatsapp: "" });
  const [tr, setTr] = useState<DatosTransferencia | null>(null);
  const [hor, setHor] = useState({ apertura: "10:00", cierre: "20:00", paso: 30, dias: 15, hold: 20, tol: 15 });

  const borradorBarberia = (aj: TAjustes) => setBar({ nombre: aj.nombre, direccion: aj.direccion, whatsapp: aj.whatsapp ? formatearTelefono(aj.whatsapp) : "" });
  const borradorHorario = (aj: TAjustes) =>
    setHor({ apertura: hm(aj.hora_apertura), cierre: hm(aj.hora_cierre), paso: aj.paso_min, dias: aj.dias_agenda, hold: aj.hold_min, tol: aj.tolerancia_min });

  useEffect(() => {
    void (async () => {
      const [ra, rt] = await Promise.all([
        supabase.from("ajustes").select("*").maybeSingle(),
        supabase.from("datos_transferencia").select("*").maybeSingle(),
      ]);
      const aj = ra.data as TAjustes | null;
      const trf = rt.data as DatosTransferencia | null;
      if (aj) {
        setA(aj);
        borradorBarberia(aj);
        borradorHorario(aj);
      }
      if (trf) {
        setT(trf);
        setTr(trf);
      }
      setCargado(true);
    })();
  }, []);

  if (!cargado) return <p className="suave">Cargando…</p>;
  if (!a || !t || !tr) {
    return (
      <p className="aviso error" role="alert">
        No encontramos los ajustes. Ejecuta paso01.sql en Supabase y recarga.
      </p>
    );
  }

  const alternar = (k: string) => setAbierta(abierta === k ? "" : k);

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

  const guardarBarberia = async () => {
    const tel = bar.whatsapp.trim() ? normalizarTelefono(bar.whatsapp) : "";
    if (bar.whatsapp.trim() && !tel) {
      avisar("El WhatsApp debe ser un celular chileno de 9 dígitos. Ej: +56 9 1234 5678", "error");
      return false;
    }
    if (!bar.nombre.trim()) {
      avisar("Escribe el nombre de la barbería.", "error");
      return false;
    }
    const nuevo = { nombre: bar.nombre.trim(), direccion: bar.direccion.trim(), whatsapp: tel };
    if (!(await guardar("barberia", "ajustes", nuevo))) return false;
    const aj = { ...a, ...nuevo };
    setA(aj);
    borradorBarberia(aj);
    return true;
  };

  const guardarTransferencia = async () => {
    const nuevo = {
      banco: tr.banco.trim(),
      tipo_cuenta: tr.tipo_cuenta,
      numero_cuenta: tr.numero_cuenta.trim(),
      rut: tr.rut.trim(),
      titular: tr.titular.trim(),
      correo: tr.correo.trim(),
    };
    if (!(await guardar("transferencia", "datos_transferencia", nuevo))) return false;
    const nt = { ...t, ...nuevo };
    setT(nt);
    setTr(nt);
    return true;
  };

  const guardarHorario = async () => {
    const desde = aMinutos(hor.apertura);
    const hasta = aMinutos(hor.cierre);
    if (hasta <= desde) {
      avisar("La hora de cierre debe ser después de la apertura.", "error");
      return false;
    }
    const nuevo = { hora_apertura: desde, hora_cierre: hasta, paso_min: hor.paso, dias_agenda: hor.dias, hold_min: hor.hold, tolerancia_min: hor.tol };
    if (!(await guardar("horario", "ajustes", nuevo))) return false;
    setA({ ...a, ...nuevo });
    return true;
  };

  const num = (v: string, min: number, max: number, previo: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : previo;
  };

  const enlace = barberia ? `${window.location.origin}/b/${barberia.slug}` : "";
  const cuenta = t.banco ? `${t.banco}${t.numero_cuenta ? ` · ${t.numero_cuenta}` : ""}` : "Sin completar";

  return (
    <>
      <h1 className="titulo">Ajustes</h1>
      <p className="suave">Toca un cuadro para abrirlo. Lo que cambies se refleja en la página de reservas.</p>

      <div className="cuadros">

      {barberia && (
        <Cuadro titulo="Tu página de reservas" resumen={enlace.replace(/^https?:\/\//, "")} icono="link" abierta={abierta === "pagina"} onToggle={() => alternar("pagina")}>
          <p className="suave chico" style={{ margin: 0 }}>
            Comparte este enlace con tus clientes (Instagram, WhatsApp, Google).
          </p>
          <input className="enlace-pagina" readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} />
          <button
            className="btn btn-borde btn-chico"
            onClick={() =>
              navigator.clipboard
                ?.writeText(enlace)
                .then(() => avisar("Enlace copiado"))
                .catch(() => avisar("No se pudo copiar. Mantén presionado el enlace para copiarlo.", "error"))
            }
          >
            Copiar enlace
          </button>
        </Cuadro>
      )}

      <Cuadro
        titulo="Mi página"
        resumen={barberia?.plan === "basico" ? "Disponible en el plan Pro" : barberia?.plan === "vip" ? "Página a medida" : "Logo, portada, color y descripción"}
        icono="pagina"
        abierta={abierta === "mipagina"}
        onToggle={() => alternar("mipagina")}
      >
        <MiPagina />
      </Cuadro>

      <Cuadro titulo="Servicios y precios" resumen="Cortes, barba, ofertas por día" icono="scissors" abierta={abierta === "servicios"} onToggle={() => alternar("servicios")}>
        <ServiciosEditor />
      </Cuadro>

      <Cuadro titulo="Barbería" resumen={a.nombre} icono="home" abierta={abierta === "barberia"} onToggle={() => alternar("barberia")}>
        <Ficha
          filas={[
            { etiqueta: "Nombre", valor: a.nombre },
            { etiqueta: "Dirección", valor: a.direccion },
            { etiqueta: "WhatsApp del dueño", valor: a.whatsapp ? formatearTelefono(a.whatsapp) : "" },
          ]}
          onGuardar={guardarBarberia}
          onCancelar={() => borradorBarberia(a)}
          guardando={guardando === "barberia"}
        >
          <Campo etiqueta="Nombre">
            <input value={bar.nombre} onChange={(e) => setBar({ ...bar, nombre: e.target.value })} maxLength={60} />
          </Campo>
          <Campo etiqueta="Dirección">
            <input value={bar.direccion} onChange={(e) => setBar({ ...bar, direccion: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="WhatsApp del dueño" ayuda="Aquí te escriben los clientes cuando envían su comprobante.">
            <input inputMode="tel" placeholder="+56 9 1234 5678" value={bar.whatsapp} onChange={(e) => setBar({ ...bar, whatsapp: e.target.value })} />
          </Campo>
        </Ficha>
        <UbicacionBarberia />
      </Cuadro>

      <Cuadro titulo="Datos de transferencia" resumen={cuenta} icono="cash" abierta={abierta === "transferencia"} onToggle={() => alternar("transferencia")}>
        <Ficha
          filas={[
            { etiqueta: "Banco", valor: t.banco },
            { etiqueta: "Tipo de cuenta", valor: t.tipo_cuenta },
            { etiqueta: "Número de cuenta", valor: t.numero_cuenta },
            { etiqueta: "RUT del titular", valor: t.rut },
            { etiqueta: "Titular", valor: t.titular },
            { etiqueta: "Correo", valor: t.correo },
          ]}
          nota={<p className="suave chico" style={{ margin: 0 }}>Solo aparecen en el paso de pago, cuando el cliente ya eligió su hora.</p>}
          onGuardar={guardarTransferencia}
          onCancelar={() => setTr(t)}
          guardando={guardando === "transferencia"}
        >
          <Campo etiqueta="Banco">
            <input value={tr.banco} onChange={(e) => setTr({ ...tr, banco: e.target.value })} maxLength={60} />
          </Campo>
          <div className="campo">
            <span>Tipo de cuenta</span>
            <Selector etiqueta="Tipo de cuenta" valor={tr.tipo_cuenta} onCambio={(v) => setTr({ ...tr, tipo_cuenta: v })} opciones={TIPOS_CUENTA.map((x) => ({ valor: x, etiqueta: x }))} />
          </div>
          <Campo etiqueta="Número de cuenta">
            <input inputMode="numeric" value={tr.numero_cuenta} onChange={(e) => setTr({ ...tr, numero_cuenta: e.target.value })} maxLength={30} />
          </Campo>
          <Campo etiqueta="RUT del titular">
            <input value={tr.rut} onChange={(e) => setTr({ ...tr, rut: e.target.value })} maxLength={14} placeholder="12.345.678-9" />
          </Campo>
          <Campo etiqueta="Nombre del titular">
            <input value={tr.titular} onChange={(e) => setTr({ ...tr, titular: e.target.value })} maxLength={80} />
          </Campo>
          <Campo etiqueta="Correo para comprobantes (opcional)">
            <input type="email" inputMode="email" value={tr.correo} onChange={(e) => setTr({ ...tr, correo: e.target.value })} maxLength={80} />
          </Campo>
        </Ficha>
      </Cuadro>

      <Cuadro
        titulo="Horario y reservas"
        resumen={`${hm(a.hora_apertura)} a ${hm(a.hora_cierre)} · cada ${a.paso_min} min`}
        icono="clock"
        abierta={abierta === "horario"}
        onToggle={() => alternar("horario")}
      >
        <Ficha
          filas={[
            { etiqueta: "Abre", valor: hm(a.hora_apertura) },
            { etiqueta: "Cierra", valor: hm(a.hora_cierre) },
            { etiqueta: "Intervalo entre horas", valor: `${a.paso_min} minutos` },
            { etiqueta: "Se puede reservar hasta", valor: `${a.dias_agenda} días antes` },
            { etiqueta: "Tiempo para enviar el comprobante", valor: `${a.hold_min} minutos` },
            { etiqueta: "Tolerancia por atraso", valor: `${a.tolerancia_min} minutos` },
          ]}
          onGuardar={guardarHorario}
          onCancelar={() => borradorHorario(a)}
          guardando={guardando === "horario"}
        >
          <div className="dos">
            <Campo etiqueta="Abre">
              <input type="time" value={hor.apertura} onChange={(e) => setHor({ ...hor, apertura: e.target.value })} required />
            </Campo>
            <Campo etiqueta="Cierra">
              <input type="time" value={hor.cierre} onChange={(e) => setHor({ ...hor, cierre: e.target.value })} required />
            </Campo>
          </div>
          <div className="campo">
            <span>Intervalo entre horas</span>
            <Selector
              etiqueta="Intervalo entre horas"
              valor={String(hor.paso)}
              onCambio={(v) => setHor({ ...hor, paso: Number(v) })}
              opciones={[15, 30, 60].map((n) => ({ valor: String(n), etiqueta: `Cada ${n} minutos` }))}
            />
          </div>
          <Campo etiqueta="Días de anticipación" ayuda="Hasta cuántos días adelante se puede reservar.">
            <input type="number" min={1} max={90} value={hor.dias} onChange={(e) => setHor({ ...hor, dias: num(e.target.value, 1, 90, hor.dias) })} />
          </Campo>
          <Campo etiqueta="Minutos para enviar el comprobante" ayuda="Mientras tanto la hora queda guardada.">
            <input type="number" min={5} max={120} value={hor.hold} onChange={(e) => setHor({ ...hor, hold: num(e.target.value, 5, 120, hor.hold) })} />
          </Campo>
          <Campo etiqueta="Minutos de tolerancia por atraso" ayuda="Pasado este tiempo, la hora se libera.">
            <input type="number" min={0} max={60} value={hor.tol} onChange={(e) => setHor({ ...hor, tol: num(e.target.value, 0, 60, hor.tol) })} />
          </Campo>
        </Ficha>
      </Cuadro>

      <Cuadro titulo="Avisos en este celular" resumen={barberia?.plan === "basico" ? "Disponible en el plan Pro" : "Entérate cuando llega un comprobante"} icono="phone" abierta={abierta === "avisos"} onToggle={() => alternar("avisos")}>
        {barberia?.plan === "basico" ? (
          <>
            <p className="suave" style={{ margin: 0 }}>
              Los avisos al celular, para enterarte apenas llega un comprobante, vienen con el plan Pro o VIP.
            </p>
            <Link to="/panel/plan" className="btn btn-primario btn-chico">
              Ver planes
            </Link>
          </>
        ) : (
          <AvisosPush />
        )}
      </Cuadro>

      </div>

      <div style={{ marginTop: 18 }}>
        <CambiarClave />
      </div>
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
