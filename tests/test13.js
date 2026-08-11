/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve('index.html');
const FULLCAT=require('fs').readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json'&&!/^audio-/.test(f)).map(f=>JSON.parse(require('fs').readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

const CID='app-builder';
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
function ok(n,c){ (c?pass++:fail++); console.log((c?'  PASS ':'  FAIL ')+n); }

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});

  // ---------- 1) NO-JS PREVIEW: static fallback must not be blank ----------
  {
    const ctx = await browser.newContext({javaScriptEnabled:false});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
    const p=await ctx.newPage();
    await p.goto(URL,{waitUntil:'load'});await useCat(p);
    const txt=(await p.locator('#app').innerText()).trim();
    ok('no-JS preview renders content (not blank)', txt.length>200);
    ok('no-JS preview mentions a course', /course|library|app|lesson/i.test(txt));
    await ctx.close();
  }

  // ---------- JS MODE ----------
  const ctx = await browser.newContext({javaScriptEnabled:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;");
  const p=await ctx.newPage();
  const errors=[];
  p.on('pageerror',e=>errors.push(String(e)));
  p.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
  await p.goto(URL,{waitUntil:'load'});await useCat(p);
  await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(150);

  const getStore=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));
  // date strings computed in-page with plain Date (matches app's todayStr semantics)
  const D=await p.evaluate(()=>{
    const f=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const t=new Date(); const base=new Date(t.getFullYear(),t.getMonth(),t.getDate());
    const off=n=>{const d=new Date(base);d.setDate(d.getDate()+n);return f(d);};
    return {today:off(0),y1:off(-1),y2:off(-2),y3:off(-3)};
  });

  // 2) Library renders with streak card
  ok('top bar carries live stats', await p.locator('.tbstats .tbs').count()===3);
  ok('library shows total XP text', /XP/i.test(await p.locator('#app').innerText()));

  // 3) Lesson view awards +10 XP (first view only)
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-l1';},CID);
  await p.waitForTimeout(120);
  let s=await getStore();
  ok('lesson view awarded 10 XP', s.gam && s.gam.xp===10);
  ok('lesson marked done', s.gam && s.gam.done && s.gam.done[CID+'/m1-l1']===1);
  await p.evaluate(()=>{location.hash='#';});
  await p.waitForTimeout(60);
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-l1';},CID);
  await p.waitForTimeout(120);
  s=await getStore();
  ok('revisiting lesson gives no extra XP', s.gam.xp===10);

  // 4) Streak logic — now driven by the daily warm-up, not by course XP
  async function streakScenario(gam){
    await p.evaluate(g=>{var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({gam:g,imported:JSON.parse(JSON.stringify(__c))}));location.hash='';},gam);
    await p.reload({waitUntil:'load'});await useCat(p);
    await p.waitForTimeout(150);
    await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(400);
    const ids=await p.evaluate(()=>[].slice.call(document.querySelectorAll('.wucard[data-wq]')).map(e=>e.getAttribute('data-wq')));
    for(const id of ids){await p.locator('[data-wu="'+id+'"][data-wi="0"]').click();await p.waitForTimeout(90);}
    await p.locator('#wudone').click();await p.waitForTimeout(400);
    return (await getStore()).gam;
  }
  const base={goal:10,todayXP:0,today:D.today,done:{},freezes:1};
  let g=await streakScenario(Object.assign({},base,{lastMet:'',streak:0}));
  ok('first warm-up -> streak 1', g.streak===1 && g.lastMet===D.today);
  g=await streakScenario(Object.assign({},base,{lastMet:D.y1,streak:1}));
  ok('consecutive day -> streak 2', g.streak===2);
  g=await streakScenario(Object.assign({},base,{lastMet:D.y2,streak:5,freezes:1}));
  ok('2-day gap uses freeze -> streak 6, freeze spent', g.streak===6 && g.freezes===0);
  g=await streakScenario(Object.assign({},base,{lastMet:D.y3,streak:9,freezes:0}));
  ok('3-day gap no freeze -> streak resets to 1', g.streak===1);

  // clean slate for review tests
  await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(120);

  // 5) Taking a module quiz seeds review items + awards XP
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-quiz';},CID);
  await p.waitForTimeout(200);
  // answer every question correctly, type-aware (single / multi / text)
  const nAnswered=await p.evaluate(cid=>{
    var course=[].concat(window.BUILTIN_COURSES||[],window.STORE_CATALOG||[]).find(c=>c.id===cid);var qs=course.modules[0].quiz.questions;
    var els=document.querySelectorAll('.quizwrap .q');
    els.forEach(function(qe){var type=qe.getAttribute('data-qtype');var oi=+qe.getAttribute('data-qi');
      if(type==='multi'){qe.querySelectorAll('input[type=checkbox]').forEach(function(cb){cb.checked=cb.getAttribute('data-correct')==='1';});}
      else if(type==='text'){var inp=qe.querySelector('.qinput');if(inp)inp.value=(qs[oi].accept||[qs[oi].answer])[0];}
      else{var isc=qe.querySelector('label.opt.isc input');if(isc)isc.checked=true;}
    });
    return els.length;
  },CID);
  ok('quiz rendered all question groups', nAnswered>=5);
  await p.locator('.quizwrap .submitbtn').click();
  await p.waitForTimeout(200);
  s=await getStore();
  const revCount=s.review?Object.keys(s.review).length:0;
  ok('module quiz seeded review items', revCount>0);
  ok('passing quiz awarded XP (>=25)', s.gam && s.gam.xp>=25);
  ok('module recorded as passed', s.progress && s.progress[CID] && s.progress[CID].passed && s.progress[CID].passed.m1===true);

  // 6) Backdate review items so they are due, then run a review session
  await p.evaluate(y1=>{
    var st=JSON.parse(localStorage.getItem('courseapp_v1'));
    // keep only single-choice items (this suite validates the single-choice review path)
    Object.keys(st.review).forEach(function(id){ if(id.endsWith(':7')||id.endsWith(':8'))delete st.review[id]; else st.review[id].due=y1; });
    localStorage.setItem('courseapp_v1',JSON.stringify(st));
  },D.y1);
  const dueInStore=(()=>{ return true; })();
  await p.evaluate(()=>{location.hash='#';});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(120);
  ok('home surfaces the review queue', await p.locator('.alertrow.rev').count()>0);

  await p.evaluate(()=>{location.hash='#review';});
  await p.waitForTimeout(150);
  ok('review session shows a card', await p.locator('.revcard').count()>0);
  ok('review card has options', await p.locator('.revopt').count()>0);

  // determine correct option by matching visible options against global BUILTIN_COURSES
  // Ask the app which card is on screen. Matching option text against the whole
  // catalogue used to pick the wrong question whenever two shared an option set
  // (No/Yes appears many times), which made this block fail about one run in three.
  const correctIdx=await p.evaluate(()=>{
    const it=window.OB&&window.OB.revCard&&window.OB.revCard();
    return it&&it.q&&typeof it.q.answer==='number'?it.q.answer:-1;
  });
  ok('found correct answer for review card', correctIdx>=0);
  const xpBefore=(await getStore()).gam.xp;
  // click the option whose original index (data-ri) is the correct answer (options are shuffled)
  await p.evaluate(ans=>{var b=[...document.querySelectorAll('.revopt')].find(x=>+x.getAttribute('data-ri')===ans);if(b)b.click();},correctIdx);
  await p.waitForTimeout(120);
  ok('review feedback shows after answering', await p.locator('.revfb.show.ok').count()>0);
  ok('correct review option marked', await p.locator('.revopt.correct').count()>0);
  s=await getStore();
  ok('correct review answer awards +2 XP', s.gam.xp===xpBefore+2);
  // at least one review item now rescheduled into the future (box advanced past today)
  const anyFuture=await p.evaluate(today=>{
    var st=JSON.parse(localStorage.getItem('courseapp_v1'));
    return Object.keys(st.review).some(function(id){return st.review[id].due>today && (st.review[id].box||1)>=2;});
  },D.today);
  ok('answered item rescheduled to a future date', anyFuture);
  await p.locator('#revnext').click();
  await p.waitForTimeout(100);
  ok('review advances (next card or completion)', (await p.locator('.revcard, .revempty').count())>0);

  // 7) Settings daily-goal control
  await p.evaluate(()=>{location.hash='#settings';});
  await p.waitForTimeout(250);await openSect(p,'set-learning');
  ok('settings has >=3 goal buttons', await p.locator('[data-goal]').count()>=3);
  await p.locator('[data-goal="60"]').click();
  await p.waitForTimeout(100);
  s=await getStore();
  ok('daily goal set to 60 (Deep)', s.gam.goal===60);
  ok('active goal button highlighted', await p.locator('[data-goal="60"].on').count()>0);

  // 8) Persistence across reload
  const xpNow=(await getStore()).gam.xp;
  await p.evaluate(()=>{location.hash='#';});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(150);
  s=await getStore();
  ok('XP persists across reload', s.gam.xp===xpNow);
  ok('goal persists across reload', s.gam.goal===60);
  ok('review items persist across reload', Object.keys(s.review||{}).length>0);

  // 9) Reset-all keeps goal, clears xp/review/progress
  await p.evaluate(()=>{location.hash='#settings';});
  await p.waitForTimeout(120);
  p.once('dialog',d=>d.accept());
  await openSect(p,'set-data');
  await p.locator('[data-resetall]').first().click();
  await p.waitForTimeout(150);
  s=await getStore();
  ok('reset-all clears XP', s.gam.xp===0);
  ok('reset-all keeps daily goal', s.gam.goal===60);
  ok('reset-all clears review queue', Object.keys(s.review||{}).length===0);

  ok('no page/console errors in JS mode', errors.length===0);
  if(errors.length) console.log('    errors:',errors.slice(0,6));

  await browser.close();
  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
