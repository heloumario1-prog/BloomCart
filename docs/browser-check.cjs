const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.TEST_URL || 'http://127.0.0.1:8000/BloomCart/';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(), errors=[],failed=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.status()>=400)failed.push(r.url()+': '+r.status())});
 const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name)};
 const setViewport=async(size)=>{await page.setViewportSize(size);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))};
 const badge=async(n)=>assert.equal(await page.locator('#badge').textContent(),String(n));
 const names=()=>page.locator('.card h3').allTextContents();
 const chip=c=>page.getByRole('button',{name:c,exact:true});
 const add=async(n)=>{await page.getByRole('button',{name:'Choose quantity for '+n,exact:true}).click();await page.locator('#confirmPurchase').click()};
 const open=()=>page.locator('#cartBtn').click();
 const close=()=>page.locator('#closeCart').click();
 await page.goto(base);await page.locator('.card').last().waitFor();
 const products=await page.evaluate(()=>window.PRODUCTS);
 await check('Repository prefix and initial 12-product catalog',async()=>{assert.equal(products.length,12);assert.equal((await names()).length,12)});
 await check('Every category combined with search and all three sorting options',async()=>{
  for(const category of ['All',...new Set(products.map(p=>p.category))]){
   for(const query of ['', 'rose', 'plant', 'no-such-product']){
    for(const sort of ['featured','asc','desc']){
     await chip(category).click();await page.locator('#search').fill(query);await page.locator('#sort').selectOption(sort);
     let expected=products.filter(p=>(category==='All'||p.category===category)&&(!query||(p.name+' '+p.category).toLowerCase().includes(query)));
     if(sort!=='featured')expected.sort((a,b)=>sort==='asc'?a.priceCents-b.priceCents:b.priceCents-a.priceCents);
     assert.deepEqual(await names(),expected.map(p=>p.name));
    }
   }
  }
 });
 await check('Reset restores catalog, query, category and sorting',async()=>{
  await page.locator('#reset').click();assert.equal((await names()).length,12);
  assert.equal(await page.locator('#search').inputValue(),'');assert.equal(await page.locator('#sort').inputValue(),'featured');assert.equal(await chip('All').getAttribute('aria-pressed'),'true');
 });
 await check('Repeated and multiple additions, badge, line totals and subtotal',async()=>{
  await add(products[0].name);await add(products[0].name);await add(products[1].name);await badge(3);await open();
  assert.match(await page.locator('#items').innerText(),/Line total: \$108\.00/);assert.equal(await page.locator('#subtotal').textContent(),'$156.00');
 });
 await check('Quantity changes preserve focus; correct totals and removals',async()=>{
  const increase=page.getByRole('button',{name:'Increase quantity of '+products[0].name,exact:true});
  await increase.click();await badge(4);assert.equal(await page.locator('#subtotal').textContent(),'$210.00');assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Increase quantity of '+products[0].name);
  await page.getByRole('button',{name:'Decrease quantity of '+products[0].name,exact:true}).click();await badge(3);
  await page.getByRole('button',{name:'Remove '+products[1].name,exact:true}).click();await badge(2);assert.equal(await page.locator('#subtotal').textContent(),'$108.00');assert.equal(await page.locator(':focus').getAttribute('id'),'closeCart');await close();
 });
 await check('Cart persistence after reload',async()=>{await page.reload();await badge(2);await open();assert.equal(await page.locator('#subtotal').textContent(),'$108.00');await close()});
 await check('Saved JSON validation: malformed, arrays, null, unknown IDs, invalid quantities, valid bounds',async()=>{
  for(const [raw,n] of [['{oops',0],['[]',0],['null',0],['{"unknown":3}',0],[JSON.stringify({'rose-red':0,'rose-blush':-1,'rose-white':1.5,'mixed-spring':'2','mixed-wild':100,'mixed-peony':null,'plant-fern':true}),0],['{"rose-red":99,"rose-blush":1,"unknown":7}',100]]){
   await page.evaluate(raw=>localStorage.setItem('bloomcart-cart-v1',raw),raw);await page.reload();await badge(n);
  }
  await page.getByRole('button',{name:'Choose quantity for '+products[0].name,exact:true}).click();await page.locator('#confirmPurchase').click();assert.equal(await page.locator('#quantityError').isVisible(),true);await badge(100);await page.locator('#closePurchase').click();
  await page.evaluate(()=>localStorage.clear());await page.reload();
 });
 await check('Empty cart, decrease to zero, and zero subtotal',async()=>{
  await add(products[0].name);await open();await page.getByRole('button',{name:'Decrease quantity of '+products[0].name,exact:true}).click();await badge(0);assert.equal(await page.locator('#cartEmpty').isVisible(),true);assert.equal(await page.locator('#subtotal').textContent(),'$0.00');await close();
 });
 await check('Drawer focus entry, both Tab directions, background prevention, close/Escape/backdrop and return focus',async()=>{
  await add(products[0].name);await open();assert.equal(await page.locator(':focus').getAttribute('id'),'closeCart');
  await page.keyboard.press('Shift+Tab');assert.match(await page.locator(':focus').getAttribute('aria-label'),/^Remove/);await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'closeCart');
  for(let i=0;i<15;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#drawer').contains(document.activeElement)),true)}
  assert.equal(await page.evaluate(()=>document.querySelector('#top').inert&&document.querySelector('.site-header').inert&&document.querySelector('.foot').inert&&document.querySelector('.skip').inert),true);
  await page.evaluate(()=>document.querySelector('#search').focus());assert.equal(await page.evaluate(()=>document.querySelector('#drawer').contains(document.activeElement)),true);
  for(const method of ['button','escape','backdrop']){
   if(method==='button')await close();else if(method==='escape')await page.keyboard.press('Escape');else await page.locator('#backdrop').click({position:{x:10,y:200}});
   assert.equal(await page.locator('#drawer').isHidden(),true);assert.equal(await page.locator(':focus').getAttribute('id'),'cartBtn');assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('lock')),false);
   if(method!=='backdrop')await open();
  }
 });
 await check('Mobile menu keyboard Enter/Space/Escape, links and aria-expanded',async()=>{
  await setViewport({width:390,height:844});await page.locator('#menuToggle').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').textContent(),'Home');await page.keyboard.press('Escape');assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'),'false');assert.equal(await page.locator(':focus').getAttribute('id'),'menuToggle');await page.keyboard.press('Space');assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'),'true');await page.locator('#nav a[href="#catalog"]').click();assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'),'false');
 });
 await check('Resize resets menu and preserves modal; focus remains on visible controls',async()=>{
  await page.locator('#menuToggle').click();await setViewport({width:1024,height:900});await page.waitForFunction(()=>document.querySelector('#menuToggle').getAttribute('aria-expanded')==='false');assert.equal(await page.locator('#nav').isVisible(),true);
  await setViewport({width:390,height:844});assert.equal(await page.locator('#nav').isVisible(),false);
  await page.locator('#menuToggle').click();await open();assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'),'false');await setViewport({width:1440,height:1000});assert.equal(await page.locator('#drawer').isVisible(),true);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#drawer').contains(document.activeElement)),true);await close();
 });
 await check('All navigation anchors, hero CTA, skip link and search form',async()=>{
  for(const selector of ['.brand','#nav a[href="#top"]','#nav a[href="#catalog"]','#nav a[href="#about"]','.hero .btn']){
   await page.locator(selector).click();const id=(await page.locator(selector).getAttribute('href')).slice(1);await page.waitForTimeout(100);assert.equal(await page.evaluate(id=>Math.round(document.querySelector('#'+id).getBoundingClientRect().top)>=Math.floor(document.querySelector('.site-header').getBoundingClientRect().bottom),id),true);
  }
  await page.locator('.skip').focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#catalog');await page.locator('#search').fill('rose');await page.locator('#search').press('Enter');assert.equal((await names()).length,3);await page.locator('#search').fill('');
 });
 await check('320/390/768/1024/1440: assets decode, no horizontal overflow, sticky header and unobscured anchors',async()=>{
  for(const width of [320,390,768,1024,1440]){
   await setViewport({width,height:1000});await page.goto(base);
   for(const img of await page.locator('.hero img, .card img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode())}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);
   await page.evaluate(()=>document.querySelector('#catalog').scrollIntoView());await page.waitForTimeout(100);
   assert.equal(await page.locator('.site-header').evaluate(e=>Math.round(e.getBoundingClientRect().top)),0);
   assert.equal(await page.evaluate(()=>document.querySelector('#catalog').getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom),true,'anchor at '+width);
   await page.locator('#sort').selectOption('desc');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await open();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await close();
  }
 });
 await check(process.env.TEST_URL?'Packaged desktop and mobile screenshots load':'Updated desktop and mobile screenshots',async()=>{
  if(process.env.TEST_URL){
   for(const name of ['desktop','mobile']){const response=await context.request.get(base+'docs/screenshot-'+name+'.png');assert.equal(response.status(),200);assert.ok((await response.body()).length>10000)}
   return;
  }
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   await setViewport({width,height});await page.goto(base);await page.evaluate(()=>localStorage.clear());await page.reload();
   for(const img of await page.locator('.hero img, .card img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode())}
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'BloomCart/docs/screenshot-'+name+'.png',fullPage:true});
  }
 });
 await check('No browser console errors, uncaught errors or failed HTTP assets',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(failed,[])});
 const report={date:'2026-10-27',browser:await browser.version(),base,checks:results,errors,failed};
 fs.writeFileSync(process.env.TEST_URL?'package-browser-results.json':'BloomCart/docs/browser-results.json',JSON.stringify(report,null,2)+'\n');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

