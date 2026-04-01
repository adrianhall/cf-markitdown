# cf-markitdown

A CloudFlare Workers service for converting DOCX, ODT, and PDF documents to Markdown format.

[![CI/CD](https://github.com/adrianhall/cf-markitdown/actions/workflows/ci.yml/badge.svg)](https://github.com/adrianhall/cf-markitdown/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Multiple Format Support**: Convert DOCX, ODT, and PDF files to Markdown
- **AI-Powered**: Leverages CloudFlare Workers AI for accurate text extraction
- **Authentication**: JWT and API Key based authorization
- **Audit Logging**: Comprehensive logging for all conversions
- **Type Safe**: Built with TypeScript for type safety
- **High Performance**: Runs on the global CloudFlare network
- **Production Ready**: CI/CD pipeline, test coverage, and best practices

## API Reference

### Convert Document to Markdown

```http
POST /api/v1/convert
```

Converts a document file to Markdown format.

**Request Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | One of: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.oasis.opendocument.text`, `application/pdf` |
| `Content-Length` | Yes | Size of the file in bytes (max 500MB) |
| `Authorization` | Yes | One of: `Bearer <jwt-token>` or `ApiKey <base64-encoded-key>` |

**Authentication Methods:**

1. **JWT Token**:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **API Key**:
   ```
   Authorization: ApiKey dGVzdC1hcGkta2V5
   ```

**Response:**

- **200 OK**: Returns Markdown text with `Content-Type: text/markdown`
- **400 Bad Request**: Invalid request or conversion failed
- **401 Unauthorized**: Invalid or missing authentication
- **411 Length Required**: Missing Content-Length header
- **413 Payload Too Large**: File exceeds 500MB limit
- **415 Unsupported Media Type**: Invalid Content-Type

**Example:

```bash
curl -X POST \
  https://your-worker.workers.dev/api/v1/convert \
  -H "Content-Type: application/pdf" \
  -H "Content-Length: 1337" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  --data-binary @document.pdf
```

**Success Response**:
```
200 OK
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: text/markdown

# Document Title

This is the converted content...
```

### Health Check

```http
GET /health
```

Returns the health status of the service.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Configuration

### Environment Variables

Set these secrets in CloudFlare Workers:

```bash
# For JWT authentication (optional - if not set, JWT auth is disabled)
wrangler secret put JWT_SIGNING_KEY

# For logging verbosity
wrangler secret put LOG_LEVEL
```

### KV Namespace

API keys are stored in a KV namespace. Set up in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "API_KEYS_KV"
id = "your-kv-namespace-id"
```

To add an API key:

```bash
# Key is base64-encoded in Authorization header
# Store the decoded key in KV with a prefix like "apikey:" for namespacing
wrangler kv:key put --binding API_KEYS_KV "apikey:your-key" "active"
```

### Supported MIME Types

- **DOCX**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **ODT**: `application/vnd.oasis.opendocument.text`
- **PDF**: `application/pdf`

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Wrangler CLI (`pnpm install -g wrangler`)

### Setup

```bash
# Clone the repository
git clone https://github.com/adrianhall/cf-markitdown.git
cd cf-markitdown

# Install dependencies
pnpm install

# Set up local development
wrangler dev src/index.ts
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:coverage

# Linting
pnpm run lint

# Type checking
pnpm run typecheck
```

### Scripts

- `pnpm run dev`: Start development server
- `pnpm run deploy`: Deploy to production
- `pnpm run build`: Build the worker
- `pnpm run lint`: Check code quality
- `pnpm run lint:fix`: Auto-fix linting issues

## Architecture

The service is built with a modular architecture:

```
src/
├── index.ts                 # Main entry point
├── routes/
│   └── convert.ts          # POST /api/v1/convert endpoint
├── middleware/
│   ├── auth.ts             # JWT & API Key validation
│   └── validation.ts       # Request validation
├── services/
│   ├── converter.ts        # AI-powered conversion
│   └── logger.ts           # Structured logging
└── utils/
    ├── errors.ts           # Custom error classes
    └── constants.ts        # MIME types & limits
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all checks pass (`npm run test`, `npm run lint`, `npm run typecheck`)
5. Submit a Pull Request

### Development Guidelines

- TypeScript for type safety
- ESLint for code quality
- 80% minimum test coverage
- Follow existing code style
- Add tests for new features
- Update documentation

**Commit Convention**: Use conventional commits
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for code refactoring
- `test:` for tests

## License

MIT License - see [LICENSE](./LICENSE) file for details.

Copyright (c) 2024 Adrian Hall

## Support

For issues and feature requests:
- Create an [issue](https://github.com/adrianhall/cf-markitdown/issues)
- Check [discussions](https://github.com/adrianhall/cf-markitdown/discussions)

For deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md).
