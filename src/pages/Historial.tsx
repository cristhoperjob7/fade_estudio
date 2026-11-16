import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { clp } from "../lib/dinero";
import { diaSemana, fechaLarga, hm, hoyChile, sumarDias } from "../lib/fecha";
import Icon from "../components/Icon";

type Fila = {
  id: string;
  fecha: string;
  barbero_id: string;
  servicio_nombre: string;
  precio: number;
  inicio_min: number;
  cliente_nombre: string;
};
type Periodo = "semana" | "mes";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const lunesDe = (f: string) => sumarDias(f, -((diaSemana(f) + 6) % 7));
const finDeMes = (f: string) => {
  const [a, m] = f.split("-").map(Number);
  return `${a}-${String(m).padStart(2, "0")}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`;
};
const sumarMes = (f: string, n: number) => {
  const [a, m] = f.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

function rango(ancla: string, p: Periodo): [string, string, string] {
  if (p === "semana") {
    const d = lunesDe(ancla);
    const h = sumarDias(d, 6);
    const corto = (f: string) => `${Number(f.slice(8))} ${MESES[Number(f.slice(5, 7)) - 1].slice(0, 3)}`;
    return [d, h, `${corto(d)} al ${corto(h)}`];
  }
  const d = `${ancla.slice(0, 7)}-01`;
  return [d, finDeMes(d), `${MESES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`];
}

/** Historial: servicios ya completados, agrupados por día. El dueño ve a todos; el barbero, solo los suyos. */
export default function Historial() {
  const { perfil } = useAuth();
  const esDueno = perfil?.rol === "dueno";
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [ancla, setAncla] = useState(hoyChile());
  const [filtro, setFiltro] = useState("");
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [barberos, setBarberos] = useState<{ id: string; nombre: string }[]>([]);
  const [error, setError] = useState("");
  const [desde, hasta, titulo] = rango(ancla, periodo);

  useEffect(() => {
    if (!esDueno) return;
    supabase
      .from("perfiles")
      .select("id,nombre")
      .eq("atiende", true)
      .order("nombre")
      .then(({ data }) => setBarberos((data ?? []) as { id: string; nombre: string }[]));
  }, [esDueno]);

  useEffect(() => {
    if (!perfil) return;
    let vigente = true;
    setFilas(null);
    let q = supabase
      .from("citas")
      .select("id,fecha,barbero_id,servicio_nombre,precio,inicio_min,cliente_nombre")
      .eq("estado", "atendida")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("inicio_min");
    if (!esDueno) q = q.eq("barbero_id", perfil.id);
    q.then(({ data, error: err }) => {
      if (!vigente) return;
      if (err) return setError("No pudimos cargar el historial. Revisa tu conexión.");
      setError("");
      setFilas((data ?? []) as Fila[]);
    });
    return () => {
      vigente = false;
    };
  }, [desde, hasta, perfil, esDueno]);

  const nombreDe = (id: string) => barberos.find((b) => b.id === id)?.nombre.split(" ")[0] ?? "";
  const lista = useMemo(() => (filas ?? []).filter((f) => !filtro || f.barbero_id === filtro), [filas, filtro]);
  const total = lista.reduce((s, f) => s + f.precio, 0);
  const dias = useMemo(() => {
    const m = new Map<string, Fila[]>();
    for (const f of lista) m.set(f.fecha, [...(m.get(f.fecha) ?? []), f]);
    return [...m.entries()];
  }, [lista]);

  const mover = (n: number) => setAncla(periodo === "semana" ? sumarDias(ancla, 7 * n) : sumarMes(ancla, n));
  const esActual = ancla >= rango(hoyChile(), periodo)[0] && ancla <= rango(hoyChile(), periodo)[1];

  return (
    <>
      <h1 className="titulo">Historial</h1>
      <p className="suave">Servicios completados.</p>

      <div className="pestanitas" role="tablist" aria-label="Periodo">
        <button role="tab" aria-selected={periodo === "semana"} className={periodo === "semana" ? "on" : ""} onClick={() => setPeriodo("semana")}>
          Semana
        </button>
        <button role="tab" aria-selected={periodo === "mes"} className={periodo === "mes" ? "on" : ""} onClick={() => setPeriodo("mes")}>
          Mes
        </button>
      </div>

      <div className="hist-barra">
        <button className="icono-btn" onClick={() => mover(-1)} aria-label="Anterior">
          <Icon nombre="back" size={20} />
        </button>
        <span className="periodo">{titulo}</span>
        <button className="icono-btn" onClick={() => mover(1)} aria-label="Siguiente" style={{ transform: "scaleX(-1)" }}>
          <Icon nombre="back" size={20} />
        </button>
      </div>
      {!esActual && (
        <button className="btn btn-texto" style={{ minHeight: 36 }} onClick={() => setAncla(hoyChile())}>
          Volver a {periodo === "semana" ? "esta semana" : "este mes"}
        </button>
      )}

      {esDueno && barberos.length > 1 && (
        <div className="hist-filtros">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Barbero">
            <option value="">Todos los barberos</option>
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <div className="hist-resumen">
        <div>
          <small>Servicios</small>
          <b className="num">{lista.length}</b>
        </div>
        <div>
          <small>Total</small>
          <b className="num">{clp(total)}</b>
        </div>
      </div>

      {filas === null && !error ? (
        <p className="suave" style={{ marginTop: 16 }}>Cargando…</p>
      ) : dias.length === 0 ? (
        <div className="vacio" style={{ marginTop: 16 }}>No hay servicios completados en este periodo.</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {dias.map(([fecha, items]) => (
            <details key={fecha} className="hist-dia">
              <summary>
                <b>{fechaLarga(fecha)}</b>
                <span>
                  {items.length} · {clp(items.reduce((s, f) => s + f.precio, 0))}
                </span>
              </summary>
              {items.map((f) => (
                <div key={f.id} className="fila">
                  <span className="hora num">{hm(f.inicio_min)}</span>
                  <span className="fila-cuerpo">
                    <b>{f.cliente_nombre}</b>
                    <small>
                      {f.servicio_nombre} · {clp(f.precio)}
                    </small>
                  </span>
                  {esDueno && nombreDe(f.barbero_id) && <span className="chip azul">{nombreDe(f.barbero_id)}</span>}
                </div>
              ))}
            </details>
          ))}
        </div>
      )}
    </>
  );
}
