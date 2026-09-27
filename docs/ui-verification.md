# Glass UI verification

The app and landing page share surface recipes in `packages/shared/src/glass.css`
and theme tokens in `packages/shared/src/theme.css`. Floating sheets use the native
dialog top layer, with focus wrapping/restoration, nested scroll locks, Escape and
backdrop dismissal, and visual-viewport sizing.

## Repeatable browser check

Start the app on port 3100 and optionally the landing page on 3101. With Playwright
available, run `node scripts/ui-smoke.cjs`. Environment variables:

- `UI_URL`: app URL (default `http://localhost:3100`).
- `UI_LANDING_URL`: optional landing URL.
- `PLAYWRIGHT_MODULE`: optional path to an existing Playwright package.
- `BROWSER_EXECUTABLE`: optional system Chromium/Edge executable.
- `UI_SCREENSHOTS`: output directory (default `artifacts/ui`, ignored by Git).

The check uses bundled demo data without saving changes. It covers seven tabs at
360, 768, 1280 and 1600 pixels; visible edit forms; dark mode; Burmese typography;
menu dismissal; sheet focus and restoration; a short viewport; nested sign-up
dialogs; report filters; and clearing the month selector. Screenshots are saved
for visual review. The development-only Next badge is hidden to prevent it from
intercepting dock taps; browser runtime errors still fail the check.

Run both workspace production builds and the shared package type check as well.
Builds require access to Google Fonts. Browser automation uses Chromium; physical
iOS/Android keyboard behavior, notches and GPU performance still need device QA.
