# Selenium E2E Tests

Runs the Phase 1 UI flow with Selenium and writes reports to `reports/<timestamp>/`.

Required environment:

```powershell
$env:E2E_EMAIL="user@example.com"
$env:E2E_PASSWORD="password"
$env:START_SERVERS="true"
npm test
```

By default the harness starts isolated local servers on `http://localhost:5177`
and `http://localhost:3100`, then points the frontend at that backend.

Reports include:

- `report.json`
- `report.html`
- `events.json`
- `screenshots/*.png`

Sensitive values such as passwords, bearer tokens, API keys, and auth headers are redacted.
