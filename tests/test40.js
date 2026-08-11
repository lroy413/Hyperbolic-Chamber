/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test40 — the design system as arithmetic.

   Every previous suite asks whether a screen works. This one asks whether the
   app still has *one* of each thing: one type scale, three weights, three
   radii, three elevations, three lit edges, four text tones. Those numbers only
   drift upward, one reasonable exception at a time, and no per-screen review
   ever catches it — the eighteenth font size looks fine on the screen that
   introduced it. So they are counted here, across every route at once, and the
   ceiling is a number rather than a judgement.

   The celebration moments are checked here too, because they belong to the same
   idea: the app is allowed to say something happened, once, briefly, and never
   over the top of a toast. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const HTML=fs.readFileSync(path.resolve('index.html'),'utf8');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json')
  .map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10);};
let pass=0,fail=0;
function ok(n,c,extra){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n+(!c&&extra?'  → '+extra:''));}

const ROUTES=['','#library','#store','#review','#badges','#settings','#paths','#warmup',
  '#c/personal-finance','#c/personal-finance/m1','#c/personal-finance/m1-l1','#glossary/personal-finance'];

/* The scale the app is allowed to draw on. Anything outside these lists is a
   new value someone added without deciding what it means. */
const SIZES=['11.5px','13px','15px','17px','20px','27px'];
const WEIGHTS=['400','600','700','800'];
const RADII=[10,14,20];            /* plus pills, which are anything ≥ 40 */
const SHEEN=['0.06','0.09','0.18'];/* the three lit top edges, dark theme */

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});
await p.evaluate(([cs,t])=>{localStorage.setItem('courseapp_v1',JSON.stringify({imported:cs,
  settings:{theme:'dark',palette:'aurora',scale:1},
  progress:{'personal-finance':{passed:{m1:1,m2:1},lastPage:'m1-l1'}},
  paths:[{id:'pd',name:'Money in a fortnight',created:t,items:[{c:'personal-finance',n:1},{c:'personal-finance',n:3}]}],
  gam:{xp:1240,goal:30,today:t,todayXP:21,streak:6,lastMet:t,days:{[t]:1},done:{},badges:{}}}));},[FULLCAT,d(0)]);
await p.reload({waitUntil:'load'});await p.waitForTimeout(900);

/* ---------------- gather every rendered value, once ---------------- */
const agg={size:{},weight:{},radius:{},color:{},shadow:{},heavy:{}};
for(const r of ROUTES){
  await p.evaluate(h=>{location.hash=h;},r);await p.waitForTimeout(620);
  const res=await p.evaluate(route=>{
    const o={size:{},weight:{},radius:{},color:{},shadow:{},heavy:{}};
    document.querySelectorAll('#app *').forEach(el=>{
      const bb=el.getBoundingClientRect();if(!bb.width||!bb.height)return;
      const cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none')return;
      const cls=(typeof el.className==='string'?el.className:'')||el.tagName;
      const owns=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
      if(owns){
        o.size[cs.fontSize]=(o.size[cs.fontSize]||0)+1;
        o.weight[cs.fontWeight]=(o.weight[cs.fontWeight]||0)+1;
        o.color[cs.color]=(o.color[cs.color]||0)+1;
        if(cs.fontWeight==='800')o.heavy[route+' :: '+cls]=1;
      }
      const rad=parseFloat(cs.borderTopLeftRadius)||0;
      if(rad>0&&bb.width>24&&bb.height>24)o.radius[Math.round(rad)+' '+cls]=1;
      if(cs.boxShadow&&cs.boxShadow!=='none')o.shadow[cs.boxShadow+' :: '+cls]=1;
    });
    return o;},r);
  for(const k of Object.keys(agg))for(const v of Object.keys(res[k]))agg[k][v]=(agg[k][v]||0)+res[k][v];
}

/* ---------------- the type scale ---------------- */
console.log('-- six sizes and no more');
const sizes=Object.keys(agg.size);
const straySize=sizes.filter(s=>SIZES.indexOf(s)<0);
ok('every rendered size is on the scale',straySize.length===0,straySize.join(', '));
ok('the scale itself has six steps, not eighteen',sizes.length<=6,sizes.length+' in use');

/* ---------------- weight ---------------- */
console.log('-- three weights, and heavy is rationed');
const strayW=Object.keys(agg.weight).filter(w=>WEIGHTS.indexOf(w)<0);
ok('no weight outside 400 / 600 / 700 / 800',strayW.length===0,strayW.join(', '));
const heavyPerRoute={};
Object.keys(agg.heavy).forEach(k=>{const r=k.split(' :: ')[0];heavyPerRoute[r]=(heavyPerRoute[r]||0)+1;});
const worst=Object.entries(heavyPerRoute).sort((a,b)=>b[1]-a[1])[0]||['',0];
ok('no screen has more than four elements at weight 800',worst[1]<=4,worst[0]+' has '+worst[1]);
const reg=agg.weight['400']||0,heavy=agg.weight['800']||0;
ok('regular text still outnumbers the heaviest weight',reg>heavy,reg+' regular vs '+heavy+' heavy');

/* ---------------- radii ---------------- */
console.log('-- three radii and a pill');
const strayR=Object.keys(agg.radius).filter(k=>{const v=parseFloat(k);return RADII.indexOf(v)<0&&v<40;});
ok('every corner is 10, 14, 20 or a pill',strayR.length===0,strayR.slice(0,4).join(' | '));

/* ---------------- elevation ---------------- */
console.log('-- three elevations, three lit edges');
/* A shadow is allowed to be one of the three elevations, optionally with a lit
   top edge or an accent glow. Anything else is a fourth tier by another name. */
const E=[/0px 1px 2px 0px$/,                                   /* e1 */
         /0px 1px 2px 0px, rgba\(0, 0, 0, 0\.62\) 0px 12px 28px -12px$/,   /* e2 */
         /0px 26px 64px -16px$/];                              /* e3 */
const strayS=Object.keys(agg.shadow).filter(k=>{
  const sh=k.split(' :: ')[0];
  if(/0px 0px 0px (1|2|3)px/.test(sh))return false;              /* rings, not elevation */
  if(/color\(srgb/.test(sh))return false;                        /* accent glow on a CTA */
  if(/^rgba\(255, 255, 255[^)]*\) 0px 1px 0px 0px inset$/.test(sh))return false; /* edge alone */
  return !E.some(re=>re.test(sh));
});
ok('no drop shadow outside the three tiers',strayS.length===0,strayS.slice(0,3).join(' | '));
const sheens=[...new Set(Object.keys(agg.shadow)
  .map(k=>/rgba\(255, 255, 255, ([0-9.]+)\) 0px 1px 0px 0px inset/.exec(k.split(' :: ')[0]))
  .filter(Boolean).map(m=>m[1]))];
ok('the lit top edge has three strengths',sheens.every(s=>SHEEN.indexOf(s)>=0)&&sheens.length<=3,sheens.join(', '));
ok('and the stylesheet declares them as tokens, not by hand',
  /--edge2:inset/.test(HTML)&&/--edge3:inset/.test(HTML));

/* ---------------- the ink ladder ---------------- */
console.log('-- four text tones, and grey is not the default');
const ink=agg.color['rgb(233, 235, 241)']||0;
const ink2=Object.entries(agg.color).filter(([c])=>/^color\(srgb 0\.82/.test(c)).reduce((a,[,n])=>a+n,0);
const muted=agg.color['rgb(152, 161, 178)']||0;
ok('primary ink carries more than a quarter of the words',ink/(ink+ink2+muted)>0.25,
  Math.round(100*ink/(ink+ink2+muted))+'%');
ok('ink and ink2 together outweigh nothing-but-grey',ink+ink2>=muted*0.75,
  (ink+ink2)+' vs '+muted);
ok('the second tone is actually in use',ink2>=40,ink2+' elements');

/* ---------------- the mark draws the covers ---------------- */
console.log('-- the mark does the work');
const covers=await p.evaluate(()=>{
  const f=window.OB&&window.OB.coverSVG;if(!f)return null;
  const a=f('personal-finance','#7356f0',400,260),c=f('mkt-2-statements','#22d3aa',400,260);
  const paths=s=>(s.match(/ d="/g)||[]).length;
  return {differ:a!==c,curvesA:paths(a),curvesB:paths(c),stable:f('personal-finance','#7356f0',400,260)===a};});
ok('each course gets its own coil',covers&&covers.differ);
ok('the coil is drawn, not a gradient slab',covers&&covers.curvesA>0&&covers.curvesB>0);
ok('and the same course draws the same coil every time',covers&&covers.stable);

/* ---------------- the home bento ---------------- */
console.log('-- home leads with one thing');
await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(700);
const bento=await p.evaluate(()=>{
  const m=document.querySelector('.bmain'),t=[...document.querySelectorAll('.btile')];
  if(!m)return null;const r=m.getBoundingClientRect();
  return {h:Math.round(r.height),tiles:t.length,
    tileH:t.length?Math.round(t[0].getBoundingClientRect().height):0,
    full:Math.round(r.width)>=document.querySelector('#app').clientWidth-40};});
ok('there is a main tile',!!bento);
ok('it is taller than the tiles beside it',bento&&bento.h>bento.tileH*1.4,
  bento&&(bento.h+' vs '+bento.tileH));
/* Was `tiles === 2`. The two tiles under the hero were a goal ring and a streak
   flame — one subject, today, split across two cards with two numbers, two
   captions and two calls to action. They are one card now, so the count is one.
   What this line is actually guarding is that the hero stays dominant and the
   supporting tiles stay subordinate, which the assertion above measures; a bare
   count of 2 encoded the old layout rather than the rule. */
ok('with supporting tiles under it, not competing',bento&&bento.tiles>=1&&bento.tiles<=2,bento&&String(bento.tiles));

/* ---------------- celebration ---------------- */
console.log('-- the app notices when something happens');
async function fire(fn){
  await p.evaluate(fn);
  await p.waitForTimeout(500);
  return await p.evaluate(()=>{const c=document.getElementById('cheer');
    if(!c)return {present:false};
    return {present:true,on:c.classList.contains('on'),live:c.getAttribute('aria-live'),
      role:c.getAttribute('role'),ring:!!c.querySelector('.snkring'),
      text:(c.textContent||'').trim(),
      clicks:getComputedStyle(c).pointerEvents,
      z:parseInt(getComputedStyle(c).zIndex,10)};});
}
const c1=await fire(()=>{window.OB.celebrate('Quest complete','Two lessons · +15 XP');});
ok('a moment appears',c1.present&&c1.on);
ok('it carries the closing ring',c1.ring);
ok('it says what happened',/Quest complete/.test(c1.text));
ok('a screen reader is told once, politely',c1.live==='polite'&&c1.role==='status');
ok('it never eats a tap',c1.clicks==='none');
ok('it sits above the page but below nothing important',c1.z>=100&&c1.z<=400);
await p.waitForTimeout(1700);
ok('and it leaves on its own',await p.evaluate(()=>!document.getElementById('cheer').classList.contains('on')));

/* a toast underneath a celebration is clutter; it should wait its turn */
await p.evaluate(()=>{window.OB.celebrate('Module 1 passed','1.4 credits earned','done');
  window.OB.toast('Badge unlocked — First steps');});
await p.waitForTimeout(400);
const tstate=await p.evaluate(()=>{const t=document.getElementById('toast');return t?t.className+' | '+t.textContent:'none';});
ok('a toast waits rather than competing',!/show/.test(tstate),tstate);
await p.waitForTimeout(2200);
ok('and arrives once the moment has passed',
  await p.evaluate(()=>{const t=document.getElementById('toast');return !!t&&t.classList.contains('show');}));

/* one moment at a time */
await p.evaluate(()=>{window.OB.celebrate('One','a');window.OB.celebrate('Two','b');});
await p.waitForTimeout(300);
ok('two events do not stack two cards',
  await p.evaluate(()=>document.querySelectorAll('#cheer').length===1&&
    /Two/.test(document.getElementById('cheer').textContent)));

/* ---------------- and it is quiet when asked ---------------- */
console.log('-- reduced motion keeps the words, drops the animation');
const ctx2=await b.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});
await ctx2.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
const p2=await ctx2.newPage();
await p2.goto(URL,{waitUntil:'load'});
await p2.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({imported:cs,
  settings:{theme:'dark',palette:'aurora',scale:1},
  gam:{xp:900,goal:30,today:new Date().toISOString().slice(0,10),todayXP:15}}));},FULLCAT);
await p2.reload({waitUntil:'load'});await p2.waitForTimeout(800);
await p2.evaluate(()=>{window.OB.celebrate('Today is closed','The circle is complete.','done');});
await p2.waitForTimeout(350);
const rm=await p2.evaluate(()=>{const c=document.getElementById('cheer');
  const inner=c.querySelector('.chin'),ring=c.querySelector('.snkring');
  return {on:c.classList.contains('on'),
    anim:getComputedStyle(inner).animationName,
    said:/Today is closed/.test(c.textContent),
    ringHidden:!ring||getComputedStyle(ring).display==='none'};});
ok('the sentence still arrives',rm.on&&rm.said);
ok('nothing animates',rm.anim==='none');
ok('and the drawing ring stands down',rm.ringHidden);
await ctx2.close();

ok('no console errors',errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
