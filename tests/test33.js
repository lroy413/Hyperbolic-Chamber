/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test33 — the library and store organised by specialization.
   The store used to be a flat alphabetical grid, which answered "what exists"
   and never "what does this belong to and what comes before it". These tests
   pin the grouping, the sequence numbers, the owned-but-still-shown behaviour,
   and the fact that the specializations block no longer dominates the library. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const TRACKS=JSON.parse(fs.readFileSync('../src/data/tracks.json','utf8'));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852}});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const seed=async(owned)=>{
  await p.evaluate(([cs,own])=>{
    localStorage.setItem('courseapp_v1',JSON.stringify({
      imported:cs.filter(c=>own.indexOf(c.id)>-1),
      settings:{theme:'dark',palette:'aurora',scale:1},
      gam:{xp:200,goal:30,done:{},badges:{}}}));
    location.hash='';
  },[FULLCAT,owned]);
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(700);
};
await p.goto(URL,{waitUntil:'load'});await useCat(p);

/* ---------------- the store groups by track ---------------- */
console.log('-- the store is grouped');
await seed(['personal-finance']);
await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(900);

ok('the store renders groups, not a flat grid', await p.locator('.grp .grphead').count()>=2);
ok('every group header links to its specialization',
  await p.evaluate(()=>[].slice.call(document.querySelectorAll('a.grphead')).every(a=>/^#track\//.test(a.getAttribute('href')))));
const markets=await p.evaluate(()=>{
  const heads=[].slice.call(document.querySelectorAll('a.grphead'));
  const h=heads.filter(a=>/markets/i.test(a.textContent))[0];
  if(!h)return null;
  const sect=h.closest('.grp');
  return {rows:[].slice.call(sect.querySelectorAll('.strow')).map(r=>({
    n:r.querySelector('.stn').textContent.trim(),
    title:r.querySelector('.sttitle').textContent.trim(),
    owned:r.classList.contains('have')}))};
});
ok('the Markets group exists', !!markets);
ok('it lists all three Markets courses', markets && markets.rows.length===3);
ok('they are numbered by their position in the track',
  markets && markets.rows.map(r=>r.n).join(',')==='1,2,3');
ok('the sequence matches tracks.json',
  markets && markets.rows[1].title.indexOf('Financial Statements')>-1);
ok('an owned course stays in the sequence rather than vanishing',
  markets && markets.rows[0].owned===true && /Personal Finance/.test(markets.rows[0].title));
ok('an owned course is not offered for download',
  await p.locator('.stbtn[data-getcourse="personal-finance"]').count()===0);
ok('an unowned course is offered',
  await p.locator('.stbtn[data-getcourse="mkt-2-statements"]').count()===1);
ok('the group header says how many are left to add',
  /to add/.test(await p.evaluate(()=>{
    const h=[].slice.call(document.querySelectorAll('a.grphead')).filter(a=>/markets/i.test(a.textContent))[0];
    return h?h.textContent:'';})));

/* ---------------- tracks with nothing built yet ---------------- */
console.log('-- specializations that are still outlines');
const emptyTracks=TRACKS.filter(t=>!(t.courseIds||[]).some(id=>FULLCAT.some(c=>c.id===id)));
ok('the fixture has at least one unbuilt specialization', emptyTracks.length>=1);
ok('they do not each get an empty group header',
  await p.evaluate(names=>{
    const heads=[].slice.call(document.querySelectorAll('a.grphead')).map(a=>a.textContent);
    return names.every(n=>!heads.some(h=>h.indexOf(n)>-1));
  }, emptyTracks.map(t=>t.title)));
ok('they collapse into one "in development" section', await p.locator('.grp.planned').count()===1);
ok('each is still reachable from there', await p.locator('.grp.planned .plrow').count()===emptyTracks.length);
ok('and links to its outline', await p.evaluate(()=>{
  const r=document.querySelector('.grp.planned .plrow');return r&&/^#track\//.test(r.getAttribute('href'));}));

/* ---------------- the A-Z escape hatch ---------------- */
console.log('-- A-Z still available');
ok('a grouping switch is offered', await p.locator('[data-libgroup="track"]').count()===1);
await p.locator('[data-libgroup="az"]').click();await p.waitForTimeout(600);
ok('A-Z drops the group headers', await p.locator('.grp .grphead').count()===0);
ok('but keeps every course', await p.locator('.strow').count()>=4);
ok('sorted alphabetically', await p.evaluate(()=>{
  const t=[].slice.call(document.querySelectorAll('.sttitle')).map(e=>e.textContent.trim());
  return t.slice().sort((a,b)=>a.localeCompare(b)).join('|')===t.join('|');}));
ok('the choice persists across a reload', await (async()=>{
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(800);
  return await p.locator('[data-libgroup="az"].on').count()===1;})());
await p.locator('[data-libgroup="track"]').click();await p.waitForTimeout(600);
ok('switching back restores the groups', await p.locator('.grp .grphead').count()>=2);

/* ---------------- my courses ---------------- */
console.log('-- my courses');
await seed(['personal-finance','stock-charts','app-builder']);
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(800);
ok('owned courses are grouped too', await p.locator('.libgrp .grphead').count()>=2);
ok('Markets holds both of its owned courses', await p.evaluate(()=>{
  const h=[].slice.call(document.querySelectorAll('a.grphead')).filter(a=>/markets/i.test(a.textContent))[0];
  return h?h.closest('.grp').querySelectorAll('.libcard[data-cid]').length===2:false;}));
ok('a group with nothing owned does not appear', await p.evaluate(()=>
  ![].slice.call(document.querySelectorAll('a.grphead')).some(a=>/survival/i.test(a.textContent))));
ok('category chips step aside while grouped', await p.locator('#catchips .chip').count()===0);
ok('searching hides groups that empty out', await (async()=>{
  await p.fill('#coursesearch','negotiation');await p.waitForTimeout(300);
  const vis=await p.evaluate(()=>[].slice.call(document.querySelectorAll('.libgrp')).filter(g=>g.style.display!=='none').length);
  await p.fill('#coursesearch','');await p.waitForTimeout(300);
  return vis===0;})());
ok('clearing the search brings them back', await p.locator('.libgrp .grphead').count()>=2);

/* ---------------- the specializations block is no longer the focus ---------------- */
console.log('-- specializations sit below what you own');
const order=await p.evaluate(()=>{
  const mine=document.querySelector('.coll[data-sect="mycourses"]');
  const tracks=document.querySelector('.coll[data-sect="tracks"]');
  if(!mine||!tracks)return null;
  return {mineTop:mine.getBoundingClientRect().top+window.scrollY,
          tracksTop:tracks.getBoundingClientRect().top+window.scrollY,
          tracksOpen:tracks.classList.contains('open')};
});
ok('both sections exist', !!order);
ok('your courses come before specializations', order && order.mineTop<order.tracksTop);
ok('the specializations block starts collapsed', order && order.tracksOpen===false);

await p.locator('[data-secttoggle="tracks"]').click();await p.waitForTimeout(400);
const rows=await p.evaluate(()=>{
  const rs=[].slice.call(document.querySelectorAll('.trackrows .tkrow'));
  return {count:rs.length,h:rs.length?rs[0].getBoundingClientRect().height:0,
          total:rs.reduce((a,r)=>a+r.getBoundingClientRect().height,0)};
});
ok('every specialization is listed', rows.count===TRACKS.length);
ok('each row is compact', rows.h<=58);
ok('the whole block fits inside one screen', rows.total<=852);

/* ---------------- no regressions ---------------- */
console.log('-- housekeeping');
ok('no sideways scroll on the store', await (async()=>{
  await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(600);
  return await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);})());
ok('every Get button meets the tap target', await p.evaluate(()=>
  [].slice.call(document.querySelectorAll('.stbtn')).every(b=>b.getBoundingClientRect().height>=43.5)));
ok('downloading from a group still works', await (async()=>{
  await p.locator('.stbtn[data-getcourse="everyday-negotiation"]').click();await p.waitForTimeout(700);
  const s=await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));
  return (s.imported||[]).some(c=>c.id==='everyday-negotiation');})());
ok('and the row flips to owned in place', await p.evaluate(()=>{
  const r=[].slice.call(document.querySelectorAll('.strow')).filter(x=>/Negotiation/.test(x.textContent))[0];
  return !!r&&r.classList.contains('have');}));

/* desktop */
const d=await b.newContext({viewport:{width:1440,height:900}});
await d.addInitScript('window.OBOROS_NO_QUESTS=1;');
const dp=await d.newPage();
await dp.goto(URL,{waitUntil:'load'});await useCat(dp);
await dp.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({imported:cs.filter(c=>c.id==='personal-finance'),settings:{theme:'dark',palette:'aurora',scale:1},gam:{xp:0,goal:10,done:{},badges:{}}}));},FULLCAT);
await dp.reload({waitUntil:'load'});await useCat(dp);await dp.waitForTimeout(700);
await dp.evaluate(()=>{location.hash='#library/store';});await dp.waitForTimeout(800);
ok('the store groups on desktop too', await dp.locator('.grp .grphead').count()>=2);
ok('rows go multi-column on a wide screen', await dp.evaluate(()=>{
  const l=document.querySelector('.stlist');return l&&getComputedStyle(l).display==='grid';}));
ok('no sideways scroll on desktop', await dp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
await d.close();

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs.slice(0,4));

console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
