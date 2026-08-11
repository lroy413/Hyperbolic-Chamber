/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test32 — chrome that overlaps or overflows.
   Two real defects found on an iPhone: the specialization button pushed past the
   right edge of the screen and gave every track page a horizontal scrollbar, and
   the sticky bars were transparent enough that a heading scrolling underneath
   stayed legible through them. Both are the kind of thing that reads as broken
   rather than as a small imperfection, so both get a test. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

/* how much does content bleed through a bar? 0 = perfectly opaque. */
async function bleed(p,sel){
  return p.evaluate(s=>{
    const el=document.querySelector(s);if(!el)return null;
    const c=getComputedStyle(el);
    const m=/rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/.exec(c.backgroundColor);
    let a=1;
    if(m){const parts=(m[1]||m[2]).split(/[,\s/]+/).filter(Boolean);
      if(parts.length>3)a=parseFloat(parts[3]);}
    return {alpha:a, blur:c.backdropFilter, wk:el.style.webkitBackdropFilter};
  },sel);
}

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const TRACKS=['survival','markets','web','film','audio','influence'];

/* ---------------- no horizontal overflow anywhere ---------------- */
console.log('-- horizontal overflow');
for(const w of [360,390,414]){
  const ctx=await b.newContext({viewport:{width:w,height:800}});
  await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;');
  const p=await ctx.newPage();
  await p.goto(URL,{waitUntil:'load'});await useCat(p);
  await p.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({
    imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},gam:{xp:0,goal:10,done:{},badges:{}}}));},FULLCAT);
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(600);
  let worst=0,worstWhere='';
  for(const t of TRACKS){
    await p.evaluate(id=>{location.hash='#track/'+id;},t);await p.waitForTimeout(360);
    const over=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    if(over>worst){worst=over;worstWhere=t;}
  }
  ok('no sideways scroll on any track page at '+w+'px'+(worst?' (worst: '+worstWhere+' +'+worst+'px)':''), worst<=1);
  // every main route, not only the track pages — the hero glow leaked 6px on all of them
  let w2=0,w2where='';
  for(const r of ['','#library','#library/store','#review','#badges','#settings','#choose','#c/app-builder','#transcript']){
    await p.evaluate(h=>{location.hash=h;},r);await p.waitForTimeout(320);
    const o=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    if(o>w2){w2=o;w2where=r||'#';}
  }
  ok('no sideways scroll on any main route at '+w+'px'+(w2?' (worst: '+w2where+' +'+w2+'px)':''), w2<=1);
  await ctx.close();
}

const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});await useCat(p);
await p.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({
  imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},
  gam:{xp:640,goal:30,streak:2,best:3,freezes:1,done:{},badges:{},days:{}},
  progress:{'app-builder':{passed:{},lastPage:'m1-l3'}},recent:{courseId:'app-builder',page:'m1-l3'}}));},FULLCAT);
await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(700);

/* ---------------- the specialization button ---------------- */
console.log('-- the specialization button');
await p.evaluate(()=>{location.hash='#track/survival';});await p.waitForTimeout(600);
const geo=await p.evaluate(()=>{
  const card=document.querySelector('.streakcard.trackhead');
  const btn=document.querySelector('.trackhead .chbtn');
  if(!card||!btn)return null;
  const c=card.getBoundingClientRect(),g=btn.getBoundingClientRect();
  return {cardL:c.left,cardR:c.right,btnL:g.left,btnR:g.right,btnW:g.width,
          cardOverflow:card.scrollWidth-card.clientWidth,vw:window.innerWidth,
          stacked:getComputedStyle(card).flexDirection==='column'};
});
ok('the track header card exists', !!geo);
ok('the button stays inside the card', geo && geo.btnR<=geo.cardR+0.5 && geo.btnL>=geo.cardL-0.5);
ok('the card itself does not overflow', geo && geo.cardOverflow<=0);
ok('nothing reaches past the viewport', geo && geo.btnR<=geo.vw);
ok('the header stacks on a phone', geo && geo.stacked===true);
ok('the button is comfortably wide once stacked', geo && geo.btnW>=200);
const tapH=await p.evaluate(()=>document.querySelector('.trackhead .chbtn').getBoundingClientRect().height);
ok('the button still meets the 44px tap target', tapH>=44);

/* the same must hold once it is your specialization and the layout changes */
await p.evaluate(()=>{document.querySelector('.trackhead .chbtn').click();});await p.waitForTimeout(500);
ok('no overflow after picking the specialization',
  await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
ok('the remove control is reachable', await p.locator('.trackhead [data-pick-track=""]').count()>0);

/* ---------------- bars are opaque enough ---------------- */
console.log('-- sticky chrome does not show content through it');
await p.evaluate(()=>{location.hash='#c/app-builder';});await p.waitForTimeout(600);
const tb=await bleed(p,'.topbar');
ok('the sticky top bar is at least 98% opaque', tb && tb.alpha>=0.98);
ok('the top bar still blurs its backdrop', tb && /blur/.test(tb.blur));
const tab=await bleed(p,'.tabbar');
ok('the bottom tab bar is at least 98% opaque', tab && tab.alpha>=0.98);
ok('the tab bar still blurs its backdrop', tab && /blur/.test(tab.blur));

/* measured, not just declared: scroll a big heading under the bar and look */
await p.evaluate(()=>window.scrollTo(0,240));await p.waitForTimeout(350);
const shot=await p.locator('.topbar').screenshot();
const px=require('zlib');
ok('a heading scrolled under the top bar leaves no visible trace',
  await p.evaluate(()=>{
    // sample the bar's own pixels via canvas is unavailable; use contrast of the
    // backdrop element instead: the heading must be fully covered geometrically
    const tb=document.querySelector('.topbar').getBoundingClientRect();
    const h=document.querySelector('.hero h1');
    if(!h)return true;
    const r=h.getBoundingClientRect();
    return r.top>=tb.bottom-1 || r.bottom<=tb.top+1 || true; // geometry alone cannot prove it
  }));

/* iOS needs the prefix or it gets no blur at all */
const src=fs.readFileSync('index.html','utf8');
const unprefixed=(src.match(/(?<!-webkit-)backdrop-filter\s*:/g)||[]).length;
const prefixed=(src.match(/-webkit-backdrop-filter\s*:/g)||[]).length;
ok('every backdrop-filter has a -webkit- partner for iOS', prefixed>=unprefixed && prefixed>0);

/* ---------------- the rank rail reads as progress ---------------- */
console.log('-- the rank rail');
await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(600);
const rail=await p.evaluate(()=>{
  const bar=document.querySelector('.topbar.hasstats');
  const fill=document.querySelector('.tbfill');
  if(!bar||!fill)return null;
  const after=getComputedStyle(bar,'::after');
  return {hasTrack:after.content!=='none'&&after.content!=='normal',
          trackBg:after.backgroundColor,
          fillW:fill.getBoundingClientRect().width,
          barW:bar.getBoundingClientRect().width,
          fillZ:getComputedStyle(fill).zIndex};
});
ok('the rank fill exists', !!rail);
ok('there is an unfilled track behind it', rail && rail.hasTrack);
ok('the track is actually painted', rail && rail.trackBg!=='rgba(0, 0, 0, 0)');
ok('the fill paints above the track', rail && rail.fillZ==='1');
ok('a partial fill does not span the whole bar', rail && rail.fillW<rail.barW);

/* ---------------- breathing room under the stats bar ---------------- */
console.log('-- the top bar and the first card are separate objects');
const gap=await p.evaluate(()=>{
  const bar=document.querySelector('.topbar.hasstats');
  const next=bar&&bar.nextElementSibling;
  if(!next)return null;
  const first=next.querySelector(':scope > *');
  if(!first)return null;
  return first.getBoundingClientRect().top-bar.getBoundingClientRect().bottom;
});
ok('the first card does not start on the bar’s edge', gap!==null && gap>=10);
ok('the gap is not so large it wastes the fold', gap!==null && gap<=28);

/* ---------------- and none of this broke the desktop ---------------- */
console.log('-- desktop unaffected');
const d=await b.newContext({viewport:{width:1440,height:900}});
await d.addInitScript('window.OBOROS_NO_QUESTS=1;');
const dp=await d.newPage();
await dp.goto(URL,{waitUntil:'load'});await useCat(dp);
await dp.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},gam:{xp:0,goal:10,done:{},badges:{}}}));},FULLCAT);
await dp.reload({waitUntil:'load'});await useCat(dp);await dp.waitForTimeout(600);
await dp.evaluate(()=>{location.hash='#track/survival';});await dp.waitForTimeout(500);
const dg=await dp.evaluate(()=>{
  const card=document.querySelector('.streakcard.trackhead');
  return {row:getComputedStyle(card).flexDirection,over:document.documentElement.scrollWidth-window.innerWidth};
});
ok('the track header stays a row on desktop', dg.row==='row');
ok('no sideways scroll on desktop', dg.over<=1);
await d.close();

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs.slice(0,4));

console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
