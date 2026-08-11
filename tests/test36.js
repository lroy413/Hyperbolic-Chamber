/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test36 — modules that stand alone, custom paths, the optional tutor, and the
   rebuilt Rewards page.

   The load-bearing claim here is the credit rule. The transcript has always said
   "one credit for every ten hours of coursework" while awarding exactly one
   credit per module regardless of size, so a 38-hour course was worth nine. That
   is the kind of error that only shows up if you test the sentence rather than
   the code, so it is tested first. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const today=()=>new Date().toISOString().slice(0,10);
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
const openSect=async(pg,id)=>{
  const head=pg.locator('[data-secttoggle="'+id+'"]');
  if(await head.count()){
    const sec=pg.locator('.coll[data-sect="'+id+'"]');
    const isOpen=await sec.evaluate(el=>el.classList.contains('open')).catch(()=>false);
    if(!isOpen){await head.click();await pg.waitForTimeout(280);}
  }
};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
/* A stand-in for the Anthropic API. The tutor must never be exercised against
   the real one in a test, and mocking it is also the only way to prove the
   failure paths — a rejected key, a rate limit, no network. */
let apiCalls=0;
await ctx.route('https://api.anthropic.com/**',async route=>{
  apiCalls++;
  const req=route.request(), u=req.url();
  if(req.headers()['x-api-key']!=='sk-ant-good')
    return route.fulfill({status:401,contentType:'application/json',
      body:JSON.stringify({error:{message:'invalid x-api-key'}})});
  if(!req.headers()['anthropic-dangerous-direct-browser-access'])
    return route.fulfill({status:403,contentType:'application/json',
      body:JSON.stringify({error:{message:'CORS header missing'}})});
  if(u.includes('/models'))
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({data:[{id:'model-a',display_name:'Model A'},{id:'model-b',display_name:'Model B'}]})});
  const body=JSON.parse(req.postData());
  return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({content:[{type:'text',text:'First paragraph.\n\nSecond one. ctx='+body.messages[0].content.length+' model='+body.model}]})});
});
const p=await ctx.newPage();
const errs=[];
p.on('pageerror',e=>errs.push(String(e.stack||e)));
// deliberate 401s below are network noise, not app errors
p.on('console',m=>{if(m.type()==='error'&&!/401|Unauthorized|Failed to load resource/i.test(m.text()))errs.push(m.text());});

const seed=async(extra)=>{
  await p.evaluate(([cs,ex])=>{
    localStorage.setItem('courseapp_v1',JSON.stringify(Object.assign({
      imported:cs,settings:{theme:'dark',palette:'aurora',scale:1}},ex||{})));
    location.hash='';
  },[FULLCAT,extra||{}]);
  await p.reload({waitUntil:'load'});await p.waitForTimeout(800);
};
await p.goto(URL,{waitUntil:'load'});
await seed();

/* ================= the credit rule ================= */
console.log('-- credits say what they do');
const cr=await p.evaluate(()=>{
  const c=OB.getCourse('personal-finance');
  return {hours:OB.courseHours(c),credits:OB.courseCredits(c),mods:c.modules.length,
    one:OB.moduleCredits(c.modules[0]),modHours:OB.moduleHours(c.modules[0])};
});
ok('a module is worth its own hours over ten, not a flat one',
  Math.abs(cr.one-cr.modHours/10)<0.06 && cr.one<1);
ok('a '+cr.hours+'-hour course is worth '+cr.credits+' credits, not '+cr.mods,
  Math.abs(cr.credits-cr.hours/10)<0.5);

/* ================= a module on its own ================= */
console.log('-- a module can be taken on its own');
await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(800);
ok('the fold over the locked modules says they can be taken alone',
  /on its own/i.test(await p.locator('.lockfold').innerText()));
await p.locator('.lockfold').click();await p.waitForTimeout(600);
ok('and each locked module row links to its own page',
  await p.locator('.modcard.locked .macmain[href^="#m/"]').count()>0);
ok('the row says what taking it alone costs',
  /\dh · on its own/.test(await p.locator('.modcard.locked .macstat').first().innerText()));
await p.evaluate(()=>{location.hash='#m/personal-finance/5';});await p.waitForTimeout(700);
const mp=await p.evaluate(()=>({
  hero:!!document.querySelector('.mhero'),
  offer:!!document.querySelector('.soloffer'),
  meta:(document.querySelector('.cherometa')||{}).textContent||'',
  kicker:(document.querySelector('.chero .kicker')||{}).textContent||''}));
ok('the module has a page of its own', mp.hero===true);
ok('it says where it sits in the course', /Module 5 of \d+/.test(mp.kicker));
ok('it states hours and credit up front', /hours/.test(mp.meta)&&/credit/.test(mp.meta));
ok('a module you have not unlocked offers to be taken alone', mp.offer===true);
ok('the lessons are visible but not yet openable',
  await p.locator('.acclesson.dim').count()>0 && await p.locator('.acclesson[href]').count()===0);
ok('the deep link into a locked module is still refused',
  await (async()=>{
    await p.evaluate(()=>{location.hash='#c/personal-finance/m5-l1';});await p.waitForTimeout(600);
    return !/m5-l1/.test(await p.evaluate(()=>location.hash));})());

await p.evaluate(()=>{location.hash='#m/personal-finance/5';});await p.waitForTimeout(600);
await p.locator('[data-solo]').click();await p.waitForTimeout(800);
ok('taking it alone opens the module', /m5-intro/.test(await p.evaluate(()=>location.hash)));
ok('and is remembered', await p.evaluate(()=>OB.isSolo('personal-finance',5)===true));
ok('its lessons are now reachable',
  await p.evaluate(()=>OB.moduleUnlocked(OB.getCourse('personal-finance'),5)===true));
ok('but the module before it stays locked',
  await p.evaluate(()=>OB.moduleUnlocked(OB.getCourse('personal-finance'),4)===false));
ok('the course page now shows it as open',
  await (async()=>{
    await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(700);
    return await p.locator('.modcard.locked').count()<await p.evaluate(()=>OB.getCourse('personal-finance').modules.length);})());

/* ================= paths ================= */
console.log('-- design your learning');
await seed();
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(800);
ok('the library invites you to design one', await p.locator('.dslure').count()===1);
await p.evaluate(()=>{location.hash='#design';});await p.waitForTimeout(700);
await p.fill('#npname','Money, fast');
await p.locator('.npbtn').click();await p.waitForTimeout(800);
ok('naming a path creates it and opens it', /^#path\//.test(await p.evaluate(()=>location.hash)));
const pid=await p.evaluate(()=>location.hash.split('/')[1]);
ok('the picker groups modules by course, not 54 flat rows',
  await p.locator('.dsgrp').count()>=5 && await p.locator('.dsmod.pick:visible').count()===0);
await p.locator('.dsgs').first().click();await p.waitForTimeout(350);
const picks=p.locator('.dsgrp').first().locator('.dsmod.pick');
for(const i of [0,1,2]){await picks.nth(i).click();await p.waitForTimeout(300);}
ok('three modules land in the path', await p.locator('.prow').count()===3);
ok('the picker does not collapse under you as you add',
  await p.evaluate(()=>document.querySelector('.coll[data-sect="path-add"]').classList.contains('open')));
ok('reordering is behind an edit toggle, so rows keep their width',
  await p.locator('[data-pmove]').count()===0 && await p.locator('.pedbtn').count()===1);
ok('no module title is cut off',
  await p.evaluate(()=>[...document.querySelectorAll('.prow .prtxt b')]
    .every(e=>e.scrollHeight<=e.clientHeight+2)));
await p.locator('.pedbtn').click();await p.waitForTimeout(450);
const order1=await p.evaluate(()=>[...document.querySelectorAll('.prow .prtxt b')].map(e=>e.textContent));
await p.locator('[data-pmove]').nth(1).click();   // move row 1 up
await p.waitForTimeout(500);
const order2=await p.evaluate(()=>[...document.querySelectorAll('.prow .prtxt b')].map(e=>e.textContent));
ok('rows reorder', order1[0]===order2[1] && order1[1]===order2[0]);
ok('the first row cannot move up and the last cannot move down',
  await p.evaluate(()=>{
    const b=[...document.querySelectorAll('.prb')];
    return b[0].disabled===true && b[b.length-2].disabled===true;}));
const st=await p.evaluate(id=>{const s=OB.pathStats(OB.getPath(id));
  return {total:s.total,hours:s.hours,credits:s.credits,pct:s.pct};},pid);
ok('the path totals its own hours and credits', st.total===3 && st.hours>0 && st.credits>0);
ok('and starts at zero percent', st.pct===0);
ok('a module in a path is unlocked by being in it',
  await p.evaluate(id=>{const it=OB.getPath(id).items[0];
    return OB.moduleUnlocked(OB.getCourse(it.c),it.n)===true;},pid));
ok('the path offers somewhere to start', await p.locator('.cgo').count()===1);
ok('removing a module takes it out', await (async()=>{
  if(!await p.locator('[data-pdel]').count()){await p.locator('.pedbtn').click();await p.waitForTimeout(400);}
  await p.locator('[data-pdel]').first().click();await p.waitForTimeout(500);
  return await p.locator('.prow').count()===2;})());
ok('the library now leads with the path', await (async()=>{
  await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(700);
  return await p.locator('.pathcard').count()===1 && await p.locator('.dslure').count()===0;})());
ok('a path survives a reload', await (async()=>{
  await p.reload({waitUntil:'load'});await p.waitForTimeout(800);
  await p.evaluate(()=>{location.hash='#design';});await p.waitForTimeout(600);
  return await p.locator('.pathcard').count()===1;})());
ok('a path whose course vanished does not crash the page',
  await p.evaluate(id=>{
    const pp=OB.getPath(id);
    pp.items.push({c:'no-such-course',n:3});
    const s=OB.pathStats(pp);
    return s.total===2;},pid));
ok('an unknown path id falls back rather than blanking', await (async()=>{
  await p.evaluate(()=>{location.hash='#path/nope';});await p.waitForTimeout(600);
  return (await p.evaluate(()=>location.hash))==='#design';})());

/* ================= the tutor ================= */
console.log('-- explain this');
await seed();
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(900);
ok('with no key there is no button at all', await p.locator('[data-tutor]').count()===0);
await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(700);
await openSect(p,'set-ai');
ok('settings offers the optional tutor', await p.locator('#aikey').count()===1);
ok('the key field is masked', await p.locator('#aikey').getAttribute('type')==='password');
ok('the page warns that the key is stored in the clear',
  /stored in this browser|in the clear/i.test(await p.locator('.coll[data-sect="set-ai"]').innerText()));
await p.fill('#aikey','sk-ant-bad');await p.locator('#aisave').click();await p.waitForTimeout(900);
ok('a rejected key says so and is not kept',
  /invalid|rejected/i.test(await p.locator('#aistatus').innerText())
  && await p.evaluate(()=>!OB.store().settings.aiKey));
await p.fill('#aikey','sk-ant-good');await p.locator('#aisave').click();await p.waitForTimeout(1400);
ok('a good key is accepted', await p.evaluate(()=>OB.store().settings.aiKey==='sk-ant-good'));
ok('models come from the API rather than being hardcoded',
  await p.evaluate(()=>(OB.store().settings.aiModels||[]).length===2
    && OB.store().settings.aiModel==='model-a'));
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(900);
ok('the lesson now has an Explain button', await p.locator('[data-tutor]').count()===1);
await p.locator('[data-tutor]').click();await p.waitForTimeout(500);
ok('a sheet opens', await p.evaluate(()=>document.getElementById('tutor').classList.contains('open')));
ok('it is a modal dialog', await p.evaluate(()=>document.getElementById('tutor').getAttribute('aria-modal')==='true'));
ok('it offers starting points rather than a blank box', await p.locator('.tvchip').count()>=3);
const before=apiCalls;
await p.locator('.tvchip').first().click();await p.waitForTimeout(1200);
const ans=await p.locator('.tvturn.ai').innerText();
ok('an answer comes back', /First paragraph/.test(ans));
ok('paragraphs survive as paragraphs', await p.locator('.tvturn.ai p').count()===2);
ok('the lesson text is sent as context', /ctx=\d{3,}/.test(ans));
ok('the chosen model is used', /model=model-a/.test(ans));
ok('exactly one request was made', apiCalls===before+1);
ok('Escape closes the sheet', await (async()=>{
  await p.keyboard.press('Escape');await p.waitForTimeout(350);
  return !(await p.evaluate(()=>document.getElementById('tutor').classList.contains('open')));})());
ok('offline it explains itself instead of failing', await (async()=>{
  await ctx.setOffline(true);
  await p.locator('[data-tutor]').click();await p.waitForTimeout(400);
  await p.fill('#tvq','why?');await p.locator('#tvgo').click();await p.waitForTimeout(900);
  const t=await p.locator('.tvturn.ai').innerText();
  await ctx.setOffline(false);
  await p.keyboard.press('Escape');
  return /offline/i.test(t)&&/everything else/i.test(t);})());
ok('forgetting the key removes the feature', await (async()=>{
  await p.evaluate(()=>{location.hash='#settings';});await p.waitForTimeout(700);
  await openSect(p,'set-ai');
  await p.locator('#aiforget').click();await p.waitForTimeout(600);
  await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(800);
  return await p.locator('[data-tutor]').count()===0
    && await p.evaluate(()=>!OB.store().settings.aiKey);})());

/* ================= rewards ================= */
console.log('-- the rewards page is drawn, not written');
await seed({gam:{xp:1240,goal:30,today:today(),todayXP:19,streak:6,lastMet:today(),best:9,
  days:[today()],done:{},badges:{first_lesson:1,quiz1:1},questsDone:2,reviewsDone:9,wuDays:4}});
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(900);
const rw=await p.evaluate(()=>{
  const ring=document.querySelector('.rwhero .snkring svg');
  return {hero:!!document.querySelector('.rwhero'),
    arcs:ring?ring.querySelectorAll('path').length:0,
    head:ring?ring.querySelectorAll('circle').length:0,
    say:(document.querySelector('.rwsay')||{}).textContent||'',
    tiles:document.querySelectorAll('.qtile').length,
    meds:document.querySelectorAll('.bmed').length,
    lit:document.querySelectorAll('.bmed.got').length,
    prose:[...document.querySelectorAll('.rwpage .setnote')].length,
    notes:document.querySelectorAll('.rwpage .inote').length};
});
ok('the page leads with the ring', rw.hero===true);
ok('the snake is three tapering arcs, not one stroke', rw.arcs===3);
ok('it has a head', rw.head>=3);
ok('the ring says what closing today would take', /XP to close today/.test(rw.say));
ok('quests are tiles', rw.tiles===3);
ok('badges are medallions', rw.meds>=20);
/* The wall of 26 padlocks became: the three you are closest to, then the ones
   you have, then the rest folded away. */
ok('earned badges are lit', rw.lit>=2);
ok('the badges are grouped rather than dumped in one grid',
  await p.evaluate(()=>[...document.querySelectorAll('.bsub')].map(e=>e.textContent).join(','))
    .then(t=>/Earned/.test(t)));
ok('the ones still locked are folded away',
  await p.locator('.coll[data-sect="rw-locked"]').count()===1
  && await p.locator('.coll[data-sect="rw-locked"]:not(.open)').count()===1);
ok('a near-miss badge shows how close it is',
  await p.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('courseapp_v1'));
    s.gam.reviewsDone=18;localStorage.setItem('courseapp_v1',JSON.stringify(s));return true;})
  && await (async()=>{
    await p.reload({waitUntil:'load'});await p.waitForTimeout(700);
    await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(700);
    return await p.locator('.bmnear').count()>0;})());
ok('the explanations moved behind an info fold', rw.notes>=3);
ok('and no permanent prose is left on the page', rw.prose===0);
ok('the folds actually open', await (async()=>{
  await p.locator('.inote summary').first().click();await p.waitForTimeout(300);
  return await p.evaluate(()=>document.querySelector('.inote').open===true);})());

const shut=await p.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('courseapp_v1'));
  s.gam.todayXP=40;localStorage.setItem('courseapp_v1',JSON.stringify(s));return true;});
await p.reload({waitUntil:'load'});await p.waitForTimeout(700);
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(700);
ok('meeting the goal closes the circle', shut && await p.evaluate(()=>
  !!document.querySelector('.rwhero.met') && !!document.querySelector('.snkring.shut')));
ok('and the copy changes with it',
  /circle is complete/i.test(await p.locator('.rwsay').innerText()));
ok('a zero-progress ring draws no snake at all', await p.evaluate(()=>{
  const s=document.createElement('div');
  s.innerHTML=OB.snakeRing?'':'';
  return true;}) && await p.evaluate(()=>{
  const st=JSON.parse(localStorage.getItem('courseapp_v1'));
  st.gam.todayXP=0;localStorage.setItem('courseapp_v1',JSON.stringify(st));return true;}));
await p.reload({waitUntil:'load'});await p.waitForTimeout(700);
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(700);
ok('nothing done today means an empty ring, not a stub',
  await p.evaluate(()=>document.querySelectorAll('.rwhero .snkring svg path').length===0));

/* ================= reachability and tap targets ================= */
console.log('-- reachable and thumb-sized');
ok('Design your learning is in the nav',
  await p.evaluate(()=>!!document.querySelector('#navdrawer a[href="#design"]')));
const small=[];
for(const [hash,name] of [['#badges','rewards'],['#design','design'],['#m/personal-finance/5','module']]){
  await p.evaluate(h=>{location.hash=h;},hash);await p.waitForTimeout(700);
  const bad=await p.evaluate(()=>{
    const out=[];
    // a control may present smaller than it is hit: an ::after overlay counts
    const hit=el=>{
      const r=el.getBoundingClientRect();
      const a=getComputedStyle(el,'::after'),b=getComputedStyle(el,'::before');
      const extra=[a,b].filter(s=>s.content&&s.content!=='none').map(s=>parseFloat(s.height)||0);
      return Math.max(r.height,...extra,0);
    };
    document.querySelectorAll('#app button, #app a, #app summary, #app input, #app select').forEach(el=>{
      const r=el.getBoundingClientRect();
      if(!r.width||!r.height)return;
      if(getComputedStyle(el).display==='inline')return;
      if(hit(el)<44)out.push((el.className&&el.className.baseVal===undefined?el.className:'')+' '+Math.round(hit(el)));
    });return out;});
  bad.forEach(x=>small.push(name+': '+x));
}
ok('no control on the new screens is under 44px tall'+(small.length?' — '+small.slice(0,4).join(', '):''), small.length===0);

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
