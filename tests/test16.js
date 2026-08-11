/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve('index.html');
const FULLCAT=require('fs').readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json'&&!/^audio-/.test(f)).map(f=>JSON.parse(require('fs').readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

const MOCK=`
window.__MOCK={remote:{},cb:null,user:null,catalog:[{id:'remote-course',title:'Remote Course',subtitle:'From the cloud',tagline:'A course served from the backend',accent:'#22b8cf',price:0,author:'Cloud',modules:[{title:'M1',tagline:'t',objectives:['o'],lessons:[{title:'L1',blocks:[{t:'p',html:'hello'}],glossary:[['term','def']]}],quiz:{questions:[{q:'Q?',options:['a','b'],answer:1,explain:'x'}]}}],finalExam:{questions:[{q:'F?',options:['a','b'],answer:1,explain:'x'}]}}]};
window.__MOCK.remote['u1']={gam:{xp:999,best:12,tSpent:0,perfects:0,reviewsDone:0,done:{},badges:{},goal:30,freezes:1},progress:{'app-builder':{passed:{m1:true},finalPassed:false,lastPage:'m1-quiz',name:''}},review:{},imported:[],hidden:[],order:[],bookmarks:[],notes:{},marks:{},settings:{}};
window.COURSEAPP_ADAPTER={
  auth:{
    onChange:function(cb){window.__MOCK.cb=cb;},
    current:function(){return window.__MOCK.user;},
    signInPassword:function(email){window.__MOCK.user={id:'u1',email:email};if(window.__MOCK.cb)window.__MOCK.cb(window.__MOCK.user);return Promise.resolve({data:{user:window.__MOCK.user,session:{}},error:null});},
    signUp:function(email){return this.signInPassword(email);},
    signInGoogle:function(){window.__MOCK.user={id:'u1',email:'g@x.com'};if(window.__MOCK.cb)window.__MOCK.cb(window.__MOCK.user);return Promise.resolve({});},
    signOut:function(){window.__MOCK.user=null;if(window.__MOCK.cb)window.__MOCK.cb(null);return Promise.resolve({});}
  },
  pullState:function(uid){return Promise.resolve(window.__MOCK.remote[uid]||null);},
  pushState:function(uid,data){window.__MOCK.remote[uid]=JSON.parse(JSON.stringify(data));return Promise.resolve({});},
  listCatalog:function(){return Promise.resolve(window.__MOCK.catalog.map(function(c){return {id:c.id,title:c.title,tagline:c.tagline,accent:c.accent,price:c.price||0,author:c.author||''};}));},
  getCourse:function(id){var c=window.__MOCK.catalog.filter(function(x){return x.id===id;})[0];return Promise.resolve(c||null);}
};`;

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});

  // ---------- OFFLINE MODE (no backend) ----------
  {
    const ctx = await browser.newContext({javaScriptEnabled:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
    const p=await ctx.newPage();const errors=[];
    p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await p.goto(URL,{waitUntil:'load'});await useCat(p);
    await p.evaluate(()=>localStorage.clear());
    await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(120);
    ok('offline: no account chip in top bar', await p.locator('#acctchip').count()===0);
    await p.evaluate(()=>{location.hash='#account';});await p.waitForTimeout(120);
    ok('offline: account page shows Offline mode', /Offline mode/.test(await p.locator('#app').innerText()));
    await p.evaluate(()=>{location.hash='#store';});await p.waitForTimeout(150);
    const names=await p.locator('.sttitle').allInnerTexts();
    ok('offline: store lists sample courses', names.some(n=>/Personal Finance/i.test(n))&&names.some(n=>/Negotiation/i.test(n)));
    ok('offline: sample courses show Free + Download', await p.locator('.stbtn[data-getcourse]').count()>=2);
    await p.locator('.stbtn[data-getcourse="personal-finance"]').click();
    await p.waitForTimeout(150);
    let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));
    ok('offline: download adds course to imported', (s.imported||[]).some(c=>c.id==='personal-finance'));
    ok('offline: downloaded course is no longer offered', await p.locator('#storelist .stbtn[data-getcourse="personal-finance"]').count()===0);
    ok('offline: it stays visible in its specialization, marked owned', await p.locator('#storelist .strow.have').count()>=1);
    // the downloaded course is fully usable
    await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(150);
    ok('offline: downloaded course opens a lesson', await p.locator('#lessonbody').count()>0);
    ok('offline: no console errors', errors.length===0);
    if(errors.length)console.log('   ',errors.slice(0,4));
    await ctx.close();
  }

  // ---------- BACKEND MODE (mock adapter) ----------
  {
    const ctx = await browser.newContext({javaScriptEnabled:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
    await ctx.addInitScript(MOCK);
    const p=await ctx.newPage();const errors=[];
    p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await p.goto(URL,{waitUntil:'load'});await useCat(p);
    await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
    await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(150);
    const getStore=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));

    ok('backend: drawer account shows Sign in', /Sign in/.test((await p.locator('.navacct').innerText().catch(()=>''))||''));
    await p.evaluate(()=>{location.hash='#account';});await p.waitForTimeout(120);
    ok('backend: sign-in form present', await p.locator('#authform').count()>0);
    ok('backend: Google button present', await p.locator('#googlebtn').count()>0);
    ok('backend: create-account tab present', await p.locator('[data-authtab="up"]').count()>0);

    // sign in -> pulls remote (xp 999 + a passed module) and merges into local
    await p.locator('#authemail').fill('learner@example.com');
    await p.locator('#authpw').fill('secret123');
    await p.locator('#authsubmit').click();
    await p.waitForTimeout(400);
    let s=await getStore();
    ok('backend: login merged remote XP (999) into local', s.gam.xp===999);
    ok('backend: login merged a passed module from remote', s.progress&&s.progress['app-builder']&&s.progress['app-builder'].passed&&s.progress['app-builder'].passed.m1===true);
    ok('backend: drawer account becomes avatar after login', await p.locator('.navacct.in .navav').count()>0);
    // login pushed merged state back to remote
    let remoteXp=await p.evaluate(()=>window.__MOCK.remote['u1'].gam.xp);
    ok('backend: merged state pushed to remote on login', remoteXp===999);

    // a local change pushes to remote (debounced)
    await p.evaluate(()=>{location.hash='#c/app-builder/m2-l1';});await p.waitForTimeout(150);
    s=await getStore();
    ok('backend: local action bumped XP past 999', s.gam.xp>999);
    await p.waitForTimeout(1800); // wait out the debounce
    remoteXp=await p.evaluate(()=>window.__MOCK.remote['u1'].gam.xp);
    ok('backend: local change synced up to remote', remoteXp===s.gam.xp && remoteXp>999);

    // remote catalog drives the store
    await p.evaluate(()=>{location.hash='#store';});await p.waitForTimeout(200);
    ok('backend: store lists the remote catalog course', /Remote Course/.test(await p.locator('#storelist').innerText()));
    await p.locator('.stbtn[data-getcourse="remote-course"]').click();
    await p.waitForTimeout(200);
    s=await getStore();
    ok('backend: downloading a remote course installs it', (s.imported||[]).some(c=>c.id==='remote-course'));

    // account page shows signed-in state + sign out
    await p.evaluate(()=>{location.hash='#account';});await p.waitForTimeout(150);
    ok('backend: account page shows signed-in email', /learner@example.com/.test(await p.locator('#app').innerText()));
    await p.locator('#signout').click();await p.waitForTimeout(200);
    ok('backend: sign out returns to sign-in form', await p.locator('#authform').count()>0);

    ok('backend: no console errors', errors.length===0);
    if(errors.length)console.log('   ',errors.slice(0,5));
    await ctx.close();
  }

  // ---------- BACKEND CONFIGURED BUT CATALOG TABLE MISSING/EMPTY ----------
  // Regression: a configured backend whose catalog_courses table does not exist yet
  // must NOT black out the store — the shipped catalog files still serve it.
  {
    const ctx = await browser.newContext({javaScriptEnabled:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
    await ctx.addInitScript(`window.COURSEAPP_ADAPTER={
      auth:{onChange:function(){},current:function(){return Promise.resolve(null);},signOut:function(){return Promise.resolve({});}},
      pullState:function(){return Promise.resolve(null);},pushState:function(){return Promise.resolve({});},
      listCatalog:function(){return Promise.resolve([]);},
      getCourse:function(){return Promise.resolve(null);}
    };`);
    const p=await ctx.newPage();const errors=[];
    p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await p.goto(URL,{waitUntil:'load'});await useCat(p);
    await p.evaluate(()=>localStorage.clear());
    await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(150);
    await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(500);
    ok('empty remote catalog falls back to the shipped store', await p.locator('.strow').count()>=2);
    ok('empty remote catalog does not show the empty state', !/Nothing here yet/.test(await p.locator('#storelist').innerText()));
    await p.locator('.stbtn[data-getcourse="personal-finance"]').click();await p.waitForTimeout(400);
    const s2=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));
    ok('a course still installs when the remote returns nothing', (s2.imported||[]).some(c=>c.id==='personal-finance'));
    ok('fallback path logs no console errors', errors.length===0);
    if(errors.length)console.log('   ',errors.slice(0,4));
    await ctx.close();
  }

  // ---------- BACKEND THAT THROWS ----------
  {
    const ctx = await browser.newContext({javaScriptEnabled:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
    await ctx.addInitScript(`window.COURSEAPP_ADAPTER={
      auth:{onChange:function(){},current:function(){return Promise.resolve(null);},signOut:function(){return Promise.resolve({});}},
      pullState:function(){return Promise.resolve(null);},pushState:function(){return Promise.resolve({});},
      listCatalog:function(){throw new Error('relation "catalog_courses" does not exist');},
      getCourse:function(){throw new Error('relation "catalog_courses" does not exist');}
    };`);
    const p=await ctx.newPage();
    await p.goto(URL,{waitUntil:'load'});await useCat(p);
    await p.evaluate(()=>localStorage.clear());
    await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(150);
    await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(500);
    ok('a throwing remote catalog falls back to the shipped store', await p.locator('.strow').count()>=2);
    await ctx.close();
  }

  await browser.close();
  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
