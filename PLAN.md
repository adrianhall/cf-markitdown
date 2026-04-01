# CloudFlare Libraries Upgrade Plan

## Objective
Upgrade CloudFlare libraries from outdated versions to:
- wrangler: `3.114.17` → `4.77.0`
- hono: `3.12.12` → `4.12.9`
- vitest-environment-miniflare → `@cloudflare/vitest-pool-workers`
- vitest: `1.6.1` → `4.1.1`

## Requirements
- ✅ No backward compatibility concerns (service not yet deployed)
- ✅ Refactor tests using modern patterns (not just patch)
- ✅ Fix broken tests as part of migration
- ✅ Prefer strict type checking over type inference
- ✅ Use environment variables for KV namespace IDs

---

## Phase 1: Configuration & Environment Setup (15 minutes)

### 1.1 Update .env.example
Add KV namespace IDs as environment variables:

```bash
# Add to .env.example:
# KV Namespace IDs
KV_NAMESPACE_ID=your-kv-namespace-id
KV_PREVIEW_ID=your-preview-kv-namespace-id
KV_PROD_ID=your-production-kv-namespace-id
KV_STAGING_ID=your-staging-kv-namespace-id
```

### 1.2 Update wrangler.toml
Use environment variable substitution for KV namespaces:

```toml
[[kv_namespaces]]
binding = "API_KEYS_KV"
id = "${KV_NAMESPACE_ID}"
preview_id = "${KV_PREVIEW_ID}"

[[env.production.kv_namespaces]]
binding = "API_KEYS_KV"
id = "${KV_PROD_ID}"

[[env.staging.kv_namespaces]]
binding = "API_KEYS_KV"
id = "${KV_STAGING_ID}"
```

### 1.3 Create Type Definitions
Create `src/types/bindings.ts`:

```typescript
export interface AppBindings {
  AI: Ai;
  API_KEYS_KV: KVNamespace;
  JWT_SIGNING_KEY: string;
  LOG_LEVEL?: string;
}

export type AppContext = Context<{ Bindings: AppBindings }>;
```

---

## Phase 2: Package Updates (10 minutes)

### 2.1 package.json Updates

```json
{
  "name": "cf-markitdown",
  "version": "1.0.0",
  "dependencies": {
    "hono": "^4.12.9"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^4.1.1",
    "vitest": "^4.1.1",
    "wrangler": "^4.77.0"
  }
}
```

### 2.2 Install Resulting Dependencies

```bash
pnpm install --frozen-lockfile=false
```

---

## Phase 3: TypeScript Configuration - Strict Mode (5 minutes)

### 3.1 Update tsconfig.json

Enable strictest settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "Bundler",
    "types": [
      "@cloudflare/workers-types",
      "@cloudflare/vitest-pool-workers"
    ],
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "allowJs": false,
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

---

## Phase 4: Hono 4 Source Code Updates (20 minutes)

### 4.1 Update All Imports

Files to update:
- `src/index.ts`
- `src/routes/convert.ts`

Change from:
```typescript
import { Hono, Context } from 'hono';
```

To:
```typescript
import { Hono } from 'hono';
import type { Context } from 'hono';
```

### 4.2 Add Explicit Type Annotations

Example updates:

**src/index.ts:**
```typescript
import type { AppBindings } from './types/bindings';

const app = new Hono<{ Bindings: AppBindings }>();

app.get('/', (c: Context<{ Bindings: AppBindings }>) => {
  return c.json({
    service: 'cf-markitdown',
    version: '1.0.0',
    description: 'CloudFlare Workers service for converting documents to Markdown'
  });
});
```

**src/routes/convert.ts:**
```typescript
import type { AppContext } from '../types/bindings';

app.post('/api/v1/convert', async (c: AppContext) => {
  const logger = new StructuredLogger({ LOG_LEVEL: c.env.LOG_LEVEL });
  const requestId = crypto.randomUUID();
  // ...
});
```

### 4.3 Service Layer Type Updates

**src/services/logger.ts:**
```typescript
interface LogData {
  [key: string]: unknown;
  timestamp: string;
  level: string;
  message: string;
}

export class StructuredLogger {
  private readonly logLevel: string;

  constructor(env?: { LOG_LEVEL?: string }) {
    this.logLevel = env?.LOG_LEVEL ?? 'info';
  }
  // ...
}
```

**src/services/converter.ts:**
```typescript
export async function convertFileToMarkdown(
  ai: Ai,
  fileData: ArrayBuffer,
  contentType: string,
  logger: StructuredLogger,
  requestId: string
): Promise<string> {
  logger.info('Starting file conversion', {
    requestId,
    contentType,
    fileSize: fileData.byteLength
  });

  try {
    const blob: Blob = new Blob([fileData], { type: contentType });
    const result: AiDigestorToMarkdownOutput = await ai.toMarkdown({
      name: 'document',
      blob: blob
    });
  // ...
}
```

---

## Phase 5: Vitest Configuration Update (10 minutes)

### 5.1 Update vitest.config.ts

Replace Miniflare environment with workers pool:

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { resolve } from 'path';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: resolve('./wrangler.toml'),
        },
        miniflare: {
          compatibilityDate: '2024-01-01',
          compatibilityFlags: ['nodejs_compat'],
          kvNamespaces: ['API_KEYS_KV'],
        },
        main: 'src/index.ts',
      },
    },
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
```

---

## Phase 6: Test Migration to @cloudflare/vitest-pool-workers (45 minutes)

### 6.1 Unit Tests - utils/constants.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../src/constants';
import type { MimeType } from '../../src/constants';

describe('Constants', () => {
  it('should export allowed MIME types as const array', () => {
    const expectedMimeTypes: readonly MimeType[] = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'application/pdf'
    ];
    expect(ALLOWED_MIME_TYPES).toEqual(expectedMimeTypes);
  });

  it('should export max file size as 48MB', () => {
    const expectedSize: number = 48 * 1024 * 1024;
    expect(MAX_FILE_SIZE).toBe(expectedSize);
  });
});
```

### 6.2 Service Tests - tests/utils/errors.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { ValidationError } from '../../src/errors';

describe('ValidationError', () => {
  it('should create error with default status code', () => {
    const errorMessage: string = 'Invalid input';
    const error: ValidationError = new ValidationError(errorMessage);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(errorMessage);
    expect(error.statusCode).toBe(400);
  });

  it('should create error with custom status code', () => {
    const error: ValidationError = new ValidationError('Unauthorized', 401);
    expect(error.statusCode).toBe(401);
  });

  it('should be throwable', () => {
    expect(() => {
      throw new ValidationError('Test error');
    }).toThrow(ValidationError);
  });
});
```

### 6.3 Service Tests - tests/services/logger.test.ts
```typescript
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { StructuredLogger } from '../../src/services/logger';

describe('StructuredLogger', () => {
  let consoleLogSpy: MockInstance;
  let consoleErrorSpy: MockInstance;
  let consoleWarnSpy: MockInstance;
  let consoleDebugSpy: MockInstance;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages with timestamp and level', () => {
    const logger: StructuredLogger = new StructuredLogger();
    logger.info('test message');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const output: string = consoleLogSpy.mock.calls[0][0] as string;
    const parsedLog = JSON.parse(output);
    expect(parsedLog.level).toBe('info');
    expect(parsedLog.message).toBe('test message');
    expect(parsedLog.timestamp).toBeDefined();
  });
});
```

### 6.4 Service Tests - tests/services/converter.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertFileToMarkdown } from '../../src/services/converter';
import { StructuredLogger } from '../../src/services/logger';
import { ValidationError } from '../../src/errors';
import type { Ai } from '@cloudflare/workers-types';

describe('convertFileToMarkdown', () => {
  let mockAi: Ai;
  let mockLogger: StructuredLogger;

  beforeEach(() => {
    mockAi = {
      toMarkdown: vi.fn().mockResolvedValue({ data: '# Converted Markdown\n\nContent here' })
    } as unknown as Ai;
    mockLogger = new StructuredLogger();
  });

  it('should successfully convert file using AI service', async () => {
    const fileData: ArrayBuffer = new ArrayBuffer(1024);
    const result: string = await convertFileToMarkdown(
      mockAi,
      fileData,
      'application/pdf',
      mockLogger,
      'test-123'
    );

    expect(mockAi.toMarkdown).toHaveBeenCalledOnce();
    expect(result).toBe('# Converted Markdown\n\nContent here');
  });
});
```

### 6.5 Integration Tests - tests/integration/convert.test.ts (Most Complex)
```typescript
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import app from '../../src/index';
import type { AppBindings } from '../../src/types/bindings';
import type { KVNamespace } from '@cloudflare/workers-types';

describe('POST /api/v1/convert', () => {
  let mockBindings: AppBindings;

  beforeEach(() => {
    mockBindings = {
      AI: {
        toMarkdown: vi.fn().mockResolvedValue({ data: '# Converted\n\nContent' })
      } as any,
      API_KEYS_KV: {
        get: vi.fn().mockResolvedValue('valid-key'),
        put: vi.fn() as Mock,
        delete: vi.fn() as Mock,
        list: vi.fn() as Mock
      } as unknown as KVNamespace,
      JWT_SIGNING_KEY: 'test-secret-key',
      LOG_LEVEL: 'debug'
    };
  });

  const createMockFile = (content: string): ArrayBuffer => {
    const encoder: TextEncoder = new TextEncoder();
    return encoder.encode(content).buffer;
  };

  it('should convert PDF with valid JWT', async () => {
    const token: string = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const request: Request = new Request('http://localhost/api/v1/convert', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/pdf',
        'Content-Length': '1000'
      },
      body: createMockFile('test pdf content')
    });

    const response: Response = await app.fetch(request, mockBindings);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('# Converted');
  });
});
```

---

## Phase 7: Verification & Testing (15 minutes)

```bash
# Install dependencies
pnpm install --frozen-lockfile=false

# Run type checking
pnpm run typecheck

# Execute tests
pnpm run test

# Development server
pnpm run dev

# Build for production
pnpm run build
```

---

## Risk Assessment

| Area | Risk Level | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| Test Migration | **High** | **High** | Comprehensive refactoring with new patterns |
| Hono 4 Type System | Medium | Medium | Explicit typing catches errors early |
| Wrangler 4 Breaking Changes | Medium | High | Test locally and review release notes |
| Dependency Resolution | Low | Medium | Use --frozen-lockfile=false flag |
| Build Process | Low | Low | Revert if issues detected |

---

## Deliverables

- ✅ All packages updated to target versions
- ✅ Strict TypeScript configuration enabled
- ✅ All source files refactored with explicit types
- ✅ All test files refactored with new patterns
- ✅ Tests passing
- ✅ Build successful
- ✅ Type checks passing
- ✅ Environment variable configuration for KV namespaces
- ✅ Modern @cloudflare/vitest-pool-workers implementation
- ✅ Comprehensive error handling with strong typing

---

## Implementation Order

1. Update environment configuration
2. Update package.json
3. Update TypeScript configuration
4. Update vitest configuration
5. Create type definitions
6. Refactor source files
7. Refactor test files
8. Run verification
9. Fix any issues
