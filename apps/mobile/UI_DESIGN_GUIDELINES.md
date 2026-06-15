# Club OS — Mobile UI Design Guidelines

This document captures the UI conventions used across the Club OS mobile app
(`apps/mobile`). Follow these when adding new screens or components so the app
stays visually consistent. When in doubt, copy an existing screen that is the
closest match rather than inventing new structure.

---

## 1. Foundations

### Theme
- **Single light theme.** All colors come from the `colors` object in
  [src/styles.ts](src/styles.ts). Never hard-code hex values in components —
  add or reuse a token in `colors` instead.
- The few inline hex values that remain (e.g. white button text `#ffffff`) are
  the exception, not the rule. Prefer a token.

### Color tokens (`colors`)
| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#f7f8fa` | Screen background |
| `surface` | `#ffffff` | Cards, sheets, raised surfaces |
| `surfaceAlt` | `#f1f3f6` | Inputs, metric tiles, subtle fills |
| `border` | `#e3e6ea` | Default borders |
| `borderSoft` | `#eef0f3` | Row dividers / separators |
| `textPrimary` | `#1a1d21` | Headings and primary text |
| `textSecondary` | `#5b626c` | Secondary text, labels |
| `textMuted` | `#8a909a` | Meta text, placeholders, timestamps |
| `accent` / `brand` | `#3a6ff7` | Primary actions, links, active states |
| `accentSoft` | `#e6eefe` | Inline/secondary button background |
| `green` | `#16a34a` | Paid / positive / income |
| `red` | `#dc2626` | Errors, overdue, expense, destructive |
| `amber` | `#d97706` | Warnings |

### Typography scale
There is no separate font-size constant file; sizes live in named styles.
Reuse these rather than ad-hoc font sizes:
- **Screen / card heading:** `authHeading` or `cardTitle` — 20–22, weight 700.
- **Section subheading:** `subTitle` — 16, weight 700.
- **Body / row title:** `memberName` — 16, weight 600.
- **Secondary text:** `memberMeta` / `authSubtext` — 14, secondary color.
- **Meta / timestamps:** `metaText` — 12, muted.
- **Field label:** `inputLabel` / `fieldLabel` — 13, weight 600, secondary.

### Spacing & shape
- Card/sheet corner radius: **14–18**. Inputs/buttons: **10**. Pills/badges: **999**.
- Standard content padding: **20** (`container`), card padding **16**, sheet
  padding **18** with `paddingBottom: 40`.
- Vertical rhythm uses `gap` (10–14) on containers, not margins, wherever
  possible.

---

## 2. Screen scaffolds

Every screen is wrapped in one of three shells. **Do not** build a raw
`SafeAreaView` per screen — pick the matching shell.

### `OnboardingShell` — pre-club / auth-style screens
[src/components/OnboardingShell.tsx](src/components/OnboardingShell.tsx)
- Used by: sign-in, home (club list), create club, profile setup, member
  onboarding, membership requests.
- Centered content on `bg`, brand `Logo` on top, `KeyboardAvoidingView`,
  `keyboardShouldPersistTaps="handled"`, and a subtle **Sign out** link when a
  session exists.
- Screens supply their own `authCard` blocks as children.

### `TabScreenShell` — inside-a-club tab screens
[src/components/TabScreenShell.tsx](src/components/TabScreenShell.tsx)
- Used by: Members, Activity, Economy, Setup tabs.
- Renders the `ClubHeader` (club avatar, name, role, switch chevron) then a
  scrollable `container`.
- Pass `showLoading` to show a centered spinner while `loading`.

### Sign-in screen
[app/index.tsx](app/index.tsx) is the reference implementation for the
`auth*` visual style (logo, `authCard`, `inputLabel` + `input`, primary
`AppButton`, footer link). New auth-adjacent screens should mirror it.

---

## 3. Core building blocks

### Cards
- **`card`** — standard in-club content card (surface, radius 14, border,
  padding 16, `gap` 10).
- **`authCard`** — onboarding card; same idea with a soft shadow/elevation and
  radius 18. Stack multiple with `marginTop: 16`.

### Buttons
- **Primary action:** always the shared `AppButton`
  ([src/components/AppButton.tsx](src/components/AppButton.tsx)) — solid
  `brand` fill, white text, auto disabled-opacity. One primary action per card.
- **Secondary / inline action:** `inlineButton` + `inlineButtonText` (soft
  accent background, accent text) for row-level actions like "Generate dues".
- **Link action:** `inviteLink` / `inviteLinkText` (accent text, no fill) for
  low-emphasis actions and the "＋ New" pattern.

### "＋ New" + edit-modal pattern
This is the standard way to create/edit list items (used in Economy dues plans
& cycles). Reuse it for any manageable collection:
- A `sectionHeaderRow` with the title/subtitle on the left and a
  `inviteLink`/`inviteLinkText` showing the literal `＋ New` on the right.
- Tapping a list row opens the **same** modal in edit mode (prefilled);
  `＋ New` opens it empty. One modal serves both create and edit.

### Bottom-sheet modals
Used for all create/edit/detail forms. Structure:
```tsx
<Modal transparent animationType="slide" visible={open} onRequestClose={close}>
  <Pressable style={styles.sheetBackdrop} onPress={close}>
    <Pressable style={styles.sheet} onPress={() => {}}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>{editing ? "Edit …" : "New …"}</Text>
      <ScrollView
        contentContainerStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* fields + a single primary AppButton */}
      </ScrollView>
    </Pressable>
  </Pressable>
</Modal>
```
- Backdrop press closes; inner press is swallowed (`onPress={() => {}}`).
- `sheet` already includes `paddingBottom: 40` for safe spacing above the edge.
- Title reads `Edit …` vs `New …` based on whether an id is being edited.

### Inputs
- Always `styles.input` with `placeholderTextColor={colors.textMuted}`.
- Precede important inputs with an `inputLabel`.
- Set proper keyboard props (`keyboardType`, `autoCapitalize="none"` for email,
  `autoComplete`/`textContentType` for phone & OTP).

### Segmented selectors
For small enum choices (e.g. Income/Expense, frequency, Manual/Auto) use the
`segmentRow` + `segment` / `segmentActive` + `segmentText` / `segmentTextActive`
styles rather than a picker.

### Lists & rows
- Use `FlatList` with `ItemSeparatorComponent` rendering `styles.separator`,
  and `scrollEnabled={false}` when nested inside the shell's `ScrollView`.
- Row title `memberName`, secondary line `memberMeta`, trailing meta
  `metaText`. Tappable rows are `Pressable` with an `accessibilityRole`/
  `accessibilityLabel`.

### Status colors
Map state to the semantic helpers: `paid` (green), `unpaid` (red), `warn`
(amber), `muted` (secondary). Income is `paid`/`+`, expense is `unpaid`/`-`.

---

## 4. Content & copy

- **No step numbers** in headings (no "1. …", "2. …").
- **No filler subtext.** Drop lines that restate the obvious ("New members need
  basic information…"). Keep only copy that helps the user act.
- Headings are short noun phrases: "Your clubs", "Create a club", "Join the
  club", "Membership requests".
- Buttons are concise verb phrases: "Create club", "Save and continue",
  "Accept invitation".
- Use real typographic glyphs already adopted in the codebase: `＋` (fullwidth
  plus), `·` middot (`\u00b7`), `₹` rupee (`\u20b9`), `×` (`\u00d7`),
  `✎` pen/edit (`\u270E`). Avoid icon libraries — the app intentionally has no
  `@expo/vector-icons` dependency.

---

## 5. Accessibility

- Tappable non-button elements get `accessibilityRole="button"` and a
  descriptive `accessibilityLabel` (e.g. `Edit plan ${name}`, `New dues plan`).
  Tests rely on these labels, so keep them stable and meaningful.
- Maintain text contrast by using `textPrimary`/`textSecondary` on light
  surfaces; reserve `textMuted` for non-essential meta.

---

## 6. Conventions & constraints

- **No new dependencies** for UI. Build from React Native primitives + the
  existing style tokens. The brand `Logo` is drawn from native `View`s, not SVG.
- **Centralize styles.** Add shared styles to `src/styles.ts`; only use inline
  styles for one-off layout tweaks (e.g. `marginTop`). Remove styles that become
  unused when you delete a screen.
- **State & data** flow through `useClubOs()` ([src/ClubOsContext.tsx](src/ClubOsContext.tsx));
  screens stay presentational. Toast feedback uses the context's
  `setInfoText` / `setErrorText` helpers.
- **Verify before done:** `npm run format`, `npx tsc --noEmit`, and `npx jest`
  must all pass. Update label-based test assertions when you rename headings or
  buttons.

---

## 7. Quick checklist for a new screen

1. Pick the right shell (`OnboardingShell` vs `TabScreenShell`).
2. Wrap content in `card` / `authCard`; one short heading, no step numbers.
3. Inputs via `styles.input` + `inputLabel`; correct keyboard props.
4. One primary `AppButton`; inline/link styles for secondary actions.
5. Collections use the `＋ New` + shared edit-modal (bottom sheet) pattern.
6. Colors and sizes from tokens/named styles only — no raw hex, no ad-hoc fonts.
7. Add `accessibilityLabel`s to tappable rows.
8. Run format, tsc, and jest.
