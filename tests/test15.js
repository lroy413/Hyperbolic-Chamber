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
  const ctx = await browser.newContext({javaScriptEnabled:true, acceptDownloads:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
  const p=await ctx.newPage();
  const errors=[];
  p.on('pageerror',e=>errors.push(String(e)));
  p.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
  await p.goto(URL,{waitUntil:'load'});await useCat(p);
  await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(120);
  const getStore=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));
  const seedGam=(patch)=>p.evaluate(patch=>{var st=JSON.parse(localStorage.getItem('courseapp_v1')||'{}');st.gam=Object.assign({xp:0,streak:0,best:0,goal:30,freezes:1,today:'',todayXP:0,lastMet:'',done:{},tSpent:0,badges:{},perfects:0,reviewsDone:0},st.gam||{},patch);localStorage.setItem('courseapp_v1',JSON.stringify(st));},patch);

  // =========================================================
  //  TOKENS + POWER-UPS
  // =========================================================
  // low XP: no power-ups on the quiz
  await seedGam({xp:40});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-quiz';},CID);
  await p.waitForTimeout(150);
  ok('no power-up bar below 100 XP', await p.locator('.powerbar').count()===0);
  ok('no hint buttons below 100 XP', await p.locator('.hintbtn').count()===0);

  // xp 350: hint (>=100) and peek (>=300) both unlocked, 3 tokens
  await seedGam({xp:350,tSpent:0});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-quiz';},CID);
  await p.waitForTimeout(150);
  ok('power-up bar shows at 350 XP', await p.locator('.powerbar').count()>0);
  ok('token balance shows 3', (await p.locator('.pbtok b').innerText())==='3');
  ok('hint buttons rendered per question', await p.locator('.hintbtn').count()>=5);
  ok('glossary peek button shown (>=300 XP)', await p.locator('.pbpeek').count()>0);

  // use a hint on a single-choice question -> eliminates a wrong option, spends a token
  const singleQ=p.locator('.q[data-qtype="single"]').first();
  await singleQ.locator('.hintbtn').click();
  await p.waitForTimeout(80);
  ok('hint eliminated one wrong option', await singleQ.locator('.opt.eliminated').count()===1);
  ok('hint button marked used', await singleQ.locator('.hintbtn.used').count()===1);
  let s=await getStore();
  ok('one token spent after hint', (s.gam.tSpent||0)===1);
  ok('token UI decremented to 2', (await p.locator('.pbtok b').first().innerText())==='2');

  // glossary peek -> overlay appears, token spent, closes
  await p.locator('.pbpeek').click();
  await p.waitForTimeout(120);
  ok('glossary peek overlay opens', await p.locator('.peekoverlay').count()>0);
  ok('peek overlay shows glossary terms', await p.locator('.peekoverlay .gloss dt').count()>0);
  s=await getStore();
  ok('peek spent a second token', (s.gam.tSpent||0)===2);
  await p.locator('#peekclose').click();
  await p.waitForTimeout(80);
  ok('peek overlay closes', await p.locator('.peekoverlay').count()===0);

  // spend down to 0 tokens -> further use is blocked
  await seedGam({xp:100,tSpent:1}); // earned 1, spent 1 => 0 left
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-quiz';},CID);
  await p.waitForTimeout(150);
  ok('token balance shows 0 when depleted', (await p.locator('.pbtok b').first().innerText())==='0');
  await p.locator('.q[data-qtype="single"]').first().locator('.hintbtn').click();
  await p.waitForTimeout(80);
  ok('hint blocked with 0 tokens (no elimination)', await p.locator('.opt.eliminated').count()===0);

  // =========================================================
  //  BADGES
  // =========================================================
  await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(80);
  // viewing a lesson earns the "first steps" badge
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-l1';},CID);
  await p.waitForTimeout(150);
  s=await getStore();
  ok('first-lesson badge earned on lesson view', !!(s.gam.badges&&s.gam.badges.first_lesson));
  // seed XP to earn XP badges, then open badges page
  await seedGam({xp:150,best:7});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.evaluate(()=>{location.hash='#badges';});
  await p.waitForTimeout(150);
  const earnedCount=await p.locator('.bmed.got').count();
  ok('badges page renders earned badges', earnedCount>=2);
  ok('badges page shows the rewards card', await p.locator('.rewardcard').count()>0);
  ok('badges page shows locked badges too', await p.locator('.bmed:not(.got)').count()>0);
  ok('top bar shows the rank chip', await (async()=>{await p.evaluate(()=>{location.hash='#';});await p.waitForTimeout(200);return await p.locator('.tbs.rank').count()>0;})());

  // =========================================================
  //  STUDY MODES
  // =========================================================
  // Flashcards
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/flash';},CID);
  await p.waitForTimeout(150);
  ok('flashcards render a card', await p.locator('.flashcard').count()>0);
  await p.locator('.flashcard').click();
  await p.waitForTimeout(80);
  ok('flashcard flips on tap', await p.locator('.flashcard.flipped').count()>0);
  const xpBeforeFlash=(await getStore()).gam.xp;
  for(let i=0;i<140;i++){ if(await p.locator('#flashhost .revbig').count()){break;} const got=await p.locator('[data-flashrate="1"]').count(); if(!got)break; await p.locator('[data-flashrate="1"]').click(); await p.waitForTimeout(45); }
  ok('flashcards deck completes', /Deck complete/.test(await p.locator('#flashhost').innerText()));
  s=await getStore();
  ok('finishing a deck awards +5 XP', s.gam.xp===xpBeforeFlash+5);

  // Match
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/match';},CID);
  await p.waitForTimeout(150);
  ok('match renders a tile grid', await p.locator('.matchtile').count()>=6);
  const xpBeforeMatch=(await getStore()).gam.xp;
  await p.evaluate(()=>{
    var grid=document.getElementById('matchgrid');
    var pids=[...new Set([...grid.querySelectorAll('.matchtile')].map(t=>t.getAttribute('data-pid')))];
    pids.forEach(function(pid){
      grid.querySelector('.matchtile[data-pid="'+pid+'"][data-kind="t"]').click();
      grid.querySelector('.matchtile[data-pid="'+pid+'"][data-kind="d"]').click();
    });
  });
  await p.waitForTimeout(150);
  ok('clearing the match board shows completion', /cleared|Board cleared/i.test(await p.locator('#matchdone').innerText()));
  s=await getStore();
  ok('clearing match awards +5 XP', s.gam.xp===xpBeforeMatch+5);

  // Practice test
  await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/practice';},CID);
  await p.waitForTimeout(150);
  ok('practice picker shows quick option', await p.locator('.pracopt').count()>=1);
  ok('weak-spots option dimmed initially', await p.locator('.pracopt.dim').count()>0);
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/practice/quick';},CID);
  await p.waitForTimeout(180);
  const pcount=await p.locator('.quizwrap .q').count();
  ok('practice draws up to 10 questions', pcount>0 && pcount<=10);
  ok('practice questions carry review-origin keys', await p.locator('.quizwrap .q[data-rk]').count()===pcount);
  // answer all correctly
  await p.evaluate(cid=>{
    var course=[].concat(window.BUILTIN_COURSES||[],window.STORE_CATALOG||[]).find(c=>c.id===cid);
    function getQ(rk){var pp=rk.split(':');return pp[1]==='final'?course.finalExam.questions[+pp[2]]:course.modules[+pp[1].slice(1)-1].quiz.questions[+pp[2]];}
    document.querySelectorAll('.quizwrap .q').forEach(function(qe){var type=qe.getAttribute('data-qtype');var q=getQ(qe.getAttribute('data-rk'));
      if(type==='multi'){qe.querySelectorAll('input[type=checkbox]').forEach(function(cb){cb.checked=cb.getAttribute('data-correct')==='1';});}
      else if(type==='text'){qe.querySelector('.qinput').value=(q.accept||[q.answer])[0];}
      else{var isc=qe.querySelector('label.opt.isc input');if(isc)isc.checked=true;}
    });
  },CID);
  await p.locator('.quizwrap .submitbtn').click();
  await p.waitForTimeout(150);
  ok('practice grades and passes', /Passed|100%/.test(await p.locator('.qbanner').innerText()));
  s=await getStore();
  ok('practice awards +15 XP', s.gam.xp===15);
  ok('practice did NOT mark any module passed', !(s.progress&&s.progress[CID]&&s.progress[CID].passed&&Object.keys(s.progress[CID].passed).length));
  ok('practice seeded spaced-review items', s.review&&Object.keys(s.review).length>0);

  // weak-spots becomes available after seeding low-box review items
  await p.evaluate(()=>{var st=JSON.parse(localStorage.getItem('courseapp_v1'));st.review['app-builder:m2:0']={c:'app-builder',k:'m2',i:0,box:1,due:'2020-01-01'};localStorage.setItem('courseapp_v1',JSON.stringify(st));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/practice';},CID);
  await p.waitForTimeout(150);
  ok('weak-spots option enabled after misses', await p.locator('.pracopt:not(.dim)').count()>=2);

  // =========================================================
  //  PROGRESS BACKUP
  // =========================================================
  await p.evaluate(()=>{location.hash='#settings';});
  await p.waitForTimeout(150);
  await openSect(p,'set-data');
  ok('settings shows backup control', await p.locator('[data-backup]').count()>0);
  ok('settings shows restore control', await p.locator('#restorefile').count()>0);
  const dl=await Promise.all([
    p.waitForEvent('download',{timeout:4000}).catch(()=>null),
    p.locator('[data-backup]').click()
  ]);
  ok('backup triggers a file download', !!dl[0]);
  if(dl[0]){ const fn=dl[0].suggestedFilename(); ok('backup filename looks right', /backup/i.test(fn)); }
  else ok('backup filename looks right', false);

  ok('no page/console errors', errors.length===0);
  if(errors.length) console.log('    errors:',errors.slice(0,6));

  await browser.close();
  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
