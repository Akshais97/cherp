# Production Latency RCA & Performance Optimization — CHERP

Measurement date: 2026-09-01  
Scope: Phase 1 production request path and the current React/NestJS/Prisma/Supabase implementation

## 1. Executive Summary

CHERP's heavy latency is caused by several amplifiers on the same critical path, with the deployed backend/runtime path dominating:

1. **Production runtime/infrastructure path:** the production dashboard fan-out took **7,779.8 ms**, while the same code against the same Supabase database completed locally in **1,045 ms**. Individual production authenticated endpoints took **3.4–7.3 seconds** versus roughly **0.18–1.07 seconds** locally. This 6–10x gap is not explained by SQL execution or payload size.
2. **Remote authentication on every request:** `JwtAuthGuard` called Supabase `getUser()` for every bearer token. This added an Auth-server network hop before the ERP user lookup and business queries.
3. **Dashboard request multiplication:** an initial privileged dashboard load issued nine authenticated API calls. Every call repeated authentication, the ERP user lookup, network latency, and serialization.
4. **Workload N+1 query pattern:** workload retrieval executed one team-member query plus two queries per member (15 queries for seven members).
5. **Excess initial JavaScript and aggressive polling:** all page modules were statically loaded and the notification bell polled every five seconds, continuously competing with user-initiated requests.

Safe changes reduced the measured local initial dashboard flow from **1,045 ms to 511.4 ms P50** (51.1%), workload retrieval from **1,067.1 ms to 392.6 ms** (63.2%), critical initial JavaScript transfer from **341.0 KB to approximately 255.2 KB gzip** (25.2%), and notification polling from 12 to one request per minute per active user (91.7%). The multi-second production-runtime gap remains the highest-priority operational bottleneck and requires Railway runtime metrics and region verification.

## 2. End-to-End Latency Map

The following map uses measured totals where instrumentation exists. Production does not currently emit `Server-Timing`, Prisma query timings, or render marks, so unmeasured layers are not assigned invented values.

```text
Browser
↓ Public Railway connection/TTFB: P50 462 ms, P95 542 ms
Frontend
↓ Initial JS transfer before: 341.0 KB gzip; after: ~255.2 KB gzip
API/network
↓ Nine-request production dashboard fan-out: 7,779.8 ms wall time
Authentication/RBAC
↓ Before: remote Supabase getUser + ERP user lookup on every request
↓ Local components: reused getUser 50–58 ms; ERP user lookup 173–195 ms
Backend/service/database
↓ Production individual authenticated endpoints: 3,434.7–7,308.6 ms total
↓ Same endpoints locally against the same DB: 184.4–1,067.1 ms total
Response/render
↓ Initial measured API payload: 66,066 bytes; production render timing unavailable
```

Representative production samples:

| Endpoint/action | Production | Local, same DB | Payload | Finding |
|---|---:|---:|---:|---|
| Initial dashboard API fan-out | 7,779.8 ms | 1,045 ms | 66,066 B | Runtime/network amplification |
| `GET /dashboard/summary`, cold auth window | 7,308.6 ms | 757.7 ms | small aggregate | Auth plus deployed runtime |
| `GET /dashboard/summary`, warm | 3,559.7 ms | 327.2 ms | small aggregate | Backend path remains slow after auth reuse |
| `GET /users/me` | 3,964.5 ms | 184.4 ms | small profile | Request lifecycle dominates payload |
| `GET /dashboard/upcoming-deadlines` | 5,083.0 ms | 605.1 ms | 41.6 KB | Largest dashboard payload, but not large enough to explain seconds |
| `GET /users/workload-summary` | 4,255.8 ms observed for users route; workload local 1,067.1 ms | 1,067.1 ms | 2.5 KB after | Confirmed N+1 locally |

Latency percentiles available from 20 production public-route samples were **P50 462 ms, P75 481 ms, P95/P99 542 ms**. Authenticated production percentile collection was intentionally bounded to avoid load on the live system; those figures are representative samples, not population percentiles.

## 3. Root Cause Analysis

### A. Deployed runtime path is 6–10x slower than local execution

- **Problem:** even small authenticated endpoints take several seconds in production.
- **Evidence:** production dashboard fan-out 7.78 s versus 1.045 s locally with the same application logic and Supabase database. `/users/me` is 3.96 s production versus 184 ms locally.
- **Root cause:** the latency is outside application SQL execution alone. The remaining candidates are Railway compute region/resource pressure, cross-region database round trips, connection-pool behavior, cold/runtime contention, or a combination. Platform telemetry is required to distinguish them.
- **Why it occurs:** the public edge identifies as Railway `sin1`, while the Supabase pooler hostname identifies `ap-south-1`. The actual Railway compute region and CPU/memory state are not present in the repository.
- **Affected files/routes:** all authenticated routes; deployment configuration and environment outside the repository.
- **Latency contribution:** approximately 6.7 seconds of the original 7.78-second dashboard wall time compared with local execution.
- **Severity:** Critical / P0.

### B. Remote Auth-server call repeated on every request

- **Problem:** every protected endpoint waited for Supabase `getUser()` before querying the ERP user and domain data.
- **Evidence:** guard source trace; direct reused Auth-server calls measured around 50–58 ms locally after a 166 ms first call. Nine dashboard calls multiplied the operation.
- **Root cause:** authorization used a remote user lookup where cryptographic JWT verification is sufficient for identity validation.
- **Why it occurs:** the guard treated the Auth server as the JWT verifier.
- **Affected file:** `backend/src/common/guards/jwt-auth.guard.ts`.
- **Affected routes:** every route protected by `JwtAuthGuard`.
- **Latency contribution:** one network operation per protected request, amplified by dashboard fan-out and cross-region placement.
- **Severity:** High / P0.

Supabase documents `getClaims()` as local JWT verification against cached JWKS for asymmetric keys, while `getUser()` performs an Auth-server request. References: [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims) and [Supabase JWT guide](https://supabase.com/docs/guides/auth/jwts).

### C. Initial dashboard multiplies all per-request overhead

- **Problem:** profile, four dashboard panels, activity, users, workload, and notifications produced nine initial requests.
- **Evidence:** browser/network trace and API-client call graph; measured 7,779.8 ms production fan-out.
- **Root cause:** dashboard data was split into independent endpoints despite being consumed as one screen.
- **Why it occurs:** UI composition became network composition; each panel incurred independent auth, ERP lookup, connection, and response overhead.
- **Affected files:** `frontend/src/features/dashboard/api.ts`, `DashboardPage.tsx`, `backend/src/dashboard/dashboard.controller.ts`, `dashboard.service.ts`.
- **Affected route:** internal dashboard.
- **Latency contribution:** four avoidable protected request lifecycles on the critical path.
- **Severity:** Critical / P0.

### D. Workload N+1 database queries

- **Problem:** workload generated two additional queries for every team member.
- **Evidence:** one base query plus `clientUser.findMany` and `task.count` per member; seven members generated 15 queries. Local endpoint time was 1,067.1 ms.
- **Root cause:** relations and counts were loaded inside a member loop.
- **Why it occurs:** repository methods exposed row-at-a-time access instead of the aggregate shape required by the screen.
- **Affected files:** `backend/src/users/users.repository.ts`, `users.service.ts`.
- **Affected route:** team workload summary and privileged dashboard.
- **Latency contribution:** 14 avoidable database round trips for the measured tenant.
- **Severity:** High / P0.

### E. Frontend startup and background-load amplification

- **Problem:** all route modules shipped in the initial bundle, and notifications polled every five seconds.
- **Evidence:** production JavaScript was 1,238,961 bytes raw / 340,973 bytes gzip; polling issued 12 requests/minute/user.
- **Root cause:** static page imports and a refresh interval far shorter than the product's notification freshness requirement.
- **Why it occurs:** navigation code did not define chunk boundaries; polling was configured as near-real-time behavior.
- **Affected files:** `frontend/src/components/layout/AppShell.tsx`, `frontend/src/features/notifications/NotificationsBell.tsx`.
- **Affected routes:** all authenticated pages.
- **Latency contribution:** slower startup plus avoidable background contention; not the primary source of multi-second API time.
- **Severity:** Medium / P1.

## 4. Database Findings

- The confirmed N+1 workload query was reduced from 15 queries for seven users to one projected Prisma query.
- Dashboard service methods already parallelize many independent aggregate calls. The new overview also runs independent panel methods concurrently; it does not serialize them.
- Production data is currently small: 215 tasks, 380 activity logs, 36 notifications, and no attachment/time-entry rows in the measured tenant/database. Missing indexes are therefore not the present multi-second root cause.
- Earlier `EXPLAIN ANALYZE` evidence in the repository showed sub-millisecond PostgreSQL execution while wall time was roughly 110–129 ms, supporting round-trip overhead rather than expensive plans at current cardinality.
- Candidate compound indexes were documented for observed tenant/relation/filter access patterns, but were **not applied to production**. Applying indexes now would add write/storage cost without measurable present benefit. Re-run plans after data growth before migration.
- The existing performance harness currently fails because raw SQL references unqualified table names while application tables live in the `erp` schema. It must be repaired before it can be a reliable regression gate.
- No large offset-pagination cost was demonstrated at current cardinality. Cursor conversion is therefore P2 growth work, not an incident fix.
- Connection establishment plus a trivial local query measured about 385.5 ms; repeated Prisma user lookup measured 173–195 ms. Connection reuse/pooler mode and deployed connection saturation need production telemetry.

## 5. Backend Findings

- Authentication was the only external network operation intentionally performed in the global protected-route lifecycle. It now uses locally verified claims for the ES256 production token.
- The ERP user lookup remains per request. This is deliberate: it preserves immediate enforcement of user status, tenant, role, and server-side session revocation. A process-wide timed cache was rejected because it would create a revocation window.
- RBAC remains in `RolesGuard`; tenant ownership remains repository/service enforced. No tenant ID is accepted from the client.
- Dashboard consolidation removes repeated controller/guard/serialization overhead without changing the existing panel business logic.
- Response compression is enabled globally. It helps the 41.6 KB deadline response and future larger payloads, but cannot explain or eliminate multi-second TTFB.
- Validation, exception handling, and Swagger setup did not show synchronous CPU work commensurate with the observed delay.
- Production lacks request IDs correlated with auth, Prisma, serialization, and event-loop timings. This is the largest observability gap.

## 6. Frontend Findings

- Initial dashboard requests were consolidated from nine to five for privileged users: profile, overview, users, workload, and notifications. Team members need fewer privileged calls.
- The profile request could be triggered by both `getSession()` and `onAuthStateChange`, especially under React Strict Mode. An in-flight, session-keyed profile-ID promise now deduplicates it and is cleared on sign-out.
- Non-dashboard pages now use route-level `React.lazy` boundaries. Dashboard remains eager to avoid adding a critical-path chunk waterfall.
- Critical initial JavaScript fell from approximately 1,239 KB raw / 341 KB gzip to approximately 844 KB raw / 255 KB gzip. Larger page modules are fetched only on navigation.
- The dashboard response is about 55 KB locally after consolidation; the complete initial API payload remains about 66 KB. Payload size is secondary to TTFB.
- No evidence showed a giant DOM/list as the primary incident cause at current record counts. List virtualization is not justified yet.
- React Doctor reports 336 branch-wide issues and a 46/100 score, chiefly accessibility and maintainability findings plus full Framer Motion imports. These are a real backlog but not supported as the multi-second production root cause. Broad cleanup was intentionally excluded from this incident change.
- Frontend lint still reports 12 pre-existing errors in unrelated files. The modified performance files are not among the reported lint failures.

## 7. Infrastructure Findings

- Frontend: `https://cherp-production.up.railway.app`.
- Backend: `https://cherp-production-7ccf.up.railway.app/api`.
- Railway responses expose the `sin1` edge. Supabase's pooler hostname identifies AWS `ap-south-1` (Mumbai).
- This proves different edge and database regions; it does **not** prove the backend compute region because Railway edge and compute placement can differ.
- If compute is in Singapore, each Prisma round trip crosses Singapore–Mumbai and query multiplication becomes especially costly. Verify the Railway service region before migration.
- The repository contains no CPU, memory, restart, cold-start, pool occupancy, or event-loop-lag telemetry. Consequently, resource throttling and connection saturation remain hypotheses, not conclusions.
- The configured Supabase pooler port is 6543, with a 5432 direct/pool endpoint also present. Prisma pool mode, connection limits, and Railway replica count must be checked against Supabase dashboard metrics before changing pool parameters.
- `api.cherp-erp.com` did not resolve during testing; production assets currently target the Railway backend URL. DNS changes are not warranted for latency without a working custom record and measurements.

## 8. Optimization Matrix

| Priority | Optimization | Expected reduction | Risk / complexity | Evidence | Second-order consequences |
|---|---|---|---|---|---|
| P0 | Verify/co-locate Railway compute with Supabase and inspect resource/pool metrics | Potentially multi-second | Medium; operational | Production 7.78 s vs local 1.045 s | Migration/restart risk; measure before and after |
| P0 | Replace per-request remote `getUser()` with verified `getClaims()` | One Auth RTT/request | Low / low | Guard trace and direct Auth timing | JWKS cache/rotation behavior; ERP revocation lookup retained |
| P0 | Consolidate dashboard panel requests | 51.1% local dashboard wall-time reduction with other fixes | Low / low | Nine calls and repeated protected lifecycle | Larger single response; one panel failure fails overview; 404 rolling fallback retained |
| P0 | Eliminate workload N+1 | 63.2% measured endpoint reduction | Low / low | 15 queries for seven users | More complex single SQL; bounded to 100 users |
| P1 | Route-level code splitting | 25.2% critical gzip reduction | Low / low | Production/build artifact sizes | First visit to a secondary route adds one chunk request |
| P1 | Poll notifications every 60 seconds | 91.7% request-rate reduction | Low / trivial | 5-second source interval | Notifications may be stale for up to 60 seconds |
| P1 | HTTP compression | Lower transfer time on medium/large JSON | Low / trivial | 41.6 KB largest panel | Small CPU cost; little impact on tiny payloads |
| P2 | Add per-layer timing/trace instrumentation | Enables attribution, not direct speedup | Low / medium | Missing production breakdown | Small logging/telemetry overhead; redact sensitive data |
| P2 | Apply candidate indexes only after plan evidence | Data-growth dependent | Low–medium / low | Observed access patterns, low current row counts | Slower writes and larger indexes |
| P3 | Virtualize lists and micro-optimize renders | Low at current scale | Medium | No current DOM bottleneck evidence | Complexity and UX/accessibility risk |

No Redis or dashboard result cache was introduced. Task, permission, and tenant data have difficult invalidation and stale-state consequences; current evidence favors eliminating work over caching it.

## 9. Changes Implemented

| File | Original problem | Change | Why it helps | Risk | Verification |
|---|---|---|---|---|---|
| `backend/src/common/guards/jwt-auth.guard.ts` | Remote Auth request per protected request | Verify ES256 JWT through `getClaims()`; retain ERP lookup | Removes external Auth hop without weakening authorization | Low; JWKS availability/rotation | Valid token role tests; invalid token 401; all four roles checked |
| `backend/src/dashboard/dashboard.controller.ts`, `dashboard.service.ts` | Five dashboard panel request lifecycles | Added `GET /dashboard/overview` with concurrent panel work | One auth/ERP/network lifecycle for dashboard data | Low; aggregate failure scope | Super Admin, PM, Team Member 200; Client 403 |
| `frontend/src/features/dashboard/api.ts`, `DashboardPage.tsx` | Dashboard waterfall/fan-out | Consume overview; 404-only compatibility fallback | Removes four initial calls after backend deployment | Low | Production build and local authenticated flow |
| `backend/src/users/users.repository.ts`, `users.service.ts` | 1+2N workload queries | One projected query with relation selection and filtered count | Removes 14 round trips for measured tenant | Low | Backend build/tests and benchmark |
| `frontend/src/app/providers/AuthProvider.tsx` | Duplicate profile fetch during session initialization | Deduplicate in-flight profile-ID fetch by auth user | Avoids repeated slow `/users/me` request | Low; immutable ID cached until sign-out | Frontend build and authenticated navigation smoke test |
| `frontend/src/components/layout/AppShell.tsx` | All page modules in startup bundle | Lazy-load secondary routes with Suspense | Cuts initial JS parse/transfer | Low; secondary-route first-load fetch | Build chunk inspection and tasks-route smoke test |
| `frontend/src/features/notifications/NotificationsBell.tsx` | Five-second polling | 60-second interval | Reduces background request pressure 12x | Low; bounded staleness | Frontend build |
| `backend/src/main.ts`, `backend/package.json` | JSON not explicitly compressed by app | Add compression middleware | Reduces response transfer when proxy does not | Low; small CPU cost | Backend build |
| Prisma schema/index SQL | Growth-oriented index candidates | Documented tenant/filter indexes; no production execution | Ready for measured future plan remediation | None now | Prisma schema validation; migration intentionally not run |

## 10. Before vs After

| Metric | Before | After | Improvement |
|---|---:|---:|---:|
| Local initial dashboard API flow | 1,045 ms, 9 calls | P50 511.4 ms, 5 calls | 51.1% lower wall time; 44.4% fewer calls |
| Workload summary | 1,067.1 ms, 15 queries for seven users | 392.6 ms, 1 query | 63.2% lower; 93.3% fewer queries |
| Dashboard summary after auth-cache expiry | 757.7 ms | roughly 303–376 ms | about 50% lower locally |
| Critical initial JS | 1,238,961 B raw / 340,973 B gzip | ~843,900 B raw / ~255,200 B gzip | 31.9% raw / 25.2% gzip reduction |
| Notification polling | 12 requests/min/user | 1 request/min/user | 91.7% lower request rate |

The optimized code has not yet been deployed, so a production after-number would be fabricated. The release must be canaried and the exact production workflow re-measured before claiming production resolution.

Verification completed:

- Backend build: pass.
- Frontend production build: pass.
- Prisma validation: pass.
- Auth test suite: pass.
- Slice 5 backend suite: pass.
- Direct endpoint/RBAC smoke tests: Super Admin, Project Manager, and Team Member allowed; Client denied; invalid token denied.
- Lazy-route browser smoke test: dashboard and task navigation render successfully.
- `git diff --check`: pass.
- Frontend lint: blocked by 12 unrelated pre-existing errors.
- React Doctor: 46/100 branch-wide, 336 existing/change-branch diagnostics; retained as follow-up backlog rather than speculative incident refactoring.

## 11. Remaining Bottlenecks

1. **Railway runtime gap:** obtain compute-region, CPU, memory, event-loop lag, restart/cold-start, replica, and request-duration metrics. This is the only evidence-supported path capable of explaining most remaining seconds.
2. **Cross-region verification:** confirm backend compute region. If it is not `ap-south-1` or nearby, benchmark a same-region canary before changing production placement.
3. **Per-layer observability:** add tenant-safe timing spans for guard verification, ERP user lookup, service, each Prisma operation, serialization, and total request time. Do not log JWTs, payload secrets, or tenant data.
4. **Connection pooling:** inspect Supabase pool active/waiting connections and Railway concurrency under real traffic before changing limits or endpoints.
5. **Production verification:** deploy as a canary, compare the same authenticated endpoint set at P50/P75/P95/P99, then roll back if RBAC, tenant isolation, or error rate changes.
6. **Performance harness repair:** schema-qualify the raw SQL benchmark and make it emit query count, DB time, payload bytes, and repeatable percentile output.
7. **Frontend backlog:** full Framer Motion imports and large components may affect low-end devices, but need browser performance traces before further changes.
8. **Credential hygiene:** two migration helper scripts contain a hard-coded production database credential fallback. This did not cause latency, but the credential should be rotated and removed in a separate urgent security change without printing it in logs or commits.

The safe next operational sequence is: deploy canary → collect Railway/Supabase timing and resource telemetry → re-run the exact production workflow → decide region/pool changes from those measurements. Application changes alone cannot responsibly claim to have removed the dominant production-runtime component until that step is complete.
