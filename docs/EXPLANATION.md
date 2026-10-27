# Explaining BloomCart

Author: Mario El Helou.

## How HTML, CSS and JavaScript connect

index.html defines the sticky header, search, hero, collection controls, empty grid, About section, footer and initially hidden cart. It links css/styles.css for appearance. It loads js/products.js before js/app.js with defer, so the document is parsed before scripts run and their order is preserved. Product data becomes window.PRODUCTS. app.js reads it, attaches listeners and renders the filters, grid and cart. Element IDs such as grid, search and subtotal connect JavaScript to the HTML through the $() helper.

## Grid, Flexbox and breakpoints

In css/styles.css, .hero is a two-column Grid on desktop. The product .grid uses repeat(auto-fill,minmax(min(100%,240px),1fr)): columns fit the available width, and a single column can shrink to a phone. Images use square slots and object-fit:cover to crop without stretching.

Flexbox aligns and wraps header items, filters and the toolbar. A card body is a vertical flex container; margin-top:auto pushes Choose quantity toward its bottom. Content has a 1200px maximum width. At max-width:760px, the hero becomes one column, search occupies a full row, and a disclosure button reveals the hidden navigation. At min-width:761px, JavaScript resets the mobile menu. The catalog adapts continuously without separate device breakpoints. Reduced-motion preferences disable animation and smooth scrolling. At 480px, the compact purchase photo and toast action layout adapt to narrow screens. The purchase dialog has a viewport-based maximum height with internal scrolling.

The header uses position:sticky and top:0. A ResizeObserver near the bottom of js/app.js measures the header, including mobile wrapping and expanded navigation. It sets --header-offset to that height plus 16px, used by HTML scroll padding so anchors remain visible.

## Product data and rendering

js/products.js contains 12 records with stable ID, name, category, integer priceCents, rating, review count, local image path and alt text. 5400 cents means $54.00. Photos are credited in README; ratings and prices are demo values.

renderGrid() in js/app.js calls visible(), clears the grid and creates an article for every match. el() creates elements. Category, title, rating, price and Choose quantity button are appended with DOM methods. The button declares aria-haspopup=dialog and its accessible name identifies the product. textContent is used instead of interpreting HTML. Images lazy-load. The result count and no-results panel update too.

## Search, category and sort working together

state stores query, category, sort and cart. visible() trims the query and lowercases it. Each product must match the category (unless All) AND contain the query in its name or category. Then ascending or descending price sorts that filtered list by cents. Featured preserves data order. filter() creates a new array, so sorting does not mutate the original catalog.

Search input updates state.query; category clicks update state.category and aria-pressed; select change updates state.sort. Each calls update(), which redraws and schedules a polite result announcement. Search submit prevents a reload. Reset appears with no results and restores an empty query, All and Featured, redraws and focuses search.

## Event listeners and DOM updates

renderFilters() creates a button and click listener for each category. renderGrid() creates Choose quantity listeners capturing each product ID. renderCart() creates quantity and Remove listeners for each line. The purchase section binds input, plus/minus and form submit listeners; the toast section binds pointer/focus pauses and actions. The bottom of app.js binds drawer, menu, search, sort and reset controls. document keydown handles Tab and Escape; matchMedia handles breakpoint changes. The status region announces delayed results and cart actions. Re-rendering replaces old line nodes, so quantity updates explicitly restore focus to the new matching control, or Close after removal.

## Cart, integer cents and localStorage validation

The cart maps IDs to quantities, for example {"rose-red":2}. addItem(id, quantity) adds the already validated selected quantity to this single cart state, saves and redraws it. updatePurchase() rejects additions that would put that product above 99 in the cart; nothing is silently truncated. changeQty() changes drawer quantities and deletes zero-or-less entries. Remove subtracts 99, safe because that is the validated maximum. total() sums quantities for the badge, rather than counting product types.

renderCart() calculates each line as priceCents × quantity and adds integer cents. money() alone divides by 100 and formats two decimals. Two $54 bouquets and one $48 bouquet therefore give 3 items and $156.00. Integer arithmetic avoids adding fractional floating-point dollar values.

saveCart() writes JSON to bloomcart-cart-v1. loadCart() catches invalid JSON and storage errors. It accepts a non-array object, known IDs and integer quantities from 1 through 99. Unknown IDs, string quantities, fractions, negatives, zero, null and excessive quantities are ignored. Valid entries survive beside bad ones. Invalid stored data is not rewritten immediately; the next mutation saves the clean cart. Storage exceptions are caught, leaving page-session shopping available.

## Drawer and mobile-menu accessibility

Both the product overlay and drawer have role=dialog, aria-modal=true and heading labels. openModal() ensures any previous overlay is closed, collapses the mobile menu, remembers the trigger, reveals the chosen overlay/backdrop, locks scrolling and makes main/header/footer/skip link/toast inert. It focuses the overlay's Close button. focusables() finds enabled controls in the active overlay. The keydown listener wraps forward and reverse Tab and recovers escaped focus. Close, Escape and backdrop invoke closeModal(), restoring the background and trigger focus. openCart() uses this same modal controller. No second cart state is created.

closeModal() now starts a closing state rather than hiding the overlay immediately. It retains focus containment, the backdrop and background locks until the 270ms exit completes, then hides the overlay and restores focus without scrolling the page. Repeated close requests are ignored while closing. A new open request cancels the old exit and keeps the correct trigger and locks.

changeQty() remembers the current accessible label and focuses its replacement after rendering. Removing the focused line sends focus to Close. This keeps keyboard use working after DOM updates.

The menu is a nonmodal disclosure using a normal button, so Enter/Space work natively. setMenu() keeps .open and aria-expanded synchronized; aria-controls points to nav. Links close it. Escape closes it and focuses the menu button. Resizing transfers focus away from controls hidden by the breakpoint. Opening Cart closes the menu, and resizing preserves the open modal. Screen-reader announcement quality needs separate assistive-technology testing.

## Purchase dialog and confirmation toast

openPurchase(id) fills the local product photo, name and unit price, resets the quantity to 1, and opens the shared modal. It does not change the cart or storage. readQuantity() accepts whole numeric input from 1 through 99. updatePurchase() shows the cents-based total or an em dash for invalid input, updates boundary buttons and displays clear errors using aria-invalid, aria-describedby and an alert. It also checks the existing cart quantity against the 99 limit. stepQuantity() updates plus/minus values and moves focus to the input if a boundary button becomes disabled.

The purchaseForm submit listener prevents navigation, rejects an invalid value, and focuses the input on error. A confirming flag, disabled submit button and active-modal check guard duplicate submit events. A valid submission calls addItem() once, closes the modal and calls showToast() with the exact quantity and product name.

The submit listener also rejects submission during a closing state. Cart mutation and localStorage saving remain immediate; the disabled confirmation button shows “✓ Added to cart” during the exit. Opening another product resets that label and the quantity, so no success state leaks into the next choice.

showToast() updates visible text and the existing polite live region without focusing the toast. pauseToast() records the remaining part of five seconds; resumeToast() schedules only that remainder when the toast is neither hovered nor focused. The toast actions dismiss it or open the drawer. View cart passes the header Cart button as the drawer's return target, so closing the drawer cannot focus a hidden toast. The toast is dismissed when another overlay opens.

Toast opening and closing animate opacity and an 8px movement for 180ms. Dismissing first makes the toast inert, moves focus out if needed and stops the dismissal timer, then hides it after the exit. A new toast cancels that exit and replaces its message and five-second timer. Hover pausing checks actual hover/fine-pointer capability, preventing touch-generated hover from freezing a toast.

## Animation lifecycle

transition() and cancelMotion() near the top of js/app.js manage Web Animations API animations in a Map. transition() samples the currently displayed transform/opacity before cancelling any old animation, writes the intended end styles, and animates from that sample. This allows smooth reversal during rapid reopening. Completed animations remove themselves; cancelled animations have their rejected finished promises handled. Version counters on modals and toasts prevent a stale completion from hiding a newly opened element. Elements expose opening/open/closing/closed through data-phase for testing.

The drawer slides horizontally; the product dialog fades with 10px of vertical motion and a 0.98-to-1 scale; both and the backdrop use 270ms. The toast uses 180ms, and the badge scales only to 1.12 and back in 200ms when its displayed count changes. Restarting a badge pulse samples its current scale. CSS supplies 180ms control color/shadow/transform transitions, with pressed states taking priority over hover. Hover styles are inside the hover/fine-pointer media query. Stable scrollbar gutters prevent content shifting during scroll lock.

With prefers-reduced-motion, transition() applies final styles and completion synchronously, badge pulses are skipped and CSS control transitions/movement are disabled. A media-query change finishes active animations, so preference changes do not strand an overlay or its backdrop. No cart update waits for animation completion.

## Current-section navigation

CSS gives Home, Shop and About rounded 44px click areas, no default underlines, blush hover/pressed states, a clear focus ring and a forest-green current state. updateSection() reads section positions relative to the sticky header plus 32px. It sets aria-current=location on exactly one link, with About selected at the bottom of the page so the short final section can become current. scheduleSectionUpdate() batches scroll, resize, hash and measured-header changes through requestAnimationFrame. The links remain native anchors, including mobile navigation.

## Main functions and actual locations

| File | Functions or content |
| --- | --- |
| js/app.js, helpers | $, money(), find(), el() |
| js/app.js, motion helpers | transition(), cancelMotion(), reducedMotion listener and animation Map |
| js/app.js, storage section | loadCart(), saveCart(), announce() |
| js/app.js, catalog section | visible(), renderGrid(), renderFilters(), update() |
| js/app.js, cart section | total(), addItem(), changeQty(), renderCart() |
| js/app.js, drawer section | setBackgroundInert(), focusables(), openModal(), closeModal(), openCart(), closeCart() |
| js/app.js, purchase section | quantityError(), readQuantity(), updatePurchase(), openPurchase(), stepQuantity(), form submit listener |
| js/app.js, confirmation section | showToast(), pauseToast(), resumeToast(), dismissToast() |
| js/app.js, current-section navigation | updateSection(), scheduleSectionUpdate() |
| js/app.js, mobile menu and final listeners | setMenu(), breakpoint listener, ResizeObserver, event bindings |
| js/products.js | window.PRODUCTS array |
| css/styles.css | Grid/Flexbox, colors, sticky header and media queries |
| index.html | Semantic structure, IDs, labels and ARIA attributes |

## Ten likely instructor questions

1. **Why separate the files?** HTML describes content, CSS styles it, and JavaScript controls behavior; each is easier to maintain.
2. **Why Grid and Flexbox?** Grid arranges the catalog in rows and columns; Flexbox aligns or stacks controls and card content.
3. **How do filtering and search combine?** Both conditions must pass, then sorting orders the matches.
4. **Does sorting change the original array?** No, it sorts the new array produced by filter().
5. **Why cents?** Integer calculations keep line totals and subtotal exact before display formatting.
6. **What does the badge count?** All quantities, not unique products.
7. **What happens to corrupted storage?** JSON errors become an empty cart; invalid entries are discarded using ID and quantity checks.
8. **How can keyboard users use Cart?** Focus enters Close, Tab stays inside, background is inert, Escape closes and focus returns.
9. **How does the mobile menu work?** A disclosure button toggles visibility and aria-expanded; links, Escape and desktop resize close it.
10. **Can it accept real orders?** No. A real shop needs backend validation, inventory, orders and secure payment integration.
