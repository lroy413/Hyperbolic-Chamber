/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');const URL='file://'+path.resolve('index.html');
let pass=0,fail=0;function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}
const FX={id:'cx',title:'Collegiate Test',subtitle:'x',tagline:'x',accent:'#7356f0',weeks:2,
 modules:[{title:'M1',tagline:'t',week:1,hours:6,objectives:['o'],lessons:[{title:'L1',blocks:[
   {t:'p',html:'Intro with math: <math><mi>a</mi><mo>=</mo><mfrac><mn>1</mn><mn>2</mn></mfrac></math>.'},
   {t:'formula',label:'Compound interest',math:'<math display="block"><mi>FV</mi><mo>=</mo><mi>P</mi><msup><mrow><mo>(</mo><mn>1</mn><mo>+</mo><mi>r</mi><mo>)</mo></mrow><mi>t</mi></msup></math>',caption:'Future value.'}
 ]}],
 quiz:{pick:0,timeLimit:0.05,pass:0.6,questions:[
   {q:'Single?',options:['a','b'],answer:1,why:['a is wrong because','b is right because'],explain:'e',difficulty:2},
   {type:'numeric',q:'Compute 10 x 1.07^0 =',answer:10,tolerance:0.05,unit:'units',explain:'e',difficulty:3},
   {type:'order',q:'Order these steps',items:['First','Second','Third'],explain:'e'},
   {type:'match',q:'Match them',pairs:[['A','Apple'],['B','Banana']],explain:'e'},
   {type:'free',q:'Explain it.',model:'A strong answer covers X and Y.',points:['Covers X','Covers Y'],explain:'e'},
   {type:'case',stem:'A firm reports revenue of 100.',qs:[
      {q:'Case sub 1?',options:['a','b'],answer:0,explain:'e'},
      {type:'numeric',q:'Half of revenue?',answer:50,tolerance:0,explain:'e'}]}
 ]}}],
 finalExam:{questions:[{q:'F?',options:['a','b'],answer:0,explain:'e'}]}};
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const p=await (await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:1000}})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(URL,{waitUntil:'load'});await p.evaluate(()=>localStorage.clear());
await p.reload({waitUntil:'load'});await p.waitForTimeout(200);
await p.evaluate(fx=>{window.BUILTIN_COURSES.push(JSON.parse(fx));location.hash='#c/cx/m1-l1';},JSON.stringify(FX));
await p.waitForTimeout(300);

// ---- math ----
ok('inline MathML renders in prose', await p.locator('#lessonbody math').count()>0);
ok('display formula block renders', await p.locator('.formula math').count()>0);
ok('formula shows its label', await p.locator('.formula[data-label]').count()>0);

// ---- quiz with every new type ----
await p.evaluate(()=>{location.hash='#c/cx/m1-quiz';});await p.waitForTimeout(400);
ok('numeric question renders', await p.locator('.q[data-qtype="numeric"] .qnum').count()>0);
ok('numeric shows its unit', (await p.locator('.q[data-qtype="numeric"]').allInnerTexts()).some(t=>/units/.test(t)));
ok('ordering question renders', await p.locator('.q[data-qtype="order"] .orditem').count()===3);
ok('matching question renders', await p.locator('.q[data-qtype="match"] .mchl').count()===2);
ok('written question renders', await p.locator('.q[data-qtype="free"] .qfree').count()>0);
ok('model answer hidden before submit', !(await p.locator('.q[data-qtype="free"] .freemodel').isVisible()));
ok('scenario/case set renders with a shared stem', await p.locator('.qcase .csstem').count()===1);
ok('case contributes both sub-questions', await p.locator('.qcase .q').count()===2);
ok('difficulty badge shows on harder items', await p.locator('.qdiff').count()>=1);
ok('timer renders for a timed exam', await p.locator('.qtimer').count()>0);
ok('question count includes case sub-questions', await p.evaluate(()=>+document.querySelector('.quizwrap').getAttribute('data-count'))===7);

// answer everything correctly
await p.evaluate(()=>{
  document.querySelectorAll('.q').forEach(q=>{
    const t=q.getAttribute('data-qtype');
    if(t==='single'){const i=q.querySelector('label.opt.isc input');if(i)i.checked=true;}
    if(t==='numeric'){const n=q.querySelector('.qnum');n.value=/Half/.test(q.innerText)?'50':'10';}
    if(t==='free'){q.querySelector('.qfree').value='My written answer covering X and Y.';}
  });
});
// order: tap in correct sequence
for(const label of ['First','Second','Third']){ await p.locator('.q[data-qtype="order"] .orditem',{hasText:label}).click(); await p.waitForTimeout(60); }
ok('ordering assigns positions as you tap', await p.locator('.q[data-qtype="order"] .orditem.set').count()===3);
// match: pair A->Apple, B->Banana
for(const [l,r] of [['A','Apple'],['B','Banana']]){
  await p.locator('.q[data-qtype="match"] .mchl',{hasText:new RegExp('^'+l)}).click();await p.waitForTimeout(60);
  await p.locator('.q[data-qtype="match"] .mchr',{hasText:r}).click();await p.waitForTimeout(60);
}
ok('matching records pairs', await p.locator('.q[data-qtype="match"] .mchl.paired').count()===2);

await p.locator('.submitbtn').click();await p.waitForTimeout(400);
ok('written answer reveals the model answer', await p.locator('.q[data-qtype="free"] .freemodel').isVisible());
ok('score is pending until written answers are self-assessed', /self-assess/i.test(await p.locator('.qbanner').innerText()));
await p.locator('.fmbtn[data-self="1"]').click();await p.waitForTimeout(300);
const banner=await p.locator('.qbanner').innerText();
ok('score finalises after self-assessment', /100%/.test(banner)&&/Passed/i.test(banner));
ok('ordering graded correct', await p.locator('.q[data-qtype="order"] .orditem.ok').count()===3);
ok('matching graded correct', await p.locator('.q[data-qtype="match"] .mchl.ok').count()===2);
ok('numeric graded correct', await p.locator('.qnum.ok').count()===2);
ok('per-distractor explanation shown', (await p.locator('.q[data-qtype="single"]').allInnerTexts()).some(t=>/a is wrong because|b is right because/.test(t)));

// wrong numeric is rejected (tolerance respected)
await p.evaluate(()=>{location.hash='#c/cx/m1-l1';});await p.waitForTimeout(150);
await p.evaluate(()=>{location.hash='#c/cx/m1-quiz';});await p.waitForTimeout(400);
await p.evaluate(()=>{document.querySelectorAll('.q[data-qtype="numeric"] .qnum').forEach(n=>{n.value='999';});});
await p.locator('.submitbtn').click();await p.waitForTimeout(300);
ok('numeric outside tolerance is marked wrong', await p.locator('.qnum.no').count()>=1);

ok('no console errors', errs.length===0);
if(errs.length)console.log('  ERRORS:',errs.slice(0,5));
await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(2);});
