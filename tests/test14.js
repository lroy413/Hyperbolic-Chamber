/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve('index.html');
const FULLCAT=require('fs').readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json'&&!/^audio-/.test(f)).map(f=>JSON.parse(require('fs').readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};

let CID='app-builder';
let pass=0,fail=0;
// Settings/Rewards groups collapse now — open one before touching what's inside.
const openSect=async(pg,id)=>{
  const head=pg.locator('[data-secttoggle="'+id+'"]');
  if(await head.count()){
    const sec=pg.locator('.coll[data-sect="'+id+'"]');
    const isOpen=await sec.evaluate(el=>el.classList.contains('open')).catch(()=>false);
    if(!isOpen){await head.click();await pg.waitForTimeout(260);}
  }
};
function ok(n,c){ (c?pass++:fail++); console.log((c?'  PASS ':'  FAIL ')+n); }

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

  // ---------- no-JS preview sanity ----------
  {
    const ctx = await browser.newContext({javaScriptEnabled:false});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
    const p=await ctx.newPage();
    await p.goto(URL,{waitUntil:'load'});await useCat(p);
    const txt=(await p.locator('#app').innerText()).trim();
    ok('no-JS preview still renders content', txt.length>200);
    await ctx.close();
  }

  const ctx = await browser.newContext({javaScriptEnabled:true});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
  const p=await ctx.newPage();
  const errors=[];
  p.on('pageerror',e=>errors.push(String(e.stack||e)));
  p.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
  await p.goto(URL,{waitUntil:'load'});await useCat(p);
  await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(120);
  const getStore=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')||'{}'));
  // content-independent fixture course for quiz/review mechanics (single 0-6, multi @7, text @8; 20-question final)
  const FX={id:'fx',title:'FX Test',subtitle:'x',tagline:'x',accent:'#7b61ff',category:'Test',
    modules:[{title:'M1',tagline:'t',objectives:['o'],lessons:[{title:'L1',blocks:[{t:'p',html:'A sufficiently long paragraph of lesson text so a selection can be made and highlighted during the tests.'}]}],
    quiz:{questions:[{q:'s0',options:['a','b'],answer:0,explain:'e'},{q:'s1',options:['a','b'],answer:1,explain:'e'},{q:'s2',options:['a','b'],answer:0,explain:'e'},{q:'s3',options:['a','b'],answer:1,explain:'e'},{q:'s4',options:['a','b'],answer:0,explain:'e'},{q:'s5',options:['a','b'],answer:1,explain:'e'},{q:'s6',options:['a','b'],answer:0,explain:'e'},{type:'multi',q:'m7',options:['a','b','c'],answers:[0,2],explain:'e'},{type:'text',q:'t8',accept:['dns','the dns'],explain:'e'}]}}],
    finalExam:{questions:Array.from({length:20},(_,i)=>({q:'f'+i,options:['a','b'],answer:i%2,explain:'e'}))}};
  const FX_JSON=JSON.stringify(FX);
  const injectFx=()=>p.evaluate(fx=>{var f=JSON.parse(fx);if(!window.BUILTIN_COURSES.some(c=>c.id==='fx'))window.BUILTIN_COURSES.push(f);},FX_JSON);
  const D=await p.evaluate(()=>{const f=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const t=new Date();const b=new Date(t.getFullYear(),t.getMonth(),t.getDate());const off=n=>{const d=new Date(b);d.setDate(d.getDate()+n);return f(d);};return {today:off(0),y1:off(-1)};});

  // =========================================================
  //  FEATURE 3 — notes / highlights / bookmarks
  // =========================================================
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-l1';},CID);
  await p.waitForTimeout(150);
  ok('lesson shows study bar', await p.locator('.studybar').count()>0);
  ok('lesson body wrapper present', await p.locator('#lessonbody').count()>0);

  // bookmark
  await p.locator('[data-bookmark]').click();
  await p.waitForTimeout(80);
  let s=await getStore();
  ok('bookmark saved to store', (s.bookmarks||[]).some(b=>b.k===CID+'/m1-l1'));
  ok('bookmark button shows on-state', await p.locator('[data-bookmark].on').count()>0);

  // note
  await p.locator('[data-notetoggle]').click();
  await p.waitForTimeout(60);
  await p.locator('#noteinput').fill('Remember: GET is safe & idempotent.');
  await p.waitForTimeout(120);
  s=await getStore();
  ok('note saved to store', (s.notes||{})[CID+'/m1-l1']==='Remember: GET is safe & idempotent.');

  // highlight: select text then trigger the floating button
  const seg=await p.evaluate(()=>{
    var body=document.getElementById('lessonbody');
    var w=document.createTreeWalker(body,NodeFilter.SHOW_TEXT,null);var node,target;
    while(node=w.nextNode()){ if(node.nodeValue.replace(/\s+/g,' ').trim().length>25){target=node;break;} }
    if(!target)return null;
    var txt=target.nodeValue;var m=txt.match(/\S.{18,60}?\S(?=\s)/);if(!m)return null;
    var segStr=m[0];var idx=txt.indexOf(segStr);
    var r=document.createRange();r.setStart(target,idx);r.setEnd(target,idx+segStr.length);
    var sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);
    return segStr.replace(/\s+/g,' ').trim();
  });
  ok('found text to highlight', !!seg);
  await p.evaluate(()=>document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})));
  await p.waitForTimeout(60);
  ok('highlight button appears on selection', await p.evaluate(()=>{var b=document.getElementById('hlbtn');return !!b&&b.style.display==='block';}));
  await p.evaluate(()=>{var b=document.getElementById('hlbtn');if(b)b.click();});
  await p.waitForTimeout(80);
  ok('highlight created in DOM', await p.locator('#lessonbody mark.hl').count()>0);
  s=await getStore();
  ok('highlight saved to store', ((s.marks||{})[CID+'/m1-l1']||[]).length>0);

  // reload -> highlight + note persist and re-apply
  await p.evaluate(()=>{location.hash='#';});
  await p.waitForTimeout(60);
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-l1';},CID);
  await p.waitForTimeout(150);
  ok('highlight re-applied after navigating back', await p.locator('#lessonbody mark.hl').count()>0);
  ok('note prefilled after navigating back', (await p.locator('#noteinput').inputValue()).length>0);

  // remove highlight by clicking it
  await p.locator('#lessonbody mark.hl').first().click();
  await p.waitForTimeout(80);
  s=await getStore();
  ok('highlight removed from store', !((s.marks||{})[CID+'/m1-l1']||[]).length);
  ok('highlight removed from DOM', await p.locator('#lessonbody mark.hl').count()===0);

  // dashboard saved card + saved page
  await p.evaluate(()=>{location.hash='#';});
  await p.waitForTimeout(120);
  ok('home surfaces saved & notes', await p.locator('.alertrow.saved').count()>0);
  await p.evaluate(()=>{location.hash='#saved';});
  await p.waitForTimeout(120);
  ok('saved page lists a bookmark', await p.locator('.savedrow').count()>0);
  ok('saved page lists a note', await p.locator('.notecard').count()>0);
  // delete note from saved page
  await p.locator('[data-delnote]').first().click();
  await p.waitForTimeout(100);
  s=await getStore();
  ok('note deletable from saved page', Object.keys(s.notes||{}).length===0);

  // =========================================================
  //  FEATURE 4 — randomized pools + question types
  // =========================================================
  CID='fx';
  await p.evaluate(()=>{localStorage.clear();var __c=window.STORE_CATALOG||[];localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(__c))}));});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(100);
  await injectFx();
  await p.evaluate(cid=>{location.hash='#c/'+cid+'/m1-quiz';},CID);
  await p.waitForTimeout(180);
  const types=await p.evaluate(()=>{var o={};document.querySelectorAll('.quizwrap .q').forEach(q=>{var t=q.getAttribute('data-qtype');o[t]=(o[t]||0)+1;});return o;});
  ok('quiz has single-choice questions', (types.single||0)>=1);
  ok('quiz has a multi-select question', (types.multi||0)>=1);
  ok('quiz has a text question', (types.text||0)>=1);
  ok('multi renders checkboxes', await p.locator('.quizwrap .mopt input[type=checkbox]').count()>0);
  ok('text renders an input', await p.locator('.quizwrap .qinput').count()>0);
  // data-qi covers all original indices
  const qiSet=await p.evaluate(()=>[...document.querySelectorAll('.quizwrap .q')].map(q=>+q.getAttribute('data-qi')).sort((a,b)=>a-b));
  ok('all 9 original question indices present', qiSet.length===9 && qiSet[0]===0 && qiSet[8]===8);

  // answer everything correctly (type-aware) using BUILTIN_COURSES for the text answer
  await p.evaluate(cid=>{
    var course=[].concat(window.BUILTIN_COURSES||[],window.STORE_CATALOG||[]).find(c=>c.id===cid);var qs=course.modules[0].quiz.questions;
    document.querySelectorAll('.quizwrap .q').forEach(function(qe){
      var type=qe.getAttribute('data-qtype');var oi=+qe.getAttribute('data-qi');
      if(type==='multi'){qe.querySelectorAll('input[type=checkbox]').forEach(function(cb){cb.checked=cb.getAttribute('data-correct')==='1';});}
      else if(type==='text'){var inp=qe.querySelector('.qinput');inp.value=(qs[oi].accept||[qs[oi].answer])[0];}
      else{var isc=qe.querySelector('label.opt.isc input');if(isc)isc.checked=true;}
    });
  },CID);
  await p.locator('.quizwrap .submitbtn').click();
  await p.waitForTimeout(150);
  const banner=await p.locator('.qbanner').innerText();
  ok('mixed-type quiz grades 100% pass', /100%/.test(banner)&&/Passed/i.test(banner));
  s=await getStore();
  ok('module recorded as passed', s.progress&&s.progress[CID]&&s.progress[CID].passed&&s.progress[CID].passed.m1===true);
  ok('review seeded for multi question (index 7)', !!(s.review&&s.review[CID+':m1:7']));
  ok('review seeded for text question (index 8)', !!(s.review&&s.review[CID+':m1:8']));

  // multi mismatch should NOT be marked correct
  await p.locator('.quizwrap .retakebtn').click();
  await p.waitForTimeout(120);
  ok('retake produced a fresh ungraded quiz', await p.evaluate(()=>{var qw=document.querySelector('.quizwrap');return qw&&!qw.classList.contains('graded')&&qw.querySelectorAll('.q').length===9;}));
  const multiGrade=await p.evaluate(cid=>{
    // check only the FIRST correct option of the multi -> should be incorrect (subset)
    var qe=[...document.querySelectorAll('.quizwrap .q')].find(q=>q.getAttribute('data-qtype')==='multi');
    var oneCorrect=qe.querySelector('input[data-correct="1"]');oneCorrect.checked=true;
    return true;
  },CID);
  // fill the rest correct so only multi is wrong, submit, expect not 100
  await p.evaluate(cid=>{
    var course=[].concat(window.BUILTIN_COURSES||[],window.STORE_CATALOG||[]).find(c=>c.id===cid);var qs=course.modules[0].quiz.questions;
    document.querySelectorAll('.quizwrap .q').forEach(function(qe){
      var type=qe.getAttribute('data-qtype');var oi=+qe.getAttribute('data-qi');
      if(type==='multi')return; // leave partial
      if(type==='text'){qe.querySelector('.qinput').value=(qs[oi].accept||[qs[oi].answer])[0];}
      else{var isc=qe.querySelector('label.opt.isc input');if(isc)isc.checked=true;}
    });
  },CID);
  await p.locator('.quizwrap .submitbtn').click();
  await p.waitForTimeout(120);
  ok('partial multi-select is graded wrong', await p.evaluate(()=>{
    var qe=[...document.querySelectorAll('.quizwrap .q')].find(q=>q.getAttribute('data-qtype')==='multi');
    return qe.querySelector('.qexplain').classList.contains('no');
  }));

  // pool: final exam draws 15 of 20 (render directly with R + BUILTIN)
  const pool=await p.evaluate(cid=>{
    var course=[].concat(window.BUILTIN_COURSES||[],window.STORE_CATALOG||[]).find(c=>c.id===cid);
    var html=window.R.renderQuiz(course.finalExam.questions,'final_'+cid,{shuffle:true,pick:15});
    var d=document.createElement('div');d.innerHTML=html;
    var qs=[...d.querySelectorAll('.q')];var idx=qs.map(q=>+q.getAttribute('data-qi'));
    var uniq=new Set(idx);
    return {count:qs.length,unique:uniq.size,inRange:idx.every(i=>i>=0&&i<20)};
  },CID);
  ok('final-exam pool draws exactly 15 questions', pool.count===15);
  ok('pool questions are unique and in range', pool.unique===15&&pool.inRange);

  // =========================================================
  //  Review session across all three question types
  // =========================================================
  // seed known review items (single idx0, multi idx7, text idx8), backdated due
  await p.evaluate(a=>{
    var d=a.d,cid=a.cid;
    var st=JSON.parse(localStorage.getItem('courseapp_v1'));
    st.review={};
    [['0'],['7'],['8']].forEach(function(x){var id=x[0];st.review[cid+':m1:'+id]={c:cid,k:'m1',i:+id,box:1,due:d};});
    localStorage.setItem('courseapp_v1',JSON.stringify(st));
  },{d:D.y1,cid:CID});
  await p.reload({waitUntil:'load'});await useCat(p);
  await p.waitForTimeout(100);
  await injectFx();
  await p.evaluate(()=>{location.hash='#review';});
  await p.waitForTimeout(150);
  ok('review session starts with due items', await p.locator('.revcard').count()>0);

  // walk the whole queue, answering each correctly regardless of type
  let seenSingle=false,seenMulti=false,seenText=false,revErr=false;
  for(let step=0;step<5;step++){
    const state=await p.evaluate(cid=>{
      var host=document.getElementById('revhost');if(!host)return {done:true};
      var card=host.querySelector('.revcard');if(!card)return {done:true};
      var course=[].concat(window.BUILTIN_COURSES||[],window.STORE_CATALOG||[]).find(c=>c.id===cid);var qs=course.modules[0].quiz.questions;
      var optTexts=[...card.querySelectorAll('.revopt .ot, .revchk .ot')].map(e=>e.textContent).sort();
      function findByOptions(){for(var i=0;i<qs.length;i++){var o=qs[i].options;if(!o||o.length!==optTexts.length)continue;var so=o.slice().sort();if(so.every((x,k)=>x===optTexts[k]))return i;}return -1;}
      if(card.querySelector('.revchk')){
        var q=qs[findByOptions()];var want=(q.answers||[q.answer]).map(Number);
        card.querySelectorAll('.revchk').forEach(function(l){var ri=+l.getAttribute('data-ri');if(want.indexOf(ri)>-1)l.querySelector('input').checked=true;});
        document.getElementById('revcheck').click();return {type:'multi'};
      }
      if(card.querySelector('.revinput')){
        var ti=-1;for(var i=0;i<qs.length;i++){if((qs[i].type||'single')==='text'){ti=i;break;}}
        var qt=qs[ti];card.querySelector('.revinput').value=(qt.accept||[qt.answer])[0];
        document.getElementById('revcheck').click();return {type:'text'};
      }
      var qs2=qs[findByOptions()];var ans=qs2.answer;
      var btn=[...card.querySelectorAll('.revopt')].find(b=>+b.getAttribute('data-ri')===ans);btn.click();return {type:'single'};
    },CID);
    if(state.done)break;
    if(state.type==='single')seenSingle=true;
    if(state.type==='multi')seenMulti=true;
    if(state.type==='text')seenText=true;
    await p.waitForTimeout(80);
    // verify feedback showed correct
    const good=await p.locator('.revfb.show.ok').count()>0;
    if(!good)revErr=true;
    // advance
    const nx=await p.locator('#revnext').count();
    if(nx){await p.locator('#revnext').click();await p.waitForTimeout(80);}
  }
  ok('review handled a single-choice card', seenSingle);
  ok('review handled a multi-select card', seenMulti);
  ok('review handled a short-answer card', seenText);
  ok('every correct review answer showed positive feedback', !revErr);
  s=await getStore();
  ok('review XP awarded (>=6 for 3 correct)', s.gam.xp>=6);
  const rescheduled=await p.evaluate(d=>{var st=JSON.parse(localStorage.getItem('courseapp_v1'));return Object.keys(st.review).every(function(id){return st.review[id].due>d;});},D.today);
  ok('all reviewed items rescheduled to the future', rescheduled);

  ok('no page/console errors in JS mode', errors.length===0);
  if(errors.length) console.log('    errors:',errors.slice(0,6));

  await browser.close();
  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
