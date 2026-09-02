# Functional Test Suite Matrix & Traceability

This directory contains executable functional test suites for the ERP application ([Akshais97/cherp](https://github.com/Akshais97/cherp)), mapping 1-to-1 to all 32 core functional requirements.

| # | Functional Test Case | Target Suite File | Status |
|---|---|---|---|
| 1 | Local app boot | `01_app_boot_and_auth.test.ts` | Executable |
| 2 | Page load smoke test | `02_dashboard_and_search.test.ts` | Executable |
| 3 | Routing | `02_dashboard_and_search.test.ts` | Executable |
| 4 | Sign in | `01_app_boot_and_auth.test.ts` | Executable |
| 5 | Invalid sign in | `01_app_boot_and_auth.test.ts` | Executable |
| 6 | Auth persistence | `01_app_boot_and_auth.test.ts` | Executable |
| 7 | Protected routes | `01_app_boot_and_auth.test.ts` | Executable |
| 8 | Dashboard data | `02_dashboard_and_search.test.ts` | Executable |
| 9 | Tasks page | `03_tasks_and_views.test.ts` | Executable |
| 10 | Task details | `03_tasks_and_views.test.ts` | Executable |
| 11 | Create task | `03_tasks_and_views.test.ts` | Executable |
| 12 | Update task | `03_tasks_and_views.test.ts` | Executable |
| 13 | Delete/archive task | `03_tasks_and_views.test.ts` | Executable |
| 14 | Filters | `03_tasks_and_views.test.ts` | Executable |
| 15 | Search | `02_dashboard_and_search.test.ts` | Executable |
| 16 | Board view | `03_tasks_and_views.test.ts` | Executable |
| 17 | Calendar view | `03_tasks_and_views.test.ts` | Executable |
| 18 | Charts view | `03_tasks_and_views.test.ts` | Executable |
| 19 | Client page | `04_clients_team_rbac.test.ts` | Executable |
| 20 | Team members page | `04_clients_team_rbac.test.ts` | Executable |
| 21 | RBAC | `04_clients_team_rbac.test.ts` | Executable |
| 22 | Forms | `05_attachments_comments_time.test.ts` | Executable |
| 23 | Empty states | `06_ui_states_and_responsiveness.test.ts` | Executable |
| 24 | Loading states | `06_ui_states_and_responsiveness.test.ts` | Executable |
| 25 | API error handling | `05_attachments_comments_time.test.ts` | Executable |
| 26 | Notifications | `05_attachments_comments_time.test.ts` | Executable |
| 27 | File upload | `05_attachments_comments_time.test.ts` | Executable |
| 28 | Comments | `05_attachments_comments_time.test.ts` | Executable |
| 29 | Time tracking | `05_attachments_comments_time.test.ts` | Executable |
| 30 | Logout | `01_app_boot_and_auth.test.ts` | Executable |
| 31 | Mobile responsiveness | `06_ui_states_and_responsiveness.test.ts` | Executable |
| 32 | Local database seed | `04_clients_team_rbac.test.ts` | Executable |

## How to Run

Execute all functional test suites using ts-node:
```bash
npx ts-node -T functional_tests/run_all_functional_tests.ts
```
