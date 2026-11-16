import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { clp } from "../lib/dinero";
import { diasTexto } from "../lib/reserva";
import type { Servicio } from "../lib/types";
import { useToast } from "./Toast";
import Hoja from "./Hoja";
import Selector from "./Selector";

const DURACIONES = [30, 60, 90, 120, 150, 180];
const DIAS = [
  { n: 1, t: "Lun" },
  { n: 2, t: "Mar" },
  { n: 3, t: "Mié" },
  { n: 4, t: "Jue" },
  { n: 5, t: "Vie" },
  { n: 6, t: "Sáb" },
  { n: 0, t: "Dom" },
];

/** Tarjeta de Ajustes: servicios, precios y ofertas por día. */
export default function ServiciosEditor() {
  const [lista, setLista] = useState<Servicio[] | null>(null);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<Servicio | "nuevo" | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.from("servicios").select("*").order("orden").order("precio");
    if (err) return setError("No pudimos cargar los servicios.");
    setError("");
    setLista((data ?? []) as Servicio[]);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="tarjeta">
      <h2>Servicios y precios</h2>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
      <ul className="lista">
        {(lista ?? []).map((s) => (
          <li key={s.id}>
            <button className="fila fila-btn" onClick={() => setEditando(s)}>
              <span className="fila-cuerpo">
                <b>{s.nombre}</b>
                <small>
                  {s.duracion_min} min · {clp(s.precio)}
                  {s.precio_promo !== null ? ` · oferta ${clp(s.precio_promo)} (${diasTexto(s.dias_promo, true)})` : ""}
                </small>
              </span>
              {!s.activo && <span className="chip">Oculto</span>}
            </button>
          </li>
        ))}
      </ul>
      {lista && lista.length === 0 && <div className="vacio">Aún no tienes servicios. Agrega el primero.</div>}
      <button className="btn btn-borde btn-chico" onClick={() => setEditando("nuevo")}>
        Agregar servicio
      </button>

      {editando && (
        <FormServicio
          servicio={editando === "nuevo" ? null : editando}
          orden={(lista ?? []).reduce((m, s) => Math.max(m, s.orden), 0) + 1}
          onCerrar={() => setEditando(null)}
          onListo={() => {
            setEditando(null);
            void cargar();
          }}
        />
      )}
    </div>
  );
}

function FormServicio({
  servicio,
  orden,
  onCerrar,
  onListo,
}: {
  servicio: Servicio | null;
  orden: number;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const avisar = useToast();
  const [nombre, setNombre] = useState(servicio?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? "");
  const [duracion, setDuracion] = useState(servicio?.duracion_min ?? 60);
  const [precio, setPrecio] = useState(servicio ? String(servicio.precio) : "");
  const [promo, setPromo] = useState(servicio?.precio_promo != null ? String(servicio.precio_promo) : "");
  const [dias, setDias] = useState<number[]>(servicio?.dias_promo?.length ? servicio.dias_promo : [1, 2, 3, 4]);
  const [activo, setActivo] = useState(servicio?.activo ?? true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const p = Math.round(Number(precio));
    const pp = promo.trim() === "" ? null : Math.round(Number(promo));
    if (nombre.trim().length < 2) return setError("Escribe el nombre del servicio.");
    if (!Number.isFinite(p) || p < 0) return setError("El precio no es válido.");
    if (pp !== null && (!Number.isFinite(pp) || pp < 0 || pp >= p)) return setError("La oferta debe ser menor al precio normal.");
    if (pp !== null && dias.length === 0) return setError("Elige los días de la oferta.");
    setOcupado(true);
    setError("");
    const cuerpo = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      duracion_min: duracion,
      precio: p,
      precio_promo: pp,
      dias_promo: pp === null ? [] : dias,
      activo,
    };
    const r = servicio
      ? await supabase.from("servicios").update(cuerpo).eq("id", servicio.id).select("id")
      : await supabase.from("servicios").insert({ ...cuerpo, orden }).select("id");
    setOcupado(false);
    if (r.error) {
      return setError(r.error.code === "23505" ? "Ya tienes un servicio con ese nombre." : "No se pudo guardar.");
    }
    if (!r.data || r.data.length === 0) return setError("No se pudo guardar.");
    avisar("Servicio guardado");
    onListo();
  };

  return (
    <Hoja titulo={servicio ? "Editar servicio" : "Nuevo servicio"} onCerrar={onCerrar}>
      <form className="form-hoja" onSubmit={guardar}>
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} required />
        </label>
        <label className="campo">
          <span>Descripción (opcional)</span>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={120} />
        </label>
        <div className="campo">
          <span>Duración</span>
          <Selector etiqueta="Duración" valor={String(duracion)} onCambio={(v) => setDuracion(Number(v))} opciones={DURACIONES.map((d) => ({ valor: String(d), etiqueta: `${d} minutos` }))} />
        </div>
        <label className="campo">
          <span>Precio normal (CLP)</span>
          <input type="number" inputMode="numeric" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Precio de oferta (opcional)</span>
          <input type="number" inputMode="numeric" min={0} value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Déjalo vacío si no hay oferta" />
        </label>
        {promo.trim() !== "" && (
          <div className="campo">
            <span>Días de la oferta</span>
            <div className="dias-promo">
              {DIAS.map((d) => (
                <button
                  type="button"
                  key={d.n}
                  className={dias.includes(d.n) ? "on" : ""}
                  aria-pressed={dias.includes(d.n)}
                  onClick={() => setDias((x) => (x.includes(d.n) ? x.filter((n) => n !== d.n) : [...x, d.n]))}
                >
                  {d.t}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="interruptor">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span>
            <b>Visible para los clientes</b>
            <small>Si lo apagas, deja de aparecer en la página y en las reservas.</small>
          </span>
        </label>
        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primario" disabled={ocupado}>
          {ocupado ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </Hoja>
  );
}
