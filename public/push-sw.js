/* Avisos push. Lo carga el service worker de la app (ver vite.config.ts). */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { titulo: "Fade Studio", cuerpo: event.data ? event.data.text() : "" }; }
  event.waitUntil(
    self.registration.showNotification(d.titulo || "Fade Studio", {
      body: d.cuerpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: d.etiqueta || "fade-studio",
      renotify: true,
      data: { url: d.url || "/panel/reservas" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/panel/reservas", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url.startsWith(self.location.origin) && "focus" in v) {
          return v.focus().then((f) => ("navigate" in f ? f.navigate(destino) : f));
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
