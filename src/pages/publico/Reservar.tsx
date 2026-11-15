import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import PubNav from "../../components/PubNav";
import { cargarBarberos, cargarHoras, crearReserva, diasTexto, textoError } from "../../lib/reserva";
import { useBarberiaPublica, useRutas, useSlug } from "../../lib/publico";
import NoEncontrada from "./NoEncontrada";
import { precioPara, esDiaPromo } from "../../lib/precios";
import { clp } from "../../lib/dinero";
import { fechaCorta, fechaLarga, hm, hoyChile, sumarDias } from "../../lib/fecha";
import { enlaceWhatsapp, formatearTelefono, normalizarTelefono } from "../../lib/whatsapp";
import type { Barbero, Servicio } from "../../lib/types";

type Paso = "servicio" | "barbero" | "hora" | "datos";
const TITULO: Record<Paso, string> = {
  servicio: "¿Qué te vas a hacer?",
  barbero: "¿Con quién?",
  hora: "Elige día y hora",
  datos: "Tus datos",
};

export default function Reservar() {
  const slug = useSlug();
  const rutas = useRutas();
  const { datos, estado: estadoDatos, aj } = useBarberiaPublica();
  const navegar = useNavigate();
  const hoy = hoyChile();

  const servicios: Servicio[] | null = datos ? datos.servicios : null;
  const [barberos, setBarberos] = useState<Barbero[] | null>(null);
  const [falla, setFalla] = useState("");

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [barbero, setBarbero] = useState<string | null>(null); // null = cualquiera
  const [fecha, setFecha] = useState(hoy);
  const [horas, setHoras] = useState<number[] | null>(null);
  const [hora, setHora] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [paso, setPaso] = useState<Paso>("servicio");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!datos?.activa) return;
    cargarBarberos(slug)
      .then((b) => {
        setBarberos(b);
        if (b.length === 1) setBarbero(b[0].id);
      })
      .catch((e) => setFalla(textoError(e)));
  }, [datos?.activa, slug]);

  useEffect(() => {
    if (estadoDatos === "error") setFalla("No pudimos conectar. Revisa tu internet e inténtalo de nuevo.");
  }, [estadoDatos]);

  const pasos: Paso[] = useMemo(
    () => (barberos && barberos.length > 1 ? ["servicio", "barbero", "hora", "datos"] : ["servicio", "hora", "datos"]),
    [barberos],
  );
  const idx = pasos.indexOf(paso);

  const dias = useMemo(() => Array.from({ length: aj.dias_agenda + 1 }, (_, i) => sumarDias(hoy, i)), [aj.dias_agenda, hoy]);

  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (paso !== "hora" || !servicio) return;
    let vivo = true;
    setHoras(null);
    setHora(null);
    cargarHoras(slug, fecha, servicio.id, barbero)
      .then((h) => vivo && setHoras(h))
      .catch((e) => {
        if (!vivo) return;
        setHoras([]);
        setError(textoError(e));
      });
    return () => {
      vivo = false;
    };
  }, [paso, fecha, servicio, barbero, recarga]);

  const ir = (p: Paso) => {
    setError("");
    setPaso(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const siguiente = () => ir(pasos[idx + 1]);
  const atras = () => ir(pasos[idx - 1]);

  const precio = servicio ? precioPara(servicio, fecha) : 0;
  const nombreBarbero = barbero ? barberos?.find((b) => b.id === barbero)?.nombre : null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!servicio || hora === null) return;
    setError("");
    if (nombre.trim().length < 2) return setError("Escribe tu nombre.");
    if (!normalizarTelefono(telefono)) return setError("Escribe un WhatsApp válido, por ejemplo +56 9 1234 5678.");
    setEnviando(true);
    try {
      const r = await crearReserva({ slug, servicio: servicio.id, barbero, fecha, inicio: hora, nombre: nombre.trim(), telefono });
      navegar(rutas.reserva(r.codigo, r.token), { replace: true });
    } catch (err) {
      const m = textoError(err);
      setError(m);
      if (/ya no está disponible/i.test(m)) {
        setRecarga((n) => n + 1);
        setPaso("hora");
      }
    } finally {
      setEnviando(false);
    }
  };

  const cerrada = datos !== null && !datos.activa;
  const cargando = !falla && !cerrada && (servicios === null || barberos === null);
  if (estadoDatos === "no_existe") return <NoEncontrada />;
  const sinBarberos = barberos !== null && barberos.length === 0;

  return (
    <div className="pb">
      <PubNav />
      <main className="pb-w pb-flujo">
        {falla ? (
          <div className="pb-caja">
            <h1 className="pb-t1">No pudimos cargar la reserva</h1>
            <p className="pb-p">{falla}</p>
            <a className="pb-btn pb-btn-azul" href={enlaceWhatsapp(aj.whatsapp, "Hola, quiero reservar una hora")} target="_blank" rel="noreferrer">
              Reservar por WhatsApp
            </a>
          </div>
        ) : cerrada ? (
          <div className="pb-caja">
            <h1 className="pb-t1">Reservas online no disponibles</h1>
            <p className="pb-p">Esta barbería no está recibiendo reservas por ahora. Escríbenos por WhatsApp.</p>
            <a className="pb-btn pb-btn-azul" href={enlaceWhatsapp(aj.whatsapp, "Hola, quiero reservar una hora")} target="_blank" rel="noreferrer">
              Reservar por WhatsApp
            </a>
          </div>
        ) : cargando ? (
          <p className="pb-p">Cargando…</p>
        ) : sinBarberos ? (
          <div className="pb-caja">
            <h1 className="pb-t1">Reservas online no disponibles</h1>
            <p className="pb-p">Por ahora no hay barberos con agenda abierta. Escríbenos y te ayudamos.</p>
            <a className="pb-btn pb-btn-azul" href={enlaceWhatsapp(aj.whatsapp, "Hola, quiero reservar una hora")} target="_blank" rel="noreferrer">
              Escribir por WhatsApp
            </a>
          </div>
        ) : (
          <>
            <div className="pb-prog" aria-label={`Paso ${idx + 1} de ${pasos.length}`}>
              <span className="pb-prog-t">
                Paso {idx + 1} de {pasos.length}
              </span>
              <div className="pb-prog-b">
                <i style={{ width: `${((idx + 1) / pasos.length) * 100}%` }} />
              </div>
            </div>
            <h1 className="pb-t1">{TITULO[paso]}</h1>

            {paso === "servicio" && (
              <ul className="pb-opciones">
                {(servicios ?? []).map((s) => {
                  const promo = s.precio_promo !== null;
                  return (
                    <li key={s.id}>
                      <button
                        className={`pb-op ${servicio?.id === s.id ? "on" : ""}`}
                        onClick={() => {
                          setServicio(s);
                          setHora(null);
                        }}
                      >
                        <span className="pb-op-n">
                          {s.nombre}
                          <small>
                            {s.duracion_min} min
                            {promo ? ` · oferta ${diasTexto(s.dias_promo, true)}` : ""}
                          </small>
                        </span>
                        <span className="pb-op-p">
                          {promo && <s>{clp(s.precio)}</s>}
                          <b>{clp(s.precio_promo ?? s.precio)}</b>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {paso === "barbero" && (
              <ul className="pb-opciones">
                <li>
                  <button className={`pb-op ${barbero === null ? "on" : ""}`} onClick={() => setBarbero(null)}>
                    <span className="pb-op-n">
                      Cualquiera disponible
                      <small>Te asignamos al primero que tenga la hora</small>
                    </span>
                  </button>
                </li>
                {(barberos ?? []).map((b) => (
                  <li key={b.id}>
                    <button className={`pb-op ${barbero === b.id ? "on" : ""}`} onClick={() => setBarbero(b.id)}>
                      <span className="pb-op-ini">{b.iniciales || b.nombre.slice(0, 2).toUpperCase()}</span>
                      <span className="pb-op-n">{b.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {paso === "hora" && servicio && (
              <>
                <div className="pb-dias" role="listbox" aria-label="Día">
                  {dias.map((d) => (
                    <button key={d} role="option" aria-selected={d === fecha} className={d === fecha ? "on" : ""} onClick={() => setFecha(d)}>
                      <small>{fechaCorta(d).split(" ")[0]}</small>
                      <b>{fechaCorta(d).split(" ")[1]}</b>
                      {esDiaPromo(servicio, d) && <em>oferta</em>}
                    </button>
                  ))}
                </div>
                <p className="pb-p pb-cap">{fechaLarga(fecha)}</p>
                {horas === null ? (
                  <p className="pb-p">Buscando horas…</p>
                ) : horas.length === 0 ? (
                  <div className="pb-vacio">No quedan horas este día. Prueba con otro.</div>
                ) : (
                  <div className="pb-horas">
                    {horas.map((h) => (
                      <button key={h} className={h === hora ? "on" : ""} onClick={() => setHora(h)}>
                        {hm(h)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {paso === "datos" && servicio && hora !== null && (
              <form onSubmit={enviar} className="pb-form" noValidate>
                <div className="pb-resumen">
                  <div>
                    <small>Servicio</small>
                    <b>{servicio.nombre}</b>
                  </div>
                  <div>
                    <small>Día y hora</small>
                    <b className="cap">
                      {fechaLarga(fecha)}, {hm(hora)}
                    </b>
                  </div>
                  {nombreBarbero && (
                    <div>
                      <small>Barbero</small>
                      <b>{nombreBarbero}</b>
                    </div>
                  )}
                  <div>
                    <small>Total</small>
                    <b className="pb-total">{clp(precio)}</b>
                  </div>
                </div>
                <label className="pb-campo">
                  Tu nombre
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" maxLength={80} placeholder="Nombre y apellido" />
                </label>
                <label className="pb-campo">
                  Tu WhatsApp
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+56 9 1234 5678"
                    onBlur={() => normalizarTelefono(telefono) && setTelefono(formatearTelefono(telefono))}
                  />
                  <small>Te avisamos por aquí cuando confirmemos tu hora.</small>
                </label>
                {error && (
                  <p className="pb-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="pb-btn pb-btn-azul pb-ancho" disabled={enviando}>
                  {enviando ? "Guardando tu hora…" : "Continuar al pago"}
                </button>
                <p className="pb-p pb-peq">Guardamos tu hora unos minutos mientras pagas por transferencia.</p>
              </form>
            )}

            {paso !== "datos" && error && (
              <p className="pb-error" role="alert">
                {error}
              </p>
            )}

            {paso !== "datos" && (
              <div className="pb-pie-flujo">
                {idx > 0 ? (
                  <button className="pb-btn pb-btn-borde" onClick={atras}>
                    Atrás
                  </button>
                ) : (
                  <Link className="pb-btn pb-btn-borde" to={rutas.inicio}>
                    Cancelar
                  </Link>
                )}
                <button
                  className="pb-btn pb-btn-azul"
                  disabled={(paso === "servicio" && !servicio) || (paso === "hora" && hora === null)}
                  onClick={siguiente}
                >
                  Continuar
                </button>
              </div>
            )}
            {paso === "datos" && (
              <div className="pb-pie-flujo pb-solo">
                <button className="pb-btn pb-btn-borde" onClick={atras}>
                  Atrás
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
