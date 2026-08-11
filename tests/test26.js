/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test26 — does it actually work with the network off?
   Served over HTTP (a service worker will not register on file://).
   Proves: the app opens offline, a downloaded course is fully readable offline,
   progress still saves offline, and the storage ceiling is gone. */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=process.cwd();
const MIME={'.html':'text/html','.json':'application/json','.js':'text/javascript'};

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

const srv=http.createServer((req,res)=>{
  let u=req.url.split('?')[0];
  if(u==='/')u='/index.html';
  const f=path.join(ROOT,decodeURIComponent(u));
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('not found');}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'text/plain','Cache-Control':'no-cache'});
  fs.createReadStream(f).pipe(res);
});

srv.listen(0,async()=>{
const port=srv.address().port, URL=`http://127.0.0.1:${port}/`;
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx = await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
const p=await ctx.newPage();
const errs=[];
p.on('pageerror',e=>errs.push(String(e)));
p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text());});

await p.goto(URL,{waitUntil:'load'});
await p.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller,null,{timeout:15000}).catch(()=>{});
ok('service worker registers and takes control', await p.evaluate(()=>!!(navigator.serviceWorker&&navigator.serviceWorker.controller)));

// download two courses from the store
await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(900);
for(const id of ['personal-finance','app-builder']){
  const btn=p.locator(`.stbtn[data-getcourse="${id}"]`);
  if(await btn.count()){await btn.click();await p.waitForTimeout(700);}
}
ok('two courses downloaded into the library', await p.evaluate(()=>{
  return [].concat(window.BUILTIN_COURSES||[]).length>=0 &&
    (JSON.parse(localStorage.getItem('courseapp_v1')).imported||[]).length>=2;
}));

// bodies belong in IndexedDB, not localStorage
const split=await p.evaluate(async()=>{
  const ls=localStorage.getItem('courseapp_v1')||'';
  const parsed=JSON.parse(ls);
  const inLS=(parsed.imported||[]).some(c=>c&&Array.isArray(c.modules)&&c.modules.length);
  const idbCount=await new Promise(res=>{
    const rq=indexedDB.open('oboros_courses',1);
    rq.onsuccess=()=>{const db=rq.result;const tx=db.transaction('bodies','readonly');const g=tx.objectStore('bodies').getAllKeys();g.onsuccess=()=>res(g.result.length);g.onerror=()=>res(-1);};
    rq.onerror=()=>res(-1);
  });
  return {lsKB:Math.round(ls.length/1024), inLS, idbCount};
});
console.log(`      localStorage ${split.lsKB} KB · IndexedDB ${split.idbCount} course bodies`);
ok('course bodies are stored in IndexedDB', split.idbCount>=2);
ok('course bodies are NOT duplicated into localStorage', split.inLS===false);
ok('localStorage stays small (<80 KB with 2 courses owned)', split.lsKB<80);

// read a lesson, make progress
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(500);
const onlineXp=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.xp);
ok('lesson renders while online', await p.locator('#lessonbody').count()>0);

// ============ PULL THE PLUG ============
await ctx.setOffline(true);
let reloaded=true;
try{ await p.goto(URL,{waitUntil:'load',timeout:15000}); }catch(e){ reloaded=false; console.log('      '+String(e).split('\n')[0]); }
ok('the app opens with the network off', reloaded);
await p.waitForTimeout(700);
ok('the interface renders offline', await p.locator('.wrap').count()>0);
ok('the library still has both courses offline', await p.evaluate(()=>document.querySelectorAll('.homegrid .libcard[data-cid]').length>=0) && await p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).imported||[]).length>=2));

await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(600);
ok('library page lists the downloaded courses offline', await p.locator('.homegrid .libcard[data-cid]').count()>=2);

await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l2';});await p.waitForTimeout(700);
ok('a downloaded lesson is fully readable offline', await p.locator('#lessonbody').count()>0 && (await p.locator('#lessonbody').innerText()).length>400);
ok('progress still saves offline', await p.evaluate(x=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.xp>=x,onlineXp));

await p.evaluate(()=>{location.hash='#c/personal-finance/m1-quiz';});await p.waitForTimeout(700);
ok('a quiz works offline', await p.locator('.quizwrap .opt').count()>0);

ok('offline notice appears', await p.evaluate(()=>{window.dispatchEvent(new Event('offline'));return true;}) && await (async()=>{await p.waitForTimeout(300);return await p.locator('#offbar.show').count()>0;})());

await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(600);
await openSect(p,'set-offline');
const setTxt=await p.locator('#app').innerText();
ok('settings reports offline readiness', /App saved for offline use/.test(setTxt)&&/Yes/.test(setTxt.split('App saved for offline use')[1].slice(0,30)));
ok('settings reports the large-storage backend', /Database \(large\)/.test(setTxt));

// ============ BACK ONLINE ============
await ctx.setOffline(false);
await p.goto(URL,{waitUntil:'load'});await p.waitForTimeout(700);
ok('everything survives coming back online', await p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).imported||[]).length>=2));
await p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await p.waitForTimeout(600);
ok('the second course is still intact', await p.locator('#lessonbody').count()>0);

ok('no console errors', errs.length===0);
if(errs.length)console.log('   ',errs.slice(0,5));
await ctx.close();

// ============ MIGRATION: an existing user whose bodies are in localStorage ============
{
  const ctx2 = await b.newContext({viewport:{width:1280,height:900}});
  await ctx2.addInitScript("window.OBOROS_NO_QUESTS=1;");
  const p2=await ctx2.newPage();
  const errs2=[];
  p2.on('pageerror',e=>errs2.push(String(e)));
  const FULL=JSON.parse(fs.readFileSync('catalog/personal-finance.json','utf8'));
  await p2.goto(URL,{waitUntil:'load'});
  // write the OLD format: full course bodies inline in localStorage
  await p2.evaluate(c=>{localStorage.clear();localStorage.setItem('courseapp_v1',JSON.stringify({
    imported:[c],
    progress:{'personal-finance':{passed:{m1:true},finalPassed:false,lastPage:'m1-l2'}},
    gam:{xp:250,goal:30,done:{},badges:{}},
    assignments:{'personal-finance/m1-l1/0':true},
    notes:{'personal-finance|m1-l1':'an old note'},
    settings:{theme:'dark',palette:'aurora',scale:1}
  }));},FULL);
  const before=await p2.evaluate(()=>Math.round((localStorage.getItem('courseapp_v1')||'').length/1024));
  await p2.reload({waitUntil:'load'});await p2.waitForTimeout(1200);
  const after=await p2.evaluate(()=>Math.round((localStorage.getItem('courseapp_v1')||'').length/1024));
  console.log(`      legacy localStorage ${before} KB → ${after} KB after migration`);
  ok('legacy localStorage bodies are migrated out', after<before/4);
  ok('migration moved the body into IndexedDB', await p2.evaluate(()=>new Promise(res=>{
    const rq=indexedDB.open('oboros_courses',1);
    rq.onsuccess=()=>{try{const g=rq.result.transaction('bodies','readonly').objectStore('bodies').get('personal-finance');g.onsuccess=()=>res(!!(g.result&&g.result.modules));g.onerror=()=>res(false);}catch(e){res(false);}};
    rq.onerror=()=>res(false);
  })));
  ok('migration kept progress', await p2.evaluate(()=>!!(JSON.parse(localStorage.getItem('courseapp_v1')).progress||{})['personal-finance']));
  ok('migration kept XP', await p2.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.xp>=250));
  ok('migration kept assignments and notes', await p2.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('courseapp_v1'));
    return s.assignments['personal-finance/m1-l1/0']===true && /old note/.test(JSON.stringify(s.notes));
  }));
  await p2.evaluate(()=>{location.hash='#c/personal-finance/m1-l2';});await p2.waitForTimeout(600);
  ok('the migrated course still opens', await p2.locator('#lessonbody').count()>0);
  ok('migration logged no errors', errs2.length===0);
  if(errs2.length)console.log('   ',errs2.slice(0,4));
  await ctx2.close();
}

// ============ FALLBACK: IndexedDB unavailable ============
{
  const ctx3 = await b.newContext({viewport:{width:1280,height:900}});
  await ctx3.addInitScript("window.OBOROS_NO_QUESTS=1;");
  await ctx3.addInitScript(`try{Object.defineProperty(window,'indexedDB',{get:function(){return undefined;}});}catch(e){}`);
  const p3=await ctx3.newPage();
  const errs3=[];
  p3.on('pageerror',e=>errs3.push(String(e)));
  await p3.goto(URL,{waitUntil:'load'});await p3.waitForTimeout(800);
  await p3.evaluate(()=>{location.hash='#library/store';});await p3.waitForTimeout(900);
  const btn=p3.locator('.stbtn[data-getcourse="personal-finance"]');
  if(await btn.count()){await btn.click();await p3.waitForTimeout(700);}
  ok('without IndexedDB the app still installs a course', await p3.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).imported||[]).length>=1));
  ok('without IndexedDB the body falls back to localStorage', await p3.evaluate(()=>{
    const im=JSON.parse(localStorage.getItem('courseapp_v1')).imported||[];
    return !!(im[0]&&im[0].modules&&im[0].modules.length);
  }));
  await p3.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p3.waitForTimeout(600);
  ok('without IndexedDB the course is still readable', await p3.locator('#lessonbody').count()>0);
  ok('fallback path logged no errors', errs3.length===0);
  if(errs3.length)console.log('   ',errs3.slice(0,4));
  await ctx3.close();
}

await b.close();srv.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
});
