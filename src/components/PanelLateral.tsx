import { useEffect } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon";

export type SeccionPanel = { id: string; titulo: string; resumen?: string };

/**
 * Ventana con menú lateral (en PC) o pestañas (en celular). Alto fijo: cada sección muestra poco y no hay que bajar.
 * Solo organiza el espacio: el contenido de cada sección lo pone quien la usa.
 */
export default function PanelLateral({
  titulo,
  cabecera,
  secciones,
  activa,
  onActiva,
  pie,
  onCerrar,
  children,
}: {
  titulo: string;
  cabecera: ReactNode;
  secciones: SeccionPanel[];
  activa: string;
  onActiva: (id: string) => void;
  pie?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  return (
    <div
      className="pl-fondo"
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).dataset.ini = e.target === e.currentTarget ? "1" : "";
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && e.currentTarget.dataset.ini === "1") onCerrar();
      }}
    >
      <div className="pl" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="pl-cab">
          <div className="pl-cab-in">{cabecera}</div>
          <button className="icono-btn" aria-label="Cerrar" onClick={onCerrar}>
            <Icon nombre="close" />
          </button>
        </div>
        <div className="pl-cols">
          <nav className="pl-menu" role="tablist" aria-label="Secciones">
            {secciones.map((s) => (
              <button key={s.id} role="tab" aria-selected={activa === s.id} className={`pl-it${activa === s.id ? " on" : ""}`} onClick={() => onActiva(s.id)}>
                <b>{s.titulo}</b>
                {s.resumen && <small>{s.resumen}</small>}
              </button>
            ))}
          </nav>
          <section className="pl-main" role="tabpanel" key={activa}>
            {children}
          </section>
        </div>
        {pie && <div className="pl-pie">{pie}</div>}
      </div>
    </div>
  );
}
