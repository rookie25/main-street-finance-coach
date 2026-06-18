# App icon source (Capacitor → Android launcher icon)

This folder is the **source** for the Android app launcher icon. `@capacitor/assets`
(Easy Mode) reads a single logo here and generates every Android density.

## How to set the app icon

1. Drop your icon in this folder as **`logo.png`**:
   - At least **1024×1024 px**, square, PNG.
   - Transparent background is fine (the adaptive icon gets a background color below).
   - Keep the mark within the centre ~66% — Android's adaptive icon crops the edges
     (a circle/squircle mask), so don't put anything important near the corners.
   - Optional: add `logo-dark.png` for a dark-mode variant.

2. From the repo root, run:
   ```
   npm run generate:assets
   ```
   (defaults to a white adaptive-icon background; to set a brand colour, run the
   tool directly, quoting the hex for your shell, e.g.
   `npx capacitor-assets generate --android --iconBackgroundColor "#0f3d2e"`)

3. This regenerates:
   - `android/app/src/main/res/mipmap-*/ic_launcher*.png` (legacy + round)
   - `android/app/src/main/res/mipmap-anydpi-v26/` + `drawable*/` (adaptive icon)

4. **Commit** the generated `android/.../res/...` files **and** this `logo.png`,
   so CI (`android-release.yml`, triggered by the `android-v*` tag) builds the
   `.aab` with the real icon. The generation step is local/one-time — CI just
   compiles the committed resources.

## Notes
- The store listing icon (512×512) is a **separate** asset for Play Console — see
  `Groundstack/09_documentation/PLAY_STORE_LISTING.md` Part 2. This folder only
  drives the on-device launcher icon.
- The current `android/.../res` icons are the default Capacitor placeholders until
  you run the step above.
