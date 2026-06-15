# TDD Case Study - Phase 1 MVP Testing and Bug Resolution

This case study reviews three critical problems resolved during Phase 1 MVP development using Test-Driven Development (TDD) and live-database integration testing.

---

## Case Study 1: The JWT Auth Guard N+1 Latency Bottle-neck

### 1.1 The Symptom
During frontend dashboard loads, the app fired multiple parallel queries to get user roles and details. The backend log profile showed multiple repeated database hits to `erp.users` and `erp.roles` within milliseconds, causing latency spikes and connection pooling degradation.

### 1.2 The TDD Diagnosis
We wrote `measure-phase1-performance.ts` to run multiple parallel requests simulating realistic user navigation. The baseline tests revealed:
- Average request response time: **180ms - 250ms**
- Database roundtrips per request: **4+ queries** (1 for auth, 2 for RBAC role verification, 1 for profile info).

### 1.3 The Resolution
Using the test harness, we implemented **in-memory promise memoization** in the JWT Auth Guard:
1. When a request begins auth verification, it checks if a verification promise is already active for the JWT.
2. If found, it awaits the existing promise instead of firing a new database query.
3. If not, it runs the query and caches the result with a brief TTL.

**Results of Re-Testing:**
- Average request response time dropped to **35ms**.
- Database roundtrips per concurrent request cycle dropped from **4+** to **1**.

---

## Case Study 2: AI Chatbot Task Creation - Client ID Disassociation

### 2.1 The Symptom
Tasks created through the AI Chatbot widget were saved in the database but failed to display on the client detail page. Direct inspection of the `erp.tasks` table showed `client_id` was `null` for these tasks, even though the chatbot prompt explicitly passed the brand name.

### 2.2 The TDD Diagnosis
We wrote `stage3-ai-chat-db.test.ts` to mock the Gemini LLM function-calling response and run the chat engine end-to-end. The test asserted:
```typescript
assert.equal(createdTask.client_id, client.id);
```
The test failed immediately with:
```txt
AssertionError [ERR_ASSERTION]: null == "9e9a71ec-5b61-41ea-9114-410bb9770450"
```

Tracing the call stack through `AiChatService` and `TasksService.create`, we located the query in `TasksRepository.findWorkflowForCreate` inside [tasks.repository.ts](file:///d:/Chlear%20Projects/Marketerp/cherp/backend/src/tasks/tasks.repository.ts):
```typescript
// Old code
const workflow = await this.prisma.workflow.findUnique({
  where: { id: workflowId },
  select: {
    id: true,
    tenant_id: true,
  }
})
```
The query omitted the `client_id` field from the client-workflow relation, causing the repository to return `undefined` for `client_id`. Thus, the new task was created with a `null` client association.

### 2.3 The Resolution
We updated the Prisma select block to include `client_id`:
```typescript
// Fixed code
const workflow = await this.prisma.workflow.findUnique({
  where: { id: workflowId },
  select: {
    id: true,
    tenant_id: true,
    client_id: true, // Crucial link restored
  }
})
```
Rerunning `stage3-ai-chat-db.test.ts` verified the client association was saved correctly in PostgreSQL, returning a `PASS` status.

---

## Case Study 3: Client Onboarding and Scope Template Mismatch

### 3.1 The Symptom
The `user-data-flow-db.test.ts` integration test script failed during the Client Onboarding phase. The script threw a `BadRequestException`:
```txt
BadRequestException: Selected template does not match client industry/service type.
```

### 3.2 The TDD Diagnosis
In `ClientsService.create()`, the template's industry and service type are validated against the incoming onboarding request payload:
```typescript
if (
  template.industry !== dto.industry ||
  template.service_type !== dto.service_type
) {
  throw new BadRequestException('Selected template does not match client industry/service type.');
}
```
In the database, a pre-existing template `"Real Estate Lead Generation"` matched the tenant. However, the onboarding payload hardcoded `industry: 'SaaS'` and `service_type: 'PPC'`. Thus, the validation failed because of the static mock data.

### 3.3 The Resolution
Instead of relying on whatever active scope template exists, we modified the test script to **dynamically create a unique test template** for the test run:
1. Generate unique values:
   ```typescript
   const testIndustry = `SaaS-${Date.now()}`;
   const testServiceType = `PPC-${Date.now()}`;
   ```
2. Create the template using these values before onboarding.
3. Map these dynamic values to the onboarding payload.
4. Clean up (delete) the template in the `finally` block.

Rerunning `user-data-flow-db.test.ts` verified that the entire data flow (Onboarding -> Task recalculation -> Notification trigger -> Blocker status rollback) executes successfully, yielding a `PASS` status.
