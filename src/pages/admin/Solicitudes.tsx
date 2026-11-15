import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { enlaceWhatsapp, formatearTelefono } from "../../lib/whatsapp";
import { PLAN_LABEL } from "../../lib/types";
import type { Plan } from "../../lib/types";
import { useToast } from "../../components/Toast";
import Hoja from "../../components/Hoja";
import Icon from "../../components/Icon";

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
};

const ESTADOS: { v: Solicitud["estado"]; t: string }[] = [
  { v: "nueva", t: "Nueva" },
  { v: "contactada", t: "Contactada" },
  { v: "creada", t: "Creada" },
  { v: "descartada", t: "Descartada" },
];
const CICLO: Record<Solicitud["ciclo"], string> = { mensual: "mensual", anual: "anual", prueba: "prueba gratis" };

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
  const [lista, setLista] = useState<Solicitud[] | null>(null);
  const [error, setError] = useState("");
  const [abierta, setAbierta] = useState<Solicitud | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("admin_solicitudes");
    if (err) return setError("No pudimos cargar las solicitudes. Revisa que paso05-planes.sql esté ejecutado.");
    setError("");
    setLista((data ?? []) as Solicitud[]);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiar = async (s: Solicitud, estado: Solicitud["estado"]) => {
    const { error: err } = await supabase.rpc("admin_estado_solicitud", { p_id: s.id, p_estado: estado });
    if (err) return avisar("No se pudo cambiar el estado");
    setAbierta({ ...s, estado });
    void cargar();
  };

  const crear = (s: Solicitud) => nav("/admin/barberias", { state: { solicitud: s } });
  const nuevas = (lista ?? []).filter((s) => s.estado === "nueva").length;

  return (
    <>
      <h1 className="titulo">Solicitudes</h1>
      <p className="suave">
        {nuevas > 0 ? `${nuevas} ${nuevas === 1 ? "persona quiere" : "personas quieren"} contratar. Escríbeles por WhatsApp.` : "Aquí llegan los que piden un plan o la prueba gratis."}
      </p>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
      <ul className="lista">
        {(lista ?? []).map((s) => (
          <li key={s.id}>
            <button className="fila fila-btn" onClick={() => setAbierta(s)}>
              <span className="fila-cuerpo">
                <b>{s.nombre_barberia}</b>
                <small>
                  {s.contacto} · {PLAN_LABEL[s.plan]} · {CICLO[s.ciclo]} · {hace(s.creada_en)}
                </small>
              </span>
              <span className={`chip sus-${s.estado === "nueva" ? "aviso" : s.estado === "creada" ? "ok" : "gris"}`}>
                {ESTADOS.find((e) => e.v === s.estado)?.t}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {lista && lista.length === 0 && <div className="vacio">Todavía no hay solicitudes.</div>}

      {abierta && (
        <Hoja titulo={abierta.nombre_barberia} onCerrar={() => setAbierta(null)}>
          <div className="tarjeta">
            <p>
              <b>{abierta.contacto}</b>
            </p>
            <p className="suave">{formatearTelefono(abierta.telefono)}</p>
            {abierta.correo && <p className="suave">{abierta.correo}</p>}
            <p style={{ marginTop: 10 }}>
              Plan <b>{PLAN_LABEL[abierta.plan]}</b> · {CICLO[abierta.ciclo]}
            </p>
          </div>
          <a
            className="btn btn-primario btn-ancho"
            style={{ marginTop: 14 }}
            target="_blank"
            rel="noreferrer"
            onClick={() => abierta.estado === "nueva" && void cambiar(abierta, "contactada")}
            href={enlaceWhatsapp(abierta.telefono, `Hola ${abierta.contacto}, te escribo de Fade Studio por tu solicitud para ${abierta.nombre_barberia}.`)}
          >
            <Icon nombre="whatsapp" size={20} /> Escribir por WhatsApp
          </a>
          <button className="btn btn-borde btn-ancho" style={{ marginTop: 10 }} onClick={() => crear(abierta)}>
            <Icon nombre="shop" size={20} /> Crear la barbería con estos datos
          </button>
          <h3 style={{ margin: "18px 0 8px" }}>Estado</h3>
          <div className="fila-dos">
            {ESTADOS.map((e) => (
              <button
                key={e.v}
                className={`btn ${abierta.estado === e.v ? "btn-primario" : "btn-borde"}`}
                onClick={() => void cambiar(abierta, e.v)}
              >
                {e.t}
              </button>
            ))}
          </div>
        </Hoja>
      )}
    </>
  );
}
