/// <reference types="@cloudflare/workers-types" />

declare global {
  interface Env {
    AI: Ai;
    API_KEYS_KV: KVNamespace;
    JWT_SIGNING_KEY?: string;
    LOG_LEVEL?: string;
  }
}

export interface Logger {
  log(level: string, message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

export interface ConvertRequestContext {
  env: Env;
  logger: Logger;
  requestId: string;
}
