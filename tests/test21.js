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
const p=await (await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:900}})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});await useCat(p);await p.evaluate(()=>localStorage.clear());
await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(250);

// ---- library starts EMPTY ----
ok('no built-in courses ship into the library', await p.evaluate(()=>(window.BUILTIN_COURSES||[]).length===0));
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(300);
ok('library starts empty', await p.locator('.homegrid .libcard[data-cid]').count()===0);
ok('empty library shows a Store call-to-action', await p.locator('.emptylib a[href="#library/store"]').count()>0);
ok('home leads with an add-your-first-course tile', await (async()=>{await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(300);return await p.locator('.bmain[href="#library/store"]').count()>0;})());

// ---- all 4 courses are in the store ----
await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(350);
const names=await p.locator('.sttitle').allInnerTexts();
ok('store lists every preloaded course', names.length===(await p.evaluate(()=>(window.STORE_CATALOG||[]).length)));

// ---- adding one moves it into the library ----
await p.locator('.stbtn[data-getcourse="app-builder"]').click();await p.waitForTimeout(300);
const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));
ok('adding from store installs the course', (st.imported||[]).some(c=>c.id==='app-builder'));
ok('added course is no longer offered', await p.locator('.stbtn[data-getcourse="app-builder"]').count()===0);
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(300);
ok('added course now appears in the library', await p.locator('.homegrid .libcard[data-cid="app-builder"]').count()===1);
ok('added course is usable', await (async()=>{await p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await p.waitForTimeout(300);return await p.locator('#lessonbody').count()>0;})());

// ---- migration: existing progress restores the course ----
await p.evaluate(()=>{localStorage.setItem('courseapp_v1',JSON.stringify({progress:{'stock-charts':{passed:{m1:true},finalPassed:false,lastPage:'m2-l1',name:''}},imported:[]}));});
await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(350);
ok('progress for a not-yet-added course is preserved, not discarded', await p.evaluate(()=>{var s=JSON.parse(localStorage.getItem('courseapp_v1')||'{}');return !!(s.progress&&s.progress['stock-charts']);}));

// ---- specialization detail depth ----
await p.evaluate(()=>{location.hash='#track/web';});await p.waitForTimeout(350);
const txt=await p.locator('#app').innerText();
ok('track shows an About section', /About this specialization/i.test(txt));
ok('track shows outcomes', await p.locator('.tkoutcomes li').count()>=3);
ok('track shows real-world careers', await p.locator('.career .crole').count()>=3);
ok('track shows further reading', /Further reading/i.test(txt) && await p.locator('.resources .reslist li').count()>=3);
ok('track shows related specializations', await p.locator('.trackrows .tkrow').count()>=1);
ok('track flags courses still in the store', await (async()=>{await p.evaluate(()=>{location.hash='#track/influence';});await p.waitForTimeout(300);return await p.locator('.trow.instore').count()>=1;})());

ok('no console errors', errs.length===0);
if(errs.length)console.log('  ERRORS:',errs.slice(0,4));
await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(2);});
