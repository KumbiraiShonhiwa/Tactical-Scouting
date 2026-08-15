---
name: security-audit
description: Application security review skill for secrets, RLS, JWT, dependencies, rate limits and safe configuration.
---
# Security Audit

Review every security-sensitive change for:
- service_role exposure;
- committed secrets;
- database passwords;
- JWT verification;
- audience/issuer validation;
- RLS bypass;
- SQL injection;
- unsafe CORS;
- missing rate limits;
- insecure storage access;
- dependency vulnerabilities;
- unsafe logging.

Suggested checks:
```bash
npm audit
pip-audit
gitleaks detect
```

Never print or paste real secrets into source, logs or test fixtures.
