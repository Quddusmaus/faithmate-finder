import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupGlobalErrorHandlers } from "@/hooks/useErrorLogging";
import { setupFetchInterceptor } from "@/lib/apiErrorLogger";

// Setup global error handlers for uncaught errors and promise rejections
setupGlobalErrorHandlers();

// Setup fetch interceptor to automatically log failed API requests
setupFetchInterceptor();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
