import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/hooks/useErrorLogging";
import type { Json } from "@/integrations/supabase/types";

interface ApiErrorDetails {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  errorMessage?: string;
  requestBody?: Json;
  responseBody?: Json;
  duration?: number;
}

// Log API errors to the database
export const logApiError = async (details: ApiErrorDetails): Promise<void> => {
  const severity = details.status && details.status >= 500 ? "critical" : "error";
  
  await logError({
    error_message: `API Error: ${details.method} ${details.url} - ${details.status || "Network Error"} ${details.statusText || ""}`.trim(),
    metadata: {
      type: "api_error",
      url: details.url,
      method: details.method,
      status: details.status ?? null,
      statusText: details.statusText ?? null,
      requestBody: details.requestBody ?? null,
      responseBody: details.responseBody ?? null,
      duration: details.duration ?? null,
    },
    severity,
  });
};

// Wrapper for Supabase queries with automatic error logging
export const withErrorLogging = async <T>(
  queryFn: () => Promise<{ data: T | null; error: { message: string; code?: string; details?: string } | null }>,
  context?: { operation: string; table?: string }
): Promise<{ data: T | null; error: { message: string; code?: string; details?: string } | null }> => {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    
    if (result.error) {
      await logError({
        error_message: `Database Error: ${context?.operation || "Query"} on ${context?.table || "unknown"} - ${result.error.message}`,
        metadata: {
          type: "database_error",
          operation: context?.operation,
          table: context?.table,
          errorCode: result.error.code,
          errorDetails: result.error.details,
          duration: Date.now() - startTime,
        },
        severity: "error",
      });
    }
    
    return result;
  } catch (err) {
    const error = err as Error;
    await logError({
      error_message: `Database Exception: ${context?.operation || "Query"} on ${context?.table || "unknown"} - ${error.message}`,
      error_stack: error.stack,
      metadata: {
        type: "database_exception",
        operation: context?.operation,
        table: context?.table,
        duration: Date.now() - startTime,
      },
      severity: "critical",
    });
    
    return { data: null, error: { message: error.message } };
  }
};

// Store original fetch
const originalFetch = window.fetch;

// Track if interceptor is already installed
let interceptorInstalled = false;

// Setup global fetch interceptor for failed requests
export const setupFetchInterceptor = (): void => {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startTime = Date.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || "GET";
    
    try {
      const response = await originalFetch(input, init);
      const duration = Date.now() - startTime;
      
      // Log failed responses (4xx and 5xx status codes)
      // Exclude 401 on auth endpoints (expected for unauthenticated users)
      const isAuthEndpoint = url.includes("/auth/") || url.includes("gotrue");
      const shouldLog = !response.ok && !(response.status === 401 && isAuthEndpoint);
      
      if (shouldLog) {
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        let responseBody: Json = null;
        
        try {
          responseBody = await clonedResponse.json() as Json;
        } catch {
          try {
            responseBody = await clonedResponse.text();
          } catch {
            responseBody = "Unable to parse response body";
          }
        }
        
        // Parse request body if present
        let requestBody: Json = null;
        if (init?.body) {
          try {
            requestBody = typeof init.body === "string" ? JSON.parse(init.body) as Json : String(init.body);
          } catch {
            requestBody = String(init.body);
          }
        }
        
        await logApiError({
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          requestBody,
          responseBody,
          duration,
        });
      }
      
      return response;
    } catch (err) {
      const error = err as Error;
      const duration = Date.now() - startTime;
      
      // Log network errors (failed to fetch, CORS issues, etc.)
      await logApiError({
        url,
        method,
        errorMessage: error.message,
        duration,
      });
      
      throw err;
    }
  };
};

// Utility to wrap edge function calls with error logging
export const callEdgeFunction = async <T = unknown>(
  functionName: string,
  options?: {
    body?: Record<string, Json>;
    method?: string;
  }
): Promise<{ data: T | null; error: Error | null }> => {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body: options?.body,
    });
    
    if (error) {
      await logError({
        error_message: `Edge Function Error: ${functionName} - ${error.message}`,
        metadata: {
          type: "edge_function_error",
          functionName,
          requestBody: options?.body ? JSON.stringify(options.body) : null,
          duration: Date.now() - startTime,
        },
        severity: "error",
      });
      
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    const error = err as Error;
    
    await logError({
      error_message: `Edge Function Exception: ${functionName} - ${error.message}`,
      error_stack: error.stack,
      metadata: {
        type: "edge_function_exception",
        functionName,
        requestBody: options?.body ? JSON.stringify(options.body) : null,
        duration: Date.now() - startTime,
      },
      severity: "critical",
    });
    
    return { data: null, error };
  }
};
