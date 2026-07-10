# CHERP — Dark Mode Design Specifications

This document defines the dark mode design tokens, variables, and styling patterns for CHERP. It complements the light theme defined in [Design_Specs.md](file:///d:/Chlear%20Projects/Marketerp/cherp/docs/current/Design_Specs.md).

## Theme Context

### Physical Scene
An agency project manager or team member reviewing client workloads and blocker escalations on a laptop in a dimly lit office or home setup late in the evening, seeking to reduce eye strain while quickly triaging tasks.

### Color Strategy
We employ a **Restrained** color strategy: using carefully tinted dark neutrals (chroma `0.006` to `0.010` tinted toward the brand blue hue `260`) for surfaces, with vibrant, high-contrast functional accent colors occupying less than 10% of the visual space.

---

## Color Palette

All neutral colors are tinted toward the brand blue hue (260) to prevent a lifeless, sterile gray appearance. Chroma is reduced as lightness approaches extremes.

### Neutrals and Surfaces

| Token | OKLCH Value | Hex Tint | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary Background** | `oklch(15.0% 0.008 260)` | `#121216` | Main application canvas background |
| **Secondary Background** | `oklch(12.0% 0.008 260)` | `#0D0D11` | Sidebar, panel backgrounds, and utilities |
| **Card Background** | `oklch(18.0% 0.008 260)` | `#18181D` | Elevated surfaces, tables, forms, and cards |
| **Hover Background** | `oklch(22.0% 0.008 260)` | `#222228` | Hover states, row interactions, and button hovers |
| **Input Background** | `oklch(14.0% 0.008 260)` | `#0F0F13` | Text inputs, dropdowns, and form control fields |
| **Border Color** | `oklch(24.0% 0.008 260)` | `#25252C` | Default divider borders, inputs, and card outlines |

### Text Colors

| Token | OKLCH Value | Hex Tint | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary Text** | `oklch(95.0% 0.006 260)` | `#F2F2F5` | Headings, labels, and primary reading copy |
| **Secondary Text** | `oklch(75.0% 0.008 260)` | `#B3B3C0` | Paragraphs, metadata, table content, and descriptions |
| **Muted Text** | `oklch(55.0% 0.008 260)` | `#828293` | Placeholders, secondary labels, and timestamps |

---

## Functional Accent Colors

Accents are adjusted for dark mode to ensure high readability and contrast (meeting WCAG AA targets on dark backgrounds) by increasing lightness and slightly reducing chroma relative to light mode.

### Primary Accent (Operational Blue)
* **Base Accent:** `oklch(65.0% 0.16 260)` (Hex `#5A8BFA`)
  * Used for main action buttons, focus states, and active navigation indicators.
* **Accent Light:** `oklch(20.0% 0.04 260)` (Hex `#18223C`)
  * Used for active row highlights and selected item backgrounds.

### Success (Green)
* **Base Accent:** `oklch(68.0% 0.14 145)` (Hex `#3EC285`)
  * Used for completed badges, healthy metrics, and approval states.
* **Success Light:** `oklch(20.0% 0.03 145)` (Hex `#152A20`)
  * Used for background highlights of successful events.

### Warning (Amber)
* **Base Accent:** `oklch(74.0% 0.15 80)` (Hex `#E29E25`)
  * Used for impending deadlines, warning states, and capacity issues.
* **Warning Light:** `oklch(22.0% 0.03 80)` (Hex `#332512`)
  * Used for background warning alerts.

### Danger (Red)
* **Base Accent:** `oklch(64.0% 0.16 25)` (Hex `#EC5A5A`)
  * Used for critical blockers, failed states, and overdue tasks.
* **Danger Light:** `oklch(18.0% 0.04 25)` (Hex `#3A1818`)
  * Used for background panels representing blockers or errors.

### Intelligence (Purple)
* **Base Accent:** `oklch(68.0% 0.18 290)` (Hex `#9C64FA`)
  * Used for recommendation badges and specialized system actions.
* **Purple Light:** `oklch(20.0% 0.04 290)` (Hex `#231838`)
  * Used for background highlight plates.

### Analytics (Teal)
* **Base Accent:** `oklch(68.0% 0.12 195)` (Hex `#2CB5C3`)
  * Used for operational metrics, progress cells, and stats.
* **Teal Light:** `oklch(20.0% 0.03 195)` (Hex `#132B2E`)
  * Used for secondary analytics highlight containers.

---

## Styling and Layout Guidelines

### Elevation and Shadows
* Avoid heavy dark drop shadows, as they are invisible on dark backgrounds.
* Show elevation hierarchy using borders and background brightness instead (higher elevation = lighter background color).
* Cards and dropdown popovers use `Card Background` (`#18181D`) with a subtle `Border Color` (`#25252C`) rather than a shadow.

### Borders
* Keep all borders solid, 1px thick.
* Do not use side-stripe borders (such as a thick left border on callouts) as accents. Utilize background tints or icons instead.

### Scrollbars
* Custom scrollbars must use a transparent track with a scrollbar thumb styled as `oklch(35.0% 0.008 260)` (Hex `#393944`).

### Text Rendering
* Add `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` to optimize legibility of light text on dark backgrounds.
