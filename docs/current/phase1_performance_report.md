# Phase 1 Performance Measurement

Measured at: 2026-09-02T05:20:42.314Z
Tenant: Chlear

## Database EXPLAIN ANALYZE

| Query | Execution ms | Planning ms | Wall ms | Rows | Plan | Target | Status |
|---|---:|---:|---:|---:|---|---:|---|
| Dashboard active clients count | 0.196 | 1.073 | 178.282 | 1 | Aggregate > Seq Scan | 200 | PASS |
| Dashboard active workflow summary | 0.956 | 1.197 | 144.774 | 1 | Aggregate > Seq Scan | 200 | PASS |
| Dashboard open blockers count | 2.184 | 1.683 | 148.334 | 1 | Aggregate > Index Only Scan | 200 | PASS |
| Dashboard team utilization source | 0.457 | 3.289 | 152.687 | 6 | Limit > Nested Loop | 200 | PASS |
| Dashboard client health rows | 10.051 | 1.634 | 152.29 | 20 | Limit > Result | 200 | PASS |
| Dashboard upcoming deadlines | 6.899 | 2.609 | 160.824 | 20 | Limit > Sort | 200 | PASS |
| Dashboard open blockers rows | 0.807 | 1.07 | 140.996 | 0 | Limit > Sort | 200 | PASS |
| Dashboard recent activity | 0.173 | 1.146 | 146.866 | 20 | Limit > Index Scan | 200 | PASS |

## Authenticated API Timings

API timings skipped. Provide `PERF_BACKEND_URL`, `E2E_EMAIL`, and `E2E_PASSWORD` to measure authenticated endpoints.

Notes:
- Database target here is 200ms query execution time.
- API target here is 2s authenticated endpoint wall time.
- API wall time includes local server and network latency.
