/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');const URL='file://'+path.resolve('index.html');
const FULLCAT=require('fs').readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json'&&!/^audio-/.test(f)).map(f=>JSON.parse(require('fs').readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

let pass=0,fail=0;function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx = await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});await useCat(p);await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(200);

// ---- Tracks ----
// a brand-new learner is NOT assigned a specialization — they are invited to pick one
ok('new learner sees no assigned specialization', await p.locator('.sec-track .tkrow').count()===0);
ok('new learner is invited to choose a specialization', await p.locator('.chooser .chrow [data-pick-track]').count()>=3);
await p.locator('[data-pick-track]').first().click();await p.waitForTimeout(250);
ok('choosing sets it as the current specialization', await p.locator('.sec-track .tkrow').count()>0);
ok('choice persists in settings', await p.evaluate(()=>!!(JSON.parse(localStorage.getItem('courseapp_v1')||'{}').settings||{}).track));
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(250);
await p.locator('[data-secttoggle="tracks"]').click();await p.waitForTimeout(250);
ok('library lists all specializations', await p.locator('.trackrows .tkrow').count()>=3);
await p.locator('.tkrow', {hasText:'Markets & Money'}).click();await p.waitForTimeout(250);
ok('track page routes', /#track\//.test(await p.evaluate(()=>location.hash)));
ok('track lists courses in order', await p.locator('.trow').count()>=2);
ok('track shows a present course as a link', await p.locator('a.trow').count()>0);
ok('film track shows coming-soon rows', await (async()=>{await p.evaluate(()=>{location.hash='#track/film';});await p.waitForTimeout(200);return await p.locator('.trow.locked').count()>0;})());

// program certificate appears when all present courses passed
await p.evaluate(()=>{var st=JSON.parse(localStorage.getItem('courseapp_v1')||'{}');st.progress={'app-builder':{finalPassed:true,passed:{},lastPage:''}};localStorage.setItem('courseapp_v1',JSON.stringify(st));});
await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(150);
await p.evaluate(()=>{location.hash='#track/web';});await p.waitForTimeout(200);
ok('program certificate shows when all-built-in track complete', await p.locator('.progcert').count()>0);

// ---- new content blocks render in the upgraded courses ----
await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(150);
// find a lesson with a rubric/resources/annotate by scanning app-builder capstone (last module)
await p.evaluate(()=>{var c=[].concat(window.BUILTIN_COURSES||[],window.STORE_CATALOG||[]).find(x=>x.id==='app-builder');window.__mods=c.modules.length;});
// walk lessons to find our blocks in the DOM across a few pages
let foundRes=false,foundSvg=false;
const mods=await p.evaluate(()=>window.__mods);
for(let m=1;m<=mods && !(foundRes&&foundSvg);m++){
  const c=await p.evaluate(mm=>{var cc=[].concat(window.BUILTIN_COURSES||[],window.STORE_CATALOG||[]).find(x=>x.id==='app-builder');return cc.modules[mm-1].lessons.length;},m);
  for(let l=1;l<=c;l++){
    await p.evaluate(x=>{location.hash='#c/app-builder/m'+x.m+'-l'+x.l;},{m,l});await p.waitForTimeout(40);
    if(!foundRes && await p.locator('.resources').count()) foundRes=true;
    if(!foundSvg && await p.locator('.figsvg svg').count()) foundSvg=true;
  }
}
ok('resources block renders', foundRes);
ok('inline themed SVG figures render', foundSvg);

// rubric render + completion via an injected fixture (capstone rubrics live in locked modules by design)
await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(150);
await p.evaluate(()=>{var fx={id:'rbfx',title:'RB',subtitle:'x',tagline:'x',accent:'#7b61ff',modules:[{title:'M1',tagline:'t',objectives:['o'],lessons:[{title:'L1',blocks:[{t:'p',html:'intro'},{t:'rubric',title:'Assignment: build it',brief:'Do the thing.',items:['Shows A','Shows B']}]}],quiz:{questions:[{q:'q',options:['a','b'],answer:0,explain:'e'}]}}],finalExam:{questions:[{q:'q',options:['a','b'],answer:0,explain:'e'}]}};window.BUILTIN_COURSES.push(fx);location.hash='#c/rbfx/m1-l1';});
await p.waitForTimeout(200);
ok('rubric/assignment block renders', await p.locator('.rubricblock').count()>0);
const xpBefore=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.xp||0);
await p.locator('.rbdone').first().click();await p.waitForTimeout(120);
ok('assignment marks complete', await p.locator('.rbdone.done').count()>0);
const st2=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')));
ok('assignment persisted to store', Object.keys(st2.assignments||{}).length>0);
ok('assignment awarded XP', (st2.gam.xp||0)>xpBefore);
await p.evaluate(()=>{window.BUILTIN_COURSES.push?0:0;location.hash='#';});await p.waitForTimeout(80);
await p.evaluate(()=>{if(!window.BUILTIN_COURSES.some(c=>c.id==='rbfx')){var fx={id:'rbfx',title:'RB',subtitle:'x',tagline:'x',accent:'#7b61ff',modules:[{title:'M1',tagline:'t',objectives:['o'],lessons:[{title:'L1',blocks:[{t:'rubric',title:'Assignment: build it',brief:'Do the thing.',items:['Shows A','Shows B']}]}],quiz:{questions:[{q:'q',options:['a','b'],answer:0,explain:'e'}]}}],finalExam:{questions:[{q:'q',options:['a','b'],answer:0,explain:'e'}]}};window.BUILTIN_COURSES.push(fx);}location.hash='#c/rbfx/m1-l1';});
await p.waitForTimeout(180);
ok('assignment stays complete after navigating back', await p.locator('.rbdone.done').count()>0);

ok('no page/console errors', errs.length===0);
if(errs.length)console.log('  ERRORS:',errs.slice(0,5));
await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(2);});
