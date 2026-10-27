# Browser verification — 27 October 2026

The current source passed **15 regression groups, 12 purchase/header groups and 10 motion groups** in Playwright 1.64.1 with installed headless Google Chrome 155.0.8059.85 on Windows (Node.js v24.11.0). The website was served under **/BloomCart/**. Raw current results are in [browser-results.json](browser-results.json), [purchase-results.json](purchase-results.json) and [motion-results.json](motion-results.json). The first two suites use reduced motion for most functional checks; the motion suite explicitly uses normal animation timings and also tests reduced motion.

## Animation checks actually run

| Check | Actual result |
| --- | --- |
| Drawer/backdrop motion | Browser animation keyframes and timings showed a 270ms horizontal slide and opacity fade; overlay/backdrop stayed visible through exit; focus trap, inert background and scroll lock persisted until completion; header position did not shift |
| Product dialog | Fade, 10px movement and 0.98 scale verified in keyframes; Escape/close/backdrop each animated out, restored focus and added nothing |
| Immediate purchase feedback | Same-turn inspection showed quantity 3 already in cart/localStorage and $162.00 total while the dialog was still closing; success label and disabled confirmation present; rapid click/submit events did not add twice |
| Badge/toast | 200ms pulse peaked at 1.12 scale; toast entrance used 180ms; drawer did not open automatically |
| Toast lifecycle | Real 5.2-second hover and focus waits kept it visible; leaving resumed expiry; closing remained visible until exit completion; explicit dismissal and View cart worked |
| Interrupted drawer/dialog exit | Reopening after 60–70ms reversed from the sampled position; drawer position differed by less than 2px at reversal; old completions did not hide the reopened overlay or clear its locks/backdrop |
| Rapid interactions | Twelve same-turn drawer open/close cycles cleaned up; switching from confirmed purchase to drawer kept only one modal visible; replacing a toast during an older exit did not hide the new message; badge quantities remained correct |
| Reduced motion | No modal/toast animations or badge pulse; transitions disabled; preference changed during an active exit finished it and released backdrop/locks |
| Layout | Normal animated overlays tested at 320/390/768/1024/1440px and 700px height without horizontal overflow; 320×380 invalid-input dialog scrolled internally |
| Controls and touch | 180ms transitions, focus outline and pressed scaling checked; card pressed state overrides hover; touch-emulated 390px device had no hover transform and toast expired after tapping its message |
| Errors | Zero console/page errors or failed assets/requests in motion suite |

The motion checks inspect actual browser animations and intermediate closing states, not only their final visibility. Screenshots from the other suites were refreshed at settled reduced-motion states. Touch testing is browser emulation, not a physical device.

## New flow: checks actually run

| Check | Actual result |
| --- | --- |
| Header normal/hover/focus/pressed/current | No underlines; link boxes at least 44px high; 0.2s transitions; blush hover/pressed; 3px keyboard-focus outline; forest-green current state |
| Section tracking | Home, Shop and About anchors selected exactly one current link; independent scrolling updated it; reduced-motion mode disabled transitions |
| Opening product dialog | Correct photo decoded, product name and $54.00 unit price; initial quantity 1 and $54.00 total; badge stayed 0 and storage stayed untouched |
| Quantity controls | Plus/minus changed 1 to 2 and back; totals $54/$108/$162; 99 showed $5,346.00; boundary buttons disabled |
| Invalid input | Blank, nonnumeric typing, fractional, negative, zero, excessive and exponent-style values were blocked with inline error, aria-invalid, input focus and an unavailable total; no cart additions |
| Dialog accessibility | Entry focus on Close; forward/reverse Tab wrapped; 12 Tabs remained inside; main/header/footer/skip link/toast inert; background focus prevented; body scrolling locked |
| Cancellation | Escape, Close and backdrop dismissed without adding; focus returned to Choose quantity; reopening reset to 1 |
| Exact confirmation and duplicate guard | Three rapid click/submit events added exactly 3 red bouquets once; badge 3, line/subtotal $162.00; JSON stored quantity 3; dialog closed and drawer remained closed |
| Toast and live status | Correct 3 × product confirmation; polite region updated; focus stayed on the product trigger |
| Toast hover/focus pause | Still visible after 5.2 seconds while hovered; still visible after 5.2 seconds while keyboard-focused; after leaving focus it expired within a further 5.2 seconds |
| View cart and Dismiss | View cart dismissed toast and opened only the drawer, focused Close and showed $162.00; closing returned to header Cart; explicit toast dismissal worked |
| Capacity edge | Existing 5 + requested 95 rejected without truncation; 5 + 94 added exactly to 99; further addition rejected; reload retained 99 |
| Responsive overlays | At 320, 390, 768, 1024 and 1440px: dialog/toast stayed within width; dialog fit 700px height; mobile navigation and cart worked; no horizontal document overflow; 320×380 error state scrolled internally |
| Screenshots | Real desktop/mobile purchase dialogs and mobile toast captured and visually inspected |
| Browser errors | No console errors, uncaught exceptions, failed HTTP assets or failed requests in the purchase suite |

## Existing functionality rerun with the new confirmation flow

- Twelve-card catalog under a repository prefix; all 13 existing photographs decode at all five requested widths.
- All five category choices × four query cases × all three sorting options: **60 combinations** matched expected product order.
- Reset restored blank query, All and Featured; all navigation links, hero CTA, skip link and search Enter worked.
- Repeated/multiple purchases: two $54 red bouquets and one $48 blush bouquet gave badge 3 and $156.00. Drawer increase gave badge 4 and $210.00; decrease and removal restored expected amounts.
- Drawer quantity changes retained keyboard focus; final decrement produced empty state, badge 0 and $0.00.
- Reload persistence; malformed JSON, array/null roots, unknown IDs, noninteger/string/boolean/null/negative/zero/excessive quantities rejected; valid 1/99 entries retained.
- Drawer entry focus, both Tab directions, inert background, Escape/Close/backdrop, scroll lock and focus return.
- Mobile Enter/Space/Escape and aria-expanded; menu closes on link/open-cart/desktop resize; open drawer survives resizing.
- Sticky header stays at top during scrolling and catalog anchor clears its measured height at all five widths.
- Fresh full-page desktop/mobile catalog screenshots; no console or page errors or failed HTTP asset responses.

## Implementation and resolved issues

All changes reuse the existing product data and cart state in js/app.js. Added shared openModal/closeModal focus handling, purchase validation, duplicate-submit guard, pausable toast and scroll-aware current navigation. Existing colors, typography, product cards, images and catalog layout are preserved. Per-product capacity errors explain the existing 99-item limit instead of silently reducing a confirmed addition. Disabled quantity boundary buttons transfer focus to the numeric field. View cart returns focus to the persistent Cart trigger because its toast is dismissed.

Syntax checks passed for js/app.js, docs/browser-check.cjs and docs/purchase-check.cjs. Event bindings, integer-cent arithmetic and storage-error handling were inspected in code. Source licensing credits remain unchanged from the previously verified photographs.

Test-harness fixes during this run: measure the full bordered link box instead of clientHeight; blur the header link without focusing a sticky element that scrolls the page; preserve Unicode expectations in the test file. Failed intermediate checks were corrected and rerun before reporting the passing results.

## Repeat locally

From the parent containing BloomCart, start the server in one terminal:

```powershell
node BloomCart/docs/serve.cjs .
```

In a second terminal in that same directory:

```powershell
npm.cmd install --no-save --package-lock=false playwright@1.64.1
node BloomCart/docs/browser-check.cjs
node BloomCart/docs/purchase-check.cjs
node BloomCart/docs/motion-check.cjs
```

All three scripts use Chrome at C:/Program Files/Google/Chrome/Application/chrome.exe; adjust executablePath if needed. Website operation does not require Playwright or node_modules. The scripts operate actual browser controls and DOM; they do not call private app functions. The toast tests use real elapsed time. TEST_URL can target a separately extracted package under another prefix; that mode checks screenshot files instead of replacing them.

## Archive verification

The submission archive is rebuilt outside BloomCart and extracted into a temporary folder. All three browser suites run against the extracted site under a prefix. Current package evidence is saved as package-browser-results.json, purchase-package-results.json and motion-package-results.json. A final extraction compares every file with the source by SHA-256 and checks archive exclusions for .git, node_modules and temporary files. This includes the refreshed documentation, five screenshots and all local photos.

## Unverified behavior and limitations

Tests used headless Chrome with viewport emulation. Safari, Firefox, physical touch devices, virtual mobile keyboards and screen-reader speech were not tested. Live-region text/ARIA and keyboard behavior were checked; assistive-technology announcement quality remains unverified. Disabled/full localStorage is handled in code but was not simulated. No actual GitHub Pages deployment, real checkout, payment or backend exists; no publishing or submission was performed.
