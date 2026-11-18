import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { hoyChile } from "../../lib/fecha";
import { useToast } from "../../components/Toast";
import PanelLateral from "../../components/PanelLateral";
import { clp } from "../../lib/dinero";
import { usePlanes } from "../../lib/planes";
import "../../styles/panel-lateral.css";
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

const MESES_RAPIDOS = [1, 3, 6, 12];

function fechaLarga(f: string): string {
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a}`;
}

function Editor({ d, onCerrar, onListo }: { d: Descuento | null; onCerrar: () => void; onListo: () => void }) {
  const avisar = useToast();
  const planes = usePlanes();
  const [sec, setSec] = useState("codigo");
  const [codigo, setCodigo] = useState(d?.codigo ?? codigoAleatorio());
  const [pct, setPct] = useState(String(d?.porcentaje ?? 10));
  const [meses, setMeses] = useState(String(d?.meses ?? 1));
  const [otroMes, setOtroMes] = useState(d ? !MESES_RAPIDOS.includes(d.meses) : false);
  const [limitaFecha, setLimitaFecha] = useState(!!d?.hasta);
  const [hasta, setHasta] = useState(d?.hasta ?? "");
  const [limitaUsos, setLimitaUsos] = useState(!!d?.usos_max);
  const [usos, setUsos] = useState(d?.usos_max ? String(d.usos_max) : "");
  const [activo, setActivo] = useState(d?.activo ?? true);
  const [notas, setNotas] = useState(d?.notas ?? "");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const n = Math.round(Number(pct));
  const m = Math.round(Number(meses));
  const base = planes.find((p) => p.clave === "pro")?.precio_mensual ?? 0;
  const conDescuento = Math.round((base * (100 - (Number.isFinite(n) ? n : 0))) / 100);

  const guardar = async () => {
    setError("");
    if (!/^[A-Z0-9-]{3,20}$/.test(codigo)) {
      setSec("codigo");
      return setError("El código debe tener de 3 a 20 letras, números o guiones.");
    }
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      setSec("descuento");
      return setError("El descuento debe ser entre 1% y 100%.");
    }
    if (!Number.isFinite(m) || m < 1 || m > 24) {
      setSec("descuento");
      return setError("Los meses deben ser entre 1 y 24.");
    }
    if (limitaFecha && !hasta) {
      setSec("vigencia");
      return setError("Elige la fecha límite o marca «Sin fecha límite».");
    }
    const u = Math.round(Number(usos));
    if (limitaUsos && (!Number.isFinite(u) || u < 1)) {
      setSec("vigencia");
      return setError("Escribe cuántas veces se puede usar, o marca «Usos ilimitados».");
    }
    setOcupado(true);
    const { error: err } = await supabase.rpc("admin_guardar_descuento", {
      p_id: d?.id ?? null,
      p_codigo: codigo,
      p_porcentaje: n,
      p_meses: m,
      p_desde: d?.desde ?? hoyChile(),
      p_hasta: limitaFecha ? hasta : null,
      p_usos_max: limitaUsos ? u : null,
      p_activo: activo,
      p_notas: notas,
    });
    setOcupado(false);
    if (err) return setError(err.message);
    avisar(d ? "Código actualizado" : "Código creado");
    onListo();
  };

  const eliminar = async () => {
    if (!d) return;
    setOcupado(true);
    const { error: err } = await supabase.rpc("admin_eliminar_descuento", { p_id: d.id });
    setOcupado(false);
    if (err) {
      setBorrando(false);
      return setError(err.message.includes("admin_eliminar_descuento") ? "Falta ejecutar paso26-eliminar-descuento.sql en Supabase." : err.message);
    }
    avisar("Código eliminado");
    onListo();
  };

  const secciones = [
    { id: "codigo", titulo: "Código", resumen: codigo || "Sin código" },
    { id: "descuento", titulo: "Descuento", resumen: `${Number.isFinite(n) ? n : 0}% · durante ${Number.isFinite(m) ? m : 0} ${m === 1 ? "mes" : "meses"}` },
    { id: "vigencia", titulo: "Vigencia", resumen: `${limitaFecha && hasta ? `Hasta ${fechaLarga(hasta)}` : "Sin fecha límite"} · ${limitaUsos && usos ? `${usos} usos` : "usos ilimitados"}` },
    { id: "estado", titulo: "Estado y nota", resumen: `${activo ? "Activo" : "Pausado"}${notas ? ` · ${notas}` : ""}` },
  ];

  return (
    <PanelLateral
      titulo={d ? "Editar código" : "Nuevo código"}
      cabecera={<h2>{d ? `Editar código · ${d.codigo}` : "Nuevo código"}</h2>}
      secciones={secciones}
      activa={sec}
      onActiva={setSec}
      onCerrar={onCerrar}
      pie={
        borrando ? (
          <>
            <span className="pl-nota" role="alert">
              ¿Eliminar <b>{d?.codigo}</b>? {d && d.usos > 0 ? `Ya se usó ${d.usos} ${d.usos === 1 ? "vez" : "veces"}: ` : ""}las barberías que ya lo tienen aplicado lo conservan.
            </span>
            <button className="btn btn-borde btn-chico" onClick={() => setBorrando(false)} disabled={ocupado}>
              Cancelar
            </button>
            <button className="pl-peligro" onClick={() => void eliminar()} disabled={ocupado}>
              {ocupado ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </>
        ) : (
          <>
            {d && (
              <button className="btn btn-peligro btn-chico" onClick={() => setBorrando(true)} disabled={ocupado}>
                <Icon nombre="trash" size={18} /> Eliminar
              </button>
            )}
            <span className="pl-nota">{error ? <span style={{ color: "var(--bad)" }} role="alert">{error}</span> : "Cada sección se guarda con el botón."}</span>
            <button className="btn btn-primario btn-chico" onClick={() => void guardar()} disabled={ocupado}>
              {ocupado ? "Guardando…" : d ? "Guardar cambios" : "Crear código"}
            </button>
          </>
        )
      }
    >
      {sec === "codigo" && (
        <>
          <div>
            <h3 className="pl-h">Código</h3>
            <p className="pl-exp">Es lo que el cliente escribe al pedir su plan. Solo letras, números y guiones.</p>
          </div>
          <label className="campo">
            <span>Código</span>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} maxLength={20} />
          </label>
          <button type="button" className="btn btn-borde btn-chico" style={{ justifySelf: "start" }} onClick={() => setCodigo(codigoAleatorio())}>
            Generar código al azar
          </button>
        </>
      )}

      {sec === "descuento" && (
        <>
          <div>
            <h3 className="pl-h">Descuento</h3>
            <p className="pl-exp">Cuánto se rebaja el precio del plan y por cuánto tiempo paga el cliente ese precio.</p>
          </div>
          <div className="pl-pct">
            <label>
              <input type="number" inputMode="numeric" min={1} max={100} value={pct} onChange={(e) => setPct(e.target.value)} aria-label="Porcentaje de descuento" />
              <span>%</span>
            </label>
            <span className="pl-exp">de descuento sobre el precio del plan</span>
          </div>
          <div>
            <div className="pl-lab" style={{ marginBottom: 8 }}>¿Por cuánto tiempo paga el cliente ese precio?</div>
            <div className="pl-opciones">
              {MESES_RAPIDOS.map((x) => (
                <button key={x} type="button" className={`pl-op${!otroMes && m === x ? " on" : ""}`} onClick={() => { setOtroMes(false); setMeses(String(x)); }}>
                  {x} {x === 1 ? "mes" : "meses"}
                </button>
              ))}
              <button type="button" className={`pl-op${otroMes ? " on" : ""}`} onClick={() => setOtroMes(true)}>
                Otro…
              </button>
            </div>
            {otroMes && (
              <label className="campo" style={{ marginTop: 10, maxWidth: 200 }}>
                <span>Meses (1 a 24)</span>
                <input type="number" inputMode="numeric" min={1} max={24} value={meses} onChange={(e) => setMeses(e.target.value)} />
              </label>
            )}
          </div>
          {base > 0 && Number.isFinite(n) && n >= 1 && n <= 100 && (
            <div className="pl-caja oro" aria-live="polite">
              <span className="pl-lab" style={{ color: "#d8c9a0" }}>Así lo verá el cliente · plan Pro</span>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <s style={{ color: "var(--mut)" }}>{clp(base)}</s>
                <b style={{ fontSize: 26, color: "var(--oro)" }}>{clp(conDescuento)}</b>
                <span className="pl-exp">/mes</span>
              </div>
              <span style={{ color: "#8fe0bd", fontSize: 13.5 }}>
                Ahorra {clp(base - conDescuento)} al mes{Number.isFinite(m) && m > 0 ? ` por ${m} ${m === 1 ? "mes" : "meses"}` : ""}
              </span>
            </div>
          )}
        </>
      )}

      {sec === "vigencia" && (
        <>
          <div>
            <h3 className="pl-h">¿Hasta cuándo se puede usar el código?</h3>
            <p className="pl-exp">Esto es solo para <b>poder escribirlo</b>. No cambia cuánto dura el descuento para quien ya lo usó.</p>
          </div>
          <div className="pl-seg" role="radiogroup" aria-label="Fecha límite">
            <button type="button" role="radio" aria-checked={!limitaFecha} className={!limitaFecha ? "on" : ""} onClick={() => setLimitaFecha(false)}>
              Sin fecha límite
            </button>
            <button type="button" role="radio" aria-checked={limitaFecha} className={limitaFecha ? "on" : ""} onClick={() => setLimitaFecha(true)}>
              Hasta una fecha
            </button>
          </div>
          {limitaFecha && (
            <label className="campo">
              <span>Último día en que se puede usar</span>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              <small>Después de esa fecha nadie puede ingresarlo. Quienes ya lo usaron lo conservan.</small>
            </label>
          )}
          <div className="pl-lab" style={{ marginTop: 4 }}>Cantidad de usos</div>
          <div className="pl-seg" role="radiogroup" aria-label="Usos">
            <button type="button" role="radio" aria-checked={!limitaUsos} className={!limitaUsos ? "on" : ""} onClick={() => setLimitaUsos(false)}>
              Usos ilimitados
            </button>
            <button type="button" role="radio" aria-checked={limitaUsos} className={limitaUsos ? "on" : ""} onClick={() => setLimitaUsos(true)}>
              Límite de usos
            </button>
          </div>
          {limitaUsos && (
            <label className="campo">
              <span>Usos máximos</span>
              <input type="number" inputMode="numeric" min={1} value={usos} onChange={(e) => setUsos(e.target.value)} placeholder="Ej. 20" />
              {d && <small>Usado {d.usos} {d.usos === 1 ? "vez" : "veces"}</small>}
            </label>
          )}
        </>
      )}

      {sec === "estado" && (
        <>
          <div>
            <h3 className="pl-h">Estado y nota</h3>
          </div>
          <label className="pl-sw">
            <span>
              <b>Código activo</b>
              <small>Si lo pausas, nadie nuevo puede usarlo. Las barberías que ya lo tienen lo conservan.</small>
            </span>
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} aria-label="Código activo" />
          </label>
          <label className="campo">
            <span>Nota privada (solo tú la ves)</span>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={200} placeholder="Ej. Promo de lanzamiento" />
          </label>
        </>
      )}
    </PanelLateral>
  );
}
