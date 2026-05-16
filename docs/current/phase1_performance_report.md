# Phase 1 Performance Measurement

Measured at: 2026-05-14T20:27:48.997Z
Tenant: Chlear

## Database EXPLAIN ANALYZE

| Query | Execution ms | Planning ms | Wall ms | Rows | Plan | Target | Status |
|---|---:|---:|---:|---:|---|---:|---|
| Dashboard active clients count | 0.05 | 0.141 | 68.926 | 1 | Aggregate > Seq Scan | 200 | PASS |
| Dashboard active workflow summary | 0.068 | 0.166 | 60.69 | 1 | Aggregate > Seq Scan | 200 | PASS |
| Dashboard open blockers count | 0.045 | 0.124 | 61.755 | 1 | Aggregate > Seq Scan | 200 | PASS |
| Dashboard team utilization source | 0.07 | 0.296 | 69.45 | 1 | Limit > Nested Loop | 200 | PASS |
| Dashboard client health rows | 0.152 | 0.289 | 67.543 | 7 | Limit > Result | 200 | PASS |
| Dashboard upcoming deadlines | 0.176 | 0.445 | 66.774 | 14 | Limit > Sort | 200 | PASS |
| Dashboard open blockers rows | 0.153 | 0.668 | 75.365 | 0 | Limit > Sort | 200 | PASS |
| Dashboard recent activity | 0.058 | 0.1 | 75.457 | 20 | Limit > Index Scan | 200 | PASS |

## Authenticated API Timings

| Endpoint | HTTP | Runs | Min ms | Avg ms | P95 ms | Max ms | Target | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| GET /dashboard/summary | 200 | 5 | 390.199 | 459.819 | 665.331 | 665.331 | 2000 | PASS |
| GET /dashboard/client-health | 200 | 5 | 440.749 | 468.569 | 492.183 | 492.183 | 2000 | PASS |
| GET /dashboard/upcoming-deadlines | 200 | 5 | 506.09 | 519.943 | 534.768 | 534.768 | 2000 | PASS |
| GET /dashboard/open-blockers | 200 | 5 | 386.451 | 398.546 | 417.201 | 417.201 | 2000 | PASS |
| GET /dashboard/recent-activity | 200 | 5 | 475.053 | 509.987 | 537.536 | 537.536 | 2000 | PASS |

Notes:
- Database target here is 200ms query execution time.
- API target here is 2s authenticated endpoint wall time.
- API wall time includes local server and network latency.
