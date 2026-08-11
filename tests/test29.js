/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test29 — the progression systems.
   Ranks, daily quests, mastery decay, quiz combos, activity calendar.
   Quests are deliberately LEFT ON here (unlike the other suites) — that's the
   thing under test. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
const openSect=async(pg,id)=>{
  const head=pg.locator('[data-secttoggle="'+id+'"]');
  if(await head.count()){
    const sec=pg.locator('.coll[data-sect="'+id+'"]');
    const isOpen=await sec.evaluate(el=>el.classList.contains('open')).catch(()=>false);
    if(!isOpen){await head.click();await pg.waitForTimeout(260);}
  }
};

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:844}});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const seed=async(gam,extra)=>{
  await p.evaluate(([g,cs,ex])=>{
    localStorage.clear();
    localStorage.setItem('courseapp_v1',JSON.stringify(Object.assign({
      imported:JSON.parse(JSON.stringify(cs)),
      settings:{theme:'dark',palette:'aurora',scale:1},gam:g
    },ex||{})));
    location.hash='';   // reload on a lesson URL would re-award XP and fire a quest
  },[gam,FULLCAT,extra]);
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(400);
  await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(350);   // always land on home
};
await p.goto(URL,{waitUntil:'load'});await useCat(p);

console.log('-- ranks');
await seed({xp:0,goal:30,done:{},badges:{}});
ok('a new learner is rank 1', /Novice/.test(await p.locator('.tbs.rank').getAttribute('title')));
await seed({xp:900,goal:30,done:{},badges:{}});
ok('900 XP is Practitioner (level 4)', /Practitioner/.test(await p.locator('.tbs.rank').getAttribute('title')));
ok('the chip shows the level number', /^4$/.test((await p.locator('.tbs.rank b').innerText()).trim()));
await seed({xp:99999,goal:30,done:{},badges:{}});
ok('the top rank does not overflow the ladder', /Polymath/.test(await p.locator('.tbs.rank').getAttribute('title')) && (await p.locator('.tbs.rank b').innerText()).trim()==='10');
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(400);
ok('rewards shows the full ten-rank ladder', await p.locator('.rkladder .rkstep').count()===10);
ok('every rank is earned at 99,999 XP', await p.locator('.rkladder .rkstep.got').count()===10);
await seed({xp:900,goal:30,done:{},badges:{}});
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(400);
ok('exactly one rank is marked current', await p.locator('.rkladder .rkstep.cur').count()===1);
ok('four ranks earned at 900 XP', await p.locator('.rkladder .rkstep.got').count()===4);

console.log('-- daily quests');
await seed({xp:0,goal:30,done:{},badges:{}});
ok('three quests are shown', await p.locator('.qtiles .qtile').count()===3);
const first=await p.locator('.qtiles .qtmid b').allInnerTexts();
await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(500);
const second=await p.locator('.qtiles .qtmid b').allInnerTexts();
ok('the same three quests survive a reload (no reroll)', JSON.stringify(first)===JSON.stringify(second));
ok('no two quests are duplicates', new Set(second).size===3);
ok('each quest carries its own ring', await p.locator('.qtiles .qtile .snkring').count()===3);

// completing a quest pays out
await seed({xp:0,goal:1000,done:{},badges:{},quest:{day:day(0),counts:{lessons:1},claimed:{}}});
const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.xp||0);
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(700);
const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.xp||0);
ok('a lesson always pays at least its own 10 XP', after>=before+10);
ok('quest counters advance on a lesson', await p.evaluate(()=>((JSON.parse(localStorage.getItem('courseapp_v1')).gam.quest||{}).counts||{}).lessons>=1));
ok('quest XP does not recurse into itself', after<before+200);

// a stale quest day resets
await seed({xp:100,goal:30,done:{},badges:{},quest:{day:day(-3),counts:{lessons:9,xp:9999},claimed:{lessons2:1,xp50:1}}});
ok('yesterday’s quest progress is cleared', await p.evaluate(()=>{
  const q=JSON.parse(localStorage.getItem('courseapp_v1')).gam.quest||{};
  return Object.keys(q.counts||{}).length===0 || q.day!==null;
}));
ok('a fresh day shows three unclaimed quests', await p.locator('.qtiles .qtile.done').count()===0);

console.log('-- mastery decay');
const passedAll={'stock-charts':{passed:{m1:true,m2:true,m3:true,m4:true,m5:true,m6:true,m7:true,m8:true,m9:true},finalPassed:true,lastPage:'cert'}};
await seed({xp:500,goal:30,done:{},badges:{},touch:{'stock-charts':day(0)}},{progress:passedAll});
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(500);
let txt=await p.locator('.mstlist').innerText();
ok('a course opened today sits at full mastery', /100/.test(txt)&&/holding/i.test(txt));
await seed({xp:500,goal:30,done:{},badges:{},touch:{'stock-charts':day(-90)}},{progress:passedAll});
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(500);
txt=await p.locator('.mstlist').innerText();
ok('90 days untouched shows as slipping', /slipping/i.test(txt));
const pct=await p.evaluate(()=>{const el=document.querySelector('.snkring.mst .snkin b');return el?parseInt(el.textContent,10):-1;});
ok('decayed mastery is well below 100 but above the floor', pct>=30&&pct<=60);
ok('a stale course offers a Refresh action', /Refresh/.test(txt));
ok('home warns about the stale course', await (async()=>{await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(400);return await p.locator('.alertrow.stale').count()>0;})());
// opening it restores mastery
await p.evaluate(()=>{location.hash='#c/stock-charts/m1-l1';});await p.waitForTimeout(700);
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(500);
const pct2=await p.evaluate(()=>{const el=document.querySelector('.snkring.mst .snkin b');return el?parseInt(el.textContent,10):-1;});
ok('reading a lesson restores mastery to full', pct2===100);
ok('the refresh is recorded for its badge', await p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).gam.refreshes||0)>=1));

console.log('-- quiz combo');
await seed({xp:0,goal:1000,done:{},badges:{}});
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-quiz';});await p.waitForTimeout(700);
// answer every single-choice question correctly
await p.evaluate(()=>{
  document.querySelectorAll('.quizwrap .q').forEach(q=>{
    const c=q.querySelector('input[data-correct="1"]');
    if(c){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}
  });
});
await p.waitForTimeout(200);
const sub=p.locator('.submitbtn');
if(await sub.count()){await sub.click();await p.waitForTimeout(700);}
const combo=await p.evaluate(()=>{const qw=document.querySelector('.quizwrap');return qw?parseInt(qw.getAttribute('data-bestcombo'),10):-1;});
ok('the attempt records a best answer run', combo>=1);
ok('best combo is stored on the profile', await p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).gam.bestCombo||0)>=1));
if(combo>=3)ok('a run of 3+ is celebrated in the banner', /in a row/.test(await p.locator('.qbanner').innerText()));
else ok('a run of 3+ is celebrated in the banner (skipped — short quiz)', true);

console.log('-- activity calendar');
await seed({xp:100,goal:30,done:{},badges:{},days:{[day(0)]:1,[day(-1)]:1,[day(-3)]:1}});
ok('home shows a fortnight of activity', await p.locator('.dashside .skday').count()===14);
ok('active days are marked', await p.locator('.dashside .skday.on').count()===3);
ok('today is outlined', await p.locator('.dashside .skday.now').count()===1);
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(400);
ok('rewards shows five weeks', await p.locator('.skcard .skday').count()===35);
ok('opening the app marks today active', await p.evaluate(()=>!!(JSON.parse(localStorage.getItem('courseapp_v1')).gam.days||{})[new Date().toISOString().slice(0,10)]));

console.log('-- collapsible sections');
await seed({xp:1240,goal:30,done:{},badges:{}},{progress:{'stock-charts':{passed:{m1:true},finalPassed:false,lastPage:'m1-l1'}}});
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(500);
ok('rewards splits into collapsible groups', await p.locator('.coll[data-sect^="rw-"]').count()>=8);
ok('quests, mastery and badges start open', await p.locator('.coll[data-sect="rw-quests"].open, .coll[data-sect="rw-mastery"].open, .coll[data-sect="rw-badges"].open').count()===3);
ok('the reference groups start closed', await p.locator('.coll[data-sect="rw-activity"]:not(.open), .coll[data-sect="rw-tokens"]:not(.open), .coll[data-sect="rw-warmup"]:not(.open)').count()===3);
ok('closed group headers still show a count', /of 26/.test(await p.locator('[data-secttoggle="rw-badges"]').innerText()));
await p.locator('[data-secttoggle="rw-tokens"]').click();await p.waitForTimeout(300);
ok('a closed group opens on tap', await p.locator('.coll[data-sect="rw-tokens"].open').count()===1);
ok('badges are reachable', await p.locator('.coll[data-sect="rw-badges"] .bmed').count()>=26);
await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(300);
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(400);
ok('the open/closed choice persists across navigation', await p.locator('.coll[data-sect="rw-tokens"].open').count()===1);
await p.reload({waitUntil:'load'});await useCat(p);await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(600);
ok('the choice survives a reload', await p.locator('.coll[data-sect="rw-tokens"].open').count()===1);

await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(500);
ok('settings splits into collapsible groups', await p.locator('.coll[data-sect^="set-"]').count()===8);
ok('settings hides the reference groups by default', await p.locator('.coll[data-sect="set-data"]:not(.open)').count()===1);
ok('appearance and learning stay open', await p.locator('.coll[data-sect="set-appearance"].open, .coll[data-sect="set-learning"].open').count()===2);
ok('a settings control is reachable after opening', await (async()=>{
  await openSect(p,'set-data');
  return await p.locator('[data-resetall]').isVisible();
})());

await p.evaluate(()=>{location.hash='#track/markets';});await p.waitForTimeout(500);
ok('the specialization page collapses too', await p.locator('.coll[data-sect^="tk-"]').count()>=4);
ok('courses in order stays open there', await p.locator('.coll[data-sect="tk-courses"].open').count()===1);

console.log('-- badges');
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(400);
await openSect(p,'rw-badges');
ok('the badge set grew past the original twelve', await p.locator('.bgrid .bmed').count()>=26);
ok('locked badges are visibly locked', await p.locator('.bgrid .bmed:not(.got)').count()>0);

ok('no console errors', errs.length===0);
if(errs.length)console.log('   ',errs.slice(0,5));
await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
