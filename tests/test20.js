/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');const URL='file://'+path.resolve('index.html');
const FULLCAT=require('fs').readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json'&&!/^audio-/.test(f)).map(f=>JSON.parse(require('fs').readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

let pass=0,fail=0;function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
// Settings/Rewards groups collapse now — open one before touching what's inside.
const openSect=async(pg,id)=>{
  const head=pg.locator('[data-secttoggle="'+id+'"]');
  if(await head.count()){
    const sec=pg.locator('.coll[data-sect="'+id+'"]');
    const isOpen=await sec.evaluate(el=>el.classList.contains('open')).catch(()=>false);
    if(!isOpen){await head.click();await pg.waitForTimeout(260);}
  }
};
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const p=await (await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:900}})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});await useCat(p);
// seed a recent course so jump-back-in shows
await p.evaluate(cs=>{var d=new Date().toISOString().slice(0,10);localStorage.setItem('courseapp_v1',JSON.stringify({settings:{theme:'dark',palette:'aurora',scale:1},gam:{xp:50,goal:30,today:d,todayXP:10,done:{},badges:{}},imported:cs.filter(c=>c.id==='app-builder'),progress:{'app-builder':{passed:{m1:true},finalPassed:false,lastPage:'m2-l1',name:''}},recent:{courseId:'app-builder',page:'m2-l1'},review:{},bookmarks:[],notes:{},marks:{},assignments:{}}));},FULLCAT);
await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(250);

// ---- HOME = My Learning ----
ok('home drops the dead nameplate header', await p.locator('.dashhead').count()===0);
ok('home leads with one main tile', await p.locator('.bmain').count()===1);
ok('next-up resumes the recent lesson', /Pick up where you left off/i.test(await p.locator('.bmain').innerText()));
ok('home has current specialization row', await p.locator('.sec-track .tkrow').count()===1);
ok('home has the compact stat strip', await p.locator('.statstrip .ss').count()===6);
ok('home has today\u2019s quests', await p.locator('.qtiles .qtile').count()===3);
ok('top bar carries streak, XP and rank', await p.locator('.tbstats .tbs').count()===3);
ok('home collapses Discover by default', await p.evaluate(()=>{var s=document.querySelector('[data-sect="discover"]');return !s||!s.classList.contains('open');}));
ok('home has NO hero', await p.locator('.hero2-h').count()===0);
ok('home has NO search bar', await p.locator('#coursesearch').count()===0);
ok('home has NO full course grid', await p.locator('.homegrid .libcard[data-cid]').count()===0);
ok('bottom tab bar reaches the library', await p.locator('.tabbar .tab[href="#library"]').count()===1);

// ---- LIBRARY ----
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(250);
ok('library has tabs', await p.locator('.libtabs .libtab').count()===2);
ok('library My courses tab active', await p.locator('.libtab.on', {hasText:'My courses'}).count()>0);
ok('library shows its header', await p.locator('.libh1').count()>0);
ok('library shows course grid', await p.locator('.homegrid .libcard[data-cid]').count()>=1);
await p.locator('[data-secttoggle="tracks"]').click();await p.waitForTimeout(250);
ok('library specializations expand to compact rows', await p.locator('.trackrows .tkrow').count()>=3);
ok('specializations collapse again', await (async()=>{await p.locator('[data-secttoggle="tracks"]').click();await p.waitForTimeout(250);return !(await p.locator('.coll[data-sect="tracks"]').evaluate(el=>el.classList.contains('open')));})());
// back button context: track entered from LIBRARY goes back to Library
await p.locator('[data-secttoggle="tracks"]').click();await p.waitForTimeout(220);
await p.locator('.tkrow').first().click();await p.waitForTimeout(280);
ok('track back button says Library when entered from library', /Library/.test(await p.locator('.tbback').innerText().catch(()=>'')));
await p.locator('.tbback').click();await p.waitForTimeout(280);
ok('track back actually returns to the library', /#library/.test(await p.evaluate(()=>location.hash)));
// and from HOME it goes back to My Learning
await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(250);
await p.locator('.sec-track .tkrow').first().click();await p.waitForTimeout(280);
ok('track back button says My Learning when entered from home', /My Learning/.test(await p.locator('.tbback').innerText().catch(()=>'')));
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(250);

// ---- STORE tab ----
await p.locator('.libtab', {hasText:'Store'}).click();await p.waitForTimeout(300);
ok('store tab active + routes', /#library\/store/.test(await p.evaluate(()=>location.hash)));
const storeNames=await p.locator('.sttitle').allInnerTexts();
ok('store shows not-yet-added courses', storeNames.some(n=>/Personal Finance|Negotiation/i.test(n)));
// owned courses stay in the list now, marked, so the sequence still reads correctly
ok('an owned course stays visible in its specialization', storeNames.some(n=>/Full-Stack Web Engineer/i.test(n)));
ok('but it is not offered for download again', await p.locator('.stbtn[data-getcourse="app-builder"]').count()===0);
ok('it is marked as already in the library', await p.locator('.strow.have').count()>=1);

// #store alias still routes to the store tab
await p.evaluate(()=>{location.hash='#store';});await p.waitForTimeout(250);
ok('#store alias routes to library store', await p.locator('.libtab.on', {hasText:'Store'}).count()>0);

// drawer renamed
await p.locator('#navtoggle').click();await p.waitForTimeout(250);
ok('drawer shows "My Learning" + "Course library"', await p.locator('.navitem[href="#"]',{hasText:'My Learning'}).count()>0 && await p.locator('.navitem[href="#library"]').count()>0);

ok('no console errors', errs.length===0);
if(errs.length)console.log('  ERRORS:',errs.slice(0,4));
await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(2);});
