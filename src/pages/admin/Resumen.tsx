import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { estadoSuscripcion, fechaMes } from "../../lib/admin";
import type { BarberiaAdmin } from "../../lib/types";
import { PLAN_LABEL } from "../../lib/types";

type Mes = { mes: string; total: number; pagos: number };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function Resumen() {
  const [barberias, setBarberias] = useState<BarberiaAdmin[] | null>(null);
  const [meses, setMeses] = useState<Mes[]>([]);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [b, m] = await Promise.all([supabase.rpc("admin_barberias"), supabase.rpc("admin_ingresos_mensuales")]);
    if (b.error || m.error) return setError("No pudimos cargar el resumen. Revisa tu conexión y que paso02-superadmin.sql esté ejecutado.");
    setError("");
    setBarberias((b.data ?? []) as BarberiaAdmin[]);
    setMeses((m.data ?? []) as Mes[]);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const lista = barberias ?? [];
  const activas = lista.filter((b) => b.vigente);
  const mensual = activas.reduce((s, b) => s + b.precio_mensual, 0);
  const esteMes = meses.length > 0 ? meses[meses.length - 1] : null;
  const vencidas = lista.filter((b) => b.estado === "activa" && !b.vigente);
  const proximas = lista
    .filter((b) => b.estado === "activa" && b.vence_el)
    .sort((a, b) => (a.vence_el as string).localeCompare(b.vence_el as string))
    .slice(0, 6);
  const maximo = Math.max(1, ...meses.map((m) => m.total));

  return (
    <>
      <h1 className="titulo">Resumen</h1>
      <p className="suave">Cómo va Fade Studio.</p>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <div className="kpis">
        <div className="kpi">
          <small>Ingresos del mes</small>
          <b className="num">{clp(esteMes?.total ?? 0)}</b>
          <span>{esteMes?.pagos ?? 0} {esteMes?.pagos === 1 ? "pago" : "pagos"}</span>
        </div>
        <div className="kpi">
          <small>Mensualidad activa</small>
          <b className="num">{clp(mensual)}</b>
          <span>lo que cobrarías al mes</span>
        </div>
        <div className="kpi">
          <small>Barberías al día</small>
          <b className="num">
            {activas.length}
            <em>/{lista.length}</em>
          </b>
          <span>{vencidas.length > 0 ? `${vencidas.length} bloqueadas` : "ninguna bloqueada"}</span>
        </div>
      </div>

      <h2 className="seccion">Ingresos por mes</h2>
      <div className="barras" role="img" aria-label="Ingresos de los últimos 6 meses">
        {meses.map((m) => {
          const f = new Date(`${m.mes}T12:00:00Z`);
          return (
            <div key={m.mes} className="barra">
              <span className="barra-v num">{m.total > 0 ? clp(m.total) : ""}</span>
              <div className="barra-c">
                <i style={{ height: `${Math.max(m.total > 0 ? 6 : 2, (m.total / maximo) * 100)}%` }} />
              </div>
              <small>{MESES[f.getUTCMonth()]}</small>
            </div>
          );
        })}
      </div>

      <h2 className="seccion">Próximos vencimientos</h2>
      <ul className="lista">
        {proximas.map((b) => {
          const e = estadoSuscripcion(b);
          return (
            <li key={b.id}>
              <Link className="fila" to={`/admin/barberias?id=${b.id}`}>
                <span className="fila-cuerpo">
                  <b>{b.nombre}</b>
                  <small>
                    Plan {PLAN_LABEL[b.plan]} · {clp(b.precio_mensual)} · {b.vence_el ? fechaMes(b.vence_el) : ""}
                  </small>
                </span>
                <span className={`chip sus-${e.tono}`}>{e.texto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {barberias && proximas.length === 0 && (
        <div className="vacio">
          Aún no tienes barberías. Crea la primera en la pestaña <b>Barberías</b>.
        </div>
      )}
    </>
  );
}
