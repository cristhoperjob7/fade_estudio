import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { fechaLarga, hm, hoyChile, minutosChile } from "../../lib/fecha";
import type { EstadoCita } from "../../lib/types";

type FilaCita = {
  id: string;
  inicio_min: number;
  dur_min: number;
  servicio_nombre: string;
  cliente_nombre: string;
  estado: EstadoCita;
  barbero: { nombre: string } | { nombre: string }[] | null;
};
type Cobro = { monto: number; metodo: string; comision_monto: number | null };

type Resumen = {
  ventas: number;
  comisiones: number;
  efectivo: number;
  cobros: number;
  citas: number;
  atendidas: number;
  proximas: FilaCita[];
  porRevisar: number;
};

const nombreBarbero = (b: FilaCita["barbero"]) => (Array.isArray(b) ? b[0]?.nombre : b?.nombre) ?? "—";

function saludo(): string {
  const h = Math.floor(minutosChile() / 60);
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

export default function Inicio() {
  const hoy = hoyChile();
  const [r, setR] = useState<Resumen | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [cobros, citas, pend] = await Promise.all([
      supabase.from("cobros").select("monto,metodo,comision_monto").eq("fecha", hoy),
      supabase
        .from("citas")
        .select("id,inicio_min,dur_min,servicio_nombre,cliente_nombre,estado,barbero:perfiles!barbero_id(nombre)")
        .eq("fecha", hoy)
        .in("estado", ["confirmada", "atendida"])
        .order("inicio_min"),
      supabase.from("citas").select("id", { count: "exact", head: true }).eq("estado", "por_revisar"),
    ]);
    if (cobros.error || citas.error) {
      setError("No pudimos cargar el resumen. Revisa tu conexión.");
      return;
    }
    setError("");
    const cb = (cobros.data ?? []) as Cobro[];
    const ct = (citas.data ?? []) as unknown as FilaCita[];
    const ahora = minutosChile();
    setR({
      ventas: cb.reduce((a, c) => a + c.monto, 0),
      comisiones: cb.reduce((a, c) => a + (c.comision_monto ?? 0), 0),
      efectivo: cb.filter((c) => c.metodo === "efectivo").reduce((a, c) => a + c.monto, 0),
      cobros: cb.length,
      citas: ct.length,
      atendidas: ct.filter((c) => c.estado === "atendida").length,
      proximas: ct.filter((c) => c.estado === "confirmada" && c.inicio_min + c.dur_min > ahora).slice(0, 6),
      porRevisar: pend.count ?? 0,
    });
  }, [hoy]);

  useEffect(() => {
    void cargar();
    const canal = supabase
      .channel("inicio-dueno")
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => void cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "cobros" }, () => void cargar())
      .subscribe();
    const reloj = window.setInterval(() => void cargar(), 60_000);
    return () => {
      window.clearInterval(reloj);
      void supabase.removeChannel(canal);
    };
  }, [cargar]);

  return (
    <>
      <h1 className="titulo">{saludo()}</h1>
      <p className="suave capital">{fechaLarga(hoy)}</p>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      {r && r.porRevisar > 0 && (
        <Link to="/panel/reservas" className="pendientes">
          <span>
            {r.porRevisar} {r.porRevisar === 1 ? "comprobante por revisar" : "comprobantes por revisar"}
          </span>
          <span aria-hidden="true">Revisar</span>
        </Link>
      )}

      <section className="kpis" aria-label="Resumen de hoy">
        <Kpi etiqueta="Ventas de hoy" valor={r ? clp(r.ventas) : "—"} nota={r ? `${r.cobros} ${r.cobros === 1 ? "cobro" : "cobros"}` : ""} />
        <Kpi etiqueta="Citas" valor={r ? String(r.citas) : "—"} nota={r ? `${r.atendidas} ${r.atendidas === 1 ? "atendida" : "atendidas"}` : ""} />
        <Kpi etiqueta="Comisiones" valor={r ? clp(r.comisiones) : "—"} nota="a pagar hoy" />
        <Kpi etiqueta="Caja" valor={r ? clp(r.efectivo) : "—"} nota="efectivo" />
      </section>

      <h2 className="seccion">Próximas citas</h2>
      {!r ? (
        <p className="suave">Cargando…</p>
      ) : r.proximas.length === 0 ? (
        <div className="vacio">No quedan citas por atender hoy.</div>
      ) : (
        <ul className="lista">
          {r.proximas.map((c) => (
            <li key={c.id} className="fila">
              <span className="hora num">{hm(c.inicio_min)}</span>
              <span className="fila-cuerpo">
                <b>{c.cliente_nombre}</b>
                <small>{c.servicio_nombre}</small>
              </span>
              <span className="chip azul">{nombreBarbero(c.barbero)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Kpi({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota: string }) {
  return (
    <div className="kpi">
      <small>{etiqueta}</small>
      <b className="num">{valor}</b>
      <span>{nota || " "}</span>
    </div>
  );
}
