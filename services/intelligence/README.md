# Tax Lien Intelligence Service

Internal Python runtime for the versioned evidence-first engine.

```bash
PYTHONPATH=services/intelligence/src \
INTELLIGENCE_SERVICE_TOKEN=replace-with-at-least-32-random-characters \
python3 -m tax_lien_intelligence.server
```

Verification:

```bash
npm run test:intelligence:python
npm run smoke:intelligence-service
npm run build:intelligence:python
```

Read `docs/api/intelligence-service.md` and
`docs/architecture/intelligence-service.md` before changing its runtime or
contract. This service does not contain models, provider fallbacks, tenant
authorization, persistence, or auction execution.
