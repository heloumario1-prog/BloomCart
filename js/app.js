// BloomCart app logic. Product data lives in products.js (window.PRODUCTS).
(function () {
  "use strict";
  var KEY = "bloomcart-cart-v1";
  var $ = function (id) { return document.getElementById(id); };
  var products = window.PRODUCTS || [];
  var state = { query: "", category: "All", sort: "featured", cart: loadCart() };
  var lastTrigger = null;
  var activeModal = null, selectedProduct = null, confirming = false;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var motions = new Map(), modalVersion = 0, toastVersion = 0, renderedCount = null;
  var drawerClosed = "translateX(100%)", drawerOpen = "translateX(0)";
  var purchaseClosed = "translate(-50%, calc(-50% + 10px)) scale(.98)", purchaseOpen = "translate(-50%, -50%) scale(1)";
  var toastClosed = "translate(-50%, 8px)", toastOpen = "translate(-50%, 0)";

  // Sample an interrupted animation before cancelling it, so a reversal starts
  // from the current visual position. Inline end styles survive completion.
  function cancelMotion(node) {
    var animation = motions.get(node);
    if (animation) { motions.delete(node); animation.cancel(); }
  }
  function transition(node, target, duration, complete) {
    var computed = getComputedStyle(node), start = {};
    Object.keys(target).forEach(function (key) { start[key] = computed[key]; });
    cancelMotion(node);
    Object.assign(node.style, target);
    if (reducedMotion.matches || !node.animate) { if (complete) complete(); return; }
    var animation = node.animate([start, target], { duration: duration, easing: "cubic-bezier(.2,.7,.2,1)" });
    motions.set(node, animation);
    animation.finished.then(function () {
      if (motions.get(node) !== animation) return;
      motions.delete(node); if (complete) complete();
    }).catch(function () { /* An interrupted animation belongs to its replacement. */ });
  }
  reducedMotion.addEventListener("change", function (event) {
    if (event.matches) motions.forEach(function (animation) { animation.finish(); });
  });

  function money(cents) { return "$" + (cents / 100).toFixed(2); } // integer cents -> text
  function find(id) { return products.find(function (p) { return p.id === id; }); }

  // ---- storage: validate IDs and quantities, recover from bad data ----
  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY));
      var out = {};
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        Object.keys(raw).forEach(function (id) {
          var q = raw[id];
          if (find(id) && Number.isInteger(q) && q > 0 && q <= 99) out[id] = q;
        });
      }
      return out;
    } catch (e) { return {}; }
  }
  function saveCart() { try { localStorage.setItem(KEY, JSON.stringify(state.cart)); } catch (e) {} }
  function announce(msg) { $("live").textContent = ""; setTimeout(function () { $("live").textContent = msg; }, 50); }

  // ---- catalog: search + category + sort together ----
  function visible() {
    var q = state.query.trim().toLowerCase();
    var list = products.filter(function (p) {
      var okCat = state.category === "All" || p.category === state.category;
      var okQ = !q || p.name.toLowerCase().indexOf(q) > -1 || p.category.toLowerCase().indexOf(q) > -1;
      return okCat && okQ;
    });
    if (state.sort === "asc") list.sort(function (a, b) { return a.priceCents - b.priceCents; });
    if (state.sort === "desc") list.sort(function (a, b) { return b.priceCents - a.priceCents; });
    return list;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function renderGrid() {
    var list = visible(), grid = $("grid");
    grid.textContent = "";
    list.forEach(function (p) {
      var card = el("article", "card"), img = el("img"); // textContent/attributes only: no innerHTML
      img.src = p.image; img.alt = p.alt; img.width = 400; img.height = 400; img.loading = "lazy";
      var body = el("div", "body"), btn = el("button", "", "Choose quantity");
      btn.type = "button"; btn.setAttribute("aria-label", "Choose quantity for " + p.name);
      btn.setAttribute("aria-haspopup", "dialog");
      btn.addEventListener("click", function () { openPurchase(p.id); });
      body.append(el("p", "cat", p.category), el("h3", "", p.name),
        el("p", "", "★ " + p.rating.toFixed(1) + " (" + p.reviews + " reviews)"), el("p", "price", money(p.priceCents)), btn);
      card.append(img, body); grid.append(card);
    });
    $("empty").hidden = list.length > 0;
    $("count").textContent = list.length + (list.length === 1 ? " product" : " products");
  }
  function renderFilters() {
    var box = $("filters");
    ["All"].concat(products.map(function (p) { return p.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; })).forEach(function (c) {
      var b = el("button", "chip", c); b.type = "button"; b.setAttribute("aria-pressed", String(c === state.category));
      b.addEventListener("click", function () {
        state.category = c;
        box.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        update();
      });
      box.append(b);
    });
  }
  var countTimer;
  function update() { renderGrid(); clearTimeout(countTimer); countTimer = setTimeout(function () { announce($("count").textContent); }, 600); }

  // ---- cart ----
  function total() { return Object.keys(state.cart).reduce(function (s, id) { return s + state.cart[id]; }, 0); }
  function addItem(id, quantity) {
    // One source of cart state; never silently truncate a confirmed quantity.
    state.cart[id] = (state.cart[id] || 0) + quantity;
    saveCart(); renderCart();
  }
  function changeQty(id, d) {
    var activeLabel = document.activeElement.getAttribute("aria-label");
    var q = (state.cart[id] || 0) + d;
    if (q <= 0) { delete state.cart[id]; announce(find(id).name + " removed."); } else state.cart[id] = Math.min(99, q);
    saveCart(); renderCart();
    if (!$("drawer").hidden) {
      var replacement = focusables().find(function (button) { return button.getAttribute("aria-label") === activeLabel; });
      (replacement || $("closeCart")).focus();
    }
  }
  function renderCart() {
    var ul = $("items"), sub = 0, n = total();
    ul.textContent = "";
    Object.keys(state.cart).forEach(function (id) {
      var p = find(id), q = state.cart[id], line = p.priceCents * q; sub += line;
      var li = el("li"), img = el("img"); img.src = p.image; img.alt = p.alt; img.width = 64; img.height = 64;
      var info = el("div"), qty = el("div", "qty");
      function mk(txt, label, fn) { var b = el("button", "", txt); b.type = "button"; b.setAttribute("aria-label", label + " " + p.name); b.addEventListener("click", fn); return b; }
      qty.append(mk("−", "Decrease quantity of", function () { changeQty(id, -1); }), el("span", "", String(q)),
        mk("+", "Increase quantity of", function () { changeQty(id, 1); }), mk("Remove", "Remove", function () { changeQty(id, -99); }));
      info.append(el("strong", "", p.name), el("div", "", money(p.priceCents) + " each"), qty, el("div", "", "Line total: " + money(line)));
      li.append(img, info); ul.append(li);
    });
    $("badge").textContent = n; $("cartBtn").setAttribute("aria-label", "Open cart, " + n + " items");
    if (renderedCount !== null && renderedCount !== n && !reducedMotion.matches && $("badge").animate) {
      var badgeStart = getComputedStyle($("badge")).transform;
      cancelMotion($("badge"));
      var pulse = $("badge").animate([{ transform: badgeStart === "none" ? "scale(1)" : badgeStart }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 200, easing: "ease-out" });
      motions.set($("badge"), pulse);
      pulse.finished.then(function () { if (motions.get($("badge")) === pulse) motions.delete($("badge")); }).catch(function () {});
    }
    renderedCount = n;
    $("cartEmpty").hidden = n > 0; $("subtotal").textContent = money(sub);
  }

  // ---- drawer: focus move, trap, Escape, backdrop, scroll lock ----
  function setBackgroundInert(on) {
    $("top").inert = on;
    document.querySelector(".skip").inert = on;
    document.querySelector(".site-header").inert = on; document.querySelector(".foot").inert = on;
  }
  function focusables() { return Array.prototype.slice.call(activeModal.querySelectorAll("button:not(:disabled),[href],input:not(:disabled),select:not(:disabled)")); }
  function openModal(modal, trigger) {
    var previous = activeModal, previousTrigger = lastTrigger;
    var nextTrigger = trigger || document.activeElement;
    if (previous && previous.contains(nextTrigger)) nextTrigger = previousTrigger;
    var version = ++modalVersion;
    if (previous && previous !== modal) {
      cancelMotion(previous); previous.hidden = true; previous.dataset.phase = "closed";
    }
    setMenu(false);
    lastTrigger = nextTrigger;
    dismissToast(false);
    if (modal.hidden) {
      modal.style.transform = modal === $("drawer") ? drawerClosed : purchaseClosed;
      modal.style.opacity = modal === $("drawer") ? "1" : "0";
    }
    if ($("backdrop").hidden) $("backdrop").style.opacity = "0";
    activeModal = modal; modal.hidden = false;
    modal.dataset.phase = "opening";
    $("backdrop").hidden = false; document.body.classList.add("lock");
    setBackgroundInert(true); $("toast").inert = true;
    transition($("backdrop"), { opacity: "1" }, 270);
    transition(modal, { transform: modal === $("drawer") ? drawerOpen : purchaseOpen, opacity: "1" }, 270, function () {
      if (modalVersion === version) modal.dataset.phase = "open";
    });
    (modal === $("drawer") ? $("closeCart") : $("closePurchase")).focus({ preventScroll: true });
  }
  function closeModal(restoreFocus) {
    if (!activeModal || activeModal.dataset.phase === "closing") return;
    var modal = activeModal, version = ++modalVersion, trigger = lastTrigger;
    modal.dataset.phase = "closing";
    // Focus and background locks remain owned by the modal through its exit.
    (modal === $("drawer") ? $("closeCart") : $("closePurchase")).focus({ preventScroll: true });
    transition($("backdrop"), { opacity: "0" }, 270);
    transition(modal, { transform: modal === $("drawer") ? drawerClosed : purchaseClosed, opacity: modal === $("drawer") ? "1" : "0" }, 270, function () {
      if (modalVersion !== version || activeModal !== modal) return;
      modal.hidden = true; modal.dataset.phase = "closed";
      activeModal = null; selectedProduct = null;
      cancelMotion($("backdrop")); $("backdrop").hidden = true;
      document.body.classList.remove("lock"); setBackgroundInert(false); $("toast").inert = false;
      if (restoreFocus !== false) (trigger && trigger.isConnected && trigger.getClientRects().length ? trigger : $("cartBtn")).focus({ preventScroll: true });
    });
  }
  function openCart() { openModal($("drawer")); }
  function closeCart() { closeModal(); }

  // ---- purchase: validate before mutating the existing cart ----
  function quantityError(message) {
    $("quantityError").textContent = message; $("quantityError").hidden = !message;
    $("purchaseQty").setAttribute("aria-invalid", String(!!message));
  }
  function readQuantity() {
    var raw = $("purchaseQty").value;
    var q = Number(raw);
    return /^\d+$/.test(raw) && Number.isInteger(q) && q >= 1 && q <= 99 ? q : null;
  }
  function updatePurchase() {
    if (!selectedProduct) return false;
    var q = readQuantity();
    $("purchaseTotal").textContent = q === null ? "—" : money(selectedProduct.priceCents * q);
    $("purchaseMinus").disabled = q === 1;
    $("purchasePlus").disabled = q === 99;
    var message = q === null ? "Enter a whole number from 1 to 99." : "";
    if (q !== null && (state.cart[selectedProduct.id] || 0) + q > 99) {
      message = "Your cart already has " + state.cart[selectedProduct.id] + ". Each product is limited to 99 in your cart. Reduce the quantity or edit your cart.";
    }
    quantityError(message);
    return !message;
  }
  function openPurchase(id) {
    var p = find(id);
    $("purchaseTitle").textContent = p.name; $("purchasePrice").textContent = money(p.priceCents);
    $("purchaseImage").src = p.image; $("purchaseImage").alt = p.alt;
    openModal($("purchaseDialog")); selectedProduct = p; confirming = false;
    $("purchaseQty").value = "1"; $("confirmPurchase").disabled = false;
    $("confirmPurchase").classList.remove("is-success"); $("confirmPurchase").textContent = "Add to cart";
    updatePurchase();
  }
  $("purchaseQty").addEventListener("input", updatePurchase);
  function stepQuantity(delta) {
    if (!activeModal || activeModal.dataset.phase === "closing") return;
    var q = readQuantity();
    if (q === null) { updatePurchase(); $("purchaseQty").focus(); return; }
    $("purchaseQty").value = String(Math.max(1, Math.min(99, q + delta))); updatePurchase();
    if (document.activeElement.disabled) $("purchaseQty").focus();
  }
  $("purchaseMinus").addEventListener("click", function () { stepQuantity(-1); });
  $("purchasePlus").addEventListener("click", function () { stepQuantity(1); });
  $("closePurchase").addEventListener("click", function () { closeModal(); });
  $("purchaseForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (activeModal !== $("purchaseDialog") || activeModal.dataset.phase === "closing" || confirming) return;
    if (!updatePurchase()) { $("purchaseQty").focus(); return; }
    confirming = true; $("confirmPurchase").disabled = true;
    $("confirmPurchase").classList.add("is-success"); $("confirmPurchase").textContent = "✓ Added to cart";
    var p = selectedProduct, q = readQuantity();
    addItem(p.id, q); closeModal();
    showToast(q + " × " + p.name + " added to your cart.");
  });

  // ---- confirmation: five seconds of unhovered, unfocused time ----
  var toastTimer, toastRemaining = 5000, toastStarted = 0;
  function pauseToast() {
    if (!toastTimer) return;
    clearTimeout(toastTimer); toastTimer = null;
    toastRemaining = Math.max(0, toastRemaining - (Date.now() - toastStarted));
  }
  function resumeToast() {
    if ($("toast").hidden || $("toast").dataset.phase === "closing" || (window.matchMedia("(hover: hover) and (pointer: fine)").matches && $("toast").matches(":hover")) || $("toast").contains(document.activeElement) || toastTimer) return;
    toastStarted = Date.now(); toastTimer = setTimeout(function () { dismissToast(false); }, toastRemaining);
  }
  function dismissToast(restoreFocus) {
    pauseToast();
    if ($("toast").hidden || $("toast").dataset.phase === "closing") return;
    var version = ++toastVersion;
    var hadFocus = $("toast").contains(document.activeElement);
    $("toast").dataset.phase = "closing"; $("toast").inert = true;
    if (restoreFocus !== false && hadFocus) $("cartBtn").focus({ preventScroll: true });
    transition($("toast"), { opacity: "0", transform: toastClosed }, 180, function () {
      if (toastVersion !== version) return;
      $("toast").hidden = true; $("toast").dataset.phase = "closed"; $("toast").inert = !!activeModal;
    });
  }
  function showToast(message) {
    pauseToast(); toastRemaining = 5000;
    var version = ++toastVersion;
    if ($("toast").hidden) { $("toast").style.opacity = "0"; $("toast").style.transform = toastClosed; }
    $("toastMessage").textContent = message; $("toast").hidden = false;
    $("toast").dataset.phase = "opening"; $("toast").inert = !!activeModal;
    transition($("toast"), { opacity: "1", transform: toastOpen }, 180, function () {
      if (toastVersion === version) $("toast").dataset.phase = "open";
    });
    clearTimeout(countTimer); announce(message); resumeToast();
  }
  $("toast").addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) pauseToast(); });
  $("toast").addEventListener("mouseleave", resumeToast);
  $("toast").addEventListener("focusin", pauseToast);
  $("toast").addEventListener("focusout", function () { setTimeout(resumeToast, 0); });
  $("closeToast").addEventListener("click", function () { dismissToast(); });
  $("toastCart").addEventListener("click", function () { openModal($("drawer"), $("cartBtn")); });
  document.addEventListener("keydown", function (e) {
    if (!activeModal) {
      if (e.key === "Escape" && $("menuToggle").getAttribute("aria-expanded") === "true") {
        setMenu(false); $("menuToggle").focus();
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
    if (e.key === "Tab") { // keep Tab inside the drawer
      var f = focusables(), first = f[0], last = f[f.length - 1];
      if (!activeModal.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // ---- mobile menu ----
  function setMenu(open) { $("nav").classList.toggle("open", open); $("menuToggle").setAttribute("aria-expanded", String(open)); }
  $("menuToggle").addEventListener("click", function () { setMenu($("menuToggle").getAttribute("aria-expanded") !== "true"); });
  $("nav").addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
  window.matchMedia("(min-width:761px)").addEventListener("change", function (m) {
    if (m.matches) {
      var hadMenuFocus = document.activeElement === $("menuToggle");
      setMenu(false);
      if (hadMenuFocus && !activeModal) $("nav").querySelector("a").focus();
    } else if ($("nav").contains(document.activeElement) && !activeModal) {
      $("menuToggle").focus();
    }
  });
  // Measure the wrapped mobile header as well as the desktop header.
  new ResizeObserver(function (entries) {
    document.documentElement.style.setProperty("--header-offset", Math.ceil(entries[0].target.getBoundingClientRect().height) + 16 + "px");
    scheduleSectionUpdate();
  }).observe(document.querySelector(".site-header"));

  // Track the section at the reading edge below the sticky header.
  var sectionFrame = null;
  function updateSection() {
    sectionFrame = null;
    var edge = document.querySelector(".site-header").getBoundingClientRect().bottom + 32;
    var current = "top";
    ["catalog", "about"].forEach(function (id) { if ($(id).getBoundingClientRect().top <= edge) current = id; });
    if (window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2) current = "about";
    $("nav").querySelectorAll("a").forEach(function (link) {
      if (link.hash === "#" + current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  function scheduleSectionUpdate() { if (!sectionFrame) sectionFrame = requestAnimationFrame(updateSection); }
  window.addEventListener("scroll", scheduleSectionUpdate, { passive: true });
  window.addEventListener("resize", scheduleSectionUpdate);
  window.addEventListener("hashchange", scheduleSectionUpdate);

  $("cartBtn").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("backdrop").addEventListener("click", function () { closeModal(); });
  $("search").addEventListener("input", function (e) { state.query = e.target.value; update(); });
  $("searchForm").addEventListener("submit", function (e) { e.preventDefault(); });
  $("sort").addEventListener("change", function (e) { state.sort = e.target.value; update(); });
  $("reset").addEventListener("click", function () {
    state.query = ""; state.category = "All"; state.sort = "featured"; $("search").value = ""; $("sort").value = "featured";
    $("filters").querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.textContent === "All")); });
    update(); $("search").focus();
  });
  renderFilters(); renderGrid(); renderCart(); scheduleSectionUpdate();
})();
