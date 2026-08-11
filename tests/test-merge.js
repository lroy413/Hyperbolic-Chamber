const R=require('../src/renderers.js');
let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

// XP and monotonic counters take the max
let m=R.mergeState({gam:{xp:120,best:3,tSpent:1,perfects:2,reviewsDone:10}},{gam:{xp:80,best:5,tSpent:0,perfects:1,reviewsDone:30}});
ok('xp takes max', m.gam.xp===120);
ok('best streak takes max', m.gam.best===5);
ok('tokens spent takes max', m.gam.tSpent===1);
ok('perfects takes max', m.gam.perfects===2);
ok('reviewsDone takes max', m.gam.reviewsDone===30);

// streak/today follow the later date
m=R.mergeState({gam:{today:'2026-07-30',todayXP:10,lastMet:'2026-07-29',streak:2}},{gam:{today:'2026-07-31',todayXP:25,lastMet:'2026-07-31',streak:4}});
ok('todayXP follows later day', m.gam.todayXP===25 && m.gam.today==='2026-07-31');
ok('streak follows later lastMet', m.gam.streak===4 && m.gam.lastMet==='2026-07-31');

// badges + done maps union
m=R.mergeState({gam:{badges:{a:'x'},done:{'c/m1-l1':1}}},{gam:{badges:{b:'y'},done:{'c/m1-l2':1}}});
ok('badges union', m.gam.badges.a&&m.gam.badges.b);
ok('done union', m.gam.done['c/m1-l1']&&m.gam.done['c/m1-l2']);

// progress: passed modules OR, finalPassed OR, name kept
m=R.mergeState(
  {progress:{course:{passed:{m1:true},finalPassed:false,lastPage:'m1-quiz',name:'L'}}},
  {progress:{course:{passed:{m2:true},finalPassed:true,lastPage:'m2-l1',name:''}}});
ok('passed modules union', m.progress.course.passed.m1&&m.progress.course.passed.m2);
ok('finalPassed OR', m.progress.course.finalPassed===true);
ok('name kept from non-empty', m.progress.course.name==='L');

// review: higher Leitner box wins
m=R.mergeState({review:{'k':{box:2,due:'2026-07-10'}}},{review:{'k':{box:4,due:'2026-08-01'}}});
ok('review keeps higher box', m.review.k.box===4);

// imported courses union by id (no dupes)
m=R.mergeState({imported:[{id:'x',title:'X'}]},{imported:[{id:'x',title:'Xdupe'},{id:'y',title:'Y'}]});
ok('imported union unique by id', m.imported.length===2);

// bookmarks union by key; notes keep longer; marks union
m=R.mergeState(
  {bookmarks:[{k:'a'}],notes:{n:'short'},marks:{p:['one']}},
  {bookmarks:[{k:'a'},{k:'b'}],notes:{n:'a much longer note'},marks:{p:['one','two']}});
ok('bookmarks union by key', m.bookmarks.length===2);
ok('notes keep the longer text', m.notes.n==='a much longer note');
ok('marks union', m.marks.p.length===2);

// empty/undefined safe
m=R.mergeState(undefined,undefined);
ok('empty merge is safe', m&&m.gam&&m.progress);

// local device settings preferred
m=R.mergeState({settings:{theme:'dark',scale:1.2}},{settings:{theme:'light',scale:1}});
ok('local settings preferred', m.settings.theme==='dark'&&m.settings.scale===1.2);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
