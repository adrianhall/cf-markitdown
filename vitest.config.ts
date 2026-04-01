import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  plugins: [cloudflareTest({
    remoteBindings: false,
    wrangler: {
      configPath: resolve('./wrangler.toml'),   
    },
    miniflare: {
      compatibilityDate: '2024-01-01',
      compatibilityFlags: ['nodejs_compat'],
      kvNamespaces: ['API_KEYS_KV'],
    },
    main: 'src/index.ts'
  })],
  test: {
    globals: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
