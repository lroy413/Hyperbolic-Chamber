/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test39 — the things you can only see by looking at every screen at once:
   whether a glyph is actually in the middle of its container, whether any two
   boxes are sitting on top of each other, and whether a specialization and the
   courses under it read as parent and child rather than as six equal cards.

   The centring bug that prompted this was one CSS rule: `.snkring svg` matched
   the glyph nested inside the ring as well as the ring itself, absolutely
   positioning the glyph into the corner of a zero-width box. It was invisible in
   code review and obvious on a phone. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10);};
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

const ROUTES=[['home',''],['library','#library'],['store','#library/store'],['design','#design'],
  ['path','#path/pdemo'],['module','#m/personal-finance/5'],['track','#track/markets'],
  ['course','#c/personal-finance'],['lesson','#c/personal-finance/m1-l1'],
  ['intro','#c/personal-finance/m1-intro'],['rewards','#badges'],['warmup','#warmup'],
  ['review','#review'],['settings','#settings'],['transcript','#transcript'],
  ['saved','#saved'],['glossary','#c/personal-finance/glossary']];

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});
await p.evaluate(([cs,t,days])=>{
  const st={imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},progress:{},
    paths:[{id:'pdemo',name:'Money in a fortnight',created:t,items:[
      {c:'personal-finance',n:1},{c:'mkt-2-statements',n:2}]}],
    gam:{xp:1240,goal:30,today:t,todayXP:21,streak:6,lastMet:t,best:9,days:days,
      done:{'personal-finance/m1-l1':1},badges:{first_lesson:1,quiz1:1},
      questsDone:2,reviewsDone:18,wuDays:6}};
  st.progress['personal-finance']={passed:{m1:1,m2:1},lastPage:'m3-l1'};
  localStorage.setItem('courseapp_v1',JSON.stringify(st));},
  [FULLCAT,d(0),[d(0),d(-1),d(-2),d(-3)]]);
await p.reload({waitUntil:'load'});await p.waitForTimeout(900);

/* ================= glyphs sit in the middle ================= */
console.log('-- every glyph is centred in the thing that holds it');
const off=[];let checked=0;
for(const [name,hash] of ROUTES){
  await p.evaluate(h=>{location.hash=h;},hash);await p.waitForTimeout(560);
  const r=await p.evaluate(()=>{
    const out=[];let n=0;
    // a container is "meant to centre" when it is squarish and comfortably bigger
    // than the glyph — a glyph sitting beside text is not one of those
    document.querySelectorAll('svg.gi').forEach(g=>{
      const host=g.parentElement;if(!host)return;
      const hr=host.getBoundingClientRect(),gr=g.getBoundingClientRect();
      if(!hr.width||!gr.width)return;
      if(hr.width<gr.width+6||hr.height<gr.height+6)return;
      if(Math.abs(hr.width-hr.height)>10)return;      // a wide pill holds text too
      if((host.textContent||'').trim())return;        // it holds a label as well
      n++;
      const dx=Math.round((gr.left+gr.width/2)-(hr.left+hr.width/2));
      const dy=Math.round((gr.top+gr.height/2)-(hr.top+hr.height/2));
      if(Math.abs(dx)>2||Math.abs(dy)>2)
        out.push((host.className.baseVal||host.className||host.tagName)+' off by '+dx+','+dy);
    });
    // a glyph inside a progress ring is the case that broke
    document.querySelectorAll('.snkring').forEach(rg=>{
      const g=rg.querySelector('svg.gi');if(!g)return;n++;
      const rr=rg.getBoundingClientRect(),gr=g.getBoundingClientRect();
      const dx=Math.round((gr.left+gr.width/2)-(rr.left+rr.width/2));
      const dy=Math.round((gr.top+gr.height/2)-(rr.top+rr.height/2));
      if(Math.abs(dx)>2||Math.abs(dy)>2)out.push('glyph inside a ring off by '+dx+','+dy);
    });
    return {bad:[...new Set(out)],n:n};
  });
  checked+=r.n;
  r.bad.forEach(x=>off.push(name+': '+x));
}
ok(checked+' centred glyphs measured', checked>=30);
ok('none is off centre'+(off.length?' — '+off.slice(0,4).join(' | '):''), off.length===0);
ok('a glyph nested in a ring is not absolutely positioned by the ring',
  await p.evaluate(()=>{
    const g=document.querySelector('.snkring svg.gi');
    return !g||getComputedStyle(g).position!=='absolute';}));

/* ================= nothing sits on top of anything ================= */
console.log('-- no boxes collide, and blocks have room to breathe');
const hits=[];
for(const [name,hash] of ROUTES){
  await p.evaluate(h=>{location.hash=h;},hash);await p.waitForTimeout(520);
  const r=await p.evaluate(()=>{
    const out=[];
    const named=e=>(typeof e.className==='string'?e.className.split(' ').slice(0,2).join('.'):e.tagName);
    const usable=e=>{
      if(e.tagName==='svg'||e.closest('svg')||e.closest('table'))return false;
      const s=getComputedStyle(e);
      // a title with negative margins is deliberately overlapping to widen its
      // tap target; that is padding, not collision
      if(parseFloat(s.marginBottom)<0||parseFloat(s.marginTop)<0)return false;
      return s.display!=='none'&&s.display!=='inline'&&s.position!=='absolute'
        &&s.position!=='fixed'&&e.getBoundingClientRect().height>2;
    };
    document.querySelectorAll('#app *').forEach(par=>{
      if(par.closest('svg')||par.closest('table'))return;
      const ps=getComputedStyle(par);
      if(ps.display.indexOf('flex')>-1||ps.display.indexOf('grid')>-1)return;
      const kids=[...par.children].filter(usable);
      for(let i=1;i<kids.length;i++){
        const a=kids[i-1].getBoundingClientRect(),c=kids[i].getBoundingClientRect();
        if(Math.round(c.top-a.bottom)<0)
          out.push('OVERLAP '+named(kids[i-1])+' / '+named(kids[i]));
      }
    });
    // the rhythm between a page's own top-level blocks
    document.querySelectorAll('#app .wrap').forEach(w=>{
      const kids=[...w.children].filter(usable);
      for(let i=1;i<kids.length;i++){
        const pv=kids[i-1],nx=kids[i];
        const a=pv.getBoundingClientRect(),c=nx.getBoundingClientRect();
        const inner=parseFloat(getComputedStyle(pv).paddingBottom)+parseFloat(getComputedStyle(nx).paddingTop);
        if(Math.round(c.top-a.bottom)+inner<8)
          out.push('TIGHT '+named(pv)+' -> '+named(nx));
      }
    });
    return [...new Set(out)];
  });
  r.forEach(x=>hits.push(name+': '+x));
}
ok('nothing overlaps and nothing is cramped'+(hits.length?' — '+hits.slice(0,4).join(' | '):''),
  hits.length===0);

/* ================= the store reads as parent and child ================= */
console.log('-- a specialization and its courses are not the same thing');
await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(900);
const st=await p.evaluate(()=>{
  const head=document.querySelector('.grp .grphead'), row=document.querySelector('.grp .strow');
  if(!head||!row)return null;
  const hs=getComputedStyle(head),rs=getComputedStyle(row);
  const ht=getComputedStyle(head.querySelector('.grpname')),rt=getComputedStyle(row.querySelector('.sttitle'));
  const list=document.querySelector('.grp .stlist');
  return {headBg:hs.backgroundColor,rowBg:rs.backgroundColor,
    headTitle:parseFloat(ht.fontSize),rowTitle:parseFloat(rt.fontSize),
    headH:head.getBoundingClientRect().height,rowH:row.getBoundingClientRect().height,
    indent:Math.round(row.getBoundingClientRect().left-head.getBoundingClientRect().left),
    rail:getComputedStyle(list).borderLeftWidth,
    rowBorder:rs.borderTopWidth+'/'+rs.boxShadow};
});
ok('the group header and its rows exist to compare', !!st);
if(st){
  ok('the course title is smaller than the specialization title ('+st.rowTitle+' vs '+st.headTitle+')',
    st.rowTitle<st.headTitle);
  ok('the course row is shorter than the header', st.rowH<st.headH);
  ok('the course sits inside a card, it is not one', st.rowBg==='rgba(0, 0, 0, 0)');
  ok('the courses are indented under their specialization ('+st.indent+'px)', st.indent>=12);
  ok('and attached to it by a rail', parseFloat(st.rail)>=1);
}
console.log('-- descriptions fold instead of truncating');
const desc=await p.evaluate(()=>{
  const row=[...document.querySelectorAll('.strow')].find(r=>r.querySelector('.stsub'));
  if(!row)return null;
  const s=row.querySelector('.stsub'),btn=row.querySelector('[data-stdesc]');
  return {hidden:s.hidden,expanded:btn.getAttribute('aria-expanded'),
    btnH:btn.getBoundingClientRect().height,full:s.textContent.length};
});
ok('a course carries its description', !!desc && desc.full>10);
if(desc){
  ok('it starts folded away', desc.hidden===true && desc.expanded==='false');
  ok('the toggle says what it is doing', desc.expanded==='false');
}
ok('opening it reveals the whole sentence', await (async()=>{
  await p.locator('[data-stdesc]').first().click();await p.waitForTimeout(320);
  return await p.evaluate(()=>{
    const row=document.querySelector('.strow.showdesc');
    if(!row)return false;
    const s=row.querySelector('.stsub');
    // no clamping: the rendered height matches the full text
    return !s.hidden && s.scrollHeight<=s.clientHeight+2
      && row.querySelector('[data-stdesc]').getAttribute('aria-expanded')==='true';});})());
ok('and closing it puts it back', await (async()=>{
  await p.locator('[data-stdesc]').first().click();await p.waitForTimeout(320);
  return await p.evaluate(()=>document.querySelector('.strow .stsub').hidden===true);})());
/* every course in this fixture is already installed, so the buttons all read
   "Open"; the colour rule only bites on the ones you can still add */
ok('each specialization colours its own Get button rather than the store being one hue',
  await (async()=>{
    await p.evaluate(cs=>{
      const s=JSON.parse(localStorage.getItem('courseapp_v1'));
      s.imported=cs.slice(0,1);localStorage.setItem('courseapp_v1',JSON.stringify(s));},FULLCAT);
    await p.reload({waitUntil:'load'});await p.waitForTimeout(700);
    await p.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);
    await p.evaluate(()=>{location.hash='#library/store';});await p.waitForTimeout(900);
    return await p.evaluate(()=>{
      const btns=[...document.querySelectorAll('.grp .stbtn:not(.go)')]
        .map(e=>getComputedStyle(e).backgroundColor);
      return btns.length>=2 && new Set(btns).size>=2;});})());

/* ================= the icons have some depth ================= */
console.log('-- the icons are not flat fills');
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(800);
ok('an earned badge is modelled, not filled', await p.evaluate(()=>{
  const e=document.querySelector('.bmed.got .bmdisc');
  if(!e)return false;
  const s=getComputedStyle(e);
  return s.backgroundImage!=='none' && s.boxShadow.indexOf('inset')>-1;}));
ok('and a bare glyph did not get a box it never asked for', await p.evaluate(()=>{
  const e=document.querySelector('.rwstat .rwsico');
  if(!e)return true;
  const s=getComputedStyle(e);
  return s.backgroundImage==='none' && s.boxShadow==='none';}));
await p.evaluate(()=>{location.hash='#library';});await p.waitForTimeout(700);
ok('no native disclosure triangle is left anywhere', await p.evaluate(()=>
  [...document.querySelectorAll('#app summary')].every(s=>getComputedStyle(s).listStyleType==='none')));

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
