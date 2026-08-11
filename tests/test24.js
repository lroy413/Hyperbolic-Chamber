/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test24 — desktop layout + specialization onboarding
   Runs the same app at a laptop viewport and asserts the desktop affordances
   exist, then re-runs the critical ones at phone width to prove nothing on
   mobile changed. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

let pass=0,fail=0;
// Settings/Rewards groups collapse now — open one before touching what's inside.
const openSect=async(pg,id)=>{
  const head=pg.locator('[data-secttoggle="'+id+'"]');
  if(await head.count()){
    const sec=pg.locator('.coll[data-sect="'+id+'"]');
    const isOpen=await sec.evaluate(el=>el.classList.contains('open')).catch(()=>false);
    if(!isOpen){await head.click();await pg.waitForTimeout(260);}
  }
};
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
const vis=(loc)=>loc.first().isVisible().catch(()=>false);

async function seed(p,state){
  await p.evaluate(([st,cs])=>{localStorage.clear();localStorage.setItem('courseapp_v1',JSON.stringify(st));window.STORE_CATALOG=cs;location.hash='';},[state,FULLCAT]);
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(260);
  await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(220);
}

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

/* ============ DESKTOP ============ */
{
  const ctx = await b.newContext({javaScriptEnabled:true,viewport:{width:1440,height:900}});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto(URL,{waitUntil:'load'});await useCat(p);
  await seed(p,{imported:JSON.parse(JSON.stringify(FULLCAT)),settings:{theme:'dark',palette:'aurora',scale:1,track:'web'},
    progress:{'app-builder':{passed:{m1:true},finalPassed:false,lastPage:'m2-l1'}},recent:{courseId:'app-builder',page:'m2-l1'}});

  console.log('-- desktop: persistent nav rail');
  ok('nav rail is visible without opening anything', await vis(p.locator('#navdrawer')));
  ok('hamburger is hidden on desktop', !(await vis(p.locator('#navbtn, #navtoggle'))));
  ok('scrim is not shown on desktop', !(await vis(p.locator('#navscrim'))));
  const railBox=await p.locator('#navdrawer').boundingBox();
  ok('rail is docked to the left edge', railBox && railBox.x===0);
  ok('rail is a fixed 264px column', railBox && Math.round(railBox.width)===264);
  const bodyPad=await p.evaluate(()=>parseFloat(getComputedStyle(document.body).paddingLeft));
  ok('content is offset by the rail width', Math.round(bodyPad)===264);
  ok('rail nav still routes', await (async()=>{await p.locator('#navdrawer .navitem[href="#settings"]').click();await p.waitForTimeout(260);return /#settings/.test(await p.evaluate(()=>location.hash));})());
  ok('active rail item is marked', await p.locator('#navdrawer .navitem.on[href="#settings"]').count()>0);

  console.log('-- desktop: layout uses the width');
  await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(300);
  ok('home topbar is hidden (rail carries the brand)', !(await vis(p.locator('.topbar.nb'))));
  ok('home renders a two-column dashboard', await p.evaluate(()=>getComputedStyle(document.querySelector('.dashcols')).display==='grid'));
  const cols=await p.evaluate(()=>getComputedStyle(document.querySelector('.dashcols')).gridTemplateColumns.split(' ').length);
  ok('dashboard has exactly two columns', cols===2);
  ok('side column is sticky', await p.evaluate(()=>getComputedStyle(document.querySelector('.dashside')).position==='sticky'));
  const wrapW=await p.evaluate(()=>document.querySelector('.wrap').getBoundingClientRect().width);
  ok('content column is wider than the phone layout', wrapW>=1000);
  ok('no horizontal overflow', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));

  await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(320);
  ok('library shows courses in a multi-column grid', await p.evaluate(()=>getComputedStyle(document.querySelector('.homegrid')).gridTemplateColumns.split(' ').length>=2));

  console.log('-- desktop: lesson study rail');
  await p.evaluate(()=>{location.hash='#c/app-builder/m1-l2';});await p.waitForTimeout(360);
  ok('lesson page shows the contents rail', await vis(p.locator('.readrail')));
  ok('rail is sticky', await p.evaluate(()=>getComputedStyle(document.querySelector('.readrail')).position==='sticky'));
  ok('rail lists the module lessons', await p.locator('.readrail .rritem').count()>=3);
  ok('rail marks the current lesson', await p.locator('.readrail .rritem.on').count()===1);
  ok('rail links jump to another lesson', await (async()=>{await p.locator('.readrail .rritem:not(.on):not(.lock) a').first().click();await p.waitForTimeout(320);return /#c\/app-builder\//.test(await p.evaluate(()=>location.hash));})());
  ok('lesson body still renders alongside the rail', await p.locator('#lessonbody, .pagecard').count()>0);
  const measure=await p.evaluate(()=>{const el=[].slice.call(document.querySelectorAll('.lesson>p')).filter(x=>x.textContent.trim().length>120)[0];if(!el)return 0;const cs=getComputedStyle(el);return el.getBoundingClientRect().width/(parseFloat(cs.fontSize)*0.5);});
  ok('prose stays at a readable measure (<95ch)', measure===0||measure<95);

  console.log('-- desktop: keyboard');
  await p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await p.waitForTimeout(340);
  await p.keyboard.press('ArrowRight');await p.waitForTimeout(320);
  ok('ArrowRight advances to the next page', /m1-l2$/.test(await p.evaluate(()=>location.hash)));
  await p.keyboard.press('ArrowLeft');await p.waitForTimeout(320);
  ok('ArrowLeft goes back', /m1-l1$/.test(await p.evaluate(()=>location.hash)));
  await p.locator('[data-notetoggle]').click();await p.waitForTimeout(260);
  await p.locator('#noteinput').click();await p.waitForTimeout(120);
  await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);
  ok('arrows are ignored while typing a note', /m1-l1$/.test(await p.evaluate(()=>location.hash)));
  await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(340);
  await p.keyboard.press('/');await p.waitForTimeout(200);
  ok('"/" focuses the library search', await p.evaluate(()=>document.activeElement&&document.activeElement.id==='coursesearch'));
  await p.keyboard.type('zzz');await p.waitForTimeout(200);
  await p.keyboard.press('Escape');await p.waitForTimeout(220);
  ok('Escape clears and blurs the search', await p.evaluate(()=>document.getElementById('coursesearch').value===''));
  ok('lesson rail advertises the shortcut', await (async()=>{await p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await p.waitForTimeout(320);return await p.locator('.rrkeys kbd').count()===2;})());

  console.log('-- desktop: specialization onboarding');
  await seed(p,{settings:{theme:'dark',palette:'aurora',scale:1}});
  ok('no specialization is assigned to a new learner', await p.locator('.sec-track .tkrow').count()===0);
  ok('home invites the learner to choose one', await p.locator('.chooser').count()>0);
  ok('every specialization is offered', await p.locator('.chooser [data-pick-track]').count()>=5);
  await p.locator('.chooser [data-pick-track]').nth(1).click();await p.waitForTimeout(340);
  ok('picking one replaces the invitation with the card', await p.locator('.sec-track .tkrow').count()===1 && await p.locator('.chooser').count()===0);
  const picked=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).settings.track);
  ok('the pick is persisted', !!picked);
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(300);
  ok('the pick survives a reload', await p.locator('.sec-track .tkrow').count()===1);
  await p.locator('.secta[href="#choose"]').click();await p.waitForTimeout(320);
  ok('"Change" opens the chooser page', /#choose/.test(await p.evaluate(()=>location.hash)) && await p.locator('.chlist-page').count()>0);
  ok('the chooser page marks the current pick', await p.locator('.chrow.on .chon').count()===1);
  await p.locator('.chclear [data-pick-track=""]').click();await p.waitForTimeout(340);
  ok('clearing removes the specialization', await p.evaluate(()=>!JSON.parse(localStorage.getItem('courseapp_v1')).settings.track));
  await p.evaluate(()=>{location.hash='#track/film';});await p.waitForTimeout(320);
  ok('track page offers to make it yours', await p.locator('.stpick [data-pick-track="film"]').count()===1);
  await p.locator('.stpick [data-pick-track="film"]').click();await p.waitForTimeout(340);
  ok('track page confirms it is now yours', await p.locator('.stpick .chon').count()===1);

  console.log('-- desktop: the survival track');
  await p.evaluate(()=>{location.hash='#track/survival';});await p.waitForTimeout(360);
  ok('survival track renders', /Wilderness, Sea/.test(await p.locator('.tkheroin h1').innerText().catch(()=>'')));
  ok('all eight courses are listed', await p.locator('.trow').count()===8);
  ok('ungenerated courses show Coming soon', await p.locator('.trow.locked').count()===8);
  const names=await p.locator('.trow .trtitle').allInnerTexts();
  ok('ungenerated courses use their real titles, not the id', names.some(n=>/Wilderness & Austere Medicine/.test(n)) && !names.some(n=>/^Surv \d/.test(n)));
  ok('track has an about paragraph', (await p.locator('.tkabouttxt').innerText()).length>400);
  ok('track lists outcomes, careers and readings', await p.locator('.tkoutcomes li').count()>=6 && await p.locator('.career').count()>=5 && await p.locator('.reslist li').count()>=5);
  ok('survival appears in the chooser', await (async()=>{await p.evaluate(()=>{location.hash='#choose';});await p.waitForTimeout(320);return await p.locator('.chrow [data-pick-track="survival"], .chrow.on').count()>0 && (await p.locator('#app').innerText()).indexOf('Survival')>-1;})());

  console.log('-- desktop: progress still infers a track when nothing was picked');
  await seed(p,{imported:JSON.parse(JSON.stringify(FULLCAT)),settings:{theme:'dark',palette:'aurora',scale:1},
    progress:{'app-builder':{passed:{m1:true},finalPassed:false,lastPage:'m2-l1'}},recent:{courseId:'app-builder',page:'m2-l1'}});
  ok('a learner with real progress sees their track, not the picker', await p.locator('.sec-track .tkrow').count()===1 && await p.locator('.chooser').count()===0);

  ok('no console errors on desktop', errs.length===0);
  if(errs.length)console.log('   ',errs.slice(0,4));
  await ctx.close();
}

/* ============ PHONE — nothing regressed ============ */
{
  const ctx = await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto(URL,{waitUntil:'load'});await useCat(p);
  await seed(p,{imported:JSON.parse(JSON.stringify(FULLCAT)),settings:{theme:'dark',palette:'aurora',scale:1,track:'web'},
    progress:{'app-builder':{passed:{m1:true},finalPassed:false,lastPage:'m2-l1'}},recent:{courseId:'app-builder',page:'m2-l1'}});

  console.log('-- phone: unchanged');
  ok('phone still uses the slide-out drawer', !(await vis(p.locator('#navdrawer'))) || !(await p.locator('#navdrawer').evaluate(el=>el.classList.contains('open'))));
  ok('hamburger is visible on phones', await vis(p.locator('#navtoggle')));
  ok('content is not offset', await p.evaluate(()=>parseFloat(getComputedStyle(document.body).paddingLeft))===0);
  ok('home topbar is shown on phones', await vis(p.locator('.topbar')));
  await p.evaluate(()=>{location.hash='#c/app-builder/m1-l2';});await p.waitForTimeout(340);
  ok('study rail is hidden on phones', !(await vis(p.locator('.readrail'))));
  ok('lesson still renders', await p.locator('.pagecard').count()>0);
  ok('no horizontal overflow on phones', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  ok('no console errors on phone', errs.length===0);
  if(errs.length)console.log('   ',errs.slice(0,4));
  await ctx.close();
}

await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
