/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
let pass=0,fail=0;function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
const ROOT=path.resolve('.');
const srv=http.createServer((req,res)=>{
  const f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('nf');}
  res.writeHead(200,{'Content-Type':/\.json$/.test(f)?'application/json':'text/html'});
  res.end(fs.readFileSync(f));
});
(async()=>{
await new Promise(r=>srv.listen(8099,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx = await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:900}});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const t0=Date.now();
await p.goto('http://localhost:8099/index.html',{waitUntil:'load'});
ok('lean app loads fast over HTTP ('+(Date.now()-t0)+'ms)', Date.now()-t0<3000);
await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:'load'});await p.waitForTimeout(300);

ok('inline catalog holds summaries only (no course bodies)', await p.evaluate(()=>(window.STORE_CATALOG||[]).every(c=>!c.modules)));
ok('catalog dir is configured', await p.evaluate(()=>window.COURSEAPP_CATALOG==='./catalog'));

// store lists the FETCHED catalog
await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(700);
const names=await p.locator('.storetitle').allInnerTexts();
ok('store lists all 5 courses from the fetched catalog', names.length===5);
ok('store includes the audio course', names.some(n=>/Acoustics/i.test(n)));

// downloading fetches the full course body
await p.locator('.storebtn[data-getcourse="audio-1-acoustics"]').click();
await p.waitForTimeout(1200);
const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));
const inst=(st.imported||[]).find(c=>c.id==='audio-1-acoustics');
ok('download stores the FULL course locally', !!inst && (inst.modules||[]).length===8);
ok('downloaded course leaves the store list', await p.locator('.storebtn[data-getcourse="audio-1-acoustics"]').count()===0);

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
ok('course with existing progress is auto-restored from the catalog', await p.evaluate(()=>{
  var s=JSON.parse(localStorage.getItem('courseapp_v1')||'{}');
  return (s.imported||[]).some(c=>c.id==='stock-charts'&&(c.modules||[]).length>0);}));

ok('no console errors', errs.filter(e=>!/favicon|ERR_TUNNEL|ERR_INTERNET|net::ERR/i.test(e)).length===0);
if(errs.length)console.log('  ERRORS:',errs.slice(0,4));
await b.close();srv.close();
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);srv.close();process.exit(2);});
