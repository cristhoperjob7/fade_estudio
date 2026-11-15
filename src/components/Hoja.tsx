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
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
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
