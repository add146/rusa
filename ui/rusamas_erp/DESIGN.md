---
name: Rusamas ERP
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#bb0112'
  on-secondary: '#ffffff'
  secondary-container: '#e02928'
  on-secondary-container: '#fffbff'
  tertiary: '#4b1c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2c00'
  on-tertiary-container: '#f39461'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb4ab'
  on-secondary-fixed: '#410002'
  on-secondary-fixed-variant: '#93000b'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#773205'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  h1-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  page-padding: 1.5rem
  section-gap: 2rem
  grid-gutter: 1.5rem
  container-max-width: 1440px
  sidebar-width: 280px
---

## Brand & Style
The design system is engineered for high-stakes enterprise resource planning, where clarity and reliability are paramount. It targets a professional demographic (ages 40-50+) who require high legibility and an intuitive interface that minimizes cognitive load.

The style is **Modern Corporate**, blending the structured reliability of traditional ERPs with the openness of contemporary SaaS. It prioritizes a "calm" interface through generous whitespace and a restricted color palette to prevent data fatigue. The emotional response is one of stability and precision, achieved through a robust sidebar-driven architecture and high-contrast interactive elements.

## Colors
The palette utilizes a "High-Trust Blue" as the foundation, ensuring the interface feels authoritative. The accent Red is used sparingly but aggressively for primary actions and critical alerts to ensure they are unmistakable for users.

- **Primary (#1E3A8A):** Used for navigation backgrounds, primary buttons, and active states.
- **Accent (#DC2626):** Reserved for high-priority Call-to-Actions (CTAs) and destructive actions.
- **Surface & Background:** The Slate 50 background provides a soft canvas that reduces eye strain, while pure white surfaces indicate interactive or content-heavy containers.
- **Status Colors:** Success and Warning tokens are calibrated for WCAG 2.1 accessibility, ensuring clear communication of system states without relying solely on color.

## Typography
The typographic scale is optimized for readability. **Plus Jakarta Sans** provides a modern, approachable feel for headers, while **Inter** is utilized for body text and data grids due to its exceptional legibility in dense environments.

To accommodate an older user base, the base body size is set to **16px**, with a preference for **18px** in long-form descriptions. Line heights are kept generous (1.5–1.6) to prevent text lines from blurring together during extended use.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy within a fluid container. A standard 12-column grid is used for dashboard views, while data-entry forms utilize a centered 8-column layout to reduce horizontal scanning.

- **Sidebar Navigation:** A fixed 280px sidebar persists on the left, providing immediate access to core ERP modules.
- **Rhythm:** A 8px (0.5rem) base unit governs all spacing. Page headers and primary content blocks are separated by 24px (1.5rem) of padding to maintain a clean, airy feel even when the system is data-heavy.
- **Responsive Behavior:** On tablet devices, the sidebar collapses into a rail or hamburger menu, and internal gutters reduce to 1rem to maximize screen real estate.

## Elevation & Depth
This design system avoids heavy drop shadows in favor of **Tonal Layers** and subtle ambient depth. 

- **Level 0 (Background):** Slate 50 (#F8FAFC) is the lowest layer.
- **Level 1 (Cards/Tables):** Pure white surfaces with a 1px Slate 200 border.
- **Level 2 (Dropdowns/Modals):** Soft, diffused shadows (0px 4px 20px rgba(30, 58, 138, 0.08)) are used to lift active interactive elements above the workspace.
- **Level 3 (Alerts):** High-contrast colored borders (Red or Blue) to draw immediate attention.

## Shapes
The shape language is consistently "Rounded" to soften the industrial nature of ERP data. 

- **Standard Elements:** Buttons, Input fields, and Chips use a **0.75rem** radius.
- **Large Containers:** Cards and Modals use a **1rem** radius.
- **Interactive States:** Focus rings follow the curvature of the element with a 2px offset to ensure accessibility for users with visual impairments.

## Components
Consistent component behavior is critical for user efficiency.

- **Buttons:** Primary buttons are Royal Blue. High-Contrast CTAs (e.g., "Submit Order" or "Delete") use the Red accent. All buttons have a minimum height of 48px to provide large hit areas for touch or mouse precision.
- **Data Tables:** Tables use a "Zebra-Striping Lite" approach (alternating Slate 50 rows) with 1rem of vertical cell padding. Headers are sticky and use the `label-md` typography style.
- **Input Fields:** Use a 1px border (#CBD5E1) that transitions to a 2px Royal Blue border on focus. Labels always persist above the field for clarity.
- **Sidebar:** Icons are paired with text labels at all times. The active state is indicated by a vertical Royal Blue bar on the left edge and a subtle tint behind the menu item.
- **Chips/Badges:** Used for status (e.g., "Pending", "Complete"). They use a light background tint of the status color with high-contrast text for maximum legibility.