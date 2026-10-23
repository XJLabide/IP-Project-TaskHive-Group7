---
name: TaskHive Dashboard
description: A focused dark workspace for finding, managing, and completing trusted tasks.
colors:
  canvas: "#09090B"
  surface: "#18181B"
  surface-raised: "#27272A"
  text-primary: "#FAFAFA"
  text-secondary: "#A1A1AA"
  border: "#27272A"
  brand-yellow: "#FFC800"
  brand-yellow-hover: "#D19300"
  focus-yellow: "#FFD50D"
  positive-green: "#75D333"
  negative-red: "#F04452"
typography:
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-yellow}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-yellow-hover}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: TaskHive Dashboard

## Overview

**Creative North Star: “HiveDesk”**

This guide applies to the signed-in dashboard only. Its visual reference is the user-provided [Refero finance dashboard](https://refero.design/pages/692dbc64-5288-4b8f-ac02-499472eb94d8?page_types%5Bid%5D%5B%5D=28&order=trending&source=search) screenshot. Translate the reference’s dark tonal layering, compact navigation, metric hierarchy, and activity-first composition to marketplace work. Do not carry over its finance content or imply that TaskHive has financial analytics it does not provide.

The dashboard is strictly dark mode. Use a near-black canvas, charcoal content panels, restrained borders, bright readable type, and concise labels. Keep TaskHive’s yellow as the action and brand color; use green only for positive status or data movement and red only for negative status or exceptions. Public landing and authentication pages remain outside this dashboard-only direction and continue to follow their own guidance.

The current implementation already uses a dark canvas, Geist, yellow controls, rounded cards, and a labeled sidebar. The screenshot’s compact icon rail and denser performance-dashboard composition are reference-derived target patterns, not claims about the current UI. The existing Theme toggle is current behavior; this guide sets a dark-only target for the dashboard and does not itself change that code.

**Key Characteristics:**
- Dashboard-only, dark-only presentation.
- Tonal charcoal panels with crisp, low-contrast borders.
- Yellow for primary actions; green and red reserved for meaning.
- Compact data labels and clear separation between summary, activity, and next actions.

## Colors

The palette stays close to the implemented zinc-and-yellow system, with green and red added as reference-derived semantic colors for dashboard data.

### Primary
- **TaskHive Signal Yellow** (`{colors.brand-yellow}`): Primary actions, selected navigation, focus treatment, and brand marks. Use sparingly so the main action reads first.

### Secondary
- **Positive Green** (`{colors.positive-green}`): Positive task and payment states, completed work, and upward chart movement. This value is an approximate adaptation of the screenshot and should be checked for contrast in actual chart and badge contexts.
- **Negative Red** (`{colors.negative-red}`): Disputes, overdue items, failed payments, and downward or negative values. Never use it as decoration.

### Neutral
- **Near-black Canvas** (`{colors.canvas}`): Full dashboard background.
- **Charcoal Surface** (`{colors.surface}`): Metric panels, activity areas, and task groups.
- **Raised Charcoal** (`{colors.surface-raised}`): Nested rows, selected sub-panels, and hover/active containers.
- **Primary Text** (`{colors.text-primary}`): Headings, values, and high-priority content.
- **Secondary Text** (`{colors.text-secondary}`): Descriptions, metadata, timestamps, and inactive navigation.
- **Panel Border** (`{colors.border}`): Quietly separates adjacent dark surfaces without introducing card shadows.

**The Semantic Color Rule.** Yellow invites an action; green and red communicate state. Never use green or red as a second brand accent.

## Typography

- **Display Font:** Geist (with ui-sans-serif, system-ui, sans-serif fallback)
- **Body Font:** Geist (with ui-sans-serif, system-ui, sans-serif fallback)
- **Label/Mono Font:** Geist for labels and values; reserve Geist Mono for IDs or technical references when useful.

**Character:** Compact, geometric, and highly legible. Use bold weight and tight tracking for a small number of key values; keep labels calm and secondary.

### Hierarchy
- **Headline** (700, 32px, 1.15 line-height): Dashboard page heading or primary greeting.
- **Title** (600, 16px, 1.35 line-height): Panel names and section headers.
- **Body** (400, 14px, 1.5 line-height): Task details, activity summaries, and supporting copy.
- **Label** (600, 12px, 1.3 line-height, slight tracking): Metric names, table headers, timestamps, and status context.
- **Key value** (700, 24–32px): Metrics and task totals; keep units and context nearby.

**The Value-First Rule.** A metric’s number is visually strongest only when its label and time period remain immediately understandable.

## Layout

Use a desktop dashboard grid that separates navigation from working content. The reference uses a narrow icon rail and a wide main column, with a secondary activity column where space permits. TaskHive may keep visible navigation labels when that improves accessibility; compactness must not make destinations ambiguous.

Organize dashboard content in this order: page heading and global actions; a short row of useful marketplace metrics; the primary work area; recent activity; then task lists and secondary summaries. Adapt every panel to real TaskHive data, such as open tasks, applications awaiting review, active assignments, and pending support actions. Omit any metric that has no trustworthy data source.

Use a 12-column desktop grid or equivalent responsive grid with consistent 16–24px gaps. Keep the main content fluid and cap its reading width where long task descriptions appear. On narrow screens, collapse the rail into a compact mobile navigation, stack panels, and preserve the primary action near the page heading. Horizontal scrolling is acceptable only for a deliberate data table, never for the full page.

## Elevation & Depth

Depth comes from tonal differences and borders, not heavy shadows. The canvas is the darkest layer; primary panels sit one step above it; nested lists and selected controls use the raised surface. Reserve a light shadow for small floating controls only when the surrounding surface cannot define their edge.

**The Border-Over-Shadow Rule.** Separate adjacent charcoal panels with a quiet border or surface shift; do not stack large shadows on dark cards.

## Shapes

Use calm, rounded rectangles. Cards use a 16px radius, controls use 12px, compact controls use 8px, and filters/status chips use pill corners. Keep one radius consistent within each component family. Panel outlines are thin and low-contrast; avoid decorative outlines and oversized capsule shapes on large content areas.

## Components

### Primary and secondary buttons
- **Shape:** Rounded control (12px); compact size may use 8px.
- **Primary:** Yellow fill with near-black label; reserve for the main action in a section.
- **Secondary:** Charcoal or transparent surface with a quiet border and bright text.
- **Hover / Focus:** Darken the yellow on hover. Keyboard focus uses a clear yellow ring with enough offset to remain visible on charcoal.
- **Density:** Keep action labels short and use a 40px minimum control height for standard dashboard buttons.

### Metric panels
- **Character:** Calm, compact summaries with one dominant value.
- **Shape:** Charcoal panel, 16px corners, thin border, 20–24px internal spacing.
- **Content:** Label first, value second, then period/status context. Add a trend badge only when the comparison period is clear.
- **Color:** Default values use primary text. Green/red apply only when the value’s direction has an explicit positive/negative meaning.

### Activity feed and task rows
- **Character:** Dense enough to scan, with enough vertical separation to distinguish items.
- **Shape:** Rows sit on the charcoal surface; dividers or a subtle raised background separate entries.
- **Content:** Lead with the event/task, show participant or task context next, and place the time/status at the edge. Keep the whole row readable on narrow screens.
- **State:** Use a concise badge for status; do not encode state by color alone.

### Status chips
- **Shape:** Pill corners, compact padding, and 12px semibold label.
- **Default:** Raised charcoal with secondary text.
- **Positive / Negative:** Use green or red with a dark tinted background and readable text; pair each with a clear status word or icon.

### Cards and containers
- **Background:** Charcoal panels over the near-black canvas.
- **Border:** Thin, low-contrast border; use a small surface shift for nested content.
- **Shadow:** Flat at rest; avoid large ambient shadows.
- **Padding:** 20px compact, 24px standard; reduce carefully on mobile.

### Navigation
- **Desktop:** Persistent left rail with clear active state. Icons may lead, but accessible names must remain available.
- **Mobile:** Compact navigation that preserves labels or offers an explicitly named menu.
- **Active state:** Yellow indicator or subtle tinted surface plus label contrast; do not rely on icon color alone.
- **Account and Theme:** Place user identity and the Theme control in a stable, easy-to-find utility area. Dashboard target remains dark-only while the product-level theme behavior is handled separately.

### Search and filters
- **Fields:** Dark surface, quiet border, readable placeholder, and a visible yellow focus ring.
- **Filters:** Use compact chips with a distinct selected state; maintain text labels and keyboard-operable controls.

## Do's and Don'ts

- **Do** keep the dashboard strictly dark, with near-black page canvas and charcoal panels.
- **Do** keep yellow for brand and primary action roles.
- **Do** reserve green for positive data/status and red for negative data/status.
- **Do** adapt the reference’s metric, activity, and task hierarchy to actual marketplace information.
- **Do** ensure status is communicated in text as well as color.
- **Don't** apply this dashboard-only direction to the public landing or authentication pages without a separate decision.
- **Don't** copy finance-specific terms, invoice widgets, revenue metrics, or sample business data into TaskHive.
- **Don't** invent marketplace performance metrics or imply backend data exists in the current static prototype.
- **Don't** use large shadows, decorative gradients, or green as the primary brand color.
- **Don't** hide essential navigation labels behind icons without accessible names.
