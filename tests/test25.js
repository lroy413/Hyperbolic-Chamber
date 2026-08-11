/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test25 — cross-device sync, the way L will actually use it:
   add a course + make progress on a phone, sign in on a computer, get everything.
   Also pins the two bugs found before sync was switched on:
     · course bodies must NOT be pushed (payload size)
     · assignments must survive the merge (they were being dropped)
*/
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));

let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

// A shared "server" living on the browser context: two pages = two devices, one account.
const SERVER=`
window.__SRV={rows:{},user:null,cbs:[],pushes:[]};
window.COURSEAPP_ADAPTER={
  auth:{
    onChange:function(cb){window.__SRV.cbs.push(cb);},
    current:function(){return Promise.resolve(window.__SRV.user);},
    signInPassword:function(email){window.__SRV.user={id:'u1',email:email};window.__SRV.cbs.forEach(function(c){c(window.__SRV.user);});return Promise.resolve({data:{user:window.__SRV.user},error:null});},
    signUp:function(email,pw){return this.signInPassword(email,pw);},
    signInGoogle:function(){return Promise.resolve({});},
    signOut:function(){window.__SRV.user=null;window.__SRV.cbs.forEach(function(c){c(null);});return Promise.resolve({});}
  },
  pullState:function(uid){return Promise.resolve(window.__SRV.rows[uid]?JSON.parse(window.__SRV.rows[uid]):null);},
  pushState:function(uid,data){var s=JSON.stringify(data);window.__SRV.pushes.push(s.length);window.__SRV.rows[uid]=s;return Promise.resolve({});},
  listCatalog:function(){return Promise.resolve([]);},
  getCourse:function(){return Promise.resolve(null);}
};`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// One context so both "devices" share window.__SRV via a module-level store? They don't —
// separate pages have separate JS realms. So we shuttle the row between them by hand,
// which is exactly what a real server does.
const mkDevice=async(viewport)=>{
  const ctx = await b.newContext({javaScriptEnabled:true,viewport});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
  await ctx.addInitScript(SERVER);
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto(URL,{waitUntil:'load'});
  await p.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'load'});
  await p.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);
  await p.waitForTimeout(200);
  return {ctx,p,errs};
};
const getRow=(d)=>d.p.evaluate(()=>window.__SRV.rows['u1']||null);
const setRow=(d,row)=>d.p.evaluate(r=>{window.__SRV.rows['u1']=r;},row);
const signIn=async(d)=>{
  await d.p.evaluate(()=>{location.hash='#account';});await d.p.waitForTimeout(250);
  await d.p.locator('#authemail').fill('l@example.com');
  await d.p.locator('#authpw').fill('secret123');
  await d.p.locator('#authsubmit').click();
  await d.p.waitForTimeout(900);
};

// ---------- DEVICE A: the phone ----------
const A=await mkDevice({width:390,height:844});
await signIn(A);
ok('phone: signs in', /l@example.com/.test(await A.p.locator('#app').innerText()));

// add a course from the store, work through a lesson, complete an assignment
await A.p.evaluate(()=>{location.hash='#library/store';});await A.p.waitForTimeout(500);
await A.p.locator('.stbtn[data-getcourse="personal-finance"]').click();await A.p.waitForTimeout(400);
ok('phone: course added to the library', await A.p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).imported||[]).some(c=>c.id==='personal-finance')));
await A.p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await A.p.waitForTimeout(400);
await A.p.evaluate(()=>{
  var s=JSON.parse(localStorage.getItem('courseapp_v1'));
  s.assignments={'personal-finance/m1-l1/0':true};
  s.bookmarks=[{k:'personal-finance|m1-l1',c:'personal-finance',p:'m1-l1'}];
  s.notes={'personal-finance|m1-l1':'a note written on the phone'};
  localStorage.setItem('courseapp_v1',JSON.stringify(s));
});
await A.p.reload({waitUntil:'load'});await A.p.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);await A.p.waitForTimeout(300);
await signIn(A);
await A.p.evaluate(()=>{location.hash='#c/personal-finance/m1-l2';});await A.p.waitForTimeout(400);
await A.p.waitForTimeout(1900); // outlast the push debounce

const row=await getRow(A);
ok('phone: state reached the server', !!row);
const parsed=JSON.parse(row||'{}');

// ---- payload discipline ----
ok('sync payload carries course IDS, not course bodies', Array.isArray(parsed.importedIds) && parsed.importedIds.indexOf('personal-finance')>-1 && parsed.imported===undefined);
const kb=Math.round((row||'').length/1024);
console.log('      payload size: '+kb+' KB');
ok('sync payload stays small (<40 KB with a 160 KB course owned)', kb<40);
ok('assignments are included in the payload', parsed.assignments && parsed.assignments['personal-finance/m1-l1/0']===true);
ok('progress is included', parsed.progress && parsed.progress['personal-finance']);
ok('XP is included', parsed.gam && parsed.gam.xp>0);

const phoneXp=parsed.gam.xp;

// ---------- DEVICE B: the computer, never seen this account ----------
const B=await mkDevice({width:1440,height:900});
await setRow(B,row);
ok('computer: library starts empty', await B.p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')||'{}').imported||[]).length===0));
await signIn(B);
await B.p.waitForTimeout(1200); // allow the catalogue re-fetch

ok('computer: XP arrived', await B.p.evaluate(x=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.xp>=x,phoneXp));
ok('computer: progress arrived', await B.p.evaluate(()=>!!(JSON.parse(localStorage.getItem('courseapp_v1')).progress||{})['personal-finance']));
ok('computer: assignment completion survived the merge', await B.p.evaluate(()=>((JSON.parse(localStorage.getItem('courseapp_v1')).assignments)||{})['personal-finance/m1-l1/0']===true));
ok('computer: bookmark arrived', await B.p.evaluate(()=>((JSON.parse(localStorage.getItem('courseapp_v1')).bookmarks)||[]).length>0));
ok('computer: note arrived', await B.p.evaluate(()=>/phone/.test(JSON.stringify(JSON.parse(localStorage.getItem('courseapp_v1')).notes||{}))));
// bodies live in IndexedDB now, so look there rather than in localStorage
ok('computer: the course body was re-fetched from the catalogue', await B.p.evaluate(async()=>{
  const body=await new Promise(res=>{
    const rq=indexedDB.open('oboros_courses',1);
    rq.onsuccess=()=>{try{const g=rq.result.transaction('bodies','readonly').objectStore('bodies').get('personal-finance');g.onsuccess=()=>res(g.result);g.onerror=()=>res(null);}catch(e){res(null);}};
    rq.onerror=()=>res(null);
  });
  const sum=(JSON.parse(localStorage.getItem('courseapp_v1')).imported||[]).filter(x=>x.id==='personal-finance')[0];
  return !!(sum && body && body.modules && body.modules.length);
}));
await B.p.evaluate(()=>{location.hash='';});await B.p.waitForTimeout(400);
ok('computer: the course is usable, not a ghost entry', await (async()=>{
  await B.p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await B.p.waitForTimeout(400);
  return await B.p.locator('#lessonbody').count()>0;
})());
ok('computer: local store has no importedIds residue', await B.p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).importedIds===undefined));

// ---------- back the other way: work on the computer, phone picks it up ----------
// m1-l3 — module 2 is locked until the module 1 quiz is passed, so it would award nothing
await B.p.evaluate(()=>{location.hash='#c/personal-finance/m1-l3';});await B.p.waitForTimeout(400);
await B.p.waitForTimeout(1900);
const row2=await getRow(B);
ok('computer: pushes back up', !!row2 && JSON.parse(row2).gam.xp>phoneXp);
ok('round-trip payload still carries no bodies', JSON.parse(row2).imported===undefined);

ok('no console errors on either device', A.errs.length===0 && B.errs.length===0);
if(A.errs.length)console.log('   phone:',A.errs.slice(0,3));
if(B.errs.length)console.log('   computer:',B.errs.slice(0,3));

await A.ctx.close();await B.ctx.close();await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
