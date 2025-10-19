# Development HTTPS Certificates

This directory contains self-signed SSL certificates for HTTPS in development.

## Generating Certificates

To generate the certificates, run:

```bash
# macOS/Linux
npm run generate-certs

# Or manually with openssl
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```

## Security Note

These certificates are **self-signed** and for **local development only**. Your browser will show a security warning - this is normal. Click "Advanced" and proceed to localhost.

**DO NOT** use these certificates in production.
**DO NOT** commit these certificates to version control (they're in .gitignore).
