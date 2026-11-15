import { supabase } from "./supabase";

const CLAVE_PUBLICA = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? "";

export type EstadoPush = "no-soportado" | "ios-instalar" | "sin-clave" | "bloqueado" | "inactivo" | "activo";

const esIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function base64ABuffer(texto: string): ArrayBuffer {
  const relleno = "=".repeat((4 - (texto.length % 4)) % 4);
  const bin = atob((texto + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return buf;
}

/** El service worker tarda en estar listo la primera vez; si no llega, avisamos en vez de quedarnos colgados. */
async function registro(): Promise<ServiceWorkerRegistration> {
  const listo = navigator.serviceWorker.ready;
  const limite = new Promise<never>((_, no) =>
    window.setTimeout(() => no(new Error("La app todavía no está lista. Recarga la página y vuelve a intentarlo.")), 8000),
  );
  return Promise.race([listo, limite]);
}

export async function estadoPush(): Promise<EstadoPush> {
  if (esIphone() && !instalada()) return "ios-instalar";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "no-soportado";
  if (!CLAVE_PUBLICA) return "sin-clave";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission === "granted") {
    try {
      const reg = await registro();
      if (await reg.pushManager.getSubscription()) return "activo";
    } catch {
      /* se muestra como inactivo */
    }
  }
  return "inactivo";
}

export async function activarPush(): Promise<void> {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("No diste el permiso para los avisos.");
  const reg = await registro();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ABuffer(CLAVE_PUBLICA) }));
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) throw new Error("Este navegador no entregó los datos de los avisos.");
  const { error } = await supabase
    .from("push_suscripciones")
    .upsert(
      { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, agente: navigator.userAgent.slice(0, 200) },
      { onConflict: "endpoint" },
    );
  if (error) {
    await sub.unsubscribe().catch(() => undefined);
    throw new Error("No pudimos guardar tu celular. ¿Ejecutaste paso04-push.sql?");
  }
}

export async function desactivarPush(): Promise<void> {
  const reg = await registro();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_suscripciones").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

/** Pide a la función que mande un aviso de prueba a los celulares del dueño. */
export async function probarPush(): Promise<number> {
  const { data, error } = await supabase.functions.invoke("notificar-push", { body: { prueba: true } });
  if (error) throw new Error("No pudimos llamar a la función. ¿Ya la subiste a Supabase? (ver README)");
  return (data as { enviados?: number } | null)?.enviados ?? 0;
}
