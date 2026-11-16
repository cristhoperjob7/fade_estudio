import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { hoyChile } from "../../lib/fecha";
import { useToast } from "../../components/Toast";
import Hoja from "../../components/Hoja";
import Icon from "../../components/Icon";

export type Descuento = {
  id: string;
  codigo: string;
  porcentaje: number;
  meses: number;
  desde: string;
  hasta: string | null;
  usos_max: number | null;
  usos: number;
  activo: boolean;
  notas: string;
};

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function codigoAleatorio(n = 8): string {
  const b = new Uint32Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => LETRAS[x % LETRAS.length]).join("");
}

const fechaCorta = (f: string) => {
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a}`;
};

function estadoDe(d: Descuento, hoy: string): { texto: string; tono: "ok" | "aviso" | "gris" } {
  if (!d.activo) return { texto: "Pausado", tono: "gris" };
  if (d.hasta && d.hasta < hoy) return { texto: "Vencido", tono: "gris" };
  if (d.desde > hoy) return { texto: "Aún no parte", tono: "aviso" };
  if (d.usos_max !== null && d.usos >= d.usos_max) return { texto: "Agotado", tono: "gris" };
  return { texto: "Activo", tono: "ok" };
}

/** Códigos de descuento: el superadmin los crea y los edita aquí. */
export default function Descuentos() {
  const [lista, setLista] = useState<Descuento[] | null>(null);
  const [error, setError] = useState("");
  const [editar, setEditar] = useState<Descuento | "nuevo" | null>(null);
  const hoy = hoyChile();

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("admin_descuentos");
    if (err) return setError("No pudimos cargar los descuentos. Revisa que paso12-descuentos.sql esté ejecutado.");
    setError("");
    setLista((data ?? []) as Descuento[]);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <h1 className="titulo">Descuentos</h1>
      <p className="suave">Códigos con un porcentaje y una vigencia. Los clientes los escriben al pedir un plan.</p>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <ul className="lista">
        {(lista ?? []).map((d) => {
          const e = estadoDe(d, hoy);
          return (
            <li key={d.id}>
              <button className="fila fila-btn" onClick={() => setEditar(d)}>
                <span className="fila-cuerpo">
                  <b className="num">{d.codigo}</b>
                  <small>
                    −{d.porcentaje}% por {d.meses} {d.meses === 1 ? "mes" : "meses"} · {d.hasta ? `hasta ${fechaCorta(d.hasta)}` : "sin fecha de término"} · {d.usos}
                    {d.usos_max ? `/${d.usos_max}` : ""} {d.usos === 1 && !d.usos_max ? "uso" : "usos"}
                  </small>
                </span>
                <span className={`chip sus-${e.tono}`}>{e.texto}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {lista && lista.length === 0 && <div className="vacio">Todavía no hay códigos. Crea el primero.</div>}

      <button className="btn btn-primario btn-ancho" style={{ marginTop: 18 }} onClick={() => setEditar("nuevo")}>
        <Icon nombre="percent" size={20} />
        Crear código
      </button>

      {editar && (
        <Editor
          d={editar === "nuevo" ? null : editar}
          onCerrar={() => setEditar(null)}
          onListo={() => {
            setEditar(null);
            void cargar();
          }}
        />
      )}
    </>
  );
}

function Editor({ d, onCerrar, onListo }: { d: Descuento | null; onCerrar: () => void; onListo: () => void }) {
  const avisar = useToast();
  const [codigo, setCodigo] = useState(d?.codigo ?? codigoAleatorio());
  const [pct, setPct] = useState(String(d?.porcentaje ?? 10));
  const [meses, setMeses] = useState(String(d?.meses ?? 1));
  const [hasta, setHasta] = useState(d?.hasta ?? "");
  const [usos, setUsos] = useState(d?.usos_max ? String(d.usos_max) : "");
  const [activo, setActivo] = useState(d?.activo ?? true);
  const [notas, setNotas] = useState(d?.notas ?? "");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault();
    setOcupado(true);
    setError("");
    const { error: err } = await supabase.rpc("admin_guardar_descuento", {
      p_id: d?.id ?? null,
      p_codigo: codigo,
      p_porcentaje: Math.round(Number(pct)),
      p_meses: Math.round(Number(meses)),
      p_desde: d?.desde ?? hoyChile(),
      p_hasta: hasta || null,
      p_usos_max: usos ? Math.round(Number(usos)) : null,
      p_activo: activo,
      p_notas: notas,
    });
    setOcupado(false);
    if (err) return setError(err.message);
    avisar(d ? "Código actualizado" : "Código creado");
    onListo();
  };

  return (
    <Hoja titulo={d ? "Editar código" : "Nuevo código"} onCerrar={onCerrar}>
      <form className="form-hoja" onSubmit={guardar}>
        <label className="campo">
          <span>Código</span>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} maxLength={20} required />
        </label>
        <button type="button" className="btn btn-borde btn-chico" onClick={() => setCodigo(codigoAleatorio())}>
          Generar código al azar
        </button>
        <div className="fila-dos">
          <label className="campo">
            <span>Descuento (%)</span>
            <input type="number" inputMode="numeric" min={1} max={100} value={pct} onChange={(e) => setPct(e.target.value)} required />
          </label>
          <label className="campo">
            <span>Se aplica a (meses)</span>
            <input type="number" inputMode="numeric" min={1} max={24} value={meses} onChange={(e) => setMeses(e.target.value)} required />
          </label>
        </div>
        <div className="fila-dos">
          <label className="campo">
            <span>Vigente hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            <small>Vacío = sin fecha de término</small>
          </label>
          <label className="campo">
            <span>Usos máximos</span>
            <input type="number" inputMode="numeric" min={1} value={usos} onChange={(e) => setUsos(e.target.value)} placeholder="Sin tope" />
            {d && <small>Usado {d.usos} {d.usos === 1 ? "vez" : "veces"}</small>}
          </label>
        </div>
        <label className="campo">
          <span>Nota privada</span>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={200} placeholder="Ej. Promo de lanzamiento" />
        </label>
        <label className="interruptor">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span>
            <b>Código activo</b>
            <small>Si lo pausas, nadie puede usarlo. Las barberías que ya lo tienen aplicado lo conservan.</small>
          </span>
        </label>
        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primario" disabled={ocupado}>
          {ocupado ? "Guardando…" : d ? "Guardar cambios" : "Crear código"}
        </button>
      </form>
    </Hoja>
  );
}
