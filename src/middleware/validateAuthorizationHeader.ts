import type { Context } from "hono";
import { jwtVerify } from "jose";
import type { AppBindings, AppVariables } from "../types/bindings";

/**
 * @description Express-style middleware that validates Authorization header for JWT or API key authentication
 * Supports two authentication methods: Bearer JWT tokens and ApiKey authentication
 * @param {Context<{ Bindings: AppBindings; Variables: AppVariables }>} c - Hono context with app bindings and variables
 * @param {() => Promise<void>} next - Function to call next middleware in chain
 * @returns {Promise<Response | void>} Response if validation fails, otherwise void to continue processing
 */
export async function validateAuthorizationHeader(
  c: Context<{ Bindings: AppBindings; Variables: AppVariables }>,
  next: () => Promise<void>,
): Promise<Response | void> {
  // Validate Authorization header
  const authHeader: string | undefined = c.req.header("authorization");
  if (!authHeader) {
    return c.json({ error: "Missing authorization header" }, { status: 401 });
  }

  // Split the Authorization header into a type and credentials. If there are not
  // two parts separated by a space, the header is malformed and you should return
  // a 400 Bad Request response.
  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    return c.json({ error: "Malformed authorization header" }, { status: 400 });
  }

  const [authType, credentials] = parts;

  // If the Authorization type (the first word) is not Bearer or ApiKey, return a
  // 401 Unauthorized response indicating that the authentication method is not supported.
  if (authType !== "Bearer" && authType !== "ApiKey") {
    return c.json(
      { error: "Unsupported authentication method" },
      { status: 401 },
    );
  }

  // Validate based on the authorization type
  // If authorization type == Bearer:
  if (authType === "Bearer") {
    // get the signing key from environment variable (no signing key means JWT auth is not configured, return 401)
    const signingKey = c.env.JWT_SIGNING_KEY;
    if (!signingKey) {
      return c.json(
        { error: "JWT authentication not configured" },
        { status: 401 },
      );
    }

    // validate the JWT token using the signing key (invalid token means return 401)
    try {
      // Create a TextEncoder to convert the signing key to Uint8Array
      const encoder = new TextEncoder();
      const key = encoder.encode(signingKey);
      
      // Verify the JWT token using jose
      // This will validate the signature, expiration, and other claims
      await jwtVerify(credentials, key);
    } catch {
      return c.json({ error: "Invalid JWT token" }, { status: 401 });
    }
  }

  // If authorization type == ApiKey:
  if (authType === "ApiKey") {
    // decode the API key from base64 (invalid encoding means return 401)
    let apiKey: string;
    try {
      apiKey = atob(credentials);
    } catch {
      return c.json({ error: "Invalid API key encoding" }, { status: 401 });
    }

    // look up the decoded API key in KV (not found means return 401)
    const apiKeyData = await c.env["API_KEYS_KV"].get(apiKey);
    if (!apiKeyData) {
      return c.json({ error: "Invalid API key" }, { status: 401 });
    }
  }

  // If pass, then call next() to continue processing the request in the next handler
  await next();
}
