/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test28 — the publishing guard.
   Every case here is a course that would install fine under the old check and
   then break for real learners. The linter must catch each one, and the app's
   import screen must show it rather than saying "no valid course found". */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const R=require('../src/renderers.js');

let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

const base=()=>({
  id:'test-course', title:'Test Course', tagline:'x', accent:'#5b8cff', category:'Test',
  modules:[{title:'M1', objectives:['o'], week:1, hours:10, lessons:[
    {title:'L1', glossary:[['a','b']], blocks:[{t:'p',html:'text'}]}
  ], quiz:{pick:2,pass:0.8,questions:qs('Q',4)}}],
  finalExam:{pick:2,pass:0.75,questions:qs('F',10)}
});
// enough questions that the "thin exam" warning doesn't fire on the baseline
function qs(prefix,n){
  var out=[];
  for(var i=1;i<=n;i++)out.push({q:prefix+i+'?',options:['a','b','c'],answer:1,why:['w','r','w'],explain:'e',difficulty:2});
  return out;
}
const lint=c=>R.lintCourse(c);
const errText=c=>lint(c).errors.join(' | ');

console.log('-- a well-formed course passes');
ok('clean course has no errors', lint(base()).errors.length===0);
ok('clean course has no warnings', lint(base()).warnings.length===0);

console.log('-- the failures that actually break a live course');
{ const c=base(); c.modules[0].quiz.questions[0].answer=7;
  ok('answer index past the end of options', /answer.*index/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions[0].answer=-1;
  ok('negative answer index', /answer/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions[0].answer=1.5;
  ok('non-integer answer index', /answer/i.test(errText(c))); }
{ const c=base(); delete c.modules[0].quiz.questions[0].options;
  ok('question with no options', /options/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions[0].options=['only one'];
  ok('question with a single option', /at least 2/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.pick=99;
  ok('pick larger than the question pool', /pick.*only/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.pass=80;
  ok('pass mark given as 80 instead of 0.8', /pass.*fraction/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions.push({type:'multi',q:'m',options:['a','b'],answers:[0,5]});
  ok('multi answer outside range', /outside/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions.push({type:'numeric',q:'n',answer:'12'});
  ok('numeric answer given as a string', /must be a number/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions.push({type:'order',q:'o',items:['only']});
  ok('order question with one item', /items/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions.push({type:'match',q:'m',pairs:[['a','b'],['c']]});
  ok('match pair that is not a couple', /left, right/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions.push({type:'text',q:'t'});
  ok('text question with no accepted answers', /accept/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions.push({type:'case',stem:'s'});
  ok('case set with no sub-questions', /qs/i.test(errText(c))); }
{ const c=base(); c.modules[0].quiz.questions.push({type:'case',stem:'s',qs:[{q:'x',options:['a','b'],answer:9}]});
  ok('bad sub-question inside a case set', /sub-question/i.test(errText(c))); }
{ const c=base(); c.modules[0].lessons[0].blocks=[];
  ok('lesson with no blocks', /blocks.*empty/i.test(errText(c))); }
{ const c=base(); c.modules[0].lessons[0].blocks=[{html:'no type'}];
  ok('block missing its type', /missing "t"/i.test(errText(c))); }
{ const c=base(); c.modules[0].lessons[0].blocks=[{t:'image',caption:'x'}];
  ok('image block with neither svg nor src', /svg.*src/i.test(errText(c))); }
{ const c=base(); c.modules[0].lessons=[];
  ok('module with no lessons', /lessons/i.test(errText(c))); }
{ const c=base(); delete c.modules[0].quiz;
  ok('module with no quiz', /quiz.*missing/i.test(errText(c))); }
{ const c=base(); delete c.finalExam;
  ok('course with no final exam', /Final exam.*missing/i.test(errText(c))); }
{ const c=base(); c.modules[0].lessons[0].glossary=[['term']];
  ok('malformed glossary entry', /glossary/i.test(errText(c))); }
{ const c=base(); delete c.id;
  ok('course with no id', /id/i.test(errText(c))); }
{ const c=base(); c.modules='not an array';
  ok('modules that is not an array', /modules/i.test(errText(c))); }

console.log('-- warnings, not errors');
{ const c=base(); delete c.modules[0].quiz.questions[0].why;
  const r=lint(c); ok('missing "why" warns but does not block', r.errors.length===0 && /why/.test(r.warnings.join(' '))); }
{ const c=base(); c.id='Test_Course';
  const r=lint(c); ok('non-kebab id warns but does not block', r.errors.length===0 && /kebab/.test(r.warnings.join(' '))); }
{ const c=base(); c.accent='blue';
  const r=lint(c); ok('non-hex accent warns', r.errors.length===0 && /hex/.test(r.warnings.join(' '))); }
{ const c=base(); c.modules[0].lessons[0].blocks=[{t:'kcheck',q:'k',options:['a','b'],answer:1,explain:'e'}];
  const r=lint(c); ok('inline knowledge check is not held to the "why" standard', !/why/.test(r.warnings.join(' '))); }

console.log('-- the real catalogue is publishable');
{
  const files=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json');
  let errs=0;
  files.forEach(f=>{errs+=lint(JSON.parse(fs.readFileSync('catalog/'+f,'utf8'))).errors.length;});
  ok('every shipped course passes with zero errors', errs===0);
  const idx=JSON.parse(fs.readFileSync('catalog/index.json','utf8'));
  ok('index.json lists every course file', idx.length===files.length);
  const ids=new Set(idx.map(e=>e.id));
  ok('every index entry has a matching file', files.every(f=>ids.has(f.replace(/\.json$/,''))));
  ok('every index entry has the fields the store renders', idx.every(e=>e.id&&e.title&&e.accent&&e.category&&typeof e.price==='number'));
}

console.log('-- the import screen surfaces it');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const ctx = await b.newContext({javaScriptEnabled:true,viewport:{width:1280,height:900}});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(URL,{waitUntil:'load'});
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'load'});await p.waitForTimeout(400);
  await p.evaluate(()=>{location.hash='#new';});await p.waitForTimeout(400);

  const broken=base(); broken.modules[0].quiz.questions[0].answer=7;
  await p.locator('#importjson').fill(JSON.stringify(broken));
  await p.locator('#loadbtn').click();await p.waitForTimeout(400);
  const shown=await p.locator('#importresult').innerText();
  ok('import shows the specific error, not a generic failure', /answer/i.test(shown)&&/Module 1 quiz Q1/.test(shown));
  ok('a course with errors is NOT installed', await p.evaluate(()=>((JSON.parse(localStorage.getItem('courseapp_v1')||'{}').imported)||[]).length===0));

  await p.locator('#importjson').fill('{ not json');
  await p.locator('#loadbtn').click();await p.waitForTimeout(300);
  ok('invalid JSON reports the line number', /line \d+/.test(await p.locator('#importresult').innerText()));

  await p.locator('#importjson').fill(JSON.stringify(base()));
  await p.locator('#checkbtn').click();await p.waitForTimeout(400);
  ok('"Check only" reports a clean course', /ready to publish/i.test(await p.locator('#importresult').innerText()));
  ok('"Check only" does not install anything', await p.evaluate(()=>((JSON.parse(localStorage.getItem('courseapp_v1')||'{}').imported)||[]).length===0));

  await p.locator('#loadbtn').click();await p.waitForTimeout(500);
  ok('a clean course does install', await p.evaluate(()=>((JSON.parse(localStorage.getItem('courseapp_v1')||'{}').imported)||[]).some(c=>c.id==='test-course')));

  ok('no console errors', errs.length===0);
  if(errs.length)console.log('   ',errs.slice(0,3));
  await b.close();
  console.log('\n'+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
