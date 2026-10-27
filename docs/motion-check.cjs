const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.TEST_URL || 'http://127.0.0.1:8000/BloomCart/';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 const page=await context.newPage(),errors=[],failed=[],checks=[];
 const monitor=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.status()>=400)failed.push(r.url())});p.on('requestfailed',r=>failed.push(r.url()))};monitor(page);
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)};
 const phase=(id,value)=>page.waitForFunction(([id,value])=>document.getElementById(id).dataset.phase===value,[id,value]);
 const choose=()=>page.getByRole('button',{name:'Choose quantity for Classic Red Rose Bouquet',exact:true}).click();
 const close=async(id='closeCart')=>{await page.locator('#'+id).click();await phase(id==='closeCart'?'drawer':'purchaseDialog','closed')};
 const badge=async(n)=>assert.equal(await page.locator('#badge').textContent(),String(n));
 await page.goto(base);await page.locator('.card').last().waitFor();
 await check('Drawer 270ms transform and backdrop opacity: entry, exit visibility, focus, locks and stable layout',async()=>{
  const x=await page.locator('.brand').evaluate(e=>e.getBoundingClientRect().x);
  await page.locator('#cartBtn').focus();
  const opening=await page.evaluate(()=>{
   document.querySelector('#cartBtn').click();const d=document.querySelector('#drawer'),b=document.querySelector('#backdrop');
   return {phase:d.dataset.phase,hidden:d.hidden,focus:document.activeElement.id,locked:document.body.classList.contains('lock'),duration:d.getAnimations()[0].effect.getTiming().duration,frames:d.getAnimations()[0].effect.getKeyframes(),backdrop:b.getAnimations()[0].effect.getTiming().duration};
  });
  assert.equal(opening.phase,'opening');assert.equal(opening.hidden,false);assert.equal(opening.focus,'closeCart');assert.equal(opening.locked,true);assert.equal(opening.duration,270);assert.equal(opening.backdrop,270);assert.notEqual(opening.frames[0].transform,opening.frames[1].transform);
  await phase('drawer','open');assert.equal(await page.locator('.brand').evaluate(e=>e.getBoundingClientRect().x),x);
  await page.keyboard.press('Shift+Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'closeCart');
  const closing=await page.evaluate(()=>{document.querySelector('#closeCart').click();return {hidden:document.querySelector('#drawer').hidden,phase:document.querySelector('#drawer').dataset.phase,backdrop:document.querySelector('#backdrop').hidden,locked:document.body.classList.contains('lock'),inert:document.querySelector('#top').inert,focus:document.activeElement.id}});
  assert.deepEqual(closing,{hidden:false,phase:'closing',backdrop:false,locked:true,inert:true,focus:'closeCart'});
  await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'closeCart');await phase('drawer','closed');assert.equal(await page.locator('#backdrop').isHidden(),true);assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('lock')),false);assert.equal(await page.locator(':focus').getAttribute('id'),'cartBtn');assert.equal(await page.locator('.brand').evaluate(e=>e.getBoundingClientRect().x),x);
 });
 await check('Purchase fade/10px movement/scale, exit visibility and Escape/backdrop/close dismissal',async()=>{
  for(const method of ['escape','backdrop','close']){
   await choose();await phase('purchaseDialog','open');
   const snapshot=await page.evaluate(method=>{
    const d=document.querySelector('#purchaseDialog');
    if(method==='escape')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));else document.querySelector(method==='close'?'#closePurchase':'#backdrop').click();
    return {phase:d.dataset.phase,hidden:d.hidden,opacity:getComputedStyle(d).opacity,frames:d.getAnimations()[0].effect.getKeyframes(),locked:document.body.classList.contains('lock')};
   },method);
   assert.equal(snapshot.phase,'closing');assert.equal(snapshot.hidden,false);assert.equal(snapshot.locked,true);assert.equal(snapshot.frames[1].opacity,'0');assert.match(snapshot.frames[1].transform,/10px/);assert.match(snapshot.frames[1].transform,/scale\(0?\.98\)/);
   await phase('purchaseDialog','closed');await badge(0);assert.match(await page.locator(':focus').getAttribute('aria-label'),/^Choose quantity/);
  }
 });
 await check('Immediate exact cart update, success label, duplicate-submit protection, badge pulse and toast entrance',async()=>{
  await choose();await phase('purchaseDialog','open');await page.locator('#purchaseQty').fill('3');
  const result=await page.evaluate(()=>{
   const button=document.querySelector('#confirmPurchase');button.click();button.click();button.form.requestSubmit();
   const d=document.querySelector('#purchaseDialog'),badge=document.querySelector('#badge'),toast=document.querySelector('#toast');
   return {badge:badge.textContent,subtotal:document.querySelector('#subtotal').textContent,cart:JSON.parse(localStorage.getItem('bloomcart-cart-v1')),phase:d.dataset.phase,hidden:d.hidden,success:button.textContent,disabled:button.disabled,pulse:badge.getAnimations()[0].effect.getKeyframes(),pulseDuration:badge.getAnimations()[0].effect.getTiming().duration,toastHidden:toast.hidden,toastDuration:toast.getAnimations()[0].effect.getTiming().duration};
  });
  assert.equal(result.badge,'3');assert.equal(result.subtotal,'$162.00');assert.deepEqual(result.cart,{'rose-red':3});assert.equal(result.phase,'closing');assert.equal(result.hidden,false);assert.match(result.success,/Added to cart/);assert.equal(result.disabled,true);assert.equal(result.pulseDuration,200);assert.equal(result.pulse[1].transform,'scale(1.12)');assert.equal(result.toastHidden,false);assert.equal(result.toastDuration,180);
  await phase('purchaseDialog','closed');await phase('toast','open');assert.equal(await page.locator('#drawer').isHidden(),true);assert.match(await page.locator(':focus').getAttribute('aria-label'),/^Choose quantity/);assert.equal(await page.locator('#toast').evaluate(e=>e.inert),false);
 });
 await check('Toast hover and keyboard pause, automatic animated expiry, explicit animated dismissal and View cart',async()=>{
  await page.locator('#toast').hover();await page.waitForTimeout(5200);assert.equal(await page.locator('#toast').isVisible(),true);
  await page.mouse.move(0,0);await page.locator('#toastCart').focus();await page.waitForTimeout(5200);assert.equal(await page.locator('#toast').isVisible(),true);
  await page.locator('#cartBtn').focus();await phase('toast','closing');assert.equal(await page.locator('#toast').isHidden(),false);await phase('toast','closed');assert.equal(await page.locator('#toast').isHidden(),true);
  await choose();await phase('purchaseDialog','open');await page.locator('#confirmPurchase').click();await phase('purchaseDialog','closed');await phase('toast','open');
  const result=await page.evaluate(()=>{document.querySelector('#closeToast').click();return {hidden:document.querySelector('#toast').hidden,phase:document.querySelector('#toast').dataset.phase}});assert.deepEqual(result,{hidden:false,phase:'closing'});await phase('toast','closed');
  await choose();await phase('purchaseDialog','open');await page.locator('#confirmPurchase').click();await phase('purchaseDialog','closed');await page.locator('#toastCart').click();await phase('drawer','open');assert.equal(await page.locator('#purchaseDialog').isHidden(),true);await phase('toast','closed');await close();assert.equal(await page.locator(':focus').getAttribute('id'),'cartBtn');await badge(5);
 });
 await check('Reopen during exit reverses current transform without stale completion, backdrop or locks',async()=>{
  await page.locator('#cartBtn').click();await phase('drawer','open');
  await page.evaluate(()=>document.querySelector('#closeCart').click());await page.waitForTimeout(70);
  const difference=await page.evaluate(()=>{const d=document.querySelector('#drawer'),before=new DOMMatrix(getComputedStyle(d).transform).m41;document.querySelector('#cartBtn').click();return Math.abs(new DOMMatrix(getComputedStyle(d).transform).m41-before)});
  assert.ok(difference<2,'drawer should reverse from its current position');await phase('drawer','open');await page.waitForTimeout(350);assert.equal(await page.locator('#drawer').isHidden(),false);assert.equal(await page.locator('#backdrop').isHidden(),false);assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('lock')),true);await close();
  await choose();await phase('purchaseDialog','open');await page.evaluate(()=>document.querySelector('#closePurchase').click());await page.waitForTimeout(60);await page.evaluate(()=>document.querySelector('.card button').click());await phase('purchaseDialog','open');assert.equal(await page.locator('#purchaseQty').inputValue(),'1');assert.equal(await page.locator('#confirmPurchase').textContent(),'Add to cart');await page.waitForTimeout(350);assert.equal(await page.locator('#purchaseDialog').isHidden(),false);await close('closePurchase');
 });
 await check('Rapid open/close, overlay switching and new toast during old exit do not duplicate or leave stuck UI',async()=>{
  await page.evaluate(()=>{for(let i=0;i<12;i++){document.querySelector('#cartBtn').click();document.querySelector('#closeCart').click()}});await phase('drawer','closed');assert.equal(await page.locator('#backdrop').isHidden(),true);
  await choose();await phase('purchaseDialog','open');await page.locator('#purchaseQty').fill('2');await page.evaluate(()=>{const b=document.querySelector('#confirmPurchase');b.click();b.click();document.querySelector('#cartBtn').click()});await phase('drawer','open');await badge(7);assert.equal(await page.locator('#purchaseDialog').isHidden(),true);await page.waitForTimeout(350);assert.equal(await page.locator('#drawer').isHidden(),false);await close();
  await choose();await phase('purchaseDialog','open');await page.locator('#confirmPurchase').click();
  await page.evaluate(()=>{document.querySelector('#closeToast').click();document.querySelector('.card button').click();document.querySelector('#confirmPurchase').click()});
  await phase('purchaseDialog','closed');await phase('toast','open');await page.waitForTimeout(300);assert.equal(await page.locator('#toast').isHidden(),false);await badge(9);await page.locator('#closeToast').click();await phase('toast','closed');
 });
 await check('Reduced motion: no modal/toast movement or badge pulse; changing preference finishes an in-flight exit',async()=>{
  await page.locator('#cartBtn').click();await phase('drawer','open');await page.evaluate(()=>document.querySelector('#closeCart').click());await page.emulateMedia({reducedMotion:'reduce'});await phase('drawer','closed');assert.equal(await page.locator('#backdrop').isHidden(),true);
  const result=await page.evaluate(()=>{document.querySelector('.card button').click();document.querySelector('#confirmPurchase').click();return {modalHidden:document.querySelector('#purchaseDialog').hidden,toastPhase:document.querySelector('#toast').dataset.phase,animations:document.getAnimations().length,locked:document.body.classList.contains('lock')}});assert.deepEqual(result,{modalHidden:true,toastPhase:'open',animations:0,locked:false});
  await page.locator('#toastCart').click();await phase('drawer','open');await close();assert.equal(await page.locator('#confirmPurchase').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('Five mobile/desktop widths: animated overlays fit, scroll internally, avoid overflow and release locks',async()=>{
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:700});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await choose();await phase('purchaseDialog','open');await page.locator('#purchaseImage').evaluate(e=>e.decode());const box=await page.locator('#purchaseDialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=700);await close('closePurchase');await page.locator('#cartBtn').click();await phase('drawer','open');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await close();assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('lock')),false);
  }
  await page.setViewportSize({width:320,height:380});await choose();await phase('purchaseDialog','open');await page.locator('#purchaseQty').fill('100');await page.locator('#confirmPurchase').click();assert.equal(await page.locator('#purchaseDialog').evaluate(e=>e.scrollHeight>e.clientHeight),true);await page.keyboard.press('Escape');await phase('purchaseDialog','closed');
 });
 await check('Controls: hover/focus/pressed transitions; touch uses no hover transforms and toast expires',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.locator('#cartBtn').hover();assert.equal(await page.locator('#cartBtn').evaluate(e=>getComputedStyle(e).transitionDuration),'0.18s, 0.18s, 0.18s, 0.18s, 0.18s');await page.locator('#cartBtn').focus();assert.equal(await page.locator('#cartBtn').evaluate(e=>getComputedStyle(e).outlineWidth),'3px');
  const card=page.locator('.card button').first();await card.hover();await page.mouse.down();await page.waitForTimeout(200);assert.ok(await card.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a<1),'pressed must take priority over card hover');await page.mouse.up();await phase('purchaseDialog','open');await close('closePurchase');
  await page.locator('#cartBtn').hover();await page.mouse.down();await page.waitForTimeout(200);assert.ok(await page.locator('#cartBtn').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a<1));await page.mouse.up();await phase('drawer','open');await close();
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'}),tp=await touch.newPage();monitor(tp);await tp.goto(base);
  assert.equal(await tp.evaluate(()=>matchMedia('(hover: hover) and (pointer: fine)').matches),false);
  await tp.getByRole('button',{name:'Choose quantity for Classic Red Rose Bouquet',exact:true}).tap();await tp.waitForFunction(()=>document.querySelector('#purchaseDialog').dataset.phase==='open');await tp.locator('#confirmPurchase').tap();await tp.waitForFunction(()=>document.querySelector('#purchaseDialog').hidden);await tp.waitForFunction(()=>document.querySelector('#toast').dataset.phase==='open');
  await tp.locator('#toastMessage').tap();await tp.waitForTimeout(5500);assert.equal(await tp.locator('#toast').isHidden(),true);assert.equal(await tp.locator('#badge').textContent(),'1');assert.equal(await tp.locator('.card button').first().evaluate(e=>getComputedStyle(e).transform),'none');await touch.close();
 });
 await check('No console/page errors or failed assets',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(failed,[])});
 fs.writeFileSync(process.env.TEST_URL?'motion-package-results.json':'BloomCart/docs/motion-results.json',JSON.stringify({date:'2026-10-27',browser:await browser.version(),base,checks,errors,failed},null,2)+'\n');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
