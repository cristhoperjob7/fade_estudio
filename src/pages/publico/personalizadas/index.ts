import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

/**
 * Páginas a medida del plan VIP. Una por barbería, identificada por su dirección (slug).
 * Para sumar una nueva: crear el archivo en esta carpeta y agregarlo aquí.
 * Una barbería VIP que no esté en esta lista usa la plantilla Pro.
 */
export const PAGINAS_A_MEDIDA: Record<string, LazyExoticComponent<ComponentType>> = {
  "barber-studio-593": lazy(() => import("./Barber593")),
};
