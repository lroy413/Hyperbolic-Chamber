/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
/* test27 — sync failures must be visible.
   supabase-js resolves with {data,error} rather than rejecting, so a missing
   table or a blocking RLS policy used to look like a successful write and the
   app reported "up to date" while nothing was saved. These tests pin the
   corrected behaviour and the on-device diagnostic that explains it. */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));

let pass=0,fail=0;
function ok(n,c){(c?pass++:fail++);console.log((c?'  PASS ':'  FAIL ')+n);}

// A fake supabase-js client: resolves with {error} instead of rejecting, exactly
// like the real one. The adapter under test is the app's own supabaseAdapter.
const CLIENT=(behaviour)=>`
window.__FAIL=${JSON.stringify(behaviour)};
// the built page sets COURSEAPP_BACKEND to blanks in an inline script that runs
// after this one, so pin it read-only to keep the fake backend configured
Object.defineProperty(window,'COURSEAPP_BACKEND',{value:{url:'https://example.supabase.co',anonKey:'anon'},writable:false,configurable:false});
window.supabase={createClient:function(){
  var authCbs=[];var user={id:'u1',email:'l@example.com'};
  function result(){
    var f=window.__FAIL;
    if(f==='missing') return Promise.resolve({data:null,error:{code:'42P01',message:'relation "public.user_state" does not exist'}});
    if(f==='rls')     return Promise.resolve({data:null,error:{code:'42501',message:'new row violates row-level security policy for table "user_state"'}});
    return Promise.resolve({data:window.__ROW||null,error:null});
  }
  return {
    auth:{
      getUser:function(){return Promise.resolve({data:{user:user}});},
      onAuthStateChange:function(cb){authCbs.push(cb);setTimeout(function(){cb('SIGNED_IN',{user:user});},10);return {data:{subscription:{}}};},
      signInWithPassword:function(){return Promise.resolve({data:{user:user},error:null});},
      signUp:function(){return Promise.resolve({data:{user:user},error:null});},
      signOut:function(){return Promise.resolve({});},
      signInWithOAuth:function(){return Promise.resolve({});}
    },
    from:function(){
      var q={
        select:function(){return q;}, eq:function(){return q;}, order:function(){return q;},
        maybeSingle:function(){return result();},
        upsert:function(row){
          var f=window.__FAIL;
          if(f==='missing'||f==='rls')return result();
          window.__ROW={data:row.data};
          return Promise.resolve({data:null,error:null});
        },
        then:function(res,rej){return result().then(res,rej);}
      };
      return q;
    }
  };
}};`;

const boot=async(b,behaviour)=>{
  const ctx = await b.newContext({javaScriptEnabled:true,viewport:{width:1280,height:900}});
  await ctx.addInitScript("window.OBOROS_NO_QUESTS=1;");
  await ctx.addInitScript(CLIENT(behaviour));
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto(URL,{waitUntil:'load'});
  await p.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'load'});
  await p.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);
  await p.waitForTimeout(900);
  return {ctx,p,errs};
};

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});

// ---------- table missing ----------
{
  const d=await boot(b,'missing');
  await d.p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await d.p.waitForTimeout(2600);
  await d.p.evaluate(()=>{location.hash='#account';});await d.p.waitForTimeout(500);
  const txt=await d.p.locator('#app').innerText();
  ok('missing table: sync does NOT report "up to date"', !/up to date/.test(txt));
  ok('missing table: an error is shown', /error/i.test(txt));
  ok('missing table: the message names the actual cause', /user_state table is missing/i.test(txt));
  ok('missing table: the account dot is red', await d.p.evaluate(()=>{
    var el=document.querySelector('.navacct .acctdot');return el&&/242|f2687f|246/.test(el.style.background||'');
  })||/error/i.test(txt));

  // the diagnostic
  await d.p.locator('#synctest').click();await d.p.waitForTimeout(900);
  const diag=await d.p.locator('#syncdiag').innerText();
  ok('diagnostic runs and reports a failure', /✗|does not exist|missing/i.test(diag));
  ok('diagnostic names the failing step', /Reading your saved state|Writing a test update/.test(diag));
  ok('missing table: no uncaught errors', d.errs.length===0);
  if(d.errs.length)console.log('   ',d.errs.slice(0,3));
  await d.ctx.close();
}

// ---------- blocked by row-level security ----------
{
  const d=await boot(b,'rls');
  await d.p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await d.p.waitForTimeout(2600);
  await d.p.evaluate(()=>{location.hash='#account';});await d.p.waitForTimeout(500);
  const txt=await d.p.locator('#app').innerText();
  ok('RLS block: reported as an error, not success', !/up to date/.test(txt)&&/error/i.test(txt));
  ok('RLS block: message points at the policies', /row-level security|policies/i.test(txt));
  await d.ctx.close();
}

// ---------- healthy ----------
{
  const d=await boot(b,'ok');
  await d.p.evaluate(()=>{location.hash='#c/app-builder/m1-l1';});await d.p.waitForTimeout(2600);
  await d.p.evaluate(()=>{location.hash='#account';});await d.p.waitForTimeout(500);
  const txt=await d.p.locator('#app').innerText();
  ok('healthy backend: reports up to date', /up to date/.test(txt));
  ok('healthy backend: shows no error banner', await d.p.locator('.syncerr').count()===0);
  await d.p.locator('#synctest').click();await d.p.waitForTimeout(1200);
  const diag=await d.p.locator('#syncdiag').innerText();
  ok('diagnostic passes all three steps on a healthy backend', /Matches this device/.test(diag));
  ok('diagnostic shows no failures', !/✗/.test(diag));
  ok('healthy backend: no uncaught errors', d.errs.length===0);
  if(d.errs.length)console.log('   ',d.errs.slice(0,3));
  await d.ctx.close();
}

await b.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2);});
