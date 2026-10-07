# Glass UI verification

The app and landing page share surface recipes in `packages/shared/src/glass.css`
and theme tokens in `packages/shared/src/theme.css`. Floating sheets use the native
dialog top layer, with focus wrapping/restoration, nested scroll locks, Escape and
backdrop dismissal, and visual-viewport sizing.

## Repeatable browser check

Run `node scripts/desktop-menu-smoke.cjs` against a local production server to
check the signed-in sidebar with a long email and large balance, in English and
Myanmar at three desktop sizes including a short window. It uses a fake local
session and intercepts every backend request. It checks menu and header widths,
email truncation, and access to every navigation item and the sign-out button.

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

## Quick Add and data export

Run `node scripts/mobile-popups-smoke.cjs` with normal motion to capture the first
native opening frame of every dialog (Quick Add, Export from Reports and Settings,
report filters and nested sign-up). It verifies visible titles, static initial focus,
keyboard panning, reopening, and nested scroll restoration at four mobile sizes.
Set `BROWSER_ENGINE=webkit` and omit `BROWSER_EXECUTABLE` to run with an installed
Playwright WebKit browser. All dialog sheets share stable geometry and focus their
titles before native opening; keyboard focus is not placed on a mobile form field.

Run `node scripts/quick-add-smoke.cjs` for touch-device opening with normal motion,
scroll restoration, keyboard viewport resizing/panning and reopening at five sizes.
Run `node scripts/data-export-smoke.cjs` to verify real JSON/CSV downloads from
Reports and Settings, inclusive month/date ranges, invalid and empty ranges,
category labels and mobile layouts. Both use the browser variables above.

Run `node scripts/data-export-test.cjs` without a server to check leap-day boundaries,
precise money totals, missing/archived category labels, CSV escaping and spreadsheet
formula handling, and history pagination beyond 1,000 rows, including page failures.

JSON exports include selected transactions and budgets, categorized summaries,
and current settings for context. CSV exports contain labeled transaction rows.
Exports identify demo data, cached snapshots and pending sync changes. Periods use
recorded calendar dates, including both endpoints; current settings are not historical
snapshots. Archived settings are excluded by the existing app data model, so retained
transactions use explicit unknown/archived labels when their settings are unavailable.

## Report drill-downs

Run `node scripts/report-drilldown-test.cjs` without a server to verify combined
report filters, compatible category/subcategory selections, missing subcategories,
and year-boundary amounts. Run `node scripts/report-drilldown-smoke.cjs` against
the local production server with the browser variables above. It uses a fake local
session and intercepts every backend request, with no writes or real account data.
The fixture covers trend month bars and labels, daily points, category/subcategory/
account rows, both comparison months and totals, empty results, combined filters,
70-entry pagination, focus and scroll, keyboard/touch activation, and reduced/normal
motion at mobile and desktop widths. Screenshots are saved in `artifacts/ui`.
