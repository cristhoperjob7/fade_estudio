import { Suspense } from "react";
import { useBarberiaPublica, useSlug } from "../../lib/publico";
import NoEncontrada from "./NoEncontrada";
import PaginaPro from "./PaginaPro";
import Reservar from "./Reservar";
import { PAGINAS_A_MEDIDA } from "./personalizadas";

/** Elige la página de la barbería según su plan: Básico simple, Pro plantilla, VIP a medida. */
export default function Home() {
  const slug = useSlug();
  const { datos, estado } = useBarberiaPublica();
  if (estado === "no_existe") return <NoEncontrada />;
  if (!datos) return <div className="splash" role="status" aria-label="Cargando" />;

  const plan = datos.plan ?? "basico";
  if (plan === "basico") return <Reservar />;
  const aMedida = plan === "vip" ? PAGINAS_A_MEDIDA[slug] : undefined;
  if (aMedida) {
    const Pagina = aMedida;
    return (
      <Suspense fallback={<div className="splash" role="status" aria-label="Cargando" />}>
        <Pagina />
      </Suspense>
    );
  }
  return <PaginaPro />;
}
