/**
 * Registers the service worker that vite-plugin-pwa generates (dist/sw.js).
 *
 * This deliberately does NOT use `virtual:pwa-register`: that module imports
 * `workbox-window`, which Lovable's builder cannot resolve ("Could not resolve
 * 'workbox-window'"), so every Lovable build failed and the live site stopped
 * updating. A plain register call is what vite-plugin-pwa itself injected
 * before we turned injection off (injectRegister: null) to keep the service
 * worker out of the native app. With registerType "autoUpdate" the worker
 * calls skipWaiting/clientsClaim, so new versions still take over by themselves.
 */
export function registerServiceWorker(
  nav: Navigator | undefined = typeof navigator === "undefined" ? undefined : navigator,
  isProd: boolean = import.meta.env.PROD,
): void {
  // No service worker in dev (vite doesn't serve sw.js) or where unsupported.
  if (!isProd || !nav || !("serviceWorker" in nav)) return;

  const register = () => {
    nav.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => console.warn("Service worker registration failed:", error));
  };

  // Wait for page load so registration never competes with the app's first requests.
  if (typeof document !== "undefined" && document.readyState !== "complete") {
    window.addEventListener("load", register, { once: true });
  } else {
    register();
  }
}
