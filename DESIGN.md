---
name: TaskHive Dashboard
description: A task-first marketplace dashboard with a shared light and dark layout.
colors:
  light-canvas: "#F7F8FA"
  light-surface: "#FFFFFF"
  light-warm-surface: "#FFFDF7"
  light-text-primary: "#17191D"
  light-text-secondary: "#5D6571"
  light-border: "#E3E7ED"
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
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-dark:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text-secondary}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# TaskHive Dashboard Design

## Direction

The signed-in dashboard is a task-first marketplace home based on the user-provided TaskHive reference. It helps Posters start a task and Taskers find work. The separate **My Work** page holds their applications, assignments, payment actions, posted tasks, and activity.

Use the reference's clear white workspace, warm process strip, yellow actions, category filters, and photographic task-card hierarchy. Dashboard cards use real category photography from Unsplash, with image credits recorded in `docs/Design Guidelines/Task Category Photo Credits.md`. Do not create sample task photography, finance-style metrics, fake notifications, or nonfunctional favorite controls.

The existing Theme toggle supports both modes. Light mode is the reference presentation; dark mode uses the same structure with charcoal surfaces and clear borders. Theme changes must not alter content order or hide sections.

## Visual Tokens

- TaskHive yellow is the primary action and selected-filter color.
- Light mode uses a soft gray-white canvas, white task surfaces, and a warm neutral process strip.
- Dark mode uses the near-black canvas and charcoal surfaces already defined in the token block.
- Green and red are semantic colors for positive and negative states only.
- Geist provides the display and body voice. Keep headlines direct, task titles prominent, and metadata compact.
- Use 12–16px panel radii, rounded chips for category filters, restrained borders, and minimal shadows.

## Page Composition

1. A compact utility row links to Chat inbox and Profile.
2. A full-width hero states the marketplace value and offers the next useful actions.
3. A three-step “How TaskHive works” strip explains posting, comparing offers, and hiring.
4. Launch-category filters remain available even when a category currently has no open tasks.
5. Open tasks show an honest geographic scope. Use “Anywhere in the Philippines” until a real search area is selected; never imply a saved or current location from a hard-coded coordinate.
6. Task cards show category and fulfillment/hiring modes, task details, approximate service area, deadline, applications, Poster, price, and a working task link.
7. The sidebar links to **My Work**, a dedicated page for payment actions, applications to review, assignments, posted tasks, and recent activity.

Empty and populated sessions use the same page structure. Empty messaging belongs inside its section and should explain a useful next step without replacing the dashboard with a separate first-run composition.

## Responsive Behavior

- Keep the labeled sidebar on desktop and the existing compact navigation on narrow screens.
- Task cards use three columns on wide screens, two at medium widths, and one on phones.
- Category filters wrap rather than forcing full-page horizontal scrolling.
- At 390px, hero actions may wrap, metadata may stack, and every task action must remain visible and operable.

## Accessibility and Interaction

- Keep controls semantic and keyboard-operable with visible focus.
- Communicate selected category through both yellow styling and `aria-pressed`.
- Give icon-only Chat and Profile links accessible names.
- Do not rely on color alone for task or payment status.
- Keep loading, error, empty, and populated content readable in both themes.

## Boundaries

- Preserve real marketplace actions and user-specific data; do not add fake values to fill space.
- This dashboard redesign does not synchronize browser-local task stores or add backend behavior.
- Do not copy the reference's unrelated content or introduce a feature that the app cannot perform.
