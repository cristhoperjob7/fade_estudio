import { useEffect } from "react";
import type { ReactNode } from "react";
import Icon from "./Icon";

/** Panel que sube desde abajo (en celular) o aparece al centro (en PC). */
export default function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  return (
    <div
      className="hoja-fondo"
      onMouseDown={(e) => {
        // Solo cierra si el clic EMPIEZA y TERMINA en el fondo (así no se cierra al seleccionar texto)
        (e.currentTarget as HTMLElement).dataset.ini = e.target === e.currentTarget ? "1" : "";
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && e.currentTarget.dataset.ini === "1") onCerrar();
      }}
    >
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="hoja-cab">
          <h2>{titulo}</h2>
          <button className="icono-btn" aria-label="Cerrar" onClick={onCerrar}>
            <Icon nombre="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
