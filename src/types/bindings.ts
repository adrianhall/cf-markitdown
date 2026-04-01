/**
 * App-level environment bindings for Cloudflare Workers
 * Contains all environment variables and bindings available in the worker context
 */
export interface AppBindings {
  /** Cloudflare AI binding for document conversion operations */
  AI: Ai;
  /** KV namespace for storing and validating API keys */
  API_KEYS_KV: KVNamespace;
  /** JWT signing key for validating Bearer tokens */
  JWT_SIGNING_KEY: string;
  /** Minimum log level for filtering logs (debug, info, warn, error) */
  LOG_LEVEL?: string;
  /** Environment identifier (e.g., production, staging, development) */
  ENVIRONMENT?: string;
  /** Index signature to allow additional Cloudflare bindings */
  [key: string]: unknown;
}

/**
 * Variables set on the Hono context for passing validated data between middleware
 */
export interface AppVariables {
  /** Validated MIME type extracted from Content-Type header */
  validatedMediaType: string;
  /** Validated content length from Content-Length header */
  validatedContentLength: number;
}

/**
 * Array of supported MIME types for document conversion
 */
export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.oasis.opendocument.text', // ODT
  'application/pdf' // PDF
] as const;

/**
 * Union type of allowed MIME types
 */
export type MimeType = typeof ALLOWED_MIME_TYPES[number];

/**
 * Response structure for health check endpoint
 */
export interface HealthResponse {
  /** Service health status */
  status: string;
  /** ISO 8601 timestamp of health check */
  timestamp: string;
}

/**
 * Response structure for service information
 */
export interface ServiceInfoResponse {
  /** Service name */
  service: string;
  /** Service version */
  version: string;
  /** Service description */
  description: string;
}

/**
 * Response structure for error responses
 */
export interface ErrorResponse {
  /** Error message describing what went wrong */
  error: string;
}

/**
 * Output type from AI toMarkdown conversion
 */
export interface AiDigestorToMarkdownOutput {
  /** Converted markdown data */
  data?: string;
}
