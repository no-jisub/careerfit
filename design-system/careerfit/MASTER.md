# Design System Master File

> **LOGIC:** When building a specific page, first check `pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** CareerFit
**Generated:** 2026-07-21 13:07:54
**Category:** University Counseling Operations Workspace
**Design Dials:** Variance 6/10 (Balanced / Modern) | Motion 4/10 (Standard) | Density 7/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#1E3A5F` | `--blue-dark` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary / CTA | `#2563EB` | `--blue` |
| Background | `#F4F7FB` | `--bg` |
| Foreground | `#10213D` | `--navy` |
| Body text | `#334155` | `--text` |
| Muted text | `#64748B` | `--muted` |
| Border | `#DFE6EF` | `--border` |
| Success | `#137A53` | `--green` |
| Destructive | `#C53E45` | `--red` |
| AI accent | `#6D4ED0` | `--purple` |

**Color Notes:** Institutional navy builds trust, clear blue emphasizes actions, and semantic green/red/purple always appear with an icon or label.

### Typography

- **Heading Font:** Pretendard / Noto Sans KR / system sans-serif, 700–800
- **Body Font:** Pretendard / Noto Sans KR / system sans-serif, 400–600
- **Type Scale:** Caption 12px, compact body 13px, body/control 14px, card title 16px, section title 20px, page title 28–32px
- **Mood:** trustworthy, calm, approachable, operational
- **Loading:** system-first stack; no render-blocking remote font request
- **Heading hierarchy:** Show the title directly. Do not place small eyebrow, kicker, or overline labels above page, section, card, or modal headings.

**CSS Import:**
```css
:root {
  font-family: Pretendard, 'Noto Sans KR', system-ui, -apple-system, sans-serif;
}
```

### Spacing Variables

*Density: 7/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `none` | Inputs, buttons, icons |
| `--shadow` | `none` | Cards and standard surfaces |
| `--shadow-hover` | `none` | Hover states use border/background only |
| `--shadow-float` | `none` | Modals and popovers use a scrim, border, and surface contrast |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #2563EB;
  color: white;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #1E3A5F;
  border: 1px solid #CBD5E1;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  box-shadow: none;
  transition: all 200ms ease;
  border: 1px solid #DFE6EF;
}

.card:hover {
  border-color: #CBD5E1;
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #1E3A5F;
  outline: none;
  box-shadow: 0 0 0 3px #1E3A5F20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  border: 1px solid #DFE6EF;
  box-shadow: none;
  max-width: 500px;
  width: 90%;
}
```

### Shape hierarchy

- **Controls:** 10px — buttons, inputs, search fields, and icon buttons
- **Nested components:** 12px — tabs, selectable rows, and compact internal cards
- **Primary surfaces:** 16px — cards, panels, heroes, modals, and popovers
- **Status labels:** Full pill — badges, tags, counts, and state chips
- **Exceptions:** Avatars remain circular; the floating glass top bar keeps its slightly larger responsive radius.

---

## Style Guidelines

**Style:** Calm, Data-Dense Service Dashboard

**Keywords:** Clear priorities, approachable cards, readable data tables, task status, consistent forms, space-efficient responsive layout

**Best For:** Student counseling preparation, case records, follow-up tasks, and program recommendations

**Key Effects:** Row highlighting, visible focus rings, clear loading feedback, restrained card lift, and state transitions

### Page Pattern

**Pattern Name:** Trust + Next Best Action

- **Workspace start:** Every counselor/admin tab starts `24px` below the floating top bar (`22px` on tablet, `18px` on mobile), regardless of whether its first block is a page intro or a custom hero.
- **Page intro:** Use a `28–30px` title, `14px` description, and an optional `46px` rounded-square SVG icon container. Keep the icon and title group vertically centered and use a `14px` gap.
- **Workflow Strategy:** Surface today's appointments and overdue actions first, then preserve context for deeper case work.
- **CTA Placement:** One primary task action per page; secondary actions remain visually subordinate.
- **Section Order:** 1. Page context, 2. urgent summary, 3. primary work list, 4. recent context and shortcuts.
- **Primary Navigation:** Keep `학생 관리` directly below `메인 대시보드` as the top-level student directory, outside the counseling workflow group.
- **Counseling Workflow Navigation:** Keep `상담 일정 → 상담 전 준비 → 상담 기록 작성 → 상담 후 할 일` in operational order. Preparation exposes scheduled students only; writing exposes in-progress and documentation-needed students only.

---

## Motion

**Micro-interactions** — Trigger: hover, press, expand, or modal open | Duration: 150–200ms | Easing: `ease-out`

```css
.interactive {
  transition: color .2s ease-out, background .2s ease-out,
    border-color .2s ease-out, transform .2s ease-out;
}
```

- ✅ Motion must explain feedback or hierarchy.
- ❌ Do not animate dense data rows on entry.
- ⚡ Animate transform and opacity; honor `prefers-reduced-motion`.
- ✅ Keep normal page scrolling native and immediate; use smooth scrolling only for explicit in-page navigation actions.

---

## Anti-Patterns (Do NOT Use)

- ❌ Ornate design
- ❌ No filtering

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y
- ❌ **Decorative surface shadows** — Use borders and background states for cards, buttons, tabs, and icons; reserve shadows for overlays

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
