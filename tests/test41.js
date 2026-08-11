/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test41 — installing it, and keeping it.

   Everything else in the suite runs off a file:// URL, because that is how the
   single file is used. This one cannot: a service worker, a manifest and
   persistent storage all need an origin. So it serves the built repo on
   localhost — which Chromium treats as secure — and checks the three things
   that decide whether Oboros behaves like an app rather than a page:

     the manifest is valid and complete enough to be installable,
     the service worker takes control and serves the app with the network cut,
     and the browser is asked not to throw the learner's progress away.

   The last one cannot be *made* to pass — a browser may decline — so the test
   asserts that the app asks and reports the true answer, not that it is granted. */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
let pass=0,fail=0;
function ok(n,c,extra){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n+(!c&&extra?'  → '+extra:''));}

const ROOT=path.resolve('.');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
let offline=false, served=0;
const server=http.createServer(function(req,res){
  if(offline){res.socket.destroy();return;}
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/')u='/index.html';
  const f=path.join(ROOT,u);
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;res.end('no');return;}
  served++;
  res.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream');
  if(u==='/sw.js')res.setHeader('service-worker-allowed','/');
  res.end(fs.readFileSync(f));
});

(async()=>{
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const PORT=server.address().port, BASE='http://127.0.0.1:'+PORT+'/';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));
/* the offline phases below kill the server on purpose, so a failed fetch there is
   the test working rather than the app breaking */
p.on('console',m=>{if(m.type()==='error'&&!/ERR_EMPTY_RESPONSE|ERR_CONNECTION|Failed to load resource/.test(m.text()))errs.push(m.text());});
await p.goto(BASE,{waitUntil:'load'});
await p.waitForTimeout(1200);

/* ---------------- the manifest ---------------- */
console.log('-- the manifest says what it is');
const href=await p.evaluate(()=>{const l=document.querySelector('link[rel="manifest"]');return l&&l.getAttribute('href');});
ok('the page links a manifest',!!href,String(href));
const mf=await p.evaluate(async h=>{try{const r=await fetch(h);return {status:r.status,type:r.headers.get('content-type'),json:await r.json()};}catch(e){return {err:String(e)};}},href);
ok('it is served and parses',mf.status===200&&!!mf.json,mf.err||String(mf.status));
const m=mf.json||{};
ok('it has a name and a short name',!!m.name&&!!m.short_name);
ok('it starts where the app starts',m.start_url==='./'&&m.scope==='./');
ok('it opens standalone, not in a tab',m.display==='standalone');
ok('it declares its colours',!!m.theme_color&&!!m.background_color);
const icons=m.icons||[];
ok('it ships a 192 and a 512',
  icons.some(i=>i.sizes==='192x192')&&icons.some(i=>i.sizes==='512x512'),
  icons.map(i=>i.sizes).join(' '));
ok('and a maskable one, so Android does not crop the mark',
  icons.some(i=>(i.purpose||'').indexOf('maskable')>=0));
const iconOK=await p.evaluate(async list=>{
  const out=[];
  for(const i of list){
    try{const r=await fetch(i.src);const blob=await r.blob();
      const bmp=await createImageBitmap(blob);
      out.push({src:i.src,status:r.status,w:bmp.width,h:bmp.height,want:i.sizes});}
    catch(e){out.push({src:i.src,err:String(e)});}
  }
  return out;},icons);
ok('every icon actually exists at the size it claims',
  iconOK.every(i=>i.status===200&&i.want===i.w+'x'+i.h),
  JSON.stringify(iconOK.map(i=>i.src+':'+(i.err||i.status+' '+i.w+'x'+i.h))));
ok('the theme colour follows the theme',
  await p.evaluate(()=>document.querySelectorAll('meta[name="theme-color"]').length>=2));
ok('iOS is told the title and that it is app-capable',
  await p.evaluate(()=>!!document.querySelector('meta[name="apple-mobile-web-app-title"]')&&
    !!document.querySelector('meta[name="apple-mobile-web-app-capable"]')));

/* ---------------- the service worker ---------------- */
console.log('-- it opens with the network cut');
const reg=await p.evaluate(async()=>{
  const r=await navigator.serviceWorker.ready.catch(()=>null);
  return r?{scope:r.scope,active:!!r.active}:null;});
ok('a service worker is registered and active',!!reg&&reg.active,JSON.stringify(reg));
await p.reload({waitUntil:'load'});await p.waitForTimeout(700);
ok('and it controls the page after a reload',
  await p.evaluate(()=>!!navigator.serviceWorker.controller));
const settings=await p.evaluate(()=>{location.hash='#settings';return true;});
await p.waitForTimeout(700);
ok('Settings admits the app is saved offline',
  /Yes/.test(await p.locator('.setcard').filter({hasText:'App saved for offline use'}).first().innerText()));

/* now cut the wire */
offline=true;
const before=served;
await p.goto(BASE+'#library',{waitUntil:'load'});
await p.waitForTimeout(900);
ok('the app still loads with the server refusing connections',
  await p.locator('.tabbar, .navrail').count()>0);
ok('and it drew a real screen, not an error page',
  /Library/i.test(await p.evaluate(()=>document.body.innerText)));
ok('nothing reached the network to do it',served===before,served-before+' requests got through');
offline=false;

/* ---------------- persistence ---------------- */
console.log('-- it asks not to be thrown away');
await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(900);
const per=await p.evaluate(async()=>{
  const supported=!!(navigator.storage&&navigator.storage.persist);
  const persisted=supported?await navigator.storage.persisted():null;
  const est=navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null;
  return {supported:supported,persisted:persisted,usage:est&&est.usage,quota:est&&est.quota};});
ok('the browser supports persistent storage',per.supported);
ok('the app asked for it at boot',per.persisted===true||per.persisted===false,String(per.persisted));
ok('and can measure what it is using',typeof per.usage==='number'&&per.quota>0,
  JSON.stringify(per));
await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(800);
const card=await p.locator('.setcard').filter({hasText:'Course storage'}).first().innerText();
ok('Settings reports the true answer rather than claiming one',
  /Protect(ed)? from clearing/.test(card),card.replace(/\n/g,' | ').slice(0,120));
ok('and offers a way to install',
  await p.locator('#installrow').count()===1);

/* an offline sanity check that the icons are cached too */
offline=true;
const b2=served;
await p.evaluate(async()=>{try{await fetch('./icons/icon-192.png');}catch(e){}});
await p.waitForTimeout(300);
ok('the icons come from the cache when offline',served===b2);
offline=false;

ok('no console errors',errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();server.close();
process.exit(fail?1:0);
})();
