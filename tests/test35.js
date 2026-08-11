/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test35 — the figure viewer.

   Two things this guards. First that `.zoomfig` is actually emitted by the three
   renderers that draw figures — the previous lightbox only matched `img.figimg`,
   and since every figure in the catalogue is an inline SVG, it had never once
   fired on real content. Second that a wide diagram opened on a portrait phone
   is genuinely bigger than it was inline: fitting it to the width leaves three
   quarters of the screen empty, so it turns a quarter turn, and rotating the
   phone turns it back. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true});
await ctx.addInitScript('window.OBOROS_NO_QUESTS=1;');
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});
await p.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({
  imported:cs,settings:{theme:'dark',palette:'aurora',scale:1}}));},FULLCAT);
await p.reload({waitUntil:'load'});await p.waitForTimeout(800);

const state=()=>p.evaluate(()=>{
  const el=document.getElementById('figview');
  if(!el)return{exists:false};
  const pane=document.getElementById('fvpane'),stage=document.getElementById('fvstage');
  const pr=pane.getBoundingClientRect(),sr=stage.getBoundingClientRect();
  return{exists:true,open:el.classList.contains('open'),
    turned:el.classList.contains('turned'),canturn:el.classList.contains('canturn'),
    paneW:pr.width,paneH:pr.height,stageW:sr.width,stageH:sr.height,
    fill:(pr.width*pr.height)/(sr.width*sr.height),
    svg:!!pane.querySelector('svg'),
    cap:document.getElementById('fvcap').textContent,
    hint:document.getElementById('fvhint').textContent,
    rotPressed:(el.querySelector('[data-fvrot]')||{}).getAttribute&&el.querySelector('[data-fvrot]').getAttribute('aria-pressed'),
    focus:(document.activeElement||{}).getAttribute&&document.activeElement.getAttribute('data-fvclose')!==null,
    modal:el.getAttribute('aria-modal')};
});

/* ---------------- the figures are marked up at all ---------------- */
console.log('-- every kind of figure is openable');
const KINDS=[['#c/app-builder/m1-l1','an inline-SVG diagram'],
             ['#c/stock-charts/m1-l1','a generated chart']];
for(const [hash,label] of KINDS){
  await p.evaluate(h=>{location.hash=h;},hash);await p.waitForTimeout(1100);
  const n=await p.locator('.zoomfig').count();
  ok(label+' carries .zoomfig', n>=1);
  ok(label+' shows a zoom affordance', await p.locator('.zoomfig .figzoom').count()>=1);
}

/* ---------------- opening ---------------- */
console.log('-- tapping a diagram opens it full screen');
await p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await p.waitForTimeout(1100);
const fig=p.locator('.zoomfig').first();
await fig.scrollIntoViewIfNeeded();await fig.click();await p.waitForTimeout(700);
let s=await state();
ok('the viewer opens', s.open===true);
ok('it is a modal dialog', s.modal==='true');
ok('the diagram itself is in it, not a screenshot of it', s.svg===true);
ok('it carries the caption', s.cap.length>10);
ok('it covers the whole viewport',
  Math.abs(s.stageW-393)<2 && s.stageH>600);
ok('focus moves to the close button', s.focus===true);

/* ---------------- the whole point: it is bigger ---------------- */
console.log('-- a wide diagram on a portrait phone actually gets bigger');
ok('it turns a quarter turn rather than sitting in a letterbox', s.turned===true);
ok('and fills most of the screen ('+Math.round(s.fill*100)+'% of the stage)', s.fill>0.8);
ok('the turn is announced', /rotate your phone/i.test(s.hint));
ok('the turn control reads as pressed', s.rotPressed==='true');
const inlineH=await p.evaluate(()=>{
  const e=document.querySelector('.zoomfig svg');return e?e.getBoundingClientRect().height:0;});
ok('the enlarged figure is several times the inline one', s.paneH > inlineH*2.5);

/* ---------------- rotating the phone ---------------- */
console.log('-- rotating the phone refits rather than reflows');
await p.setViewportSize({width:852,height:393});await p.waitForTimeout(800);
let l=await state();
ok('the viewer stays open through the rotation', l.open===true);
ok('landscape unturns the diagram', l.turned===false);
ok('the chrome does not eat the short viewport', l.stageH>330);
ok('and the diagram grows into the width', l.paneW>s.paneW*1.4);
await p.setViewportSize({width:393,height:852});await p.waitForTimeout(800);
let s2=await state();
ok('going back to portrait turns it again', s2.turned===true);
ok('and refits to the same size', Math.abs(s2.paneH-s.paneH)<3);

/* ---------------- manual override ---------------- */
console.log('-- the turn can be overridden by hand');
await p.locator('[data-fvrot]').click();await p.waitForTimeout(500);
let m=await state();
ok('the control unturns it', m.turned===false);
ok('and it is refitted flat, not left clipped', m.paneW<=m.stageW);
ok('the control reads as unpressed', m.rotPressed==='false');
await p.setViewportSize({width:852,height:393});await p.waitForTimeout(700);
await p.setViewportSize({width:393,height:852});await p.waitForTimeout(700);
ok('a hand-set turn survives a rotation', (await state()).turned===false);

/* ---------------- zoom ---------------- */
console.log('-- zoom');
const base=(await state()).paneW;
await p.locator('[data-fvzoom="1"]').click();await p.waitForTimeout(300);
const zin=await state();
ok('zoom in enlarges', zin.paneW>base*1.2);
ok('and reports the level', /%$/.test(zin.hint));
await p.locator('[data-fvzoom="-1"]').click();await p.waitForTimeout(250);
ok('zoom out shrinks', (await state()).paneW<zin.paneW);
await p.locator('[data-fvzoom="0"]').click();await p.waitForTimeout(300);
ok('Fit returns to the fitted size', Math.abs((await state()).paneW-base)<3);
ok('double-tapping zooms in', await (async()=>{
  await p.locator('#fvstage').dblclick();await p.waitForTimeout(500);
  return (await state()).paneW>base*1.2;})());
ok('double-tapping again returns to fit', await (async()=>{
  await p.locator('#fvstage').dblclick();await p.waitForTimeout(500);
  return Math.abs((await state()).paneW-base)<4;})());

/* ---------------- closing ---------------- */
console.log('-- closing');
await p.keyboard.press('Escape');await p.waitForTimeout(350);
ok('Escape closes it', (await state()).open===false);
ok('the page underneath is scrollable again',
  await p.evaluate(()=>!document.body.classList.contains('navopen')));
await fig.scrollIntoViewIfNeeded();await fig.click();await p.waitForTimeout(600);
ok('tapping the diagram dismisses it', await (async()=>{
  await p.mouse.click(196,400);await p.waitForTimeout(500);
  return (await state()).open===false;})());
ok('but a double-tap zooms instead of closing', await (async()=>{
  await fig.click();await p.waitForTimeout(600);
  const b0=(await state()).paneW;
  await p.locator('#fvstage').dblclick();await p.waitForTimeout(600);
  const q=await state();
  return q.open===true && q.paneW>b0*1.2;})());
ok('and a tap while zoomed pans rather than closing', await (async()=>{
  await p.mouse.click(196,400);await p.waitForTimeout(500);
  return (await state()).open===true;})());
await p.keyboard.press('Escape');await p.waitForTimeout(300);
await fig.click();await p.waitForTimeout(600);
ok('the close button closes it', await (async()=>{
  await p.locator('[data-fvclose]').click();await p.waitForTimeout(400);
  return (await state()).open===false;})());
ok('a second open still works', await (async()=>{
  await fig.click();await p.waitForTimeout(600);
  const q=await state();return q.open===true&&q.svg===true;})());
await p.keyboard.press('Escape');await p.waitForTimeout(300);

/* ---------------- a near-square figure is left alone ---------------- */
console.log('-- only figures that gain from it are turned');
await p.evaluate(()=>{location.hash='#c/stock-charts/m1-l1';});await p.waitForTimeout(1100);
const ch=p.locator('.zoomfig').first();
await ch.scrollIntoViewIfNeeded();await ch.click();await p.waitForTimeout(700);
const c=await state();
ok('a chart that would not gain much is not turned', c.turned===false);
ok('but the control is still offered', c.canturn===true);
await p.keyboard.press('Escape');await p.waitForTimeout(300);

/* ---------------- tap targets ---------------- */
console.log('-- controls are thumb-sized');
await p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await p.waitForTimeout(1000);
await p.locator('.zoomfig').first().click();await p.waitForTimeout(600);
const small=await p.evaluate(()=>{
  const bad=[];
  document.querySelectorAll('#figview button, .zoomfig .figzoom').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width&&(r.width<44||r.height<44))bad.push(el.className+' '+Math.round(r.width)+'x'+Math.round(r.height));
  });return bad;});
ok('no viewer control is under 44px'+(small.length?' — '+small.join(', '):''), small.length===0);
await p.keyboard.press('Escape');

/* ---------------- no diagram is drawn outside its own frame ---------------- */
/* An SVG clips to its viewBox, so a label that runs long is silently cut off —
   and text width depends on the device font, so it can be fine here and cut on
   a phone. Enlarging a figure makes any such truncation much more obvious, which
   is why this check belongs with the viewer. */
console.log('-- every diagram fits inside its viewBox');
const pages=[];
FULLCAT.forEach(c=>c.modules.forEach((m,mi)=>(m.lessons||[]).forEach((l,li)=>{
  if((l.blocks||[]).some(x=>x.t==='image'&&x.svg))pages.push('#c/'+c.id+'/m'+(mi+1)+'-l'+(li+1));})));
// modules lock until their quiz is passed, so without this the sweep only ever
// reaches module 1 and silently measures a sixth of the figures
await p.evaluate(cs=>{
  const st=JSON.parse(localStorage.getItem('courseapp_v1'));
  st.progress=st.progress||{};
  cs.forEach(c=>{const passed={};c.modules.forEach((m,i)=>{passed['m'+(i+1)]=1;});
    st.progress[c.id]=Object.assign({},st.progress[c.id],{passed:passed});});
  localStorage.setItem('courseapp_v1',JSON.stringify(st));},FULLCAT);
await p.reload({waitUntil:'load'});await p.waitForTimeout(700);
const clipped=[];let figsSeen=0;
for(const hash of pages){
  await p.evaluate(h=>{location.hash=h;},hash);
  await p.waitForSelector(".figsvg svg",{timeout:2500}).catch(()=>{});await p.waitForTimeout(80);
  const r=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('.figsvg svg').forEach(s=>{
      const vb=(s.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number);
      if(vb.length!==4)return;
      let bb;try{bb=s.getBBox();}catch(e){return;}
      out.push({over:Math.max(bb.x+bb.width-(vb[0]+vb[2]),vb[0]-bb.x,
                              bb.y+bb.height-(vb[1]+vb[3]),vb[1]-bb.y),
                label:((s.querySelector('text')||{}).textContent||'').slice(0,38)});
    });return out;});
  r.forEach(x=>{figsSeen++;if(x.over>1)clipped.push(hash+' "'+x.label+'" by '+Math.round(x.over)+'px');});
}
ok(figsSeen+' diagrams measured', figsSeen>=60);
ok('none is clipped by its viewBox'+(clipped.length?' — '+clipped.slice(0,3).join('; '):''), clipped.length===0);

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs.slice(0,4));
console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
