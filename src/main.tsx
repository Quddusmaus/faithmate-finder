import React from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupGlobalErrorHandlers } from "@/hooks/useErrorLogging";
import { setupFetchInterceptor } from "@/lib/apiErrorLogger";
import { setupNativeDeepLinks } from "@/lib/nativeLinks";
import { setupNativeShell } from "@/lib/nativeShell";
import { registerServiceWorker } from "@/lib/registerServiceWorker";

// Setup global error handlers for uncaught errors and promise rejections
setupGlobalErrorHandlers();


// Setup fetch interceptor to automatically log failed API requests.
setupFetchInterceptor();

if (Capacitor.isNativePlatform()) {
  // Open unityhearts.app links (sign-up confirmation, password reset,
  // notification emails) inside the app.
  setupNativeDeepLinks().catch((error) => console.warn("Deep link setup failed:", error));
  // Status bar text colour and the Android back button.
  setupNativeShell().catch((error) => console.warn("Native shell setup failed:", error));
} else {
  // Offline caching / auto-update service worker: website only. The native app
  // ships its web files inside the app bundle and updates through the stores.
  registerServiceWorker();
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);
