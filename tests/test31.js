/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test31 — the long-course reward layer.
   Claim under test: 40-hour courses now pay out in a currency that suits them —
   credits, a grade, a transcript and quiet quarter milestones — without any of
   it nagging. Plus streak freezes, which existed silently and are now visible. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));
const useCat=async(pg)=>{try{await pg.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);}catch(e){}};
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};

const openSect=async(pg,id)=>{
  const head=pg.locator('[data-secttoggle="'+id+'"]');
  if(await head.count()){
    const sec=pg.locator('.coll[data-sect="'+id+'"]');
    const isOpen=await sec.evaluate(el=>el.classList.contains('open')).catch(()=>false);
    if(!isOpen){await head.click();await pg.waitForTimeout(280);}
  }
};
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:844}});
await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;");
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const seed=async(gam,extra)=>{
  await p.evaluate(([g,cs,ex])=>{
    localStorage.clear();
    localStorage.setItem('courseapp_v1',JSON.stringify(Object.assign({
      imported:JSON.parse(JSON.stringify(cs)),settings:{theme:'dark',palette:'aurora',scale:1},gam:g},ex||{})));
    location.hash='';
  },[gam,FULLCAT,extra]);
  await p.reload({waitUntil:'load'});await useCat(p);await p.waitForTimeout(500);
  await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(320);
};
const store=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')));

await p.goto(URL,{waitUntil:'load'});await useCat(p);await p.waitForTimeout(400);

const CID='stock-charts';

/* ---------------- credits ---------------- */
console.log('-- credits');
await seed({xp:0,goal:10,done:{},badges:{}});
const mods=await p.evaluate(id=>{var c=OB.getCourse(id);return c?c.modules.length:0;},CID);
ok('the fixture course has modules', mods>0);

/* The page says "one credit for every ten hours of coursework". It used to say
   that while giving every module exactly one credit whatever its size, so a
   38-hour course was worth nine. The rule and the arithmetic now agree. */
ok('a module is worth its hours divided by ten',
  await p.evaluate(()=>{
    if(typeof OB.moduleCredits!=='function')return false;
    var explicit=OB.moduleCredits({hours:40})===4 && OB.moduleCredits({hours:10})===1;
    // 3 lessons and a quiz derives to 4.5 hours, so half a credit
    var derived=Math.abs(OB.moduleHours({lessons:[1,2,3],quiz:{}})-4.5)<0.001
             && Math.abs(OB.moduleCredits({lessons:[1,2,3],quiz:{}})-0.5)<0.001;
    return explicit && derived;
  }));
ok('a real course is worth about its hours over ten, not one per module',
  await p.evaluate(id=>{
    var c=OB.getCourse(id);if(!c)return false;
    var cr=OB.courseCredits(c), hrs=OB.courseHours(c);
    return cr>0 && cr<c.modules.length && Math.abs(cr-hrs/10)<0.6;
  },CID));
ok('a course is worth the sum of its modules plus its final',
  await p.evaluate(id=>{
    var c=OB.getCourse(id);if(!c)return false;
    var sum=0;c.modules.forEach(function(m){sum+=OB.moduleCredits(m);});
    sum+=c.finalExam?0.2:0;
    return Math.abs(OB.courseCredits(c)-Math.round(sum*10)/10)<0.001 && OB.courseCredits(c)>0;
  },CID));
ok('nothing passed means nothing earned', await p.evaluate(id=>OB.earnedCredits(id)===0,CID));

await seed({xp:400,goal:10,done:{},badges:{}},{progress:{[CID]:{passed:{m1:true,m2:true},finalPassed:false,lastPage:'m3-l1'}}});
const partial=await p.evaluate(id=>({earned:OB.earnedCredits(id),max:OB.courseCredits(OB.getCourse(id)),total:OB.totalCredits()}),CID);
ok('passing two modules earns partial credit', partial.earned>0 && partial.earned<partial.max);
ok('total credits reflect the course', Math.abs(partial.total-partial.earned)<0.001);

/* ---------------- grades ---------------- */
console.log('-- grades');
ok('the grade scale maps scores to letters',
  await p.evaluate(()=>OB.gradeFor(95)==='A'&&OB.gradeFor(91)==='A-'&&OB.gradeFor(88)==='B+'&&OB.gradeFor(84)==='B'&&OB.gradeFor(74)==='C'&&OB.gradeFor(null)===null));
ok('a failing score falls off the scale', await p.evaluate(()=>OB.gradeFor(50)==='—'));

/* ---------------- transcript ---------------- */
console.log('-- transcript');
const allPassed=(function(){var o={};for(var i=1;i<=mods;i++)o['m'+i]=true;return o;})();
await seed({xp:900,goal:10,done:{},badges:{}},{progress:{[CID]:{passed:allPassed,finalPassed:true,finalPct:91,finalDate:day(-2),lastPage:'final'}}});
await p.evaluate(()=>{location.hash='#transcript';});await p.waitForTimeout(500);
ok('the transcript has its own route', await p.locator('.trlist, .trsum').count()>0);
ok('the transcript lists the finished course', (await p.locator('#app').innerText()).indexOf('A-')>=0);
ok('the transcript shows a credit total', /credit/i.test(await p.locator('.trsum, #app').first().innerText()));
ok('a finished row is marked done', await p.locator('.trrow .trdone, .trrow .trgrade').count()>0);
ok('GPA-style average is computed', await p.evaluate(()=>OB.gpa()===91));
ok('an unstarted course stays off the transcript',
  await p.evaluate(()=>OB.transcriptRows().every(function(r){return r.modules>0||r.finished;})));

/* the transcript is reachable from Rewards, not shouted about on home */
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(450);
await openSect(p,'rw-credits');
ok('rewards carries a credits group', await p.locator('.coll[data-sect="rw-credits"]').count()===1);
ok('the credits group links to the transcript', await p.locator('.coll[data-sect="rw-credits"] a[href="#transcript"]').count()>0);
await p.evaluate(()=>{location.hash='';});await p.waitForTimeout(400);
ok('home does not shout about credits', !/transcript/i.test(await p.locator('#app').innerText()));

/* ---------------- milestones ---------------- */
console.log('-- milestones');
await seed({xp:0,goal:10,done:{},badges:{}});
ok('a fresh course has four unclaimed milestones',
  await p.evaluate(id=>{var m=OB.courseMilestones(id);return m.length===4&&m.every(function(x){return !x.claimed;});},CID));
ok('milestones sit at the quarters',
  await p.evaluate(id=>OB.courseMilestones(id).map(function(m){return m.pct;}).join(',')==='25,50,75,100',CID));

await seed({xp:600,goal:10,done:{},badges:{}},{progress:{[CID]:{passed:(function(){var o={};for(var i=1;i<=Math.ceil(mods/2);i++)o['m'+i]=true;return o;})(),finalPassed:false,lastPage:'m1-l1'}}});
const fresh=await p.evaluate(id=>OB.checkMilestones(id).length,CID);
ok('reaching halfway claims the earlier milestones', fresh>=2);
ok('claiming again awards nothing', await p.evaluate(id=>OB.checkMilestones(id).length===0,CID));
ok('each milestone paid one token', await p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).gam.tokensBonus||0)>=2));
ok('claimed milestones persist', await p.evaluate(id=>{var m=OB.courseMilestones(id);return m.filter(function(x){return x.claimed;}).length>=2;},CID));

await p.evaluate(id=>{location.hash='#c/'+id;},CID);await p.waitForTimeout(500);
ok('the course page shows a milestone ribbon', await p.locator('.milerow .mile').count()===4);
ok('reached milestones are lit', await p.locator('.milerow .mile.on').count()>=2);
ok('unreached milestones stay dim', await p.locator('.milerow .mile:not(.on)').count()>=1);

/* ---------------- distance, not percentages ---------------- */
console.log('-- distance to the next thing');
ok('the course page states a next milestone, not a bare percent',
  await p.evaluate(id=>{var n=OB.nextMilestoneLabel(OB.getCourse(id));return !!n&&typeof n.main==='string'&&n.main.length>0;},CID));
await seed({xp:0,goal:10,done:{},badges:{}});
ok('an untouched course reads as not started',
  await p.evaluate(id=>/not started/.test(OB.nextMilestoneLabel(OB.getCourse(id)).sub||''),CID));
await seed({xp:900,goal:10,done:{},badges:{}},{progress:{[CID]:{passed:{},finalPassed:true,finalPct:88,finalDate:day(-1),lastPage:'final'}}});
ok('a certified course reads as certified',
  await p.evaluate(id=>OB.nextMilestoneLabel(OB.getCourse(id)).main==='Certified',CID));
ok('certified shows credits rather than a percentage',
  await p.evaluate(id=>/credit/.test(OB.nextMilestoneLabel(OB.getCourse(id)).sub||''),CID));

/* ---------------- streak freezes ---------------- */
console.log('-- streak freezes');
await seed({xp:0,goal:10,done:{},badges:{},streak:6,lastMet:day(-1),freezes:0,days:{}});
const adv=await p.evaluate(()=>{var r=OB.advanceStreak();OB.save();return r;});
ok('a seventh consecutive day earns a freeze', adv&&adv.earned===true);
ok('the freeze is banked', await p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).gam.freezes||0)===1));

await seed({xp:0,goal:10,done:{},badges:{},streak:6,lastMet:day(-1),freezes:3,days:{}});
await p.evaluate(()=>{OB.advanceStreak();OB.save();});
ok('freezes cap at three', await p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).gam.freezes||0)===3));

await seed({xp:0,goal:10,done:{},badges:{},streak:9,lastMet:day(-2),freezes:2,days:{}});
const froze=await p.evaluate(()=>{var r=OB.advanceStreak();OB.save();return r;});
ok('a missed day spends a freeze instead of breaking the streak', froze&&froze.froze===true);
ok('the streak survived', await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.streak>=10));
ok('one freeze was consumed', await p.evaluate(()=>(JSON.parse(localStorage.getItem('courseapp_v1')).gam.freezes||0)===1));

await seed({xp:0,goal:10,done:{},badges:{},streak:9,lastMet:day(-3),freezes:0,days:{}});
await p.evaluate(()=>{OB.advanceStreak();OB.save();});
ok('with no freezes left the streak resets', await p.evaluate(()=>JSON.parse(localStorage.getItem('courseapp_v1')).gam.streak===1));

/* ---------------- freezes are visible ---------------- */
console.log('-- freezes are visible');
await seed({xp:0,goal:10,done:{},badges:{},streak:5,lastMet:day(0),freezes:2,days:{}});
ok('the warm-up tile shows banked freezes', await p.locator('.wcfrz').count()===1);
ok('the chip states how many', /2/.test(await p.locator('.wcfrz').innerText()));
await p.evaluate(()=>{location.hash='#badges';});await p.waitForTimeout(450);
await openSect(p,'rw-warmup');
ok('rewards explains what a freeze does', /freeze/i.test(await p.locator('.coll[data-sect="rw-warmup"]').innerText()));
await seed({xp:0,goal:10,done:{},badges:{},streak:5,lastMet:day(0),freezes:0,days:{}});
ok('no freezes means no chip', await p.locator('.wcfrz').count()===0);

/* ---------------- it stays quiet ---------------- */
console.log('-- it stays out of the way');
await seed({xp:400,goal:10,done:{},badges:{}},{progress:{[CID]:{passed:{m1:true,m2:true},finalPassed:false,lastPage:'m3-l1'}}});
const homeTxt=await p.locator('#app').innerText();
ok('home shows no raw percentage on the course row', !/\b\d{1,3}% ·/.test(homeTxt));
ok('home mentions modules or a milestone instead', /module|lesson|quiz|exam|Certified/i.test(homeTxt));
ok('the main tile carries the distance, not a percent',
  await p.locator('.bmain .bmsub').count()>0 && !/^\d+%/.test(await p.locator('.bmain .bmsub').innerText()));

/* ---------------- premium finish ---------------- */
console.log('-- visual finish');
await p.evaluate(()=>{location.hash='#transcript';});await p.waitForTimeout(500);
const trBox=await p.locator('.trrow').first().boundingBox();
ok('transcript rows are comfortably tall', trBox && trBox.height>=52);
ok('transcript fits the phone without sideways scroll',
  await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
ok('the transcript has a back route', await p.locator('a[href="#badges"], .back, [data-back]').count()>0);

const deskCtx=await b.newContext({javaScriptEnabled:true,viewport:{width:1440,height:900}});
await deskCtx.addInitScript("window.OBOROS_NO_QUESTS=1;window.OBOROS_TEST=1;");
const d=await deskCtx.newPage();
await d.goto(URL,{waitUntil:'load'});await useCat(d);
await d.evaluate(cs=>{localStorage.setItem('courseapp_v1',JSON.stringify({imported:cs,settings:{theme:'dark',palette:'aurora',scale:1},gam:{xp:900,goal:10,done:{},badges:{}},progress:{'stock-charts':{passed:{m1:true,m2:true},finalPassed:true,finalPct:91,finalDate:new Date().toISOString().slice(0,10),lastPage:'final'}}}));},FULLCAT);
await d.reload({waitUntil:'load'});await useCat(d);await d.waitForTimeout(500);
await d.evaluate(()=>{location.hash='#transcript';});await d.waitForTimeout(500);
ok('the transcript renders on desktop', await d.locator('.trlist, .trsum').count()>0);
ok('desktop transcript does not scroll sideways',
  await d.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
const dw=await d.locator('.trlist').first().boundingBox().catch(()=>null);
ok('the transcript is width-capped on a wide screen', !dw || dw.width<=1100);
await deskCtx.close();

ok('no console errors', errs.length===0);
if(errs.length)console.log(errs);

console.log('\n'+pass+' passed, '+fail+' failed');
await b.close();
process.exit(fail?1:0);
})();
