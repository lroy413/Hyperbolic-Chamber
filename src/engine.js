





(function(){
"use strict";
var R=window.R;
var KEY='courseapp_v1';
/* The streak flame was the one filled, full-colour glyph left in the app. It keeps
   its warmth — that is the point of a streak — but as a stroke at the same weight
   as everything else, coloured rather than painted. */
var FLAME='<svg class="gi flamegi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a6 6 0 0 0 6-6c0-4-3-5.6-3-9 0 0-2.4 1.9-2.4 4.4C12.6 9 11 7 11 4.5 8.6 6.5 6 9.5 6 16a6 6 0 0 0 6 6Z"/></svg>';
function logoSVG(sz){sz=sz||26;return '<svg class="oblogo" width="'+sz+'" height="'+sz+'" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="obg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="var(--accent2)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs><path d="M 38.5 10.6 A 23 23 0 1 1 26.5 9.9" fill="none" stroke="url(#obg)" stroke-width="6.6" stroke-linecap="round"/><path d="M 26.5 9.9 c -5.2 -1.4 -7.2 4.2 -3.6 6.1 c 3.1 1.7 8.2 .2 11.2 -3.2 c -2.3 -1.4 -4.1 -2.3 -7.6 -2.9 z" fill="var(--accent)"/><circle cx="25" cy="12" r="1.6" fill="#fff"/></svg>';}
var PALETTES=[{id:'aurora',name:'Aurora',a:'#7356f0',b:'#22d3aa'},{id:'ember',name:'Ember',a:'#fb5607',b:'#ff477e'},{id:'verdant',name:'Verdant',a:'#16a34a',b:'#0d9488'},{id:'tide',name:'Tide',a:'#2563eb',b:'#06b6d4'},{id:'bloom',name:'Bloom',a:'#d6409f',b:'#7c5cff'},{id:'classic',name:'Classic',a:'#5b8cff',b:'#31c48d'}];
var DEF_GOAL=10;   // one lesson. Lessons here are 20-40 min, not 3.
function defGam(){return {xp:0,streak:0,best:0,goal:DEF_GOAL,freezes:1,today:'',todayXP:0,lastMet:'',done:{},tSpent:0,badges:{},perfects:0,reviewsDone:0};}
var store={progress:{},imported:[],recent:null,hidden:[],order:[],review:{},gam:defGam(),bookmarks:[],notes:{},marks:{},assignments:{},solo:{},paths:[],settings:{theme:'system',scale:1,palette:'aurora'}};
function load(){try{var s=localStorage.getItem(KEY);if(s){var o=JSON.parse(s);store.progress=o.progress||{};store.imported=Array.isArray(o.imported)?o.imported:[];store.recent=o.recent||null;store.hidden=Array.isArray(o.hidden)?o.hidden:[];store.order=Array.isArray(o.order)?o.order:[];store.review=o.review||{};store.gam=Object.assign(defGam(),o.gam||{});store.bookmarks=Array.isArray(o.bookmarks)?o.bookmarks:[];store.notes=o.notes||{};store.marks=o.marks||{};store.assignments=o.assignments||{};store.solo=o.solo||{};store.paths=Array.isArray(o.paths)?o.paths:[];store.settings=Object.assign({theme:'system',scale:1,palette:'aurora'},o.settings||{});}}catch(e){}}

/* ================= offline storage =================
   localStorage measures about 5 MB per origin and a single course can be 800 KB,
   so a real library would silently stop saving — setItem throws and the old code
   swallowed it. Course BODIES therefore live in IndexedDB (quota in the hundreds
   of MB), while localStorage keeps only lightweight summaries plus all the small,
   frequently-written state. If IndexedDB is unavailable we fall back to the old
   behaviour and warn on quota instead of failing silently. */
var IDB_NAME='oboros_courses', IDB_STORE='bodies';
var _idb=null,_idbTried=false,_useIdb=false,_courseSig='',_quotaWarned=false;
function idbOpen(){
  if(_idb)return Promise.resolve(_idb);
  if(_idbTried)return Promise.resolve(null);
  return new Promise(function(res){
    _idbTried=true;
    try{
      if(typeof indexedDB==='undefined'||!indexedDB)return res(null);
      var rq=indexedDB.open(IDB_NAME,1);
      rq.onupgradeneeded=function(){var d=rq.result;if(!d.objectStoreNames.contains(IDB_STORE))d.createObjectStore(IDB_STORE,{keyPath:'id'});};
      rq.onsuccess=function(){_idb=rq.result;_useIdb=true;res(_idb);};
      rq.onerror=function(){res(null);};
      rq.onblocked=function(){res(null);};
      setTimeout(function(){if(!_idb)res(null);},3000);
    }catch(e){res(null);}
  });
}
function idbTx(mode,fn){
  return idbOpen().then(function(db){
    if(!db)return null;
    return new Promise(function(res){
      try{
        var tx=db.transaction(IDB_STORE,mode);var os=tx.objectStore(IDB_STORE);var out=fn(os);
        tx.oncomplete=function(){res(out&&out.result!==undefined?out.result:out);};
        tx.onerror=function(){res(null);};tx.onabort=function(){res(null);};
      }catch(e){res(null);}
    });
  }).catch(function(){return null;});
}
function idbAllCourses(){return idbTx('readonly',function(os){return os.getAll?os.getAll():null;}).then(function(r){return Array.isArray(r)?r:[];});}
function persistCourses(){
  if(!_useIdb)return Promise.resolve(false);
  var list=(store.imported||[]).filter(function(c){return c&&c.id&&c.modules;});
  var keep={};list.forEach(function(c){keep[c.id]=1;});
  return idbTx('readwrite',function(os){
    var all=os.getAllKeys?os.getAllKeys():null;
    if(all)all.onsuccess=function(){(all.result||[]).forEach(function(k){if(!keep[k])os.delete(k);});};
    list.forEach(function(c){os.put(c);});
  }).then(function(){return true;});
}
function courseSig(){return (store.imported||[]).map(function(c){return c&&c.id;}).join('|');}
/* Pull bodies out of IndexedDB and reattach them to the summaries localStorage kept.
   Also migrates anyone whose bodies are still sitting in localStorage from before. */
function hydrateCourses(){
  var legacy=(store.imported||[]).some(function(c){return c&&c.modules;});
  return idbOpen().then(function(db){
    if(!db){_courseSig=courseSig();return false;}
    return idbAllCourses().then(function(rows){
      var byId={};rows.forEach(function(c){if(c&&c.id)byId[c.id]=c;});
      var out=[];
      (store.imported||[]).forEach(function(c){
        if(!c||!c.id)return;
        if(Array.isArray(c.modules)&&c.modules.length)out.push(c); // legacy body from localStorage
        else if(byId[c.id])out.push(byId[c.id]);  // body from IndexedDB
        // a summary with no body anywhere is dropped; migrateLibrary re-fetches it
      });
      store.imported=out;
      _courseSig=courseSig();
      return persistCourses().then(function(){if(legacy)save();return true;});
    });
  }).catch(function(){_courseSig=courseSig();return false;});
}
function storageEstimate(){
  var bytes=0;
  try{bytes=(localStorage.getItem(KEY)||'').length;}catch(e){}
  var courseBytes=0;
  try{courseBytes=JSON.stringify(store.imported||[]).length;}catch(e){}
  return {state:bytes,courses:courseBytes,count:(store.imported||[]).length,idb:_useIdb};
}
/* ------------------------------------------------------------------
   Installing, and asking the browser not to throw your progress away.

   By default a browser may evict everything a site has stored when the device
   runs short of space — which for this app means a streak, a year of notes and
   six downloaded courses, gone without warning. navigator.storage.persist()
   asks for an exemption. Chrome usually grants it silently once the app is
   installed or used regularly; Safari grants it on install. The answer is
   reported in Settings as it actually is, including "the browser did not say",
   rather than being claimed.
   ------------------------------------------------------------------ */
var PERSIST={state:'unknown',bytes:0,quota:0};
function checkPersist(){
  if(!navigator.storage||!navigator.storage.persisted){PERSIST.state='unsupported';return Promise.resolve(PERSIST);}
  return navigator.storage.persisted().then(function(p){
    PERSIST.state=p?'granted':'not-granted';
    if(navigator.storage.estimate)return navigator.storage.estimate().then(function(e){
      PERSIST.bytes=e.usage||0;PERSIST.quota=e.quota||0;return PERSIST;});
    return PERSIST;
  }).catch(function(){PERSIST.state='unknown';return PERSIST;});
}
function askPersist(){
  if(!navigator.storage||!navigator.storage.persist)return Promise.resolve(false);
  return navigator.storage.persist().then(function(ok){
    PERSIST.state=ok?'granted':'refused';return ok;
  }).catch(function(){return false;});
}
/* The browser fires this when it considers the app installable, and expects the
   event to be kept: there is no way to ask for the prompt later without it. */
var _installEvt=null,_installed=false;
function isStandalone(){
  try{
    return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||
      navigator.standalone===true;
  }catch(e){return false;}
}
function canInstall(){return !!_installEvt;}
function installState(){
  if(isStandalone())return 'installed';
  if(_installEvt)return 'ready';
  if(_installed)return 'installed';
  /* iOS never fires the event; the route there is Share → Add to Home Screen */
  var ios=/iPad|iPhone|iPod/.test(navigator.userAgent||'');
  return ios?'ios':'later';
}
function doInstall(){
  if(!_installEvt)return Promise.resolve(false);
  var e=_installEvt;_installEvt=null;
  e.prompt();
  return e.userChoice.then(function(c){
    var ok=c&&c.outcome==='accepted';
    if(ok){_installed=true;celebrate('Oboros is installed','It opens from your home screen now, with or without a connection.','done');}
    else toast('Not installed — you can add it later from Settings.');
    if(document.getElementById('installrow'))renderSettings();
    return ok;
  }).catch(function(){return false;});
}
function wireInstall(){
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();_installEvt=e;
    var r=document.getElementById('installrow');if(r)renderSettings();
  });
  window.addEventListener('appinstalled',function(){
    _installed=true;_installEvt=null;
    if(document.getElementById('installrow'))renderSettings();
  });
}
/* ---------- notes / highlights / bookmarks ---------- */
function skey(cid,page){return cid+'/'+page;}
function isBookmarked(cid,page){var k=skey(cid,page);return (store.bookmarks||[]).some(function(b){return b.k===k;});}
function toggleBookmark(cid,page){var k=skey(cid,page);var i=-1;for(var j=0;j<store.bookmarks.length;j++)if(store.bookmarks[j].k===k)i=j;
  if(i>-1){store.bookmarks.splice(i,1);save();return false;}
  store.bookmarks.push({k:k,c:cid,page:page,t:todayStr()});save();return true;}
function getNote(cid,page){return (store.notes||{})[skey(cid,page)]||'';}
function setNote(cid,page,txt){var k=skey(cid,page);txt=(txt||'').replace(/\s+$/,'');if(txt)store.notes[k]=txt;else delete store.notes[k];save();}
function getMarks(cid,page){return (store.marks||{})[skey(cid,page)]||[];}
function addMark(cid,page,txt){var k=skey(cid,page);if(!store.marks[k])store.marks[k]=[];store.marks[k].push(txt);save();}
function removeMark(cid,page,txt){var k=skey(cid,page);var arr=store.marks[k];if(!arr)return;var i=arr.indexOf(txt);if(i>-1)arr.splice(i,1);if(!arr.length)delete store.marks[k];save();}
function savedCount(){return (store.bookmarks||[]).length+Object.keys(store.notes||{}).length+Object.keys(store.marks||{}).length;}
function isLessonPage(page){return /-l\d+$/.test(page||'');}
/* ---------- streak / XP (gamification) ---------- */
function pad2(n){return (n<10?'0':'')+n;}
function todayStr(d){d=d||new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function dayDiff(a,b){if(!a||!b)return 999;var da=new Date(a+'T00:00:00'),db=new Date(b+'T00:00:00');return Math.round((db-da)/86400000);}
function addDays(dstr,n){var d=new Date(dstr+'T00:00:00');d.setDate(d.getDate()+n);return todayStr(d);}
function ensureDay(){var g=store.gam;var t=todayStr();if(g.today!==t){g.today=t;g.todayXP=0;save();}}
function currentStreak(){var g=store.gam;if(!g.lastMet)return 0;return dayDiff(g.lastMet,todayStr())<=1?(g.streak||0):0;}
/* The streak now advances on the first XP of the day — any lesson, quiz, review
   item or flashcard. Tying it to a daily XP target set people up to fail: these
   lessons are 20-40 minutes, so a three-lesson goal is a part-time enrolment, and
   a broken streak on a screen with an unlit flame is a guilt machine, not a nudge.
   The daily goal still exists, but as a depth target you can miss without penalty. */
/* XP no longer drives the streak — the daily warm-up does. Course work is deep
   and irregular by nature; the streak needs something you can do in ninety seconds. */
function awardXP(n){
  ensureDay();
  var g=store.gam;
  var goalWas=(g.todayXP||0)>=(g.goal||DEF_GOAL);
  g.xp=(g.xp||0)+n;g.todayXP=(g.todayXP||0)+n;
  if(!goalWas&&g.todayXP>=(g.goal||DEF_GOAL)){
    _cheerPending=true;
    setTimeout(function(){celebrate('Today is closed','The circle is complete — anything more is a bonus.','done');},240);
  }
  markActiveDay();
  save();
  if(!_questing)bumpQuest('xp',n);
  return false;}
function awardLesson(cid,page){
  if(!/-l\d+$/.test(page))return;
  touchCourse(cid);
  var key=cid+'/'+page;store.gam.done=store.gam.done||{};
  if(!store.gam.done[key]){
    var firstInCourse=!Object.keys(store.gam.done).some(function(k){return k.indexOf(cid+'/')===0;});
    store.gam.done[key]=1;awardXP(10);
    bumpQuest('lessons',1);
    if(firstInCourse)bumpQuest('newStarts',1);
    checkBadges();
  }
}
/* ---------- tokens + power-ups ---------- */
var TOKEN_EVERY=100;
var PERKS={hint:{cost:1,unlock:100,label:'Hint (50/50)',icon:'bulb'},peek:{cost:1,unlock:300,label:'Glossary peek',icon:'book'}};
function tokensEarned(){return Math.floor((store.gam.xp||0)/TOKEN_EVERY)+(store.gam.tokensBonus||0);}
function tokensLeft(){return Math.max(0,tokensEarned()-(store.gam.tSpent||0));}
function xpToNextToken(){var xp=store.gam.xp||0;return TOKEN_EVERY-(xp%TOKEN_EVERY);}
function perkUnlocked(id){return (store.gam.xp||0)>=PERKS[id].unlock;}
function spendTokens(n){if(tokensLeft()<n)return false;store.gam.tSpent=(store.gam.tSpent||0)+n;save();return true;}
/* ================= progression =================
   Four systems that reward different behaviours, so no single habit dominates:
     RANK    — total XP. The long arc. Never goes down.
     QUESTS  — three small goals, rerolled daily. The reason to open the app today.
     MASTERY — per-course retention that DECAYS. The reason to come back to a
               course you finished rather than only ever starting new ones.
     COMBO   — consecutive correct answers inside one quiz. In-the-moment tension.
*/
var RANKS=[
  {xp:0,     name:'Novice',      icon:'seedling'},
  {xp:150,   name:'Apprentice',  icon:'book'},
  {xp:400,   name:'Student',     icon:'pencil'},
  {xp:800,   name:'Practitioner',icon:'wrench'},
  {xp:1500,  name:'Adept',       icon:'target'},
  {xp:2600,  name:'Specialist',  icon:'lens'},
  {xp:4200,  name:'Scholar',     icon:'cap'},
  {xp:6500,  name:'Expert',      icon:'star'},
  {xp:10000, name:'Master',      icon:'crown'},
  {xp:15000, name:'Polymath',    icon:'orb'}
];
function rankFor(xp){xp=xp||0;var r=RANKS[0],i=0;for(i=0;i<RANKS.length;i++)if(xp>=RANKS[i].xp)r=RANKS[i];return r;}
function rankIndex(xp){var n=0;for(var i=0;i<RANKS.length;i++)if((xp||0)>=RANKS[i].xp)n=i;return n;}
function rankProgress(){
  var xp=store.gam.xp||0;var i=rankIndex(xp);
  var cur=RANKS[i],next=RANKS[i+1]||null;
  if(!next)return {rank:cur,next:null,pct:100,into:0,span:0,level:i+1};
  var span=next.xp-cur.xp,into=xp-cur.xp;
  return {rank:cur,next:next,pct:Math.max(0,Math.min(100,Math.round(into/span*100))),into:into,span:span,level:i+1};
}

/* ---------- daily quests ----------
   Deterministic from the date, so the same three appear on every device without
   any sync, and nobody can reroll by refreshing. */
/* Sized so all three fit one sitting of 20-40 minutes. A quest that asks for four
   lessons is asking for a two-hour evening — that is a course, not a daily habit. */
var QUESTS=[
  {id:'lessons1', label:'Read a lesson',           target:1,  xp:10, track:'lessons'},
  {id:'lessons2', label:'Read 2 lessons',          target:2,  xp:25, track:'lessons'},
  {id:'quiz1',    label:'Pass a module quiz',      target:1,  xp:25, track:'quizzes'},
  {id:'review5',  label:'Clear 5 review items',    target:5,  xp:15, track:'reviews'},
  {id:'review10', label:'Clear 10 review items',   target:10, xp:30, track:'reviews'},
  {id:'perfect1', label:'Score 100% on a quiz',    target:1,  xp:30, track:'perfects'},
  {id:'xp25',     label:'Earn 25 XP',              target:25, xp:10, track:'xp'},
  {id:'combo5',   label:'Answer 5 in a row right', target:5,  xp:20, track:'bestCombo'},
  {id:'flash10',  label:'Flip 10 flashcards',      target:10, xp:10, track:'flashes'},
  {id:'newcourse',label:'Open a course you have not started', target:1, xp:20, track:'newStarts'}
];
function dayHash(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return Math.abs(h);}
function todaysQuests(){
  var seed=dayHash(todayStr());
  var pool=QUESTS.slice(),out=[];
  for(var n=0;n<3&&pool.length;n++){
    var idx=(seed+n*7919)%pool.length;
    var q=pool.splice(idx,1)[0];
    // never show two quests that measure the same thing
    pool=pool.filter(function(p){return p.track!==q.track;});
    out.push(q);
  }
  return out;
}
function questState(){
  var g=store.gam;
  if(!g.quest||g.quest.day!==todayStr())g.quest={day:todayStr(),counts:{},claimed:{}};
  return g.quest;
}
var _questing=false;
function bumpQuest(track,n){
  // Quest rewards make total XP depend on which quests the date happens to draw.
  // Tests pin this off so they can assert exact XP for a single action.
  if(typeof window!=='undefined'&&window.OBOROS_NO_QUESTS)return [];
  var qs=questState();
  qs.counts[track]=(qs.counts[track]||0)+(n||1);
  var done=[];
  todaysQuests().forEach(function(q){
    if(qs.claimed[q.id])return;
    var have=track==='bestCombo'?Math.max(qs.counts.bestCombo||0,n||0):(qs.counts[q.track]||0);
    if(track==='bestCombo')qs.counts.bestCombo=have;
    if(have>=q.target){qs.claimed[q.id]=1;done.push(q);}
  });
  if(done.length){
    var g=store.gam;
    g.questsDone=(g.questsDone||0)+done.length;
    if(todaysQuests().every(function(q){return qs.claimed[q.id];}))g.sweeps=(g.sweeps||0)+1;
    _questing=true;   // quest rewards must not re-trigger the XP quest
    done.forEach(function(q,i){
      awardXP(q.xp);
      setTimeout(function(){celebrate('Quest complete',''+q.label+' · +'+q.xp+' XP');},i*450);
    });
    _questing=false;
  }
  save();
  return done;
}
function questProgress(q){
  var qs=questState();
  return {done:!!qs.claimed[q.id],have:Math.min(q.target,qs.counts[q.track]||0),target:q.target};
}
function questsRemaining(){var qs=questState();return todaysQuests().filter(function(q){return !qs.claimed[q.id];}).length;}

/* ---------- mastery ----------
   A course you passed six weeks ago and never revisited is not a course you still
   know. Mastery starts at the share of modules passed and decays with neglect;
   reviewing or re-reading refreshes it. */
var MASTERY_FULL_DAYS=21;   // stays at peak this long
var MASTERY_FLOOR=0.35;     // never drops below a third of what you earned
function touchCourse(cid){
  if(!cid)return;
  var g=store.gam;g.touch=g.touch||{};
  var was=masteryFor(cid);
  g.touch[cid]=todayStr();
  if(was&&was.stale)g.refreshes=(g.refreshes||0)+1;
  var hr=new Date().getHours();
  if(hr<5)g.night=(g.night||0)+1; else if(hr<7)g.early=(g.early||0)+1;
  save();
}
function masteryFor(cid){
  var c=getCourse(cid);if(!c)return null;
  var p=prog(cid);var tot=moduleCount(c);var done=completedCount(c);
  var earned=tot?done/tot:0;
  if(p.finalPassed)earned=1;
  if(earned<=0)return {pct:0,earned:0,fresh:1,stale:0,days:0};
  var last=(store.gam.touch||{})[cid]||p.lastSeen||todayStr();
  var days=Math.max(0,dayDiff(last,todayStr()));
  var fresh=days<=MASTERY_FULL_DAYS?1:Math.max(MASTERY_FLOOR,1-((days-MASTERY_FULL_DAYS)/60));
  return {pct:Math.round(earned*fresh*100),earned:Math.round(earned*100),fresh:fresh,stale:days>MASTERY_FULL_DAYS,days:days};
}
function masteryList(){
  return courses().map(function(c){var m=masteryFor(c.id);return m?{course:c,m:m}:null;})
    .filter(function(x){return x&&x.m.earned>0;})
    .sort(function(a,b){return b.m.pct-a.m.pct;});
}
function needsRefresh(){return masteryList().filter(function(x){return x.m.stale;});}

/* ---------- streak calendar ---------- */
function markActiveDay(){
  var g=store.gam;g.days=g.days||{};var t=todayStr();
  if(!g.days[t]){g.days[t]=1;save();}
}
function activeDays(n){
  var out=[],g=store.gam;var t=todayStr();
  for(var i=n-1;i>=0;i--){var d=addDays(t,-i);out.push({day:d,on:!!(g.days||{})[d],today:i===0});}
  return out;
}


/* ================= DAILY WARM-UP =================
   The streak lives here, not on the courses. A course lesson is 20-40 minutes;
   asking for that every day to keep a flame alive is a guilt machine. Five short
   general-knowledge questions is a real daily habit — and ATTEMPTING is enough to
   keep the streak. Correct answers are a bonus, not the price of entry. */
var WU_PER_DAY=5, WU_XP_ATTEMPT=3, WU_XP_CORRECT=2, WU_XP_PERFECT=5;
var WU_TIERS=[{id:'easy',label:'Easier',tiers:[1,2]},{id:'standard',label:'Standard',tiers:[1,2,3]},{id:'hard',label:'Harder',tiers:[2,3]}];
function wuBank(){return (window.WARMUP||[]).filter(function(q){return q&&q.id&&Array.isArray(q.o);});}
function wuLevel(){var l=(store.settings||{}).wuLevel;return WU_TIERS.filter(function(t){return t.id===l;})[0]||WU_TIERS[1];}
function wuState(){
  var g=store.gam;
  if(!g.wu||g.wu.day!==todayStr())g.wu={day:todayStr(),ids:null,ans:{},done:false,correct:0};
  return g.wu;
}
/* The day's five: drawn from what you have not seen, shuffled by the date so the
   set is stable across a reload and identical on every device you own. */
function wuToday(){
  var st=wuState();
  if(st.ids&&st.ids.length)return st.ids.map(wuGet).filter(Boolean);
  var g=store.gam;g.wuSeen=g.wuSeen||{};
  var lv=wuLevel();
  var pool=wuBank().filter(function(q){return lv.tiers.indexOf(q.t)>-1;});
  var unseen=pool.filter(function(q){return !g.wuSeen[q.id];});
  if(unseen.length<WU_PER_DAY){g.wuSeen={};unseen=pool.slice();}   // seen them all — start the cycle again
  var seed=dayHash(todayStr()+'|'+lv.id);
  var picked=[],used={};
  // spread across categories first — five grammar questions is a bad round
  for(var pass=0;pass<3&&picked.length<WU_PER_DAY;pass++){
    for(var i=0;i<unseen.length&&picked.length<WU_PER_DAY;i++){
      var idx=(seed+picked.length*7919+i*31)%unseen.length;
      var cand=unseen[idx];
      if(!cand)continue;
      if((used[cand.c]||0)>pass)continue;      // pass 0 = one per category, then relax
      used[cand.c]=(used[cand.c]||0)+1;
      picked.push(cand);unseen.splice(idx,1);
      i=-1;                                    // restart the scan against the shrunken pool
    }
  }
  st.ids=picked.map(function(q){return q.id;});
  save();
  return picked;
}
function wuGet(id){var b=wuBank();for(var i=0;i<b.length;i++)if(b[i].id===id)return b[i];return null;}
function wuDoneToday(){return !!wuState().done;}
function wuAnsweredCount(){var st=wuState();return Object.keys(st.ans||{}).length;}
/* Finishing the warm-up is what advances the streak. */
function wuFinish(){
  var st=wuState();
  if(st.done)return null;
  var qs=wuToday();
  var correct=0;
  qs.forEach(function(q){if(st.ans[q.id]===q.a)correct++;});
  st.correct=correct;st.done=true;
  var g=store.gam;
  g.wuSeen=g.wuSeen||{};qs.forEach(function(q){g.wuSeen[q.id]=1;});
  g.wuDays=(g.wuDays||0)+1;
  g.wuAnswered=(g.wuAnswered||0)+qs.length;
  g.wuCorrect=(g.wuCorrect||0)+correct;
  var adv=advanceStreak();
  var xp=WU_XP_ATTEMPT+correct*WU_XP_CORRECT+(correct===qs.length?WU_XP_PERFECT:0);
  awardXP(xp);
  if(correct===qs.length)g.wuPerfect=(g.wuPerfect||0)+1;
  save();checkBadges();
  return {correct:correct,total:qs.length,xp:xp,streak:currentStreak(),advanced:!!(adv&&adv.advanced),froze:!!(adv&&adv.froze),earned:!!(adv&&adv.earned)};
}
/* Streak bookkeeping, now owned by the warm-up rather than by XP. */
var FREEZE_EVERY=7, FREEZE_MAX=3;
function advanceStreak(){
  var g=store.gam;var today=todayStr();
  if(g.lastMet===today)return false;
  var diff=dayDiff(g.lastMet,today);
  var froze=false;
  if(!g.lastMet)g.streak=1;
  else if(diff===1)g.streak=(g.streak||0)+1;
  else if(diff===2&&(g.freezes||0)>0){g.streak=(g.streak||0)+1;g.freezes--;froze=true;}
  else g.streak=1;
  g.lastMet=today;g.best=Math.max(g.best||0,g.streak);
  // a freeze is earned every seventh consecutive day, capped so it never trivialises the streak
  var earned=false;
  if(g.streak>0&&g.streak%FREEZE_EVERY===0&&(g.freezes||0)<FREEZE_MAX){g.freezes=(g.freezes||0)+1;earned=true;}
  g.lastFroze=froze?today:(g.lastFroze||'');
  g.lastFreezeEarn=earned?today:(g.lastFreezeEarn||'');
  markActiveDay();save();
  return {advanced:true,froze:froze,earned:earned};
}
function wuAccuracy(){var g=store.gam;return g.wuAnswered?Math.round((g.wuCorrect||0)/g.wuAnswered*100):null;}


/* ================= CREDITS, GRADES & MILESTONES =================
   Long courses need a reward that matches their register. Streaks and quests suit
   a three-minute habit; forty hours of collegiate study deserves something that
   reads like an academic record, and that you visit rather than being interrupted by.
     CREDITS   accrue per passed module, weighted by its study hours
     GRADE     comes from the final exam score
     MILESTONE quiet quarter markers inside a course, worth a token each
*/
/* Study hours. Courses rarely declare them, so they are derived from the shape
   of the thing — modules, lessons and assessments — which is stable enough to
   quote and honest enough not to oversell. */
function courseHours(c){
  if(!c)return 0;
  if(typeof c.hours==='number'&&c.hours>0)return c.hours;
  // catalogue summaries carry a module *count*, whole courses carry the array
  if(!Array.isArray(c.modules))return 0;
  var mods=c.modules.length,lessons=0,quizzes=0;
  c.modules.forEach(function(m){lessons+=((m&&m.lessons)||[]).length;if(m&&m.quiz)quizzes++;});
  return Math.round(lessons*1.15+quizzes*0.6+(c.finalExam?1.5:0)+mods*0.4);
}
function courseLevel(c){
  var h=courseHours(c);
  return h>=34?'Advanced':h>=18?'Intermediate':'Introductory';
}
/* One credit per ten hours of coursework — which is what the transcript says, but
   not what this used to compute. Every module defaulted to ten hours and therefore
   to exactly one credit, so a 38-hour course was worth nine credits against a
   stated rule that says 3.8. Hours are now derived from the module's own content
   and the credit follows from them. Existing totals drop, because they were wrong. */
function moduleCredits(m){return Math.round(moduleHours(m)/10*10)/10;}
function finalCredits(c){return (c&&c.finalExam)?0.2:0;}
function courseCredits(c){var t=0;if(!c||!Array.isArray(c.modules))return 0;c.modules.forEach(function(m){t+=moduleCredits(m);});return Math.round((t+finalCredits(c))*10)/10;}
function earnedCredits(cid){
  var c=getCourse(cid);if(!c)return 0;
  var p=prog(cid),t=0;
  if(!Array.isArray(c.modules))return 0;
  c.modules.forEach(function(m,i){if(p.passed&&p.passed['m'+(i+1)])t+=moduleCredits(m);});
  if(p.finalPassed)t+=finalCredits(c);
  return Math.round(t*10)/10;
}
function totalCredits(){var t=0;courses().forEach(function(c){t+=earnedCredits(c.id);});return Math.round(t*10)/10;}
var GRADES=[[93,'A'],[90,'A-'],[87,'B+'],[83,'B'],[80,'B-'],[77,'C+'],[73,'C'],[70,'C-'],[0,'—']];
function gradeFor(pct){if(pct==null)return null;for(var i=0;i<GRADES.length;i++)if(pct>=GRADES[i][0])return GRADES[i][1];return '—';}
function transcriptRows(){
  return courses().map(function(c){
    var p=prog(c.id);var done=completedCount(c);var tot=moduleCount(c);
    return {course:c,modules:done,total:tot,credits:earnedCredits(c.id),max:courseCredits(c),
      finished:!!p.finalPassed,pct:p.finalPct!=null?p.finalPct:null,grade:p.finalPassed?gradeFor(p.finalPct):null,
      date:p.finalDate||''};
  }).filter(function(r){return r.modules>0||r.finished;})
    .sort(function(a,b){return (b.finished?1:0)-(a.finished?1:0)||b.credits-a.credits;});
}
function gpa(){
  var rows=transcriptRows().filter(function(r){return r.finished&&r.pct!=null;});
  if(!rows.length)return null;
  var w=0,sum=0;
  rows.forEach(function(r){w+=r.credits;sum+=r.pct*r.credits;});
  return w?Math.round(sum/w):null;
}
/* Quarter markers inside a course. One token each, announced once, never repeated. */
var MILESTONES=[[25,'A quarter through'],[50,'Halfway'],[75,'Home stretch'],[100,'Every module passed']];
function courseMilestones(cid){
  var c=getCourse(cid);if(!c)return [];
  var tot=moduleCount(c);var done=completedCount(c);
  var pct=tot?Math.round(done/tot*100):0;
  var hit=(store.gam.miles||{})[cid]||{};
  return MILESTONES.map(function(m){return {pct:m[0],label:m[1],reached:pct>=m[0],claimed:!!hit[m[0]]};});
}
function checkMilestones(cid){
  var c=getCourse(cid);if(!c)return [];
  var tot=moduleCount(c);if(!tot)return [];
  var pct=Math.round(completedCount(c)/tot*100);
  var g=store.gam;g.miles=g.miles||{};g.miles[cid]=g.miles[cid]||{};
  var fresh=[];
  MILESTONES.forEach(function(m){
    if(pct>=m[0]&&!g.miles[cid][m[0]]){g.miles[cid][m[0]]=todayStr();fresh.push(m);}
  });
  if(fresh.length){
    g.tokensBonus=(g.tokensBonus||0)+fresh.length;
    save();
    fresh.forEach(function(m,i){setTimeout(function(){toast(m[1]+' — '+R.esc(c.title)+' · +1 token');},i*500);});
  }
  return fresh;
}
/* ---------- distance to the next thing that matters ---------- */
function nextMilestoneLabel(c){
  var p=prog(c.id);var tot=moduleCount(c);var done=completedCount(c);
  if(p.finalPassed)return {main:'Certified',sub:courseCredits(c)+' credits'};
  if(!p.lastPage&&done===0)return {main:tot+' modules',sub:'not started'};
  if(done>=tot)return {main:'Final exam',sub:'all modules passed'};
  var seq=pageSeq(c);var at=p.lastPage?seq.indexOf(p.lastPage):0;
  if(at<0)at=0;
  // walk forward to the next quiz
  for(var i=at;i<seq.length;i++){
    var m=seq[i].match(/^m(\d+)-quiz$/);
    if(m){
      var n=parseInt(m[1],10);
      var lessonsLeft=0;
      for(var j=at;j<i;j++)if(/-l\d+$/.test(seq[j]))lessonsLeft++;
      /* When the caller has already said which module you are in, repeating the
         number reads like a stutter — "Module 6 · Lesson 2 · 2 lessons to the
         Module 6 quiz". `short` drops it; `main` keeps it for standalone use. */
      if(seq[at]===seq[i])return {main:'Module '+n+' quiz',short:'the quiz',sub:'pass to unlock the next module',mod:n};
      if(lessonsLeft===0)return {main:'Module '+n+' quiz',short:'quiz next',sub:'next up',mod:n};
      var lead=lessonsLeft+' lesson'+(lessonsLeft>1?'s':'')+' to the ';
      return {main:lead+'Module '+n+' quiz',short:lead+'quiz',sub:done+' of '+tot+' modules passed',mod:n};
    }
  }
  return {main:'Final exam',sub:done+' of '+tot+' modules passed'};
}

/* ---------- achievements / badges ---------- */
/* Every badge is one statistic against one threshold, so saying so out loud
   removes 26 hand-written closures and — more usefully — makes "how close am I"
   derivable. A wall of padlocks is not a reward; three you can nearly reach is. */
var BADGES=[
  {id:'first_lesson',icon:'flag',label:'First steps',desc:'Open your first lesson.',k:'lessons',t:1},
  {id:'quiz1',icon:'check',label:'Quiz cleared',desc:'Pass your first module quiz.',k:'modsPassed',t:1},
  {id:'perfect',icon:'target',label:'Flawless',desc:'Score 100% on a quiz.',k:'perfects',t:1},
  {id:'explorer',icon:'compass',label:'Explorer',desc:'Start two or more courses.',k:'started',t:2},
  {id:'streak3',icon:'flame',label:'Warming up',desc:'Reach a 3-day streak.',k:'best',t:3},
  {id:'streak7',icon:'flame',label:'On fire',desc:'Reach a 7-day streak.',k:'best',t:7},
  {id:'streak30',icon:'flame',label:'Unstoppable',desc:'Reach a 30-day streak.',k:'best',t:30},
  {id:'xp100',icon:'star',label:'Century',desc:'Earn 100 XP.',k:'xp',t:100},
  {id:'xp500',icon:'star',label:'High achiever',desc:'Earn 500 XP.',k:'xp',t:500},
  {id:'xp1000',icon:'crown',label:'Scholar',desc:'Earn 1,000 XP.',k:'xp',t:1000},
  {id:'reviewer',icon:'brain',label:'Memory athlete',desc:'Answer 25 spaced-review items.',k:'reviews',t:25},
  {id:'cert1',icon:'cap',label:'Certified',desc:'Earn a course certificate.',k:'certs',t:1},
  {id:'cert3',icon:'trophy',label:'Triple crown',desc:'Earn three course certificates.',k:'certs',t:3},
  {id:'combo10',icon:'bolt',label:'On a roll',desc:'Answer 10 in a row correctly in one quiz.',k:'combo',t:10},
  {id:'combo20',icon:'shield',label:'Untouchable',desc:'Answer 20 in a row correctly in one quiz.',k:'combo',t:20},
  {id:'quest1',icon:'sparkle',label:'Quest taker',desc:'Complete a daily quest.',k:'quests',t:1},
  {id:'quest10',icon:'briefcase',label:'Regular',desc:'Complete 10 daily quests.',k:'quests',t:10},
  {id:'questAll',icon:'sparkle',label:'Clean sweep',desc:'Complete all three quests in one day.',k:'sweeps',t:1},
  {id:'rank4',icon:'wrench',label:'Practitioner',desc:'Reach the Practitioner rank (800 XP).',k:'xp',t:800},
  {id:'rank7',icon:'cap',label:'Scholarly',desc:'Reach the Scholar rank (4,200 XP).',k:'xp',t:4200},
  {id:'mastery1',icon:'brain',label:'Kept sharp',desc:'Hold a course at 80%+ mastery.',k:'topMastery',t:80},
  {id:'refresh',icon:'refresh',label:'Nothing forgotten',desc:'Refresh a course that had gone stale.',k:'refreshes',t:1},
  {id:'days30',icon:'calendar',label:'A month in',desc:'Be active on 30 separate days.',k:'activeDays',t:30},
  {id:'reviewer100',icon:'brain',label:'Long memory',desc:'Answer 100 spaced-review items.',k:'reviews',t:100},
  {id:'nightowl',icon:'moon',label:'Night owl',desc:'Finish a lesson after midnight.',k:'night',t:1},
  {id:'earlybird',icon:'sunrise',label:'Early bird',desc:'Finish a lesson before 7am.',k:'early',t:1}
];
BADGES.forEach(function(b){b.test=function(s){return (s[b.k]||0)>=b.t;};});
function badgeProgress(b,s){
  var have=Math.min(s[b.k]||0,b.t);
  return {have:have,target:b.t,pct:Math.round(have/b.t*100)};
}
function badgeStats(){
  var started=0,certs=0,modsPassed=0;
  courses().forEach(function(c){var pr=prog(c.id);var d=completedCount(c);if(pr.lastPage||d>0)started++;if(pr.finalPassed)certs++;modsPassed+=d;});
  var g=store.gam;
  var top=0;masteryList().forEach(function(x){if(x.m.pct>top)top=x.m.pct;});
  return {lessons:Object.keys(g.done||{}).length,modsPassed:modsPassed,perfects:g.perfects||0,
    started:started,best:g.best||0,xp:g.xp||0,reviews:g.reviewsDone||0,certs:certs,
    combo:g.bestCombo||0,quests:g.questsDone||0,sweeps:g.sweeps||0,
    topMastery:top,refreshes:g.refreshes||0,activeDays:Object.keys(g.days||{}).length,
    night:g.night||0,early:g.early||0};
}
function earnedBadges(){var s=badgeStats();return BADGES.filter(function(b){return b.test(s);});}
function checkBadges(){
  var g=store.gam;g.badges=g.badges||{};var s=badgeStats();var newly=[];
  BADGES.forEach(function(b){if(b.test(s)&&!g.badges[b.id]){g.badges[b.id]=todayStr();newly.push(b);}});
  if(newly.length){save();newly.forEach(function(b,i){setTimeout(function(){toast('Badge unlocked — '+b.label);},i*300);});}
  return newly;
}
/* ---------- spaced repetition ---------- */
var REV_IV=[0,1,2,4,7,15,30];
function parseQuizKey(key){var m=key.match(/^quiz_(.+)_m(\d+)$/);if(m)return {cid:m[1],qk:'m'+m[2]};var f=key.match(/^final_(.+)$/);if(f)return {cid:f[1],qk:'final'};return null;}
function getQuestion(cid,qk,qi){var c=getCourse(cid);if(!c)return null;try{if(qk==='final')return c.finalExam.questions[qi];var n=parseInt(qk.slice(1),10);return c.modules[n-1].quiz.questions[qi];}catch(e){return null;}}
function updateReviewItem(id,cid,qk,qi,correct){var r=store.review[id]||{c:cid,k:qk,i:qi,box:1};r.box=correct?Math.min((r.box||1)+1,6):1;r.due=addDays(todayStr(),REV_IV[r.box]||1);store.review[id]=r;}
function reviewDue(){var today=todayStr();var out=[];for(var id in store.review){var r=store.review[id];if(!r||isHidden(r.c))continue;if(!r.due||dayDiff(r.due,today)>=0){var q=getQuestion(r.c,r.k,r.i);var c=getCourse(r.c);if(q&&c)out.push({id:id,c:r.c,k:r.k,i:r.i,q:q,courseTitle:c.title});}}out.sort(function(a,b){var da=store.review[a.id].due||'',db=store.review[b.id].due||'';return da<db?-1:1;});return out;}
/* ---- nav icons (stroke, inherit color) ---- */
function _ic(d){return '<svg class="nvic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';}
var IC={
  design:_ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  home:_ic('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  store:_ic('<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9h16v11H4z"/><path d="M9 13h6"/>'),
  review:_ic('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/>'),
  saved:_ic('<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>'),
  rewards:_ic('<circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/>'),
  settings:_ic('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2.2-1.3L14 1h-4l-.3 2.4a7 7 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.3l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.2 1.3L10 23h4l.3-2.4a7 7 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6A7 7 0 0 0 19 12z"/>'),
  search:_ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>'),
  close:_ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  track:_ic('<path d="M4 19h4V9H4zM10 19h4V4h-4zM16 19h4v-7h-4z"/>')
};
/* ------------------------------------------------------------------
   One icon system.

   The nav was drawn as 1.8px stroke glyphs while quests, badges, ranks, study
   modes and perks used system emoji. Emoji are full-colour, differently drawn on
   every platform, and share no line weight with anything else here — which is the
   single loudest thing telling you a small team made this. These are the same
   grid and the same stroke as the nav, so the whole app is one hand.
   ------------------------------------------------------------------ */
function _g(d){return '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+d+'</svg>';}
var G={
  flame:'<path d="M12 22a6 6 0 0 0 6-6c0-4-3-5.6-3-9 0 0-2.4 1.9-2.4 4.4C12.6 9 11 7 11 4.5 8.6 6.5 6 9.5 6 16a6 6 0 0 0 6 6Z"/>',
  star:'<path d="m12 3.2 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.4l5.9-.8Z"/>',
  crown:'<path d="m3.2 7.8 4 3.4L12 4.6l4.8 6.6 4-3.4L19.2 19H4.8Z"/><path d="M4.8 19h14.4"/>',
  book:'<path d="M4 5.6A2.6 2.6 0 0 1 6.6 3H19.4v13.4H6.6A2.6 2.6 0 0 0 4 19Z"/><path d="M4 19a2.6 2.6 0 0 0 2.6 2.6h12.8v-5.2"/>',
  check:'<circle cx="12" cy="12" r="8.6"/><path d="m8.1 12.4 2.7 2.7 5.1-5.6"/>',
  target:'<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.1"/>',
  compass:'<circle cx="12" cy="12" r="8.6"/><path d="m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3Z"/>',
  brain:'<path d="M9.6 3.8A2.9 2.9 0 0 0 7 8.1a3.1 3.1 0 0 0-1.4 5A2.9 2.9 0 0 0 12 19.6V6.4a2.7 2.7 0 0 0-2.4-2.6Z"/><path d="M14.4 3.8A2.9 2.9 0 0 1 17 8.1a3.1 3.1 0 0 1 1.4 5A2.9 2.9 0 0 1 12 19.6"/>',
  cap:'<path d="M2.4 9.4 12 5.2l9.6 4.2L12 13.6Z"/><path d="M6.4 11.4V16c0 1.4 2.5 2.5 5.6 2.5s5.6-1.1 5.6-2.5v-4.6"/><path d="M21.2 9.8v5.4"/>',
  trophy:'<path d="M7.8 4h8.4v4.8a4.2 4.2 0 0 1-8.4 0Z"/><path d="M7.8 5.6H5.4a2.4 2.4 0 0 0 2.4 4.2"/><path d="M16.2 5.6h2.4a2.4 2.4 0 0 1-2.4 4.2"/><path d="M12 13v3.8"/><path d="M8.8 20.2h6.4"/>',
  bolt:'<path d="M13.3 2.6 4.9 13.4h5.9l-.9 8 8.4-10.8h-5.9Z"/>',
  shield:'<path d="m12 3.2 7.6 3v5.4c0 4.6-3.1 8.3-7.6 9.6-4.5-1.3-7.6-5-7.6-9.6V6.2Z"/><path d="m9 12.2 2.2 2.2 4-4.3"/>',
  calendar:'<rect x="3.4" y="5.2" width="17.2" height="15.4" rx="2.6"/><path d="M3.4 10.2h17.2"/><path d="M8.2 3v4M15.8 3v4"/>',
  refresh:'<path d="M20.6 12a8.6 8.6 0 1 1-2.9-6.4"/><path d="M20.6 3.6v5h-5"/>',
  moon:'<path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8 8.6 8.6 0 1 0 20.2 14.6Z"/>',
  sunrise:'<path d="M12 3.4v3.4"/><path d="m6.2 9.6 2.3 2.3"/><path d="m17.8 9.6-2.3 2.3"/><path d="M7.4 17a4.6 4.6 0 0 1 9.2 0"/><path d="M3 17h18"/><path d="M5.4 20.6h13.2"/>',
  briefcase:'<rect x="3.2" y="7.4" width="17.6" height="12.4" rx="2.6"/><path d="M8.8 7.4V6a2 2 0 0 1 2-2h2.4a2 2 0 0 1 2 2v1.4"/><path d="M3.2 12.6h17.6"/>',
  sparkle:'<path d="m11 3.4 1.6 4.3 4.3 1.6-4.3 1.6L11 15.2 9.4 10.9 5.1 9.3l4.3-1.6Z"/><path d="m18.2 14.6.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8Z"/>',
  wrench:'<path d="M15.4 3.4a5.6 5.6 0 0 0-5 8.2l-6.7 6.7a2.1 2.1 0 0 0 3 3l6.7-6.7a5.6 5.6 0 0 0 7-7l-3 3-3-3Z"/>',
  seedling:'<path d="M12 21v-6.6"/><path d="M12 14.4c0-3.4-2.8-6.2-6.2-6.2 0 3.4 2.8 6.2 6.2 6.2Z"/><path d="M12 14.4c0-4 3.2-7.2 7.2-7.2 0 4-3.2 7.2-7.2 7.2Z"/>',
  pencil:'<path d="M12 20.2h8.8"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L6.9 19.1l-4 1 1-4Z"/>',
  lens:'<circle cx="10.8" cy="10.8" r="6.6"/><path d="m15.6 15.6 5 5"/><path d="M10.8 7.8v6M7.8 10.8h6"/>',
  orb:'<circle cx="12" cy="12" r="8.6"/><path d="M12 3.4c2.4 2.4 3.8 5.4 3.8 8.6S14.4 18.2 12 20.6c-2.4-2.4-3.8-5.4-3.8-8.6S9.6 5.8 12 3.4Z"/><path d="M3.5 12h17"/>',
  token:'<circle cx="12" cy="12" r="8.6"/><path d="M12 7v10"/><path d="M14.9 9.3c-.5-.9-1.6-1.4-2.9-1.4-1.7 0-2.8.9-2.8 2.1 0 3 5.7 1.6 5.7 4.5 0 1.3-1.2 2.2-2.9 2.2-1.3 0-2.4-.5-2.9-1.5"/>',
  bulb:'<path d="M9.6 17.4h4.8"/><path d="M10.4 20.4h3.2"/><path d="M12 3.2a5.9 5.9 0 0 0-3.4 10.7c.5.4.8 1 .8 1.6v.9h5.2v-.9c0-.6.3-1.2.8-1.6A5.9 5.9 0 0 0 12 3.2Z"/>',
  snow:'<path d="M12 2.6v18.8"/><path d="m4 7.4 16 9.2"/><path d="m20 7.4-16 9.2"/><path d="m12 6.4 2.2-2.2M12 6.4 9.8 4.2M12 17.6l2.2 2.2M12 17.6l-2.2 2.2"/>',
  cards:'<rect x="7.4" y="3.4" width="13.2" height="15.2" rx="2.6"/><path d="M4 6.8v11.6a3.2 3.2 0 0 0 3.2 3.2h8.4"/>',
  pair:'<rect x="3.4" y="3.4" width="8.6" height="8.6" rx="2.4"/><rect x="12" y="12" width="8.6" height="8.6" rx="2.4"/><path d="M12.6 7.7h3.6a2 2 0 0 1 2 2v2.1"/>',
  list:'<path d="M8.4 6h11.8M8.4 12h11.8M8.4 18h11.8"/><circle cx="4.2" cy="6" r="1.3"/><circle cx="4.2" cy="12" r="1.3"/><circle cx="4.2" cy="18" r="1.3"/>',
  flag:'<path d="M5.2 21.4V3.2"/><path d="M5.2 4.4h11.4l-1.7 3.6 1.7 3.6H5.2Z"/>',
  clock:'<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/>',
  lock:'<rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.6"/><path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8"/>',
  bubble:'<path d="M20.6 12.6a7.6 7.6 0 0 1-7.6 7.6H8l-4.6 2.2 1-4.5A7.6 7.6 0 0 1 13 5a7.6 7.6 0 0 1 7.6 7.6Z"/>',
  chev:'<path d="m9 5.5 7 6.5-7 6.5"/>',
  bookmark:'<path d="M6.4 3.4h11.2a1 1 0 0 1 1 1v16.2l-6.6-3.8-6.6 3.8V4.4a1 1 0 0 1 1-1Z"/>',
  expand:'<path d="M14.6 3.4h6v6"/><path d="M9.4 20.6h-6v-6"/><path d="m20.6 3.4-7 7"/><path d="m3.4 20.6 7-7"/>'
};
function gi(name){return _g(G[name]||G.star);}
/* Which glyph stands for what — one table so a badge, a quest and a rank that
   mean the same thing never end up drawn differently. */
var QICON2={lessons:'book',quizzes:'check',reviews:'refresh',perfects:'target',
  xp:'bolt',bestCombo:'flame',flashes:'cards',newStarts:'compass'};
var CAT_MAP={'app-builder':'Technology','stock-charts':'Finance','personal-finance':'Finance','everyday-negotiation':'Business'};
function courseCategory(c){return (c&&(c.category||CAT_MAP[c.id]))||'General';}
function reviewDueCount(){return reviewDue().length;}
function orderedCourses(){var cs=courses();var ord=store.order||[];return cs.slice().sort(function(a,b){var ia=ord.indexOf(a.id),ib=ord.indexOf(b.id);if(ia<0)ia=999;if(ib<0)ib=999;return ia-ib;});}
function save(){
  // course bodies go to IndexedDB; localStorage keeps summaries so the library
  // still renders on the very first paint, before the async hydrate lands
  var sig=courseSig();
  if(sig!==_courseSig){_courseSig=sig;persistCourses();}
  var payload={};
  Object.keys(store).forEach(function(k){if(k!=='imported')payload[k]=store[k];});
  payload.imported=_useIdb?(store.imported||[]).map(summarise):(store.imported||[]);
  try{localStorage.setItem(KEY,JSON.stringify(payload));}
  catch(e){
    // out of room: shed the bodies from localStorage and tell the user once
    try{payload.imported=(store.imported||[]).map(summarise);localStorage.setItem(KEY,JSON.stringify(payload));}
    catch(e2){if(!_quotaWarned){_quotaWarned=true;toast('This device is out of storage — progress may not save. Remove a course to free space.');}}
  }
  schedulePush();
}
/* ================= backend / accounts / sync ================= */
/* All of this is inert until a backend is configured (window.COURSEAPP_BACKEND
   with url+anonKey), OR a custom adapter is injected (window.COURSEAPP_ADAPTER,
   used by tests). With neither, the app is 100% local/offline exactly as before. */
var BACKEND=window.COURSEAPP_BACKEND||{url:'',anonKey:''};
function backendConfigured(){return !!(BACKEND.url&&BACKEND.anonKey);}
function backendEnabled(){return !!(adapter);}
var adapter=null;      // {auth:{...}, pullState, pushState, listCatalog, getCourse}
var session=null;      // {userId,email} when signed in
var syncState='off';   // 'off' | 'syncing' | 'ok' | 'error'
var pushT=null;
function schedulePush(){if(!session||!adapter)return;clearTimeout(pushT);pushT=setTimeout(pushRemote,1500);}
/* What actually goes over the wire. Course bodies are NOT synced — a single course
   is up to 800 KB, and pushing the whole library on every XP tick would be megabytes
   per save. We send the id list instead; the other device re-fetches bodies from the
   catalogue it can already reach. Payload stays a few KB no matter how many courses. */
function syncPayload(){
  var out={};
  Object.keys(store).forEach(function(k){if(k!=='imported')out[k]=store[k];});
  out.importedIds=(store.imported||[]).map(function(c){return c&&c.id;}).filter(Boolean);
  return out;
}
/* Turn a Postgres error into something a human can act on. */
function pgErr(e){
  var code=(e&&e.code)||'';var msg=(e&&e.message)||'Unknown error';
  var hint=
    code==='42P01'||/does not exist/i.test(msg) ? 'The user_state table is missing. Run the setup SQL in Supabase.' :
    code==='42501'||/row-level security|permission denied/i.test(msg) ? 'Blocked by row-level security. The three user_state policies are missing or wrong.' :
    code==='PGRST301'||/JWT|token/i.test(msg) ? 'Your session expired. Sign out and back in.' :
    msg;
  var err=new Error(hint);err.code=code;err.raw=msg;return err;
}
var _pushFails=0,_retryT=null,lastSyncError='';
function pushRemote(){
  if(!session||!adapter)return;
  clearTimeout(_retryT);
  syncState='syncing';updateAcctChip();
  adapter.pushState(session.userId,syncPayload()).then(function(){
    _pushFails=0;lastSyncError='';syncState='ok';updateAcctChip();
  }).catch(function(e){
    lastSyncError=(e&&e.message)||'Could not reach the server.';
    syncState='error';updateAcctChip();
    // a genuine retry, since the UI promises one — backs off 5s, 15s, 45s, then 2m
    _pushFails++;
    var wait=Math.min(120000,5000*Math.pow(3,Math.min(_pushFails-1,3)));
    _retryT=setTimeout(function(){if(session&&adapter)pushRemote();},wait);
  });
}
/* Pull down any course this account owns on another device but this one is missing. */
function restoreSyncedCourses(ids){
  if(!ids||!ids.length)return Promise.resolve(false);
  var have={};
  [].concat(store.imported||[],window.BUILTIN_COURSES||[]).forEach(function(c){if(c&&c.id)have[c.id]=1;});
  var missing=ids.filter(function(id){return id&&!have[id];});
  if(!missing.length)return Promise.resolve(false);
  return Promise.all(missing.map(function(id){
    return Promise.resolve().then(function(){return catalogGet(id);}).catch(function(){return null;});
  })).then(function(list){
    var added=0;
    list.forEach(function(c){if(c&&c.id&&c.modules&&!have[c.id]){store.imported.push(c);have[c.id]=1;added++;}});
    if(added)save();
    return added>0;
  });
}
function syncOnLogin(){if(!session||!adapter)return;syncState='syncing';updateAcctChip();
  adapter.pullState(session.userId).then(function(remote){
    var want=[];
    if(remote&&typeof remote==='object'){want=R.importedIds(remote);store=R.mergeState(store,remote);delete store.importedIds;}
    try{localStorage.setItem(KEY,JSON.stringify(store));}catch(e){}
    syncState='ok';applySettings();render();
    if(session&&adapter)adapter.pushState(session.userId,syncPayload()).catch(function(){});
    // course bodies arrive after the UI is already usable
    restoreSyncedCourses(want).then(function(changed){if(changed)softRender();});
  }).catch(function(e){lastSyncError=(e&&e.message)||'Could not reach the server.';syncState='error';updateAcctChip();});}
function onAuth(user){
  if(user){session={userId:user.id,email:user.email||''};syncOnLogin();}
  else{session=null;syncState='off';}
  updateAcctChip();
  if((location.hash||'').indexOf('#account')===0)renderAccount();
}
function wireAdapter(ad){adapter=ad;
  try{if(ad.auth&&ad.auth.onChange)ad.auth.onChange(onAuth);}catch(e){}
  var cur=null;try{cur=ad.auth&&ad.auth.current&&ad.auth.current();}catch(e){}
  if(cur&&cur.then){cur.then(function(u){if(u)onAuth(u);});}
  else if(cur)onAuth(cur);
  updateAcctChip();
}
function initBackend(){
  if(window.COURSEAPP_ADAPTER){wireAdapter(window.COURSEAPP_ADAPTER);return;}
  if(!backendConfigured())return;
  loadSupabase(function(client){if(client)wireAdapter(supabaseAdapter(client));});
}
var _sbLoading=false;
function loadSupabase(cb){
  if(window.supabase&&window.supabase.createClient){return cb(mkClient());}
  if(_sbLoading){var t=setInterval(function(){if(window.supabase&&window.supabase.createClient){clearInterval(t);cb(mkClient());}},150);return;}
  _sbLoading=true;var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  // Sign-in needs the network by definition. Offline is an expected, supported
  // state now, so don't alarm someone whose downloaded courses are working fine.
  s.onload=function(){cb(mkClient());};
  s.onerror=function(){if(!isOffline())toast('Could not load sign-in. Check your connection.');cb(null);};
  document.head.appendChild(s);
}
var _client=null;
function mkClient(){if(_client)return _client;_client=window.supabase.createClient(BACKEND.url,BACKEND.anonKey);return _client;}
/* Supabase implementation of the adapter interface */
function supabaseAdapter(client){
  return {
    auth:{
      signInPassword:function(email,pw){return client.auth.signInWithPassword({email:email,password:pw});},
      signUp:function(email,pw){return client.auth.signUp({email:email,password:pw});},
      signInGoogle:function(){return client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href.split('#')[0]}});},
      signOut:function(){return client.auth.signOut();},
      current:function(){return client.auth.getUser().then(function(r){return r&&r.data&&r.data.user?r.data.user:null;});},
      onChange:function(cb){client.auth.onAuthStateChange(function(_e,sessionObj){cb(sessionObj&&sessionObj.user?sessionObj.user:null);});}
    },
    // supabase-js RESOLVES with {data,error} instead of rejecting, so a missing
    // table or a blocking RLS policy looked like success and the app reported
    // "up to date" while nothing was written. Turn errors back into rejections.
    pullState:function(uid){return client.from('user_state').select('data').eq('user_id',uid).maybeSingle().then(function(r){
      if(r&&r.error&&r.error.code!=='PGRST116')throw pgErr(r.error);
      return r&&r.data?r.data.data:null;});},
    pushState:function(uid,data){return client.from('user_state').upsert({user_id:uid,data:data,updated_at:new Date().toISOString()}).then(function(r){
      if(r&&r.error)throw pgErr(r.error);
      return r;});},
    listCatalog:function(){return client.from('catalog_courses').select('id,title,subtitle,tagline,accent,price,author').eq('published',true).order('title').then(function(r){
      if(r&&r.error)return [];   // no catalog table is fine — the files serve the store
      return (r&&r.data)||[];});},
    getCourse:function(id){return client.from('catalog_courses').select('data').eq('id',id).maybeSingle().then(function(r){
      if(r&&r.error)return null;
      return r&&r.data?r.data.data:null;});}
  };
}
function applySettings(){
  var st=store.settings||{theme:'system',scale:1};
  if(st.theme==='light'||st.theme==='dark')document.documentElement.setAttribute('data-theme',st.theme);
  else document.documentElement.removeAttribute('data-theme');
  var pal=st.palette||'aurora';
  if(pal&&pal!=='aurora')document.documentElement.setAttribute('data-palette',pal);
  else document.documentElement.removeAttribute('data-palette');
  var sc=st.scale||1; if(app){app.style.zoom=sc; app.style.fontSize='';}
}
function allCourses(){return (window.BUILTIN_COURSES||[]).concat(store.imported||[]);}
function isHidden(id){return (store.hidden||[]).indexOf(id)>-1;}
function isBuiltin(c){return (window.BUILTIN_COURSES||[]).indexOf(c)>-1;}
function courses(){return allCourses().filter(function(c){return !isHidden(c.id);});}
function getCourse(id){var a=allCourses();for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
function prog(id){if(!store.progress[id])store.progress[id]={passed:{},finalPassed:false,lastPage:'',name:''};return store.progress[id];}

var toastEl;
function toast(t,_try){
  /* a celebration owns the screen while it runs; a toast underneath it reads as clutter,
     so the small notice waits its turn rather than competing. */
  _try=_try||0;
  if(_try<16&&(_cheerPending||(_cheerEl&&_cheerEl.classList.contains('on')))){
    setTimeout(function(){toast(t,_try+1);},260);return;}
  if(!toastEl){toastEl=document.createElement('div');toastEl.id='toast';document.body.appendChild(toastEl);}toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(toastEl._t);toastEl._t=setTimeout(function(){toastEl.classList.remove('show');},2600);}

/* ------------------------------------------------------------------
   Three moments where the app says something happened.

   Nothing acknowledged closing the day, finishing a quest or passing a module —
   an app about persistence that never notices persistence. The mark is a snake
   closing a circle, so the celebration is that circle closing: one ring drawing
   itself shut behind a line of text, gone in under two seconds. Anyone who has
   asked for less motion gets the sentence and no ring.
   ------------------------------------------------------------------ */
var _cheerEl=null,_cheerPending=false;
function celebrate(title,sub,tone){
  _cheerPending=false;
  if(!_cheerEl){
    _cheerEl=document.createElement('div');_cheerEl.id='cheer';
    _cheerEl.setAttribute('role','status');_cheerEl.setAttribute('aria-live','polite');
    document.body.appendChild(_cheerEl);
  }
  /* a toast already on screen is not lost, it is postponed — the moment gets the
     screen to itself and the small notice comes back after it */
  if(toastEl&&toastEl.classList.contains('show')){
    var held=toastEl.textContent;
    toastEl.classList.remove('show');clearTimeout(toastEl._t);
    setTimeout(function(){toast(held);},80);
  }
  var acc=tone==='warm'?'var(--warn)':tone==='done'?'var(--accent2)':'var(--accent)';
  _cheerEl.className='cheer '+(tone||'');
  _cheerEl.innerHTML='<div class="chin">'
    +'<span class="chring">'+snakeRing(100,66,acc,'','cheer')+'</span>'
    +'<b>'+R.esc(title)+'</b>'
    +(sub?'<small>'+R.esc(sub)+'</small>':'')+'</div>';
  // restart the animation even if one is already running
  void _cheerEl.offsetWidth;
  _cheerEl.classList.add('on');
  clearTimeout(_cheerEl._t);
  _cheerEl._t=setTimeout(function(){_cheerEl.classList.remove('on');},1900);
}
function moduleCount(c){return (c&&Array.isArray(c.modules))?c.modules.length:0;}
function passedModule(c,n){return !!prog(c.id).passed['m'+n];}
function allPassed(c){for(var n=1;n<=moduleCount(c);n++)if(!passedModule(c,n))return false;return true;}
/* ------------------------------------------------------------------
   Modules that stand on their own.

   The strongest predictor of not finishing a course is its length, and these
   run 38 to 80 hours. A module is 3 to 5 hours, has its own objectives, three
   lessons and its own quiz, and already carries its own credit — so there is no
   reason it has to be reached by grinding through everything before it. Opening
   one on its own lifts the sequential lock for that module and nothing else;
   the course's own order is untouched for anyone following it.
   ------------------------------------------------------------------ */
function soloSet(cid){store.solo=store.solo||{};store.solo[cid]=store.solo[cid]||{};return store.solo[cid];}
function isSolo(cid,n){return !!soloSet(cid)['m'+n];}
function openSolo(cid,n){var s=soloSet(cid);if(!s['m'+n]){s['m'+n]=todayStr();save();}}
function soloModules(cid){var s=soloSet(cid),out=[];for(var k in s){var m=/^m(\d+)$/.exec(k);if(m)out.push(parseInt(m[1],10));}return out.sort(function(a,b){return a-b;});}

/* ---------------- custom paths ("Design your learning") ---------------- */
function paths(){if(!Array.isArray(store.paths))store.paths=[];return store.paths;}
function getPath(id){var l=paths();for(var i=0;i<l.length;i++)if(l[i].id===id)return l[i];return null;}
function pathKey(cid,n){return cid+'#'+n;}
function inAnyPath(cid,n){
  var k=pathKey(cid,n),l=paths();
  for(var i=0;i<l.length;i++){var it=l[i].items||[];
    for(var j=0;j<it.length;j++)if(pathKey(it[j].c,it[j].n)===k)return true;}
  return false;
}
function newPath(name){
  var id='p'+Math.abs(hashStr(name+'|'+paths().length+'|'+todayStr())).toString(36).slice(0,8);
  while(getPath(id))id=id+'x';
  var p={id:id,name:name||'Untitled path',items:[],created:todayStr()};
  paths().push(p);save();return p;
}
function deletePath(id){store.paths=paths().filter(function(p){return p.id!==id;});save();}
function pathAdd(p,cid,n){
  p.items=p.items||[];
  if(p.items.some(function(i){return i.c===cid&&i.n===n;}))return false;
  p.items.push({c:cid,n:n});save();return true;
}
function pathRemove(p,cid,n){
  p.items=(p.items||[]).filter(function(i){return !(i.c===cid&&i.n===n);});save();
}
function pathMove(p,idx,delta){
  var it=p.items||[],to=idx+delta;
  if(to<0||to>=it.length)return;
  var t=it[idx];it[idx]=it[to];it[to]=t;save();
}
/* Resolve to live course objects, dropping anything whose course has since been
   removed from the library — a path must never be able to crash a page. */
function pathRows(p){
  return (p&&p.items||[]).map(function(i){
    var c=getCourse(i.c);if(!c||!Array.isArray(c.modules))return null;
    var mod=c.modules[i.n-1];if(!mod)return null;
    return {c:c,n:i.n,mod:mod,passed:passedModule(c,i.n),credits:moduleCredits(mod)};
  }).filter(Boolean);
}
function pathStats(p){
  var rows=pathRows(p),done=0,cr=0,earned=0,hrs=0;
  rows.forEach(function(r){
    cr+=r.credits;hrs+=moduleHours(r.mod);
    if(r.passed){done++;earned+=r.credits;}
  });
  return {rows:rows,total:rows.length,done:done,
    pct:rows.length?Math.round(done/rows.length*100):0,
    credits:Math.round(cr*10)/10,earned:Math.round(earned*10)/10,
    hours:Math.round(hrs),complete:rows.length>0&&done===rows.length};
}
function moduleHours(m){
  if(!m)return 0;
  if(m.hours)return m.hours;
  var lessons=((m.lessons)||[]).length;
  return Math.round((lessons*1.15+(m.quiz?0.6:0)+0.4)*10)/10;
}
/* ------------------------------------------------------------------
   How long a lesson takes to read.

   This is deliberately *not* the same number as the module's hours. Hours
   include the work — the exercises, the code, the capstone — and are a study
   estimate. This is reading time, measured off the lesson's own words at 180
   words a minute, which is a sensible pace for dense material rather than the
   250 used for fiction. Figures, tables and knowledge checks cost time that
   isn't words, so they are added on top: a check is 45 seconds because you read
   it, decide, and then read why you were wrong.

   Nothing here is authored, so it cannot go stale when a lesson is edited. */
function _wordsIn(o){
  if(o==null)return 0;
  if(typeof o==='string')
    return o.replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/gi,' ').split(/\s+/).filter(Boolean).length;
  if(typeof o==='number')return 1;
  if(Array.isArray(o)){var n=0;for(var i=0;i<o.length;i++)n+=_wordsIn(o[i]);return n;}
  if(typeof o==='object'){var s=0;for(var k in o){if(k==='t')continue;s+=_wordsIn(o[k]);}return s;}
  return 0;
}
/* keyed by the lesson object rather than by its title: two lessons in different
   courses can share a title and a block count, and a string key would hand one
   of them the other's estimate. */
var _lmCache=(typeof WeakMap!=='undefined')?new WeakMap():null;
function lessonMinutes(l){
  if(!l)return 0;
  if(typeof l.minutes==='number'&&l.minutes>0)return l.minutes;   /* an author may override */
  var blocks=l.blocks||[];
  if(_lmCache&&_lmCache.has(l))return _lmCache.get(l);
  var words=0,extra=0;
  blocks.forEach(function(b){
    var t=b&&b.t;
    words+=_wordsIn(b);
    if(t==='kcheck')extra+=0.75;
    else if(t==='image'||t==='chart'||t==='annotate')extra+=0.5;
    else if(t==='code')extra+=0.6;
    else if(t==='table')extra+=0.4;
    else if(t==='explorer'||t==='flip'||t==='tabs'||t==='rubric')extra+=0.5;
  });
  var m=Math.max(2,Math.round(words/180+extra));
  if(_lmCache)_lmCache.set(l,m);
  return m;
}
function moduleReadMinutes(m){
  if(!m||!Array.isArray(m.lessons))return 0;
  var t=0;m.lessons.forEach(function(l){t+=lessonMinutes(l);});
  return t;
}
function readLabel(min){
  if(min<60)return min+' min read';
  var h=Math.floor(min/60),r=min%60;
  return h+'h'+(r?' '+r+'m':'')+' of reading';
}
/* .prtxt titles were being cut mid-word at one line; two is enough for every
   module title in the catalogue. */
/* The next unpassed module in a path — what "Continue" means for a path. */
function pathNext(p){
  var rows=pathRows(p);
  for(var i=0;i<rows.length;i++)if(!rows[i].passed)return rows[i];
  return null;
}
function pathsWith(cid,n){
  return paths().filter(function(p){return (p.items||[]).some(function(i){return i.c===cid&&i.n===n;});});
}
/* A module is reachable if the course's own order allows it, or if you opened it
   on its own, or if it sits in a path you built. */
function moduleUnlocked(c,n){
  if(!c||n<2)return true;
  if(passedModule(c,n-1))return true;
  if(isSolo(c.id,n))return true;
  return inAnyPath(c.id,n);
}
function pageLocked(c,page){
  var m=page&&page.match(/^m(\d+)/);
  if(m){return !moduleUnlocked(c,parseInt(m[1],10));}
  if(page==='final')return !allPassed(c);
  if(page==='cert')return !prog(c.id).finalPassed;
  return false;
}
function pageSeq(c){
  var s=[];
  if(!Array.isArray(c.modules))return s;
  for(var n=1;n<=moduleCount(c);n++){s.push('m'+n+'-intro');for(var k=1;k<=c.modules[n-1].lessons.length;k++)s.push('m'+n+'-l'+k);s.push('m'+n+'-quiz');}
  s.push('final');s.push('cert');return s;
}
function completedCount(c){var d=0;for(var n=1;n<=moduleCount(c);n++)if(passedModule(c,n))d++;return d;}

var app;
function brandHTML(){return '<a class="brand" href="#">'+(window.OB_MARK?'<img class="obmark" src="'+window.OB_MARK+'" alt="O">boros':(logoSVG(26)+'<span class="brandtext">Oboros</span>'))+'</a>';}
/* The persistent chrome should be the dashboard, not a nameplate. On the four tab
   destinations the top bar carries live state — streak, today's XP, rank — instead
   of a logo and a page title nobody needs. Detail pages keep their back link. */
function statStripHTML(){
  ensureDay();
  var g=store.gam;var cs=currentStreak();var goal=g.goal||DEF_GOAL;
  var gp=Math.min(100,Math.round(((g.todayXP||0)/goal)*100));
  var rp=rankProgress();
  return '<div class="tbstats">'
    +'<span class="tbs flame'+(cs>0?' lit':'')+'" title="'+cs+'-day streak">'+FLAME+'<b>'+cs+'</b></span>'
    +'<a class="tbs goal'+(gp>=100?' met':'')+'" href="#badges" title="'+(g.todayXP||0)+' of '+goal+' XP today">'
      +snakeRing(gp,22,gp>=100?'var(--accent2)':'var(--accent)','','tbr')
      +'<b>'+(g.todayXP||0)+'<small>/'+goal+'</small></b></a>'
    +'<a class="tbs rank" href="#badges" title="'+R.esc(rp.rank.name)+' — level '+rp.level+'">'
      +'<span class="tbrk">'+gi(rp.rank.icon)+'</span><b>'+rp.level+'</b></a>'
    +'</div>'
    +'<span class="tbfill" style="width:'+rp.pct+'%"></span>';
}
function topbar(back,opts){
  opts=opts||{};
  var stats=!!opts.stats;
  var left = stats ? statStripHTML()
    : (back ? '<a class="tbback" href="'+back.href+'">&#8592; '+R.esc(back.label)+'</a>' : brandHTML());
  var quick = opts.libBtn
    ? '<a class="iconbtn" href="#library" aria-label="Course library" title="Course library">'+IC.store+'</a>'
    : '';
  // "nb" = no back link. On desktop the left rail already carries the brand and
  // navigation, so a topbar with nothing but the brand in it is dead space.
  return '<div class="topbar'+(back||stats?'':' nb')+(stats?' hasstats':'')+'"><div class="in">'+left+(stats?'':'<span class="tbspacer"></span>')+quick
    +'<button class="navbtn" id="navtoggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>'
    +'</div></div>';
}
/* Bottom tab bar. Every destination that matters is one thumb-tap away instead of
   two taps into a hamburger in the far corner. Hidden on desktop, where the rail does it. */
var TABS=[
  {href:'#',        seg:'',        icon:'home',   label:'Learn'},
  {href:'#library', seg:'library', icon:'store',  label:'Library', alt:['store','new','c','track','choose']},
  {href:'#review',  seg:'review',  icon:'review', label:'Review'},
  {href:'#badges',  seg:'badges',  icon:'rewards',label:'Rewards'}
];
function tabbarHTML(){
  var h=(location.hash||'').replace(/^#\/?/,'');var seg=h.split('/')[0];
  var due=reviewDueCount();
  var out='<nav class="tabbar" id="tabbar" aria-label="Main">';
  TABS.forEach(function(t){
    var on=t.seg===seg||(t.alt&&t.alt.indexOf(seg)>-1);
    var badge=(t.seg==='review'&&due>0)?'<span class="tbadge">'+(due>99?'99+':due)+'</span>':'';
    out+='<a class="tab'+(on?' on':'')+'" href="'+t.href+'"'+(on?' aria-current="page"':'')+'>'
      +'<span class="tabico">'+IC[t.icon]+badge+'</span><span class="tablbl">'+t.label+'</span></a>';
  });
  return out+'</nav>';
}
// remembers the last list-style page visited, so detail pages can send you back there
var navFrom='home';
function backToList(){return navFrom==='library'?{href:'#library',label:'Library'}:{href:'#',label:'My Learning'};}
/* collapsible sections — open/closed state persists per section id */
function sectOpen(id,dflt){var ui=(store.settings&&store.settings.sections)||{};return ui[id]===undefined?!!dflt:!!ui[id];}
function setSectOpen(id,on){if(!store.settings.sections)store.settings.sections={};store.settings.sections[id]=!!on;save();}
function collSection(id,title,count,body,dflt){
  var open=sectOpen(id,dflt);
  return '<section class="coll'+(open?' open':'')+'" data-sect="'+id+'">'
    +'<button class="collhead" data-secttoggle="'+id+'" aria-expanded="'+(open?'true':'false')+'">'
      +'<span class="collttl">'+R.esc(title)+'</span>'
      +(count!=null?'<span class="collcount">'+count+'</span>':'')
      +'<span class="collchev">&#8250;</span></button>'
    +'<div class="collbody">'+body+'</div></section>';
}
/* ---------- organising the library by specialization ----------
   The store used to be a flat alphabetical list, which answers "what exists"
   and not "what should I take next, and what does it belong to". Grouping by
   track answers both, and it makes the sequence visible: seeing "2 · Reading
   Financial Statements" sitting between courses 1 and 3 is worth more than any
   amount of description. */
function trackOfCourse(id){
  var ts=allTracks();
  for(var i=0;i<ts.length;i++){
    var n=(ts[i].courseIds||[]).indexOf(id);
    if(n>-1)return {track:ts[i],n:n+1};
  }
  return null;
}
/* Bucket a list of course-ish objects (they only need an .id) into track order.
   Returns groups in tracks.json order, each with its items sorted by position in
   the track, plus the ids the track promises that nobody has built yet, plus a
   final "other" group for anything belonging to no track. */
function groupByTrack(list,opts){
  opts=opts||{};
  var ts=allTracks(),byId={};
  (list||[]).forEach(function(c){byId[c.id]=c;});
  var used={},groups=[];
  ts.forEach(function(t){
    var items=[],missing=[];
    (t.courseIds||[]).forEach(function(id,i){
      if(byId[id]){items.push({c:byId[id],n:i+1});used[id]=1;}
      else if(!opts.hideMissing)missing.push({id:id,n:i+1});
    });
    if(items.length||(missing.length&&opts.keepEmpty))groups.push({track:t,items:items,missing:missing});
  });
  var other=(list||[]).filter(function(c){return !used[c.id];})
    .sort(function(a,b){return (a.title||'').localeCompare(b.title||'');})
    .map(function(c){return {c:c,n:0};});
  if(other.length)groups.push({track:null,items:other,missing:[]});
  return groups;
}
function libGroupMode(){
  var m=store.settings&&store.settings.libGroup;
  return m==='az'?'az':'track';
}
function libGroupToggleHTML(){
  if(!allTracks().length)return '';
  var m=libGroupMode();
  return '<div class="grpsw" role="group" aria-label="How to organise the list">'
    +'<button class="grpb'+(m==='track'?' on':'')+'" data-libgroup="track">By specialization</button>'
    +'<button class="grpb'+(m==='az'?' on':'')+'" data-libgroup="az">A&ndash;Z</button></div>';
}
/* ---------- generated cover art ----------
   A library with nothing to look at is a list of labels, and labels are read
   rather than recognised. Photography is impossible here — the whole app is one
   offline file — so each specialization gets a cover generated from its own id:
   a two-stop wash in its accent with a few soft orbs placed by a seeded PRNG.
   Deterministic, so a track always looks like itself; ~400 bytes; no network. */
function hashStr(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seededRand(seed){var x=seed>>>0;return function(){x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
/* ------------------------------------------------------------------
   Cover art, drawn from the mark.

   These used to be a gradient with three blurred orbs and two diagonals across
   it, which meant a library of six courses was six coloured slabs — the art told
   you nothing and the brand did no work. The mark is a snake closing a circle,
   so every cover is now a coil: same seed, but a different number of turns, a
   different tightness, a different angle and a different sweep each time. At 52px
   it reads as a distinctive shape; at full width it reads as the logo's cousin.
   ------------------------------------------------------------------ */
function coilPath(cx,cy,r0,r1,turns,a0,steps){
  var d='',n=steps||140;
  for(var i=0;i<=n;i++){
    var t=i/n;
    var ang=a0+t*turns*Math.PI*2;
    var rr=r0+(r1-r0)*t;
    var x=cx+Math.cos(ang)*rr, y=cy+Math.sin(ang)*rr;
    d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);
  }
  return d;
}
function coverSVG(id,accent,w,h){
  w=w||400;h=h||132;
  var rnd=seededRand(hashStr(id||'x'));
  var a=accent||'#7b61ff';
  var g='cv'+Math.abs(hashStr(id||'x')).toString(36);
  // where the coil sits, how tight it is, and which way it turns — all seeded
  var cx=w*(0.22+rnd()*0.56), cy=h*(0.30+rnd()*0.40);
  var span=Math.max(w,h);
  var r1=span*(0.30+rnd()*0.26);
  var r0=r1*(0.10+rnd()*0.22);
  var turns=1.6+rnd()*1.9;
  var a0=rnd()*Math.PI*2;
  var dir=rnd()<0.5?-1:1;
  var sw=Math.max(2.2,span*(0.026+rnd()*0.022));
  var s='<svg class="cvsvg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
    +'<defs><linearGradient id="'+g+'" x1="0" y1="0" x2="1" y2="1">'
    +'<stop offset="0" stop-color="'+a+'" stop-opacity=".95"/>'
    +'<stop offset="1" stop-color="'+a+'" stop-opacity=".55"/></linearGradient>'
    +'<linearGradient id="'+g+'c" x1="0" y1="0" x2="1" y2="1">'
    +'<stop offset="0" stop-color="#fff" stop-opacity=".55"/>'
    +'<stop offset="1" stop-color="#fff" stop-opacity=".10"/></linearGradient>'
    +'<radialGradient id="'+g+'r"><stop offset="0" stop-color="#fff" stop-opacity=".34"/>'
    +'<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'
    +'<rect width="'+w+'" height="'+h+'" fill="url(#'+g+')"/>'
    +'<circle cx="'+(cx).toFixed(0)+'" cy="'+(cy).toFixed(0)+'" r="'+(r1*1.5).toFixed(0)+'" fill="url(#'+g+'r)"/>';
  // the coil, tapering as it goes, with a head where it ends
  var d=coilPath(cx,cy,r0,r1,turns*dir,a0);
  s+='<path d="'+d+'" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="'+(sw*1.5).toFixed(1)+'" stroke-linecap="round" transform="translate(0,'+(sw*0.5).toFixed(1)+')"/>';
  s+='<path d="'+d+'" fill="none" stroke="url(#'+g+'c)" stroke-width="'+sw.toFixed(1)+'" stroke-linecap="round"/>';
  var ang=a0+turns*dir*Math.PI*2;
  var hx=cx+Math.cos(ang)*r1, hy=cy+Math.sin(ang)*r1;
  s+='<circle cx="'+hx.toFixed(1)+'" cy="'+hy.toFixed(1)+'" r="'+(sw*0.92).toFixed(1)+'" fill="#fff" fill-opacity=".62"/>';
  return s+'</svg>';
}
/* The header that opens each group. Doubles as a link into the track page, so
   the grouping is a route into the curriculum rather than just a visual sort. */
function groupHeadHTML(t,count,extra){
  if(!t)return '<div class="grphead plain"><span class="grpname">Everything else</span>'
    +'<span class="grpcount">'+count+'</span></div>';
  var acc=t.accent||'#7b61ff';var s=trackStats(t);
  return '<a class="grphead" href="#track/'+t.id+'" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
    +'<span class="grpart">'+coverSVG(t.id,acc,400,120)+'</span>'
    +'<span class="grptxt"><span class="grpname">'+R.esc(t.title)+'</span>'
    +'<span class="grpsub">'+(extra||(s.done+' of '+s.total+' complete'))+'</span></span>'
    +'<span class="grpcount">'+count+'</span><span class="grpchev">&#8250;</span></a>';
}
/* One line per specialization. The previous version stacked a title, a progress
   bar and a meta line, which made six tracks 560px tall — the section read as
   the main focus of the library even though it collapses. This is 46px. */
function trackRow(t){var s=trackStats(t);var acc=t.accent||'#7b61ff';
  return '<a class="row trow tkrow mini" href="#track/'+t.id+'"><span class="trdot" style="background:'+acc+'"></span>'
    +'<div class="trbody"><div class="trtitle">'+R.esc(t.title)+'</div>'
    +'<div class="trbar"><i style="width:'+s.pct+'%;background:'+acc+'"></i></div></div>'
    +'<span class="trn">'+(s.complete?'&#10003;':s.done+'/'+s.total)+'</span>'
    +'<span class="tkchev">&#8250;</span></a>';
}
// the drawer + scrim live OUTSIDE #app (on <body>) so the text-size zoom on #app
// never affects their position:fixed layout or hit-testing.
function renderDrawer(){var nr=document.getElementById('navroot');if(nr)nr.innerHTML=drawerHTML()+tabbarHTML();}
/* ---------- figure viewer ----------
   Course diagrams are dense inline SVGs designed to be read, and on a phone
   they render about 330px wide. This opens one full-bleed, fits it to whichever
   way the phone is held, and lets you zoom into the part you care about.

   Everything is measured from the SVG's own viewBox rather than from layout, so
   a rotation is just a refit rather than a reflow. */
var LB={el:null,stage:null,pane:null,scale:1,fit:1,natW:0,natH:0,rot:0,rotManual:false,lastFocus:null,pointers:{},pinch:null};
/* A wide diagram fitted to the width of a portrait phone is no bigger than it was
   inline — the win is all in the unused height. Turning it a quarter turn, the way
   Apple Books and Kindle handle wide tables, is what actually makes it readable.
   Rotating the phone undoes it, because then the width is real. */
function lbWantsRot(stageW,stageH){
  if(LB.rotManual)return LB.rot;
  if(!LB.natW||!LB.natH)return 0;
  var aspect=LB.natW/LB.natH;
  if(aspect<1.3)return 0;
  if(stageH<=stageW*1.1)return 0;
  var pad=20;
  var flat=Math.min((stageW-pad)/LB.natW,(stageH-pad)/LB.natH);
  var turned=Math.min((stageW-pad)/LB.natH,(stageH-pad)/LB.natW);
  return turned>flat*1.35?90:0;
}
function lbDisp(){return LB.rot?{w:LB.natH,h:LB.natW}:{w:LB.natW,h:LB.natH};}

/* The viewer draws its own frame, so the pane is the artwork plus a border of
   FVPAD of the pane's width on every side. Percentage padding resolves against
   width in both axes, which is what keeps the frame proportional at any zoom;
   the natural height is inflated to match so the fit is exact rather than close. */
var FVPAD=0.025;
function lbNatural(node){
  var w=0,h=0;
  var svg=node.tagName==='svg'?node:node.querySelector('svg');
  if(svg){
    var vb=(svg.getAttribute('viewBox')||'').split(/[\s,]+/).filter(function(x){return x!=='';});
    if(vb.length===4){w=parseFloat(vb[2]);h=parseFloat(vb[3]);}
    if(!w){var r=svg.getBoundingClientRect();if(r.width>2){w=r.width;h=r.height;}}
  }
  if(!w){
    var img=node.tagName==='IMG'?node:node.querySelector('img');
    if(img&&img.naturalWidth){w=img.naturalWidth;h=img.naturalHeight;}
  }
  if(!w){var b=node.getBoundingClientRect();w=Math.max(b.width,320);h=Math.max(b.height,200);}
  return {w:w,h:(1-2*FVPAD)*h+2*FVPAD*w};
}
function lbEnsure(){
  if(LB.el)return LB.el;
  var el=document.createElement('div');
  el.id='figview';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.setAttribute('aria-label','Diagram viewer');
  el.innerHTML=
     '<div class="fvbar">'
    +'<span class="fvcap" id="fvcap"></span>'
    +'<button class="fvx fvrot" type="button" data-fvrot aria-pressed="false" aria-label="Turn the diagram a quarter turn">'
    +'<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +'<path d="M4 9a8 8 0 0 1 13.7-5.7L20 6"/><path d="M20 2v4h-4"/>'
    +'<rect x="3" y="13" width="12" height="8" rx="2"/></svg></button>'
    +'<button class="fvx" type="button" data-fvclose aria-label="Close viewer">&#10005;</button>'
    +'</div>'
    +'<div class="fvstage" id="fvstage"><div class="fvpane" id="fvpane"></div></div>'
    +'<div class="fvfoot">'
    +'<span class="fvhint" id="fvhint"></span>'
    +'<span class="fvzoom">'
    +'<button class="fvb" type="button" data-fvzoom="-1" aria-label="Zoom out">&minus;</button>'
    +'<button class="fvb wide" type="button" data-fvzoom="0" aria-label="Fit to screen">Fit</button>'
    +'<button class="fvb" type="button" data-fvzoom="1" aria-label="Zoom in">+</button>'
    +'</span></div>';
  document.body.appendChild(el);
  LB.el=el;LB.stage=el.querySelector('#fvstage');LB.pane=el.querySelector('#fvpane');
  // pinch, and double-tap to toggle between fit and a readable zoom
  LB.stage.addEventListener('pointerdown',lbDown);
  LB.stage.addEventListener('pointermove',lbMove);
  ['pointerup','pointercancel','pointerleave'].forEach(function(ev){LB.stage.addEventListener(ev,lbUp);});
  /* The fitted diagram fills the stage, so a backdrop to tap barely exists. Tapping
     the figure itself dismisses instead — the Photos convention — but only when it
     is not zoomed, and on a short delay so a double-tap zooms rather than closes. */
  LB.stage.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('button'))return;
    if(LB.tapT){clearTimeout(LB.tapT);LB.tapT=null;}
    if(Math.abs(LB.scale-LB.fit)>=0.02)return;
    LB.tapT=setTimeout(function(){LB.tapT=null;closeLightbox();},250);
  });
  LB.stage.addEventListener('dblclick',function(e){
    e.preventDefault();
    if(LB.tapT){clearTimeout(LB.tapT);LB.tapT=null;}
    lbZoom(LB.scale>LB.fit*1.2?0:2.5,e);
  });
  LB.stage.addEventListener('wheel',function(e){
    if(!e.ctrlKey&&!e.metaKey)return;
    e.preventDefault();lbZoom(LB.scale*(e.deltaY<0?1.12:0.89),e);
  },{passive:false});
  return el;
}
function lbApply(){
  var d=lbDisp();
  LB.pane.style.width=Math.round(d.w*LB.scale)+'px';
  LB.pane.style.height=Math.round(d.h*LB.scale)+'px';
  var inner=LB.pane.firstChild;
  if(inner&&inner.style){
    inner.style.width=Math.round(LB.natW*LB.scale)+'px';
    inner.style.height=Math.round(LB.natH*LB.scale)+'px';
    inner.style.transform='translate(-50%,-50%) rotate('+LB.rot+'deg)';
  }
  var atFit=Math.abs(LB.scale-LB.fit)<0.02;
  LB.el.classList.toggle('zoomed',!atFit);
  LB.el.classList.toggle('turned',!!LB.rot);
  var ar=LB.natH?LB.natW/LB.natH:1;
  LB.el.classList.toggle('canturn',ar>=1.25||ar<=0.8);
  var rb=LB.el.querySelector('[data-fvrot]');
  if(rb)rb.setAttribute('aria-pressed',LB.rot?'true':'false');
  var hint=document.getElementById('fvhint');
  if(hint){
    hint.textContent=!atFit?Math.round(LB.scale/LB.fit*100)+'%'
      :LB.rot?'Rotate your phone to read it flat'
      :'Double-tap to zoom \u00b7 tap to close';
  }
}
function lbFit(keepZoom){
  if(!LB.el)return;
  var s=LB.stage.getBoundingClientRect();
  var pad=20;
  var wasFit=Math.abs(LB.scale-LB.fit)<0.02;
  var prevRot=LB.rot;
  LB.rot=lbWantsRot(s.width,s.height);
  var d=lbDisp();
  var fit=Math.min((s.width-pad)/d.w,(s.height-pad)/d.h);
  if(!isFinite(fit)||fit<=0)fit=1;
  LB.fit=fit;
  // a rotation refits a diagram you had not zoomed, and preserves the zoom you chose —
  // unless the turn itself changed, in which case the old zoom no longer means anything
  if(!keepZoom||wasFit||prevRot!==LB.rot)LB.scale=fit;
  lbApply();
  if(!keepZoom||wasFit||prevRot!==LB.rot){LB.stage.scrollLeft=0;LB.stage.scrollTop=0;}
}
function lbToggleRot(){
  LB.rotManual=true;LB.rot=LB.rot?0:90;
  var s=LB.stage.getBoundingClientRect(),pad=20,d=lbDisp();
  LB.fit=Math.min((s.width-pad)/d.w,(s.height-pad)/d.h);
  if(!isFinite(LB.fit)||LB.fit<=0)LB.fit=1;
  LB.scale=LB.fit;lbApply();
  LB.stage.scrollLeft=0;LB.stage.scrollTop=0;
}
function lbZoom(target,ev){
  var min=LB.fit*0.9,max=LB.fit*8;
  var next=Math.max(min,Math.min(max,target===0?LB.fit:(typeof target==='number'&&target>0&&target<20?target*LB.fit:target)));
  if(target===-1)next=Math.max(min,LB.scale/1.4);
  if(target===1)next=Math.min(max,LB.scale*1.4);
  if(target===0)next=LB.fit;
  // keep the point under the cursor (or the centre) steady while zooming
  var st=LB.stage,r=st.getBoundingClientRect();
  var px=ev?(ev.clientX-r.left):r.width/2, py=ev?(ev.clientY-r.top):r.height/2;
  var rx=(st.scrollLeft+px)/Math.max(1,LB.natW*LB.scale);
  var ry=(st.scrollTop+py)/Math.max(1,LB.natH*LB.scale);
  LB.scale=next;lbApply();
  st.scrollLeft=rx*LB.natW*LB.scale-px;
  st.scrollTop=ry*LB.natH*LB.scale-py;
}
function lbDown(e){LB.pointers[e.pointerId]={x:e.clientX,y:e.clientY};
  var ids=Object.keys(LB.pointers);
  if(ids.length===2){
    var a=LB.pointers[ids[0]],b=LB.pointers[ids[1]];
    LB.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:LB.scale};
  }}
function lbMove(e){
  if(!LB.pointers[e.pointerId])return;
  LB.pointers[e.pointerId]={x:e.clientX,y:e.clientY};
  var ids=Object.keys(LB.pointers);
  if(ids.length===2&&LB.pinch){
    var a=LB.pointers[ids[0]],b=LB.pointers[ids[1]];
    var d=Math.hypot(a.x-b.x,a.y-b.y);
    if(LB.pinch.d>4){
      e.preventDefault();
      lbZoom(LB.pinch.s*(d/LB.pinch.d),{clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2});
    }
  }}
function lbUp(e){delete LB.pointers[e.pointerId];if(Object.keys(LB.pointers).length<2)LB.pinch=null;}

function openFigure(fig){
  // the artwork only — the lesson's own panel, padding and 560px cap are inline
  // chrome, and dragging them into a full-screen viewer is what capped it at 560px
  var media=fig.querySelector('.anwrap')||fig.querySelector('svg')
    ||fig.querySelector('img.figimg')||fig.querySelector('.mediaph');
  if(!media)return;
  lbEnsure();
  var clone=media.cloneNode(true);
  var n=lbNatural(clone);
  LB.natW=n.w;LB.natH=n.h;LB.rot=0;LB.rotManual=false;
  LB.pane.innerHTML='';
  var inner=document.createElement('div');inner.className='fvinner';
  /* the diagrams paint with var(--fig), which the lesson sets on the frame we no
     longer clone — without carrying it across, every accent falls back to black */
  var host=media.parentNode&&media.parentNode.nodeType===1?media.parentNode:fig;
  var figv=getComputedStyle(host).getPropertyValue('--fig');
  if(figv&&figv.trim())inner.style.setProperty('--fig',figv.trim());
  inner.appendChild(clone);LB.pane.appendChild(inner);
  var cap=fig.querySelector('.viscap');
  var ttl=fig.querySelector('.vistitle');
  var capEl=document.getElementById('fvcap');
  capEl.textContent=(ttl?ttl.textContent:'')||(cap?cap.textContent:'')||'Diagram';
  LB.lastFocus=document.activeElement;
  LB.el.classList.add('open');
  document.body.classList.add('navopen');
  lbFit(false);
  var x=LB.el.querySelector('[data-fvclose]');if(x)x.focus();
}
function closeLightbox(){
  if(LB.tapT){clearTimeout(LB.tapT);LB.tapT=null;}
  if(LB.el){LB.el.classList.remove('open');LB.pane.innerHTML='';}
  var d=document.getElementById('navdrawer');
  if(!d||!d.classList.contains('open'))document.body.classList.remove('navopen');
  if(LB.lastFocus&&LB.lastFocus.focus){try{LB.lastFocus.focus();}catch(e){}}
  LB.lastFocus=null;
}
function lbOpen(){return !!(LB.el&&LB.el.classList.contains('open'));}
/* A rotation must refit, not reflow. visualViewport fires on the iOS toolbar
   collapsing too, which is exactly when a refit is also wanted. */
function lbWatchViewport(){
  var refit=function(){if(lbOpen())setTimeout(function(){lbFit(true);},60);};
  window.addEventListener('resize',refit);
  window.addEventListener('orientationchange',refit);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',refit);
}
function navItem(href,icon,label,active,badge){
  return '<a class="navitem'+(active?' on':'')+'" href="'+href+'">'+icon+'<span class="nvlbl">'+label+'</span>'+(badge?'<span class="nvbadge">'+badge+'</span>':'')+'</a>';
}
function drawerHTML(){
  var h=(location.hash||'').replace(/^#\/?/,'');var seg=h.split('/')[0];
  var isHome=seg===''||seg==='new';
  var due=reviewDueCount();
  var acct;
  if(session){var dot=syncState==='ok'?'#31c48d':syncState==='syncing'?'#f0b429':syncState==='error'?'#f2687f':'#98a1b2';
    acct='<a class="navacct in" href="#account"><span class="navav">'+R.esc((session.email||'?').charAt(0).toUpperCase())+'</span>'
      +'<span class="navacctxt"><b>'+R.esc(session.email||'Signed in')+'</b><small><span class="acctdot" style="background:'+dot+'"></span>'+syncLabel()+'</small></span></a>';
  } else if(acctShown()){
    acct='<a class="navacct" href="#account"><span class="navav">&#8594;</span><span class="navacctxt"><b>Sign in</b><small>Sync across devices</small></span></a>';
  } else {
    acct='<a class="navacct" href="#account"><span class="navav">'+gi('orb')+'</span><span class="navacctxt"><b>Offline mode</b><small>Saved on this device</small></span></a>';
  }
  return '<div class="navscrim" id="navscrim"></div>'
    +'<aside class="navdrawer" id="navdrawer" aria-hidden="true">'
    +'<div class="navhead">'+brandHTML()+'<button class="navclose" id="navclose" aria-label="Close menu">'+IC.close+'</button></div>'
    +'<nav class="navlist">'
    +navItem('#',IC.home,'My Learning',isHome)
    +navItem('#library',IC.store,'Course library',seg==='library'||seg==='store')
    +navItem('#design',IC.design,'Design your learning',seg==='design'||seg==='path'||seg==='m')
    +navItem('#warmup',IC.rewards,'Daily warm-up',seg==='warmup',wuDoneToday()?'':'&#9679;')
    +navItem('#review',IC.review,'Review',seg==='review',due>0?due:'')
    +navItem('#saved',IC.saved,'Saved &amp; notes',seg==='saved')
    +navItem('#badges',IC.rewards,'Rewards',seg==='badges'||seg==='transcript')
    +navItem('#settings',IC.settings,'Settings',seg==='settings')
    +'</nav>'
    +'<div class="navfoot">'+acct+'</div>'
    +'</aside>';
}
function closeNav(){var d=document.getElementById('navdrawer'),s=document.getElementById('navscrim'),b=document.getElementById('navtoggle');if(d)d.classList.remove('open');if(s)s.classList.remove('open');if(b)b.setAttribute('aria-expanded','false');document.body.classList.remove('navopen');}
function toggleNav(){var d=document.getElementById('navdrawer'),s=document.getElementById('navscrim'),b=document.getElementById('navtoggle');if(!d)return;var open=d.classList.toggle('open');if(s)s.classList.toggle('open',open);if(b)b.setAttribute('aria-expanded',open?'true':'false');document.body.classList.toggle('navopen',open);}
function filterLib(){
  var si=document.getElementById('coursesearch');var q=si?(si.value||'').trim().toLowerCase():'';
  var chip=document.querySelector('#catchips .chip.on');var cat=chip?chip.getAttribute('data-cat'):'__all';
  var cards=document.querySelectorAll('.homegrid .libcard[data-cid]');var shown=0;
  cards.forEach(function(cd){
    var okc=cat==='__all'||cd.getAttribute('data-cat')===cat;
    var oks=!q||(cd.getAttribute('data-search')||'').indexOf(q)>-1;
    var vis=okc&&oks;cd.style.display=vis?'':'none';if(vis)shown++;
  });
  // a group header with nothing left under it is worse than no header
  document.querySelectorAll('.libgrp').forEach(function(g){
    var any=[].slice.call(g.querySelectorAll('.libcard[data-cid]')).some(function(cd){return cd.style.display!=='none';});
    g.style.display=any?'':'none';
  });
  var empty=document.getElementById('libempty');if(empty)empty.style.display=shown?'none':'block';
}
function ring(done,total){var pct=total?Math.round(done/total*100):0;return snakeRing(pct,46,'var(--accent2)','<b>'+done+'</b><small>of '+total+'</small>','cr');}

function libStats(){
  var a=courses();var started=0,doneMods=0,totMods=0,certs=0;
  a.forEach(function(c){var pr=prog(c.id);var d=completedCount(c);var t=moduleCount(c);doneMods+=d;totMods+=t;if(pr.lastPage||d>0)started++;if(pr.finalPassed)certs++;});
  return {courses:a.length,started:started,doneMods:doneMods,totMods:totMods,certs:certs,pct:totMods?Math.round(doneMods/totMods*100):0};
}
function statTile(num,label,sub){return '<div class="stat"><div class="statnum">'+num+'</div><div class="statlbl">'+label+'</div>'+(sub?'<div class="statsub">'+sub+'</div>':'')+'</div>';}
function renderContinue(){
  var r=store.recent;if(!r)return '';var c=getCourse(r.courseId);if(!c||isHidden(c.id))return '';
  if(pageLocked(c,r.page)||pageSeq(c).indexOf(r.page)<0)return '';
  return '<div class="continue"><div class="contl"><div class="conttag">Jump back in</div><div class="conttitle">'+R.esc(c.title)+'</div><div class="contsub">'+labelFor(c,r.page)+'</div></div>'
    +'<a class="contbtn" href="#c/'+c.id+'/'+r.page+'">Resume &#8594;</a></div>';
}
function streakCardHTML(){
  ensureDay();var g=store.gam;var cs=currentStreak();var goal=g.goal||DEF_GOAL;var gp=Math.min(100,Math.round((g.todayXP/goal)*100));var met=g.todayXP>=goal;
  return '<div class="streakcard">'
    +'<div class="stcell"><span class="flamewrap'+(cs>0?' lit':'')+'">'+FLAME+'</span><div class="stinfo"><b>'+cs+'</b><small>day streak</small></div></div>'
    +'<div class="stcell stgoal">'+snakeRing(gp,56,'var(--accent)','<b>'+gp+'<i>%</i></b>','gl')+'<div class="stinfo"><b>'+g.todayXP+' / '+goal+' XP</b><small>'+(met?'Goal met today &#10003;':'today’s goal')+'</small></div></div>'
    +'<div class="stcell"><div class="stinfo"><b>'+(g.xp||0)+'</b><small>total XP</small></div></div>'
    +'</div>';
}
function studyCardsHTML(){
  var h='';var g=store.gam;var due=reviewDueCount();
  if(due>0)h+='<a class="reviewcard due" href="#review"><div><div class="rvtag">Spaced repetition</div><div class="rvtitle">'+due+' item'+(due>1?'s':'')+' due for review</div><div class="rvsub">Resurface what you learned so it sticks.</div></div><span class="rvbtn">Review &#8594;</span></a>';
  else if(Object.keys(store.review).length)h+='<a class="reviewcard caught" href="#review"><div><div class="rvtag">Spaced repetition</div><div class="rvtitle">You’re all caught up &#10003;</div><div class="rvsub">New reviews resurface on a spaced schedule.</div></div><span class="rvbtn ghost">View</span></a>';
  var sv=savedCount();
  if(sv>0){var nb=(store.bookmarks||[]).length,nn=Object.keys(store.notes||{}).length,nh=Object.keys(store.marks||{}).length;
    var parts2=[];if(nb)parts2.push(nb+' bookmark'+(nb>1?'s':''));if(nn)parts2.push(nn+' note'+(nn>1?'s':''));if(nh)parts2.push(nh+' highlighted lesson'+(nh>1?'s':''));
    h+='<a class="reviewcard saved" href="#saved"><div><div class="rvtag">Your study</div><div class="rvtitle">Saved &amp; bookmarks</div><div class="rvsub">'+parts2.join(' · ')+'</div></div><span class="rvbtn ghost">Open &#8594;</span></a>';
  }
  if((g.xp||0)>0){var eb=earnedBadges().length;
    h+='<a class="reviewcard rewards" href="#badges"><div><div class="rvtag">Rewards</div><div class="rvtitle"><span class="rwico">'+gi('token')+'</span> '+tokensLeft()+' token'+(tokensLeft()===1?'':'s')+' · '+eb+' badge'+(eb===1?'':'s')+'</div><div class="rvsub">Earn tokens every '+TOKEN_EVERY+' XP to spend on quiz power-ups.</div></div><span class="rvbtn ghost">View</span></a>';
  }
  return h;
}
function suggCard(item){
  if(item.inLib){var c=item.course;var cat=courseCategory(c);var tot=moduleCount(c);
    return '<a class="libcard sugcard" href="#c/'+c.id+'"><span class="stripe" style="background:'+(c.accent||'#5b8cff')+'"></span><div class="libbody"><span class="cattag">'+R.esc(cat)+'</span><div class="libtitle">'+R.esc(c.title)+'</div><div class="libmeta"><span class="libmods">'+tot+' modules · not started</span></div></div><div class="libactions"><span class="btn">Start &#8594;</span></div></a>';
  }
  var s=item.store;return '<a class="libcard sugcard" href="#library/store"><span class="stripe" style="background:'+(s.accent||'#5b8cff')+'"></span><div class="libbody"><span class="cattag">In store</span><div class="libtitle">'+R.esc(s.title)+'</div><div class="libmeta"><span class="libmods">'+R.esc(s.tagline||s.subtitle||'Add to your library')+'</span></div></div><div class="libactions"><span class="btn ghost">Get &#8594;</span></div></a>';
}

/* ---------- the warm-up screen ---------- */
function renderWarmup(){
  var qs=wuToday();
  var st=wuState();
  var h=topbar({href:'#',label:'Home'});
  /* 169px of header before the first question. The rules matter once; after
     that they are in the way of the thing you came to do. */
  h+='<div class="wrap"><header class="dashhead tight wuhead"><div class="kicker">Daily warm-up</div><h1>Five quick questions</h1>'
    +'<p class="sub">Attempting is enough to keep your streak.</p></header>';
  if(!qs.length){
    h+='<div class="revempty"><div class="revbig">No questions available</div><p class="sub">The warm-up bank did not load.</p><a class="btn" href="#">Back home</a></div></div>';
    app.innerHTML=h;return;
  }
  if(st.done){h+=wuResultHTML(qs,st);app.innerHTML=h+'</div>';return;}
  h+='<div class="wuprog"><span id="wucount">'+wuAnsweredCount()+' of '+qs.length+' answered</span><div class="wubar"><i id="wufill" style="width:'+Math.round(wuAnsweredCount()/qs.length*100)+'%"></i></div></div>';
  h+='<div class="wulist" id="wulist">';
  qs.forEach(function(q,i){
    var picked=st.ans[q.id];
    h+='<div class="wucard'+(picked!=null?' answered':'')+'" data-wq="'+q.id+'">'
      +'<div class="wutop"><span class="wucat">'+R.esc(q.c)+'</span><span class="wunum">'+(i+1)+' / '+qs.length+'</span></div>'
      +'<p class="wuq">'+R.rich(q.q)+'</p><div class="wuopts">';
    q.o.forEach(function(opt,oi){
      var cls='wuopt';
      if(picked!=null){ if(oi===q.a)cls+=' right'; else if(oi===picked)cls+=' wrong'; }
      h+='<button class="'+cls+'" data-wu="'+q.id+'" data-wi="'+oi+'"'+(picked!=null?' disabled':'')+'>'+R.esc(opt)+'</button>';
    });
    h+='</div><div class="wuexp'+(picked!=null?' show':'')+'">'+(picked!=null?(picked===q.a?'<b>Correct.</b> ':'<b>Not quite.</b> The answer is <em>'+R.esc(q.o[q.a])+'</em>. ')+R.rich(q.e):'')+'</div>'
      +'</div>';
  });
  h+='</div>';
  h+='<div class="wufoot"><button class="btn" id="wudone"'+(wuAnsweredCount()<qs.length?' disabled':'')+'>Finish warm-up</button>'
    +'<p class="setnote">You can leave and come back — your answers are saved. Difficulty is in Settings → Learning.</p></div>';
  h+='</div>';
  app.innerHTML=h;
}
/* Freezes were invisible before — earned silently, spent silently. */
function freezeLineHTML(){
  var g=store.gam;var n=g.freezes||0;var t=todayStr();
  if(g.lastFroze===t)return '<div class="frzline used"><span class="frzico">'+gi('snow')+'</span><b>A freeze covered your missed day.</b><small>'+n+' left</small></div>';
  if(g.lastFreezeEarn===t)return '<div class="frzline earned"><span class="frzico">'+gi('snow')+'</span><b>Freeze earned — '+n+' banked.</b><small>each one covers a single missed day</small></div>';
  if(!n)return '<div class="frzline"><span class="frzico dim">'+gi('snow')+'</span><b>No freezes banked</b><small>you earn one every '+FREEZE_EVERY+' days, up to '+FREEZE_MAX+'</small></div>';
  return '<div class="frzline"><span class="frzico">'+gi('snow')+'</span><b>'+n+' freeze'+(n>1?'s':'')+' banked</b><small>covers a missed day automatically</small></div>';
}
function wuResultHTML(qs,st){
  var pct=Math.round(st.correct/qs.length*100);
  var cs=currentStreak();
  var acc=wuAccuracy();
  var h='<div class="wuresult'+(st.correct===qs.length?' perfect':'')+'">'
    +'<div class="wrbig">'+st.correct+' / '+qs.length+'</div>'
    +'<div class="wrsub">'+(st.correct===qs.length?'Perfect round.':pct>=60?'Solid.':'Worth another look at the explanations below.')+'</div>'
    +'<div class="wrstreak"><span class="tbs flame lit">'+FLAME+'</span><b>'+cs+'-day streak</b><small>safe until tomorrow</small></div>'
    +freezeLineHTML()
    +'</div>';
  h+='<div class="wulist">';
  qs.forEach(function(q){
    var picked=st.ans[q.id];var ok=picked===q.a;
    h+='<div class="wucard answered"><div class="wutop"><span class="wucat">'+R.esc(q.c)+'</span><span class="wuverdict '+(ok?'ok':'no')+'">'+(ok?'&#10003;':'&#10007;')+'</span></div>'
      +'<p class="wuq">'+R.rich(q.q)+'</p>'
      +'<div class="wuexp show">'+(ok?'<b>Correct.</b> ':'<b>You said</b> <em>'+R.esc(q.o[picked]!=null?q.o[picked]:'nothing')+'</em>. The answer is <em>'+R.esc(q.o[q.a])+'</em>. ')+R.rich(q.e)+'</div></div>';
  });
  h+='</div>';
  h+='<div class="wufoot"><a class="btn" href="#">Back home</a>'
    +'<p class="setnote">Come back tomorrow for five more.'+(acc!=null?' Lifetime accuracy: '+acc+'% across '+(store.gam.wuAnswered||0)+' questions.':'')+'</p></div>';
  return h;
}
/* warmupCardHTML is gone: the bento's warm-up tile is the only home for the streak. */

// ---------- My Learning (home) ----------
/* The top bar carries streak/XP/rank now, so the old greeting header and the
   standalone "today" band are gone — they cost 146px of the first screen and
   told the learner nothing they did not already know. */
/* The single most useful thing to do right now, chosen rather than listed. */
function nextUp(){
  var r=store.recent;
  if(r){var c=getCourse(r.courseId);
    if(c&&!isHidden(c.id)&&!pageLocked(c,r.page)&&pageSeq(c).indexOf(r.page)>=0){
      var nmr=nextMilestoneLabel(c);
      var pm=(r.page.match(/^m(\d+)/)||[])[1];
      var tail=(pm&&nmr.mod===parseInt(pm,10)&&nmr.short)?nmr.short:nmr.main;
      return {tag:'Pick up where you left off',title:c.title,sub:labelFor(c,r.page)+' · '+tail,href:'#c/'+c.id+'/'+r.page,cta:'Resume',accent:c.accent,cid:c.id};
    }
  }
  var due=reviewDueCount();
  if(due>0)return {tag:'Due now',title:due+' item'+(due>1?'s':'')+' to review',sub:'Five minutes keeps what you have already learned.',href:'#review',cta:'Review'};
  var lib=orderedCourses();
  for(var i=0;i<lib.length;i++){var cc=lib[i];var p=prog(cc.id);
    if(!p.lastPage&&completedCount(cc)===0)
      return {tag:'Start something new',title:cc.title,sub:moduleCount(cc)+' modules · not started',href:'#c/'+cc.id,cta:'Start',accent:cc.accent,cid:cc.id};
  }
  var stale=needsRefresh();
  if(stale.length)return {tag:'Going stale',title:stale[0].course.title,sub:'Not opened in '+stale[0].m.days+' days — a quick pass restores it.',href:'#c/'+stale[0].course.id,cta:'Refresh',accent:stale[0].course.accent,cid:stale[0].course.id};
  if(!lib.length)return {tag:'Get started',title:'Add your first course',sub:'Browse the Store and pick something to learn.',href:'#library/store',cta:'Browse'};
  return {tag:'All caught up',title:'Nothing due',sub:'Add a course, or revisit one to keep it sharp.',href:'#library/store',cta:'Browse'};
}
/* ------------------------------------------------------------------
   Home leads with one thing.

   Every screen in this app was a uniform vertical stack of same-width rows,
   which is a layout with no focus: the eye has nowhere to land and everything
   reads as equally urgent. Home now opens on one large tile — the thing you
   came back to do, in its own course's colour, on its own cover art — with the
   two daily habits as smaller tiles beside it.
   ------------------------------------------------------------------ */
function homeBentoHTML(){
  ensureDay();
  var n=nextUp();
  var acc=n.accent||'#5b8cff';
  var g=store.gam, goal=g.goal||DEF_GOAL;
  var gp=Math.min(100,Math.round(((g.todayXP||0)/goal)*100));
  var cs=currentStreak();
  var qs=wuToday(), wst=wuState();
  var h='<section class="bento">';
  h+='<a class="bmain" href="'+n.href+'" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
    +(n.cid?'<span class="bart">'+coverSVG(n.cid,acc,900,420)+'</span>':'<span class="bart plain"></span>')
    +'<span class="bmin">'
    +'<span class="btag">'+R.esc(n.tag)+'</span>'
    +'<b class="bttl">'+R.esc(n.title)+'</b>'
    +'<span class="bmsub">'+R.esc(n.sub)+'</span>'
    +'<span class="bgo">'+R.esc(n.cta)+' &#8594;</span>'
    +'</span></a>';
  h+='<div class="brow">';
  if(qs.length){
    /* the tile carries what the old home card carried: how far through today's five
       you are, and how many freezes are banked behind the streak */
    var part=wuAnsweredCount(), frz=(store.gam.freezes||0);
    var wsub=wst.done?'streak safe today':part?part+' of '+qs.length+' answered':(cs>0?'day streak':'start a streak');
    h+='<a class="btile warm'+(wst.done?' done':'')+(cs>0?' lit':'')+'" href="#warmup">'
      +'<span class="btico">'+FLAME+'</span>'
      +(frz?'<span class="wcfrz" title="'+frz+' streak freeze'+(frz>1?'s':'')+' banked">'+gi('snow')+frz+'</span>':'')
      +'<b>'+cs+'</b><small>'+wsub+'</small>'
      +'<span class="btgo">'+(wst.done?'Done &#10003;':(part?'Resume &#8594;':'Warm up &#8594;'))+'</span></a>';
  }
  h+='<a class="btile goal'+(gp>=100?' met':'')+'" href="#badges">'
    +snakeRing(gp,54,gp>=100?'var(--accent2)':'var(--accent)','<b>'+(g.todayXP||0)+'</b>','bt')
    +'<small>'+(gp>=100?'today is closed':'of '+goal+' XP today')+'</small>'
    +'<span class="btgo">Rewards &#8594;</span></a>';
  h+='</div></section>';
  return h;
}
/* nextUpHTML is gone: the bento tile is the one place the next action is drawn. */
/* Home and Rewards were drawing the same three quests two different ways — rows
   with a bar here, ring tiles there. One rendering. */
function questsHTML(){
  var qs=todaysQuests();if(!qs.length)return '';
  var left=questsRemaining();
  return collSection('quests','Today’s quests',left?left+' left':'all done ✓',questTilesHTML(true),true);
}
function dueNowHTML(){
  var rows='';
  var due=reviewDueCount();
  if(due>0)rows+='<a class="row alertrow rev" href="#review"><span class="arico">'+IC.review+'</span><div class="artxt"><b>'+due+' item'+(due>1?'s':'')+' due for review</b><small>Spaced repetition — resurface what you learned.</small></div><span class="archev">&#8250;</span></a>';
  var stale=needsRefresh();
  if(stale.length)rows+='<a class="row alertrow stale" href="#badges"><span class="arico">'+gi('refresh')+'</span><div class="artxt"><b>'+stale.length+' course'+(stale.length>1?'s':'')+' going stale</b><small>'+R.esc(stale[0].course.title)+(stale.length>1?' and '+(stale.length-1)+' more':'')+' — mastery is slipping.</small></div><span class="archev">&#8250;</span></a>';
  var sv=savedCount();
  if(sv>0)rows+='<a class="row alertrow saved" href="#saved"><span class="arico">'+IC.saved+'</span><div class="artxt"><b>Saved &amp; notes</b><small>'+sv+' item'+(sv>1?'s':'')+' you kept for later.</small></div><span class="archev">&#8250;</span></a>';
  return rows?'<div class="alerts">'+rows+'</div>':'';
}
/* Compact course rows with the description tucked behind a chevron — the old
   cards were ~200px each for information you can read in one line. */
function courseRowsHTML(){
  var a=orderedCourses();if(!a.length)return '';
  var body='<div class="crows">';
  a.forEach(function(c){
    var p=prog(c.id);var tot=moduleCount(c);var done=completedCount(c);
    var pct=tot?Math.round(done/tot*100):0;var started=!!p.lastPage||done>0;
    var m=masteryFor(c.id);
    var nm=nextMilestoneLabel(c);
    var meta=nm.main+(nm.sub?' <span class="crsub">· '+nm.sub+'</span>':'');
    body+='<div class="row crow'+(started?' on':'')+'" data-cid="'+c.id+'">'
      +'<span class="crdot" style="background:'+(c.accent||'#5b8cff')+'"></span>'
      +'<div class="crmid"><a class="crtitle" href="#c/'+c.id+'">'+R.esc(c.title)+'</a>'
        +'<div class="crbar"><i style="width:'+pct+'%;background:'+(c.accent||'#5b8cff')+'"></i></div>'
        +'<div class="crmeta">'+meta+(m&&m.earned>0?' <span class="crmast'+(m.stale?' stale':'')+'">· '+m.pct+'% mastery</span>':'')+'</div></div>'
      +'<a class="crgo" href="#c/'+c.id+'">'+(p.finalPassed?'Open':started?'Continue':'Start')+' &#8594;</a>'
      +'</div>';
  });
  body+='</div>';
  return collSection('mycourses-home','Your courses',a.length,body,true);
}
function discoverHTML(){
  var sug=suggestedCourses();if(!sug.length)return '';
  var body='<div class="homegrid">'+sug.map(suggCard).join('')+'</div>';
  return collSection('discover','Discover',sug.length,body,false);
}
function streakGridHTML(n){
  var days=activeDays(n||14);
  var h='<div class="skgrid">';
  days.forEach(function(d){
    var dom=parseInt(d.day.slice(8),10);
    h+='<div class="skday'+(d.on?' on':'')+(d.today?' now':'')+'" title="'+d.day+'"><span>'+dom+'</span></div>';
  });
  h+='</div>';
  var count=days.filter(function(d){return d.on;}).length;
  return h+'<p class="skcap">'+count+' of the last '+days.length+' days active</p>';
}
function statsStripHTML(){
  var s=libStats();var g=store.gam;
  var items=[[s.pct+'%','progress'],[s.doneMods,'modules'],[s.certs,'certificates'],[(g.xp||0),'total XP'],[Object.keys(g.days||{}).length,'active days'],[g.best||0,'best streak']];
  return '<div class="statstrip">'+items.map(function(i){
    return '<div class="ss"><b>'+i[0]+'</b><small>'+i[1]+'</small></div>';
  }).join('')+'</div>';
}
function renderHome(){
  navFrom='home';
  var s=libStats();var h=topbar(null,{stats:true});
  h+='<div class="wrap dash homedash">';
  h+='<div class="dashcols"><div class="dashmain">';
  h+=homeBentoHTML();
  h+=dueNowHTML();
  h+=questsHTML();          // the daily hook belongs above the fold, not at the bottom
  h+=courseRowsHTML();
  var t=currentTrack();
  if(t) h+='<div class="dashsection sec-track"><div class="secttitle">Your specialization<a class="secta" href="#choose">Change</a></div><div class="trackrows">'+trackRow(t)+'</div></div>';
  else h+=trackChooserHTML();
  h+=discoverHTML();
  h+='</div><aside class="dashside">';
  h+='<div class="dashsection"><div class="secttitle">This fortnight</div>'+streakGridHTML(14)+'</div>';
  h+='<div class="dashsection"><div class="secttitle">Your numbers<a class="secta" href="#badges">Rewards</a></div>'+statsStripHTML()+'</div>';
  h+='</aside></div>';
  h+='</div>';
  app.innerHTML=h;setTop(s.doneMods,s.totMods||1);
}
// ---------- Course Library (My courses / Store tabs) ----------
/* Your own paths sit above the courses, because if you built one it is the thing
   you came here for. When you have not built one, this is a single line rather
   than an empty state taking up a screen. */
function libPathsHTML(){
  var l=paths();
  if(!l.length){
    return '<a class="row dslure" href="#design"><span class="dsico">'+gi('pencil')+'</span>'
      +'<span class="dstxt2"><b>Design your learning</b>'
      +'<small>String modules from any courses into a path of your own — or take one module on its own</small></span>'
      +'<span class="tkchev">›</span></a>';
  }
  var b='<div class="pathgrid">';
  l.forEach(function(p){
    var st=pathStats(p);var acc=pathAccent(p);
    b+='<a class="row pathcard" href="#path/'+p.id+'" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
      +ringHTML(st.pct,acc,st.complete?'✓':st.pct+'%')
      +'<div class="pcmeta"><b>'+R.esc(p.name)+'</b>'
      +'<small>'+(st.total?st.done+' of '+st.total+' modules · about '+st.hours+' hours':'Empty — add some modules')+'</small></div>'
      +'<span class="tkchev">›</span></a>';
  });
  b+='</div><a class="ppnew" href="#design">Design another path →</a>';
  return collSection('lib-paths','Your paths',l.length,b,true);
}
function renderLibrary(tab){
  navFrom='library';
  tab=(tab==='store')?'store':'mine';
  var h=topbar(null,{stats:true});
  h+='<div class="wrap dash">';
  /* The old hero was 134px of brand line before anything actionable. A library
     is opened to find something, not to be told what the app is called. */
  var ls=libStats();var owned=orderedCourses();
  var inprog=owned.filter(function(c){var p=prog(c.id);return !p.finalPassed&&(p.lastPage||completedCount(c)>0);}).length;
  var certd=owned.filter(function(c){return prog(c.id).finalPassed;}).length;
  var hrs=0;owned.forEach(function(c){hrs+=courseHours(c)*(moduleCount(c)?completedCount(c)/moduleCount(c):0);});
  h+='<header class="libhead"><h1 class="libh1">Library</h1>'
    +'<p class="libstat">'+owned.length+' course'+(owned.length===1?'':'s')
    +(inprog?' · <b>'+inprog+'</b> in progress':'')
    +(certd?' · <b>'+certd+'</b> certified':'')
    +(hrs>=1?' · '+Math.round(hrs)+' hours done':'')+'</p></header>';
  h+='<div class="libtabs"><a class="libtab'+(tab==='mine'?' on':'')+'" href="#library">My courses</a><a class="libtab'+(tab==='store'?' on':'')+'" href="#library/store">Store</a></div>';
  if(tab==='mine'){
    var a=orderedCourses();
    var cats=[];a.forEach(function(c){var k=courseCategory(c);if(cats.indexOf(k)<0)cats.push(k);});
    h+='<div class="searchwrap"><span class="searchico">'+IC.search+'</span><input id="coursesearch" class="searchinp" type="search" placeholder="Search your courses…" autocomplete="off" aria-label="Search courses"></div>';
    h+=libPathsHTML();
    /* Category chips and specialization groups answer the same question, so only
       one of them is on screen at a time. */
    var grouped=libGroupMode()==='track'&&allTracks().length&&a.length>1;
    var showChips=cats.length>1&&!grouped;
    if(showChips){h+='<div class="chips" id="catchips"><button class="chip on" data-cat="__all">All</button>';cats.forEach(function(k){h+='<button class="chip" data-cat="'+R.esc(k)+'">'+R.esc(k)+'</button>';});h+='</div>';}else{h+='<div id="catchips"></div>';}
    if(allTracks().length&&a.length>1)h+='<div class="stbar libbar2">'+libGroupToggleHTML()+'</div>';
    // courses — compact cards; details tuck behind a chevron
    var cardFor=function(c){
      var p=prog(c.id);var done=completedCount(c);var tot=moduleCount(c);var started=!!p.lastPage||done>0;
      var built=(window.BUILTIN_COURSES||[]).indexOf(c)>-1;var pct=tot?Math.round(done/tot*100):0;
      var cat=courseCategory(c);var srch=((c.title||'')+' '+(c.tagline||c.subtitle||'')+' '+cat).toLowerCase();
      return '<div class="libcard compact" data-cid="'+c.id+'" data-cat="'+R.esc(cat)+'" data-search="'+R.esc(srch)+'"><span class="stripe" style="background:'+(c.accent||'#5b8cff')+'"></span>'
        +'<div class="libbody">'
        +'<div class="lctop"><span class="cattag">'+R.esc(cat)+'</span>'+(p.finalPassed?'<span class="certd">Certified</span>':'')+'</div>'
        +'<a class="libtitle" href="#c/'+c.id+'">'+R.esc(c.title)+'</a>'
        +(started?'<div class="libbar"><i style="width:'+pct+'%;background:'+(c.accent||'#5b8cff')+'"></i></div>':'')
        +'<div class="libmeta"><span class="libmods">'+(started?pct+'% · '+done+'/'+tot+' modules':courseHours(c)+' hours · '+tot+' modules')+'</span>'
        +'<a class="lcgo" href="#c/'+c.id+'">'+(started?'Continue':'Start')+' &#8594;</a></div>'
        +'<details class="cardcollapse"><summary>Details</summary><div class="cc-body">'+(c.tagline||c.subtitle||'')
        +'<div class="lcacts"><button class="minibtn" data-export="'+c.id+'">Export</button>'
        +(built?'':'<button class="minibtn danger" data-remove="'+c.id+'">Remove</button>')+'</div></div></details>'
        +'</div>'
        +'<span class="draghandle" title="Drag to reorder" aria-label="Drag to reorder">&#8942;&#8942;</span>'
        +'</div>';
    };
    var cbody='';
    if(grouped){
      /* Grouped. The learner sees which specialization each course belongs to and
         where it sits in the sequence, which is the whole point of having tracks. */
      groupByTrack(a,{hideMissing:true}).forEach(function(g){
        cbody+='<section class="grp libgrp">'+groupHeadHTML(g.track,g.items.length)
          +'<div class="homegrid">';
        g.items.forEach(function(it){cbody+=cardFor(it.c);});
        cbody+='</div></section>';
      });
    } else {
      cbody+='<div class="homegrid">';
      a.forEach(function(c){cbody+=cardFor(c);});
      cbody+='</div>';
    }
    cbody+='<div class="libempty" id="libempty" style="display:none">No courses match your search. <button class="chip" data-cat="__all">Clear filters</button></div>';
    if(!a.length){
      cbody+='<div class="emptylib"><div class="elico">'+IC.store+'</div><div class="elbig">Your library is empty</div>'
        +'<p class="sub">Every course starts in the Store. Browse the catalogue and add the ones you want — they’ll appear here with your progress.</p>'
        +'<a class="btn" href="#library/store">Browse the Store &#8594;</a></div>';
    }
    cbody+='<div class="homegrid"><a class="libcard addcard" href="#new"><div class="libbody"><b>+ Add a course</b><small>Load from JSON, or get a template.</small></div></a></div>';
    h+=collSection('mycourses','Your courses',a.length,cbody,true);
    /* Specializations now sit BELOW what you own. Above it, six rows of things
       you have not chosen read as the point of the screen. */
    var ts=allTracks();
    if(ts.length){
      var tbody='<div class="trackrows">';ts.forEach(function(t){tbody+=trackRow(t);});
      tbody+='</div><p class="chfoot">A specialization is an ordered set of courses ending in a program certificate. Browsing one does not commit you to it.</p>';
      h+=collSection('tracks','Specializations',ts.length,tbody,false);
    }
    h+='</div>';
    app.innerHTML=h;setTop(libStats().doneMods,libStats().totMods||1);
  } else {
    if(!backendEnabled())h+='<p class="sub libstoresub">Showing the bundled sample catalog.</p>';
    h+='<div id="storelist"><div class="revempty"><div class="revbig">Loading…</div></div></div>';
    h+='</div>';
    app.innerHTML=h;
    /* The full list is passed, not just what is missing: a sequence with holes in
       it cannot show you where a course sits. Owned courses stay in place, marked. */
    catalogList().then(function(list){renderStoreList(list||[]);})
      .catch(function(){renderStoreList([]);});
  }
}
/* ---------- specialization tracks ---------- */
function allTracks(){return window.TRACKS||[];}
function getTrack(id){var a=allTracks();for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
function trackStats(t){
  var ids=t.courseIds||[];var present=0,done=0;
  ids.forEach(function(id){var c=getCourse(id);if(c&&!isHidden(id)){present++;if(prog(id).finalPassed)done++;}});
  return {total:ids.length,present:present,done:done,pct:ids.length?Math.round(done/ids.length*100):0,complete:present>0&&done===ids.length};
}
function trackCard(t){var s=trackStats(t);
  return '<a class="trackcard" href="#track/'+t.id+'"><span class="tstripe" style="background:'+(t.accent||'#7b61ff')+'"></span>'
    +'<div class="tkbody"><div class="tktitle">'+R.esc(t.title)+'</div><div class="tksub">'+R.esc(t.tagline||'')+'</div>'
    +'<div class="tkbar"><i style="width:'+s.pct+'%;background:'+(t.accent||'#7b61ff')+'"></i></div>'
    +'<div class="tkmeta">'+(s.complete?'<span class="tkdone">Specialization complete &#10003;</span>':s.done+' of '+s.total+' courses'+(s.present<s.total?' · '+(s.total-s.present)+' coming soon':''))+'</div>'
    +'</div><span class="tkchev">&#8250;</span></a>';
}
function tracksSection(){
  var ts=allTracks();if(!ts.length)return '';
  var h='<div class="dashsection"><div class="secttitle">Specializations</div><div class="trackgrid">';
  ts.forEach(function(t){h+=trackCard(t);});
  return h+'</div></div>';
}
// the specialization the learner is currently progressing in (recent course's track, else most-progressed)
// the specialization the learner has explicitly chosen (persisted), if any
function chosenTrack(){var id=store.settings&&store.settings.track;return id?getTrack(id):null;}
function setChosenTrack(id){store.settings.track=id||'';save();}
// the specialization the learner is actually progressing in — an explicit choice wins,
// otherwise it is inferred from real progress. Returns null for a brand-new learner so
// the home page can invite them to pick one instead of assuming.
function currentTrack(){
  var ts=allTracks();if(!ts.length)return null;
  var pick=chosenTrack();if(pick)return pick;
  if(store.recent){var rc=store.recent.courseId;for(var i=0;i<ts.length;i++){if((ts[i].courseIds||[]).indexOf(rc)>-1)return ts[i];}}
  var best=null,bestScore=0;
  ts.forEach(function(t){var sc=0;(t.courseIds||[]).forEach(function(id){var c=getCourse(id);if(c){if(prog(id).finalPassed)sc+=10;else if(prog(id).lastPage||completedCount(c)>0)sc+=3;}});if(sc>bestScore){bestScore=sc;best=t;}});
  return bestScore>0?best:null;
}
// the invitation shown on the home page before a specialization has been picked
function trackChooserHTML(){
  var ts=allTracks();if(!ts.length)return '';
  var h='<section class="dashsection sec-track"><div class="secttitle">Choose your path</div>'
    +'<div class="chooser"><div class="chintro"><div class="chico">'+IC.track+'</div>'
    +'<div><b>Pick a specialization</b><p>A specialization is a sequence of courses that build on each other, ending in a program certificate. Choose the one you want to work toward — you can change it any time.</p></div></div>'
    +'<div class="chlist">';
  ts.forEach(function(t){var acc=t.accent||'#7b61ff';var n=(t.courseIds||[]).length;
    h+='<div class="chrow"><span class="chdot" style="background:'+acc+'"></span>'
      +'<div class="chbody"><a class="chtitle" href="#track/'+t.id+'">'+R.esc(t.title)+'</a>'
      +'<div class="chsub">'+R.esc(t.tagline||'')+'</div>'
      +'<div class="chmeta">'+n+' course'+(n===1?'':'s')+'</div></div>'
      +'<button class="chbtn" data-pick-track="'+t.id+'">Choose</button></div>';
  });
  h+='</div><p class="chfoot">Not sure yet? You can browse every specialization in the <a href="#library">Course Library</a>, or just start any course — nothing is locked behind this choice.</p></div></section>';
  return h;
}
// up to 2 suggestions: unstarted in-library courses first, then store courses not yet added
function suggestedCourses(){
  var out=[];
  orderedCourses().forEach(function(c){var p=prog(c.id);if(!(p.lastPage||completedCount(c)>0))out.push({course:c,inLib:true});});
  (window.STORE_CATALOG||[]).forEach(function(c){if(!getCourse(c.id))out.push({store:c,inLib:false});});
  return out.slice(0,2);
}
// label for a course a track lists but nobody has generated yet: an explicit title from
// tracks.json if there is one, otherwise a readable guess from the id
function prettyCourseId(id,t){
  if(t&&t.courseTitles&&t.courseTitles[id])return t.courseTitles[id];
  return id.replace(/^[a-z]+-\d+-/,'').replace(/-/g,' ').replace(/\b\w/g,function(m){return m.toUpperCase();});
}
// full-page specialization picker (reachable from "Change" on the home page)
function renderChoose(){
  var cur=chosenTrack();
  var h=topbar({href:'#',label:'My Learning'});
  h+='<div class="wrap dash"><header class="dashhead"><div class="kicker">Your path</div><h1>Choose a specialization</h1>'
    +'<p class="sub">Each specialization is an ordered set of courses that build toward a program certificate. Picking one sets what your home page tracks — it doesn’t lock anything, and you can change it whenever you like.</p></header>';
  h+='<div class="chlist chlist-page">';
  allTracks().forEach(function(t){var acc=t.accent||'#7b61ff';var st=trackStats(t);var on=cur&&cur.id===t.id;
    h+='<div class="chrow'+(on?' on':'')+'"><span class="chdot" style="background:'+acc+'"></span>'
      +'<div class="chbody"><a class="chtitle" href="#track/'+t.id+'">'+R.esc(t.title)+'</a>'
      +'<div class="chsub">'+R.esc(t.tagline||'')+'</div>'
      +'<div class="chmeta">'+st.total+' course'+(st.total===1?'':'s')+(st.done?' · '+st.done+' complete':'')+'</div></div>'
      +(on?'<span class="chon">&#10003; Current</span>':'<button class="chbtn" data-pick-track="'+t.id+'">Choose</button>')+'</div>';
  });
  h+='</div>';
  if(cur)h+='<div class="chclear"><button class="minibtn" data-pick-track="">Clear my specialization</button></div>';
  h+='</div>';
  app.innerHTML=h;
}
function renderTrack(id){
  var t=getTrack(id);if(!t){location.hash='';return;}
  var s=trackStats(t);var acc=t.accent||'#7b61ff';
  var h=topbar(backToList());
  h+='<div class="wrap dash">'
    +'<header class="tkhero" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'+coverSVG(t.id,acc,900,300)
    +'<div class="tkheroin"><div class="kicker">Specialization</div><h1>'+R.esc(t.title)+'</h1>'
    +'<p class="sub">'+R.esc(t.tagline||'')+'</p></div></header>';
  var mine=(store.settings&&store.settings.track)===t.id;
  h+='<div class="streakcard trackhead"><div class="stcell stgoal">'+snakeRing(s.pct,56,ringColor(acc),'<b>'+s.pct+'<i>%</i></b>','gl')+'<div class="stinfo"><b>'+s.done+' / '+s.total+'</b><small>courses complete</small></div></div>'
    +'<div class="stcell stpick">'+(mine
      ? '<span class="chon">&#10003; Your specialization</span><button class="minibtn" data-pick-track="">Remove</button>'
      : '<button class="chbtn" data-pick-track="'+t.id+'">Make this my specialization</button>')+'</div></div>';
  if(s.complete){
    h+='<div class="progcert"><div class="pcseal">Program Certificate</div><div class="pctitle">'+R.esc(t.title)+'</div><div class="pcbody">Completed all '+s.total+' courses in this specialization.</div><div class="pcdate" id="certdate"></div></div>';
  }
  // courses in order
  var cb='';
  (t.courseIds||[]).forEach(function(cid,i){
    var c=getCourse(cid);
    if(c&&!isHidden(cid)){var pr=prog(cid);var d=completedCount(c);var tot=moduleCount(c);var pct=tot?Math.round(d/tot*100):0;var started=!!pr.lastPage||d>0;
      cb+='<a class="row trow" href="#c/'+cid+'"><span class="trnum" style="background:'+acc+'">'+(pr.finalPassed?'&#10003;':(i+1))+'</span>'
        +'<div class="trbody"><div class="trtitle">'+R.esc(c.title)+'</div><div class="trbar"><i style="width:'+pct+'%;background:'+acc+'"></i></div>'
        +'<div class="trmeta">'+(pr.finalPassed?'Certified':(started?pct+'% · '+tot+' modules':tot+' modules · not started'))+'</div></div><span class="tkchev">&#8250;</span></a>';
    } else {
      // not in the library yet — is it available in the store?
      var inStore=(window.STORE_CATALOG||[]).filter(function(x){return x.id===cid;})[0];
      if(inStore){
        cb+='<a class="row trow instore" href="#library/store"><span class="trnum" style="background:var(--pill);color:var(--muted)">'+(i+1)+'</span>'
          +'<div class="trbody"><div class="trtitle">'+R.esc(inStore.title)+'</div><div class="trmeta">In the Store &middot; add it to start</div></div><span class="tkchev">&#8250;</span></a>';
      } else {
        cb+='<div class="row trow locked"><span class="trnum">'+(i+1)+'</span><div class="trbody"><div class="trtitle">'+R.esc(prettyCourseId(cid,t))+'</div><div class="trmeta">Coming soon</div></div></div>';
      }
    }
  });
  h+=collSection('tk-courses','Courses in order',(t.courseIds||[]).length,cb,true);
  /* The prose used to sit above this list: 1,048px of About and Outcomes before
     the navigation. Someone arriving here wants to know what to take and in
     what order; the essay follows, collapsed. */
  if(t.about) h+=collSection('tk-about','About this specialization',null,'<section class="tkabout"><p class="tkabouttxt">'+R.rich(t.about)+'</p></section>',false);
  if((t.outcomes||[]).length){
    var ob='<ul class="tkoutcomes">';
    t.outcomes.forEach(function(o){ob+='<li>'+R.rich(o)+'</li>';});
    ob+='</ul>';
    h+=collSection('tk-outcomes','What you\u2019ll be able to do',t.outcomes.length,ob,false);
  }
  // who does this in the real world
  if((t.careers||[]).length){
    var kb='<div class="careergrid">';
    t.careers.forEach(function(c){
      var role=Array.isArray(c)?c[0]:(c.role||''), desc=Array.isArray(c)?c[1]:(c.desc||'');
      kb+='<div class="career"><div class="crole"><span class="cdot" style="background:'+acc+'"></span>'+R.esc(role)+'</div><div class="cdesc">'+R.rich(desc)+'</div></div>';
    });
    kb+='</div>';
    h+=collSection('tk-careers','Where this leads',t.careers.length,kb,false);
  }
  // further reading
  if((t.reading||[]).length){
    var rb='<ul class="reslist">';
    t.reading.forEach(function(r){
      var ttl=Array.isArray(r)?r[0]:(r.title||''), why=Array.isArray(r)?r[1]:(r.note||'');
      rb+='<li><b>'+R.esc(ttl)+'</b>'+(why?' \u2014 '+R.rich(why):'')+'</li>';
    });
    rb+='</ul>';
    h+=collSection('tk-reading','Further reading',t.reading.length,'<div class="resources">'+rb+'</div>',false);
  }
  // related specializations
  var rel=(t.related||[]).map(getTrack).filter(Boolean);
  if(rel.length){
    var rl='<div class="trackrows">';
    rel.forEach(function(x){rl+=trackRow(x);});
    rl+='</div>';
    h+=collSection('tk-related','Related specializations',rel.length,rl,false);
  }
  h+='</div>';
  app.innerHTML=h;
}


/* ---------- transcript ---------- */
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function prettyDate(s){
  var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return s||'';
  return parseInt(m[3],10)+' '+MON[parseInt(m[2],10)-1]+' '+m[1];
}
function renderTranscript(){
  var rows=transcriptRows();
  var g=gpa();
  var h=topbar({href:'#badges',label:'Rewards'});
  h+='<div class="wrap dash"><header class="dashhead"><div class="kicker">Academic record</div><h1>Transcript</h1>'
    +'<p class="sub">Credits accrue module by module, weighted by study hours — one credit for every ten hours of coursework. A course is graded on its final exam.</p></header>';
  h+='<div class="trsum">'
    +'<div class="trs"><b>'+totalCredits()+'</b><small>credits earned</small></div>'
    +'<div class="trs"><b>'+rows.filter(function(r){return r.finished;}).length+'</b><small>courses completed</small></div>'
    +'<div class="trs"><b>'+(g!=null?g+'%':'—')+'</b><small>weighted average</small></div>'
    +'</div>';
  if(!rows.length){
    h+='<div class="revempty"><div class="revbig">Nothing on the record yet</div><p class="sub">Pass a module and it appears here with its credits.</p><a class="btn" href="#library">Open the library</a></div></div>';
    app.innerHTML=h;return;
  }
  h+='<div class="trlist">';
  rows.forEach(function(r){
    var c=r.course;var pctd=r.total?Math.round(r.modules/r.total*100):0;
    h+='<a class="trrow'+(r.finished?' done':'')+'" href="#c/'+c.id+'">'
      +'<span class="trstripe" style="background:'+(c.accent||'#5b8cff')+'"></span>'
      +'<div class="trmain"><div class="trhead"><b>'+R.esc(c.title)+'</b>'
        +(r.grade?'<span class="trgrade">'+r.grade+'</span>':'<span class="trgrade pending" title="Graded on the final exam">&mdash;</span>')+'</div>'
      +'<div class="trbar2"><i style="width:'+pctd+'%;background:'+(c.accent||'#5b8cff')+'"></i></div>'
      +'<div class="trmeta"><span>'+r.credits+' of '+r.max+' credits</span><span>'+r.modules+'/'+r.total+' modules</span>'
        +(r.finished?'<span class="trdone">Completed'+(r.date?' '+prettyDate(r.date):'')+'</span>':'<span>'+(r.total-r.modules)+' module'+(r.total-r.modules===1?'':'s')+' to go</span>')+'</div>'
      +'</div></a>';
  });
  h+='</div>';
  h+='<p class="setnote" style="margin:16px 2px 0">Credits are earned per module, so a course you never finish still counts for the work you did. Grades come from the final exam: 93+ is an A, 90+ an A−, and so on down to 70. The weighted average uses credits, not course count.</p>';
  h+='</div>';
  app.innerHTML=h;
}
/* Quiet quarter markers on the course page — a ribbon, not a popup. */
function milestoneRibbonHTML(cid){
  var ms=courseMilestones(cid);if(!ms.length)return '';
  var c=getCourse(cid);var tot=moduleCount(c);var done=completedCount(c);
  var pct=tot?Math.round(done/tot*100):0;
  var h='<div class="milerow" aria-label="Course milestones">';
  ms.forEach(function(m){
    h+='<div class="mile'+(m.reached?' on':'')+'"><span class="miledot">'+(m.reached?'&#10003;':m.pct+'%')+'</span><small>'+R.esc(m.label)+'</small></div>';
  });
  h+='</div>';
  var next=ms.filter(function(m){return !m.reached;})[0];
  h+='<p class="milecap">'+earnedCredits(cid)+' of '+courseCredits(c)+' credits earned'
    +(next?' · '+(Math.ceil(tot*next.pct/100)-done)+' more module'+((Math.ceil(tot*next.pct/100)-done)>1?'s':'')+' to \u201c'+R.esc(next.label)+'\u201d':' · every milestone reached')+'</p>';
  return h;
}

function renderCreate(){
  var h=topbar({href:'#library',label:'Library'});
  h+='<div class="wrap"><section class="panelcard">'
    +'<h2 class="big">Add / create a course</h2>'
    +'<p class="sub" style="text-align:left">Load a course from JSON below. You can paste JSON, or choose a <b>.json</b> file. Need one built for you? Ask in chat and load the file here.</p>'
    +'<div class="btnrow"><label class="btn ghost filelabel">Choose .json file<input type="file" id="importfile" accept="application/json,.json" hidden></label>'
    +'<button class="btn ghost" id="tplbtn">Download blank template</button></div>'
    +'<textarea id="importjson" class="jsonbox" placeholder="Paste course JSON here..."></textarea>'
    +'<div class="btnrow"><button class="btn" id="loadbtn">Load course</button><button class="btn ghost" id="checkbtn">Check only</button></div>'
    +'<div id="importresult"></div>'
    +'<details class="card2" style="margin-top:16px"><summary>Course JSON format (quick reference)</summary><div class="body2"><pre class="pre">{\n  "id": "unique-id",\n  "title": "Course title",\n  "subtitle": "One line",\n  "tagline": "Shown on the library card",\n  "accent": "#5b8cff",\n  "modules": [{\n    "title": "Module 1",\n    "tagline": "...",\n    "objectives": ["...","..."],\n    "lessons": [{ "title":"Lesson", "blocks":[\n      {"t":"p","html":"A paragraph"},\n      {"t":"h","text":"A subheading"},\n      {"t":"callout","kind":"tip","label":"Note","html":"..."},\n      {"t":"chart","title":"...","candles":[[o,h,l,c]],"annotations":[{"type":"hline","price":10,"label":"Support"}]},\n      {"t":"kcheck","q":"?","options":["a","b"],"answer":1,"explain":"why"}\n    ]}],\n    "quiz": { "pick": 5, "questions": [\n      {"q":"Single answer?","options":["a","b"],"answer":1,"explain":"why"},\n      {"type":"multi","q":"Select all?","options":["a","b","c"],"answers":[0,2],"explain":"why"},\n      {"type":"text","q":"Type it:","accept":["answer","alt"],"explain":"why"}\n    ] }\n  }],\n  "finalExam": { "pick": 15, "questions": [ ... ] }\n}</pre>Block types: p, h, callout, analogy, list, table, kcheck, explorer, stepper, flip, tabs, chart, code, html, and media: image, video, compare. Media: <code>{"t":"image","src":"URL","alt":"...","caption":"...","wide":true}</code>; <code>{"t":"video","provider":"youtube","id":"VIDEOID","caption":"..."}</code> (or provider "vimeo" with id, or "file" with src); <code>{"t":"compare","before":{"src":"URL","label":"Before"},"after":{"src":"URL","label":"After"},"caption":"...","ratio":"16/9"}</code>. A lesson can also be {"title","html":"raw html"}.<br><br>Question types: default is single-choice (<code>answer</code> = index). Add <code>"type":"multi"</code> with <code>"answers":[..]</code> for select-all, or <code>"type":"text"</code> with <code>"accept":[..]</code> for a typed answer. Add <code>"pick":N</code> to a quiz or finalExam to draw N random questions from a larger pool; question and option order shuffle on every attempt.</div></details>'
    +'</section></div>';
  app.innerHTML=h;setTop(0,1);
}

function renderCourseHome(c){
  var p=prog(c.id);var tot=moduleCount(c);var done=completedCount(c);var pct=tot?Math.round(done/tot*100):0;
  var acc=c.accent||'#5b8cff';
  var h=topbar(backToList());
  /* the course's colour is set once on the wrapper, so the cover, the button and
     every accent inside the page come from one place rather than three */
  h+='<div class="wrap oncourse" style="--ga:'+acc+';--cta:'+solidOf(acc)+';--gk:'+ringColor(acc)+'">';
  /* The old order put a 244px legal notice between the header and the Resume
     button, so every study session began by scrolling past a disclaimer. The
     action you came for now sits directly under the header; the notice is still
     there, one line, one tap from its full text. */
  h+='<header class="chero" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'+coverSVG(c.id,acc,900,300)
    +'<div class="cheroin"><div class="kicker">'+R.esc(courseCategory(c))+'</div>'
    +'<h1>'+R.esc(c.title)+'</h1>'
    +'<p class="cherosub">'+R.esc(c.subtitle||c.tagline||'')+'</p>'
    +'<div class="cherometa">'+courseHours(c)+' hours · '+tot+' modules'
    +(p.finalPassed?' · <b>Certified</b>':(done?' · '+pct+'% complete':''))+'</div></div></header>';

  // the reason the page was opened
  var nml=nextMilestoneLabel(c);
  var resumable=p.lastPage&&!pageLocked(c,p.lastPage)&&pageSeq(c).indexOf(p.lastPage)>-1;
  var firstPage=tot?'m1-intro':null;
  if(resumable){
    h+='<a class="cgo" href="#c/'+c.id+'/'+p.lastPage+'" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
      +'<span class="cgotxt"><b>Resume</b><small>'+labelFor(c,p.lastPage)+' · '+nml.main+'</small></span>'
      +'<span class="cgobtn">Continue &#8594;</span></a>';
  } else if(p.finalPassed){
    h+='<a class="cgo done" href="#c/'+c.id+'/cert" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
      +'<span class="cgotxt"><b>Certified</b><small>'+courseCredits(c)+' credits earned · view your certificate</small></span>'
      +'<span class="cgobtn">Certificate &#8594;</span></a>';
  } else if(firstPage){
    h+='<a class="cgo" href="#c/'+c.id+'/'+firstPage+'" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
      +'<span class="cgotxt"><b>Start the course</b><small>Module 1 · '+R.esc(c.modules[0].title)+'</small></span>'
      +'<span class="cgobtn">Begin &#8594;</span></a>';
  }

  // progress: one compact strip, not a panel plus a ribbon plus a caption
  if(done||p.lastPage){
    h+='<div class="cprog"><div class="cprogtop"><span class="cprogpct">'+pct+'%</span>'
      +'<span class="cprogtxt">'+done+' of '+tot+' modules · '+(p.finalPassed?courseCredits(c)+' credits':nml.main)+'</span></div>'
      +'<div class="courseflow">';
    for(var n=1;n<=tot;n++)h+='<span class="pip'+(passedModule(c,n)?' done':'')+'"></span>';
    h+='</div></div>';
    h+=milestoneRibbonHTML(c.id);
  }

  if(c.disclaimer)h+='<details class="discl"><summary><span class="dlbl">Important</span>'
    +'<span class="dsum">Educational only — read the full notice</span></summary>'
    +'<div class="dbody">'+c.disclaimer+'</div></details>';

  // quick links
  h+='<div class="quicklinks"><a class="qlink" href="#c/'+c.id+'/search"><span>'+IC.search+'</span> Search this course</a>'
    +'<a class="qlink" href="#c/'+c.id+'/glossary"><span>'+gi('list')+'</span> Glossary &amp; key terms</a>'
    +'<a class="qlink'+(allPassed(c)?'':' dim')+'" href="'+(allPassed(c)?'#c/'+c.id+'/final':'#c/'+c.id)+'"><span>'+gi('star')+'</span> Final exam</a>'
    +'<a class="qlink'+(p.finalPassed?'':' dim')+'" href="'+(p.finalPassed?'#c/'+c.id+'/cert':'#c/'+c.id)+'"><span>'+gi('cap')+'</span> Certificate</a></div>';
  // study & practice modes
  var hasG=courseHasGlossary(c);
  h+='<div class="homehead">Study &amp; practice</div><div class="studygrid">';
  h+='<a class="studytile" href="#c/'+c.id+'/practice"><span class="sgico">'+gi('target')+'</span><b>Practice test</b><small>Drill random or weak-spot questions</small></a>';
  if(hasG){
    h+='<a class="studytile" href="#c/'+c.id+'/flash"><span class="sgico">'+gi('cards')+'</span><b>Flashcards</b><small>Flip through the key terms</small></a>';
    h+='<a class="studytile" href="#c/'+c.id+'/match"><span class="sgico">'+gi('pair')+'</span><b>Match</b><small>Pair terms to definitions, beat the clock</small></a>';
  }
  h+='</div>';
  // module toggle-cards with a direct Start button + collapsible info/lessons
  /* Locked modules used to render as full cards — six of them contributed 420px
     of rows nobody can tap. They fold into one line that expands on request. */
  var firstLocked=0;
  for(var fl=1;fl<=tot;fl++){if(!moduleUnlocked(c,fl)){firstLocked=fl;break;}}
  var lockedCount=firstLocked?(tot-firstLocked+1):0;
  var lockedFolded=lockedCount>2&&!sectOpen('lockedmods',false);
  var lastShown=lockedFolded?firstLocked-1:tot;
  h+='<div class="homehead">Modules &amp; lessons</div>';
  for(var n2=1;n2<=lastShown;n2++){
    var mod=c.modules[n2-1];var locked=!moduleUnlocked(c,n2);var pass=passedModule(c,n2);
    var inProg=(p.lastPage&&p.lastPage.indexOf('m'+n2+'-')===0);
    var startLbl=pass?'Review':(inProg?'Continue':'Start');
    /* The row carried a full-width button and a chevron, which left the title
       about 150px and truncated most of them. The row is now one link to the
       module's own page; the chevron alone expands the lessons. */
    h+='<div class="modcard'+(pass?' isdone':'')+(locked?' locked':'')+'">'
      +'<div class="modrow">'
      +'<a class="macmain" href="#m/'+c.id+'/'+n2+'">'
      +'<span class="macnum">'+(pass?'&#10003;':n2)+'</span>'
      +'<span class="macmeta"><b>'+R.esc(mod.title)+'</b><span class="macstat">'
        +(pass?'Passed':(locked?moduleHours(mod)+'h &middot; on its own':mod.lessons.length+' lessons &middot; '+startLbl))+'</span></span>'
      +'</a>'
      +'<button class="macchev" data-mtoggle aria-label="Show lessons">&#9662;</button>'
      +'</div>'
      +'<div class="modbody">';
    if(mod.tagline)h+='<p class="modtag">'+mod.tagline+'</p>';
    if(locked){ h+='<div class="acclock">Complete Module '+(n2-1)+' to unlock these in sequence &mdash; or <a href="#m/'+c.id+'/'+n2+'">take this module on its own</a>.</div>';
      h+='<div class="acclesson dim"><span class="acli">i</span> Overview &amp; objectives</div>';
      mod.lessons.forEach(function(l,li){h+='<div class="acclesson dim"><span class="acli">'+(li+1)+'</span> '+R.esc(l.title)+'<span class="accmin">'+lessonMinutes(l)+' min</span></div>';});
    } else {
      h+='<a class="acclesson" href="#c/'+c.id+'/m'+n2+'-intro"><span class="acli">i</span> Overview &amp; objectives</a>';
      mod.lessons.forEach(function(l,li){h+='<a class="acclesson" href="#c/'+c.id+'/m'+n2+'-l'+(li+1)+'"><span class="acli">'+(li+1)+'</span> '+R.esc(l.title)+'<span class="accmin">'+lessonMinutes(l)+' min</span></a>';});
      h+='<a class="acclesson quizrow'+(pass?' done':'')+'" href="#c/'+c.id+'/m'+n2+'-quiz"><span class="acli">&#10003;</span> Module quiz'+(pass?' — passed':'')+'</a>';
    }
    h+='</div></div>';
  }
  if(lockedFolded){
    h+='<button class="lockfold" data-secttoggle="lockedmods" aria-expanded="false">'
      +'<span class="lfico">'+gi('lock')+'</span>'
      +'<span class="lftxt"><b>'+lockedCount+' more modules</b><small>They unlock in order &mdash; or take any one on its own</small></span>'
      +'<span class="lfchev">&#9662;</span></button>';
  } else if(lockedCount>2){
    h+='<button class="lockfold open" data-secttoggle="lockedmods" aria-expanded="true">'
      +'<span class="lfico">'+gi('lock')+'</span><span class="lftxt"><b>Hide locked modules</b></span>'
      +'<span class="lfchev">&#9652;</span></button>';
  }
  var fLock=!allPassed(c);
  h+='<a class="row ccard exam'+(p.finalPassed?' isdone':'')+(fLock?' locked':'')+'" href="'+(fLock?'#c/'+c.id:'#c/'+c.id+'/final')+'"><div class="num">'+(p.finalPassed?'&#10003;':gi('star'))+'</div><div class="meta"><b>Final Exam</b><small>'+(((c.finalExam||{}).questions||[]).length)+' questions across all modules</small></div><div class="go">Open &#8594;</div><span class="lockicon">'+gi('lock')+' Locked</span></a>';
  var cLock=!p.finalPassed;
  h+='<a class="row ccard cert'+(cLock?' locked':'')+'" href="'+(cLock?'#c/'+c.id:'#c/'+c.id+'/cert')+'"><div class="num">'+gi('cap')+'</div><div class="meta"><b>Certificate</b><small>Add your name, print or save as PDF</small></div><div class="go">Open &#8594;</div><span class="lockicon">'+gi('lock')+' Locked</span></a>';
  h+='<div class="resetrow"><button class="resetbtn" data-reset="'+c.id+'">Reset this course’s progress</button></div>';
  h+='</div>';
  app.innerHTML=h;setTop(done+(p.finalPassed?1:0),tot+1);
}
/* ------------------------------------------------------------------
   A module's own page. Reachable from the course, from a path, or directly —
   and the place where "take just this one" is an actual offer rather than an
   implication.
   ------------------------------------------------------------------ */
function renderModule(c,n){
  var mod=c.modules&&c.modules[n-1];
  if(!mod){location.hash='#c/'+c.id;return;}
  var acc=c.accent||'#5b8cff';
  var p=prog(c.id);
  var pass=passedModule(c,n);
  var unlocked=moduleUnlocked(c,n);
  var solo=isSolo(c.id,n);
  var inPaths=pathsWith(c.id,n);
  var lessons=(mod.lessons||[]).length;
  var inProg=p.lastPage&&p.lastPage.indexOf('m'+n+'-')===0;
  var h=topbar({href:'#c/'+c.id,label:c.title.length>22?c.title.slice(0,20)+'…':c.title});
  h+='<div class="wrap oncourse" style="--ga:'+acc+';--cta:'+solidOf(acc)+';--gk:'+ringColor(acc)+'">';
  h+='<header class="chero mhero" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'+coverSVG(c.id+'/m'+n,acc,900,300)
    +'<div class="cheroin"><div class="kicker">Module '+n+' of '+moduleCount(c)+'</div>'
    +'<h1>'+R.esc(mod.title)+'</h1>'
    +(mod.tagline?'<p class="cherosub">'+R.esc(mod.tagline)+'</p>':'')
    +'<div class="cherometa">'+lessons+' lesson'+(lessons===1?'':'s')+' · about '+moduleHours(mod)+' hours · '+moduleCredits(mod)+' credit'+(moduleCredits(mod)===1?'':'s')+'</div>'
    +'<div class="cheroread">'+readLabel(moduleReadMinutes(mod))+'</div>'
    +'</div></header>';

  if(pass){
    h+='<a class="cgo done" href="#c/'+c.id+'/m'+n+'-intro" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
      +'<span class="cgotxt"><b>Passed</b><small>'+moduleCredits(mod)+' credits earned · open it again to review</small></span>'
      +'<span class="cgobtn">Review →</span></a>';
  } else if(unlocked){
    var to=inProg?p.lastPage:'m'+n+'-intro';
    h+='<a class="cgo" href="#c/'+c.id+'/'+to+'" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
      +'<span class="cgotxt"><b>'+(inProg?'Resume this module':'Start this module')+'</b><small>'+(inProg?labelFor(c,p.lastPage):'Overview & objectives first')+'</small></span>'
      +'<span class="cgobtn">'+(inProg?'Continue':'Begin')+' →</span></a>';
  } else {
    /* The offer, stated plainly. The course order still exists for anyone who
       wants it; this is the door for someone who wants four hours on one topic. */
    h+='<div class="soloffer" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
      +'<div class="sofhead"><b>Take this module on its own</b></div>'
      +'<p class="sofbody">About '+moduleHours(mod)+' hours. You keep the credit whether or not you ever '
      +'take the rest of <em>'+R.esc(c.title)+'</em>.</p>'
      +'<button class="sofbtn" data-solo="'+c.id+'/'+n+'">Open module '+n+' →</button>'
      +'<a class="soflink" href="#c/'+c.id+'/m1-intro">Or start the course from the beginning</a></div>';
  }

  if(solo||inPaths.length){
    var why=solo?'Opened on its own':'In your path'+(inPaths.length>1?'s':'');
    var names=inPaths.map(function(x){return '<a href="#path/'+x.id+'">'+R.esc(x.name)+'</a>';}).join(', ');
    h+='<div class="modwhy"><span class="mwdot" style="background:'+acc+'"></span>'+why+(names?' · '+names:'')+'</div>';
  }

  if((mod.objectives||[]).length){
    var ob='<ul class="tkoutcomes">';
    mod.objectives.forEach(function(o){ob+='<li>'+R.rich(o)+'</li>';});
    ob+='</ul>';
    h+=collSection('mod-obj','What you’ll be able to do',mod.objectives.length,ob,true);
  }

  var lb='';
  if(unlocked){
    lb+='<a class="acclesson" href="#c/'+c.id+'/m'+n+'-intro"><span class="acli">i</span> Overview & objectives</a>';
    (mod.lessons||[]).forEach(function(l,li){
      lb+='<a class="acclesson" href="#c/'+c.id+'/m'+n+'-l'+(li+1)+'"><span class="acli">'+(li+1)+'</span> '+R.esc(l.title)
        +'<span class="accmin">'+lessonMinutes(l)+' min</span></a>';});
    if(mod.quiz)lb+='<a class="acclesson quizrow'+(pass?' done':'')+'" href="#c/'+c.id+'/m'+n+'-quiz"><span class="acli">✓</span> Module quiz'+(pass?' — passed':'')+'</a>';
  } else {
    lb+='<div class="acclesson dim"><span class="acli">i</span> Overview & objectives</div>';
    (mod.lessons||[]).forEach(function(l,li){
      lb+='<div class="acclesson dim"><span class="acli">'+(li+1)+'</span> '+R.esc(l.title)
        +'<span class="accmin">'+lessonMinutes(l)+' min</span></div>';});
    if(mod.quiz)lb+='<div class="acclesson dim"><span class="acli">✓</span> Module quiz</div>';
  }
  h+=collSection('mod-lessons','In this module',lessons+(mod.quiz?1:0),lb,true);

  h+=pathPickerHTML(c.id,n);
  h+='<a class="row ccard" href="#c/'+c.id+'"><div class="num">'+gi('list')+'</div><div class="meta"><b>'+R.esc(c.title)+'</b><small>The full course · '+moduleCount(c)+' modules · '+courseHours(c)+' hours</small></div><div class="go">Open →</div></a>';
  h+='</div>';
  app.innerHTML=h;
}
/* Adding a module to a path from wherever you happen to be looking at it. */
function pathPickerHTML(cid,n){
  var l=paths();
  var b='<div class="pathpick">';
  if(!l.length){
    b+='<p class="ppempty">You haven’t designed a path yet. A path is a run of modules you choose, in the order you want them.</p>'
      +'<a class="ppnew" href="#design">Design a path →</a>';
  } else {
    l.forEach(function(p){
      var on=(p.items||[]).some(function(i){return i.c===cid&&i.n===n;});
      b+='<button class="row pprow'+(on?' on':'')+'" data-pathadd="'+p.id+'|'+cid+'|'+n+'" aria-pressed="'+(on?'true':'false')+'">'
        +'<span class="ppbox">'+(on?'✓':'+')+'</span>'
        +'<span class="pptxt"><b>'+R.esc(p.name)+'</b><small>'+((p.items||[]).length)+' modules</small></span></button>';
    });
    b+='<a class="ppnew" href="#design">Design another path →</a>';
  }
  b+='</div>';
  return collSection('mod-paths','Add to a path',l.length||null,b,false);
}

/* ------------------------------------------------------------------
   Design your learning.
   ------------------------------------------------------------------ */
/* Six courses of nine modules is 54 rows. Flat, that is a twelve-screen page and
   nothing is findable; grouped by course and closed, it is six lines. */
function moduleCatalogHTML(opts){
  opts=opts||{};
  var p=opts.path;
  var list=courses().filter(function(c){return Array.isArray(c.modules)&&c.modules.length;});
  if(!list.length)return '<p class="ppempty">Add a course from the store first.</p>';
  var out='';
  list.forEach(function(c){
    var chosen=p?(p.items||[]).filter(function(i){return i.c===c.id;}).length:0;
    var passed=completedCount(c);
    var rows='';
    c.modules.forEach(function(m,i){
      var n=i+1;
      var meta=((m.lessons||[]).length)+' lessons · '+moduleHours(m)+'h · '+moduleCredits(m)+' cr';
      if(p){
        var on=(p.items||[]).some(function(it){return it.c===c.id&&it.n===n;});
        rows+='<button class="row dsmod pick'+(on?' on':'')+'" data-pathadd="'+p.id+'|'+c.id+'|'+n+'" aria-pressed="'+(on?'true':'false')+'">'
          +'<span class="ppbox">'+(on?'✓':'+')+'</span>'
          +'<span class="dstxt"><b>'+R.esc(m.title)+'</b><small>'+meta+'</small></span></button>';
      } else {
        rows+='<a class="row dsmod" href="#m/'+c.id+'/'+n+'">'
          +'<span class="dsnum">'+n+'</span>'
          +'<span class="dstxt"><b>'+R.esc(m.title)+'</b><small>'+meta+'</small></span>'
          +(passedModule(c,n)?'<span class="dsdone">✓</span>':'<span class="tkchev">›</span>')+'</a>';
      }
    });
    var tag=chosen?chosen+' added':(passed?passed+' passed':c.modules.length+' modules');
    out+='<details class="dsgrp"'+(chosen?' open':'')+'>'
      +'<summary class="dsgs"><span class="dgdot" style="background:'+(c.accent||'#5b8cff')+'"></span>'
      +'<span class="dgname">'+R.esc(c.title)+'</span>'
      +'<span class="dgcount'+(chosen?' on':'')+'">'+tag+'</span>'
      +'<span class="dgchev">▾</span></summary>'
      +'<div class="dsgb">'+rows+'</div></details>';
  });
  return out;
}
function renderDesign(){
  var l=paths();
  var h=topbar(backToList());
  h+='<div class="wrap dash">';
  h+='<header class="dshero"><div class="kicker">Design your learning</div>'
    +'<h1>Your own paths</h1>'
    +'<p class="sub">Take a module on its own, or string modules from any courses into a path '
    +'and work through it in the order you choose. Credits count either way.</p></header>';

  h+='<form class="newpath" id="newpathform">'
    +'<input class="npin" id="npname" type="text" maxlength="48" placeholder="Name a path — e.g. Money in 8 hours" aria-label="Name your new path">'
    +'<button class="npbtn" type="submit">Create</button></form>';

  if(l.length){
    h+='<div class="pathgrid">';
    l.forEach(function(p){
      var st=pathStats(p);
      var acc=pathAccent(p);
      h+='<a class="row pathcard" href="#path/'+p.id+'" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
        +ringHTML(st.pct,acc,st.complete?'✓':st.pct+'%')
        +'<div class="pcmeta"><b>'+R.esc(p.name)+'</b>'
        +'<small>'+(st.total?st.done+' of '+st.total+' modules · about '+st.hours+' hours':'Empty — add some modules')+'</small></div>'
        +'<span class="tkchev">›</span></a>';
    });
    h+='</div>';
  } else {
    h+='<div class="dsempty"><p>Nothing yet. Name a path above, then add modules to it from any course — '
      +'or from a module’s own page.</p></div>';
  }

  // the module catalogue, course by course, each course closed
  h+=collSection('ds-cat','Every module in your library',null,moduleCatalogHTML({}),true);
  h+='</div>';
  app.innerHTML=h;
  var f=document.getElementById('newpathform');
  if(f)f.addEventListener('submit',function(e){
    e.preventDefault();
    var v=(document.getElementById('npname').value||'').trim();
    if(!v)return;
    var p=newPath(v);location.hash='#path/'+p.id;
  });
}
function pathAccent(p){
  var rows=pathRows(p);
  return (rows[0]&&rows[0].c.accent)||'#7b61ff';
}
function ringHTML(pct,acc,label){
  return snakeRing(pct,52,ringColor(acc),'<b class="rl">'+label+'</b>','pc');
}
function renderPath(id){
  var p=getPath(id);
  if(!p){location.hash='#design';return;}
  var st=pathStats(p);var acc=pathAccent(p);
  var h=topbar({href:'#design',label:'Paths'});
  h+='<div class="wrap dash oncourse" style="--ga:'+acc+';--cta:'+solidOf(acc)+';--gk:'+ringColor(acc)+'">';
  h+='<header class="chero phero" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'+coverSVG('path:'+p.id,acc,900,300)
    +'<div class="cheroin"><div class="kicker">Your path</div>'
    +'<h1>'+R.esc(p.name)+'</h1>'
    +'<div class="cherometa">'+(st.total?st.total+' modules · about '+st.hours+' hours · '+st.credits+' credits':'No modules yet')+'</div>'
    +'</div></header>';

  var nx=pathNext(p);
  if(st.complete){
    h+='<div class="cgo done" style="--ga:'+acc+';--cta:'+solidOf(acc)+'"><span class="cgotxt"><b>Path complete</b>'
      +'<small>'+st.earned+' credits earned across '+st.total+' modules</small></span>'
      +'<span class="cgobtn">✓</span></div>';
  } else if(nx){
    h+='<a class="cgo" href="#m/'+nx.c.id+'/'+nx.n+'" style="--ga:'+acc+';--cta:'+solidOf(acc)+'">'
      +'<span class="cgotxt"><b>'+(st.done?'Continue':'Start')+'</b><small>'+R.esc(nx.mod.title)+' · '+R.esc(nx.c.title)+'</small></span>'
      +'<span class="cgobtn">Open →</span></a>';
  }
  if(st.total){
    h+='<div class="cprog"><div class="cprogtop"><span class="cprogpct">'+st.pct+'%</span>'
      +'<span class="cprogtxt">'+st.done+' of '+st.total+' modules · '+st.earned+' of '+st.credits+' credits</span></div>'
      +'<div class="courseflow">';
    st.rows.forEach(function(r){h+='<span class="pip'+(r.passed?' done':'')+'"></span>';});
    h+='</div></div>';
  }

  /* Three 44px controls per row ate 132px of a 393px screen, which is why module
     titles clamped and course names ellipsised. Reordering is rare; reading the
     list is not. The controls live behind an edit toggle. */
  var editing=sectOpen('path-edit',false);
  /* not data-secttoggle: this button sits inside a collapsible section, and that
     handler walks up to the nearest .coll and would close the list instead */
  var rb='<div class="pedit"><button class="pedbtn'+(editing?' on':'')+'" data-pedit aria-pressed="'+(editing?'true':'false')+'">'
    +gi(editing?'check':'pencil')+(editing?'Done':'Reorder')+'</button></div>';
  st.rows.forEach(function(r,i){
    rb+='<div class="row prow'+(r.passed?' done':'')+(editing?' editing':'')+'">'
      +'<a class="prmain" href="#m/'+r.c.id+'/'+r.n+'">'
      +'<span class="prnum" style="background:'+(r.passed?acc:'var(--pill)')+';color:'+(r.passed?'#fff':'var(--muted)')+'">'+(r.passed?'&#10003;':(i+1))+'</span>'
      +'<span class="prtxt"><b>'+R.esc(r.mod.title)+'</b><small>'+R.esc(r.c.title)+' &middot; module '+r.n+' &middot; '+moduleHours(r.mod)+'h</small></span></a>'
      +(editing
        ? '<span class="prctl">'
          +'<button class="prb" data-pmove="'+p.id+'|'+i+'|-1" aria-label="Move up"'+(i===0?' disabled':'')+'>&#8593;</button>'
          +'<button class="prb" data-pmove="'+p.id+'|'+i+'|1" aria-label="Move down"'+(i===st.rows.length-1?' disabled':'')+'>&#8595;</button>'
          +'<button class="prb del" data-pdel="'+p.id+'|'+r.c.id+'|'+r.n+'" aria-label="Remove from path">&#10005;</button>'
          +'</span>'
        : '<span class="prchev">&#8250;</span>')
      +'</div>';
  });
  if(!st.total)rb='<p class="ppempty">Nothing in this path yet. Pick modules below.</p>';
  h+=collSection('path-items','Modules in order',st.total||null,rb,true);

  // picker: every module in the library, grouped by course
  h+=collSection('path-add','Add modules',null,moduleCatalogHTML({path:p}),true);
  h+='<div class="resetrow"><button class="resetbtn" data-pathdel="'+p.id+'">Delete this path</button></div>';
  h+='</div>';
  app.innerHTML=h;
}
/* ------------------------------------------------------------------
   Search inside a course.

   The glossary answers "what does this word mean". This answers the other
   question a learner actually asks — "where was that bit about X" — which
   previously had no answer at all short of opening modules one at a time.

   The index is built from the course's own blocks the first time it is asked
   for and then kept, because walking 260 blocks per keystroke is wasteful and
   the course does not change while you are reading it. Locked pages still
   appear: refusing to admit that a passage exists is not the same as locking
   it, and every module can be opened on its own anyway.
   ------------------------------------------------------------------ */
/* Figures are SVG, so a naive walk indexes colour codes and coordinates and then
   offers them back as a search result. Only the readable parts are indexed:
   the labels inside the drawing, its aria-label, and its caption. */
var _NOTEXT={d:1,fill:1,stroke:1,color:1,accent:1,id:1,href:1,src:1,points:1,path:1,
  x:1,y:1,w:1,h:1,width:1,height:1,cx:1,cy:1,r:1,answer:1,a:1,kind:1,align:1,lang:1,seed:1};
function _svgText(sv){
  var out=[];
  var al=/aria-label="([^"]*)"/.exec(sv);if(al)out.push(al[1]);
  var re=/<(?:text|tspan|title|desc)[^>]*>([\s\S]*?)<\/(?:text|tspan|title|desc)>/gi,m;
  while((m=re.exec(sv)))out.push(m[1].replace(/<[^>]+>/g,' '));
  return out.join(' ');
}
function _textOf(o,key){
  if(o==null)return '';
  if(typeof o==='string'){
    if(key&&_NOTEXT[key])return '';
    if(/^\s*<svg/i.test(o))return _svgText(o);
    if(/^#[0-9a-f]{3,8}$/i.test(o.trim()))return '';
    return o.replace(/<[^>]+>/g,' ');
  }
  if(typeof o==='number')return '';
  if(Array.isArray(o)){var a=[];for(var i=0;i<o.length;i++)a.push(_textOf(o[i],key));return a.join(' ');}
  if(typeof o==='object'){var b=[];for(var k in o){if(k==='t'||_NOTEXT[k])continue;b.push(_textOf(o[k],k));}return b.join(' ');}
  return '';
}
function _decode(t){
  return String(t).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&rsquo;|&lsquo;/g,'’')
    .replace(/&ldquo;|&rdquo;/g,'"').replace(/&mdash;/g,'—').replace(/&ndash;/g,'–')
    .replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim();
}
var KINDNAME={p:'Text',h:'Heading',callout:'Callout',table:'Table',list:'List',stepper:'Steps',
  code:'Code',formula:'Formula',image:'Figure',chart:'Chart',annotate:'Figure',kcheck:'Knowledge check',
  analogy:'Analogy',flip:'Flip card',tabs:'Tabs',rubric:'Assignment',explorer:'Explorer',resources:'Resources'};
var _cIndex={};
function courseIndex(c){
  if(!c||!Array.isArray(c.modules))return [];
  if(_cIndex[c.id])return _cIndex[c.id];
  var out=[];
  c.modules.forEach(function(m,mi){
    var n=mi+1;
    (m.lessons||[]).forEach(function(l,li){
      var pg='m'+n+'-l'+(li+1);
      var where='Module '+n+' · Lesson '+(li+1);
      out.push({pg:pg,n:n,where:where,lesson:l.title,kind:'Lesson title',
        text:_decode(l.title),hay:_decode(l.title).toLowerCase()});
      (l.blocks||[]).forEach(function(b){
        var t=_decode(_textOf(b));
        if(t.length<3)return;
        out.push({pg:pg,n:n,where:where,lesson:l.title,kind:KINDNAME[b.t]||'Text',
          text:t,hay:t.toLowerCase()});
      });
      (l.glossary||[]).forEach(function(g){
        var term=_decode(g[0]||''),def=_decode(g[1]||'');
        if(!term)return;
        out.push({pg:pg,n:n,where:where,lesson:l.title,kind:'Term',
          text:term+' — '+def,hay:(term+' '+def).toLowerCase()});
      });
    });
  });
  _cIndex[c.id]=out;
  return out;
}
function searchCourse(c,q){
  q=String(q||'').trim().toLowerCase();
  if(q.length<2)return [];
  var terms=q.split(/\s+/).filter(Boolean);
  var hits=[];
  courseIndex(c).forEach(function(e){
    var all=true,first=-1;
    for(var i=0;i<terms.length;i++){
      var at=e.hay.indexOf(terms[i]);
      if(at<0){all=false;break;}
      if(first<0||at<first)first=at;
    }
    if(!all)return;
    /* a title match outranks a passing mention in the middle of a paragraph */
    var score=(e.kind==='Lesson title'?0:e.kind==='Term'?1:e.kind==='Heading'?2:3)*1000+first;
    hits.push({e:e,at:first,score:score});
  });
  hits.sort(function(a,b){return a.score-b.score;});
  return hits.slice(0,60);
}
function _snippet(text,at,q){
  var pad=64;
  var s=Math.max(0,at-pad),e=Math.min(text.length,at+q.length+pad);
  if(s>0){var sp=text.indexOf(' ',s);if(sp>-1&&sp<at)s=sp+1;}
  var cut=text.slice(s,e);
  var out=(s>0?'…':'')+R.esc(cut)+(e<text.length?'…':'');
  /* highlight every occurrence of the query inside the snippet, case-insensitively */
  var esc=R.esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  try{out=out.replace(new RegExp(esc,'ig'),function(m){return '<mark>'+m+'</mark>';});}catch(err){}
  return out;
}
function searchResultsHTML(c,q){
  var hits=searchCourse(c,q);
  if(String(q||'').trim().length<2)
    return '<p class="srhint">Type at least two letters. Search covers every lesson, heading, table, figure caption and glossary term in this course.</p>';
  if(!hits.length)
    return '<p class="glossnone">Nothing in <em>'+R.esc(c.title)+'</em> matches “'+R.esc(q)+'”. Try a shorter word.</p>';
  var byPage={},order=[];
  hits.forEach(function(h){
    if(!byPage[h.e.pg]){byPage[h.e.pg]=[];order.push(h.e.pg);}
    if(byPage[h.e.pg].length<3)byPage[h.e.pg].push(h);
  });
  var out='<p class="srcount">'+hits.length+' match'+(hits.length===1?'':'es')+' in '+order.length+' lesson'+(order.length===1?'':'s')+'</p>';
  order.forEach(function(pg){
    var g=byPage[pg],e=g[0].e;
    var lock=pageLocked(c,pg);
    out+='<div class="srgroup">'
      +'<a class="srhead'+(lock?' lock':'')+'" href="#c/'+c.id+'/'+pg+'">'
      +'<span class="srwhere">'+R.esc(e.where)+(lock?' · locked':'')+'</span>'
      +'<b class="srtitle">'+R.esc(e.lesson)+'</b></a>';
    g.forEach(function(h){
      out+='<a class="srhit" href="#c/'+c.id+'/'+pg+'">'
        +'<span class="srkind">'+R.esc(h.e.kind)+'</span>'
        +'<span class="srtext">'+_snippet(h.e.text,h.at,String(q).trim())+'</span></a>';
    });
    if(lock)out+='<a class="srlock" href="#m/'+c.id+'/'+e.n+'">Take module '+e.n+' on its own →</a>';
    out+='</div>';
  });
  return out;
}
function renderSearchPage(c,q){
  var acc=c.accent||'#5b8cff';
  if(!Array.isArray(c.modules)){
    app.innerHTML=topbar({href:'#c/'+c.id,label:'Contents'})
      +'<div class="wrap"><div class="revempty"><div class="revbig">Still loading this course</div>'
      +'<p class="sub">Search works once the course body has finished loading on this device.</p>'
      +'<a class="btn" href="#c/'+c.id+'">Back to the course</a></div></div>';
    return;
  }
  q=q||'';
  var h=topbar({href:'#c/'+c.id,label:'Contents'});
  h+='<div class="wrap searchpage oncourse" style="--ga:'+acc+';--cta:'+solidOf(acc)+';--gk:'+ringColor(acc)+'">';
  h+='<header class="dashhead"><div class="kicker">'+R.esc(c.title)+'</div><h1>Search this course</h1></header>';
  h+='<div class="searchwrap"><span class="searchico">'+IC.search+'</span>'
    +'<input id="csearch" class="searchinp" type="search" value="'+R.esc(q)+'" placeholder="Find a passage, term or figure…" autocomplete="off" aria-label="Search this course"></div>';
  h+='<div id="srbody" aria-live="polite">'+searchResultsHTML(c,q)+'</div>';
  h+='<div class="pagenav"><a class="pn prev" href="#c/'+c.id+'">← Back to course</a></div>';
  h+='</div>';
  app.innerHTML=h;
  var inp=document.getElementById('csearch'),body=document.getElementById('srbody'),tmr=null;
  if(inp){
    inp.addEventListener('input',function(){
      clearTimeout(tmr);
      tmr=setTimeout(function(){body.innerHTML=searchResultsHTML(c,inp.value);},140);
    });
    /* typing is the point of this page, so the field takes the caret — but not on
       a phone, where the keyboard would cover the results before there are any */
    if(window.matchMedia&&window.matchMedia('(min-width:820px)').matches)inp.focus();
  }
}
function renderGlossaryPage(c){
  var acc=c.accent||'#5b8cff';
  if(!Array.isArray(c.modules)){
    app.innerHTML=topbar({href:'#c/'+c.id,label:'Contents'})
      +'<div class="wrap"><div class="revempty"><div class="revbig">Still loading this course</div>'
      +'<p class="sub">Its glossary appears once the course body has finished loading on this device.</p>'
      +'<a class="btn" href="#c/'+c.id+'">Back to the course</a></div></div>';
    return;
  }
  var terms=R.glossTerms(c);
  var letters=[];terms.forEach(function(g){var L=R.glossLetter(g.t);if(letters.indexOf(L)<0)letters.push(L);});
  var h=topbar({href:'#c/'+c.id,label:'Contents'});
  h+='<div class="wrap glosswrap oncourse" style="--ga:'+acc+';--cta:'+solidOf(acc)+';--gk:'+ringColor(acc)+'">';
  h+='<header class="dashhead"><div class="kicker">'+R.esc(c.title)+'</div>'
    +'<h1>Glossary</h1>'
    +'<p class="sub" id="glosscount">'+terms.length+' terms across '+moduleCount(c)+' modules</p></header>';
  if(terms.length){
    h+='<div class="glosstools">'
      +'<div class="searchwrap"><span class="searchico">'+IC.search+'</span>'
      +'<input id="glosssearch" class="searchinp" type="search" placeholder="Search terms and definitions…" autocomplete="off" aria-label="Search the glossary"></div>'
      +'<div class="azrail" id="azrail" role="navigation" aria-label="Jump to letter">';
    letters.forEach(function(L){
      h+='<button class="azb" type="button" data-az="'+L+'">'+R.esc(L)+'</button>';
    });
    h+='</div></div>';
  }
  h+='<div id="glossbody">'+R.courseGlossary(c)+'</div>';
  h+='<p class="glossnone" id="glossnone" hidden>Nothing matches that. Try a shorter word.</p>';
  h+='<div class="pagenav"><a class="pn prev" href="#c/'+c.id+'">&#8592; Back to course</a></div>';
  h+='</div>';
  app.innerHTML=h;
  wireGlossary(terms.length);
}
/* Filtering happens in the page rather than by re-rendering, so the scroll
   position and the caret both survive every keystroke. */
function wireGlossary(total){
  var inp=document.getElementById('glosssearch');
  if(!inp)return;
  var count=document.getElementById('glosscount');
  var none=document.getElementById('glossnone');
  var apply=function(){
    var q=(inp.value||'').trim().toLowerCase();
    var shown=0;
    document.querySelectorAll('.gletter').forEach(function(sec){
      var any=0;
      sec.querySelectorAll('.gterm').forEach(function(t){
        var hit=!q||t.getAttribute('data-term').indexOf(q)>-1;
        t.hidden=!hit;if(hit){any++;shown++;}
      });
      sec.hidden=!any;
      var az=document.querySelector('.azb[data-az="'+sec.getAttribute('data-letter')+'"]');
      if(az)az.classList.toggle('off',!any);
    });
    count.textContent=q?(shown+' of '+total+' terms'):(total+' terms');
    none.hidden=shown>0;
  };
  inp.addEventListener('input',apply);
  inp.addEventListener('search',apply);
}

function labelFor(c,page){
  var m=page.match(/^m(\d+)/);
  if(page==='final')return 'Final Exam';if(page==='cert')return 'Certificate';
  var n=parseInt(m[1],10);var mod=(c.modules||[])[n-1];
  if(!mod)return 'Module '+n;
  if(/-intro$/.test(page))return 'Module '+n+': '+mod.title+' · Overview';
  var lm=page.match(/-l(\d+)/);if(lm)return 'Module '+n+' · Lesson '+lm[1];
  if(/-quiz$/.test(page))return 'Module '+n+' · Quiz';
  return page;
}

var quizReg={};
function quizOpts(quiz){var pick=quiz&&(quiz.pick||quiz.poolSize);var o={shuffle:true};if(pick&&pick<quiz.questions.length)o.pick=pick;if(quiz&&quiz.timeLimit)o.timeLimit=quiz.timeLimit;if(quiz&&quiz.pass)o.pass=quiz.pass;return o;}
function expandCount(list){var n=0;(list||[]).forEach(function(q){n+=((q&&(q.type==='case'))?((q.qs||[]).length||1):1);});return n;}
function shownCount(questions,opts){
  var items=(opts&&opts.pick&&opts.pick<questions.length)?questions.slice(0,opts.pick):questions;
  // a drawn subset averages out; for the header we report the expanded count of what's shown
  if(opts&&opts.pick&&opts.pick<questions.length)return Math.round(expandCount(questions)/questions.length*opts.pick);
  return expandCount(items);
}
function passPct(quiz){return Math.round(((quiz&&quiz.pass)||0.8)*100);}
/* Desktop-only study rail: where you are in the course, without leaving the page.
   Hidden under 1080px, so phones keep the single-column reading view. */
function lessonRail(c,page){
  var tot=moduleCount(c);var done=completedCount(c);var pct=tot?Math.round(done/tot*100):0;
  var acc=c.accent||'#5b8cff';
  var m=page.match(/^m(\d+)/);var cur=m?parseInt(m[1],10):0;
  var h='<aside class="readrail" aria-label="Course contents"><div class="rrcard">'
    +'<a class="rrtitle" href="#c/'+c.id+'">'+R.esc(c.title)+'</a>'
    +'<div class="rrprog">'+snakeRing(pct,44,ringColor(acc),'<b>'+pct+'</b>','rr')+''
    +'<div class="rrmeta"><b>'+done+' of '+tot+'</b><small>modules complete</small></div></div>';
  if(cur){
    var mod=(c.modules||[])[cur-1]||{title:'',lessons:[]};
    h+='<div class="rrsect">Module '+cur+' of '+tot+'</div><div class="rrmod">'+R.esc(mod.title)+'</div><ol class="rrlist">';
    h+=rrItem(c,'m'+cur+'-intro','Overview',page);
    for(var k=1;k<=mod.lessons.length;k++)h+=rrItem(c,'m'+cur+'-l'+k,mod.lessons[k-1].title,page,lessonMinutes(mod.lessons[k-1]));
    h+=rrItem(c,'m'+cur+'-quiz','Module quiz',page);
    h+='</ol>';
    if(cur<tot)h+='<a class="rrnext" href="#c/'+c.id+'">All modules &#8594;</a>';
  } else if(page==='final'||page==='cert'){
    h+='<div class="rrsect">'+(page==='cert'?'Certificate':'Final exam')+'</div>';
    h+='<p class="rrnote">'+(page==='cert'?'You’ve finished every module and passed the final.':'Covers all '+tot+' modules. Pass to earn your certificate.')+'</p>';
    h+='<a class="rrnext" href="#c/'+c.id+'">All modules &#8594;</a>';
  }
  h+='<a class="rrfind" href="#c/'+c.id+'/search">'+IC.search+' Search this course</a>';
  h+='<div class="rrkeys"><kbd>&#8592;</kbd><kbd>&#8594;</kbd> to page through</div>';
  return h+'</div></aside>';
}
function rrItem(c,pg,label,cur,min){
  var on=pg===cur;var lock=pageLocked(c,pg);
  var cls='rritem'+(on?' on':'')+(lock?' lock':'');
  var m=min?'<span class="rrmin">'+min+'m</span>':'';
  if(lock)return '<li class="'+cls+'"><span class="rrdot"></span><span class="rrlbl">'+R.esc(label)+'</span>'+m+'</li>';
  return '<li class="'+cls+'"><a href="#c/'+c.id+'/'+pg+'"><span class="rrdot"></span><span class="rrlbl">'+R.esc(label)+'</span>'+m+'</a></li>';
}
/* ------------------------------------------------------------------
   Explain this — the optional online tutor.

   Everything else in Oboros works on a plane. This one thing cannot, so it is
   built to be absent rather than broken: with no key stored there is no button,
   and offline it says so plainly instead of failing. The key lives in this
   device's localStorage in the clear, which is stated in Settings rather than
   glossed over — anyone who can read the browser's storage can read the key.
   ------------------------------------------------------------------ */
var TUTOR_API='https://api.anthropic.com/v1/';
function tutorKey(){return (store.settings&&store.settings.aiKey)||'';}
function tutorModel(){return (store.settings&&store.settings.aiModel)||'';}
function tutorOn(){return !!tutorKey();}
function tutorHeaders(){
  return {'content-type':'application/json','x-api-key':tutorKey(),
    'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
}
/* Ask the API which models the key can reach rather than hardcoding a name that
   will be wrong within the year. */
function tutorModels(){
  return fetch(TUTOR_API+'models?limit=40',{headers:tutorHeaders()})
    .then(function(r){return r.json().then(function(j){
      if(!r.ok)throw new Error((j&&j.error&&j.error.message)||('HTTP '+r.status));
      return (j.data||[]).map(function(m){return {id:m.id,name:m.display_name||m.id};});
    });});
}
function lessonContext(c,page){
  var el=document.getElementById('lessonbody');
  var txt=el?(el.innerText||'').replace(/\n{3,}/g,'\n\n').trim():'';
  if(txt.length>9000)txt=txt.slice(0,9000)+'\n…[lesson continues]';
  return {course:c.title,lesson:labelFor(c,page),text:txt};
}
function askTutor(question,ctx){
  if(!navigator.onLine)return Promise.reject(new Error('offline'));
  var sys='You are a patient tutor sitting inside a self-paced course. The learner is '
    +'reading a lesson and got stuck.\n\n'
    +'Answer from the lesson text where you can, and say plainly when something is outside it '
    +'rather than padding. Be concrete: a worked number beats a restatement. Keep it under 200 words '
    +'unless the question genuinely needs more. No preamble, no "great question", no sign-off. '
    +'Plain prose, no markdown headers.';
  var user='Course: '+ctx.course+'\nLesson: '+ctx.lesson+'\n\n--- lesson text ---\n'+ctx.text
    +'\n--- end ---\n\nThe learner asks: '+question;
  return fetch(TUTOR_API+'messages',{
    method:'POST',headers:tutorHeaders(),
    body:JSON.stringify({model:tutorModel(),max_tokens:900,system:sys,
      messages:[{role:'user',content:user}]})
  }).then(function(r){
    return r.json().then(function(j){
      if(!r.ok){
        var msg=(j&&j.error&&j.error.message)||('HTTP '+r.status);
        var e=new Error(msg);e.status=r.status;throw e;
      }
      return ((j.content||[]).filter(function(b){return b.type==='text';})
        .map(function(b){return b.text;}).join('\n')).trim();
    });
  });
}
var TUT={el:null,ctx:null,lastFocus:null};
function tutorEnsure(){
  if(TUT.el)return TUT.el;
  var el=document.createElement('div');
  el.id='tutor';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.setAttribute('aria-label','Ask about this lesson');
  el.innerHTML='<div class="tvscrim" data-tvclose></div>'
    +'<div class="tvsheet">'
    +'<div class="tvbar"><span class="tvttl" id="tvttl">Explain this</span>'
    +'<button class="tvx" type="button" data-tvclose aria-label="Close">&#10005;</button></div>'
    +'<div class="tvbody" id="tvbody"></div>'
    +'<form class="tvask" id="tvform">'
    +'<textarea id="tvq" class="tvq" rows="2" placeholder="What is confusing?" aria-label="Your question"></textarea>'
    +'<button class="tvgo" type="submit" id="tvgo">Ask</button></form>'
    +'<p class="tvnote">Sent to Anthropic with this lesson’s text. Nothing else leaves the device.</p>'
    +'</div>';
  document.body.appendChild(el);
  TUT.el=el;
  el.querySelector('#tvform').addEventListener('submit',function(e){e.preventDefault();tutorSend();});
  el.querySelector('#tvq').addEventListener('keydown',function(e){
    if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();tutorSend();}
  });
  return el;
}
function tutorOpen(c,page,prefill){
  if(!tutorOn())return;
  tutorEnsure();
  TUT.ctx=lessonContext(c,page);
  document.getElementById('tvttl').textContent=TUT.ctx.lesson||'Explain this';
  var body=document.getElementById('tvbody');
  body.innerHTML='<div class="tvhint">Ask anything about this lesson. Answers come from the lesson '
    +'text where they can, and say so when they don’t.</div>'
    +'<div class="tvchips">'
    +'<button class="tvchip" type="button" data-tvq="Explain this lesson in plain language.">Explain simply</button>'
    +'<button class="tvchip" type="button" data-tvq="Give me a worked example with real numbers.">Worked example</button>'
    +'<button class="tvchip" type="button" data-tvq="What is the single most common mistake people make with this?">Common mistake</button>'
    +'</div>';
  var q=document.getElementById('tvq');
  q.value=prefill?('Explain this: “'+prefill.slice(0,300)+'”'):'';
  TUT.lastFocus=document.activeElement;
  TUT.el.classList.add('open');document.body.classList.add('navopen');
  setTimeout(function(){q.focus();},60);
}
function tutorClose(){
  if(TUT.el)TUT.el.classList.remove('open');
  var d=document.getElementById('navdrawer');
  if(!d||!d.classList.contains('open'))document.body.classList.remove('navopen');
  if(TUT.lastFocus&&TUT.lastFocus.focus){try{TUT.lastFocus.focus();}catch(e){}}
}
function tutorIsOpen(){return !!(TUT.el&&TUT.el.classList.contains('open'));}
function tutorSend(){
  var q=document.getElementById('tvq'),go=document.getElementById('tvgo'),body=document.getElementById('tvbody');
  var text=(q.value||'').trim();
  if(!text||go.disabled)return;
  go.disabled=true;go.textContent='…';
  body.innerHTML='<div class="tvturn you">'+R.esc(text)+'</div><div class="tvturn ai wait">Thinking…</div>';
  q.value='';
  askTutor(text,TUT.ctx).then(function(ans){
    body.querySelector('.tvturn.ai').className='tvturn ai';
    body.querySelector('.tvturn.ai').innerHTML=ans.split(/\n{2,}/).map(function(p){
      return '<p>'+R.esc(p).replace(/\n/g,'<br>')+'</p>';}).join('');
  }).catch(function(e){
    var m=String(e&&e.message||e);
    var friendly=m==='offline'
      ? 'You’re offline. This is the one part of Oboros that needs a connection — everything else here does not.'
      : (e&&e.status===401)?'That API key was rejected. Check it in Settings.'
      : (e&&e.status===429)?'Rate limited by the API. Wait a moment and try again.'
      : 'Could not reach the API: '+m;
    var n=body.querySelector('.tvturn.ai');
    n.className='tvturn ai err';n.textContent=friendly;
  }).then(function(){go.disabled=false;go.textContent='Ask';});
}
function renderPage(c,page){
  if(pageLocked(c,page)){toast('Locked — pass the previous module’s quiz (80%+) to continue.');location.hash='#c/'+c.id;return;}
  R.resetSeq();
  var p=prog(c.id);p.lastPage=page;store.recent={courseId:c.id,page:page};save();awardLesson(c.id,page);
  var seq=pageSeq(c);var idx=seq.indexOf(page);
  var prev=idx>0?seq[idx-1]:null;var next=idx<seq.length-1?seq[idx+1]:null;
  var body='',pos='',title='';
  var m=page.match(/^m(\d+)/);
  if(m){var n=parseInt(m[1],10);var mod=(c.modules||[])[n-1];
    if(!mod){app.innerHTML=topbar({href:'#c/'+c.id,label:c.title||'Course'})+'<div class="wrap"><div class="revempty"><div class="revbig">That page is not in this course</div><p class="sub">The course may still be loading, or the link is out of date.</p><a class="btn" href="#c/'+c.id+'">Back to the course</a></div></div>';return;}
    if(/-intro$/.test(page)){pos='Module '+n+' of '+moduleCount(c)+' &middot; Overview';title=mod.title;
      body='<div class="objectives"><b>What you’ll be able to do</b><ul>';mod.objectives.forEach(function(o){body+='<li>'+o+'</li>';});body+='</ul></div>';
      body+='<p class="startline">This module has '+mod.lessons.length+' lessons and a quiz. Tap <b>Start lesson</b> below.</p>';
    } else if(/-l(\d+)$/.test(page)){var lk=parseInt(page.match(/-l(\d+)/)[1],10);
      pos='Module '+n+' &middot; Lesson '+lk+' of '+mod.lessons.length
        +' &middot; <span class="posmin">'+lessonMinutes(mod.lessons[lk-1])+' min read</span>';
      var bm=isBookmarked(c.id,page);var nt=getNote(c.id,page);
      body='<div class="studybar">'
        +'<button class="stbtn bmk'+(bm?' on':'')+'" data-bookmark aria-pressed="'+(bm?'true':'false')+'"><span class="bmkico">'+gi('bookmark')+'</span><span class="bmklbl">'+(bm?'Bookmarked':'Bookmark')+'</span></button>'
        +'<button class="stbtn notetoggle'+(nt?' on':'')+'" data-notetoggle>'+gi('pencil')+' Note'+(nt?' &bull;':'')+'</button>'
        +'<a class="stbtn findb" href="#c/'+c.id+'/search">'+IC.search+' Find</a>'
        +(tutorOn()?'<button class="stbtn tutb" data-tutor>'+gi('bubble')+' Explain</button>':'')
        +'<span class="sthint">Select text to highlight</span>'
        +'</div>'
        +'<div class="notebox'+(nt?' open':'')+'" id="notebox"><textarea id="noteinput" placeholder="Jot a note for this lesson… (saved automatically on this device)">'+R.esc(nt)+'</textarea></div>'
        +'<div id="lessonbody" class="lessonbody">'+R.renderLesson(mod.lessons[lk-1])+'</div>';
    } else if(/-quiz$/.test(page)){pos='Module '+n+' &middot; Quiz';title='Module '+n+' quiz';
      if(!mod.quiz||!Array.isArray(mod.quiz.questions)){app.innerHTML=topbar({href:'#c/'+c.id,label:c.title||'Course'})+'<div class="wrap"><div class="revempty"><div class="revbig">This module has no quiz</div><a class="btn" href="#c/'+c.id+'">Back to the course</a></div></div>';return;}
      var qk='quiz_'+c.id+'_m'+n;var qo=quizOpts(mod.quiz);var qc=shownCount(mod.quiz.questions,qo);
      body='<p class="quizsub">'+qc+' question'+(qc>1?'s':'')+(qo.pick?' (drawn from a pool of '+mod.quiz.questions.length+')':'')+'. Order is shuffled each attempt. Answers reveal on Submit.'+(mod.quiz.timeLimit?' Time limit '+mod.quiz.timeLimit+' min.':'')+' Score '+passPct(mod.quiz)+'%+ to complete this module and unlock the next.</p>'+R.renderQuiz(mod.quiz.questions,qk,qo);
      quizReg[qk]={questions:mod.quiz.questions,opts:qo};}
  } else if(page==='final'){pos='Final Certification Exam';title='Final exam';
    if(!c.finalExam||!Array.isArray(c.finalExam.questions)){app.innerHTML=topbar({href:'#c/'+c.id,label:c.title||'Course'})+'<div class="wrap"><div class="revempty"><div class="revbig">The final exam is still loading</div><a class="btn" href="#c/'+c.id+'">Back to the course</a></div></div>';return;}
    var fk='final_'+c.id;var fo=quizOpts(c.finalExam);var fc=shownCount(c.finalExam.questions,fo);
    body='<p class="quizsub">'+fc+' question'+(fc>1?'s':'')+(fo.pick?' (drawn from a pool of '+c.finalExam.questions.length+')':'')+' across all modules.'+(c.finalExam.timeLimit?' Time limit '+c.finalExam.timeLimit+' min.':'')+' Score '+passPct(c.finalExam)+'%+ to earn your certificate.</p>'+R.renderQuiz(c.finalExam.questions,fk,fo);
    quizReg[fk]={questions:c.finalExam.questions,opts:fo};
  } else if(page==='cert'){pos='Certificate';body=renderCert(c);}
  var nextLocked=next&&pageLocked(c,next);
  var nextLabel=next?(/-intro$/.test(page)?'Start lesson &#8594;':(/-quiz$/.test(page)?'Next module &#8594;':(page==='final'?'Get certificate &#8594;':'Next &#8594;'))):'Finish &#8594; Library';
  var nextHref=next?'#c/'+c.id+'/'+next:'#';
  var h=topbar({href:'#c/'+c.id,label:'Contents'});
  /* Lessons run past four screens with nothing to say how much is left. Two
     pixels under the top bar is the cheapest honest answer to "am I nearly done". */
  h+='<div class="readbar" id="readbar" aria-hidden="true"><i></i></div>';
  h+='<div class="wrap readwrap"><div class="readmain"><section class="pagecard">';
  h+='<header class="phead"><div class="phpos">'+pos+'</div>'+(title?'<h2 class="phtitle">'+R.esc(title)+'</h2>':'')+'</header>';
  h+=body;
  h+='<div class="pagenav">'
    +'<a class="pn prev" href="'+(prev?'#c/'+c.id+'/'+prev:'#c/'+c.id)+'">'+(prev?'&#8592; Previous':'&#8592; Contents')+'</a>'
    +'<a class="pn next primary'+(nextLocked?' locked':'')+'" href="'+nextHref+'">'+nextLabel+'</a>'
    +'</div>';
  h+='</section></div>'+lessonRail(c,page)+'</div>';
  app.innerHTML=h;
  var p2=prog(c.id);setTop(completedCount(c)+(p2.finalPassed?1:0),moduleCount(c)+1);
  var qw=app.querySelector('.quizwrap');
  if(qw){var key=qw.getAttribute('data-quiz');var already=quizAlreadyPassed(c,key);if(already){var b=qw.querySelector('.qbanner');b.className='qbanner show pass';b.innerHTML='<span class="bigscore">&#10003; Already passed</span>You’ve completed this. Retake anytime for practice.';}setupPowerups(qw);startQuizTimer(qw);}
  if(isLessonPage(page)){curLesson={cid:c.id,page:page};applyHighlights(c.id,page);}
  else curLesson=null;
  restoreRubrics(c.id,page);
}
function rubricKey(cid,page,idx){return cid+'/'+page+'/'+idx;}
function restoreRubrics(cid,page){
  app.querySelectorAll('.rubricblock').forEach(function(rb){
    var idx=rb.getAttribute('data-rub');var key=rubricKey(cid,page,idx);
    if(store.assignments&&store.assignments[key]){rb.classList.add('done');var btn=rb.querySelector('.rbdone');if(btn){btn.innerHTML='&#10003; Completed';btn.classList.add('done');}}
  });
}
/* ---------- highlight engine ---------- */
var curLesson=null;
function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function applyHighlights(cid,page){
  var body=document.getElementById('lessonbody');if(!body)return;
  var marks=getMarks(cid,page);
  marks.forEach(function(txt){ wrapFirst(body,txt); });
}
// wrap the first un-highlighted text-node occurrence of txt in a <mark class="hl">
function wrapFirst(root,txt){
  if(!txt)return false;
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
    if(node.parentNode&&node.parentNode.closest&&node.parentNode.closest('.hl'))return NodeFilter.FILTER_REJECT;
    return node.nodeValue.indexOf(txt)>-1?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
  }});
  var node=walker.nextNode();if(!node)return false;
  var idx=node.nodeValue.indexOf(txt);
  var range=document.createRange();range.setStart(node,idx);range.setEnd(node,idx+txt.length);
  var mk=document.createElement('mark');mk.className='hl';mk.setAttribute('data-hl',txt);
  try{range.surroundContents(mk);}catch(e){return false;}
  return true;
}
function currentSelectionText(){
  var sel=window.getSelection&&window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return null;
  var body=document.getElementById('lessonbody');if(!body)return null;
  var r=sel.getRangeAt(0);
  if(!body.contains(r.commonAncestorContainer))return null;
  var txt=sel.toString().replace(/\s+/g,' ').trim();
  if(txt.length<2||txt.length>400)return null;
  // must exist as a contiguous substring of a single text node so we can re-apply reliably
  return {text:txt,rect:r.getBoundingClientRect()};
}
var hlBtn;
function ensureHlBtn(){if(hlBtn)return hlBtn;hlBtn=document.createElement('button');hlBtn.id='hlbtn';hlBtn.textContent='Highlight';hlBtn.style.display='none';document.body.appendChild(hlBtn);
  hlBtn.addEventListener('mousedown',function(e){e.preventDefault();});
  hlBtn.addEventListener('click',function(e){e.preventDefault();doHighlight();});
  return hlBtn;}
function positionHlBtn(rect){var b=ensureHlBtn();b.style.display='block';
  var top=rect.top+window.scrollY-42;var left=rect.left+window.scrollX+rect.width/2-40;
  left=Math.max(8,Math.min(left,window.scrollX+window.innerWidth-88));
  b.style.top=top+'px';b.style.left=left+'px';}
function hideHlBtn(){if(hlBtn)hlBtn.style.display='none';}
function doHighlight(){
  if(!curLesson)return;var s=currentSelectionText();if(!s){hideHlBtn();return;}
  var body=document.getElementById('lessonbody');if(!body)return;
  // find the exact contiguous occurrence; wrap the selection's own range when possible
  var sel=window.getSelection();var range=sel.getRangeAt(0);
  var mk=document.createElement('mark');mk.className='hl';mk.setAttribute('data-hl',s.text);
  var wrapped=false;
  try{range.surroundContents(mk);wrapped=true;}catch(e){wrapped=wrapFirst(body,s.text);}
  if(wrapped){addMark(curLesson.cid,curLesson.page,s.text);toast('Highlighted');}
  sel.removeAllRanges();hideHlBtn();
}
function onSelectionChange(){
  if(!curLesson)return;
  var s=currentSelectionText();
  if(s)positionHlBtn(s.rect);else hideHlBtn();
}
function quizAlreadyPassed(c,key){if(key==='final_'+c.id)return prog(c.id).finalPassed;var m=key.match(/_m(\d+)$/);return m&&passedModule(c,parseInt(m[1],10));}

function renderCert(c){
  var p=prog(c.id);var nm=p.name||'';
  return '<div id="print-cert"><div class="cert"><div class="seal">Certificate of Completion</div><h3>'+R.esc(c.title)+'</h3><div class="awarded">This certifies that</div>'
    +'<div class="name" contenteditable="true" spellcheck="false" id="certname">'+R.esc(nm)+'</div>'
    +'<div class="desc">'+(c.certificateDesc||'has completed this course.')+'</div>'
    +'<div class="foot"><div style="text-align:left"><b id="certdate"></b>Date completed</div><div style="text-align:right"><b>Self-paced program</b>Oboros</div></div></div></div>'
    +'<button class="btn" id="printbtn" style="margin-top:14px">Print / Save as PDF</button>'
    +'<p class="certnote">On a phone you can also screenshot the certificate. Print works best in a full browser.</p>';
}

function setTop(done,total){var pct=total?Math.round(done/total*100):0;var f=document.getElementById('topfill');if(f)f.style.width=pct+'%';var pc=document.getElementById('toppc');if(pc)pc.textContent=pct+'%';}

function grade(qw){
  var key=qw.getAttribute('data-quiz');var practice=key.indexOf('practice_')===0;
  var meta=parseQuizKey(key);var c=meta?getCourse(meta.cid):null;var alreadyPassed=c?quizAlreadyPassed(c,key):false;
  var qEls=qw.querySelectorAll('.q');var count=qEls.length;var correct=0,blank=0;
  var run=0,bestRun=0;   // longest unbroken run of correct answers in this attempt
  for(var e=0;e<qEls.length;e++){var qe=qEls[e];var type=qe.getAttribute('data-qtype')||'single';var oi=parseInt(qe.getAttribute('data-qi'),10);var name=qe.getAttribute('data-q');
    var rk=qe.getAttribute('data-rk');var rkp=rk?rk.split(':'):null;
    var sub=qe.getAttribute('data-sub');
    var q=rkp?getQuestion(rkp[0],rkp[1],parseInt(rkp[2],10)):(meta?getQuestion(meta.cid,meta.qk,oi):null);
    if(q&&sub!=null&&R.qType(q)==='case')q=(q.qs||[])[parseInt(sub,10)];
    var wc=false,answered=true;
    if(type==='numeric'){
      var ni=qe.querySelector('.qnum');var raw=ni?ni.value.trim():'';answered=!!raw;
      var v=parseFloat(String(raw).replace(/[,\s%$]/g,''));
      var tol=(q&&q.tolerance!=null)?Math.abs(q.tolerance):0;
      wc=answered&&q&&isFinite(v)&&Math.abs(v-Number(q.answer))<=tol+1e-9;
      if(ni){ni.readOnly=true;ni.classList.add(wc?'ok':'no');}
    } else if(type==='order'){
      var picks=[].slice.call(qe.querySelectorAll('.orditem')).filter(function(x){return x.getAttribute('data-pos');});
      answered=picks.length===qe.querySelectorAll('.orditem').length;
      wc=answered;
      picks.forEach(function(x){var want=parseInt(x.getAttribute('data-pos'),10)-1;var got=parseInt(x.getAttribute('data-oi'),10);
        var okk=want===got;if(!okk)wc=false;x.classList.add(okk?'ok':'no');x.disabled=true;});
      qe.querySelectorAll('.orditem').forEach(function(x){x.disabled=true;});
    } else if(type==='match'){
      var lefts=[].slice.call(qe.querySelectorAll('.mchl'));
      answered=lefts.every(function(x){return x.getAttribute('data-pair')!=null;});
      wc=answered;
      lefts.forEach(function(x){var li=x.getAttribute('data-li');var pr=x.getAttribute('data-pair');
        var okk=(pr!=null&&pr===li);if(!okk)wc=false;x.classList.add(okk?'ok':'no');});
      qe.querySelectorAll('.mchl,.mchr').forEach(function(x){x.disabled=true;});
    } else if(type==='free'){
      var ta=qe.querySelector('.qfree');var txt=ta?ta.value.trim():'';answered=txt.length>0;
      if(ta)ta.readOnly=true;
      qe.classList.add('revealed');
      qe.setAttribute('data-selfscore','');   // scored once the learner self-marks
    } else if(type==='multi'){
      var boxes=qe.querySelectorAll('input[type="checkbox"]');var anyChecked=false,allMatch=true;
      for(var bi=0;bi<boxes.length;bi++){var b=boxes[bi];var isC=b.getAttribute('data-correct')==='1';if(b.checked)anyChecked=true;if(b.checked!==isC)allMatch=false;
        var opt=b.closest('.opt');if(opt){if(isC)opt.classList.add('mc-correct');if(b.checked&&!isC)opt.classList.add('mc-wrong');}}
      answered=anyChecked;wc=allMatch&&anyChecked;
    } else if(type==='text'){
      var inp=qe.querySelector('.qinput');var val=inp?inp.value.trim():'';answered=!!val;wc=answered&&q&&R.textMatch(q,val);
      if(inp){inp.readOnly=true;inp.classList.add(wc?'ok':'no');}
    } else {
      var sel=qw.querySelector('input[name="'+name+'"]:checked');wc=!!(sel&&sel.getAttribute('data-correct')==='1');answered=!!sel;}
    if(!answered)blank++;else if(wc)correct++;
    if(type!=='free'){ if(answered&&wc){run++;if(run>bestRun)bestRun=run;} else run=0; }
    if((type==='multi'||type==='text')&&q){var qx=qe.querySelector('.qexplain');if(qx){qx.className='qexplain show '+(wc?'ok':'no');qx.innerHTML=(wc?'<b>Correct.</b> ':'<b>Not quite.</b> Answer: <em>'+R.esc(R.answerDisplay(q))+'</em>. ')+R.rich(q.explain||'');}}
    if(rkp)updateReviewItem(rk,rkp[0],rkp[1],parseInt(rkp[2],10),!!wc);
    else if(meta)updateReviewItem(meta.cid+':'+meta.qk+':'+oi,meta.cid,meta.qk,oi,!!wc);}
  qw.classList.add('graded');
  qw.setAttribute('data-correct',correct);qw.setAttribute('data-blank',blank);qw.setAttribute('data-bestcombo',bestRun);
  qw.querySelector('.submitbtn').style.display='none';qw.querySelector('.retakebtn').style.display='inline-block';
  stopQuizTimer();
  scoreQuiz(qw);
}
/* Final scoring. Written answers are self-marked, so this runs again after each
   self-assessment and only awards XP / records a pass once every answer is settled. */
function scoreQuiz(qw){
  var key=qw.getAttribute('data-quiz');var practice=key.indexOf('practice_')===0;
  var meta=parseQuizKey(key);var c=meta?getCourse(meta.cid):null;var alreadyPassed=c?quizAlreadyPassed(c,key):false;
  var count=parseInt(qw.getAttribute('data-count'),10)||qw.querySelectorAll('.q').length;
  var correct=parseFloat(qw.getAttribute('data-correct'))||0;
  var blank=parseInt(qw.getAttribute('data-blank'),10)||0;
  var passMark=parseFloat(qw.getAttribute('data-pass'))||0.8;
  var b=qw.querySelector('.qbanner');
  var pending=0,selfSum=0;
  [].slice.call(qw.querySelectorAll('.q[data-qtype="free"]')).forEach(function(fq){
    var v=fq.getAttribute('data-selfscore');
    if(v===''||v==null)pending++;else selfSum+=(parseFloat(v)||0);
  });
  if(pending){
    b.className='qbanner show pend';
    b.innerHTML='<span class="bigscore">'+pending+' written answer'+(pending>1?'s':'')+' to self-assess</span>Compare each written answer against the model answer, then mark how yours did. Your score finalises once all are marked.';
    return;
  }
  if(qw.getAttribute('data-scored')==='1')return;
  qw.setAttribute('data-scored','1');
  var score=correct+selfSum;
  var pct=Math.round(score/count*100);var pass=(score/count)>=passMark;var need=Math.ceil(count*passMark);
  b.className='qbanner show '+(pass?'pass':'fail');
  var passMsg=practice?'Nice practice run — these questions are now scheduled for spaced review.':'Module complete — the next one is unlocked.';
  var comboRun=parseInt(qw.getAttribute('data-bestcombo'),10)||0;
  var comboTag=comboRun>=3?'<span class="combotag">'+gi('flame')+comboRun+' in a row</span>':'';
  b.innerHTML='<span class="bigscore">'+(pass?'✓ Passed — ':'Not yet — ')+pct+'%</span>'+comboTag+(Math.round(score*10)/10)+' of '+count+' correct'+(blank?(' ('+blank+' blank)'):'')+'. '+(pass?passMsg:'You need '+need+' of '+count+' ('+Math.round(passMark*100)+'%). Review the answers, then Retake.');
  if(pct===100){store.gam.perfects=(store.gam.perfects||0)+1;bumpQuest('perfects',1);}
  if(meta&&meta.cid)touchCourse(meta.cid);
  // best answer run inside this attempt feeds the combo quest and the combo badge
  var runBest=parseInt(qw.getAttribute('data-bestcombo'),10)||0;
  if(runBest>0){
    store.gam.bestCombo=Math.max(store.gam.bestCombo||0,runBest);
    bumpQuest('bestCombo',runBest);
  }
  if(practice){var pmet=awardXP(15);toast('+15 XP'+(pmet?' · '+currentStreak()+'-day streak!':''));}
  else if(pass){markPass(key,pct);var nx=app.querySelector('.pn.next.locked');if(nx)nx.classList.remove('locked');
    var amt=alreadyPassed?5:((meta&&meta.qk==='final')?50:25);
    // a clean run is worth more than a scraped pass
    var bonus=pct===100?10:0;
    var met=awardXP(amt+bonus);
    toast('+'+(amt+bonus)+' XP'+(bonus?' · flawless!':'')+(met?' · '+currentStreak()+'-day streak!':''));
    if(!alreadyPassed)bumpQuest('quizzes',1);}
  else{save();}
  checkBadges();
}
/* ---- timed assessments ---- */
var qTimer=null;
function stopQuizTimer(){if(qTimer){clearInterval(qTimer);qTimer=null;}}
function startQuizTimer(qw){
  stopQuizTimer();
  var mins=parseFloat(qw.getAttribute('data-time'));if(!mins)return;
  var el=qw.querySelector('.qtimer');if(!el)return;
  var left=Math.round(mins*60);
  function paint(){
    var m=Math.floor(left/60),sec=left%60;
    var v=el.querySelector('.qtval');if(v)v.textContent=m+':'+(sec<10?'0':'')+sec;
    el.classList.toggle('low',left<=60);
  }
  paint();
  qTimer=setInterval(function(){
    left--;
    if(left<=0){paint();stopQuizTimer();el.classList.add('up');
      var vl=el.querySelector('.qtlbl');if(vl)vl.textContent='time up';
      if(!qw.classList.contains('graded'))grade(qw);
      return;}
    paint();
  },1000);
}
function markPass(key,pct){
  if(key.indexOf('final_')===0){var cid=key.slice(6);var pf=prog(cid);
    pf.finalPassed=true;if(pct!=null)pf.finalPct=pct;pf.finalDate=pf.finalDate||todayStr();
    save();updateAfterPass(cid);checkMilestones(cid);return;}
  var m=key.match(/^quiz_(.+)_m(\d+)$/);if(m){var cid2=m[1];var n=parseInt(m[2],10);
    var wasPassed=!!prog(cid2).passed['m'+n];
    prog(cid2).passed['m'+n]=true;save();updateAfterPass(cid2);checkMilestones(cid2);
    if(!wasPassed){var mc=getCourse(cid2),md=mc&&Array.isArray(mc.modules)?mc.modules[n-1]:null;
      setTimeout(function(){celebrate('Module '+n+' passed',
        (md?md.title+' · ':'')+moduleCredits(md)+' credits earned','done');},260);}}
}
function updateAfterPass(cid){var c=getCourse(cid);if(!c)return;setTop(completedCount(c)+(prog(cid).finalPassed?1:0),moduleCount(c)+1);}
function purgeCourseData(cid){delete store.progress[cid];store.bookmarks=(store.bookmarks||[]).filter(function(b){return b.c!==cid;});
  var pre=cid+'/';[store.notes,store.marks].forEach(function(o){Object.keys(o||{}).forEach(function(k){if(k.indexOf(pre)===0)delete o[k];});});
  Object.keys(store.review||{}).forEach(function(id){if(store.review[id]&&store.review[id].c===cid)delete store.review[id];});}
function resetQuiz(qw){
  var key=qw.getAttribute('data-quiz');var reg=quizReg[key];
  if(reg){var wrap=document.createElement('div');wrap.innerHTML=R.renderQuiz(reg.questions,key,reg.opts);var fresh=wrap.firstChild;qw.parentNode.replaceChild(fresh,qw);setupPowerups(fresh);try{fresh.scrollIntoView({block:'nearest'});}catch(e){}return;}
  qw.classList.remove('graded');var count=parseInt(qw.getAttribute('data-count'),10);
  var b=qw.querySelector('.qbanner');b.className='qbanner';b.innerHTML='';
  qw.querySelector('.submitbtn').style.display='inline-block';qw.querySelector('.retakebtn').style.display='none';
}

function validCourse(o){return o&&typeof o.id==='string'&&typeof o.title==='string'&&Array.isArray(o.modules)&&o.modules.length>0;}
function addCourses(list){var added=0,restored=0;list.forEach(function(o){if(!validCourse(o))return;var exists=getCourse(o.id);
  if(exists&&isBuiltin(exists)){ if(isHidden(o.id)){store.hidden=store.hidden.filter(function(x){return x!==o.id;});restored++;} else {toast('“'+o.title+'” is already in your library.');} return; }
  if(exists){store.imported=store.imported.filter(function(x){return x.id!==o.id;});}
  store.imported.push(o);added++;
});
if(added||restored){save();toast((added?added+' course'+(added>1?'s':'')+' loaded. ':'')+(restored?restored+' restored.':''));location.hash='';}
else if(!list.some(validCourse))toast('No valid course found in that JSON.');}
/* Show what is actually wrong with a course, rather than "no valid course found".
   Same rule set the command-line linter uses before anything reaches the store. */
function showLint(list,checkOnly){
  var host=document.getElementById('importresult');if(!host)return true;
  var anyErr=false,h='';
  list.forEach(function(c,i){
    var r=R.lintCourse(c);
    var name=(c&&c.title)||(c&&c.id)||('Course '+(i+1));
    if(r.errors.length)anyErr=true;
    var cls=r.errors.length?'bad':(r.warnings.length?'warn':'ok');
    h+='<div class="lintcard '+cls+'"><div class="linthead"><b>'+R.esc(name)+'</b><span>'+R.esc(R.lintSummary(r))+'</span></div>';
    if(r.errors.length)h+='<ul class="lintlist err">'+r.errors.slice(0,12).map(function(e){return '<li>'+R.esc(e)+'</li>';}).join('')
      +(r.errors.length>12?'<li>…and '+(r.errors.length-12)+' more</li>':'')+'</ul>';
    if(r.warnings.length)h+='<details class="lintwarn"><summary>'+r.warnings.length+' warning'+(r.warnings.length>1?'s':'')+'</summary><ul class="lintlist">'
      +r.warnings.slice(0,20).map(function(w){return '<li>'+R.esc(w)+'</li>';}).join('')
      +(r.warnings.length>20?'<li>…and '+(r.warnings.length-20)+' more</li>':'')+'</ul></details>';
    if(!r.errors.length&&!r.warnings.length)h+='<p class="lintok">Nothing wrong with it — ready to publish.</p>';
    h+='</div>';
  });
  if(checkOnly&&!list.length)h='<div class="lintcard bad"><div class="linthead"><b>Nothing to check</b></div></div>';
  host.innerHTML=h;
  return !anyErr;
}
function tryLoadJSON(txt,checkOnly){
  var o;
  try{o=JSON.parse(txt);}
  catch(e){
    var host=document.getElementById('importresult');
    var m=/position (\d+)/.exec(e.message||'');var where='';
    if(m){var line=txt.slice(0,+m[1]).split('\n').length;where=' at line '+line;}
    if(host)host.innerHTML='<div class="lintcard bad"><div class="linthead"><b>Not valid JSON</b></div><ul class="lintlist err"><li>'+R.esc((e.message||'Parse error').split('\n')[0])+where+'</li></ul></div>';
    toast('That isn’t valid JSON'+where+'.');return;
  }
  var list=Array.isArray(o)?o:[o];
  var clean=showLint(list,checkOnly);
  if(checkOnly){toast(clean?'Checked — no errors.':'Errors found — see below.');return;}
  if(!clean){toast('Fix the errors below before loading.');return;}
  addCourses(list);
}
function download(name,txt){try{var blob=new Blob([txt],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},1000);}catch(e){toast('Download not supported here — open in a browser.');}}
var TEMPLATE={id:'my-course',title:'My New Course',subtitle:'A one-line summary',tagline:'Shown on the library card',accent:'#5b8cff',modules:[{title:'Module 1',tagline:'What this module covers',objectives:['Objective one','Objective two'],lessons:[{title:'Lesson 1',blocks:[{t:'p',html:'Write your lesson here. You can use <b>bold</b> and other HTML.'},{t:'h',text:'A subheading'},{t:'callout',kind:'tip',label:'Tip',html:'A helpful note.'},{t:'kcheck',q:'A quick check question?',options:['Wrong','Right'],answer:1,explain:'Why the answer is right.'}]}],quiz:{questions:[
    {q:'A single-answer question?',options:['No','Yes'],answer:1,explain:'Explanation shown after submit.'},
    {type:'multi',q:'Which apply? (select all)',options:['One','Two','Three'],answers:[0,2],explain:'One and Three are correct.'},
    {type:'text',q:'Type the answer:',accept:['forty-two','42'],answer:'42',explain:'Any accepted spelling counts.'}
  ]}}],finalExam:{questions:[{q:'A final-exam question?',options:['No','Yes'],answer:1,explain:'Explanation.'}]},certificateDesc:'has completed My New Course.'};

document.addEventListener('click',function(e){
  var t=e.target;
  // ---- figure viewer ----
  if(t.closest&&t.closest('[data-fvclose]')){closeLightbox();return;}
  if(t.closest&&t.closest('[data-fvrot]')){lbToggleRot();return;}
  var zb=t.closest&&t.closest('[data-fvzoom]');
  if(zb){lbZoom(parseInt(zb.getAttribute('data-fvzoom'),10));return;}
  // taps inside the viewer are handled by the stage's own listener
  if(t.closest&&t.closest('#figview'))return;
  var zf=t.closest&&t.closest('.zoomfig');
  if(zf){openFigure(zf);return;}
  // ---- the tutor ----
  if(t.closest&&t.closest('[data-tvclose]')){tutorClose();return;}
  var tq=t.closest&&t.closest('[data-tvq]');
  if(tq){var qi=document.getElementById('tvq');if(qi){qi.value=tq.getAttribute('data-tvq');tutorSend();}return;}
  if(t.closest&&t.closest('[data-tutor]')){
    var pr=store.recent||{};var tc=getCourse(pr.courseId);
    if(tc)tutorOpen(tc,pr.page,(window.getSelection&&String(window.getSelection())||'').trim());
    return;
  }
  // ---- modules on their own, and paths ----
  var so=t.closest&&t.closest('[data-solo]');
  if(so){
    var sp=so.getAttribute('data-solo').split('/');
    openSolo(sp[0],parseInt(sp[1],10));
    location.hash='#c/'+sp[0]+'/m'+sp[1]+'-intro';
    return;
  }
  var pa=t.closest&&t.closest('[data-pathadd]');
  if(pa){
    var q=pa.getAttribute('data-pathadd').split('|');
    var pp=getPath(q[0]);
    if(pp){
      var already=(pp.items||[]).some(function(i){return i.c===q[1]&&i.n===+q[2];});
      if(already)pathRemove(pp,q[1],+q[2]); else pathAdd(pp,q[1],+q[2]);
      softRender();
    }
    return;
  }
  var pm=t.closest&&t.closest('[data-pmove]');
  if(pm){var w=pm.getAttribute('data-pmove').split('|');var mp=getPath(w[0]);
    if(mp){pathMove(mp,+w[1],+w[2]);softRender();}return;}
  var pd2=t.closest&&t.closest('[data-pdel]');
  if(pd2){var v=pd2.getAttribute('data-pdel').split('|');var dp=getPath(v[0]);
    if(dp){pathRemove(dp,v[1],+v[2]);softRender();}return;}
  var pdel=t.closest&&t.closest('[data-pathdel]');
  if(pdel){
    var did=pdel.getAttribute('data-pathdel');
    var dpp=getPath(did);
    if(dpp&&confirm('Delete “'+dpp.name+'”? The modules and any progress in them stay exactly as they are.')){
      deletePath(did);location.hash='#design';
    }
    return;
  }
  // nav drawer
  if(t.closest&&t.closest('#navtoggle')){toggleNav();return;}
  if(t.closest&&(t.closest('#navclose')||t.closest('#navscrim'))){closeNav();return;}
  if(t.closest&&t.closest('.navitem')){closeNav();/* let the link navigate */}
  // assignment (rubric) mark-complete
  var rd=t.closest&&t.closest('[data-rubdone]');
  if(rd){if(!curLesson)return;var rk=rubricKey(curLesson.cid,curLesson.page,rd.getAttribute('data-rubdone'));
    var rbb=rd.closest('.rubricblock');
    if(!store.assignments)store.assignments={};
    if(store.assignments[rk]){delete store.assignments[rk];save();rd.innerHTML='Mark assignment complete';rd.classList.remove('done');if(rbb)rbb.classList.remove('done');toast('Assignment reopened');}
    else{store.assignments[rk]=true;save();awardXP(15);rd.innerHTML='&#10003; Completed';rd.classList.add('done');if(rbb)rbb.classList.add('done');toast('Assignment complete · +15 XP');}
    return;}
  var wl=t.closest&&t.closest('[data-wulevel]');
  if(wl){store.settings.wuLevel=wl.getAttribute('data-wulevel');
    var wst0=store.gam.wu;if(wst0&&!wst0.done)store.gam.wu=null;   // redraw today's set at the new level
    save();renderSettings();toast('Warm-up difficulty set to '+wuLevel().label+'.');return;}
  // warm-up answers
  var wo=t.closest&&t.closest('[data-wu]');
  if(wo&&!wo.disabled){
    var qid=wo.getAttribute('data-wu');var wi=parseInt(wo.getAttribute('data-wi'),10);
    var wst=wuState();
    if(wst.ans[qid]==null){wst.ans[qid]=wi;save();renderWarmup();
      var qsn=wuToday();
      if(wuAnsweredCount()>=qsn.length){var btn=document.getElementById('wudone');if(btn)btn.focus();}
    }
    return;
  }
  if(t.id==='wudone'){
    var res=wuFinish();
    renderWarmup();
    if(res){toast('+'+res.xp+' XP'+(res.advanced?' · '+res.streak+'-day streak!':''));}
    return;
  }
  // pick / clear a specialization
  var pk=t.closest&&t.closest('[data-pick-track]');
  if(pk){var pid=pk.getAttribute('data-pick-track');setChosenTrack(pid);
    if(pid){var pt=getTrack(pid);toast(pt?pt.title+' is now your specialization.':'Specialization set.');}
    else toast('Specialization cleared.');
    render();return;}
  // how the library and store are organised — persisted, applies to both tabs
  var lg=t.closest&&t.closest('[data-libgroup]');
  if(lg){
    var mode=lg.getAttribute('data-libgroup');
    if(libGroupMode()!==mode){store.settings.libGroup=mode;save();render();}
    return;
  }
  // collapsible section toggle
  var sd=t.closest&&t.closest('[data-stdesc]');
  if(sd){
    var row=sd.closest('.strow'),pp=row&&row.querySelector('.stsub');
    if(pp){var open=pp.hidden;pp.hidden=!open;sd.setAttribute('aria-expanded',open?'true':'false');
      row.classList.toggle('showdesc',open);}
    return;
  }
  var az=t.closest&&t.closest('[data-az]');
  if(az){
    var sec=document.getElementById('gl-'+az.getAttribute('data-az').replace('#','hash'));
    if(sec){
      var bar=document.querySelector('.topbar');
      var off=(bar?bar.getBoundingClientRect().height:0)+8;
      window.scrollTo({top:sec.getBoundingClientRect().top+window.scrollY-off,behavior:'smooth'});
    }
    return;
  }
  if(t.closest&&t.closest('[data-pedit]')){
    setSectOpen('path-edit',!sectOpen('path-edit',false));softRender();return;}
  var stg=t.closest&&t.closest('[data-secttoggle]');
  if(stg){var sid=stg.getAttribute('data-secttoggle');var sec=stg.closest('.coll');
    if(!sec){ // a standalone toggle (the locked-module fold) — flip and repaint
      setSectOpen(sid,!sectOpen(sid,false));render();return;}
    var nowOpen=!sec.classList.contains('open');
    sec.classList.toggle('open',nowOpen);stg.setAttribute('aria-expanded',nowOpen?'true':'false');setSectOpen(sid,nowOpen);return;}
  // category chips (home)
  var chp=t.closest&&t.closest('.chip[data-cat]');
  if(chp){var cat=chp.getAttribute('data-cat');document.querySelectorAll('#catchips .chip').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-cat')===cat);});filterLib();return;}
  var a=t.closest&&t.closest('a');
  if(a&&a.classList.contains('locked')){e.preventDefault();toast('Pass the previous module’s quiz (80%+) to unlock this.');return;}
  var lc=t.closest&&t.closest('.ccard.locked, .libcard.locked');
  if(lc&&lc.tagName==='A'){e.preventDefault();toast('Locked — complete the earlier part first.');return;}
  // module toggle-card (ignore clicks on the Start link or a lesson link)
  var mrow=t.closest&&t.closest('.modrow');
  if(mrow&&!(t.closest('.macstart'))){var mc=mrow.closest('.modcard');if(mc)mc.classList.toggle('open');return;}
  // account / auth
  var atab=t.closest&&t.closest('[data-authtab]');
  if(atab){var mode=atab.getAttribute('data-authtab');var f=document.getElementById('authform');if(f)f.setAttribute('data-mode',mode);
    document.querySelectorAll('.authtab').forEach(function(x){x.classList.toggle('on',x===atab);});
    var sb2=document.getElementById('authsubmit');if(sb2){sb2.textContent=(mode==='up'?'Create account':'Sign in');sb2.disabled=false;}
    var pwf=document.getElementById('authpw');if(pwf)pwf.setAttribute('autocomplete',mode==='up'?'new-password':'current-password');
    var er=document.getElementById('autherr');if(er)er.style.display='none';return;}
  if(t.id==='googlebtn'){if(adapter&&adapter.auth&&adapter.auth.signInGoogle){Promise.resolve(adapter.auth.signInGoogle()).catch(function(e){authErr((e&&e.message)||'Google sign-in failed.');});}return;}
  if(t.id==='signout'){if(adapter&&adapter.auth){Promise.resolve(adapter.auth.signOut()).then(function(){session=null;syncState='off';updateAcctChip();renderAccount();});}return;}
  if(t.id==='syncnow'){syncOnLogin();toast('Syncing…');return;}
  if(t.id==='synctest'){runSyncDiag();return;}
  // course store download
  var gc=t.getAttribute&&t.getAttribute('data-getcourse');
  if(gc){t.textContent='…';t.disabled=true;
    catalogGet(gc).then(function(course){
      if(!course||!validCourse(course)){toast('Could not load that course.');renderStore();return;}
      installCourse(course);
      toast('“'+(course.title||'Course')+'” added to your library.');
      renderStore();
      /* The flow used to dead-end here: the course you just chose was suddenly
         somewhere else. Mark its row so the next tap is obvious. */
      setTimeout(function(){
        var row=document.querySelector('.strow[data-cid="'+gc+'"]');
        if(row){row.classList.add('justadded');
          var go=row.querySelector('.stbtn');if(go)go.textContent='Start now';}
      },30);
    }).catch(function(){toast('Download failed.');renderStore();});
    return;}
  // remove a highlight by tapping it
  var hlm=t.closest&&t.closest('.hl');
  if(hlm&&curLesson){var txt=hlm.getAttribute('data-hl');var parent=hlm.parentNode;while(hlm.firstChild)parent.insertBefore(hlm.firstChild,hlm);parent.removeChild(hlm);parent.normalize();removeMark(curLesson.cid,curLesson.page,txt);toast('Highlight removed');return;}
  // bookmark toggle
  var bmb=t.closest&&t.closest('[data-bookmark]');
  if(bmb&&curLesson){var on=toggleBookmark(curLesson.cid,curLesson.page);bmb.classList.toggle('on',on);bmb.setAttribute('aria-pressed',on?'true':'false');bmb.querySelector('.bmkico').innerHTML=gi('bookmark');bmb.querySelector('.bmklbl').textContent=on?'Bookmarked':'Bookmark';toast(on?'Bookmarked':'Bookmark removed');return;}
  // note toggle
  var ntg=t.closest&&t.closest('[data-notetoggle]');
  if(ntg){var nb=document.getElementById('notebox');if(nb){var opened=nb.classList.toggle('open');if(opened){var ta=document.getElementById('noteinput');if(ta)ta.focus();}}return;}
  // saved page: delete note / remove bookmark / clear highlight
  var dnote=t.getAttribute&&t.getAttribute('data-delnote');if(dnote){var pp=dnote.split('|');setNote(pp[0],pp[1],'');renderSaved();return;}
  var dbm=t.getAttribute&&t.getAttribute('data-delbm');if(dbm){var q=dbm.split('|');toggleBookmark(q[0],q[1]);renderSaved();return;}
  // settings: theme segmented
  var sset=t.closest&&t.closest('[data-set]');
  if(sset){store.settings[sset.getAttribute('data-set')]=sset.getAttribute('data-val');save();applySettings();renderSettings();return;}
  // settings: text size
  var sc=t.closest&&t.closest('[data-scale]');
  if(sc){var dir=sc.getAttribute('data-scale');var v=store.settings.scale||1;v=dir==='up'?Math.min(1.4,v+0.1):Math.max(0.85,v-0.1);store.settings.scale=Math.round(v*100)/100;save();applySettings();var sv=document.getElementById('scaleval');if(sv)sv.textContent=Math.round(store.settings.scale*100)+'%';return;}
  // settings: reset all
  if(t.getAttribute&&t.getAttribute('data-resetall')){if(confirm('Reset progress for ALL courses on this device? Imported courses and settings are kept.')){store.progress={};store.recent=null;store.review={};store.bookmarks=[];store.notes={};store.marks={};var goal=store.gam.goal;store.gam=defGam();store.gam.goal=goal;save();toast('All progress reset.');location.hash='#settings';renderSettings();}return;}
  var pl=t.closest&&t.closest('.swatch[data-palette]');if(pl){store.settings.palette=pl.getAttribute('data-palette');save();applySettings();renderSettings();return;}
  var gl=t.closest&&t.closest('[data-goal]');if(gl){store.gam.goal=parseInt(gl.getAttribute('data-goal'),10);save();renderSettings();return;}
  // power-ups
  var hb=t.closest&&t.closest('[data-hint]');
  if(hb){if(hb.disabled)return;
    if(!perkUnlocked('hint')){toast('Reach '+PERKS.hint.unlock+' XP to unlock Hints.');return;}
    if(tokensLeft()<PERKS.hint.cost){toast('No tokens left — you earn 1 every '+TOKEN_EVERY+' XP.');return;}
    var qe=hb.closest('.q');if(applyHint(qe,qe.getAttribute('data-qtype'))){spendTokens(PERKS.hint.cost);hb.disabled=true;hb.classList.add('used');hb.innerHTML=gi('bulb')+'Hint used';refreshTokenUI();}
    else toast('No wrong option left to remove.');return;}
  var pk=t.closest&&t.closest('[data-peek]');
  if(pk){if(!perkUnlocked('peek')){toast('Reach '+PERKS.peek.unlock+' XP to unlock Glossary Peek.');return;}
    if(tokensLeft()<PERKS.peek.cost){toast('No tokens left — you earn 1 every '+TOKEN_EVERY+' XP.');return;}
    var qwp=pk.closest('.quizwrap');var cp=keyCourse(qwp.getAttribute('data-quiz'));if(cp&&spendTokens(PERKS.peek.cost)){glossaryPeek(cp);refreshTokenUI();}return;}
  if(t.id==='peekclose'){closePeek();return;}
  // flashcards / match
  if(t.closest&&t.closest('[data-flip]')){t.closest('[data-flip]').classList.toggle('flipped');return;}
  var fr=t.closest&&t.closest('[data-flashrate]');if(fr){flashRate(fr.getAttribute('data-flashrate')==='1'?1:0);return;}
  if(t.id==='flashagain'){renderFlash(getCourse(flash.cid));return;}
  var mt=t.closest&&t.closest('.matchtile');if(mt){matchTap(mt);return;}
  if(t.id==='matchagain'){var mdone=document.getElementById('matchdone');if(mdone)mdone.innerHTML='';startMatch(glossaryPairs(getCourse(match.cid)));return;}
  var ropt=t.closest&&t.closest('.revopt');if(ropt){reviewAnswer(ropt);return;}
  if(t.closest&&t.closest('#revcheck')){reviewCheck();return;}
  if(t.closest&&t.closest('#revnext')){rev.idx++;showRevCard();return;}
  if(t.id==='revmore'){renderReview();return;}
  // ordering: tap items into sequence, tap again to unset
  var ordi=t.closest&&t.closest('.orditem');
  if(ordi&&!ordi.disabled){var qbox=ordi.closest('.q');
    if(ordi.getAttribute('data-pos')){var gone=parseInt(ordi.getAttribute('data-pos'),10);ordi.removeAttribute('data-pos');ordi.classList.remove('set');ordi.querySelector('.ordnum').textContent='';
      qbox.querySelectorAll('.orditem[data-pos]').forEach(function(x){var v=parseInt(x.getAttribute('data-pos'),10);if(v>gone){x.setAttribute('data-pos',v-1);x.querySelector('.ordnum').textContent=v-1;}});
    } else {var used=qbox.querySelectorAll('.orditem[data-pos]').length;ordi.setAttribute('data-pos',used+1);ordi.classList.add('set');ordi.querySelector('.ordnum').textContent=used+1;}
    return;}
  // matching: tap a left item, then its partner on the right
  var mL=t.closest&&t.closest('.mchl');
  if(mL&&!mL.disabled){var qb2=mL.closest('.q');qb2.querySelectorAll('.mchl').forEach(function(x){x.classList.toggle('sel',x===mL);});return;}
  var mR=t.closest&&t.closest('.mchr');
  if(mR&&!mR.disabled){var qb3=mR.closest('.q');var sel=qb3.querySelector('.mchl.sel');
    if(!sel){toast('Pick one on the left first.');return;}
    var ri=mR.getAttribute('data-ri');
    qb3.querySelectorAll('.mchl').forEach(function(x){if(x!==sel&&x.getAttribute('data-pair')===ri){x.removeAttribute('data-pair');x.classList.remove('paired');x.querySelector('.mpin')&&x.querySelector('.mpin').remove();}});
    sel.setAttribute('data-pair',ri);sel.classList.add('paired');sel.classList.remove('sel');
    var lbl=mR.textContent;var pin=sel.querySelector('.mpin');
    if(!pin){pin=document.createElement('span');pin.className='mpin';sel.appendChild(pin);}
    pin.textContent='\u2194 '+lbl;
    return;}
  // written answers: self-assess against the model answer
  var selfb=t.closest&&t.closest('[data-self]');
  if(selfb){var qf=selfb.closest('.q');if(!qf)return;
    qf.setAttribute('data-selfscore',selfb.getAttribute('data-self'));
    qf.querySelectorAll('[data-self]').forEach(function(x){x.classList.toggle('on',x===selfb);x.disabled=true;});
    var qwrap=selfb.closest('.quizwrap');if(qwrap)scoreQuiz(qwrap);
    return;}
  if(t.closest&&t.closest('.submitbtn')){var qw=t.closest('.quizwrap');if(qw)grade(qw);return;}
  if(t.closest&&t.closest('.retakebtn')){var qw2=t.closest('.quizwrap');if(qw2){resetQuiz(qw2);var nq=app.querySelector('.quizwrap');if(nq)startQuizTimer(nq);}return;}
  var jt=t.closest&&t.closest('.jstab');
  if(jt){var id=jt.getAttribute('data-tab');var box=jt.closest('.jstabs');box.querySelectorAll('.jstab').forEach(function(x){x.classList.remove('active');});jt.classList.add('active');box.querySelectorAll('.jstp').forEach(function(x){x.classList.toggle('show',x.id===id);});return;}
  if(t.id==='printbtn'){window.print();return;}
  if(t.id==='loadbtn'){var ta=document.getElementById('importjson');if(ta&&ta.value.trim())tryLoadJSON(ta.value);else toast('Paste JSON or choose a file first.');return;}
  if(t.id==='checkbtn'){var tc=document.getElementById('importjson');if(tc&&tc.value.trim())tryLoadJSON(tc.value,true);else toast('Paste JSON or choose a file first.');return;}
  if(t.id==='tplbtn'){download('course-template.json',JSON.stringify(TEMPLATE,null,2));return;}
  var ex=t.getAttribute&&t.getAttribute('data-export');var mx=t.getAttribute&&t.getAttribute('data-mexport');var exId=ex||mx;
  if(exId){var c=getCourse(exId);if(c)download(exId+'.json',JSON.stringify(c,null,2));return;}
  if(t.getAttribute&&t.getAttribute('data-exportall')){var all=allCourses();if(all.length)download('course-library-backup.json',JSON.stringify(all,null,2));toast('Exported '+all.length+' courses.');return;}
  if(t.getAttribute&&t.getAttribute('data-backup')){download('course-library-full-backup.json',JSON.stringify(store));toast('Backup downloaded.');return;}
  if(t.getAttribute&&t.getAttribute('data-install')){doInstall();return;}
  if(t.getAttribute&&t.getAttribute('data-persist')){
    askPersist().then(function(ok){
      toast(ok?'Protected — this browser will not clear your progress to free space.'
              :'The browser did not grant it. Installing the app usually earns it.');
      return checkPersist();
    }).then(function(){renderSettings();});
    return;}
  var mh=t.getAttribute&&t.getAttribute('data-mhide');if(mh){if(store.hidden.indexOf(mh)<0)store.hidden.push(mh);save();toast('Course removed — restore it anytime here.');renderSettings();return;}
  var ms=t.getAttribute&&t.getAttribute('data-mshow');if(ms){store.hidden=store.hidden.filter(function(x){return x!==ms;});save();toast('Course restored.');renderSettings();return;}
  var md=t.getAttribute&&t.getAttribute('data-mdel');if(md){var dc=getCourse(md);if(confirm('Delete “'+(dc?dc.title:md)+'”? This imported course and its progress are removed. Re-import its file to restore.')){store.imported=store.imported.filter(function(x){return x.id!==md;});purgeCourseData(md);save();toast('Course deleted.');renderSettings();}return;}
  var rm=t.getAttribute&&t.getAttribute('data-remove');if(rm){if(confirm('Remove this imported course? Your progress for it is also cleared.')){store.imported=store.imported.filter(function(x){return x.id!==rm;});purgeCourseData(rm);save();render();}return;}
  var rs=t.getAttribute&&t.getAttribute('data-reset');if(rs){if(confirm('Reset progress for this course?')){var nm=prog(rs).name;store.progress[rs]={passed:{},finalPassed:false,lastPage:'',name:nm};save();render();toast('Course progress reset.');}return;}
});
document.addEventListener('input',function(e){
  if(e.target&&e.target.classList&&e.target.classList.contains('cmprange')){var w=e.target.closest('.cmpwrap');if(w)w.style.setProperty('--cmp',e.target.value+'%');return;}
  if(e.target&&e.target.id==='coursesearch'){filterLib();return;}
  if(e.target&&e.target.id==='certname'){var hash=location.hash.split('/');var cid=hash[1];if(cid){prog(cid).name=e.target.textContent.trim();save();}return;}
  if(e.target&&e.target.id==='noteinput'&&curLesson){setNote(curLesson.cid,curLesson.page,e.target.value);var tg=document.querySelector('[data-notetoggle]');if(tg)tg.classList.toggle('on',!!e.target.value.trim());}
});
// show the Highlight button after a selection completes inside a lesson
document.addEventListener('mouseup',function(){setTimeout(onSelectionChange,10);});
document.addEventListener('touchend',function(){setTimeout(onSelectionChange,10);});
document.addEventListener('selectionchange',function(){var s=window.getSelection&&window.getSelection();if(!s||s.isCollapsed)hideHlBtn();});
window.addEventListener('scroll',function(){if(hlBtn&&hlBtn.style.display==='block')hideHlBtn();},{passive:true});
document.addEventListener('submit',function(e){if(e.target&&e.target.id==='authform'){e.preventDefault();doAuth();}});
/* Keyboard: with a real keyboard in front of you, paging through a course
   shouldn't need the mouse. Ignored while typing, and while a modifier is held. */
function typingInField(el){
  if(!el)return false;
  var tag=(el.tagName||'').toLowerCase();
  return tag==='input'||tag==='textarea'||tag==='select'||el.isContentEditable;
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    if(tutorIsOpen()){tutorClose();return;}
    if(lbOpen()){closeLightbox();return;}
    var d=document.getElementById('navdrawer');
    if(d&&d.classList.contains('open')&&!matchMedia('(min-width:1080px)').matches){closeNav();return;}
    var si=document.getElementById('coursesearch');
    if(si&&document.activeElement===si){si.value='';filterLib();si.blur();return;}
    return;
  }
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(typingInField(document.activeElement))return;
  // "/" jumps to the library search
  if(e.key==='/'){var s=document.getElementById('coursesearch');if(s){e.preventDefault();s.focus();s.select();}return;}
  // arrows page through a course
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
    var sel=e.key==='ArrowRight'?'.pagenav .pn.next:not(.locked)':'.pagenav .pn.prev';
    var link=document.querySelector(sel);
    if(link&&link.getAttribute('href')){e.preventDefault();location.hash=link.getAttribute('href');}
  }
});
document.addEventListener('change',function(e){
  if(e.target&&e.target.id==='importfile'){var f=e.target.files&&e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){var ta=document.getElementById('importjson');if(ta)ta.value=r.result;tryLoadJSON(r.result);};r.readAsText(f);return;}
  if(e.target&&e.target.id==='restorefile'){var f2=e.target.files&&e.target.files[0];if(!f2)return;var r2=new FileReader();r2.onload=function(){restoreBackup(r2.result);};r2.readAsText(f2);return;}
});
function restoreBackup(txt){
  var o;try{o=JSON.parse(txt);}catch(e){toast('That isn’t a valid backup file.');return;}
  if(!o||typeof o!=='object'||(!o.progress&&!o.gam&&!o.imported)){toast('That file isn’t an Oboros backup.');return;}
  if(!confirm('Restore this backup? It replaces the courses, progress and rewards currently on this device.'))return;
  try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}
  load();applySettings();toast('Backup restored.');location.hash='';render();
}

/* ---------- drag-to-reorder library (pointer events: works on touch & mouse) ---------- */
var drag=null;
document.addEventListener('pointerdown',function(e){
  var hb=e.target.closest&&e.target.closest('.draghandle');if(!hb)return;
  var card=hb.closest('.libcard');if(!card||!card.getAttribute('data-cid'))return;
  e.preventDefault();
  var rect=card.getBoundingClientRect();var grid=card.parentNode;
  var ph=document.createElement('div');ph.className='dragph';ph.style.height=rect.height+'px';
  grid.insertBefore(ph,card.nextSibling);
  card.classList.add('dragging');
  card.style.position='fixed';card.style.width=rect.width+'px';card.style.left=rect.left+'px';card.style.top=rect.top+'px';card.style.margin='0';card.style.zIndex='999';card.style.pointerEvents='none';
  drag={card:card,ph:ph,grid:grid,grabDy:e.clientY-rect.top};
  try{hb.setPointerCapture(e.pointerId);}catch(_){}
},{passive:false});
document.addEventListener('pointermove',function(e){
  if(!drag)return;e.preventDefault();
  drag.card.style.top=(e.clientY-drag.grabDy)+'px';
  var others=Array.prototype.slice.call(drag.grid.querySelectorAll('.libcard[data-cid]')).filter(function(c){return c!==drag.card;});
  var placed=false;
  for(var i=0;i<others.length;i++){var r=others[i].getBoundingClientRect();if(e.clientY<r.top+r.height/2){drag.grid.insertBefore(drag.ph,others[i]);placed=true;break;}}
  if(!placed){var addc=drag.grid.querySelector('.libcard:not([data-cid])');if(addc)drag.grid.insertBefore(drag.ph,addc);else drag.grid.appendChild(drag.ph);}
},{passive:false});
function endDrag(){
  if(!drag)return;
  drag.grid.insertBefore(drag.card,drag.ph);drag.ph.remove();
  var c=drag.card;c.classList.remove('dragging');c.style.position='';c.style.width='';c.style.left='';c.style.top='';c.style.margin='';c.style.zIndex='';c.style.pointerEvents='';
  store.order=Array.prototype.slice.call(drag.grid.querySelectorAll('.libcard[data-cid]')).map(function(x){return x.getAttribute('data-cid');});
  save();drag=null;
}
document.addEventListener('pointerup',endDrag);
document.addEventListener('pointercancel',endDrag);

function seg(group,val,label,cur){return '<button class="segbtn'+(cur===val?' on':'')+'" data-set="'+group+'" data-val="'+val+'">'+label+'</button>';}
/* Settings is the longest screen in the app; every group folds. Defaults keep the
   things you actually change open and the reference material closed. */
function setGroup(id,label,body,dflt,badge){
  return collSection('set-'+id,label,badge==null?null:badge,'<div class="setgroup ingroup">'+body+'</div>',dflt);
}
function renderSettings(){
  var st=store.settings||{theme:'system',scale:1};
  var h=topbar({href:'#',label:'My Learning'});
  h+='<div class="wrap"><header class="dashhead"><div class="kicker">Preferences</div><h1>Settings</h1></header>';
  // ---- the optional online tutor ----
  var tk=tutorKey(),tm=tutorModel();
  var tmods=(store.settings&&store.settings.aiModels)||[];
  var tb='<div class="setcard">'
    +'<div class="setrow col"><label class="setname" for="aikey">Anthropic API key</label>'
    +'<input class="setinput" id="aikey" type="password" autocomplete="off" spellcheck="false" '
    +'placeholder="sk-ant-…" value="'+R.esc(tk)+'"></div>';
  if(tmods.length){
    tb+='<div class="setrow col"><label class="setname" for="aimodel">Model</label>'
      +'<select class="setinput" id="aimodel">'
      +tmods.map(function(m){return '<option value="'+R.esc(m.id)+'"'+(m.id===tm?' selected':'')+'>'+R.esc(m.name)+'</option>';}).join('')
      +'</select></div>';
  }
  tb+='<div class="setrow"><span class="setname">'+(tk?'<span class="aion">Connected'+(tm?' · '+R.esc(tm):'')+'</span>':'Not connected')+'</span>'
    +'<span class="airow"><button class="minibtn" id="aisave">'+(tk?'Re-check':'Connect')+'</button>'
    +(tk?'<button class="minibtn danger" id="aiforget">Forget</button>':'')+'</span></div>'
    +'<div class="aistatus" id="aistatus"></div>'
    +'</div>'
    +'<p class="setnote">Adds an <b>Explain</b> button to every lesson. Everything else in Oboros works '
    +'offline and always will; this one feature needs a connection, and without a key it simply is not there.</p>'
    +'<p class="setnote warn">The key is stored in this browser’s storage in the clear. Anyone with access to '
    +'this device — or to a backup of it — can read it. Use a key you can revoke, and set a spend limit on it.</p>';
  h+=setGroup('ai','Explain this (optional)',tb,false,tk?'on':null);
  h+=setGroup('account','Account','<div class="setcard">'
    +'<a class="setrow link" href="#account"><span class="setname">'+(session?R.esc(session.email||'Signed in'):(acctShown()?'Sign in &amp; sync':'Accounts (offline)'))+'</span><span class="setchev">&#8250;</span></a>'
    +'<a class="setrow link" href="#library"><span class="setname">Course library</span><span class="setchev">&#8250;</span></a>'
    +'</div><p class="setnote">'+(acctShown()?'Sign in to sync your progress and rewards across devices.':'This copy runs offline — progress saves on this device. Connect a backend to enable accounts.')+'</p>',false);
  var ap='<div class="setcard">'
    +'<div class="setrow"><span class="setname">Theme</span><div class="segmented">'+seg('theme','system','System',st.theme)+seg('theme','light','Light',st.theme)+seg('theme','dark','Dark',st.theme)+'</div></div>'
    +'<div class="setrow palrow"><span class="setname">Color theme</span><div class="swatches">';
  var curpal=st.palette||'aurora';
  PALETTES.forEach(function(pp){ap+='<button class="swatch'+(curpal===pp.id?' on':'')+'" data-palette="'+pp.id+'" title="'+pp.name+'" aria-label="'+pp.name+'"><span style="background:linear-gradient(135deg,'+pp.a+','+pp.b+')"></span></button>';});
  ap+='</div></div>'
    +'<div class="setrow"><span class="setname">Text size</span><div class="stepper2"><button class="stepbtn" data-scale="down" aria-label="Smaller">A&#8722;</button><span class="scaleval" id="scaleval">'+Math.round(st.scale*100)+'%</span><button class="stepbtn" data-scale="up" aria-label="Larger">A+</button></div></div>'
    +'<div class="setrow"><span class="setpreview">The quick brown fox reads at this size.</span></div>'
    +'</div><p class="setnote">System follows your device’s light or dark setting. Pick a color theme to set the app’s energy — it recolors buttons, links, and highlights.</p>';
  h+=setGroup('appearance','Appearance',ap,true);
  // Learning (streak / daily goal)
  ensureDay();var g=store.gam;
  h+=setGroup('learning','Learning','<div class="setcard">'
    +'<div class="setrow"><span class="setname">Daily goal</span><div class="segmented">'
      +'<button class="segbtn'+(g.goal===10?' on':'')+'" data-goal="10">Light</button>'
      +'<button class="segbtn'+(g.goal===30?' on':'')+'" data-goal="30">Steady</button>'
      +'<button class="segbtn'+(g.goal===60?' on':'')+'" data-goal="60">Deep</button>'
    +'</div></div>'
    +'<div class="setrow"><span class="setname">Warm-up difficulty</span><div class="segmented">'
      +WU_TIERS.map(function(tt){return '<button class="segbtn'+(wuLevel().id===tt.id?' on':'')+'" data-wulevel="'+tt.id+'">'+tt.label+'</button>';}).join('')
    +'</div></div>'
    +'<div class="setrow"><span class="setname">Warm-up accuracy</span><span class="setval">'+(wuAccuracy()!=null?wuAccuracy()+'% of '+(store.gam.wuAnswered||0):'—')+'</span></div>'
    +'<div class="setrow"><span class="setname">Current streak</span><span class="setval">'+currentStreak()+' day'+(currentStreak()===1?'':'s')+'</span></div>'
    +'<div class="setrow"><span class="setname">Best streak</span><span class="setval">'+(g.best||0)+'</span></div>'
    +'<div class="setrow"><span class="setname">Total XP</span><span class="setval">'+(g.xp||0)+'</span></div>'
    +'<div class="setrow"><span class="setname">Power-up tokens</span><span class="setval">'+gi('token')+' '+tokensLeft()+' <small class="setsub">(next in '+xpToNextToken()+' XP)</small></span></div>'
    +'<a class="setrow link" href="#badges"><span class="setname">Badges &amp; rewards ('+earnedBadges().length+'/'+BADGES.length+')</span><span class="setchev">&#8250;</span></a>'
    +'<a class="setrow link" href="#review"><span class="setname">Review due items ('+reviewDueCount()+')</span><span class="setchev">&#8250;</span></a>'
    +'</div><p class="setnote">Earn XP by finishing lessons (+10) and passing quizzes (+25). Your streak comes from the <b>daily warm-up</b> — five short general-knowledge questions that have nothing to do with your courses. Attempting them is enough; you do not have to get them right. Course work is deep and irregular, so it should never be the thing a streak depends on. The daily goal is a separate depth target: Light is about one lesson, Deep is a long session. Reviews resurface past quiz questions on a spaced schedule.</p>',true);
  // Manage courses
  var mc='<div class="setcard">';
  allCourses().forEach(function(c){var built=isBuiltin(c);var hid=isHidden(c.id);
    mc+='<div class="setrow mrow"><span class="mcname'+(hid?' off':'')+'">'+R.esc(c.title)+' <span class="mtag'+(built?'':' imp')+(hid?' rem':'')+'">'+(built?'Built-in':'Imported')+(hid?' · removed':'')+'</span></span>'
      +'<span class="mact"><button class="mbtn" data-mexport="'+c.id+'">Export</button>'
      +(hid?'<button class="mbtn go" data-mshow="'+c.id+'">Restore</button>':(built?'<button class="mbtn danger" data-mhide="'+c.id+'">Remove</button>':'<button class="mbtn danger" data-mdel="'+c.id+'">Delete</button>'))
      +'</span></div>';
  });
  mc+='<a class="setrow link" href="#new"><span class="setname">+ Add / import a course</span><span class="setchev">&#8250;</span></a>';
  mc+='<button class="setrow rowbtn link" data-exportall="1"><span class="setname">Export all courses (backup)</span><span class="setchev">&#8250;</span></button>';
  mc+='</div><p class="setnote">Drag the &#8942;&#8942; handle on a library card to reorder your courses. Remove hides a built-in course but keeps your progress — Restore brings it back. Delete removes an imported course and its progress; re-import its file to restore. Export saves a course as a JSON file.</p>';
  h+=setGroup('courses','Manage courses',mc,false,allCourses().length);
  // offline / storage
  var est=storageEstimate();
  var mb=function(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';};
  var swOn=(typeof navigator!=='undefined'&&'serviceWorker' in navigator&&navigator.serviceWorker.controller);
  var ist=installState();
  var pst=PERSIST.state;
  var pl=pst==='granted'?'Protected ✓':pst==='unsupported'?'Not supported here':pst==='refused'?'The browser declined':'Not yet';
  var oc='<div class="setcard">';
  if(ist==='installed'){
    oc+='<div class="setrow" id="installrow"><span class="setname">Installed</span><span class="setval ok">Yes ✓</span></div>';
  } else if(ist==='ready'){
    oc+='<button class="setrow rowbtn link" id="installrow" data-install="1"><span class="setname">Install Oboros on this device</span><span class="setchev">&#8250;</span></button>';
  } else if(ist==='ios'){
    oc+='<div class="setrow" id="installrow"><span class="setname">Add to Home Screen</span><span class="setval">Share &#8593; &middot; Add</span></div>';
  } else {
    oc+='<div class="setrow" id="installrow"><span class="setname">Install on this device</span><span class="setval">Not offered yet</span></div>';
  }
  oc+='<div class="setrow"><span class="setname">Courses on this device</span><span class="setval">'+est.count+' · '+mb(est.courses)+'</span></div>'
    +'<div class="setrow"><span class="setname">App saved for offline use</span><span class="setval'+(swOn?' ok':'')+'">'+(swOn?'Yes ✓':'Not yet')+'</span></div>'
    +'<div class="setrow"><span class="setname">Course storage</span><span class="setval">'+(est.idb?'Database (large)':'Browser storage (~5 MB limit)')+'</span></div>'
    +(pst==='granted'||pst==='unsupported'
      ?'<div class="setrow"><span class="setname">Protected from clearing</span><span class="setval'+(pst==='granted'?' ok':'')+'">'+pl+'</span></div>'
      :'<button class="setrow rowbtn link" data-persist="1"><span class="setname">Protect from clearing</span><span class="setval">'+pl+'</span><span class="setchev">&#8250;</span></button>')
    +(PERSIST.bytes?'<div class="setrow"><span class="setname">Space used</span><span class="setval">'+mb(PERSIST.bytes)+(PERSIST.quota?' of '+mb(PERSIST.quota):'')+'</span></div>':'')
    +'<div class="setrow"><span class="setname">Connection</span><span class="setval'+(isOffline()?'':' ok')+'">'+(isOffline()?'Offline':'Online')+'</span></div>'
    +'</div>';
  oc+='<p class="setnote">Adding a course from the Store downloads it to this device — it works with no connection, forever, and your progress saves locally either way. '
    +(swOn?'The app itself is saved too, so it opens offline.':'The app itself is cached the first time you open it over the web; open it online once and it will work offline afterwards.')
    +'</p>';
  oc+='<p class="setnote">'+(ist==='installed'
      ?'Installed apps get their storage protected first, so your progress is about as safe as a local app&rsquo;s.'
      :ist==='ios'
      ?'On iPhone and iPad, open the Share menu and choose <b>Add to Home Screen</b>. Safari protects an installed app&rsquo;s storage; a tab&rsquo;s storage can be cleared after a few weeks unused.'
      :'A browser may clear a site&rsquo;s storage when the device runs low on space — which here would mean your streak, notes and downloaded courses. Protecting it asks the browser for an exemption; installing the app usually earns it outright.')
    +'</p>';
  h+=setGroup('offline','Offline & install',oc,false);
  h+=setGroup('data','Data','<div class="setcard">'
    +'<button class="setrow rowbtn link" data-backup="1"><span class="setname">Back up everything (download)</span><span class="setchev">&#8250;</span></button>'
    +'<label class="setrow link filelabel"><span class="setname">Restore from a backup file</span><span class="setchev">&#8250;</span><input type="file" id="restorefile" accept="application/json,.json" hidden></label>'
    +'<button class="setrow rowbtn danger" data-resetall="1"><span class="setname">Reset all progress</span><span class="setchev">&#8250;</span></button>'
    +'</div><p class="setnote">Back up saves your courses, progress, XP, streak, notes, highlights and badges to one JSON file — restore it on another device to carry everything over. Reset clears progress but keeps your courses and settings.</p>',false);
  h+=setGroup('about','About','<div class="setcard">'
    +'<div class="setrow"><span class="setname">Courses</span><span class="setval">'+courses().length+'</span></div>'
    +'<div class="setrow"><span class="setname">Passing mark</span><span class="setval">80%</span></div>'
    +'<div class="setrow"><span class="setname">Storage</span><span class="setval">This device</span></div>'
    +'</div>',false);
  h+='</div>';
  app.innerHTML=h;
  wireTutorSettings();
}
/* Connecting is a round trip: the key is only accepted once the API has confirmed
   it and told us which models it can reach, so a typo fails here rather than at
   the moment someone is stuck on a lesson. */
function wireTutorSettings(){
  var save=document.getElementById('aisave'),forget=document.getElementById('aiforget');
  var st=document.getElementById('aistatus'),sel=document.getElementById('aimodel');
  var say=function(msg,cls){if(st){st.className='aistatus '+(cls||'');st.textContent=msg;}};
  if(sel)sel.addEventListener('change',function(){
    store.settings.aiModel=sel.value;softSave();say('Model set to '+sel.value+'.','ok');
  });
  if(save)save.addEventListener('click',function(){
    var k=(document.getElementById('aikey').value||'').trim();
    if(!k){say('Paste a key first.','err');return;}
    if(!navigator.onLine){say('You’re offline — connecting needs a connection, just this once.','err');return;}
    store.settings.aiKey=k;
    save.disabled=true;say('Checking…');
    tutorModels().then(function(list){
      if(!list.length)throw new Error('That key reached the API but can’t see any models.');
      store.settings.aiModels=list;
      if(!list.some(function(m){return m.id===store.settings.aiModel;}))store.settings.aiModel=list[0].id;
      say('Connected. '+list.length+' models available.','ok');
      softSave();setTimeout(function(){renderSettings();},700);
    }).catch(function(e){
      store.settings.aiKey='';softSave();
      say(String(e&&e.message||e),'err');
    }).then(function(){save.disabled=false;});
  });
  if(forget)forget.addEventListener('click',function(){
    store.settings.aiKey='';store.settings.aiModel='';store.settings.aiModels=[];
    softSave();renderSettings();
  });
}
function softSave(){try{save();}catch(e){}}
/* ---------- spaced-repetition review session ---------- */
var rev={queue:[],idx:0,correct:0,answered:0};
function renderReview(){
  ensureDay();var due=reviewDue();
  var h=topbar(null,{stats:true});
  h+='<div class="wrap"><header class="dashhead"><div class="kicker">Spaced repetition</div><h1>Review</h1></header>';
  if(!due.length){
    var seeded=Object.keys(store.review).length;
    h+='<div class="revempty"><div class="revbig">'+(seeded?'You’re all caught up':'Nothing to review yet')+'</div><p class="sub">'+(seeded?'No items are due right now. Questions you’ve answered resurface here on a spaced schedule (1, 2, 4, 7, 15, 30 days) so they stick for the long term. Check back tomorrow.':'Take a module quiz first — the questions you answer will start appearing here on a spaced review schedule.')+'</p><a class="btn" href="#">Back to My Learning</a></div></div>';
    app.innerHTML=h;return;
  }
  rev={queue:due.slice(0,20),idx:0,correct:0,answered:0};
  h+='<p class="sub" style="text-align:left;margin-top:0">'+due.length+' item'+(due.length>1?'s':'')+' due'+(due.length>20?' — reviewing the first 20':'')+'. Answer to reschedule each one.</p><div id="revhost"></div></div>';
  app.innerHTML=h;showRevCard();
}
function showRevCard(){
  var host=document.getElementById('revhost');if(!host)return;
  if(rev.idx>=rev.queue.length){
    host.innerHTML='<div class="revempty"><div class="revbig">Review complete</div><p class="sub">'+rev.correct+' / '+rev.answered+' correct. Items you got right move to a longer interval; misses come back sooner.</p><div class="btnrow"><a class="btn" href="#">Back to My Learning</a>'+(reviewDueCount()>0?'<button class="btn ghost" id="revmore">Keep going ('+reviewDueCount()+' due)</button>':'')+'</div></div>';
    return;
  }
  var it=rev.queue[rev.idx];var q=it.q;var type=R.qType(q);var body='';
  if(type==='multi'){
    var mo='';R.shuffle(R.range(q.options.length)).forEach(function(oi){mo+='<label class="revchk" data-ri="'+oi+'"><input type="checkbox"><span class="box sq"></span><span class="ot">'+R.esc(q.options[oi])+'</span></label>';});
    body='<div class="revopts multi">'+mo+'</div><div class="btnrow"><button class="btn" id="revcheck">Check answer</button></div>';
  } else if(type==='text'){
    body='<div class="revopts"><input class="revinput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer…"></div><div class="btnrow"><button class="btn" id="revcheck">Check answer</button></div>';
  } else {
    var opts='';R.shuffle(R.range(q.options.length)).forEach(function(oi){opts+='<button class="revopt" data-ri="'+oi+'"><span class="box"></span><span class="ot">'+R.esc(q.options[oi])+'</span></button>';});
    body='<div class="revopts">'+opts+'</div>';
  }
  host.innerHTML='<div class="revcard"><div class="revcount">Item '+(rev.idx+1)+' of '+rev.queue.length+'<span class="revsrc">'+R.esc(it.courseTitle)+'</span></div>'
    +'<div class="revq">'+R.rich(q.q)+(type==='multi'?' <span class="qmulti">Select all that apply</span>':'')+'</div>'+body
    +'<div class="revfb" id="revfb"></div>'
    +'<div class="btnrow"><button class="btn" id="revnext" style="display:none">'+((rev.idx===rev.queue.length-1)?'Finish':'Next')+' &#8594;</button></div></div>';
}
function reviewReveal(correct){
  var it=rev.queue[rev.idx];var q=it.q;
  var fb=document.getElementById('revfb');if(fb){fb.className='revfb show '+(correct?'ok':'no');fb.innerHTML=(correct?'<b>Correct.</b> ':'<b>Not quite.</b> Answer: <em>'+R.esc(R.answerDisplay(q))+'</em>. ')+R.rich(q.explain);}
  var nx=document.getElementById('revnext');if(nx)nx.style.display='inline-block';
  var chk=document.getElementById('revcheck');if(chk)chk.style.display='none';
  updateReviewItem(it.id,it.c,it.k,it.i,correct);rev.answered++;store.gam.reviewsDone=(store.gam.reviewsDone||0)+1;
  bumpQuest('reviews',1);if(it.c)touchCourse(it.c);
  if(correct){rev.correct++;var met=awardXP(2);if(met)toast(currentStreak()+'-day streak!');}
  save();checkBadges();
}
function reviewAnswer(btn){
  if(btn.disabled)return;var i=parseInt(btn.getAttribute('data-ri'),10);var it=rev.queue[rev.idx];var q=it.q;var correct=(i===q.answer);
  var opts=document.querySelectorAll('.revopt');for(var k=0;k<opts.length;k++){var ri=parseInt(opts[k].getAttribute('data-ri'),10);opts[k].disabled=true;opts[k].classList.add('done');if(ri===q.answer)opts[k].classList.add('correct');if(ri===i&&!correct)opts[k].classList.add('wrong');}
  reviewReveal(correct);
}
function reviewCheck(){
  var it=rev.queue[rev.idx];var q=it.q;var type=R.qType(q);var correct=false;
  if(type==='multi'){
    var chks=document.querySelectorAll('.revchk');var sel=[];
    for(var i=0;i<chks.length;i++){var ri=parseInt(chks[i].getAttribute('data-ri'),10);var cb=chks[i].querySelector('input');var isC=R.multiAnswers(q).indexOf(ri)>-1;
      if(cb.checked)sel.push(ri);cb.disabled=true;chks[i].classList.add('done');if(isC)chks[i].classList.add('correct');if(cb.checked&&!isC)chks[i].classList.add('wrong');}
    if(!sel.length){for(var j=0;j<chks.length;j++){chks[j].querySelector('input').disabled=false;chks[j].classList.remove('done','correct','wrong');}toast('Pick at least one, then Check.');return;}
    var ans=R.multiAnswers(q).slice().sort(function(a,b){return a-b;});correct=(sel.slice().sort(function(a,b){return a-b;}).join(',')===ans.join(','));
  } else {
    var inp=document.querySelector('.revinput');if(!inp)return;var val=inp.value.trim();if(!val){toast('Type an answer, then Check.');return;}inp.readOnly=true;correct=R.textMatch(q,val);inp.classList.add(correct?'ok':'no');
  }
  reviewReveal(correct);
}
/* ================= study data helpers ================= */
function courseHasGlossary(c){if(!c||!Array.isArray(c.modules))return false;return c.modules.some(function(m){return (m.lessons||[]).some(function(l){return l.glossary&&l.glossary.length;});});}
function glossaryPairs(c){var out=[];if(!c||!Array.isArray(c.modules))return out;c.modules.forEach(function(m){(m.lessons||[]).forEach(function(l){(l.glossary||[]).forEach(function(g){out.push({t:g[0],d:g[1]});});});});return out;}
function courseQuestionBank(c){var out=[];c.modules.forEach(function(m,mi){((m.quiz&&m.quiz.questions)||[]).forEach(function(q,qi){out.push({q:q,rk:c.id+':m'+(mi+1)+':'+qi});});});((c.finalExam&&c.finalExam.questions)||[]).forEach(function(q,qi){out.push({q:q,rk:c.id+':final:'+qi});});return out;}
function weakBank(c){return courseQuestionBank(c).filter(function(it){var r=store.review[it.rk];return r&&(r.box||1)<=2;});}

/* ================= badges page ================= */
function rankLadderHTML(){
  var rp=rankProgress();var xp=store.gam.xp||0;
  var h='<div class="rankcard">'
    +'<div class="rkhead"><span class="rkicon">'+gi(rp.rank.icon)+'</span>'
      +'<div class="rkinfo"><div class="rklvl">Level '+rp.level+'</div><b>'+R.esc(rp.rank.name)+'</b>'
      +'<small>'+xp.toLocaleString()+' XP'+(rp.next?' \u00b7 '+(rp.span-rp.into).toLocaleString()+' to '+rp.next.name:' \u00b7 highest rank')+'</small></div></div>';
  h+='<div class="rankbar big"><i style="width:'+rp.pct+'%"></i></div>';
  h+='<div class="rkladder">';
  RANKS.forEach(function(r,i){
    var got=xp>=r.xp;var cur=(i===rp.level-1);
    h+='<div class="rkstep'+(got?' got':'')+(cur?' cur':'')+'" title="'+r.name+'"><span class="rkdot">'+gi(r.icon)+'</span><small>'+R.esc(r.name)+'</small></div>';
  });
  h+='</div></div>';
  return h;
}
function questBodyHTML(){
  var qs=todaysQuests();if(!qs.length)return '';
  var h='<div class="qpanel"><div class="qlist">';
  qs.forEach(function(q){
    var p=questProgress(q);var pct=Math.round(p.have/p.target*100);
    h+='<div class="qrow'+(p.done?' done':'')+'"><span class="qtick">'+(p.done?'&#10003;':'')+'</span>'
      +'<div class="qmid"><div class="qlbl">'+R.esc(q.label)+'</div><div class="qbar"><i style="width:'+pct+'%"></i></div></div>'
      +'<span class="qxp">'+(p.done?'+'+q.xp:p.have+'/'+p.target)+'</span></div>';
  });
  h+='</div></div>';
  return h;
}
function masteryBodyHTML(){
  var list=masteryList();
  if(!list.length)return '<div class="revempty"><div class="revbig">Nothing to measure yet</div><p class="sub">Pass a module and its course starts tracking mastery here.</p></div>';
  var h='<div class="mstlist">';
  list.forEach(function(x){
    var c=x.course,m=x.m;
    var tone=m.pct>=80?'hi':m.pct>=50?'mid':'lo';
    h+='<a class="row mstrow" href="#c/'+c.id+'">'+snakeRing(m.pct,46,ringColor(c.accent),'<b>'+m.pct+'</b>','mst '+tone)+''
      +'<div class="mstmid"><b>'+R.esc(c.title)+'</b>'
      +'<small>'+(m.stale?'Not opened in '+m.days+' days — slipping from '+m.earned+'%':(m.days===0?'Opened today · holding at '+m.earned+'%':'Last opened '+m.days+' day'+(m.days===1?'':'s')+' ago'))+'</small></div>'
      +'<span class="mstgo">'+(m.stale?'Refresh':'Open')+' &#8594;</span></a>';
  });
  h+='</div>'+inote('Mastery is the share of a course you have passed, faded by how long since you last opened it. It holds for '+MASTERY_FULL_DAYS+' days, then slides toward a floor of '+Math.round(MASTERY_FLOOR*100)+'%. Reading a lesson, taking a quiz or clearing a review item restores it. It is meant to be uncomfortable — nothing else here tells you the truth about forgetting.');
  return h;
}
function creditsPanelHTML(){
  var rows=transcriptRows();var g=gpa();
  var h='<div class="skcard"><div class="statstrip">'
    +'<div class="ss"><b>'+totalCredits()+'</b><small>credits</small></div>'
    +'<div class="ss"><b>'+rows.filter(function(r){return r.finished;}).length+'</b><small>completed</small></div>'
    +'<div class="ss"><b>'+(g!=null?g+'%':'—')+'</b><small>average</small></div>'
    +'</div>';
  if(rows.length){
    h+='<div class="trmini">';
    rows.slice(0,3).forEach(function(r){
      h+='<div class="row trm"><span class="trmdot" style="background:'+(r.course.accent||'#5b8cff')+'"></span>'
        +'<span class="trmname">'+R.esc(r.course.title)+'</span>'
        +'<span class="trmcr">'+r.credits+' cr'+(r.grade?' · '+r.grade:'')+'</span></div>';
    });
    h+='</div>';
  }
  h+='<a class="btn ghost" href="#transcript" style="margin-top:12px;width:100%">Open transcript &#8594;</a>'
    +inote('One credit for every ten hours of coursework, earned module by module — so a course you never finish still counts for the work you did. A module taken on its own earns its credit the same way. This is the reward for depth; the streak is the reward for showing up.')+'</div>';
  return h;
}
function warmupPanelHTML(){
  var g=store.gam;var acc=wuAccuracy();
  var h='<div class="skcard"><div class="statstrip">'
    +'<div class="ss"><b>'+currentStreak()+'</b><small>streak</small></div>'
    +'<div class="ss"><b>'+(g.best||0)+'</b><small>best</small></div>'
    +'<div class="ss"><b>'+(g.wuDays||0)+'</b><small>warm-ups</small></div>'
    +'<div class="ss"><b>'+(g.wuAnswered||0)+'</b><small>answered</small></div>'
    +'<div class="ss"><b>'+(acc!=null?acc+'%':'—')+'</b><small>accuracy</small></div>'
    +'<div class="ss"><b>'+(g.wuPerfect||0)+'</b><small>perfect</small></div>'
    +'</div>'+freezeLineHTML()
    +inote('Your streak comes from the warm-up, not from course work — five short questions a day, and attempting is enough. Course work is deep and irregular by nature; a streak needs something you can do in ninety seconds.')+'</div>';
  return h;
}
/* ------------------------------------------------------------------
   The mark is an ouroboros: a snake closing a circle. That is already a progress
   meter, so the rewards page is built out of it — the snake grows round the ring
   as the day fills, and meets its own tail when the goal is met. Tapering is
   faked with three arcs of increasing width, which is cheaper than a variable
   stroke and reads the same at 60 pixels.
   ------------------------------------------------------------------ */
function _pol(cx,cy,r,deg){var a=(deg-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
/* the exact drawn length, so the ring can animate itself in without the DOM
   having to be measured after every render */
function _arcLen(r,a0,a1){return (2*Math.PI*r*Math.abs(a1-a0)/360).toFixed(1);}
function _arcD(cx,cy,r,a0,a1){
  var s=_pol(cx,cy,r,a0),e=_pol(cx,cy,r,a1);
  return 'M'+s[0].toFixed(2)+' '+s[1].toFixed(2)+'A'+r+' '+r+' 0 '+((a1-a0)>180?1:0)+' 1 '+e[0].toFixed(2)+' '+e[1].toFixed(2);
}
function snakeRing(pct,size,acc,inner,cls){
  pct=Math.max(0,Math.min(100,pct||0));
  var sweep=pct/100*359.4, r=40, body='';
  /* Below about 34px the taper and the head are three pixels of mush, so the
     small sizes draw a plain arc. Same function, same colour, same meaning —
     the app should not have a second ring implementation just for chips. */
  var tiny=size<34;
  if(sweep>1.5){
    if(tiny){
      body='<path d="'+_arcD(50,50,r,0,sweep)+'" stroke="'+acc+'" stroke-width="8" fill="none" stroke-linecap="round" style="--len:'+_arcLen(r,0,sweep)+'"/>';
    } else {
      [[0,0.44,3],[0.44,0.77,5.4],[0.77,1,7.8]].forEach(function(sg){
        var a0=sweep*sg[0],a1=sweep*sg[1];
        if(a1-a0<0.5)return;
        body+='<path d="'+_arcD(50,50,r,a0,a1)+'" stroke="'+acc+'" stroke-width="'+sg[2]+'" fill="none" stroke-linecap="round" style="--len:'+_arcLen(r,a0,a1)+'"/>';
      });
      var hp=_pol(50,50,r,sweep);
      body+='<circle cx="'+hp[0].toFixed(2)+'" cy="'+hp[1].toFixed(2)+'" r="6" fill="'+acc+'"/>';
      var ep=_pol(50,50,r+2.1,sweep-1.5);
      body+='<circle cx="'+ep[0].toFixed(2)+'" cy="'+ep[1].toFixed(2)+'" r="1.3" fill="#fff" opacity=".92"/>';
    }
  }
  return '<span class="snkring'+(pct>=100?' shut':'')+(tiny?' tiny':'')+(cls?' '+cls:'')+'" style="width:'+size+'px;height:'+size+'px">'
    +'<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">'
    +'<circle cx="50" cy="50" r="40" fill="none" stroke="var(--pill)" stroke-width="'+(tiny?8:7.8)+'"/>'
    +body+'</svg>'
    +(inner?'<span class="snkin">'+inner+'</span>':'')+'</span>';
}
/* Course colours are chosen for cover art, not for contrast against a dark panel.
   A ring drawn in one needs to be readable, so it is lifted toward the ink. */
function ringColor(c){return 'color-mix(in srgb,'+(c||'#5b8cff')+' 82%, var(--ink))';}
/* A course page drew its cover in the course's colour and put a palette-coloured
   button directly underneath, so every course read as two brands stacked. The
   button now takes the course colour — but a colour picked for cover art will not
   always carry white text, so it is darkened until it clears 4.5:1 and no
   further. CSS cannot compute contrast; this can. */
function _hex2rgb(h){
  if(!h)return null;
  h=String(h).trim().replace('#','');
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  if(!/^[0-9a-fA-F]{6}$/.test(h))return null;
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function _relLum(rgb){
  var c=rgb.map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
}
function solidOf(hex){
  var rgb=_hex2rgb(hex);
  if(!rgb)return 'var(--accent-solid)';
  for(var f=1;f>=0.2;f-=0.04){
    var t=[rgb[0]*f,rgb[1]*f,rgb[2]*f];
    if(1.05/(_relLum(t)+0.05)>=4.5)
      return 'rgb('+Math.round(t[0])+','+Math.round(t[1])+','+Math.round(t[2])+')';
  }
  return 'var(--accent-solid)';
}
/* Every explanatory paragraph on this page used to be permanent body text. They
   are all true and worth reading once; none is worth reading every visit. */
function inote(txt){
  return '<details class="inote"><summary aria-label="How this works"><span class="ini">i</span>'
    +'<span class="inlbl">How this works</span></summary><p>'+txt+'</p></details>';
}
function rwHeroHTML(){
  ensureDay();
  var g=store.gam, goal=g.goal||DEF_GOAL, today=g.todayXP||0;
  var pct=Math.min(100,Math.round(today/goal*100));
  var acc=cssVar('--accent-solid')||'#5b8cff';
  var cs=currentStreak(), rp=rankProgress();
  var met=pct>=100;
  return '<section class="rwhero'+(met?' met':'')+'">'
    +'<div class="rwring">'+snakeRing(pct,132,acc,
        '<b>'+today+'</b><small>of '+goal+' XP</small>','big')+'</div>'
    +'<div class="rwsay">'+(met
        ? '<b>Today is closed.</b><span>The circle is complete — anything more is a bonus.</span>'
        : '<b>'+(goal-today)+' XP to close today.</b><span>About '+Math.max(1,Math.ceil((goal-today)/10))+' more lesson'+((goal-today)>10?'s':'')+', or a handful of review items.</span>')+'</div>'
    +'<div class="rwstats">'
    +'<a class="rwstat" href="#warmup"><span class="rwsico flame'+(cs>0?' lit':'')+'">'+FLAME+'</span><b>'+cs+'</b><small>day streak</small></a>'
    +'<div class="rwstat"><span class="rwsico">'+gi(rp.rank.icon)+'</span><b>'+rp.level+'</b><small>'+R.esc(rp.rank.name)+'</small></div>'
    +'<a class="rwstat" href="#transcript"><span class="rwsico">'+gi('cap')+'</span><b>'+totalCredits()+'</b><small>credits</small></a>'
    +'</div></section>';
}
function cssVar(n){
  try{return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}catch(e){return '';}
}
function questTilesHTML(bare){
  var qs=todaysQuests();
  if(!qs.length)return '';
  var acc=cssVar('--accent-solid')||'#5b8cff';
  var h='<div class="qtiles">';
  qs.forEach(function(q){
    var p=questProgress(q);var pct=Math.round(p.have/p.target*100);
    h+='<div class="row qtile'+(p.done?' done':'')+'">'
      +snakeRing(pct,62,p.done?(cssVar('--accent2')||acc):acc,
          '<span class="qtico">'+gi(QICON2[q.track]||'star')+'</span>')
      +'<div class="qtmid"><b>'+R.esc(q.label)+'</b>'
      +'<small>'+(p.done?'Complete':p.have+' of '+p.target)+'</small></div>'
      +'<span class="qtxp'+(p.done?' won':'')+'">'+(p.done?'&#10003;':'+'+q.xp)+'</span></div>';
  });
  h+='</div>';
  if(bare)return h;
  h+=inote('Three quests are drawn from the pool each day — the same three on every device — and they reset at midnight. Finishing all three in one day earns a badge. Nothing is lost if you skip a day.');
  return h;
}
function badgeMed(b,got,prog){
  return '<div class="bmed'+(got?' got':'')+'" title="'+R.esc(b.desc)+'">'
    +'<span class="bmdisc">'+(prog?'<span class="bmring">'+snakeRing(prog.pct,50,'var(--accent)','','bm')+'</span>':'')
    +'<span class="bmico">'+gi(b.icon)+'</span>'+(got?'':'<span class="bmlock">'+gi('lock')+'</span>')+'</span>'
    +'<b>'+R.esc(b.label)+'</b>'
    +(prog?'<small class="bmnear">'+prog.have+' of '+prog.target+'</small>':'<small>'+R.esc(b.desc)+'</small>')
    +'</div>';
}
function badgeGridHTML(){
  var s=badgeStats();
  var got=[],rest=[];
  BADGES.forEach(function(b){(b.test(s)?got:rest).push(b);});
  /* the three you are closest to, and only ones you have actually started */
  var near=rest.map(function(b){return {b:b,p:badgeProgress(b,s)};})
    .filter(function(x){return x.p.have>0;})
    .sort(function(a,b){return b.p.pct-a.p.pct;}).slice(0,3);
  var nearIds={};near.forEach(function(x){nearIds[x.b.id]=1;});
  var locked=rest.filter(function(b){return !nearIds[b.id];});
  var h='';
  if(near.length){
    h+='<div class="bsub">Within reach</div><div class="bgrid">'
      +near.map(function(x){return badgeMed(x.b,false,x.p);}).join('')+'</div>';
  }
  if(got.length){
    h+='<div class="bsub">Earned</div><div class="bgrid">'
      +got.map(function(b){return badgeMed(b,true,null);}).join('')+'</div>';
  }
  if(locked.length){
    h+=collSection('rw-locked','Not yet',locked.length,
        '<div class="bgrid">'+locked.map(function(b){return badgeMed(b,false,null);}).join('')+'</div>',false);
  }
  if(!h)h='<p class="ppempty">Read a lesson and the first ones start filling in.</p>';
  return h;
}
function renderBadges(){
  var earned=earnedBadges();
  var h=topbar(null,{stats:true});
  h+='<div class="wrap dash rwpage">';
  h+=rwHeroHTML();
  var left=questsRemaining();
  h+=collSection('rw-quests','Today’s quests',left?left+' left':'done ✓',questTilesHTML(),true);
  h+=collSection('rw-rank','Rank',rankProgress().rank.name,rankLadderHTML()
    +inote('Rank rises with total XP and never falls. It measures everything you have ever done here, so it is the one number that cannot go backwards.'),false);
  var ml=masteryList();
  h+=collSection('rw-mastery','Mastery',ml.length||null,masteryBodyHTML(),true);
  h+=collSection('rw-credits','Credits & transcript',totalCredits()||null,creditsPanelHTML(),false);
  h+=collSection('rw-badges','Badges',earned.length+' of '+BADGES.length,badgeGridHTML(),true);
  h+=collSection('rw-warmup','Daily warm-up',(store.gam.wuDays||0)+' days',warmupPanelHTML(),false);
  var act=activeDays(35).filter(function(d){return d.on;}).length;
  h+=collSection('rw-activity','Activity',act+'/35','<div class="skcard">'+streakGridHTML(35)+'</div>',false);
  h+=collSection('rw-tokens','Tokens & power-ups',tokensLeft(),rewardsCardHTML(),false);
  h+='</div>';
  app.innerHTML=h;
}
function rewardsCardHTML(){
  var g=store.gam;
  var h='<div class="rewardcard"><div class="rwrow"><div class="rwtok"><span class="rwico">'+gi('token')+'</span><div><b>'+tokensLeft()+' token'+(tokensLeft()===1?'':'s')+'</b><small>1 earned every '+TOKEN_EVERY+' XP · next in '+xpToNextToken()+' XP</small></div></div></div>';
  h+='<div class="perklist">';
  ['hint','peek'].forEach(function(id){var p=PERKS[id];var un=perkUnlocked(id);
    h+='<div class="perk'+(un?' on':'')+'"><span class="pkico">'+gi(p.icon)+'</span><div class="pkinfo"><b>'+p.label+'</b><small>'+(un?'Unlocked · costs '+p.cost+' token in a quiz':'Unlocks at '+p.unlock+' XP')+'</small></div>'+(un?'<span class="btick">&#10003;</span>':'<span class="block">'+p.unlock+' XP</span>')+'</div>';});
  h+='</div>'+inote('Use power-ups while taking a quiz: tap Hint on a question to remove a wrong option, or use Glossary Peek for a ten-second look at your key terms. Each costs one token, and tokens come from XP alone — there is nothing to buy.')+'</div>';
  return h;
}

/* ================= flashcards ================= */
var flash={cards:[],idx:0,known:0,done:false};
function renderFlash(c){
  var pairs=glossaryPairs(c);
  var h=topbar({href:'#c/'+c.id,label:'Contents'});
  h+='<div class="wrap"><header class="dashhead"><div class="kicker">Study · '+R.esc(c.title)+'</div><h1>Flashcards</h1></header>';
  if(!pairs.length){h+='<div class="revempty"><div class="revbig">No terms yet</div><p class="sub">This course has no glossary terms to turn into flashcards.</p><a class="btn" href="#c/'+c.id+'">Back to course</a></div></div>';app.innerHTML=h;return;}
  var deck=R.shuffle(pairs).slice(0,24);
  flash={cards:deck,idx:0,known:0,done:false,cid:c.id};
  h+='<p class="sub" style="text-align:left;margin-top:0">'+deck.length+(pairs.length>deck.length?' of '+pairs.length:'')+' term'+(deck.length>1?'s':'')+' this round'+(pairs.length>deck.length?' (shuffled — come back for more)':'')+'. Tap the card to flip, then rate yourself.</p><div id="flashhost"></div></div>';
  app.innerHTML=h;showFlash();
}
function showFlash(){
  var host=document.getElementById('flashhost');if(!host)return;
  if(flash.idx>=flash.cards.length){
    host.innerHTML='<div class="revempty"><div class="revbig">Deck complete</div><p class="sub">You marked '+flash.known+' of '+flash.cards.length+' as “got it”. '+(flash.known<flash.cards.length?'The rest are worth another pass.':'Nice — you knew them all.')+'</p><div class="btnrow"><a class="btn" href="#c/'+flash.cid+'">Back to course</a><button class="btn ghost" id="flashagain">Shuffle &amp; repeat</button></div></div>';
    if(!flash.done){flash.done=true;awardXP(5);toast('+5 XP · flashcards');checkBadges();}
    return;
  }
  var card=flash.cards[flash.idx];
  host.innerHTML='<div class="flashcard" id="flashcard" data-flip><div class="flashinner">'
    +'<div class="flashface front"><span class="flabel">Term</span><span class="ftext">'+R.esc(card.t)+'</span><small class="fhint">tap to flip</small></div>'
    +'<div class="flashface back"><span class="flabel">Definition</span><span class="ftext">'+R.rich(card.d)+'</span></div></div></div>'
    +'<div class="flashmeta">Card '+(flash.idx+1)+' of '+flash.cards.length+'</div>'
    +'<div class="btnrow"><button class="btn ghost" data-flashrate="0">Still learning</button><button class="btn" data-flashrate="1">Got it &#10003;</button></div>';
}
function flashRate(r){if(r)flash.known++;flash.idx++;bumpQuest('flashes',1);if(flash.cid)touchCourse(flash.cid);showFlash();}

/* ================= match game ================= */
var match={pairs:[],matched:0,first:null,t0:0,iv:null,cid:''};
function renderMatch(c){
  var pairs=glossaryPairs(c);
  var h=topbar({href:'#c/'+c.id,label:'Contents'});
  h+='<div class="wrap"><header class="dashhead"><div class="kicker">Study · '+R.esc(c.title)+'</div><h1>Match</h1></header>';
  if(pairs.length<3){h+='<div class="revempty"><div class="revbig">Not enough terms</div><p class="sub">Match needs at least 3 glossary terms in this course.</p><a class="btn" href="#c/'+c.id+'">Back to course</a></div></div>';app.innerHTML=h;return;}
  match.cid=c.id;
  h+='<p class="sub" style="text-align:left;margin-top:0">Tap a term, then its definition. Clear the board as fast as you can.</p>'
    +'<div class="matchbar"><span>Pairs left: <b id="matchleft"></b></span><span>Time: <b id="matchtimer">0:00</b></span></div>'
    +'<div class="matchgrid" id="matchgrid"></div>'
    +'<div id="matchdone"></div></div>';
  app.innerHTML=h;startMatch(glossaryPairs(c));
}
function startMatch(pairs){
  pairs=R.shuffle(pairs).slice(0,6);match.total=pairs.length;match.matched=0;match.first=null;
  var tiles=[];pairs.forEach(function(p,i){tiles.push({pid:i,kind:'t',text:p.t});tiles.push({pid:i,kind:'d',text:p.d});});
  tiles=R.shuffle(tiles);
  var grid=document.getElementById('matchgrid');
  grid.innerHTML=tiles.map(function(t){return '<button class="matchtile" data-pid="'+t.pid+'" data-kind="'+t.kind+'">'+R.esc(t.text)+'</button>';}).join('');
  document.getElementById('matchleft').textContent=match.total;
  match.t0=Date.now();clearInterval(match.iv);
  match.iv=setInterval(function(){var s=Math.floor((Date.now()-match.t0)/1000);var el=document.getElementById('matchtimer');if(el)el.textContent=Math.floor(s/60)+':'+(s%60<10?'0':'')+(s%60);},500);
}
function matchTap(btn){
  if(btn.classList.contains('matched'))return;
  if(match.first&&match.first!==btn&&match.first.getAttribute('data-pid')===btn.getAttribute('data-pid')&&match.first.getAttribute('data-kind')!==btn.getAttribute('data-kind')){
    match.first.classList.add('matched');btn.classList.add('matched');match.first.classList.remove('sel');match.first=null;match.matched++;
    var left=match.total-match.matched;var le=document.getElementById('matchleft');if(le)le.textContent=left;
    if(match.matched>=match.total)matchWin();
    return;
  }
  if(match.first===btn){btn.classList.remove('sel');match.first=null;return;}
  if(match.first){var a=match.first,b=btn;a.classList.add('bad');b.classList.add('bad');var A=a,B=b;setTimeout(function(){A.classList.remove('bad','sel');B.classList.remove('bad');},550);match.first=null;return;}
  btn.classList.add('sel');match.first=btn;
}
function matchWin(){
  clearInterval(match.iv);var s=Math.floor((Date.now()-match.t0)/1000);
  var host=document.getElementById('matchdone');if(host)host.innerHTML='<div class="revempty" style="margin-top:16px"><div class="revbig">Board cleared</div><p class="sub">'+match.total+' pairs in '+Math.floor(s/60)+':'+(s%60<10?'0':'')+(s%60)+'.</p><div class="btnrow"><a class="btn" href="#c/'+match.cid+'">Back to course</a><button class="btn ghost" id="matchagain">Play again</button></div></div>';
  awardXP(5);toast('+5 XP · match cleared');checkBadges();
}

/* ================= practice test ================= */
function renderPractice(c,mode){
  if(mode==='quick'||mode==='weak'){startPractice(c,mode);return;}
  var bank=courseQuestionBank(c);var weak=weakBank(c);
  var h=topbar({href:'#c/'+c.id,label:'Contents'});
  h+='<div class="wrap"><header class="dashhead"><div class="kicker">Study · '+R.esc(c.title)+'</div><h1>Practice</h1><p class="sub">Ungraded practice drawn from this course’s question bank. Answers you give here also feed your spaced-review schedule.</p></header>';
  h+='<div class="pracpick">';
  h+='<a class="pracopt" href="#c/'+c.id+'/practice/quick"><div class="pkico">&#127919;</div><div class="pkinfo"><b>Quick practice</b><small>'+Math.min(10,bank.length)+' random questions from the whole course</small></div><span class="go">&#8250;</span></a>';
  if(weak.length)h+='<a class="pracopt" href="#c/'+c.id+'/practice/weak"><div class="pkico">&#128293;</div><div class="pkinfo"><b>Weak spots</b><small>'+weak.length+' question'+(weak.length>1?'s':'')+' you’ve struggled with recently</small></div><span class="go">&#8250;</span></a>';
  else h+='<div class="pracopt dim"><div class="pkico">'+gi('flame')+'</div><div class="pkinfo"><b>Weak spots</b><small>Take some quizzes first — the ones you miss show up here to drill.</small></div></div>';
  h+='</div></div>';
  app.innerHTML=h;
}
function startPractice(c,mode){
  var bank=(mode==='weak')?weakBank(c):courseQuestionBank(c);
  if(!bank.length)bank=courseQuestionBank(c);
  bank=R.shuffle(bank);var N=Math.min(10,bank.length);var pick=bank.slice(0,N);
  var questions=pick.map(function(x){return x.q;});var origins=pick.map(function(x){return x.rk;});
  var key='practice_'+c.id;var opts={shuffle:false,origins:origins};
  quizReg[key]={questions:questions,opts:opts};
  var h=topbar({href:'#c/'+c.id+'/practice',label:'Practice'});
  h+='<div class="wrap"><section class="pagecard"><header class="phead"><div class="phpos">'+R.esc(c.title)+' &middot; Practice</div><h2 class="phtitle">'+(mode==='weak'?'Weak-spot drill':'Quick practice')+'</h2></header>';
  h+='<p class="quizsub">'+N+' question'+(N>1?'s':'')+' · ungraded. This won’t change your module progress, but it does refresh your review schedule.</p>';
  h+=R.renderQuiz(questions,key,opts);
  h+='<div class="pagenav"><a class="pn prev" href="#c/'+c.id+'/practice">&#8592; Practice menu</a></div></section></div>';
  app.innerHTML=h;setupPowerups(app.querySelector('.quizwrap'));jumpTop();
}

/* ================= power-ups (hint / glossary peek) ================= */
function keyCourse(key){if(key.indexOf('practice_')===0)return getCourse(key.slice(9));var m=parseQuizKey(key);return m?getCourse(m.cid):null;}
function resolveQuestion(qe,qw){var rk=qe.getAttribute('data-rk');if(rk){var p=rk.split(':');return getQuestion(p[0],p[1],parseInt(p[2],10));}var key=qw.getAttribute('data-quiz');var m=parseQuizKey(key);if(m)return getQuestion(m.cid,m.qk,parseInt(qe.getAttribute('data-qi'),10));return null;}
function setupPowerups(qw){
  if(!qw)return;var key=qw.getAttribute('data-quiz');var c=keyCourse(key);if(!c)return;
  var hasHint=perkUnlocked('hint');var hasPeek=perkUnlocked('peek')&&courseHasGlossary(c);
  if(!hasHint&&!hasPeek)return;
  var bar=document.createElement('div');bar.className='powerbar';
  bar.innerHTML='<span class="pbtok"><span class="rwico">'+gi('token')+'</span><b>'+tokensLeft()+'</b> left</span>'
    +(hasHint?'<span class="pbnote">Tap Hint on a question</span>':'')
    +(hasPeek?'<button class="pbpeek" type="button" data-peek>'+gi('book')+' Glossary peek <span class="tk">1</span></button>':'');
  qw.insertBefore(bar,qw.firstChild);
  if(hasHint){var qs=qw.querySelectorAll('.q');for(var i=0;i<qs.length;i++){var opts=qs[i].querySelector('.opts');if(!opts)continue;var hb=document.createElement('button');hb.type='button';hb.className='hintbtn';hb.setAttribute('data-hint','');hb.innerHTML=gi('bulb')+' Hint <span class="tk">1</span>';opts.parentNode.insertBefore(hb,opts.nextSibling);}}
}
function refreshTokenUI(){var els=document.querySelectorAll('.pbtok b');for(var i=0;i<els.length;i++)els[i].textContent=tokensLeft();}
function applyHint(qe,type){
  if(qe.getAttribute('data-hinted'))return false;
  if(type==='text'){
    var qw=qe.closest('.quizwrap');var q=resolveQuestion(qe,qw);if(!q)return false;
    var ans=''+R.answerDisplay(q);var el=document.createElement('div');el.className='qhint';
    el.innerHTML=gi('bulb')+' '+ans.length+' character'+(ans.length>1?'s':'')+', starts with “<b>'+R.esc(ans.charAt(0))+'</b>”.';
    var o=qe.querySelector('.opts');o.parentNode.insertBefore(el,o.nextSibling);qe.setAttribute('data-hinted','1');return true;
  }
  var wrong;
  if(type==='multi')wrong=[].slice.call(qe.querySelectorAll('.opt.mopt')).filter(function(l){var i=l.querySelector('input');return i&&i.getAttribute('data-correct')==='0'&&!l.classList.contains('eliminated')&&!i.checked;});
  else wrong=[].slice.call(qe.querySelectorAll('.opt.isw')).filter(function(l){var i=l.querySelector('input');return !l.classList.contains('eliminated')&&!(i&&i.checked);});
  if(!wrong.length)return false;
  wrong[Math.floor(Math.random()*wrong.length)].classList.add('eliminated');qe.setAttribute('data-hinted','1');return true;
}
function glossaryPeek(c){
  closePeek();
  var ov=document.createElement('div');ov.className='peekoverlay';ov.id='peekoverlay';
  ov.innerHTML='<div class="peekcard"><div class="peekhd"><b>'+gi('book')+' Glossary peek</b><span class="peekcount" id="peekcount">10</span></div><div class="peekbody">'+R.courseGlossary(c)+'</div><div class="btnrow"><button class="btn ghost" id="peekclose">Close now</button></div></div>';
  document.body.appendChild(ov);
  var n=10;ov._iv=setInterval(function(){n--;var el=document.getElementById('peekcount');if(el)el.textContent=n;if(n<=0)closePeek();},1000);
}
function closePeek(){var ov=document.getElementById('peekoverlay');if(ov){clearInterval(ov._iv);ov.parentNode.removeChild(ov);}}

/* ================= account UI ================= */
function acctShown(){return backendConfigured()||!!window.COURSEAPP_ADAPTER;}
function acctChipHTML(){
  if(!acctShown())return '';
  if(session){var dot=syncState==='ok'?'#31c48d':syncState==='syncing'?'#f0b429':syncState==='error'?'#f2687f':'#98a1b2';
    return '<a class="acctchip in" href="#account" id="acctchip" title="'+R.esc(session.email||'')+'"><span class="acctdot" style="background:'+dot+'"></span><span class="acctav">'+R.esc((session.email||'?').charAt(0).toUpperCase())+'</span></a>';}
  return '<a class="acctchip" href="#account" id="acctchip">Sign in</a>';
}
function updateAcctChip(){var el=document.getElementById('acctchip');if(el)el.outerHTML=acctChipHTML();renderDrawer();}
function syncLabel(){return syncState==='ok'?'up to date':syncState==='syncing'?'syncing…':syncState==='error'?'error — will retry':'—';}
function renderAccount(){
  var h=topbar({href:'#',label:'My Learning'});
  h+='<div class="wrap"><header class="dashhead"><div class="kicker">Account</div><h1>Sign in &amp; sync</h1></header>';
  if(!acctShown()){
    h+='<div class="revempty"><div class="revbig">Offline mode</div><p class="sub">This copy isn’t connected to an accounts backend, so everything saves on this device only — fully usable, nothing lost. To turn on accounts and cross-device sync, connect a Supabase project (see the setup guide) and sign-in appears here automatically.</p><a class="btn" href="#settings">Back to settings</a></div></div>';
    app.innerHTML=h;return;
  }
  if(session){
    h+='<div class="acctcard"><div class="acctbig">'+R.esc(session.email||'Signed in')+'</div>'
      +'<div class="acctsync">Sync: <b>'+syncLabel()+'</b></div>'
      +(lastSyncError?'<div class="syncerr">'+R.esc(lastSyncError)+'</div>':'')
      +'<div class="btnrow"><button class="btn" id="syncnow">Sync now</button><button class="btn ghost" id="signout">Sign out</button></div>'
      +'<div class="btnrow"><button class="btn ghost" id="synctest">Check connection</button></div>'
      +'<div id="syncdiag"></div>'
      +'<p class="setnote">Your progress, courses, notes and rewards sync to your account and merge across devices — the furthest-along value always wins, so you never lose ground. Course text isn’t uploaded; the other device fetches it from the catalogue, so syncing stays fast on mobile data.</p></div>';
  } else {
    h+='<div class="acctcard"><div class="authtabs"><button class="authtab on" data-authtab="in">Sign in</button><button class="authtab" data-authtab="up">Create account</button></div>'
      +'<form id="authform" data-mode="in">'
      +'<input class="authinput" id="authemail" type="email" placeholder="you@email.com" autocomplete="email">'
      +'<input class="authinput" id="authpw" type="password" placeholder="Password (6+ characters)" autocomplete="current-password">'
      +'<button class="btn authwide" id="authsubmit" type="submit">Sign in</button>'
      +'</form>'
      +'<div class="author"><span>or</span></div>'
      +'<button class="btn ghost authwide" id="googlebtn">Continue with Google</button>'
      +'<p class="autherr" id="autherr"></p>'
      +'<p class="setnote">Creating an account saves your progress and syncs it across devices. We store only your email and your learning progress.</p></div>';
  }
  h+='</div>';app.innerHTML=h;
}
/* A real round-trip against the backend, reported in plain language. This is the
   difference between "there's a red dot" and "the user_state table is missing". */
function runSyncDiag(){
  var host=document.getElementById('syncdiag');if(!host)return;
  var rows=[];
  var draw=function(){host.innerHTML='<div class="diag">'+rows.map(function(r){
    return '<div class="diagrow '+r.s+'"><span class="diagico">'+(r.s==='ok'?'&#10003;':r.s==='bad'?'&#10007;':'&#8230;')+'</span><span><b>'+R.esc(r.t)+'</b>'+(r.d?'<small>'+R.esc(r.d)+'</small>':'')+'</span></div>';
  }).join('')+'</div>';};
  var step=function(t){var r={t:t,s:'run',d:''};rows.push(r);draw();return r;};

  if(!adapter){rows.push({t:'No backend connected',s:'bad',d:'This build has no Supabase keys.'});draw();return;}
  if(!session){rows.push({t:'Not signed in',s:'bad',d:'Sign in first.'});draw();return;}
  if(isOffline()){rows.push({t:'This device is offline',s:'bad',d:'Reconnect and try again.'});draw();return;}

  var s1=step('Reading your saved state');
  Promise.resolve().then(function(){return adapter.pullState(session.userId);})
    .then(function(remote){
      s1.s='ok';
      s1.d=remote?('Found a saved record'+(remote.gam&&remote.gam.xp!=null?' — '+remote.gam.xp+' XP':'')):'No record yet (normal on a new account)';
      draw();
      var s2=step('Writing a test update');
      return Promise.resolve().then(function(){return adapter.pushState(session.userId,syncPayload());})
        .then(function(){s2.s='ok';s2.d='Write accepted';draw();
          var s3=step('Reading it back');
          return Promise.resolve().then(function(){return adapter.pullState(session.userId);})
            .then(function(back){
              if(back&&back.gam&&back.gam.xp===store.gam.xp){s3.s='ok';s3.d='Matches this device — sync is working.';}
              else{s3.s='bad';s3.d='The value read back does not match what was written.';}
              draw();
              lastSyncError=s3.s==='ok'?'':s3.d;syncState=s3.s==='ok'?'ok':'error';updateAcctChip();
            });
        })
        .catch(function(e){s2.s='bad';s2.d=(e&&e.message)||'Write failed.';draw();lastSyncError=s2.d;syncState='error';updateAcctChip();});
    })
    .catch(function(e){s1.s='bad';s1.d=(e&&e.message)||'Read failed.';draw();lastSyncError=s1.d;syncState='error';updateAcctChip();});
}
function authErr(m){var el=document.getElementById('autherr');if(el){el.textContent=m;el.style.display='block';}}
function fieldVal(id){var el=document.getElementById(id);return el?el.value.trim():'';}
function doAuth(){
  if(!adapter){authErr('Backend not connected.');return;}
  var form=document.getElementById('authform');var mode=form?form.getAttribute('data-mode'):'in';
  var email=fieldVal('authemail'),pw=document.getElementById('authpw')?document.getElementById('authpw').value:'';
  if(!email||!pw){authErr('Enter your email and password.');return;}
  if(mode==='up'&&pw.length<6){authErr('Password must be at least 6 characters.');return;}
  var btn=document.getElementById('authsubmit');if(btn){btn.disabled=true;btn.textContent='Please wait…';}
  var pr=mode==='up'?adapter.auth.signUp(email,pw):adapter.auth.signInPassword(email,pw);
  Promise.resolve(pr).then(function(res){
    if(res&&res.error){authErr(res.error.message||'Could not sign in.');if(btn){btn.disabled=false;btn.textContent=(mode==='up'?'Create account':'Sign in');}return;}
    if(mode==='up'&&res&&res.data&&!res.data.session){toast('Check your email to confirm your account.');if(btn){btn.disabled=false;btn.textContent='Create account';}}
  }).catch(function(err){authErr((err&&err.message)||'Something went wrong.');if(btn){btn.disabled=false;btn.textContent=(mode==='up'?'Create account':'Sign in');}});
}

/* ================= course store ================= */
/* Catalogue sources, in priority order:
   1. a backend adapter (Supabase), if configured
   2. a static JSON catalogue served next to the app (window.COURSEAPP_CATALOG),
      which keeps big courses out of the HTML file
   3. whatever is inlined in window.STORE_CATALOG (offline/demo fallback)
   Downloaded courses are stored locally, so they keep working offline afterwards. */
function catalogBase(){
  // opening the file directly from disk (file://) can't fetch — use the inline data instead
  if(typeof location!=='undefined'&&location.protocol==='file:')return '';
  var b=window.COURSEAPP_CATALOG;return (typeof b==='string'&&b)?b.replace(/\/$/,''):'';
}
/* Summaries keep the two numbers the store has to show. Whether the source is a
   catalogue index (module count as a number) or a whole course (an array), the
   summary ends up carrying both hours and modules. */
function summarise(c){
  var mods=Array.isArray(c.modules)?c.modules.length:(typeof c.modules==='number'?c.modules:0);
  var hrs=c.hours||(Array.isArray(c.modules)?courseHours(c):0);
  return {id:c.id,title:c.title,subtitle:c.subtitle,tagline:c.tagline,accent:c.accent,
    price:c.price||0,author:c.author||'',category:c.category||'',
    weeks:c.weeks||0,hours:hrs,modules:mods};
}
var _catCache=null;
/* The catalogue that ships with the app: catalog/*.json over HTTP, inline summaries otherwise. */
function staticCatalogList(){
  var base=catalogBase();
  if(base&&typeof fetch==='function'){
    if(_catCache)return Promise.resolve(_catCache);
    return fetch(base+'/index.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.json();})
      .then(function(list){_catCache=(list||[]).map(summarise);return _catCache;})
      .catch(function(){return (window.STORE_CATALOG||[]).map(summarise);});
  }
  return Promise.resolve((window.STORE_CATALOG||[]).map(summarise));
}
function staticCatalogGet(id){
  var inline=(window.STORE_CATALOG||[]).filter(function(x){return x.id===id;})[0];
  /* Catalogue summaries now carry a module *count*, so a truthy `modules` no
     longer means "this is the whole course". Only an array is. */
  if(inline&&Array.isArray(inline.modules)&&inline.modules.length)return Promise.resolve(inline);
  var base=catalogBase();
  if(base&&typeof fetch==='function'){
    return fetch(base+'/'+encodeURIComponent(id)+'.json',{cache:'no-cache'})
      .then(function(r){if(!r.ok)throw 0;return r.json();}).catch(function(){return null;});
  }
  return Promise.resolve(inline||null);
}
/* A configured backend takes precedence — but only when it actually has something.
   An empty or unreachable remote catalogue (table not created yet, RLS blocking reads,
   offline) must never black out a store the shipped files can serve perfectly well. */
function catalogList(){
  if(adapter&&adapter.listCatalog){
    return Promise.resolve().then(function(){return adapter.listCatalog();})
      .catch(function(){return null;})
      .then(function(list){
        if(list&&list.length)return list.map(summarise);
        return staticCatalogList();
      });
  }
  return staticCatalogList();
}
function catalogGet(id){
  if(adapter&&adapter.getCourse){
    return Promise.resolve().then(function(){return adapter.getCourse(id);})
      .catch(function(){return null;})
      .then(function(c){return c?c:staticCatalogGet(id);});
  }
  return staticCatalogGet(id);
}
function installCourse(course){
  if(!validCourse(course))return false;var ex=getCourse(course.id);
  if(ex&&isBuiltin(ex)){store.hidden=(store.hidden||[]).filter(function(x){return x!==course.id;});}
  else{store.imported=(store.imported||[]).filter(function(x){return x.id!==course.id;});store.imported.push(course);}
  save();return true;
}
function renderStore(){renderLibrary('store');}
/* One course in the store, as a row rather than a card. The number is its
   position in the specialization, which is the piece of information the old
   flat grid could not express at all. */
function storeRowHTML(c,n,t){
  var installed=!!getCourse(c.id)&&!isHidden(c.id);
  var price=c.price||0;
  var acc=c.accent||(t&&t.accent)||'#5b8cff';
  /* A course you own gets a whole-row hit area into its page. One you do not own
     has no page to go to, so its title is plain text and the button is the only
     target — which is also why the title is not a link the audit can flag as
     too small to tap. */
  /* Scale, not just a name. Nothing in the old store said whether a course was
     a two-hour taster or a forty-hour commitment, which is the first thing
     anyone deciding actually wants to know. */
  /* The installed course knows its own shape; a catalogue summary carries the
     same two numbers precomputed, so an uninstalled course is not silent about
     what it costs — which is precisely when the question is being asked. */
  var full=getCourse(c.id);
  var src=full||c;
  var mods=Array.isArray(src.modules)?src.modules.length:(typeof src.modules==='number'?src.modules:0);
  var hrs=Array.isArray(src.modules)?courseHours(src):(src.hours||0);
  var meta=(mods&&hrs)?hrs+' hours · '+mods+' modules':(mods?mods+' modules':'');
  var desc=c.tagline||c.subtitle||'';
  return '<div class="strow'+(installed?' have':'')+'" data-cid="'+R.esc(c.id)+'" style="--sa:'+acc+';--sacta:'+solidOf(acc)+'">'
    +'<span class="stn">'+(n?n:'&bull;')+'</span>'
    +'<div class="stmid">'
    +(installed
      ? '<a class="sttitle stretch" href="#c/'+c.id+'">'+R.esc(c.title)+'</a>'
      : '<span class="sttitle">'+R.esc(c.title)+'</span>')
    +(meta?'<div class="stmeta">'+meta+'</div>':'')
    +'</div>'
    +(installed
      ? '<a class="stbtn go" href="#c/'+c.id+'">Open</a>'
      : '<button class="stbtn" data-getcourse="'+R.esc(c.id)+'">'+(price>0?'$'+price:'Get')+'</button>')
    /* The description used to be a truncated line with no way to finish reading
       it. It folds instead, so the row stays short and the sentence stays whole.
       Not <details>: its two children are not flex items of the row, so an open
       one cannot span the row and keep its toggle inline. */
    +(desc?'<button class="stmore" data-stdesc aria-expanded="false" aria-label="About this course">'+gi('chev')+'</button>':'')
    +(desc?'<p class="stsub" hidden>'+R.esc(desc)+'</p>':'')
    +'</div>';
}
function renderStoreList(list){
  var host=document.getElementById('storelist');if(!host)return;list=list||[];
  if(!list.length){host.innerHTML='<div class="revempty"><div class="revbig">Nothing here yet</div><p class="sub">No courses were found in the catalogue folder'+(backendEnabled()?' or in your backend catalogue':'')+'. Add a course JSON to <code>catalog/</code> and list it in <code>catalog/index.json</code>.</p><a class="btn" href="#library">Back to my courses</a></div>';return;}
  var avail=list.filter(function(c){return !getCourse(c.id)||isHidden(c.id);}).length;
  var h='';
  if(libGroupMode()==='az'||!allTracks().length){
    h+='<div class="stlist">';
    list.slice().sort(function(a,b){return (a.title||'').localeCompare(b.title||'');})
      .forEach(function(c){var tc=trackOfCourse(c.id);h+=storeRowHTML(c,tc?tc.n:0,tc&&tc.track);});
    h+='</div>';
  } else {
    /* A specialization with nothing written yet is a promise, not a shelf. Six
       empty group headers would be most of the screen, so they collapse into one
       honest line at the bottom instead. */
    var groups=groupByTrack(list).filter(function(g){return g.items.length;});
    var planned=allTracks().filter(function(t){
      return !groups.some(function(g){return g.track&&g.track.id===t.id;});
    });
    groups.forEach(function(g){
      var body='<div class="stlist">';
      g.items.forEach(function(it){body+=storeRowHTML(it.c,it.n,g.track);});
      if(g.missing.length){
        body+='<div class="stsoon">'+g.missing.length+' more course'+(g.missing.length>1?'s':'')+' in this specialization '
          +(g.missing.length>1?'are':'is')+' still being written.</div>';
      }
      body+='</div>';
      var todo=g.items.filter(function(it){return !getCourse(it.c.id);}).length;
      var sub=g.track?(todo?todo+' to add':'all added &#10003;'):null;
      h+='<section class="grp">'+groupHeadHTML(g.track,g.items.length,sub)+body+'</section>';
    });
    if(planned.length){
      var pl='';
      planned.forEach(function(t){
        pl+='<a class="plrow" href="#track/'+t.id+'" style="--ga:'+(t.accent||'#7b61ff')+'"><span class="grpart sm">'+coverSVG(t.id,t.accent||'#7b61ff',120,120)+'</span>'
          +'<span class="plname">'+R.esc(t.title)+'</span>'
          +'<span class="plct">'+((t.courseIds||[]).length)+' courses</span></a>';
      });
      h+='<section class="grp planned"><div class="grphead plain"><span class="grpname">In development</span>'
        +'<span class="grpcount">'+planned.length+'</span></div>'
        +'<div class="pllist">'+pl+'</div>'
        +'<p class="stsoon">These specializations are planned and their courses are being written. The outline of each is already readable on its page.</p></section>';
    }
  }
  host.innerHTML='<div class="stwrap">'
    +'<div class="stbar"><span class="stcount">'+avail+' available to add</span>'+libGroupToggleHTML()+'</div>'
    +h+'</div>';
}

function jumpLabel(cid,page){var c=getCourse(cid);if(!c)return page;return R.esc(c.title)+' · '+labelFor(c,page);}
function renderSaved(){
  var h=topbar({href:'#',label:'My Learning'});
  h+='<div class="wrap"><header class="dashhead"><div class="kicker">Your study</div><h1>Saved</h1><p class="sub">Bookmarks, notes, and highlights across every course — all in one place.</p></header>';
  var bms=(store.bookmarks||[]).filter(function(b){return getCourse(b.c)&&!isHidden(b.c);});
  var noteKeys=Object.keys(store.notes||{}).filter(function(k){var cid=k.split('/')[0];return getCourse(cid)&&!isHidden(cid);});
  var markKeys=Object.keys(store.marks||{}).filter(function(k){var cid=k.split('/')[0];return getCourse(cid)&&!isHidden(cid)&&store.marks[k].length;});
  if(!bms.length&&!noteKeys.length&&!markKeys.length){
    h+='<div class="revempty"><div class="revbig">Nothing saved yet</div><p class="sub">Open any lesson to bookmark it, write a note, or select text to highlight. They’ll collect here.</p><a class="btn" href="#">Back to My Learning</a></div></div>';
    app.innerHTML=h;return;
  }
  if(bms.length){
    var sb='';
    bms.forEach(function(b){var pg=b.page||b.k.split('/').slice(1).join('/');
      sb+='<div class="row savedrow"><a class="savedmain" href="#c/'+b.c+'/'+pg+'"><span class="savedico">'+gi('bookmark')+'</span><span class="savedtxt">'+jumpLabel(b.c,pg)+'</span></a><button class="savedx" data-delbm="'+b.c+'|'+pg+'" aria-label="Remove bookmark">&times;</button></div>';
    });
    h+=collSection('sv-bookmarks','Bookmarks',bms.length,'<div class="savedsec">'+sb+'</div>',true);
  }
  if(noteKeys.length){
    var nb='';
    noteKeys.forEach(function(k){var cid=k.split('/')[0];var pg=k.split('/').slice(1).join('/');
      nb+='<div class="notecard"><a class="notehd" href="#c/'+cid+'/'+pg+'">'+jumpLabel(cid,pg)+' &#8594;</a><div class="notebody">'+R.esc(store.notes[k])+'</div><button class="savedx notedel" data-delnote="'+cid+'|'+pg+'" aria-label="Delete note">Delete note</button></div>';
    });
    h+=collSection('sv-notes','Notes',noteKeys.length,'<div class="savedsec">'+nb+'</div>',true);
  }
  if(markKeys.length){
    var total=0;markKeys.forEach(function(k){total+=store.marks[k].length;});
    var hb='';
    markKeys.forEach(function(k){var cid=k.split('/')[0];var pg=k.split('/').slice(1).join('/');
      hb+='<div class="notecard"><a class="notehd" href="#c/'+cid+'/'+pg+'">'+jumpLabel(cid,pg)+' &#8594;</a><ul class="hllist">';
      store.marks[k].forEach(function(t){hb+='<li>'+R.esc(t)+'</li>';});
      hb+='</ul></div>';
    });
    h+=collSection('sv-marks','Highlights',total,'<div class="savedsec">'+hb+'</div>',true);
  }
  h+='</div>';
  app.innerHTML=h;
}
function render(){
  var h=location.hash||'';
  var parts=h.replace(/^#\/?/,'').split('/').filter(Boolean);
  renderDrawer();
  if(parts[0]==='review'){renderReview();jumpTop();return;}
  if(parts[0]==='saved'){renderSaved();jumpTop();return;}
  if(parts[0]==='badges'){renderBadges();jumpTop();return;}
  if(parts[0]==='account'){renderAccount();jumpTop();return;}
  if(parts[0]==='store'){renderLibrary('store');jumpTop();return;}
  if(parts[0]==='library'){renderLibrary(parts[1]==='store'?'store':'mine');jumpTop();return;}
  if(parts[0]==='track'){renderTrack(parts[1]);jumpTop();return;}
  if(parts[0]==='choose'){renderChoose();jumpTop();return;}
  if(parts[0]==='design'){renderDesign();jumpTop();return;}
  if(parts[0]==='path'){renderPath(parts[1]);jumpTop();return;}
  if(parts[0]==='m'){var mc=getCourse(parts[1]);
    if(!mc||isHidden(parts[1])){location.hash='#design';return;}
    renderModule(mc,parseInt(parts[2],10)||1);jumpTop();return;}
  if(parts[0]==='warmup'){renderWarmup();jumpTop();return;}
  if(parts[0]==='transcript'){renderTranscript();jumpTop();return;}
  if(parts[0]==='c'){var c=getCourse(parts[1]);if(!c||isHidden(parts[1])){location.hash='';return;}
    if(parts[2]==='glossary')renderGlossaryPage(c);
    else if(parts[2]==='search')renderSearchPage(c,decodeURIComponent(parts[3]||''));
    else if(parts[2]==='flash')renderFlash(c);
    else if(parts[2]==='match')renderMatch(c);
    else if(parts[2]==='practice')renderPractice(c,parts[3]);
    else if(parts[2])renderPage(c,parts[2]);
    else renderCourseHome(c);}
  else if(parts[0]==='new'){renderCreate();}
  else if(parts[0]==='settings'){renderSettings();}
  else{renderHome();}
  var pd=document.getElementById('certdate');if(pd){var d=new Date();var mo=['January','February','March','April','May','June','July','August','September','October','November','December'];pd.textContent=mo[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear();}
  jumpTop();
}
/* Courses now start in the store and are added to the library deliberately.
   Anyone who already has progress in a course keeps it: we re-install it on first run. */
function migrateLibrary(){
  var cat=(window.STORE_CATALOG||[]).filter(function(c){return c&&c.modules;});
  var have={};(store.imported||[]).forEach(function(c){have[c.id]=1;});
  var added=0;
  Object.keys(store.progress||{}).forEach(function(id){
    if(have[id])return;
    var p=store.progress[id];
    var active=p&&(p.lastPage||p.finalPassed||(p.passed&&Object.keys(p.passed).length));
    if(!active)return;
    var full=cat.filter(function(x){return x.id===id;})[0];
    if(full){store.imported.push(full);have[id]=1;added++;}
  });
  if(added)save();
  // if the catalogue lives remotely, restore any progressed course asynchronously
  var base=catalogBase();
  if(!base&&!(adapter&&adapter.getCourse))return;
  Object.keys(store.progress||{}).forEach(function(id){
    if(have[id])return;
    var p=store.progress[id];
    var active=p&&(p.lastPage||p.finalPassed||(p.passed&&Object.keys(p.passed).length));
    if(!active)return;
    have[id]=1;
    catalogGet(id).then(function(full){
      if(full&&full.modules&&!getCourse(id)){store.imported.push(full);save();softRender();}
    }).catch(function(){});
  });
}
function boot(){app=document.getElementById('app');
  if(!document.getElementById('navroot')){var nr=document.createElement('div');nr.id='navroot';document.body.appendChild(nr);}
  // marks that the interactive app (and therefore the desktop nav rail) is live —
  // the no-JS reading view must not reserve a gutter for a rail that never renders
  document.body.classList.add('hasrail');
  load();applySettings();
  window.addEventListener('hashchange',render);
  window.addEventListener('online',onNetChange);
  window.addEventListener('offline',onNetChange);
  registerSW();
  wireInstall();
  /* ask once per session, quietly: the browser either grants it or does not,
     and either way Settings reports what actually happened */
  checkPersist().then(function(p){
    if(p.state==='not-granted'&&(store.gam&&(store.gam.xp||0)>0))return askPersist();
  }).catch(function(){});
  lbWatchViewport();
  wireReadBar();
  wireStickyGo();
  // sticky letter headings need to know how tall the top bar actually is
  var setTB=function(){
    var b=document.querySelector('.topbar');
    if(b)document.documentElement.style.setProperty('--topbarh',Math.round(b.getBoundingClientRect().height)+'px');
  };
  window.addEventListener('hashchange',function(){setTimeout(setTB,60);});
  window.addEventListener('resize',setTB);setTimeout(setTB,120);
  // Course bodies come from IndexedDB — normally a few milliseconds. But storage
  // can stall, and nothing is worth a blank screen, so first paint is capped at
  // 900 ms whatever happens; late-arriving bodies trigger a safe re-render.
  var started=false;
  var go=function(){if(started)return;started=true;migrateLibrary();render();initBackend();};
  hydrateCourses().then(function(){if(started)softRender();else go();}).catch(go);
  setTimeout(go,900);
}
/* A re-render triggered by background work must never wipe something the learner
   is in the middle of. Only list-style screens are safe to repaint underneath. */
/* One listener for the whole app; it does nothing at all when no bar is present. */
function jumpTop(){
  var d=document.documentElement, prev=d.style.scrollBehavior;
  d.style.scrollBehavior='auto';
  void d.offsetHeight;               // the override has to be in effect before the scroll
  try{window.scrollTo({top:0,left:0,behavior:'instant'});}
  catch(e){window.scrollTo(0,0);}
  // restore on the next frame so an anchor tapped straight after still glides
  requestAnimationFrame(function(){d.style.scrollBehavior=prev||'';});
}
/* The primary action on a course, module or path sits near the top, which is right
   for scanning and wrong for a thumb on a 6.7-inch phone. Once it scrolls away, a
   copy of it comes back within reach. It is the same link, not a second one. */
function wireStickyGo(){
  var bar=null,raf=0;
  var upd=function(){
    raf=0;
    var go=document.querySelector('.wrap .cgo[href]');
    if(!go){if(bar)bar.classList.remove('on');return;}
    if(!bar){
      bar=document.createElement('div');bar.id='stickygo';
      document.body.appendChild(bar);
    }
    var r=go.getBoundingClientRect();
    var gone=r.bottom<64;
    if(gone){
      var lbl=(go.querySelector('.cgobtn')||{}).textContent||'Continue';
      var sub=(go.querySelector('.cgotxt small')||{}).textContent||'';
      var want=go.getAttribute('href')+'|'+lbl+'|'+sub;
      if(bar.getAttribute('data-for')!==want){
        bar.setAttribute('data-for',want);
        bar.innerHTML='<a class="sgo" href="'+go.getAttribute('href')+'">'
          +'<span class="sgtxt">'+R.esc(sub)+'</span>'
          +'<span class="sgbtn">'+R.esc(lbl)+'</span></a>';
        bar.style.setProperty('--cta',getComputedStyle(go).getPropertyValue('--cta')||'');
      }
    }
    bar.classList.toggle('on',gone);
  };
  var on=function(){if(!raf)raf=requestAnimationFrame(upd);};
  window.addEventListener('scroll',on,{passive:true});
  window.addEventListener('resize',on);
  window.addEventListener('hashchange',function(){setTimeout(upd,80);});
  setTimeout(upd,120);
}
function wireReadBar(){
  var raf=0;
  var upd=function(){
    raf=0;
    var el=document.getElementById('readbar');
    if(!el)return;
    var doc=document.documentElement;
    var max=Math.max(1,doc.scrollHeight-window.innerHeight);
    var pct=Math.max(0,Math.min(100,Math.round(window.scrollY/max*100)));
    el.firstChild.style.width=pct+'%';
    // sit exactly under the sticky top bar, whose height varies with the safe area
    var tb=document.querySelector('.topbar');
    el.style.top=(tb?Math.round(tb.getBoundingClientRect().bottom):0)+'px';
    el.classList.toggle('on',max>window.innerHeight*0.6);
  };
  var onScroll=function(){if(!raf)raf=requestAnimationFrame(upd);};
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll);
  window.addEventListener('hashchange',function(){setTimeout(upd,60);});
  setTimeout(upd,80);
}
function softRender(){
  var parts=(location.hash||'').replace(/^#\/?/,'').split('/').filter(Boolean);
  var seg=parts[0]||'';
  if(seg==='review'||seg==='c')return;                 // quiz, lesson, flashcards, review
  if(app&&app.querySelector('.quizwrap:not(.graded)'))return;
  var ae=document.activeElement;
  if(ae&&/^(INPUT|TEXTAREA)$/.test(ae.tagName||''))return;   // typing a note or an answer
  render();
}
/* ---------- offline ---------- */
function isOffline(){return typeof navigator!=='undefined'&&navigator.onLine===false;}
function onNetChange(){
  var b=document.getElementById('offbar');
  if(isOffline()){
    if(!b){b=document.createElement('div');b.id='offbar';document.body.appendChild(b);}
    b.innerHTML='<span class="offdot"></span>Offline — your downloaded courses still work.';
    b.className='show';
  } else if(b){b.className='';}
}
/* The service worker is what makes the app itself open with no connection.
   Without it the browser simply fails to load index.html and nothing else matters. */
function registerSW(){
  try{
    if(!('serviceWorker' in navigator))return;
    var h=location.hostname;
    if(location.protocol!=='https:'&&h!=='localhost'&&h!=='127.0.0.1')return;
    var had=!!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('./sw.js').catch(function(){});
    navigator.serviceWorker.addEventListener('controllerchange',function(){
      if(had)toast('A new version is ready — reload to use it.');
      had=true;
    });
  }catch(e){}
}
/* A keyhole for the automated suite. Nothing reads this in normal use — the
   flag is only ever set by the test harness before the page loads — but it
   lets the tests check the credit and streak arithmetic directly instead of
   inferring it from pixels. */
if(window.OBOROS_TEST){
  window.OB={
    moduleCredits:moduleCredits,courseCredits:courseCredits,earnedCredits:earnedCredits,
    totalCredits:totalCredits,gradeFor:gradeFor,transcriptRows:transcriptRows,gpa:gpa,
    courseMilestones:courseMilestones,checkMilestones:checkMilestones,
    nextMilestoneLabel:nextMilestoneLabel,advanceStreak:advanceStreak,
    getCourse:getCourse,save:save,store:function(){return store;},coverSVG:coverSVG,
    moduleHours:moduleHours,courseHours:courseHours,finalCredits:finalCredits,
    paths:paths,newPath:newPath,getPath:getPath,pathAdd:pathAdd,pathStats:pathStats,
    moduleUnlocked:moduleUnlocked,isSolo:isSolo,openSolo:openSolo,snakeRing:snakeRing,
    moduleCredits:moduleCredits,earnedCredits:earnedCredits,totalCredits:totalCredits,
    celebrate:celebrate,toast:toast,
    lessonMinutes:lessonMinutes,moduleReadMinutes:moduleReadMinutes,
    courseIndex:courseIndex,searchCourse:searchCourse,
    installState:installState,checkPersist:checkPersist,
    revCard:function(){return rev&&rev.queue?rev.queue[rev.idx]:null;}
  };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();






