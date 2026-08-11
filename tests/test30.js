/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test30 — the Daily Warm-up, and the streak moving off course work.
   The design claim under test: a 40-hour course cannot be the thing a daily
   streak depends on, so the streak comes from five short questions instead —
   and ATTEMPTING them is enough. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};

const openSect=async(pg,id)=>{
  const head=pg.locator('[data-secttoggle="'+id+'"]');
  if(await head.count()){
    const sec=pg.locator('.coll[data-sect="'+id+'"]');
    const isOpen=await sec.evaluate(el=>el.classList.contains('open')).catch(()=>false);
    if(!isOpen){await head.click();await pg.waitForTimeout(280);}
  }
};
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:844}});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const seed=async(gam,extra)=>{
  await p.evaluate(([g,cs,ex])=>{
    localStorage.clear();
    localStorage.setItem('courseapp_v1',JSON.stringify(Object.assign({
      imported:JSON.parse(JSON.stringify(cs)),settings:{theme:'dark',palette:'aurora',scale:1},gam:g},ex||{})));
    location.hash='';
  },[gam,FULLCAT,extra]);
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(450);
  await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(300);
};
const store=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')));
const answerAll=async(correct)=>{
  const ids=await p.evaluate(()=>[].slice.call(document.querySelectorAll('.wucard[data-wq]')).map(e=>e.getAttribute('data-wq')));
  for(const id of ids){
    const idx=await p.evaluate(([qid,c])=>{
      const q=(window.WARMUP||[]).find(x=>x.id===qid);if(!q)return 0;
      return c?q.a:(q.a===0?1:0);
    },[id,correct]);
    await p.locator(`[data-wu="${id}"][data-wi="${idx}"]`).click();await p.waitForTimeout(140);
  }
  return ids.length;
};
await p.goto(URL,{waitUntil:'load'});await useCat(p);

console.log('-- the bank');
ok('a warm-up bank ships with the app', await p.evaluate(()=>(window.WARMUP||[]).length>=240));
ok('every question is well formed', await p.evaluate(()=>(window.WARMUP||[]).every(q=>
  q.id&&q.q&&Array.isArray(q.o)&&q.o.length>=3&&Number.isInteger(q.a)&&q.a>=0&&q.a<q.o.length&&q.e&&q.c&&[1,2,3].indexOf(q.t)>-1)));
ok('question ids are unique', await p.evaluate(()=>{const s=new Set((window.WARMUP||[]).map(q=>q.id));return s.size===(window.WARMUP||[]).length;}));
ok('all three difficulty tiers are populated', await p.evaluate(()=>[1,2,3].every(t=>(window.WARMUP||[]).filter(q=>q.t===t).length>=60)));
ok('at least six subject categories', await p.evaluate(()=>new Set((window.WARMUP||[]).map(q=>q.c)).size>=6));

console.log('-- the daily set');
await seed({xp:0,goal:10,done:{},badges:{}});
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
ok('exactly five questions', await p.locator('.wucard[data-wq]').count()===5);
const cats=await p.locator('.wucat').allInnerTexts();
ok('five different categories — not five grammar questions', new Set(cats).size===5);
const firstQs=await p.locator('.wuq').allInnerTexts();
await p.reload({waitUntil:'load'});await useCat(p);
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
ok('the same five survive a reload', JSON.stringify(await p.locator('.wuq').allInnerTexts())===JSON.stringify(firstQs));

console.log('-- attempting is enough');
await seed({xp:100,streak:6,best:6,goal:10,lastMet:day(-1),done:{},badges:{},freezes:1});
ok('streak starts at 6', await p.locator('.tbs.flame b').innerText()==='6');
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
ok('Finish is disabled until every question is answered', await p.locator('#wudone').isDisabled());
const n=await answerAll(false);          // deliberately ALL WRONG
ok('all five answered', n===5);
ok('Finish is enabled once answered', !(await p.locator('#wudone').isDisabled()));
await p.locator('#wudone').click();await p.waitForTimeout(600);
let s=await store();
ok('a fully wrong round still advances the streak', s.gam.streak===7);
ok('a fully wrong round still pays the attempt XP', s.gam.xp===103);
ok('the result screen shows the score', /0 \/ 5/.test(await p.locator('.wrbig').innerText()));
ok('the result screen confirms the streak is safe', /7-day streak/.test(await p.locator('.wrstreak').innerText()));

console.log('-- correct answers pay a bonus');
await seed({xp:100,streak:6,best:6,goal:10,lastMet:day(-1),done:{},badges:{},freezes:1});
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
await answerAll(true);
await p.locator('#wudone').click();await p.waitForTimeout(600);
s=await store();
ok('a perfect round pays attempt + per-answer + perfect bonus', s.gam.xp===100+3+5*2+5);
ok('a perfect round is recorded', s.gam.wuPerfect===1);
ok('answered and correct counts are tracked', s.gam.wuAnswered===5&&s.gam.wuCorrect===5);

console.log('-- course work no longer drives the streak');
await seed({xp:0,streak:4,best:4,goal:10,lastMet:day(-1),done:{},badges:{},freezes:1});
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(600);
s=await store();
ok('reading a lesson still awards XP', (s.gam.xp||0)>=10);
ok('reading a lesson does NOT advance the streak', s.gam.streak===4&&s.gam.lastMet===day(-1));
ok('a day with course work still counts as active', !!(s.gam.days||{})[day(0)]);
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
await answerAll(true);
await p.locator('#wudone').click();await p.waitForTimeout(600);
s=await store();
ok('the warm-up is what advances it', s.gam.streak===5);

console.log('-- once a day, and it resumes');
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
ok('a finished warm-up shows the result, not the questions again', await p.locator('.wuresult').count()===1);
ok('there is no second Finish button to double-claim', await p.locator('#wudone').count()===0);
const xpLocked=(await store()).gam.xp;
await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(300);
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(400);
ok('revisiting cannot re-award XP', (await store()).gam.xp===xpLocked);

// partial progress survives leaving the page
await seed({xp:0,streak:0,best:0,goal:10,done:{},badges:{},freezes:1});
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
const someIds=await p.evaluate(()=>[].slice.call(document.querySelectorAll('.wucard[data-wq]')).map(e=>e.getAttribute('data-wq')).slice(0,2));
for(const id of someIds){await p.locator(`[data-wu="${id}"][data-wi="0"]`).click();await p.waitForTimeout(140);}
await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(350);
ok('the warm-up tile shows partial progress', /2 of 5 answered/.test(await p.locator('.btile.warm').innerText()));
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(400);
ok('answers are still there after leaving and returning', await p.locator('.wucard.answered').count()===2);
ok('an answered question reveals its explanation', await p.locator('.wuexp.show').count()===2);
ok('answered options lock', await p.locator('.wuopt:disabled').count()>=6);

console.log('-- home and navigation');
await seed({xp:0,streak:3,best:3,goal:10,lastMet:day(-1),done:{},badges:{},freezes:1});
ok('the main tile leads, the warm-up tile sits under it', await p.evaluate(()=>{
  const w=document.querySelector('.btile.warm'),n=document.querySelector('.bmain');
  return !!w&&!!n&&n.getBoundingClientRect().top<w.getBoundingClientRect().top;
}));
ok('the card says what the streak depends on', /streak/i.test(await p.locator('.btile.warm').innerText()));
ok('the drawer offers the warm-up', await p.evaluate(()=>!!document.querySelector('.navitem[href="#warmup"]')));

console.log('-- difficulty');
await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(450);
await openSect(p,'set-learning');
ok('difficulty has three levels', await p.locator('[data-wulevel]').count()===3);
await p.locator('[data-wulevel="hard"]').click();await p.waitForTimeout(400);
ok('the choice is saved', (await store()).settings.wuLevel==='hard');
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
ok('Harder draws only from the upper tiers', await p.evaluate(()=>{
  const ids=(JSON.parse(localStorage.getItem('courseapp_v1')).gam.wu||{}).ids||[];
  return ids.length===5&&ids.every(id=>{const q=(window.WARMUP||[]).find(x=>x.id===id);return q&&q.t>=2;});
}));
await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(400);
await p.locator('[data-wulevel="easy"]').click();await p.waitForTimeout(400);
await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(450);
ok('Easier draws only from the lower tiers', await p.evaluate(()=>{
  const ids=(JSON.parse(localStorage.getItem('courseapp_v1')).gam.wu||{}).ids||[];
  return ids.length===5&&ids.every(id=>{const q=(window.WARMUP||[]).find(x=>x.id===id);return q&&q.t<=2;});
}));

console.log('-- no repeats until the bank is exhausted');
await seed({xp:0,streak:0,best:0,goal:10,done:{},badges:{},freezes:1});
const seenQ=new Set();let repeats=0;
for(let d=0;d<8;d++){
  await p.evaluate(()=>{location.hash='#warmup';});await p.waitForTimeout(320);
  const qs=await p.locator('.wuq').allInnerTexts();
  qs.forEach(q=>{if(seenQ.has(q))repeats++;seenQ.add(q);});
  await p.evaluate(()=>{
    const st=JSON.parse(localStorage.getItem('courseapp_v1'));
    const ids=(st.gam.wu||{}).ids||[];
    st.gam.wuSeen=st.gam.wuSeen||{};ids.forEach(i=>st.gam.wuSeen[i]=1);
    st.gam.wu=null;localStorage.setItem('courseapp_v1',JSON.stringify(st));
  });
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(320);
}
ok('40 questions over 8 days with no repeats', seenQ.size===40&&repeats===0);

console.log('-- rewards page');
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(500);
ok('rewards has a warm-up section', await p.locator('.coll[data-sect="rw-warmup"]').count()===1);
await openSect(p,'rw-warmup');
ok('it reports the warm-up stats', /accuracy/i.test(await p.locator('.coll[data-sect="rw-warmup"]').innerText()));

ok('no console errors', errs.length===0);
if(errs.length)console.log('   ',errs.slice(0,5));
await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
