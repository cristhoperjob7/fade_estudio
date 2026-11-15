import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { clp } from "../../lib/dinero";
import { mesesGratis, PLANES_BASE } from "../../lib/planes";
import type { PlanPrecio } from "../../lib/planes";
import { useToast } from "../../components/Toast";
import Seccion from "../../components/Seccion";
import Ficha from "../../components/Ficha";

function Fila({ plan, onGuardado, abierta, onToggle }: { plan: PlanPrecio; onGuardado: () => void; abierta: boolean; onToggle: () => void }) {
  const avisar = useToast();
  const [mensual, setMensual] = useState(String(plan.precio_mensual));
  const [anual, setAnual] = useState(String(plan.precio_anual));
  const [ocupado, setOcupado] = useState(false);

  const restaurar = () => {
    setMensual(String(plan.precio_mensual));
    setAnual(String(plan.precio_anual));
  };
  useEffect(restaurar, [plan.precio_mensual, plan.precio_anual]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = Math.round(Number(mensual));
  const a = Math.round(Number(anual));
  const valido = Number.isFinite(m) && m >= 0 && Number.isFinite(a) && a >= 0;
  const gratis = valido ? mesesGratis({ ...plan, precio_mensual: m, precio_anual: a }) : 0;
  const gratisActual = mesesGratis(plan);

  const guardar = async (): Promise<boolean> => {
    if (!valido) {
      avisar("Escribe precios válidos.", "error");
      return false;
    }
    setOcupado(true);
    const { error: err } = await supabase.rpc("admin_guardar_plan", { p_clave: plan.clave, p_mensual: m, p_anual: a });
    setOcupado(false);
    if (err) {
      avisar("No se pudo guardar. Revisa que paso05-planes.sql esté ejecutado.", "error");
      return false;
    }
    avisar(`Plan ${plan.nombre} actualizado`);
    onGuardado();
    return true;
  };

  return (
    <Seccion
      titulo={`Plan ${plan.nombre}`}
      resumen={`${clp(plan.precio_mensual)}/mes · ${clp(plan.precio_anual)}/año`}
      icono="tag"
      abierta={abierta}
      onToggle={onToggle}
    >
      <Ficha
        filas={[
          { etiqueta: "Precio al mes", valor: clp(plan.precio_mensual) },
          { etiqueta: "Precio al año", valor: clp(plan.precio_anual) },
          { etiqueta: "Descuento anual", valor: gratisActual > 0 ? `${gratisActual} ${gratisActual === 1 ? "mes gratis" : "meses gratis"}` : "Sin descuento" },
        ]}
        onGuardar={guardar}
        onCancelar={restaurar}
        guardando={ocupado}
        textoEditar="Editar precios"
      >
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
        <p className="suave" style={{ margin: 0 }}>
          {valido && m > 0
            ? gratis > 0
              ? `El plan anual equivale a ${gratis} ${gratis === 1 ? "mes gratis" : "meses gratis"}. Con 2 meses gratis serían ${clp(m * 10)}.`
              : `El plan anual no tiene descuento. Con 2 meses gratis serían ${clp(m * 10)}.`
            : " "}
        </p>
        <button type="button" className="btn btn-borde" onClick={() => setAnual(String(Math.max(0, m) * 10))}>
          Poner anual con 2 meses gratis
        </button>
      </Ficha>
    </Seccion>
  );
}

export default function Planes() {
  const [planes, setPlanes] = useState<PlanPrecio[] | null>(null);
  const [error, setError] = useState("");
  const [abierta, setAbierta] = useState<string>("");

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
      {!error && (planes ?? []).map((p) => <Fila key={p.clave} plan={p} abierta={abierta === p.clave} onToggle={() => setAbierta(abierta === p.clave ? "" : p.clave)} onGuardado={() => void cargar()} />)}
    </>
  );
}
