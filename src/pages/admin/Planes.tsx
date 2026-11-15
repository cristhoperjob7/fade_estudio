import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { mesesGratis, PLANES_BASE } from "../../lib/planes";
import type { PlanPrecio } from "../../lib/planes";
import { useToast } from "../../components/Toast";

function Fila({ plan, onGuardado }: { plan: PlanPrecio; onGuardado: () => void }) {
  const avisar = useToast();
  const [mensual, setMensual] = useState(String(plan.precio_mensual));
  const [anual, setAnual] = useState(String(plan.precio_anual));
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setMensual(String(plan.precio_mensual));
    setAnual(String(plan.precio_anual));
  }, [plan.precio_mensual, plan.precio_anual]);

  const m = Math.round(Number(mensual));
  const a = Math.round(Number(anual));
  const valido = Number.isFinite(m) && m >= 0 && Number.isFinite(a) && a >= 0;
  const cambio = m !== plan.precio_mensual || a !== plan.precio_anual;
  const gratis = valido ? mesesGratis({ ...plan, precio_mensual: m, precio_anual: a }) : 0;

  const guardar = async () => {
    if (!valido) return setError("Escribe precios válidos.");
    setOcupado(true);
    setError("");
    const { error: err } = await supabase.rpc("admin_guardar_plan", { p_clave: plan.clave, p_mensual: m, p_anual: a });
    setOcupado(false);
    if (err) return setError("No se pudo guardar. Revisa que paso05-planes.sql esté ejecutado.");
    avisar(`Plan ${plan.nombre} actualizado`);
    onGuardado();
  };

  return (
    <section className="tarjeta" style={{ marginTop: 16 }}>
      <h2>{plan.nombre}</h2>
      <div className="fila-dos">
        <label className="campo">
          <span>Precio al mes</span>
          <input type="number" inputMode="numeric" min={0} value={mensual} onChange={(e) => setMensual(e.target.value)} />
        </label>
        <label className="campo">
          <span>Precio al año</span>
          <input type="number" inputMode="numeric" min={0} value={anual} onChange={(e) => setAnual(e.target.value)} />
        </label>
      </div>
      <p className="suave" style={{ margin: "4px 0 12px" }}>
        {valido && m > 0
          ? gratis > 0
            ? `El plan anual equivale a ${gratis} ${gratis === 1 ? "mes gratis" : "meses gratis"}. Con 2 meses gratis serían ${clp(m * 10)}.`
            : `El plan anual no tiene descuento. Con 2 meses gratis serían ${clp(m * 10)}.`
          : " "}
      </p>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-borde btn-ancho" onClick={() => setAnual(String(Math.max(0, m) * 10))}>
        Poner anual con 2 meses gratis
      </button>
      <button type="button" className="btn btn-primario btn-ancho" style={{ marginTop: 10 }} onClick={() => void guardar()} disabled={ocupado || !cambio || !valido}>
        {ocupado ? "Guardando…" : "Guardar"}
      </button>
    </section>
  );
}

export default function Planes() {
  const [planes, setPlanes] = useState<PlanPrecio[] | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("planes_publicos");
    if (err || !Array.isArray(data)) {
      setError("No pudimos cargar los planes. Revisa que paso05-planes.sql esté ejecutado.");
      setPlanes(PLANES_BASE);
      return;
    }
    setError("");
    setPlanes(data as PlanPrecio[]);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <h1 className="titulo">Planes</h1>
      <p className="suave">Estos precios se muestran en la portada y en el proceso de contratación. No cambian lo que ya paga cada barbería.</p>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
      {!error && (planes ?? []).map((p) => <Fila key={p.clave} plan={p} onGuardado={() => void cargar()} />)}
    </>
  );
}
