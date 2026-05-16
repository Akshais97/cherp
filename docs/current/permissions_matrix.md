# permissions_matrix.md — Agency Command Center ERP

## 1. Purpose

This file defines the Phase 1 RBAC permission contract for the ERP.

It controls:

- route access
- UI visibility
- workflow actions
- client data access
- task and blocker mutations
- administrative restrictions

Permissions must be enforced on both frontend and backend.

Frontend checks improve user experience.
Backend guards are the source of truth.

---

## 2. Roles

| Role | Scope |
|---|---|
| `super_admin` | Full platform and tenant-level control |
| `project_manager` | Manages clients, workflows, tasks, blockers, and delivery operations |
| `team_member` | Works on assigned tasks and logs blockers |
| `client` | Read-only access to own dashboard/progress |

---

## 3. Permission Matrix

| Resource / Action | Super Admin | Project Manager | Team Member | Client |
|---|---:|---:|---:|---:|
| View internal dashboard | Yes | Yes | Limited | No |
| View client dashboard | Yes | Yes | Limited | Own only |
| Create users | Yes | No | No | No |
| Update user role | Yes | No | No | No |
| Deactivate users | Yes | No | No | No |
| View users | Yes | Yes | No | No |
| Create client | Yes | Yes | No | No |
| View clients | Yes | Yes | Assigned only | Own only |
| Update client | Yes | Yes | No | No |
| Archive client | Yes | No | No | No |
| Change client status | Yes | Yes | No | No |
| Create scope template | Yes | Yes | No | No |
| Update scope template | Yes | Yes | No | No |
| Deactivate scope template | Yes | Yes | No | No |
| View scope templates | Yes | Yes | No | No |
| Create workflow | Yes | Yes | No | No |
| View workflows | Yes | Yes | Assigned only | Own only |
| Update workflow | Yes | Yes | No | No |
| Complete workflow | Yes | Yes | No | No |
| Archive workflow | Yes | No | No | No |
| Create task | Yes | Yes | No | No |
| View tasks | Yes | Yes | Assigned only | Own only, read-only |
| Update task | Yes | Yes | Assigned only | No |
| Assign task | Yes | Yes | No | No |
| Complete task | Yes | Yes | Assigned only | No |
| Reorder tasks | Yes | Yes | No | No |
| Create blocker | Yes | Yes | Assigned task only | No |
| View blockers | Yes | Yes | Related assigned work only | Own client only, read-only |
| Resolve blocker | Yes | Yes | No | No |
| View activity logs | Yes | Yes | No | No |
| View financial fields | Yes | Restricted | No | No |
| Platform settings | Yes | No | No | No |

---

## 4. Access Rules

### Tenant Rule

All users can access only data inside their tenant.

```txt
entity.tenant_id === currentUser.tenant_id
```

No cross-tenant access is allowed.

---

### Client Rule

Clients may only view records related to their own client profile.

Clients must never access:

- internal dashboard
- team workload
- financial margin data
- user management
- scope templates
- activity logs
- internal blockers beyond allowed progress visibility

---

### Team Member Rule

Team members may only mutate tasks assigned to them.

They may:

- update status of assigned tasks
- mark assigned tasks complete
- create blockers on assigned tasks

They may not:

- create clients
- create workflows
- assign tasks
- resolve blockers
- edit client records

---

### Project Manager Rule

Project managers own delivery operations.

They may:

- onboard clients
- manage workflows
- assign tasks
- resolve blockers
- view operational dashboards

They may not:

- alter platform settings
- manage role elevation
- bypass tenant boundaries

---

## 5. Backend Enforcement

All protected endpoints must use:

- JWT authentication guard
- tenant context validation
- role guard
- ownership guard where needed

Backend must reject unauthorized operations even if the frontend hides the button.

---

## 6. Frontend Enforcement

Frontend must hide or disable restricted actions.

Examples:

- hide user management from non-admins
- hide client creation from team members
- disable task completion if task is not assigned to the user
- show client users read-only dashboard views

Frontend permission checks must never replace backend checks.

---

## 7. Permission Design Rules

- Use allowlists, not denylists.
- Prefer role + ownership checks over role-only checks.
- Never trust `tenant_id`, `role`, or `user_id` from request body.
- Use authenticated context as the source of truth.
- Log all permission-sensitive mutations.
