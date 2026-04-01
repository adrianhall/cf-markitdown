// App-level environment bindings
export interface AppBindings {
  AI: Ai;
  API_KEYS_KV: KVNamespace;
  JWT_SIGNING_KEY: string;
  LOG_LEVEL?: string;
  ENVIRONMENT?: string;
  // Index signature to allow additional bindings
  [key: string]: unknown;
}

// Variables available through context
export interface AppVariables {
  validatedMediaType: string;
  validatedContentLength: number;
}

// Type for allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.oasis.opendocument.text', // ODT
  'application/pdf' // PDF
] as const;

export type MimeType = typeof ALLOWED_MIME_TYPES[number];

// Response types
export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface ServiceInfoResponse {
  service: string;
  version: string;
  description: string;
}

export interface ErrorResponse {
  error: string;
}

// AI response types
export interface AiDigestorToMarkdownOutput {
  data?: string;
}
