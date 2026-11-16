import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "./Toast";
import SelectorComuna from "./SelectorComuna";

/** Región y comuna de la barbería (la ve el dueño en Ajustes → Barbería). */
export default function UbicacionBarberia() {
  const avisar = useToast();
  const [guardada, setGuardada] = useState({ region: "", comuna: "" });
  const [borrador, setBorrador] = useState({ region: "", comuna: "" });
  const [editando, setEditando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void supabase.rpc("mi_ubicacion").then(({ data }) => {
      const d = { region: "", comuna: "", ...((data as { region?: string; comuna?: string } | null) ?? {}) };
      setGuardada(d);
      setBorrador(d);
      setCargado(true);
    });
  }, []);

  async function guardar() {
    if (!borrador.region || !borrador.comuna) return avisar("Elige la región y la comuna", "error");
    setOcupado(true);
    const { error } = await supabase.rpc("guardar_mi_ubicacion", { p_region: borrador.region, p_comuna: borrador.comuna });
    setOcupado(false);
    if (error) return avisar("No se pudo guardar. ¿Ejecutaste paso17-ubicacion-solicitudes.sql?", "error");
    setGuardada(borrador);
    setEditando(false);
    avisar("Ubicación guardada");
  }

  if (!cargado) return null;
  return (
    <div className="form-hoja" style={{ marginTop: 18 }}>
      <h3 style={{ fontSize: 15 }}>Región y comuna</h3>
      {!editando ? (
        <>
          <p className="suave" style={{ margin: 0 }}>
            {guardada.comuna ? `${guardada.comuna}, ${guardada.region}` : "Aún no la completas."}
          </p>
          <button type="button" className="btn btn-borde btn-chico" onClick={() => setEditando(true)}>
            {guardada.comuna ? "Editar" : "Completar"}
          </button>
        </>
      ) : (
        <>
          <SelectorComuna region={borrador.region} comuna={borrador.comuna} onCambio={(region, comuna) => setBorrador({ region, comuna })} />
          <div className="acciones">
            <button type="button" className="btn btn-primario btn-chico" disabled={ocupado} onClick={() => void guardar()}>
              {ocupado ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              className="btn btn-borde btn-chico"
              onClick={() => {
                setBorrador(guardada);
                setEditando(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
