import SelectorComuna from "./SelectorComuna";
import { soloDosDigitos, soloOchoDigitos, validarCelular, validarEdad, validarNombre, validarObligatorio } from "../lib/validacion";
import type { MiPerfil } from "../lib/perfil";
import "../styles/panel-lateral.css";
import "../styles/datos-perfil.css";

export type ValoresDatos = { nombre: string; apellidos: string; celular: string; edad: string; sexo: string; region: string; comuna: string };
export type ErroresDatos = Partial<Record<keyof ValoresDatos, string>>;

/** Pasa lo guardado a lo que se escribe en el formulario (celular = solo los 8 números después del +569). */
export function valoresDesde(d: MiPerfil | null): ValoresDatos {
  const tel = (d?.telefono ?? "").replace(/\D/g, "");
  return {
    nombre: d?.nombre ?? "",
    apellidos: d?.apellidos ?? "",
    celular: /^569\d{8}$/.test(tel) ? tel.slice(3) : "",
    edad: d?.edad && d.edad >= 16 && d.edad <= 90 ? String(d.edad) : "",
    sexo: d?.sexo ?? "",
    region: d?.region ?? "",
    comuna: d?.comuna ?? "",
  };
}

/** Las mismas reglas del formulario de contratar (sin la restricción de dominios de correo). */
export function validarDatos(v: ValoresDatos): ErroresDatos {
  const e: ErroresDatos = {
    nombre: validarNombre(v.nombre, "tu nombre"),
    apellidos: validarNombre(v.apellidos, "tu apellido"),
    celular: validarCelular(v.celular),
    edad: validarEdad(v.edad),
    sexo: validarObligatorio(v.sexo, "Elige masculino o femenino."),
    region: validarObligatorio(v.region, "Elige tu región."),
    comuna: validarObligatorio(v.comuna, "Elige tu comuna."),
  };
  for (const k of Object.keys(e) as (keyof ValoresDatos)[]) if (!e[k]) delete e[k];
  return e;
}

/** Formulario de datos personales: lo usan «Mi perfil» y la pantalla obligatoria al entrar. */
export default function FormularioDatos({
  v,
  onCambio,
  errores,
  correo,
}: {
  v: ValoresDatos;
  onCambio: (v: ValoresDatos) => void;
  errores: ErroresDatos;
  correo?: string;
}) {
  const poner = (k: keyof ValoresDatos, valor: string) => onCambio({ ...v, [k]: valor });
  const msg = (k: keyof ValoresDatos) => (errores[k] ? <small className="dp-error" role="alert">{errores[k]}</small> : null);
  const mal = (k: keyof ValoresDatos) => (errores[k] ? true : undefined);
  return (
    <div className="dp">
      <div className="dp-par">
        <label className="campo">
          <span>Nombre</span>
          <input value={v.nombre} onChange={(e) => poner("nombre", e.target.value)} maxLength={40} autoComplete="given-name" aria-invalid={mal("nombre")} />
          {msg("nombre")}
        </label>
        <label className="campo">
          <span>Apellido</span>
          <input value={v.apellidos} onChange={(e) => poner("apellidos", e.target.value)} maxLength={40} autoComplete="family-name" aria-invalid={mal("apellidos")} />
          {msg("apellidos")}
        </label>
      </div>
      <div className="dp-par">
        <label className="campo">
          <span>Celular</span>
          <span className="dp-cel">
            <i>+569</i>
            <input value={v.celular} onChange={(e) => poner("celular", soloOchoDigitos(e.target.value))} inputMode="numeric" placeholder="12345678" autoComplete="tel-national" aria-invalid={mal("celular")} />
          </span>
          {msg("celular")}
        </label>
        <label className="campo">
          <span>Edad</span>
          <input value={v.edad} onChange={(e) => poner("edad", soloDosDigitos(e.target.value))} inputMode="numeric" placeholder="Ej. 28" maxLength={4} autoComplete="off" aria-invalid={mal("edad")} />
          {msg("edad")}
        </label>
      </div>
      <div className="campo">
        <span>Sexo</span>
        <div className="pl-seg" role="radiogroup" aria-label="Sexo">
          {(["masculino", "femenino"] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={v.sexo === s} className={v.sexo === s ? "on" : ""} onClick={() => poner("sexo", s)}>
              {s === "masculino" ? "Masculino" : "Femenino"}
            </button>
          ))}
        </div>
        {msg("sexo")}
      </div>
      <SelectorComuna region={v.region} comuna={v.comuna} onCambio={(region, comuna) => onCambio({ ...v, region, comuna })} />
      {(errores.region || errores.comuna) && <small className="dp-error" role="alert">{errores.region || errores.comuna}</small>}
      {correo !== undefined && (
        <label className="campo">
          <span>Correo</span>
          <input value={correo} readOnly disabled />
          <small>Es con el que entras; no se cambia aquí.</small>
        </label>
      )}
    </div>
  );
}
