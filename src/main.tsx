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

// Setup global error handlers for uncaught errors and promise rejections
setupGlobalErrorHandlers();


// Setup fetch interceptor to automatically log failed API requests.
setupFetchInterceptor();

// Offline caching / auto-update service worker: website only. The native app
// ships its web files inside the app bundle and updates through the stores.
if (!Capacitor.isNativePlatform()) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch((error) => console.warn("Service worker registration failed:", error));
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
