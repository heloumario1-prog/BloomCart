const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.TEST_URL || 'http://127.0.0.1:8000/BloomCart/';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],failed=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});page.on('requestfailed',r=>failed.push(r.url()));
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)};
 const choose=()=>page.getByRole('button',{name:'Choose quantity for Classic Red Rose Bouquet',exact:true}).click();
 const qty=page.locator('#purchaseQty');
 const badge=async(n)=>assert.equal(await page.locator('#badge').textContent(),String(n));
 const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const viewport=async(width,height=900)=>{await page.setViewportSize({width,height});await frames()};
 await page.goto(base);await page.locator('.card').last().waitFor();
 await check('Header normal, hover, focus, current and pressed CSS states',async()=>{
  const shop=page.locator('#nav a[href="#catalog"]');
  const css=()=>shop.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,color:s.color,underline:s.textDecorationLine,height:e.getBoundingClientRect().height,transition:s.transitionDuration,outline:s.outlineWidth}});
  const normal=await css();assert.equal(normal.underline,'none');assert.ok(normal.height>=44);assert.equal(normal.transition,'0.2s, 0.2s, 0.2s');
  await shop.hover();await page.waitForTimeout(250);assert.equal((await css()).background,'rgb(242, 212, 215)');
  await page.mouse.move(0,0);await page.keyboard.press('Tab');await shop.focus();assert.equal((await css()).outline,'3px');
  await shop.hover();await page.mouse.down();await page.waitForTimeout(250);assert.equal((await css()).background,'rgb(242, 212, 215)');await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#nav [aria-current]').hash==='#catalog');await page.mouse.move(0,0);await shop.evaluate(e=>e.blur());await page.waitForTimeout(1000);assert.equal((await css()).background,'rgb(31, 61, 43)');
 });
 await page.emulateMedia({reducedMotion:'reduce'});
 await check('Scroll and navigation update the single current section; reduced motion applies',async()=>{
  for(const id of ['top','catalog','about']){
   await page.locator('#nav a[href="#'+id+'"]').click();await frames();
   await page.waitForFunction(id=>document.querySelector('#nav [aria-current]').hash==='#'+id,id);
   assert.equal(await page.locator('#nav [aria-current]').count(),1);
  }
  await page.evaluate(()=>document.querySelector('#catalog').scrollIntoView());await frames();assert.equal(await page.locator('#nav [aria-current]').getAttribute('href'),'#catalog');
  await page.evaluate(()=>scrollTo(0,0));await frames();assert.equal(await page.locator('#nav [aria-current]').getAttribute('href'),'#top');
  assert.equal(await page.locator('#nav a').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 });
 await check('Product dialog opens at 1 with photo/name/unit price/total and no cart mutation',async()=>{
  await choose();await badge(0);assert.equal(await page.evaluate(()=>localStorage.getItem('bloomcart-cart-v1')),null);
  assert.equal(await qty.inputValue(),'1');assert.equal(await page.locator('#purchaseTitle').textContent(),'Classic Red Rose Bouquet');assert.equal(await page.locator('#purchasePrice').textContent(),'$54.00');assert.equal(await page.locator('#purchaseTotal').textContent(),'$54.00');await page.locator('#purchaseImage').evaluate(e=>e.decode());
  assert.equal(await page.locator('#purchaseMinus').isDisabled(),true);assert.equal(await page.locator(':focus').getAttribute('id'),'closePurchase');assert.equal(await page.locator('#drawer').isHidden(),true);
 });
 await check('Quantity plus/minus/edit and blank/fractional/negative/nonnumeric/excessive validation',async()=>{
  await page.locator('#purchasePlus').click();assert.equal(await qty.inputValue(),'2');assert.equal(await page.locator('#purchaseTotal').textContent(),'$108.00');await page.locator('#purchaseMinus').click();assert.equal(await qty.inputValue(),'1');
  for(const value of ['', '1.5','-2','0','100','999999','1e2']){
   await qty.fill(value);await page.locator('#confirmPurchase').click();await badge(0);assert.equal(await page.locator('#quantityError').isVisible(),true);assert.equal(await qty.getAttribute('aria-invalid'),'true');assert.equal(await page.locator('#purchaseTotal').textContent(),'\u2014');assert.equal(await page.locator(':focus').getAttribute('id'),'purchaseQty');
  }
  await qty.fill('');await qty.pressSequentially('abc');await page.locator('#confirmPurchase').click();assert.equal(await page.locator('#quantityError').isVisible(),true);await badge(0);
  await qty.fill('99');assert.equal(await page.locator('#purchasePlus').isDisabled(),true);assert.equal(await page.locator('#purchaseTotal').textContent(),'$5346.00');
  await qty.fill('3');assert.equal(await page.locator('#quantityError').isHidden(),true);assert.equal(await page.locator('#purchaseTotal').textContent(),'$162.00');
 });
 await check('Dialog Tab containment, inert background, scroll lock and all dismissal paths',async()=>{
  await page.locator('#closePurchase').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'confirmPurchase');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'closePurchase');
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#purchaseDialog').contains(document.activeElement)),true)}
  assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).overflow),'hidden');assert.equal(await page.locator('#top').evaluate(e=>e.inert),true);assert.equal(await page.locator('#toast').evaluate(e=>e.inert),true);
  await page.evaluate(()=>document.querySelector('#cartBtn').focus());assert.equal(await page.evaluate(()=>document.querySelector('#purchaseDialog').contains(document.activeElement)),true);
  for(const method of ['escape','close','backdrop']){
   if(method==='escape')await page.keyboard.press('Escape');else if(method==='close')await page.locator('#closePurchase').click();else await page.locator('#backdrop').click({position:{x:5,y:5}});
   await badge(0);assert.equal(await page.locator('#purchaseDialog').isHidden(),true);assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Choose quantity for Classic Red Rose Bouquet');assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('lock')),false);
   if(method!=='backdrop'){await choose();assert.equal(await qty.inputValue(),'1')}
  }
 });
 await check('Rapid confirmation adds exact quantity once, persists and announces without toast focus',async()=>{
  await choose();await qty.fill('3');
  // Same-turn rapid submit/click events reproduce an accidental duplicate confirmation.
  await page.locator('#confirmPurchase').evaluate(e=>{e.click();e.click();e.form.requestSubmit()});
  await badge(3);assert.equal(await page.locator('#subtotal').textContent(),'$162.00');assert.equal(await page.locator('#purchaseDialog').isHidden(),true);assert.equal(await page.locator('#drawer').isHidden(),true);
  assert.equal(await page.locator('#toastMessage').textContent(),'3 \u00d7 Classic Red Rose Bouquet added to your cart.');assert.equal(await page.locator('#toast').isVisible(),true);
  await page.waitForFunction(()=>document.querySelector('#live').textContent==='3 \u00d7 Classic Red Rose Bouquet added to your cart.');assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Choose quantity for Classic Red Rose Bouquet');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('bloomcart-cart-v1'))),{'rose-red':3});
 });
 await check('Toast hover pauses dismissal; View cart opens only drawer and returns focus safely',async()=>{
  await page.locator('#toast').hover();await page.waitForTimeout(5200);assert.equal(await page.locator('#toast').isVisible(),true);
  await page.locator('#toastCart').click();assert.equal(await page.locator('#toast').isHidden(),true);assert.equal(await page.locator('#drawer').isVisible(),true);assert.equal(await page.locator('#purchaseDialog').isHidden(),true);assert.equal(await page.locator(':focus').getAttribute('id'),'closeCart');assert.match(await page.locator('#items').innerText(),/Line total: \$162\.00/);
  await page.keyboard.press('Escape');assert.equal(await page.locator(':focus').getAttribute('id'),'cartBtn');
 });
 await check('Toast keyboard focus pauses, leaving resumes, five-second expiry and explicit dismissal',async()=>{
  await choose();await page.locator('#confirmPurchase').click();await page.mouse.move(0,0);await page.locator('#toastCart').focus();await page.waitForTimeout(5200);assert.equal(await page.locator('#toast').isVisible(),true);
  await page.locator('#cartBtn').focus();await page.waitForTimeout(5200);assert.equal(await page.locator('#toast').isHidden(),true);await badge(4);
  await choose();await page.locator('#confirmPurchase').click();await page.locator('#closeToast').click();assert.equal(await page.locator('#toast').isHidden(),true);assert.equal(await page.locator(':focus').getAttribute('id'),'cartBtn');await badge(5);
 });
 await check('Per-product cart capacity rejects overflow without truncation; valid repeat adds exactly',async()=>{
  await choose();await qty.fill('95');await page.locator('#confirmPurchase').click();await badge(5);assert.match(await page.locator('#quantityError').textContent(),/already has 5/);
  await qty.fill('94');await page.locator('#confirmPurchase').click();await badge(99);await choose();assert.equal(await qty.inputValue(),'1');await page.locator('#confirmPurchase').click();await badge(99);assert.equal(await page.locator('#purchaseDialog').isVisible(),true);await page.keyboard.press('Escape');await page.reload();await badge(99);
 });
 await check('320/390/768/1024/1440 layouts: dialog, toast, cart, images and menu remain usable',async()=>{
  await page.evaluate(()=>localStorage.clear());await page.reload();
  for(const width of [320,390,768,1024,1440]){
   await viewport(width,700);await page.evaluate(()=>scrollTo(0,0));await frames();
   if(width<=760){await page.locator('#menuToggle').click();await page.locator('#nav a[href="#catalog"]').click();assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'),'false')}
   await choose();await page.locator('#purchaseImage').evaluate(e=>e.decode());
   const rect=await page.locator('#purchaseDialog').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=700);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#confirmPurchase').click();
   const toast=await page.locator('#toast').boundingBox();assert.ok(toast.x>=0&&toast.x+toast.width<=width);
   await page.locator('#toastCart').click();assert.equal(await page.locator('#drawer').isVisible(),true);assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).overflow),'hidden');await page.locator('#closeCart').click();
  }
  await viewport(320,380);await choose();await qty.fill('100');await page.locator('#confirmPurchase').click();await page.locator('#confirmPurchase').scrollIntoViewIfNeeded();assert.equal(await page.locator('#purchaseDialog').evaluate(e=>e.scrollHeight>e.clientHeight),true);await page.keyboard.press('Escape');
 });
 await check('Screenshots of new purchase and confirmation flow',async()=>{
  if(process.env.TEST_URL){for(const name of ['purchase-desktop','purchase-mobile','toast-mobile'])assert.equal((await page.request.get(base+'docs/screenshot-'+name+'.png')).status(),200);return}
  await page.evaluate(()=>localStorage.clear());await page.reload();
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   await viewport(width,height);await choose();await qty.fill('3');await page.locator('#purchaseImage').evaluate(e=>e.decode());await page.screenshot({path:'BloomCart/docs/screenshot-purchase-'+name+'.png'});
   await page.locator('#confirmPurchase').click();if(name==='mobile')await page.screenshot({path:'BloomCart/docs/screenshot-toast-mobile.png'});
  }
 });
 await check('No console errors, uncaught exceptions, failed assets or requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(failed,[])});
 fs.writeFileSync(process.env.TEST_URL?'purchase-package-results.json':'BloomCart/docs/purchase-results.json',JSON.stringify({date:'2026-10-27',browser:await browser.version(),base,checks,errors,failed},null,2)+'\n');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


