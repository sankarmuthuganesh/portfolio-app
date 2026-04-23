

## Three updates to the home page and profile

### 1. Remove "Selected work" eyebrow text
In `src/pages/Index.tsx`, remove the small uppercase "Selected work" label that sits above the "Featured Projects" heading. The heading stays.

### 2. Add a "Vision" section to the profile
Add a new optional `vision` field to the profile so you can share what drives you / what you're working toward.

- **Data (`src/lib/portfolio.ts`)**: Add `vision: string` to `ProfileData`. Default it to a short placeholder like *"Building tools that make people's everyday work feel a little more delightful."* Merge safely in `getProfile()` so existing saved profiles still load.
- **Profile card (`src/pages/Index.tsx`)**: Below the bio, render a new block (only if `vision` is non-empty):
  - Small uppercase label `Vision` in the primary accent color
  - The vision text in soft foreground, with `whitespace-pre-line`
  - Separated from the bio by a subtle divider (matches the existing Skills divider style)
- **Admin editor (`src/pages/Admin.tsx`)**: In the Profile tab, add a `Textarea` field labeled "Vision" between Bio and the Skills editor, wired to the profile state and saved via the existing `handleSaveProfile`.

### 3. Redesign skills as icon + label tiles (no hover tooltip)
Replace the current 4-column compact grid of icon-only squares with larger tiles that show **icon and name together**, always visible.

- **Layout (`src/pages/Index.tsx`)**: Change the skills grid from `grid-cols-4` (icon-only squares) to `grid-cols-2` tiles. Each tile:
  - Rounded card with `bg-muted/60`, subtle border, comfortable padding
  - Icon (larger, ~`text-2xl`) on the left
  - Skill name in normal weight on the right, truncated if long
  - Hover: gentle scale + primary tint background
  - Remove the `title` attribute since the name is now visible
- Skills data shape stays the same (`{ name, icon }`), so the admin skill editor needs no changes.

### Files to change
- `src/lib/portfolio.ts` — add `vision` to `ProfileData`, `DEFAULT_PROFILE`, and merge logic in `getProfile()`
- `src/pages/Index.tsx` — remove "Selected work", add Vision block, redesign skills grid
- `src/pages/Admin.tsx` — add Vision textarea in the Profile tab

