# Tesseract — Design System

> **Authoritative token reference** for Tesseract's frontend. If a component hardcodes a color value, refactor it to use a token here. If you need a new token, add it here AND in [`apps/web/src/index.css`](apps/web/src/index.css) AND expose it via [`apps/web/tailwind.config.js`](apps/web/tailwind.config.js) — all three or none.
>
> Direction: **Geometric Arcade Terminal** — always-dark, brand-yellow accent, sharp corners (`--radius: 0`), monospace ornament + display headlines.

---

## 1. Brand colors

The Tesseract logo runs through six fixed hues. Each is an HSL-tuned, full-saturation color.

| Token | Hex | Usage |
|---|---|---|
| `--c-red` | `#ff3b3b` | error / destructive accent, "wrong" feedback |
| `--c-orange` | `#ff8a3b` | warning, transition state |
| `--c-yellow` | `#ffd93b` | **brand** — primary buttons, focus rings, logo, headline accent |
| `--c-green` | `#5eff7a` | success, active state, "right" feedback |
| `--c-blue` | `#3bb0ff` | info, link |
| `--c-purple` | `#a855f7` | rare ornament accent |

Compose them into the canonical logo gradient via `--grad-logo`.

### Soft yellow

`--c-yellow` is the brand color and reads as **harsh** when used as a flat fill on large surfaces. For backgrounds, gradient stops, large text blocks, and page headers, use the soft variant:

| Token | Hex | Use it for |
|---|---|---|
| `--c-yellow-soft` | `#c9a02e` | text and bordered fills on dark surfaces (≈9:1 contrast on `#000` — passes AA-large at 18 px) |
| `--c-yellow-soft-bg` | `rgba(201, 160, 46, 0.12)` | tinted surface fills (banners, callouts) |
| `--c-yellow-soft-fg` | `#1a1304` | text color when sitting on top of a `--c-yellow-soft` background |

**Rule of thumb:** anything bigger than a 200px-wide button or a one-line label should not be the bright `#ffd93b`. Use soft yellow.

Tailwind exposes `bg-yellow-soft`, `text-yellow-soft`, `border-yellow-soft`, `bg-yellow-soft-bg`.

---

## 2. Text tier

All text colors are layered onto white at decreasing alpha. Each entry was contrast-checked against `--surface-0` (`#000`), `--surface-1` (`#0d0d12`), and `--surface-3` (`#1d1d28`).

| Token | Value | WCAG on `#000` | WCAG on `#1d1d28` | Use |
|---|---|---|---|---|
| `--fg` | `rgba(255,255,255,1)` | 21:1 ✅ AAA | 17:1 ✅ AAA | body text, headlines |
| `--fg-dim` | `rgba(255,255,255,0.78)` | 13:1 ✅ AAA | 11:1 ✅ AAA | secondary body, sub-headlines |
| `--fg-mute` | `rgba(255,255,255,0.62)` | 8.5:1 ✅ AA | 7:1 ✅ AA | labels, helper text, captions |
| `--fg-faint` | `rgba(255,255,255,0.45)` | 4.6:1 ✅ AA-large | 3.8:1 ✅ AA-large | least-important hints, footer meta — **always pair with text-size ≥14 px** |

Tailwind exposes `text-fg`, `text-fg-dim`, `text-fg-mute`, `text-fg-faint`.

The shadcn-derived `text-muted-foreground` token also resolves to the AA-passing `--muted-foreground: 0 0% 65%`. Both are safe.

---

## 3. Surface elevation

Cards lift visibly off the page; popovers lift visibly off cards; input fields are visibly distinct from their containing card.

| Token | Hex | Use |
|---|---|---|
| `--surface-0` | `#000000` | page background (under `<Layout>`) |
| `--surface-1` | `#0d0d12` | cards, panels, sidebar |
| `--surface-2` | `#161620` | popovers, modals, dialogs, raised callouts |
| `--surface-3` | `#1d1d28` | input field backgrounds |
| `--surface-hover` | `#22222e` | interactive hover state for any surface |

Tailwind exposes `bg-surface-0` … `bg-surface-3` and `bg-surface-hover`.

The legacy `--bg`, `--bg-1`, `--bg-2` aliases (consumed by `.lb-*` classes) still map to `#000`, `#0a0a0f`, `#111118` respectively. Prefer the `--surface-*` tokens for new code.

---

## 4. Border tier

Three explicit weights:

| Token | Value | Use |
|---|---|---|
| `--border-subtle` | `rgba(255,255,255,0.08)` | dividers, scanline overlays, very low-emphasis edges |
| `--border-default` | `rgba(255,255,255,0.16)` | **default** for cards, fields, buttons |
| `--border-strong` | `rgba(255,255,255,0.28)` | hover state, emphasized callouts, "selected" outlines |

Tailwind exposes `border-edge-subtle`, `border-edge-default`, `border-edge-strong`.

Legacy aliases `--line` (now `0.12`) and `--line-2` (now `0.20`) are kept for `.lb-*` classes — both bumped from their old `0.08`/`0.14` values to clear the V1 invisible-border bug.

The shadcn `--border` token is set to `0 0% 18%` (≈`#2e2e2e` solid) — it's used by `border-border` (Card, Dialog) and is now visibly present.

---

## 5. State tokens

| Token | Value | Use |
|---|---|---|
| `--error` | `#ff3b3b` (= `--c-red`) | error border, error icon, error indicator |
| `--error-bg` | `rgba(255,59,59,0.10)` | error container fill |
| `--error-fg` | `#ff8a8a` | error message text — softer red for legibility |
| `--success` | `#5eff7a` (= `--c-green`) | success border |
| `--success-bg` | `rgba(94,255,122,0.10)` | success container fill |
| `--focus-ring` | `0 0 0 2px var(--c-yellow), 0 0 0 4px rgba(255,217,59,0.18)` | focus shadow on inputs/buttons (use as `box-shadow`) |
| `--focus-ring-soft` | analogous, using `--c-yellow-soft` | focus shadow when the brand yellow would clash |

Tailwind exposes `text-error`, `bg-error-bg`, `text-error-fg`, `text-success`, `bg-success-bg`.

---

## 6. Form primitives

Every form in Tesseract uses one of two primitives. Both speak the same tokens.

### `.t-input` / `.t-select` / `.t-textarea` (defined in [index.css](apps/web/src/index.css))

CSS classes for hand-rolled forms. Token-driven, dark-themed, with built-in:

- **Default:** `--surface-3` fill, `--border-default` border, `--fg` text, `--fg-faint` placeholder
- **Hover:** `--border-strong`
- **Focus:** `--c-yellow` border + `--focus-ring` shadow
- **Disabled:** `--surface-2` fill, opacity `0.55`
- **Error:** `--error-bg` fill, `--error` border (set `aria-invalid="true"` or add `.t-input--error`)

```html
<div class="t-field">
  <label class="t-label t-label-required" for="email">Email</label>
  <input id="email" class="t-input" aria-invalid="false" />
  <p class="t-help">Use your IITM Google account.</p>
</div>

<div class="t-field">
  <label class="t-label" for="bio">Bio</label>
  <textarea id="bio" class="t-textarea"></textarea>
</div>
```

Error message:

```html
<p class="t-error">Display name must be at least 3 characters.</p>
```

### `<Input>` / `<Textarea>` / `<Label>` (shadcn primitives in [components/ui/](apps/web/src/components/ui/))

React components for form-library-driven forms (react-hook-form + zod). They internally use the same tokens — **no light-theme leakage**. See [components/ui/input.tsx](apps/web/src/components/ui/input.tsx).

A new shared error component lives at [components/ui/form-error.tsx](apps/web/src/components/ui/form-error.tsx) — use it for inline field errors:

```tsx
<Label htmlFor="email" required>Email</Label>
<Input id="email" type="email" aria-invalid={!!errors.email} />
<FormError>{errors.email?.message}</FormError>
```

### Required-field marker

- CSS: add `.t-label-required` to the `<label>` — appends a yellow asterisk.
- React: pass `required` prop to `<Label required>...</Label>`.

### Submit + cancel buttons

Always visually distinguishable. Use `lb-btn-primary` (yellow fill, black text) for submit, `lb-btn-ghost` (no fill, border) for cancel. Two ghost buttons side by side is a bug.

---

## 7. Typography scale

| Family | Use | Tailwind |
|---|---|---|
| Audiowide / Orbitron | Display headlines (uppercase, tight tracking) | `font-display` |
| Inter | Body, paragraphs | `font-sans` |
| JetBrains Mono | Labels, kickers, ornament, code | `font-mono` |

Headline rule: all `<h1>`–`<h6>` are `text-transform: uppercase` and `font-display` by default.

---

## 8. Spacing & shape

- `--radius: 0` — every corner is sharp. Tailwind's `rounded-*` utilities collapse to `0` because shadcn radii are derived from `--radius`. If a component needs rounding, override locally and document why.
- Bracket ornament (`<Brackets>`) provides chamfered corners without breaking the no-radius rule.
- Density: 12–16px padding for cards, 12–14px for inputs. Form-field gap = 6px; between fields = 16px.

---

## 9. Animation

- Framer Motion is loaded. Use sparingly — preferred for entrance staggers, hero parallax.
- CSS keyframes are fine for ornament (scanlines, ring spin, button shimmer).
- Respect `prefers-reduced-motion` in any new animation.

---

## 10. Accessibility

- All text-on-background pairs documented above pass WCAG **AA** (4.5:1 body, 3:1 large at 18px+).
- `--fg-faint` is the one exception: AA-large only, never use under 14px.
- Focus is always visible — every interactive element gets a focus shadow via `--focus-ring`.
- Disabled state: ≥0.55 opacity (so the element is still readable but visibly inactive).

---

## 11. Adding a new token

1. Add the CSS variable to **both** `:root` and `.dark` blocks in [`apps/web/src/index.css`](apps/web/src/index.css). Tesseract is always-dark, but shadcn primitives reference `.dark` at runtime — keep them in sync.
2. Expose it under `theme.extend.colors` in [`apps/web/tailwind.config.js`](apps/web/tailwind.config.js).
3. Document it here, including its WCAG contrast on the surfaces it's expected to sit on.
4. Run a quick contrast audit on at least one usage; reject if below AA without an explicit AA-large justification.
