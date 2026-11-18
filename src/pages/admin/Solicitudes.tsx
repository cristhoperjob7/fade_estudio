import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { enlaceWhatsapp, formatearTelefono } from "../../lib/whatsapp";
import { PLAN_LABEL } from "../../lib/types";
import type { Plan } from "../../lib/types";
import { useToast } from "../../components/Toast";
import Hoja from "../../components/Hoja";
import Icon from "../../components/Icon";
import { clp } from "../../lib/dinero";
import { usePlanes } from "../../lib/planes";

export type Solicitud = {
  id: string;
  creada_en: string;
  nombre_barberia: string;
  contacto: string;
  telefono: string;
  correo: string | null;
  plan: Plan;
  ciclo: "mensual" | "anual" | "prueba";
  estado: "nueva" | "contactada" | "creada" | "descartada";
  notas: string | null;
  es_cambio?: boolean;
  barberia_id?: string | null;
  descuento_codigo?: string | null;
  descuento_pct?: number | null;
  descuento_meses?: number | null;
  edad?: number | null;
  apellido?: string | null;
  sexo?: "masculino" | "femenino" | null;
  region?: string | null;
  comuna?: string | null;
};
type Extra = { id: string; apellido: string | null; edad: number | null; sexo: Solicitud["sexo"]; region: string | null; comuna: string | null };

const ETIQUETA: Record<Solicitud["estado"], string> = { nueva: "Nueva", contactada: "En proceso", creada: "Terminada", descartada: "Descartada" };
const TONO: Record<Solicitud["estado"], string> = { nueva: "aviso", contactada: "ok-suave", creada: "ok", descartada: "gris" };
const CICLO: Record<Solicitud["ciclo"], string> = { mensual: "mensual", anual: "anual", prueba: "prueba gratis" };
type Pestana = "atender" | "proceso" | "terminadas";
const PESTANAS: { v: Pestana; t: string }[] = [
  { v: "atender", t: "Por atender" },
  { v: "proceso", t: "En proceso" },
  { v: "terminadas", t: "Terminadas" },
];
const enPestana = (s: Solicitud, p: Pestana) =>
  p === "atender" ? s.estado === "nueva" : p === "proceso" ? s.estado === "contactada" : s.estado === "creada" || s.estado === "descartada";

function hace(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

export default function Solicitudes() {
  const nav = useNavigate();
  const avisar = useToast();
  const planes = usePlanes();
  const [lista, setLista] = useState<Solicitud[] | null>(null);
  const [error, setError] = useState("");
  const [abierta, setAbierta] = useState<Solicitud | null>(null);
  const [pestana, setPestana] = useState<Pestana>("atender");
  const [cobro, setCobro] = useState(false);
  const [monto, setMonto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [descartar, setDescartar] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("admin_solicitudes");
    if (err) return setError("No pudimos cargar las solicitudes. Revisa que paso05-planes.sql esté ejecutado.");
    setError("");
    // Datos del formulario nuevo (sexo, región, comuna). Si el paso25 aún no se ejecutó, simplemente no aparecen.
    const ex = await supabase.rpc("admin_solicitudes_extra");
    const extra = new Map(((ex.error ? [] : ex.data ?? []) as Extra[]).map((x) => [x.id, x]));
    setLista(((data ?? []) as Solicitud[]).map((s) => ({ ...s, ...(extra.get(s.id) ? { apellido: extra.get(s.id)!.apellido, edad: extra.get(s.id)!.edad, sexo: extra.get(s.id)!.sexo, region: extra.get(s.id)!.region, comuna: extra.get(s.id)!.comuna } : {}) })));
    window.dispatchEvent(new Event("fs-solicitudes")); // actualiza el contador del menú
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cuenta = useMemo(
    () => ({ atender: (lista ?? []).filter((s) => enPestana(s, "atender")).length, proceso: (lista ?? []).filter((s) => enPestana(s, "proceso")).length, terminadas: (lista ?? []).filter((s) => enPestana(s, "terminadas")).length }),
    [lista],
  );
  const visibles = (lista ?? []).filter((s) => enPestana(s, pestana));

  const abrir = (s: Solicitud) => {
    setAbierta(s);
    setCobro(false);
    setDescartar(false);
    setMonto("");
  };
  const cerrar = () => setAbierta(null);

  const cambiar = async (s: Solicitud, estado: Solicitud["estado"]) => {
    const { error: err } = await supabase.rpc("admin_estado_solicitud", { p_id: s.id, p_estado: estado });
    if (err) return avisar("No se pudo cambiar el estado", "error");
    setAbierta({ ...s, estado });
    void cargar();
  };

  const precioSugerido = (s: Solicitud) => {
    const f = planes.find((x) => x.clave === s.plan);
    if (!f) return 0;
    const base = s.ciclo === "anual" ? f.precio_anual : f.precio_mensual;
    return Math.round((base * (100 - (s.descuento_pct ?? 0))) / 100);
  };

  // Cambio de plan: cambia el plan, aplica el código, registra el pago y deja la solicitud terminada.
  const activar = async (s: Solicitud) => {
    if (!s.barberia_id) return;
    const m = Math.round(Number(monto));
    if (!Number.isFinite(m) || m < 0) return avisar("Escribe un monto válido", "error");
    setOcupado(true);
    const r1 = await supabase.from("barberias").update({ plan: s.plan }).eq("id", s.barberia_id).select("id");
    if (r1.error || !r1.data || r1.data.length === 0) {
      setOcupado(false);
      return avisar("No se pudo cambiar el plan", "error");
    }
    if (s.descuento_codigo) await supabase.rpc("admin_aplicar_descuento", { p_barberia: s.barberia_id, p_codigo: s.descuento_codigo });
    const r2 = await supabase.rpc("admin_registrar_pago", {
      p_barberia: s.barberia_id,
      p_monto: m,
      p_meses: s.ciclo === "anual" ? 12 : 1,
      p_nota: `Cambio a ${PLAN_LABEL[s.plan]}`,
    });
    await supabase.rpc("admin_estado_solicitud", { p_id: s.id, p_estado: "creada" });
    setOcupado(false);
    if (r2.error) avisar("El plan cambió, pero no se pudo registrar el pago. Hazlo en Barberías.", "error");
    else avisar(`Plan ${PLAN_LABEL[s.plan]} activado`);
    setAbierta(null);
    void cargar();
  };

  const crear = (s: Solicitud) => nav("/admin/barberias", { state: { solicitud: s } });

  return (
    <>
      <div className="sol-cab">
        <h1 className="titulo">Solicitudes</h1>
        {cuenta.atender > 0 && <span className="chip sus-mal">{cuenta.atender} {cuenta.atender === 1 ? "nueva" : "nuevas"}</span>}
      </div>
      <p className="suave">Quienes piden un plan o la prueba gratis. Atiéndelas de izquierda a derecha.</p>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <div className="sol-tabs" role="tablist" aria-label="Estado">
        {PESTANAS.map((p) => (
          <button key={p.v} role="tab" aria-selected={pestana === p.v} className={pestana === p.v ? "on" : ""} onClick={() => setPestana(p.v)}>
            {p.t} · {cuenta[p.v]}
          </button>
        ))}
      </div>

      <ul className="lista">
        {visibles.map((s) => (
          <li key={s.id}>
            <button className="fila fila-btn" onClick={() => abrir(s)}>
              <span className="fila-cuerpo">
                <b>{s.nombre_barberia}</b>
                <small>
                  {s.es_cambio ? "Cambio a " : "Barbería nueva · "}
                  {PLAN_LABEL[s.plan]} · {CICLO[s.ciclo]} · {hace(s.creada_en)}
                </small>
              </span>
              <span className={`chip sus-${TONO[s.estado]}`}>{ETIQUETA[s.estado]}</span>
            </button>
          </li>
        ))}
      </ul>
      {lista && visibles.length === 0 && <div className="vacio">{pestana === "atender" ? "No hay solicitudes nuevas." : pestana === "proceso" ? "Nada en proceso." : "Todavía no hay solicitudes terminadas."}</div>}

      {abierta && (
        <Hoja titulo={abierta.nombre_barberia} onCerrar={cerrar}>
          <div className="tarjeta">
            <div className="sol-quien">
              <b>{abierta.contacto}</b>
              <span className={`chip sus-${TONO[abierta.estado]}`}>{ETIQUETA[abierta.estado]}</span>
            </div>
            <p className="suave" style={{ margin: "2px 0" }}>{formatearTelefono(abierta.telefono)}{abierta.correo ? ` · ${abierta.correo}` : ""}</p>
            {abierta.comuna && (
              <p className="suave" style={{ margin: "2px 0" }}>
                {abierta.sexo === "femenino" ? "Mujer" : "Hombre"}{abierta.edad ? `, ${abierta.edad} años` : ""} · {abierta.comuna}, {abierta.region}
              </p>
            )}
            <p style={{ marginTop: 8 }}>
              {abierta.es_cambio ? "Quiere cambiar a" : "Quiere"} <b>{PLAN_LABEL[abierta.plan]}</b> · {CICLO[abierta.ciclo]}
            </p>
            {abierta.descuento_codigo && (
              <p className="suave" style={{ margin: "4px 0 0" }}>
                Código <b className="num">{abierta.descuento_codigo}</b>: −{abierta.descuento_pct}% por {abierta.descuento_meses} {abierta.descuento_meses === 1 ? "mes" : "meses"}
              </p>
            )}
          </div>

          {(abierta.estado === "nueva" || abierta.estado === "contactada") && (
            <ol className="pasos">
              <li className={abierta.estado === "nueva" ? "act" : "hecho"}>
                <span className="n">{abierta.estado === "nueva" ? "1" : "✓"}</span>
                <div>
                  <b>Contactar</b>
                  <p className="suave chico">Escríbele para coordinar. Al abrir WhatsApp pasa a «En proceso».</p>
                  <a
                    className="btn btn-whatsapp btn-chico"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => abierta.estado === "nueva" && void cambiar(abierta, "contactada")}
                    href={enlaceWhatsapp(abierta.telefono, `Hola ${abierta.contacto}, te escribo de Fade Studio por tu solicitud para ${abierta.nombre_barberia}.`)}
                  >
                    <Icon nombre="whatsapp" size={18} /> Escribir por WhatsApp
                  </a>
                </div>
              </li>
              <li className={abierta.estado === "contactada" ? "act" : ""}>
                <span className="n">2</span>
                <div>
                  <b>{abierta.es_cambio ? "Cobrar y activar" : "Crear la barbería"}</b>
                  {abierta.es_cambio ? (
                    !cobro ? (
                      <>
                        <p className="suave chico">Cuando te pague, activa el plan y registra el pago.</p>
                        <button
                          className="btn btn-primario btn-chico"
                          onClick={() => {
                            setMonto(String(precioSugerido(abierta)));
                            setCobro(true);
                          }}
                        >
                          Ya pagó · activar {PLAN_LABEL[abierta.plan]}
                        </button>
                      </>
                    ) : (
                      <div className="form-hoja">
                        <label className="campo">
                          <span>
                            Monto recibido ({abierta.ciclo === "anual" ? "1 año" : "1 mes"})
                          </span>
                          <input type="number" inputMode="numeric" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />
                          <small>Sugerido: {clp(precioSugerido(abierta))}. Cambia el plan, registra el pago y cierra la solicitud.</small>
                        </label>
                        <div className="acciones">
                          <button className="btn btn-primario btn-chico" disabled={ocupado} onClick={() => void activar(abierta)}>
                            {ocupado ? "Activando…" : "Confirmar y activar"}
                          </button>
                          <button className="btn btn-borde btn-chico" disabled={ocupado} onClick={() => setCobro(false)}>
                            Volver
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <>
                      <p className="suave chico">Crea su cuenta con los datos de la solicitud. Queda en prueba hasta que pague.</p>
                      <button className="btn btn-primario btn-chico" onClick={() => crear(abierta)}>
                        <Icon nombre="shop" size={18} /> Crear la barbería
                      </button>
                    </>
                  )}
                </div>
              </li>
            </ol>
          )}

          {(abierta.estado === "creada" || abierta.estado === "descartada") && (
            <p className="suave" style={{ marginTop: 12 }}>
              {abierta.estado === "creada" ? "Esta solicitud ya está terminada." : "Esta solicitud fue descartada."}
            </p>
          )}

          <div className="sol-pie">
            {abierta.estado === "descartada" || abierta.estado === "creada" ? (
              <button className="btn btn-texto" onClick={() => void cambiar(abierta, "contactada")}>
                Volver a «En proceso»
              </button>
            ) : (
              <button className="btn btn-texto sol-descartar" onClick={() => (descartar ? void cambiar(abierta, "descartada") : setDescartar(true))} onBlur={() => setDescartar(false)}>
                {descartar ? "¿Seguro? Toca otra vez para descartar" : "Descartar solicitud"}
              </button>
            )}
          </div>
        </Hoja>
      )}
    </>
  );
}
