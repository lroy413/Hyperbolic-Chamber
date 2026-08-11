/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve('index.html');
const FULLCAT=require('fs').readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json'&&!/^audio-/.test(f)).map(f=>JSON.parse(require('fs').readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

let pass=0,fail=0;
function ok(n,c){ (c?pass++:fail++); console.log((c?'  PASS ':'  FAIL ')+n); }

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  // phone viewport: the drawer is a slide-out sheet behind a hamburger
  const ctx = await browser.newContext({javaScriptEnabled:true,viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
  const p=await ctx.newPage();
  const errors=[];
  p.on('pageerror',e=>errors.push(String(e)));
  p.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
  await p.goto(URL,{waitUntil:'load'});await useCat(p);
  await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(150);
  await p.evaluate(()=>{location.hash='#library';}); await p.waitForTimeout(200);

  // --- header (orientation, not brand) ---
  ok('library header names the screen', /Library/.test(await p.locator('.libh1').innerText().catch(()=>'')));
  ok('header carries live state, not a slogan', /course/i.test(await p.locator('.libstat').innerText().catch(()=>'')));
  ok('search bar present', await p.locator('#coursesearch').count()>0);

  // --- drawer closed by default, opens on toggle ---
  ok('drawer starts closed', !(await p.locator('#navdrawer').evaluate(el=>el.classList.contains('open'))));
  await p.locator('#navtoggle').click(); await p.waitForTimeout(320);
  ok('drawer opens on hamburger click', await p.locator('#navdrawer').evaluate(el=>el.classList.contains('open')));
  ok('drawer has Settings item', await p.locator('.navitem[href="#settings"]').count()>0);
  ok('drawer has Rewards item', await p.locator('.navitem[href="#badges"]').count()>0);
  ok('drawer has Course library item', await p.locator('.navitem[href="#library"]').count()>0);
  ok('drawer has Review item', await p.locator('.navitem[href="#review"]').count()>0);
  ok('drawer has account row', await p.locator('.navacct').count()>0);

  // scrim closes it
  // click the scrim well clear of the drawer (which sits on the right edge)
  await p.locator('#navscrim').click({position:{x:20,y:400},force:true}); await p.waitForTimeout(320);
  ok('scrim click closes drawer', !(await p.locator('#navdrawer').evaluate(el=>el.classList.contains('open'))));

  // nav item navigates + auto-closes
  await p.locator('#navtoggle').click(); await p.waitForTimeout(250);
  await p.locator('.navitem[href="#settings"]').click(); await p.waitForTimeout(250);
  ok('nav item routes to settings', /#settings/.test(await p.evaluate(()=>location.hash)));
  ok('drawer closed after navigation', !(await p.locator('#navdrawer').evaluate(el=>el.classList.contains('open')).catch(()=>false)));

  // back to the library for filter tests
  await p.evaluate(()=>{location.hash='#library';}); await p.waitForTimeout(200);

  // --- category chips derived from real courses ---
  // chips and specialization groups answer the same question, so the library
  // shows only one at a time. Switch to A-Z to exercise the chips.
  const az=p.locator('[data-libgroup="az"]');
  if(await az.count()){await az.click();await p.waitForTimeout(300);}
  const chipTexts=await p.locator('#catchips .chip').allInnerTexts();
  ok('chips include All', chipTexts.some(t=>/All/i.test(t)));
  ok('chips include a real category (Technology/Finance)', chipTexts.some(t=>/Technology|Finance/i.test(t)));

  const totalCards=await p.locator('.homegrid .libcard[data-cid]').count();
  ok('has at least 2 course cards', totalCards>=2);

  // click Finance chip -> only Finance cards visible
  const finChip=p.locator('#catchips .chip', {hasText:'Finance'});
  if(await finChip.count()){
    await finChip.first().click(); await p.waitForTimeout(150);
    const visible=await p.locator('.homegrid .libcard[data-cid]').evaluateAll(els=>els.filter(e=>e.style.display!=='none').length);
    const finCount=await p.locator('.homegrid .libcard[data-cid][data-cat="Finance"]').count();
    ok('Finance chip filters to Finance courses only', visible===finCount && finCount>0);
    // reset
    await p.locator('#catchips .chip[data-cat="__all"]').click(); await p.waitForTimeout(120);
  } else { ok('Finance chip filters to Finance courses only (skipped - no finance course)', true); }

  const allVisible=await p.locator('.homegrid .libcard[data-cid]').evaluateAll(els=>els.filter(e=>e.style.display!=='none').length);
  ok('All chip shows every course', allVisible===totalCards);

  // --- search filters ---
  await p.locator('#coursesearch').fill('zzzznope'); await p.waitForTimeout(150);
  const noneVisible=await p.locator('.homegrid .libcard[data-cid]').evaluateAll(els=>els.filter(e=>e.style.display!=='none').length);
  ok('nonsense search hides all courses', noneVisible===0);
  ok('empty-state shows on no matches', await p.locator('#libempty').evaluate(el=>el.style.display!=='none'));
  await p.locator('#coursesearch').fill(''); await p.waitForTimeout(150);
  const backVisible=await p.locator('.homegrid .libcard[data-cid]').evaluateAll(els=>els.filter(e=>e.style.display!=='none').length);
  ok('clearing search restores courses', backVisible===totalCards);

  ok('no page/console errors', errors.length===0);
  if(errors.length) console.log('  ERRORS:', errors.slice(0,4));

  await browser.close();
  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})();
