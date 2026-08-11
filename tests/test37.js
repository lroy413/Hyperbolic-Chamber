/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test37 — the design system, as a system.

   These are the rules that no per-screen review catches, because each one is only
   visible when you look at every screen at once: one icon family, one progress
   ring, one accent per page, and motion that switches itself off when asked. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10);};
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
const parse=s=>{const m=/rgba?\(([^)]+)\)/.exec(s);return m?m[1].split(',').map(parseFloat):null;};
const ratio=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};

/* Emoji, as opposed to text and punctuation. Arrows, ticks, chevrons and quotes
   are typography; a pictograph is a picture and does not belong in an app with a
   drawn icon set. */
const EMOJI=/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}]?[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE0F}]/u;
/* ✓ and ✗ mark a right and wrong answer inline with the sentence — that is
   typography, like an arrow or a bullet, not an illustration. */
const ALLOWED=/^[←-⇿✓✔✗✘✕✖×›‹▾▴▼▲•…‘’“”–—·\s]*$/;

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});
await p.evaluate(([cs,t,days])=>{
  const st={imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},progress:{},
    paths:[{id:'pdemo',name:'Money in a fortnight',created:t,items:[
      {c:'personal-finance',n:1},{c:'personal-finance',n:3},{c:'mkt-2-statements',n:2}]}],
    gam:{xp:1240,goal:30,today:t,todayXP:21,streak:6,lastMet:t,best:9,days:days,
      done:{'personal-finance/m1-l1':1},badges:{},questsDone:2,reviewsDone:18,wuDays:6}};
  st.progress['personal-finance']={passed:{m1:1,m2:1},lastPage:'m3-l1'};
  localStorage.setItem('courseapp_v1',JSON.stringify(st));},
  [FULLCAT,d(0),[d(0),d(-1),d(-2),d(-3)]]);
await p.reload({waitUntil:'load'});await p.waitForTimeout(900);

const ROUTES=[['home',''],['library','#library'],['store','#library/store'],['design','#design'],
  ['path','#path/pdemo'],['module','#m/personal-finance/5'],['track','#track/markets'],
  ['course','#c/personal-finance'],['lesson','#c/personal-finance/m1-l1'],
  ['quiz','#c/personal-finance/m1-quiz'],['rewards','#badges'],['warmup','#warmup'],
  ['review','#review'],['settings','#settings'],['transcript','#transcript']];

/* ---------------- one icon family ---------------- */
console.log('-- one icon family, no emoji');
const stray=[];let glyphs=0;
for(const [name,hash] of ROUTES){
  await p.evaluate(h=>{location.hash=h;},hash);await p.waitForTimeout(520);
  const r=await p.evaluate(()=>{
    const bad=[];
    // only leaf text nodes, so a container's concatenated text is not blamed twice
    const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walk.nextNode())){
      const t=n.nodeValue;
      if(!t||!t.trim())continue;
      if(n.parentElement&&n.parentElement.closest('#figview,#tutor'))continue;
      bad.push(t.trim().slice(0,40));
    }
    return {texts:bad,glyphs:document.querySelectorAll('svg.gi').length,
      strokes:[...document.querySelectorAll('svg.gi')].map(e=>e.getAttribute('stroke-width'))};
  });
  glyphs+=r.glyphs;
  r.texts.forEach(t=>{
    const rest=t.replace(/[\w\d\s.,;:!?'"()\[\]{}/@#$%&*+=<>|~`^\\-]/g,'');
    if(rest&&!ALLOWED.test(rest)&&EMOJI.test(rest))stray.push(name+': '+t);
  });
  const oddStroke=r.strokes.filter(w=>w!=='1.7');
  if(oddStroke.length)stray.push(name+': stroke '+oddStroke[0]);
}
ok('every screen draws its icons from the one set ('+glyphs+' glyphs seen)', glyphs>40);
ok('no emoji survive anywhere'+(stray.length?' — '+stray.slice(0,4).join(' | '):''), stray.length===0);

/* ---------------- one progress ring ---------------- */
console.log('-- one progress ring');
const rings=await p.evaluate(async()=>{
  const seen={};
  for(const h of ['','#library','#design','#path/pdemo','#track/markets','#c/personal-finance','#badges']){
    location.hash=h;await new Promise(r=>setTimeout(r,420));
    document.querySelectorAll('.snkring').forEach(()=>{seen.snk=(seen.snk||0)+1;});
    // anything still painting a ring the old way
    [...document.querySelectorAll('*')].forEach(e=>{
      const bg=getComputedStyle(e).backgroundImage||'';
      if(bg.indexOf('conic-gradient')>-1)seen.conic=(seen.conic||0)+1;
    });
  }
  return seen;
});
ok('the snake ring is used across the app ('+(rings.snk||0)+' instances)', (rings.snk||0)>=12);
ok('and nothing paints a ring the old way', !rings.conic);
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(700);
ok('a ring at 0% draws no snake', await p.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('courseapp_v1'));s.gam.todayXP=0;
  localStorage.setItem('courseapp_v1',JSON.stringify(s));return true;}));
await p.reload({waitUntil:'load'});await p.waitForTimeout(700);
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(700);
ok('an empty ring is a track and nothing else',
  await p.evaluate(()=>document.querySelectorAll('.rwhero .snkring > svg path').length===0));
ok('the icon inside a ring is not itself animated',
  await p.evaluate(()=>{
    const g=document.querySelector('.qtile .snkin svg.gi path');
    return !g||getComputedStyle(g).animationName==='none';}));

/* ---------------- one accent per page ---------------- */
console.log('-- a course page is one colour, and that colour is legible');
for(const c of FULLCAT){
  await p.evaluate(id=>{location.hash='#c/'+id;},c.id);await p.waitForTimeout(520);
  const r=await p.evaluate(()=>{
    const btn=document.querySelector('.cgobtn');
    if(!btn)return null;
    const s=getComputedStyle(btn);
    return {bg:s.backgroundColor,fg:s.color,
      cta:getComputedStyle(document.querySelector('.wrap')).getPropertyValue('--cta').trim()};
  });
  if(!r){ok(c.id+': has a primary action',false);continue;}
  ok(c.id+': its button is its own colour and carries white at '+ratio(parse(r.fg),parse(r.bg)).toFixed(2)+':1',
    ratio(parse(r.fg),parse(r.bg))>=4.5 && !!r.cta);
}
await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(600);
ok('secondary actions on a course page are quiet, not a row of coloured buttons',
  await p.evaluate(()=>{
    const cta=getComputedStyle(document.querySelector('.cgobtn')).backgroundColor;
    const others=[...document.querySelectorAll('.modcard .macmain')]
      .map(e=>getComputedStyle(e).backgroundColor);
    return others.every(c=>c!==cta);
  }));
ok('module titles are no longer cut off by a button',
  await p.evaluate(()=>[...document.querySelectorAll('.macmeta b')]
    .every(e=>e.scrollHeight<=e.clientHeight+2)));

/* ---------------- reachable primary action ---------------- */
console.log('-- the primary action comes back within reach');
ok('nothing is stuck to the bottom before you scroll',
  await p.evaluate(()=>{const e=document.getElementById('stickygo');return !e||!e.classList.contains('on');}));
await p.evaluate(()=>window.scrollTo({top:900,behavior:'instant'}));await p.waitForTimeout(500);
const sg=await p.evaluate(()=>{
  const e=document.getElementById('stickygo');if(!e||!e.classList.contains('on'))return null;
  const a=e.querySelector('.sgo'),btn=e.querySelector('.sgbtn'),tab=document.querySelector('.tabbar');
  return {href:a.getAttribute('href'),h:btn.getBoundingClientRect().height,
    bottom:e.getBoundingClientRect().bottom,
    tabTop:tab?tab.getBoundingClientRect().top:innerHeight,
    real:document.querySelector('.wrap .cgo').getAttribute('href')};
});
ok('once the real one scrolls away, a copy appears', !!sg);
if(sg){
  ok('it points at exactly the same place', sg.href===sg.real);
  ok('its button is thumb-sized', sg.h>=44);
  ok('and it sits above the tab bar rather than over it', sg.bottom<=sg.tabTop+1);
}
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(700);
ok('it disappears on screens with no primary action',
  await p.evaluate(()=>!document.getElementById('stickygo').classList.contains('on')));

/* ---------------- reading position ---------------- */
console.log('-- how far through a lesson you are');
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(900);
const rb=async()=>p.evaluate(()=>{const e=document.getElementById('readbar');
  return e?{on:e.classList.contains('on'),w:e.firstChild.style.width,top:parseInt(e.style.top,10)}:null;});
const r0=await rb();
ok('a long lesson shows a position line', !!r0&&r0.on===true&&r0.w==='0%');
ok('it sits under the top bar, not over it', r0.top>40);
await p.evaluate(()=>window.scrollTo({top:999999,behavior:'instant'}));await p.waitForTimeout(400);
ok('it reaches the end when you do', (await rb()).w==='100%');
await p.evaluate(()=>{location.hash='#review';});await p.waitForTimeout(600);
ok('short screens do not get one', (await rb())===null);

/* ---------------- navigation is instant ---------------- */
console.log('-- navigation jumps rather than glides');
await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(700);
await p.evaluate(()=>window.scrollTo({top:1200,behavior:'instant'}));await p.waitForTimeout(300);
await p.evaluate(()=>{location.hash='#library';});
await p.waitForTimeout(120);
ok('changing page is at the top immediately, not two seconds later',
  await p.evaluate(()=>window.scrollY)<30);
ok('and anchors keep their smooth scroll',
  await p.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior==='smooth'));

/* ---------------- motion respects the setting ---------------- */
console.log('-- motion switches itself off when asked');
const ctx2=await b.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});
await ctx2.addInitScript('window.OBOROS_NO_QUESTS=1;');
const p2=await ctx2.newPage();
await p2.goto(URL,{waitUntil:'load'});
await p2.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({
  imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},
  gam:{xp:900,goal:30,today:new Date().toISOString().slice(0,10),todayXP:15}}));},FULLCAT);
await p2.reload({waitUntil:'load'});await p2.waitForTimeout(800);
await p2.evaluate(()=>{location.hash='#badges';});await p2.waitForTimeout(700);
ok('the ring does not animate under reduced motion',
  await p2.evaluate(()=>{
    const el=document.querySelector('.rwhero .snkring > svg path');
    return !el||getComputedStyle(el).animationName==='none';}));
ok('and page scrolling is instant there too',
  await p2.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior==='auto'));
await ctx2.close();

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
