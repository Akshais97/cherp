# Phase 1 Performance Measurement

Measured at: 2026-06-12T05:19:06.661Z
Tenant: Chlear

## Database EXPLAIN ANALYZE

| Query | Execution ms | Planning ms | Wall ms | Rows | Plan | Target | Status |
|---|---:|---:|---:|---:|---|---:|---|
| Dashboard active clients count | 0.216 | 0.533 | 125.737 | 1 | Aggregate > Index Only Scan | 200 | PASS |
| Dashboard active workflow summary | 0.174 | 0.578 | 129.229 | 1 | Aggregate > Seq Scan | 200 | PASS |
| Dashboard open blockers count | 0.119 | 0.6 | 110.69 | 1 | Aggregate > Index Only Scan | 200 | PASS |
| Dashboard team utilization source | 0.579 | 1.661 | 115.793 | 6 | Limit > Nested Loop | 200 | PASS |
| Dashboard client health rows | 0.511 | 0.577 | 112.683 | 20 | Limit > Result | 200 | PASS |
| Dashboard upcoming deadlines | 0.655 | 1.409 | 116.022 | 20 | Limit > Sort | 200 | PASS |
| Dashboard open blockers rows | 0.299 | 1.108 | 112.89 | 5 | Limit > Sort | 200 | PASS |
| Dashboard recent activity | 0.317 | 1.075 | 116.424 | 20 | Limit > Index Scan | 200 | PASS |

## Authenticated API Timings

API timings skipped. Provide `PERF_BACKEND_URL`, `E2E_EMAIL`, and `E2E_PASSWORD` to measure authenticated endpoints.

Notes:
- Database target here is 200ms query execution time.
- API target here is 2s authenticated endpoint wall time.
- API wall time includes local server and network latency.
