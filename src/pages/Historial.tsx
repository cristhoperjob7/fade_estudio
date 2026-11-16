import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { clp } from "../lib/dinero";
import { fechaLarga, hm, hoyChile } from "../lib/fecha";
import SelectorDia from "../components/SelectorDia";

type Fila = {
  id: string;
  barbero_id: string;
  servicio_nombre: string;
  precio: number;
  inicio_min: number;
  cliente_nombre: string;
};

/** Historial: servicios ya completados de un día. El dueño ve a todos (y filtra por barbero); el barbero ve solo los suyos. */
export default function Historial() {
  const { perfil } = useAuth();
  const esDueno = perfil?.rol === "dueno";
  const [fecha, setFecha] = useState(hoyChile());
  const [filtro, setFiltro] = useState("");
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [barberos, setBarberos] = useState<{ id: string; nombre: string }[]>([]);
  const [error, setError] = useState("");

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
      .select("id,barbero_id,servicio_nombre,precio,inicio_min,cliente_nombre")
      .eq("fecha", fecha)
      .eq("estado", "atendida")
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
  }, [fecha, perfil, esDueno]);

  const nombreDe = (id: string) => barberos.find((b) => b.id === id)?.nombre.split(" ")[0] ?? "";
  const lista = useMemo(() => (filas ?? []).filter((f) => !filtro || f.barbero_id === filtro), [filas, filtro]);
  const total = lista.reduce((s, f) => s + f.precio, 0);

  return (
    <>
      <h1 className="seccion">Historial</h1>
      <p className="suave">Servicios completados, día por día.</p>
      <SelectorDia fecha={fecha} onCambiar={setFecha} />

      {esDueno && barberos.length > 1 && (
        <div className="filtro-barberos" role="tablist" aria-label="Barbero">
          <button role="tab" aria-selected={filtro === ""} className={filtro === "" ? "on" : ""} onClick={() => setFiltro("")}>
            Todos
          </button>
          {barberos.map((b) => (
            <button key={b.id} role="tab" aria-selected={filtro === b.id} className={filtro === b.id ? "on" : ""} onClick={() => setFiltro(b.id)}>
              {b.nombre.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <h2 className="seccion">{fechaLarga(fecha)}</h2>
      {filas === null && !error ? (
        <p className="mut">Cargando…</p>
      ) : lista.length === 0 ? (
        <div className="vacio">No hay servicios completados este día.</div>
      ) : (
        <>
          <p className="suave">
            {lista.length} {lista.length === 1 ? "servicio" : "servicios"} · {clp(total)}
          </p>
          <ul className="lista">
            {lista.map((f) => (
              <li key={f.id}>
                <div className="fila">
                  <span className="hora num">{hm(f.inicio_min)}</span>
                  <span className="fila-cuerpo">
                    <b>{f.cliente_nombre}</b>
                    <small>
                      {f.servicio_nombre} · {clp(f.precio)}
                    </small>
                  </span>
                  {esDueno && nombreDe(f.barbero_id) && <span className="chip azul">{nombreDe(f.barbero_id)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
