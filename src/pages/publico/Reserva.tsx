import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import PubNav from "../../components/PubNav";
import { useRutas } from "../../lib/publico";
import {
  datosPago,
  enviarComprobante,
  estadoReserva,
  MAX_COMPROBANTE,
  segundosHasta,
  textoError,
  TIPOS_COMPROBANTE,
} from "../../lib/reserva";
import type { DatosPago, EstadoReserva } from "../../lib/reserva";
import { clp } from "../../lib/dinero";
import { fechaLarga, hm, pad2 } from "../../lib/fecha";
import { enlaceWhatsapp, mensajeAvisoAlDueno } from "../../lib/whatsapp";
import Icon from "../../components/Icon";

/** Página de la reserva: paga, espera la revisión o ve su confirmación. Se entra con el enlace con código y clave. */
export default function Reserva() {
  const { codigo = "" } = useParams();
  const rutas = useRutas();
  const [q] = useSearchParams();
  const token = q.get("t") ?? "";
  const [e, setE] = useState<EstadoReserva | null | undefined>(undefined);
  const [falla, setFalla] = useState("");

  const cargar = useCallback(async () => {
    try {
      setE(await estadoReserva(codigo, token));
      setFalla("");
    } catch (err) {
      setFalla(textoError(err));
    }
  }, [codigo, token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Mientras espera la revisión, la página se actualiza sola.
  const estado = e?.estado;
  useEffect(() => {
    if (estado !== "por_revisar") return;
    const id = window.setInterval(() => void cargar(), 15_000);
    return () => window.clearInterval(id);
  }, [estado, cargar]);

  return (
    <div className="pb">
      <PubNav />
      <main className="pb-w pb-flujo">
        {falla && e === undefined ? (
          <div className="pb-caja">
            <h1 className="pb-t1">No pudimos cargar tu reserva</h1>
            <p className="pb-p">{falla}</p>
            <button className="pb-btn pb-btn-azul" onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        ) : e === undefined ? (
          <p className="pb-p">Cargando…</p>
        ) : e === null ? (
          <div className="pb-caja">
            <h1 className="pb-t1">No encontramos esta reserva</h1>
            <p className="pb-p">Revisa que el enlace esté completo. Si el problema sigue, escríbenos.</p>
            <Link to={rutas.inicio} className="pb-btn pb-btn-azul">
              Ir al inicio
            </Link>
          </div>
        ) : e.estado === "pendiente_pago" ? (
          <Pago e={e} token={token} onCambio={cargar} />
        ) : (
          <Resultado e={e} />
        )}
      </main>
    </div>
  );
}

function Resumen({ e }: { e: EstadoReserva }) {
  return (
    <div className="pb-resumen">
      <div>
        <small>Código</small>
        <b className="pb-cod">{e.codigo}</b>
      </div>
      <div>
        <small>Servicio</small>
        <b>{e.servicio}</b>
      </div>
      <div>
        <small>Día y hora</small>
        <b className="cap">
          {fechaLarga(e.fecha)}, {hm(e.inicio_min)}
        </b>
      </div>
      {e.barbero && (
        <div>
          <small>Barbero</small>
          <b>{e.barbero}</b>
        </div>
      )}
      <div>
        <small>Total</small>
        <b className="pb-total">{clp(e.precio)}</b>
      </div>
    </div>
  );
}

function copiar(texto: string): Promise<boolean> {
  try {
    return navigator.clipboard.writeText(texto).then(
      () => true,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

function Pago({ e, token, onCambio }: { e: EstadoReserva; token: string; onCambio: () => Promise<void> }) {
  const [d, setD] = useState<DatosPago | null>(null);
  const [error, setError] = useState("");
  const [seg, setSeg] = useState(e.hold_hasta ? segundosHasta(e.hold_hasta) : 0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    datosPago(e.codigo, token)
      .then(setD)
      .catch((err) => {
        setError(textoError(err));
        void onCambio();
      });
  }, [e.codigo, token, onCambio]);

  const limite = d?.hold_hasta ?? e.hold_hasta;
  useEffect(() => {
    if (!limite) return;
    const id = window.setInterval(() => {
      const s = segundosHasta(limite);
      setSeg(s);
      if (s === 0) {
        window.clearInterval(id);
        void onCambio();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [limite, onCambio]);

  useEffect(() => {
    if (!archivo || !archivo.type.startsWith("image/")) {
      setVista("");
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVista(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const elegir = (f: File | undefined) => {
    setError("");
    if (!f) return;
    if (!TIPOS_COMPROBANTE.includes(f.type)) return setError("Sube una foto (JPG, PNG, WEBP) o un PDF.");
    if (f.size > MAX_COMPROBANTE) return setError("El archivo pesa más de 5 MB.");
    setArchivo(f);
  };

  const enviar = async () => {
    if (!archivo) return;
    setError("");
    setEnviando(true);
    try {
      await enviarComprobante(e.codigo, token, archivo);
      await onCambio();
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(textoError(err));
    } finally {
      setEnviando(false);
    }
  };

  const filas: [string, string][] = d
    ? ([
        ["Banco", d.banco],
        ["Tipo de cuenta", d.tipo_cuenta],
        ["Número de cuenta", d.numero_cuenta],
        ["RUT", d.rut],
        ["Titular", d.titular],
        ["Correo", d.correo],
      ] as [string, string][]).filter(([, v]) => v.trim() !== "")
    : [];
  const sinDatos = d !== null && !d.numero_cuenta.trim();

  return (
    <>
      <div className="pb-pago-cab">
        <small>Total a transferir</small>
        <b>{clp(d?.monto ?? e.precio)}</b>
        <span className={`pb-reloj ${seg < 120 ? "urgente" : ""}`}>
          Tu hora está guardada por{" "}
          <strong>
            {pad2(Math.floor(seg / 60))}:{pad2(seg % 60)}
          </strong>
        </span>
      </div>

      <Resumen e={e} />

      <h2 className="pb-t2">1. Transfiere</h2>
      {sinDatos ? (
        <div className="pb-vacio">
          Aún no tenemos los datos de transferencia cargados. Escríbenos por WhatsApp y te los enviamos.
          <a className="pb-btn pb-btn-borde" href={enlaceWhatsapp(e.whatsapp, `Hola, reservé una hora (código ${e.codigo}). ¿Me envías los datos para transferir?`)} target="_blank" rel="noreferrer">
            Pedir los datos
          </a>
        </div>
      ) : (
        <>
          <ul className="pb-datos">
            {filas.map(([k, v]) => (
              <li key={k}>
                <span>
                  <small>{k}</small>
                  <b>{v}</b>
                </span>
              </li>
            ))}
          </ul>
          <button
            className={`pb-btn pb-copiar-todo ${copiado ? "ok" : ""}`}
            onClick={async () => {
              const texto = [...filas.map(([k, v]) => `${k}: ${v}`), `Monto: ${clp(d?.monto ?? e.precio)}`].join("\n");
              if (await copiar(texto)) {
                setCopiado("todo");
                window.setTimeout(() => setCopiado(""), 2200);
              }
            }}
          >
            <Icon nombre={copiado ? "check" : "receipt"} size={20} />
            {copiado ? "Datos copiados" : "Copiar todos los datos"}
          </button>
        </>
      )}

      <h2 className="pb-t2">2. Sube tu comprobante</h2>
      <input
        ref={entrada}
        type="file"
        accept={TIPOS_COMPROBANTE.join(",")}
        hidden
        onChange={(ev) => elegir(ev.target.files?.[0])}
      />
      <button className={`pb-subir ${archivo ? "ok" : ""}`} onClick={() => entrada.current?.click()}>
        {vista ? <img src={vista} alt="Vista del comprobante" /> : <Icon nombre="receipt" size={28} />}
        <span>
          {archivo ? archivo.name : "Toca para elegir la foto o el PDF"}
          <small>{archivo ? "Toca para cambiarlo" : "JPG, PNG o PDF, hasta 5 MB"}</small>
        </span>
      </button>

      {error && (
        <p className="pb-error" role="alert">
          {error}
        </p>
      )}

      <button className="pb-btn pb-btn-azul pb-ancho" disabled={!archivo || enviando || seg === 0} onClick={enviar}>
        {enviando ? "Enviando…" : "Enviar comprobante"}
      </button>
      <p className="pb-p pb-peq">
        Lo revisamos y te confirmamos tu hora por WhatsApp. Si no lo envías a tiempo, la hora se libera.
      </p>
    </>
  );
}

function Resultado({ e }: { e: EstadoReserva }) {
  const rutas = useRutas();
  const [copiado, setCopiado] = useState(false);
  const enlace = typeof window !== "undefined" ? window.location.href : "";
  const mensaje = mensajeAvisoAlDueno({
    cliente: e.cliente,
    servicio: e.servicio,
    fecha: e.fecha,
    inicioMin: e.inicio_min,
    codigo: e.codigo,
  });

  const nuevo = (
    <Link to={rutas.reservar} className="pb-btn pb-btn-azul">
      Reservar otra hora
    </Link>
  );

  if (e.estado === "por_revisar") {
    return (
      <>
        <div className="pb-hecho">
          <span className="pb-sello">
            <Icon nombre="clock" size={26} />
          </span>
          <h1 className="pb-t1">Recibimos tu comprobante</h1>
          <p className="pb-p">Lo estamos revisando. Apenas lo aprobemos te confirmamos tu hora por WhatsApp.</p>
        </div>
        <Resumen e={e} />
        <a className="pb-btn pb-btn-wsp pb-ancho" href={enlaceWhatsapp(e.whatsapp, mensaje)} target="_blank" rel="noreferrer">
          <Icon nombre="whatsapp" size={22} />
          Avisar por WhatsApp
        </a>
        <p className="pb-p pb-peq">Con este botón le avisas a la barbería que ya pagaste, para que revise más rápido.</p>
        <button
          className="pb-btn pb-btn-borde pb-ancho"
          onClick={async () => {
            if (await copiar(enlace)) {
              setCopiado(true);
              window.setTimeout(() => setCopiado(false), 1800);
            }
          }}
        >
          {copiado ? "Enlace copiado" : "Copiar enlace de mi reserva"}
        </button>
        <p className="pb-p pb-peq">Esta página se actualiza sola. Guarda el enlace para ver tu reserva cuando quieras.</p>
      </>
    );
  }

  if (e.estado === "confirmada" || e.estado === "atendida") {
    return (
      <>
        <div className="pb-hecho">
          <span className="pb-sello ok">
            <Icon nombre="check" size={26} />
          </span>
          <h1 className="pb-t1">{e.estado === "atendida" ? "Gracias por venir" : "Tu hora está confirmada"}</h1>
          <p className="pb-p">
            {e.estado === "atendida" ? "Esperamos verte pronto." : `Te esperamos en ${e.direccion}.`}
          </p>
        </div>
        <Resumen e={e} />
        {e.estado === "confirmada" && (
          <p className="pb-p pb-peq">
            Si llegas con más de {e.tolerancia_min} minutos de atraso, la hora se libera. Si no puedes venir, avísanos por WhatsApp.
          </p>
        )}
        {nuevo}
      </>
    );
  }

  if (e.estado === "rechazada") {
    return (
      <>
        <div className="pb-hecho">
          <span className="pb-sello mal">
            <Icon nombre="close" size={26} />
          </span>
          <h1 className="pb-t1">No pudimos confirmar tu hora</h1>
          <p className="pb-p">{e.motivo_rechazo ? `Motivo: ${e.motivo_rechazo}.` : "Revisamos tu comprobante y no pudimos validarlo."}</p>
        </div>
        <Resumen e={e} />
        <a
          className="pb-btn pb-btn-wsp pb-ancho"
          href={enlaceWhatsapp(e.whatsapp, `Hola, mi reserva ${e.codigo} fue rechazada. ¿Me ayudan?`)}
          target="_blank"
          rel="noreferrer"
        >
          <Icon nombre="whatsapp" size={22} />
          Hablar por WhatsApp
        </a>
        {nuevo}
      </>
    );
  }

  const texto =
    e.estado === "expirada"
      ? "Pasó el tiempo para enviar el comprobante y la hora se liberó."
      : e.estado === "no_llego"
        ? "Esta reserva quedó marcada como no asistida."
        : "Esta reserva fue cancelada.";
  return (
    <>
      <div className="pb-hecho">
        <span className="pb-sello mal">
          <Icon nombre="close" size={26} />
        </span>
        <h1 className="pb-t1">{e.estado === "expirada" ? "Tu reserva venció" : "Reserva cerrada"}</h1>
        <p className="pb-p">{texto}</p>
      </div>
      {nuevo}
    </>
  );
}
