/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test34 — the rebuilt course landing page, the specialization order, and a
   contrast rule that no per-screen review would ever catch: four of the seven
   colour palettes could not legibly carry white text on a solid button. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
function ratio(rgbA,rgbB){
  const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
  const a=L(rgbA),b=L(rgbB);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
const parse=s=>{const m=/rgba?\(([^)]+)\)/.exec(s);return m?m[1].split(',').map(parseFloat):null;};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852}});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const seed=async(extra)=>{
  await p.evaluate(([cs,ex])=>{
    localStorage.setItem('courseapp_v1',JSON.stringify(Object.assign({
      imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},
      gam:{xp:400,goal:30,done:{},badges:{}}},ex||{})));
    location.hash='';
  },[FULLCAT,extra]);
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(800);
};
await p.goto(URL,{waitUntil:'load'});await useCat(p);

/* ---------------- the course landing page ---------------- */
console.log('-- the course page leads with the action');
await seed({progress:{'personal-finance':{passed:{m1:1,m2:1},lastPage:'m3-l1'}}});
await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(800);

const geo=await p.evaluate(()=>{
  const q=s=>document.querySelector(s);
  const y=e=>e?Math.round(e.getBoundingClientRect().top+window.scrollY):null;
  return {hero:y(q('.chero')),go:y(q('.cgo')),discl:y(q('.discl')),
    goText:(q('.cgo')||{}).textContent||'', scrollH:document.body.scrollHeight,
    vh:window.innerHeight, disclOpen:!!(q('.discl')||{}).open};
});
ok('the page opens on a cover', geo.hero!==null);
ok('the primary action is above the fold', geo.go!==null && geo.go<geo.vh);
ok('it offers Resume when there is progress', /Resume|Continue/.test(geo.goText));
ok('the disclaimer no longer sits above the action', geo.discl===null || geo.discl>geo.go);
ok('the disclaimer starts collapsed', geo.disclOpen===false);
ok('the notice is still reachable', await p.locator('.discl summary').count()===1);
ok('opening it reveals the full text', await (async()=>{
  await p.locator('.discl summary').click();await p.waitForTimeout(250);
  const t=await p.locator('.discl .dbody').innerText();
  return t.length>80;})());
ok('the page fits inside three screens', geo.scrollH/geo.vh < 3);

console.log('-- locked modules fold');
const mods=await p.evaluate(()=>({
  cards:document.querySelectorAll('.modcard').length,
  fold:!!document.querySelector('.lockfold'),
  foldText:(document.querySelector('.lockfold')||{}).textContent||''
}));
ok('only reachable modules render as cards', mods.cards<=4);
ok('the rest fold into one row', mods.fold===true);
ok('the fold says how many are hidden', /\d+ more modules/.test(mods.foldText));
ok('the fold opens', await (async()=>{
  await p.locator('.lockfold').click();await p.waitForTimeout(500);
  return await p.locator('.modcard').count()>=9;})());
ok('and the choice persists', await (async()=>{
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(700);
  await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(700);
  return await p.locator('.modcard').count()>=9;})());

console.log('-- a course not yet started');
await seed({});
await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(800);
ok('an unstarted course offers Start, not Resume',
  /Start the course|Begin/.test(await p.locator('.cgo').innerText()));
ok('and no progress strip is drawn', await p.locator('.cprog').count()===0);

/* ---------------- the specialization page ---------------- */
console.log('-- the specialization page leads with the courses');
await p.evaluate(()=>{location.hash='#track/markets';});await p.waitForTimeout(800);
const tk=await p.evaluate(()=>{
  const y=s=>{const e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().top+window.scrollY):null;};
  const open=s=>{const e=document.querySelector(s);return e?e.classList.contains('open'):null;};
  return {courses:y('.coll[data-sect="tk-courses"]'),about:y('.coll[data-sect="tk-about"]'),
    outcomes:y('.coll[data-sect="tk-outcomes"]'),
    coursesOpen:open('.coll[data-sect="tk-courses"]'),aboutOpen:open('.coll[data-sect="tk-about"]'),
    scrollH:document.body.scrollHeight,vh:window.innerHeight};
});
ok('courses come before the prose', tk.courses!==null && tk.about!==null && tk.courses<tk.about);
ok('and before the outcomes', tk.outcomes!==null && tk.courses<tk.outcomes);
ok('the course list is open by default', tk.coursesOpen===true);
ok('the essay is collapsed by default', tk.aboutOpen===false);
ok('the page fits inside two screens', tk.scrollH/tk.vh < 2.2);

/* ---------------- every palette can carry a solid button ---------------- */
console.log('-- solid buttons stay legible in every palette');
const PALETTES=['aurora','ember','verdant','tide','bloom','classic'];
for(const pal of PALETTES){
  for(const theme of ['dark','light']){
    await p.evaluate(([pl,th])=>{
      const s=JSON.parse(localStorage.getItem('courseapp_v1'));
      s.settings.palette=pl;s.settings.theme=th;
      localStorage.setItem('courseapp_v1',JSON.stringify(s));
    },[pal,theme]);
    await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(500);
    await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(450);
    const c=await p.evaluate(()=>{
      const el=document.querySelector('.cgobtn');if(!el)return null;
      const s=getComputedStyle(el);return {bg:s.backgroundColor,fg:s.color};
    });
    if(!c){ok(pal+'/'+theme+': button present',false);continue;}
    const r=ratio(parse(c.fg),parse(c.bg));
    ok(pal+'/'+theme+': white on the solid accent is '+r.toFixed(2)+':1', r>=4.5);
  }
}
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('courseapp_v1'));s.settings.palette='aurora';s.settings.theme='dark';localStorage.setItem('courseapp_v1',JSON.stringify(s));});
await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(600);

/* ---------------- cover art is deterministic ---------------- */
console.log('-- generated covers');
await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(600);
const svg1=await p.evaluate(()=>{const e=document.querySelector('.chero .cvsvg');return e?e.innerHTML.length+':'+e.innerHTML.slice(0,60):null;});
ok('the course page has generated art', svg1!==null);
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(400);
await p.evaluate(()=>{location.hash='#c/personal-finance';});await p.waitForTimeout(600);
const svg2=await p.evaluate(()=>{const e=document.querySelector('.chero .cvsvg');return e?e.innerHTML.length+':'+e.innerHTML.slice(0,60):null;});
ok('the same course always draws the same cover', svg1===svg2);
const svg3=await p.evaluate(()=>{const e=document.querySelector('.chero .cvsvg');return e?e.innerHTML:'';});
await p.evaluate(()=>{location.hash='#c/app-builder';});await p.waitForTimeout(600);
const svg4=await p.evaluate(()=>{const e=document.querySelector('.chero .cvsvg');return e?e.innerHTML:'';});
ok('different courses draw different covers', svg3!==svg4 && svg4.length>0);
ok('covers carry no text and are hidden from screen readers',
  await p.evaluate(()=>{const e=document.querySelector('.chero .cvsvg');
    return !!e && e.getAttribute('aria-hidden')==='true' && !/<text/.test(e.innerHTML);}));

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
