import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { claveAleatoria, llamarEquipo } from "../../lib/equipo";
import { formatearTelefono } from "../../lib/whatsapp";
import type { Perfil } from "../../lib/types";
import { ROL_LABEL } from "../../lib/types";
import { useToast } from "../../components/Toast";
import Avatar from "../../components/Avatar";
import Hoja from "../../components/Hoja";
import Icon from "../../components/Icon";

const CAMPOS = "id,rol,nombre,iniciales,correo,telefono,comision_pct,activo,atiende";

export default function Equipo() {
  const { perfil: yo } = useAuth();
  const [gente, setGente] = useState<Perfil[] | null>(null);
  const [error, setError] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [editar, setEditar] = useState<Perfil | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.from("perfiles").select(CAMPOS).order("rol").order("nombre");
    if (err) return setError("No pudimos cargar el equipo. Revisa tu conexión.");
    setError("");
    setGente((data ?? []) as Perfil[]);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <>
      <h1 className="titulo">Equipo</h1>
      <p className="suave">Las personas que trabajan en la barbería y entran a la app.</p>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <ul className="lista equipo">
        {(gente ?? []).map((p) => (
          <li key={p.id}>
            <button className="fila fila-btn" onClick={() => setEditar(p)}>
              <Avatar iniciales={p.iniciales} />
              <span className="fila-cuerpo">
                <b>
                  {p.nombre}
                  {p.id === yo?.id ? " (tú)" : ""}
                </b>
                <small>
                  {ROL_LABEL[p.rol]} · {p.rol === "barbero" || p.atiende ? `${p.comision_pct}% comisión` : "No atiende"}
                </small>
              </span>
              {!p.activo && <span className="chip">Desactivado</span>}
              {p.activo && p.atiende && <span className="chip azul">Atiende</span>}
            </button>
          </li>
        ))}
      </ul>
      {gente && gente.length === 0 && <div className="vacio">Todavía no hay equipo.</div>}

      <button className="btn btn-primario btn-ancho" style={{ marginTop: 18 }} onClick={() => setNuevo(true)}>
        <Icon nombre="users" size={20} />
        Agregar barbero
      </button>

      {nuevo && (
        <NuevoBarbero
          onCerrar={() => setNuevo(false)}
          onListo={() => {
            setNuevo(false);
            void cargar();
          }}
        />
      )}
      {editar && (
        <EditarPersona
          persona={editar}
          esYo={editar.id === yo?.id}
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

function NuevoBarbero({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const avisar = useToast();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [comision, setComision] = useState("50");
  const [clave, setClave] = useState(claveAleatoria());
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [creado, setCreado] = useState(false);

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setError("");
    const motivo = await llamarEquipo({
      accion: "crear",
      nombre,
      correo,
      telefono,
      clave,
      comision_pct: Number(comision),
    });
    setOcupado(false);
    if (motivo) return setError(motivo);
    avisar("Barbero agregado");
    setCreado(true);
  };

  if (creado) {
    return (
      <Hoja titulo="Barbero agregado" onCerrar={onListo}>
        <p className="suave">Pásale estos datos a {nombre.split(" ")[0]}. La clave no se vuelve a mostrar.</p>
        <div className="datos">
          <div>
            <span>Correo</span>
            <b>{correo.toLowerCase()}</b>
          </div>
          <div>
            <span>Clave</span>
            <b className="num">{clave}</b>
          </div>
        </div>
        <button className="btn btn-primario" style={{ marginTop: 14 }} onClick={onListo}>
          Listo
        </button>
      </Hoja>
    );
  }

  return (
    <Hoja titulo="Agregar barbero" onCerrar={onCerrar}>
      <form className="form-hoja" onSubmit={crear}>
        <label className="campo">
          <span>Nombre completo</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={60} autoComplete="off" />
        </label>
        <label className="campo">
          <span>Correo (con este entra a la app)</span>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="off" />
        </label>
        <label className="campo">
          <span>WhatsApp (opcional)</span>
          <input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="9 1234 5678" />
        </label>
        <label className="campo">
          <span>Comisión (%)</span>
          <input type="number" inputMode="numeric" min={0} max={100} value={comision} onChange={(e) => setComision(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Clave inicial</span>
          <input value={clave} onChange={(e) => setClave(e.target.value)} required minLength={8} autoComplete="off" />
          <small>Ya viene una lista. Puede cambiarla después en «Mi cuenta».</small>
        </label>
        <button type="button" className="btn btn-borde btn-chico" onClick={() => setClave(claveAleatoria())}>
          Generar otra clave
        </button>
        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primario" disabled={ocupado}>
          {ocupado ? "Creando…" : "Crear barbero"}
        </button>
      </form>
    </Hoja>
  );
}

function EditarPersona({
  persona,
  esYo,
  onCerrar,
  onListo,
}: {
  persona: Perfil;
  esYo: boolean;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const avisar = useToast();
  const esDueno = persona.rol === "dueno";
  const [nombre, setNombre] = useState(persona.nombre);
  const [telefono, setTelefono] = useState(persona.telefono);
  const [comision, setComision] = useState(String(persona.comision_pct));
  const [atiende, setAtiende] = useState(persona.atiende);
  const [activo, setActivo] = useState(persona.activo);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const pct = Number(comision);
    if (nombre.trim().length < 2) return setError("Escribe el nombre.");
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return setError("La comisión debe estar entre 0 y 100.");
    setOcupado(true);
    setError("");
    const { data, error: err } = await supabase
      .from("perfiles")
      .update({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        comision_pct: pct,
        atiende: esDueno ? atiende : true,
        activo: esDueno ? true : activo,
      })
      .eq("id", persona.id)
      .select("id");
    setOcupado(false);
    if (err || !data || data.length === 0) return setError("No se pudo guardar.");
    avisar("Cambios guardados");
    onListo();
  };

  const cambiarClave = async () => {
    if (clave.length < 8) return setError("La clave debe tener al menos 8 caracteres.");
    setOcupado(true);
    setError("");
    const motivo = await llamarEquipo({ accion: "clave", usuario_id: persona.id, clave });
    setOcupado(false);
    if (motivo) return setError(motivo);
    avisar("Clave cambiada");
    setClave("");
  };

  return (
    <Hoja titulo={persona.nombre} onCerrar={onCerrar}>
      <form className="form-hoja" onSubmit={guardar}>
        {persona.correo && <p className="suave">{persona.correo}</p>}
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={60} />
        </label>
        <label className="campo">
          <span>WhatsApp</span>
          <input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          {telefono && <small>{formatearTelefono(telefono)}</small>}
        </label>
        <label className="campo">
          <span>Comisión (%)</span>
          <input type="number" inputMode="numeric" min={0} max={100} value={comision} onChange={(e) => setComision(e.target.value)} />
        </label>

        {esDueno ? (
          <label className="interruptor">
            <input type="checkbox" checked={atiende} onChange={(e) => setAtiende(e.target.checked)} />
            <span>
              <b>Yo también atiendo clientes</b>
              <small>Si lo activas, apareces como barbero al reservar.</small>
            </span>
          </label>
        ) : (
          <label className="interruptor">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            <span>
              <b>Tiene acceso</b>
              <small>Si lo apagas, no puede entrar ni recibir reservas. Sus citas se conservan.</small>
            </span>
          </label>
        )}

        {error && (
          <p className="aviso error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primario" disabled={ocupado}>
          {ocupado ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      {!esYo && (
        <div className="tarjeta" style={{ marginTop: 16 }}>
          <h2>Nueva clave</h2>
          <label className="campo">
            <span>Clave nueva</span>
            <input value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="off" placeholder="Mínimo 8 caracteres" />
          </label>
          <div className="fila-dos">
            <button type="button" className="btn btn-borde btn-chico" onClick={() => setClave(claveAleatoria())}>
              Generar
            </button>
            <button type="button" className="btn btn-borde btn-chico" disabled={ocupado || !clave} onClick={cambiarClave}>
              Cambiar clave
            </button>
          </div>
        </div>
      )}
    </Hoja>
  );
}
