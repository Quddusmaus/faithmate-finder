import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

interface ErrorLogData {
  error_message: string;
  error_stack?: string;
  component_stack?: string;
  url?: string;
  user_agent?: string;
  metadata?: Json;
  severity?: ErrorSeverity;
}

export const logError = async (data: ErrorLogData): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const errorLog = {
      user_id: user?.id || null,
      error_message: data.error_message,
      error_stack: data.error_stack || null,
      component_stack: data.component_stack || null,
      url: data.url || window.location.href,
      user_agent: data.user_agent || navigator.userAgent,
      metadata: data.metadata || {},
      severity: data.severity || "error",
    };

    const { error } = await supabase
      .from("error_logs")
      .insert([errorLog]);

    if (error) {
      console.error("Failed to log error to database:", error);
    }
  } catch (err) {
    console.error("Error logging failed:", err);
  }
};

export const logErrorFromException = async (
  error: Error,
  componentStack?: string,
  severity: ErrorSeverity = "error"
): Promise<void> => {
  await logError({
    error_message: error.message,
    error_stack: error.stack,
    component_stack: componentStack,
    severity,
  });
};

// Global error handler for uncaught errors
export const setupGlobalErrorHandlers = (): void => {
  // Handle uncaught errors
  window.addEventListener("error", (event) => {
    logError({
      error_message: event.message,
      error_stack: event.error?.stack,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      severity: "critical",
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    logError({
      error_message: error?.message || String(error),
      error_stack: error?.stack,
      metadata: {
        type: "unhandled_promise_rejection",
      },
      severity: "critical",
    });
  });
};

// Hook for manual error logging
export const useErrorLogging = () => {
  const log = (
    message: string,
    severity: ErrorSeverity = "error",
    metadata?: Json
  ) => {
    logError({
      error_message: message,
      severity,
      metadata,
    });
  };

  const logException = (error: Error, severity: ErrorSeverity = "error") => {
    logErrorFromException(error, undefined, severity);
  };

  return { log, logException, logError };
};
