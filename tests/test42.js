/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test42 — read time, and finding a passage again.

   Two things a study app is expected to have and this one did not: an honest
   answer to "how long is this lesson", and any way at all to find the bit about
   X other than opening modules until you hit it.

   The read-time tests are mostly about *not lying*: the number has to come from
   the lesson's own words, has to move when the lesson gets longer, and must not
   be presented as the same quantity as the module's study hours. The search
   tests are about what the index contains — including what it must NOT contain,
   since a naive walk of a figure indexes its colour codes. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json')
  .map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
let pass=0,fail=0;
function ok(n,c,extra){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n+(!c&&extra?'  → '+extra:''));}

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});
await p.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({imported:cs,
  settings:{theme:'dark',palette:'aurora',scale:1},
  progress:{'personal-finance':{passed:{m1:1,m2:1},lastPage:'m1-l1'}}}));},FULLCAT);
await p.reload({waitUntil:'load'});await p.waitForTimeout(900);

/* ---------------- read time is measured, not typed ---------------- */
console.log('-- how long a lesson takes');
const est=await p.evaluate(()=>{
  const f=window.OB.lessonMinutes;
  const short={title:'x',blocks:[{t:'p',html:'One short sentence about money.'}]};
  const long={title:'y',blocks:[{t:'p',html:new Array(1800).fill('word').join(' ')}]};
  const words=new Array(540).fill('word').join(' ');
  const withFigs={title:'z',blocks:[{t:'p',html:words},
    {t:'image',svg:'<svg></svg>'},{t:'kcheck',q:'q',options:['a','b'],answer:0,explain:'e'}]};
  const plain={title:'z2',blocks:[{t:'p',html:words}]};
  return {short:f(short),long:f(long),figs:f(withFigs),plain:f(plain),
    override:f({title:'o',minutes:42,blocks:[{t:'p',html:'tiny'}]})};});
ok('a one-line lesson still reads as a couple of minutes',est.short===2,String(est.short));
ok('1800 words is about ten minutes',est.long>=9&&est.long<=11,String(est.long));
ok('a figure and a check cost time that is not words',est.figs>est.plain,est.figs+' vs '+est.plain);
ok('an author can override it',est.override===42,String(est.override));

const real=await p.evaluate(()=>{
  const c=window.OB.getCourse('personal-finance');
  const mins=c.modules[0].lessons.map(window.OB.lessonMinutes);
  return {mins:mins,sum:mins.reduce((a,x)=>a+x,0),
    modRead:window.OB.moduleReadMinutes(c.modules[0]),
    modHours:window.OB.moduleHours(c.modules[0])};});
ok('every real lesson gets a number',real.mins.every(m=>m>=2&&m<60),JSON.stringify(real.mins));
ok('the module total is the sum of its lessons',real.modRead===real.sum,
  real.modRead+' vs '+real.sum);
ok('reading time and study hours are not the same claim',
  real.modRead<real.modHours*60,real.modRead+'min vs '+real.modHours+'h');

console.log('-- and it appears where the decision is made');
await p.evaluate(()=>{location.hash='#m/personal-finance/1';});await p.waitForTimeout(700);
const mins=await p.locator('.accmin').allInnerTexts();
ok('the module lists a time per lesson',mins.length>=3&&mins.every(t=>/^\d+ min$/.test(t)),mins.join(','));
ok('the hero states the reading time',/min read|of reading/.test(await p.locator('.cheroread').innerText()));
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(700);
ok('the lesson header carries it too',/\d+ min read/.test(await p.locator('.phpos').innerText()));
ok('it is a hint, not a headline',
  await p.evaluate(()=>{const e=document.querySelector('.posmin');const cs=getComputedStyle(e);
    return parseFloat(cs.fontSize)<=15&&cs.fontWeight<='700';}));

/* ---------------- search ---------------- */
console.log('-- finding a passage again');
await p.evaluate(()=>{location.hash='#c/personal-finance/search';});await p.waitForTimeout(700);
ok('the page exists and takes a query',await p.locator('#csearch').count()===1);
ok('an empty field explains itself rather than showing nothing',
  await p.locator('.srhint').count()===1);
await p.fill('#csearch','a');await p.waitForTimeout(300);
ok('one letter does not fire a search over the whole course',
  await p.locator('.srhint').count()===1);
await p.fill('#csearch','compounding');await p.waitForTimeout(350);
const res=await p.evaluate(()=>({groups:document.querySelectorAll('.srgroup').length,
  hits:document.querySelectorAll('.srhit').length,
  marks:document.querySelectorAll('.srtext mark').length,
  count:(document.querySelector('.srcount')||{}).textContent||''}));
ok('it finds the word in more than one lesson',res.groups>=2,JSON.stringify(res));
ok('it highlights what matched',res.marks>=res.hits,JSON.stringify(res));
ok('it says how many and where',/match/i.test(res.count)&&/lesson/i.test(res.count),res.count);
ok('results are grouped by lesson, not one flat list',
  await p.evaluate(()=>[...document.querySelectorAll('.srgroup')].every(g=>g.querySelector('.srhead')&&g.querySelector('.srhit'))));
ok('a result links to the page it is on',
  /#c\/personal-finance\/m\d+-l\d+$/.test(await p.locator('.srhit').first().getAttribute('href')));

console.log('-- what the index does and does not contain');
const kinds=await p.evaluate(()=>{
  const c=window.OB.getCourse('personal-finance');
  const ix=window.OB.courseIndex(c);
  const k={};ix.forEach(e=>k[e.kind]=(k[e.kind]||0)+1);
  const junk=ix.filter(e=>/#[0-9a-f]{6}|viewBox|stroke-width|font-weight/i.test(e.text));
  return {kinds:k,total:ix.length,junk:junk.length,sample:junk.slice(0,2).map(e=>e.text.slice(0,60))};});
ok('lesson titles, headings, terms and figures are all indexed',
  ['Lesson title','Heading','Term','Figure'].every(k=>kinds.kinds[k]>0),JSON.stringify(kinds.kinds));
ok('no colour codes or SVG attributes leaked into it',kinds.junk===0,JSON.stringify(kinds.sample));
const fig=await p.evaluate(()=>{
  const c=window.OB.getCourse('personal-finance');
  return window.OB.courseIndex(c).filter(e=>e.kind==='Figure').slice(0,3).map(e=>e.text.slice(0,70));});
ok('a figure is indexed by what it says',fig.length>0&&fig.every(t=>/[a-z]{4,}\s+[a-z]{4,}/i.test(t)),
  JSON.stringify(fig));

console.log('-- it behaves when there is nothing to find');
await p.fill('#csearch','qqzzxx');await p.waitForTimeout(320);
ok('a miss says so plainly',await p.locator('.glossnone').count()===1);
ok('and no stale results are left behind',await p.locator('.srgroup').count()===0);
await p.fill('#csearch','emergency fund');await p.waitForTimeout(320);
ok('two words means both words',await p.locator('.srgroup').count()>0);
await p.fill('#csearch','EMERGENCY');await p.waitForTimeout(320);
ok('case does not matter',await p.locator('.srgroup').count()>0);

console.log('-- locked lessons are admitted, not hidden');
const locked=await p.evaluate(async()=>{
  document.getElementById('csearch').value='retirement';
  document.getElementById('csearch').dispatchEvent(new Event('input'));
  await new Promise(r=>setTimeout(r,300));
  return {lockHeads:document.querySelectorAll('.srhead.lock').length,
    soloLinks:document.querySelectorAll('.srlock').length};});
ok('a match in a locked module still shows',locked.lockHeads>0,JSON.stringify(locked));
ok('and offers the honest route to it',locked.soloLinks===locked.lockHeads,JSON.stringify(locked));

console.log('-- you can get to it from where you are reading');
await p.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p.waitForTimeout(600);
ok('a lesson has a Find button',await p.locator('.findb').count()===1);
ok('it is a full-sized target',
  await p.evaluate(()=>document.querySelector('.findb').getBoundingClientRect().height>=44));
await p.locator('.findb').click();await p.waitForTimeout(500);
ok('and it lands on the search page',
  await p.evaluate(()=>location.hash)==='#c/personal-finance/search'&&
  await p.locator('#csearch').count()===1);

const desk=await b.newContext({viewport:{width:1280,height:900}});
await desk.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
const p2=await desk.newPage();
await p2.goto(URL,{waitUntil:'load'});
await p2.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({imported:cs,
  settings:{theme:'dark',palette:'aurora',scale:1}}));},FULLCAT);
await p2.reload({waitUntil:'load'});await p2.waitForTimeout(900);
await p2.evaluate(()=>{location.hash='#c/personal-finance/m1-l1';});await p2.waitForTimeout(700);
ok('the desktop rail offers it as well',await p2.locator('.rrfind').count()===1);
ok('and shows each lesson’s length',
  (await p2.locator('.rrmin').allInnerTexts()).every(t=>/^\d+m$/.test(t)));
await desk.close();

ok('no console errors',errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
