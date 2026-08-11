/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
let pass=0,fail=0;function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
const ROOT=path.resolve('.');
/* What ships is one file per course in catalog/, so that directory — not a
   number typed into this file — is what the store has to agree with. The
   hardcoded 5 here outlived the fifth course and asserted nothing afterwards. */
const COURSE_FILES=fs.readdirSync(path.join(ROOT,'catalog')).filter(f=>/\.json$/.test(f)&&f!=='index.json');
const srv=http.createServer((req,res)=>{
  const f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('nf');}
  /* sw.js has to arrive as JavaScript. Serving everything-but-JSON as text/html
     made the browser refuse to register the service worker, which showed up only
     as a console error this suite then had to pretend not to see. */
  const MIME={'.json':'application/json','.js':'text/javascript','.webmanifest':'application/manifest+json',
    '.png':'image/png','.svg':'image/svg+xml','.css':'text/css'};
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'text/html'});
  res.end(fs.readFileSync(f));
});
/* Course bodies live in IndexedDB (oboros_courses/bodies, keyed by id), and
   localStorage keeps summaries only. Reading `imported` out of localStorage and
   expecting modules — as this suite used to — describes the app from before that
   move. The localStorage branch below is the app's own fallback path, not a
   second guess at where the body might be. */
function storedModuleCount(page,id){
  return page.evaluate(cid=>new Promise(res=>{
    function fromLocal(){
      try{
        const s=JSON.parse(localStorage.getItem('courseapp_v1')||'{}');
        const c=(s.imported||[]).filter(x=>x&&x.id===cid)[0];
        return c&&Array.isArray(c.modules)?c.modules.length:0;
      }catch(e){return 0;}
    }
    let rq;
    try{rq=indexedDB.open('oboros_courses',1);}catch(e){return res(fromLocal());}
    rq.onerror=rq.onblocked=()=>res(fromLocal());
    rq.onsuccess=()=>{
      const db=rq.result;
      if(!db.objectStoreNames.contains('bodies'))return res(fromLocal());
      const g=db.transaction('bodies','readonly').objectStore('bodies').get(cid);
      g.onsuccess=()=>{const c=g.result;res(c&&Array.isArray(c.modules)?c.modules.length:fromLocal());};
      g.onerror=()=>res(fromLocal());
    };
  }),id);
}
(async()=>{
await new Promise(r=>srv.listen(8099,r));
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx = await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:900}});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const t0=Date.now();
await p.goto('http://localhost:8099/index.html',{waitUntil:'load'});
ok('lean app loads fast over HTTP ('+(Date.now()-t0)+'ms)', Date.now()-t0<3000);
await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:'load'});await p.waitForTimeout(300);

/* A summary carries `modules` as a count, a body carries it as an array. The
   check used to be `!c.modules`, which was true only while summaries had no such
   field at all — the moment the count was added it went quietly false-negative. */
ok('inline catalog holds summaries only (no course bodies)', await p.evaluate(()=>(window.STORE_CATALOG||[]).every(c=>!Array.isArray(c.modules))));
ok('catalog dir is configured', await p.evaluate(()=>window.COURSEAPP_CATALOG==='./catalog'));

// store lists the FETCHED catalog
await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(700);
const names=await p.locator('.sttitle').allInnerTexts();
ok('store lists every course in the catalog ('+COURSE_FILES.length+') from the fetched index', names.length===COURSE_FILES.length);
ok('store includes the audio course', names.some(n=>/Acoustics/i.test(n)));

// downloading fetches the full course body
await p.locator('.stbtn[data-getcourse="audio-1-acoustics"]').click();
await p.waitForTimeout(1200);
ok('download stores the FULL course locally', await storedModuleCount(p,'audio-1-acoustics')===8);
ok('downloaded course leaves the store list', await p.locator('.stbtn[data-getcourse="audio-1-acoustics"]').count()===0);

// unlock the modules so we can reach a math-heavy lesson, then verify it renders
await p.evaluate(()=>{var st=JSON.parse(localStorage.getItem('courseapp_v1'));var pa={};for(var i=1;i<=8;i++)pa['m'+i]=true;
  st.progress=st.progress||{};st.progress['audio-1-acoustics']={passed:pa,finalPassed:false,lastPage:''};
  localStorage.setItem('courseapp_v1',JSON.stringify(st));});
await p.reload({waitUntil:'load'});await p.waitForTimeout(400);
await p.evaluate(()=>{location.hash='#c/audio-1-acoustics/m2-l1';});await p.waitForTimeout(500);
ok('downloaded course opens a lesson', await p.locator('#lessonbody').count()>0);
ok('lesson renders its MathML', await p.locator('math').count()>0);
// with the network off, an installed course still opens (it lives in local storage)
await ctx.setOffline(true);
await p.evaluate(()=>{location.hash='#';});await p.waitForTimeout(200);
await p.evaluate(()=>{location.hash='#c/audio-1-acoustics/m3-l1';});await p.waitForTimeout(400);
ok('installed course still opens with the network OFF', await p.locator('#lessonbody').count()>0);
await ctx.setOffline(false);

// migration: a course with existing progress is fetched back into the library
await p.evaluate(()=>{localStorage.setItem('courseapp_v1',JSON.stringify({progress:{'stock-charts':{passed:{m1:true},finalPassed:false,lastPage:'m2-l1',name:''}},imported:[]}));});
await p.reload({waitUntil:'load'});await p.waitForTimeout(1500);
ok('course with existing progress is auto-restored from the catalog', await storedModuleCount(p,'stock-charts')>0);

/* The restore above once produced a course with a title and nothing to read: a
   catalogue summary carries `modules` as a count, the filter tested `c.modules`
   for truthiness, and 9 is truthy. Anyone who ran that build has a summary
   sitting in the bodies store, so seed one and confirm a reload replaces it
   rather than carrying it forward. */
await p.evaluate(()=>new Promise(res=>{
  const fake={id:'personal-finance',title:'Personal Finance',accent:'#5b8cff',modules:9};
  localStorage.setItem('courseapp_v1',JSON.stringify({
    progress:{'personal-finance':{passed:{m1:true},finalPassed:false,lastPage:'m1-l1',name:''}},
    imported:[fake]}));
  const rq=indexedDB.open('oboros_courses',1);
  rq.onupgradeneeded=()=>{const d=rq.result;if(!d.objectStoreNames.contains('bodies'))d.createObjectStore('bodies',{keyPath:'id'});};
  rq.onsuccess=()=>{const tx=rq.result.transaction('bodies','readwrite');
    tx.objectStore('bodies').put(fake);tx.oncomplete=()=>res(1);tx.onerror=()=>res(0);};
  rq.onerror=()=>res(0);
}));
await p.reload({waitUntil:'load'});await p.waitForTimeout(1800);
ok('a summary stored as a body is replaced by the real course', await storedModuleCount(p,'personal-finance')===9);

ok('no console errors', errs.filter(e=>!/favicon|ERR_TUNNEL|ERR_INTERNET|net::ERR/i.test(e)).length===0);
if(errs.length)console.log('  ERRORS:',errs.slice(0,4));
await b.close();srv.close();
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);srv.close();process.exit(2);});
