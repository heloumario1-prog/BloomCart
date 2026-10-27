# BloomCart

A responsive floral and gift boutique storefront by **Mario El Helou**, built with HTML5, CSS3 and vanilla JavaScript. The existing ivory, green and blush design presents 12 sample bouquets, plants and gifts. No build step or runtime dependencies are required.

## Assignment mapping

| Requirement | Implementation |
| --- | --- |
| Floral and gift e-commerce interface | Hero, collection, About section and interactive cart in index.html |
| Cards with category, high-resolution image, price and rating | js/products.js records and renderGrid() in js/app.js; local licensed photos |
| Sticky navigation, search and cart counter | .site-header, labeled search form and quantity badge |
| Responsive Grid/Flexbox | Hero/product Grid, flexible toolbar/header/card bodies, mobile disclosure menu |

## Features and technologies

- Search and category filters work together with featured or ascending/descending price order.
- Result count, empty-results message and reset control.
- Polished Home/Shop/About links with hover, keyboard-focus and scroll-aware current-section states.
- “Choose quantity” opens a product dialog with photograph, unit price, editable 1–99 quantity and live total. Only its Add to cart confirmation changes the cart.
- Five-second confirmation toast with View cart and Dismiss actions; hover or keyboard focus pauses dismissal without moving focus to the toast.
- Cart drawer with repeated additions, quantity changes, removal, line totals and USD subtotal.
- Integer-cent arithmetic and validated localStorage persistence; maximum 99 per product.
- Keyboard focus containment, Escape/backdrop/close controls, background inert, return focus, status announcements and skip link.
- Mobile menu at 760px, measured sticky-header anchor spacing, reduced-motion support.
- Subtle 270ms drawer/dialog and backdrop motion, 180ms toast/control feedback, a 200ms badge pulse, and an immediate confirmation success state. Exit animations finish before overlays are hidden; focus and scroll locks remain correct through closing and reopening.
- Optimized local JPEG photos; no remote fonts, frameworks or image requests at runtime.

## Folder structure

~~~text
BloomCart/
  index.html
  README.md
  SUBMISSION.md
  css/styles.css
  js/app.js
  js/products.js
  assets/images/             13 JPEG photos
  docs/
    EXPLANATION.md
    TESTING.md
    browser-results.json
    browser-check.cjs        repeatable browser checks
    purchase-check.cjs       header, purchase dialog and toast checks
    purchase-results.json
    motion-check.cjs         animation, interruption and touch checks
    motion-results.json
    motion-package-results.json
    package-browser-results.json
    purchase-package-results.json
    serve.cjs                Node.js static server
    screenshot-desktop.png
    screenshot-mobile.png
~~~

## Exact local run instructions

Install Node.js if needed (verified using v24.11.0). In PowerShell, use the **parent containing BloomCart** as the working directory:

~~~powershell
cd 'C:\Users\user\Desktop\BloomCart-Mario-El-Helou'
node BloomCart/docs/serve.cjs .
~~~

Open **http://127.0.0.1:8000/BloomCart/**. Keep the terminal open; Ctrl+C stops it. After extracting the ZIP elsewhere, change the working directory to the extracted parent that contains BloomCart and run the same server command. No npm installation is needed to run the website. The repository-style prefix intentionally checks GitHub Pages relative paths.

## GitHub Pages deployment

1. Create a GitHub repository, for example BloomCart.
2. Place the **contents of the BloomCart folder** at the repository root. index.html must sit beside css, js, assets and docs.
3. Commit and push to main yourself.
4. Open Settings → Pages → Build and deployment → Deploy from a branch. Select main and /(root), then Save.
5. Wait for deployment and visit the real URL GitHub provides. Verify images, search and cart on that deployment.
6. Fill the repository and live-demo placeholders in SUBMISSION.md with the actual URLs.

No repository or deployment was created. Do not put the outer ZIP or an extra enclosing folder at the repository root.

## Actual screenshots

Final browser captures of the complete page. Desktop viewport: 1440 × 1000. Mobile viewport: 390 × 844.

![BloomCart desktop](docs/screenshot-desktop.png)

![BloomCart mobile](docs/screenshot-mobile.png)

Purchase dialog on desktop and mobile, followed by the mobile confirmation toast:

![Quantity dialog on desktop](docs/screenshot-purchase-desktop.png)

![Quantity dialog on mobile](docs/screenshot-purchase-mobile.png)

![Confirmation with View cart action](docs/screenshot-toast-mobile.png)

## Purchase flow and limits

Choose quantity opens the selected product at 1 every time. Minus, plus or direct input updates the total in integer cents. Blank, nonnumeric, fractional, negative, zero or greater-than-99 values show an inline error and cannot be confirmed. The cart also limits each product to 99 overall: an addition exceeding remaining capacity is rejected with an explanation, never silently reduced. A valid confirmation adds exactly the chosen quantity once, saves the existing cart, restores trigger focus and announces a confirmation. It does not open the cart automatically. View cart opens the existing drawer; closing that drawer returns focus to the persistent header Cart button because the toast has been dismissed.

Both overlays share focus containment, inert background, scroll locking and Escape/close/backdrop dismissal, with only one open at a time. The toast lasts roughly five seconds of time without hover/focus; leaving resumes the remaining duration. Documentation and screenshots were refreshed on 27 October 2026. Browser verification details and repeatable commands are in docs/TESTING.md.

Animations use transform and opacity without changing the layout. A confirmed addition updates the cart and storage immediately; the disabled button briefly reads “✓ Added to cart” as the dialog exits. Reopening an overlay interrupts its exit smoothly instead of waiting or allowing an old completion to hide it. Reduced motion skips overlay movement, badge pulses and control transitions; changing that preference finishes motion already running. Hover treatments and hover-paused toast timing apply only to devices with a fine pointer and real hover support.

## Verified image credits

Source pages and the [Pexels License](https://www.pexels.com/license/) were checked on 26 October 2026. All thirteen files below use that license, which permits website use and modification without required attribution. Credits are retained here. These photos illustrate demo products and do not imply endorsement. Copies were resized/compressed by the Pexels CDN and are cropped in CSS without stretching. No AI images were used.

| Local file in assets/images/ | Creator | Source |
| --- | --- | --- |
| hero.jpg | Amina Filkins | [Florist making bouquet](https://www.pexels.com/photo/florist-making-bouquet-of-fresh-flowers-5414002/) |
| rose-red.jpg | Ella Wei | [Red rose bouquet](https://www.pexels.com/photo/a-bouquet-of-red-roses-6414329/) |
| rose-blush.jpg | Anna Shakhrai | [Blush roses](https://www.pexels.com/photo/elegant-bouquet-of-blush-pink-roses-28759039/) |
| rose-white.jpg | angel. | [White roses in box](https://www.pexels.com/photo/elegant-white-rose-bouquet-in-pink-box-display-28961963/) |
| mixed-spring.jpg | Sharmina Khan | [Spring bouquet](https://www.pexels.com/photo/colorful-spring-bouquet-with-flowers-36865677/) |
| mixed-wild.jpg | Rahime Gül | [Wildflowers](https://www.pexels.com/photo/a-bunch-of-wildflowers-in-a-vase-17081017/) |
| mixed-peony.jpg | Melike B | [Peony bouquet](https://www.pexels.com/photo/close-up-of-peony-bouquet-12615496/) |
| plant-orchid.jpg | Navya Manoj | [Orchid in pot](https://www.pexels.com/photo/white-orchid-in-a-pot-17430248/) |
| plant-fern.jpg | Trygve Finkelsen | [Boston fern](https://www.pexels.com/photo/green-boston-fern-2893181/) |
| plant-succulent.jpg | Ylanite Koppens | [Succulent trio](https://www.pexels.com/photo/selective-focus-photography-of-three-succulent-plants-796620/) |
| gift-candle.jpg | betül nur akyürek | [Floral candles](https://www.pexels.com/photo/decorative-scented-candles-with-floral-patterns-34654830/) |
| gift-vase.jpg | KATRIN BOLOVTSOVA | [Ceramic vase](https://www.pexels.com/photo/dried-flowers-in-ceramic-vase-9130691/) |
| gift-card.jpg | Katya Wolf | [Handmade greeting cards](https://www.pexels.com/photo/a-person-holding-greeting-cards-8716166/) |

Hero: 1600px wide. Products: 1000px wide, with original aspect ratios. All photos are distinct; cart thumbnails reuse the corresponding product file. Direct CDN download pattern: https://images.pexels.com/photos/PHOTO_ID/pexels-photo-PHOTO_ID.jpeg?auto=compress&cs=tinysrgb&w=1000 (hero uses w=1600). IDs are the final numbers in the verified source URLs above.

## Frontend and demo limitations

Names, prices, ratings and review counts are samples. Photos are representative. There is no checkout, payment, account, real inventory, order processing, shipping or backend. Cart data belongs to this browser and origin, so it does not move between localhost and GitHub Pages. Saving is best-effort when browser storage is disabled or full; the in-page cart still works. See [actual tests and limitations](docs/TESTING.md).
