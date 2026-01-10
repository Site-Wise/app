# WebAuthn Verifier - Cloudflare Worker

A stateless WebAuthn/Passkey verification microservice for Site-Wise.

## Purpose

This worker handles the cryptographic verification of WebAuthn credentials:
- **Registration**: Verifies attestation objects and extracts public keys
- **Authentication**: Verifies assertion signatures against stored public keys

All state management (challenges, credentials) is handled by PocketBase. This worker only performs cryptographic operations.

## Endpoints

### `GET /health`
Health check endpoint (no authentication required).

**Response:**
```json
{ "status": "ok", "timestamp": 1234567890 }
```

### `POST /verify/registration`
Verify a WebAuthn registration response.

**Headers:**
- `X-API-Key: <your-api-key>` (required)

**Request Body:**
```json
{
  "response": { /* RegistrationResponseJSON from browser */ },
  "expectedChallenge": "base64url-encoded-challenge",
  "expectedOrigin": "https://app.sitewise.com",
  "expectedRPID": "sitewise.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "credentialId": "base64url-credential-id",
    "publicKey": "base64url-public-key",
    "counter": 0,
    "credentialDeviceType": "singleDevice",
    "credentialBackedUp": false,
    "aaguid": "authenticator-aaguid"
  }
}
```

### `POST /verify/authentication`
Verify a WebAuthn authentication response.

**Headers:**
- `X-API-Key: <your-api-key>` (required)

**Request Body:**
```json
{
  "response": { /* AuthenticationResponseJSON from browser */ },
  "expectedChallenge": "base64url-encoded-challenge",
  "expectedOrigin": "https://app.sitewise.com",
  "expectedRPID": "sitewise.com",
  "credential": {
    "id": "credential-id-from-response",
    "publicKey": "base64url-stored-public-key",
    "counter": 5
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "newCounter": 6
  }
}
```

## Setup

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
cd external_services/cloudflare-workers/webauthn-verifier
npm install
```

### Configuration

1. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

2. **Set secrets:**
   ```bash
   # API key for PocketBase authentication
   wrangler secret put API_KEY
   # Enter a secure random string (e.g., generate with: openssl rand -base64 32)

   # Allowed origins (comma-separated)
   wrangler secret put ALLOWED_ORIGINS
   # Enter: https://app.sitewise.com,https://sitewise.com,tauri://localhost
   ```

3. **Update wrangler.toml** with your RP ID and name if different.

### Development

```bash
# Run locally
npm run dev

# The worker will be available at http://localhost:8787
```

### Deployment

```bash
# Deploy to production
npm run deploy

# Deploy to development environment
wrangler deploy --env development
```

## Security Considerations

1. **API Key**: Always use a strong, randomly generated API key. Never commit it to version control.

2. **Origin Verification**: The worker verifies that the `expectedOrigin` matches what was sent from the browser. PocketBase should pass the correct origin.

3. **RP ID**: Must match your domain. For subdomains, use the parent domain (e.g., `sitewise.com` for `app.sitewise.com`).

4. **Counter Validation**: The worker checks that the authenticator counter increases to prevent credential cloning attacks.

5. **User Verification**: Registration and authentication both require user verification (biometric/PIN).

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid API key |
| `VERIFICATION_FAILED` | Cryptographic verification failed |
| `VERIFICATION_ERROR` | Error during verification process |
| `COUNTER_ERROR` | Authenticator counter did not increase |
| `INVALID_REQUEST` | Malformed request body |
| `NOT_FOUND` | Unknown endpoint |

## Testing

```bash
# Run tests
npm test

# Test health endpoint
curl https://your-worker.workers.dev/health

# Test with API key (from your local dev server)
curl -X POST http://localhost:8787/verify/registration \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{ ... }'
```

## Integration with PocketBase

PocketBase calls this worker using `$http.send()`:

```javascript
const resp = $http.send({
  url: "https://your-worker.workers.dev/verify/registration",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.WEBAUTHN_VERIFIER_API_KEY
  },
  body: JSON.stringify({
    response: attestationResponse,
    expectedChallenge: storedChallenge,
    expectedOrigin: "https://app.sitewise.com",
    expectedRPID: "sitewise.com"
  })
});

if (resp.statusCode === 200) {
  const result = resp.json;
  if (result.success) {
    // Store result.data.publicKey, result.data.credentialId, etc.
  }
}
```
