import { Link } from "react-router-dom";
import { FadeMark } from "./FadeLogo";
import { clp } from "../lib/dinero";
import { useContar } from "../lib/planes";
import type { PlanClave } from "../lib/planes";

/* ---------- Íconos de la portada (trazo simple) ---------- */
export const ICONOS = {
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
  link: '<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  chart: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  crown: '<path d="M3 19h18M4 7l4 4 4-6 4 6 4-4-2 12H6z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 01-12.4 7.4L3 20l1.2-5.4A8.4 8.4 0 1121 11.5z"/>',
  store: '<path d="M3 9l1-5h16l1 5M4 9v11h16V9M9 20v-6h6v6"/>',
  img: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="M21 16l-5-5L5 21"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  star: '<path d="M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  gift: '<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
} as const;
export type Ico = keyof typeof ICONOS;

export function Ic({ n, s = 24, sw = 1.8 }: { n: Ico; s?: number; sw?: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONOS[n] }}
    />
  );
}

/** Precio que cuenta suavemente hasta el nuevo valor. */
export function Monto({ valor, prefijo = "", sufijo = "" }: { valor: number; prefijo?: string; sufijo?: string }) {
  const v = useContar(valor);
  return (
    <>
      {prefijo}
      {clp(v)}
      {sufijo}
    </>
  );
}

/* ---------- Lo que trae cada plan ---------- */
export type Hab = { i: Ico; t: string };
export type PlanDef = {
  clave: PlanClave;
  rareza: string;
  lema: string;
  stats: [string, number][];
  incluye: string;
  hab: Hab[];
};
export const PLANES_DEF: PlanDef[] = [
  {
    clave: "basico",
    rareza: "COMÚN",
    lema: "Para partir ordenado",
    stats: [["Barberos", 2], ["Sucursales", 1], ["Atención", 1]],
    incluye: "",
    hab: [
      { i: "cal", t: "Reservas con tu link" },
      { i: "cash", t: "Pago con comprobante" },
      { i: "users", t: "Agenda por barbero" },
    ],
  },
  {
    clave: "pro",
    rareza: "LEGENDARIO",
    lema: "Para barberías con equipo",
    stats: [["Barberos", 4], ["Sucursales", 1], ["Atención", 3]],
    incluye: "Incluye todo lo Básico",
    hab: [
      { i: "bell", t: "Avisos al celular" },
      { i: "tag", t: "Promos por día" },
      { i: "chart", t: "Caja y comisiones" },
      { i: "img", t: "Tu logo y colores" },
      { i: "chat", t: "Recordatorios por WhatsApp" },
    ],
  },
  {
    clave: "vip",
    rareza: "ÉPICO",
    lema: "Para marcas con varias sedes",
    stats: [["Barberos", 5], ["Sucursales", 5], ["Atención", 5]],
    incluye: "Incluye todo lo Pro",
    hab: [
      { i: "list", t: "Lista de espera" },
      { i: "gift", t: "Clientes frecuentes y premios" },
      { i: "store", t: "Varias sucursales" },
      { i: "globe", t: "Tu propio dominio" },
    ],
  },
];

/* ---------- Cabecera y pie compartidos ---------- */
export function CabeceraPortada() {
  return (
    <>
      <div className="fs-poste" aria-hidden="true" />
      <header className="fs-cab">
        <Link to="/fade-studio" className="fs-marca" aria-label="Fade Studio">
          <FadeMark size={32} />
          <span>Fade Studio</span>
        </Link>
        <Link to="/login" className="fs-ingresar">
          Ingresar
        </Link>
      </header>
    </>
  );
}

export function PiePortada() {
  return (
    <footer className="fs-pie">
      <span className="fs-marca">
        <FadeMark size={22} />
        <span>Fade Studio</span>
      </span>
      <Link to="/login">Ingresar</Link>
    </footer>
  );
}
