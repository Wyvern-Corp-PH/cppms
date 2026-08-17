<!-- System Design 101 — auth + secure APIs. Paraphrase. -->

# Part 6 — Security (edge & identity)

Upstream: `session-cookie-jwt-token-sso-and-oauth-2`, `a-cheatsheet-to-build-secure-apis`, OAuth/JWT/SSO guides, HTTPS guides.

Cross-cut pack **`rules/security.mdc`** — elevate secrets/PII findings to clear English.

## Identity mechanisms

| Mechanism | Idea | Watch |
| --------- | ---- | ----- |
| Session | Server stores state; cookie = session id | Sticky/scale; CSRF; multi-device |
| Opaque token | Client holds token; server validates | Revocation, storage |
| JWT | Signed claims; often stateless | Short TTL; secret strength; ⊥ sensitive claims; revocation hard |
| SSO | Central IdP; one login many apps | IdP availability; trust config |
| OAuth 2 | Delegated access without password share | Correct flow per client type; scope least privilege |

## Secure API checklist

1. **HTTPS** everywhere at edge (TLS terminate OK; no plaintext APIs)
2. **Rate limit / throttle** (DoS + abuse)
3. **Validate** headers, path, body (injection / oversize)
4. **Authn** — prefer standards (JWT/OAuth); avoid basic auth for public APIs
5. **Authz** — RBAC/ABAC/voters; never “exists ⇒ allowed”
6. Short-lived tokens; hard-to-guess secrets; rotate
7. Monitor auth failures / anomalies (**→ logging-best-practices**)

## Agent checklist

- [ ] Actor + scope checked before side effects
- [ ] Token/session choice matches scale + revoke needs
- [ ] Public mutate routes rate-limited
- [ ] No secrets in logs/responses
