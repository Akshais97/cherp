You are performing a frontend-only UI/UX modernization.

Primary objective:
Improve visual quality, usability, clarity, responsiveness, and perceived product quality WITHOUT changing product intent or functionality.

STRICT RULES:
- Do NOT remove existing features
- Do NOT remove workflows
- Do NOT alter business logic
- Do NOT simplify away operational functionality
- Do NOT modify API endpoints
- Do NOT modify request/response contracts
- Do NOT modify database schema
- Do NOT modify RBAC/authentication logic
- Do NOT remove fields unless explicitly unused and approved
- Do NOT change navigation architecture unless preserving all functionality
- Do NOT change backend integrations
- Do NOT change Prisma models
- Do NOT change validation rules
- Do NOT break existing flows

Required behavior:
- Preserve all existing functionality exactly
- Preserve user intent of every screen
- Preserve existing API integrations
- Preserve data flow
- Preserve feature parity

Allowed improvements:
- Visual redesign
- Better spacing/layout
- Better typography
- Better component hierarchy
- Better responsive behavior
- Better empty/loading/error states
- Better UX clarity
- Better accessibility
- Better dashboard organization
- Better animations/microinteractions
- Better visual consistency

Before changing a screen:
1. Identify all existing functionality
2. Preserve all functionality
3. Improve only presentation and UX
4. Verify all interactions still exist after redesign