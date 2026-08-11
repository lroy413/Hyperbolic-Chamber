/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');const URL='file://'+path.resolve('index.html');
const FULLCAT=require('fs').readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json'&&!/^audio-/.test(f)).map(f=>JSON.parse(require('fs').readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

let pass=0,fail=0;function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx = await b.newContext({javaScriptEnabled:true,hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'load'});await useCat(p);await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(150);
// set a non-default palette via settings swatch
await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(200);
const sw=p.locator('.swatch[data-palette="verdant"]');
ok('palette swatch present in settings', await sw.count()>0);
await sw.tap();await p.waitForTimeout(200);
ok('swatch applied palette to <html>', (await p.evaluate(()=>document.documentElement.getAttribute('data-palette')))==='verdant');
ok('still on settings after swatch tap', await p.locator('.segbtn').count()>0);
// now go into a lesson and tap a knowledge check — must NOT jump to settings
await p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await p.waitForTimeout(250);
ok('kcheck present with non-default palette', await p.locator('.kcheck .opt').count()>0);
await p.locator('.kcheck .opt').first().tap();await p.waitForTimeout(200);
ok('kcheck tap did NOT open settings', await p.locator('.segbtn').count()===0);
ok('still on the lesson', /m1-l1/.test(await p.evaluate(()=>location.hash)));
ok('kcheck still visible (revealed feedback)', await p.locator('.kcheck').count()>0);
// tap various other spots on the lesson to be sure clicks don't route to settings
await p.locator('.qtext').first().tap().catch(()=>{});await p.waitForTimeout(120);
ok('tapping lesson text did NOT open settings', await p.locator('.segbtn').count()===0);
// settings back button returns to library
await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(200);
await p.locator('.tbback').tap();await p.waitForTimeout(200);
ok('settings back button returns to the home screen', await p.locator('.bmain, .chooser').count()>0 && (await p.evaluate(()=>location.hash))==='' );
await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})();
