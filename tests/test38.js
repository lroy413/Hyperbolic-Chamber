/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test38 — the glossary as a reference work, and one row instead of fifteen.

   The glossary was 186 terms in a single flat list: thirteen screens, no index,
   no search, no way back. The row work is the opposite kind of change — nothing
   should look different, so what is tested is that the duplication is gone and
   that the shared base did not quietly take over from the variants. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10);};
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});
await p.evaluate(([cs,t])=>{
  const st={imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},progress:{},
    paths:[{id:'pdemo',name:'Money in a fortnight',created:t,items:[
      {c:'personal-finance',n:1},{c:'mkt-2-statements',n:2}]}],
    gam:{xp:900,goal:30,today:t,todayXP:12,streak:4,lastMet:t,days:{},done:{},badges:{}}};
  st.progress['personal-finance']={passed:{m1:1},lastPage:'m2-l1'};
  localStorage.setItem('courseapp_v1',JSON.stringify(st));},[FULLCAT,d(0)]);
await p.reload({waitUntil:'load'});await p.waitForTimeout(900);

/* ================= the glossary ================= */
console.log('-- the glossary is navigable, not just long');
const CID='audio-1-acoustics';   // the biggest one: 186 raw terms
await p.evaluate(id=>{location.hash='#c/'+id+'/glossary';},CID);await p.waitForTimeout(1100);
const g0=await p.evaluate(()=>({
  terms:document.querySelectorAll('.gterm').length,
  groups:document.querySelectorAll('.gletter').length,
  az:document.querySelectorAll('.azb').length,
  search:!!document.getElementById('glosssearch'),
  count:document.getElementById('glosscount').textContent,
  screens:+(document.body.scrollHeight/innerHeight).toFixed(2)}));
ok('it has a search field', g0.search===true);
ok('terms are grouped by letter ('+g0.groups+' groups)', g0.groups>=15);
ok('there is a jump rail with one button per letter present', g0.az===g0.groups);
ok('it says how many terms there are', /^\d+ terms across \d+ modules$/.test(g0.count));
ok('duplicate definitions of the same term are collapsed',
  await p.evaluate(()=>{
    const t=[...document.querySelectorAll('.gterm dt')].map(e=>e.firstChild.nodeValue.trim().toLowerCase());
    return new Set(t).size===t.length;}));

console.log('-- searching narrows it');
await p.fill('#glosssearch','reverb');await p.waitForTimeout(400);
const g1=await p.evaluate(()=>({
  shown:document.querySelectorAll('.gterm:not([hidden])').length,
  groups:document.querySelectorAll('.gletter:not([hidden])').length,
  off:document.querySelectorAll('.azb.off').length,
  count:document.getElementById('glosscount').textContent,
  screens:+(document.body.scrollHeight/innerHeight).toFixed(2)}));
ok('it filters to the matches', g1.shown>0 && g1.shown<g0.terms);
ok('empty letter groups disappear with them', g1.groups<g0.groups);
ok('and the rail dims the letters with nothing in them', g1.off>0);
ok('the count says how many of how many', /^\d+ of \d+ terms$/.test(g1.count));
ok('the page collapses from '+g0.screens+' screens to '+g1.screens, g1.screens<g0.screens/3);
ok('it matches definitions, not only terms', await (async()=>{
  await p.fill('#glosssearch','decibel');await p.waitForTimeout(350);
  return await p.evaluate(()=>[...document.querySelectorAll('.gterm:not([hidden]) dt')]
    .some(e=>!/decibel/i.test(e.textContent)));})());
await p.fill('#glosssearch','qqzzxx');await p.waitForTimeout(350);
ok('a search with no matches says so', await p.evaluate(()=>
  !document.getElementById('glossnone').hidden
  && document.querySelectorAll('.gterm:not([hidden])').length===0));
await p.fill('#glosssearch','');await p.waitForTimeout(400);
ok('clearing it puts everything back', await p.evaluate(()=>
  document.querySelectorAll('.gterm:not([hidden])').length)===g0.terms);

console.log('-- the jump rail works and is thumb-sized');
ok('no letter button is under 44px', await p.evaluate(()=>
  [...document.querySelectorAll('.azb')].every(e=>{
    const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44;})));
ok('tapping a letter lands on that letter', await (async()=>{
  await p.locator('.azb[data-az="S"]').click();await p.waitForTimeout(900);
  return await p.evaluate(()=>{
    const bar=document.querySelector('.topbar').getBoundingClientRect().height;
    const first=[...document.querySelectorAll('.glh')].find(h=>h.getBoundingClientRect().top>=bar-3);
    return first&&first.textContent.trim()==='S';});})());
ok('the letter headings stay put while you read under them', await p.evaluate(()=>
  getComputedStyle(document.querySelector('.glh')).position==='sticky'));
ok('the heading sits below the top bar rather than under it', await p.evaluate(()=>{
  const top=getComputedStyle(document.querySelector('.glh')).top;
  return parseInt(top,10)>40;}));
ok('the glossary takes the course colour like every other course page',
  await p.evaluate(()=>!!document.querySelector('.glosswrap.oncourse')
    && !!getComputedStyle(document.querySelector('.glosswrap')).getPropertyValue('--gk')));

/* ================= one row ================= */
console.log('-- one row primitive, not fifteen');
const ROWS=['alertrow','trow','pathcard','dsmod','prow','pprow','mstrow','crow',
  'dslure','ccard','savedrow','qtile','trm','wucard-home'];
const seen={},lonely=[];
for(const [hash,names] of [['',['crow','qtile','wucard-home','alertrow']],
                           ['#library',['pathcard','trow']],
                           ['#design',['pathcard','dsmod']],
                           ['#path/pdemo',['prow','dsmod']],
                           ['#m/personal-finance/5',['pprow','ccard']],
                           ['#track/markets',['trow']],
                           ['#c/personal-finance',['ccard']],
                           ['#badges',['mstrow','qtile','trm']]]){
  await p.evaluate(h=>{location.hash=h;},hash);await p.waitForTimeout(700);
  for(const n of names){
    const r=await p.evaluate(cls=>{
      const els=[...document.querySelectorAll('.'+cls)];
      return {n:els.length,withRow:els.filter(e=>e.classList.contains('row')).length};
    },n);
    if(r.n){seen[n]=(seen[n]||0)+r.n;if(r.withRow!==r.n)lonely.push(n);}
  }
}
ok('the row variants are on screen to be checked ('+Object.keys(seen).length+' of '+ROWS.length+')',
  Object.keys(seen).length>=9);
ok('every one of them is built on the shared row'+(lonely.length?' — '+[...new Set(lonely)].join(', '):''),
  lonely.length===0);
ok('and they share one set of geometry', await p.evaluate(()=>{
  const r=[...document.querySelectorAll('.row')].slice(0,20).map(e=>{
    const s=getComputedStyle(e);return s.display+'|'+s.alignItems;});
  return r.length>0 && new Set(r).size===1;}));
/* the base must not have quietly overridden what makes each variant itself */
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(700);
ok('a variant can still differ from the base where it means to', await p.evaluate(()=>{
  const lure=document.querySelector('.dslure')||document.querySelector('.pathcard');
  if(!lure)return false;
  const plain=getComputedStyle(document.querySelector('.row:not(.dslure):not(.pathcard)'));
  const s=getComputedStyle(lure);
  return s.borderRadius!==''&&(s.backgroundImage!==plain.backgroundImage||s.borderColor!==plain.borderColor);
}));
ok('no visible row collapsed to nothing', await p.evaluate(()=>
  [...document.querySelectorAll('.row')]
    .filter(e=>e.offsetParent!==null)
    .every(e=>e.getBoundingClientRect().height>=40)));

/* ================= nothing regressed visually ================= */
console.log('-- the desktop rail survived the refactor');
const ctx2=await b.newContext({viewport:{width:1280,height:900}});
await ctx2.addInitScript('window.OBOROS_NO_QUESTS=1;');
const p2=await ctx2.newPage();
await p2.goto(URL,{waitUntil:'load'});
await p2.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({
  imported:cs,settings:{theme:'dark',palette:'aurora',scale:1}}));},FULLCAT);
await p2.reload({waitUntil:'load'});await p2.waitForTimeout(900);
await p2.evaluate(()=>{location.hash='#c/app-builder/m1-l2';});await p2.waitForTimeout(800);
ok('the contents rail still shows on a wide screen', await p2.evaluate(()=>{
  const e=document.querySelector('.readrail');
  return !!e && getComputedStyle(e).display==='block' && getComputedStyle(e).position==='sticky';}));
await ctx2.close();

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
