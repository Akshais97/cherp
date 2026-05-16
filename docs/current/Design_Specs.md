# Agency Command Center ERP — Design Specifications

## Theme
**Style:** Minimal Enterprise Light Theme  
**Vibe:** Calm, operational, analytical, premium SaaS ERP interface.

The UI is designed to feel:
- Lightweight
- Executive-friendly
- Workflow-focused
- Data-clear without overwhelming density
- Modern enterprise with soft visual treatment

---

# Color Palette

## Backgrounds

### Primary Background
- `#FAFAF8`
- Main application background

### Secondary Background
- `#F5F5F2`
- Sidebar background
- Secondary panels
- Utility surfaces

### Card Background
- `#FFFFFF`
- Cards
- Tables
- Forms
- KPI containers

### Hover Background
- `#F0F0EC`
- Hover states
- Row interactions
- Secondary button hover

### Input Background
- `#F7F7F5`
- Forms
- Inputs
- Dropdowns
- Editable fields

---

# Text Colors

## Primary Text
- `#1A1A1A`
- Main reading text
- Headers
- Important data

## Secondary Text
- `#6B6B6B`
- Descriptions
- Supporting text
- Table values
- Metadata

## Muted Text
- `#9A9A9A`
- Labels
- Placeholders
- Timestamps
- UI hints

---

# Functional Accent Colors

## Primary Accent
### Operational Blue
- `#3B6DD6`
- Primary actions
- Active navigation
- Focus states
- Main CTAs

### Accent Light
- `#EEF4FF`
- Active backgrounds
- Highlight containers
- Selected states

---

## Success
### Green
- `#2DA86B`
- Completed workflows
- Healthy KPIs
- Positive metrics
- Success badges

### Green Light
- `#EDFBF3`
- Success backgrounds
- Success cards

---

## Warning
### Amber
- `#D48806`
- Risks
- Deadlines
- Capacity warnings
- Attention-needed states

### Amber Light
- `#FEF7E6`
- Warning containers
- Planning alerts

---

## Danger
### Red
- `#D44`
- Critical blockers
- Failed KPIs
- Escalations
- Overdue states

### Red Light
- `#FEF0F0`
- Danger backgrounds
- Error panels

---

## Intelligence / AI
### Purple
- `#7C3AED`
- AI recommendations
- ML insights
- Intelligence systems

### Purple Light
- `#F3EEFF`
- AI insight containers
- Intelligence surfaces

---

## Analytics / Insights
### Teal
- `#0E9AA7`
- Predictive insights
- Data intelligence
- Analytical highlights

### Teal Light
- `#E6F9FA`
- Insight cards
- Data-focused containers

---

# Typography

## Primary Font Family

```css
font-family: 'Inter', system-ui, sans-serif;

```

---

# Brand

## Product Name

- The Phase 1 product brand name is `CHERP`.
- Use the provided CHERP logo for the login brand mark, app sidebar brand, and favicon.
- Avoid showing long brand text inside collapsed navigation. Collapsed sidebar state should show only the CHERP logo and icons.

---

# Layout And Forms

## Sidebar

- The sidebar may default to collapsed on dense operational screens.
- Collapsed navigation must not crop text. Hide labels intentionally and keep the logo centered.
- Expanding the sidebar should reveal text labels without changing the main content structure unexpectedly.

## Workflow Task Forms

- Task cards must use predictable form spacing, not uneven mixed-width input rows.
- Long fields such as title and description should get their own primary row.
- Compact fields such as due date, priority, and actions should sit in a secondary aligned row.
- Checklist ordering should use a visible drag handle; do not expose manual sort-order inputs in the primary task edit form.
- Inputs, selects, textareas, and action buttons in the same row should share consistent height and spacing.
- Responsive wrapping should stack fields cleanly instead of clipping or forcing horizontal page overflow.

## Workflow Task Accordions

- Dense workflow task lists should use a one-open-card accordion pattern.
- Closed task cards should show title, description summary, and status only.
- Open task cards may reveal status, assignee, edit controls, completion, and blocker logging.
- Task priority side treatment must be consistent: high red, medium amber, low neutral gray.

## Width Containment

- Dashboard, client, workflow, and blocker layouts must set `min-width: 0` on grid/flex children that contain tables or long labels.
- Tables may scroll inside their own wrapper, but the page itself should not require horizontal scrolling at 100% browser zoom.
