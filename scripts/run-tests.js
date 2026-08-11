/* Runs every suite in tests/ in order and reports one total.
   node scripts/run-tests.js            everything
   node scripts/run-tests.js 40 42      just those
   Each suite exits non-zero on failure, so CI gates on this one command. */
const {execFileSync}=require('child_process');
const fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..','tests');
const pick=process.argv.slice(2);
const files=fs.readdirSync(DIR)
  .filter(f=>/^test.*\.js$/.test(f))
  .sort((a,b)=>{
    const n=s=>{const m=/(\d+)/.exec(s);return m?parseInt(m[1],10):999;};
    return n(a)-n(b)||a.localeCompare(b);
  })
  .filter(f=>!pick.length||pick.some(p=>f.includes(p)));
let total=0,failed=[];
for(const f of files){
  let out='';
  try{out=execFileSync('node',[path.join(DIR,f)],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}
  catch(e){out=(e.stdout||'')+(e.stderr||'');failed.push(f);}
  const m=/(\d+) passed, (\d+) failed/.exec(out);
  if(m){
    total+=parseInt(m[1],10);
    if(parseInt(m[2],10)>0&&!failed.includes(f))failed.push(f);
    console.log(f.padEnd(14)+m[0]);
    if(parseInt(m[2],10)>0)out.split('\n').filter(l=>/FAIL/.test(l)).forEach(l=>console.log('    '+l.trim()));
  }else{
    if(!failed.includes(f))failed.push(f);
    console.log(f.padEnd(14)+'NO RESULT');
    /* A suite that dies mid-run reports through this branch, and it is usually
       the only record you get — a CI failure you cannot reproduce locally is
       diagnosed from these lines or not at all. The tail alone was not enough:
       a Playwright timeout names the selector it was waiting for in its FIRST
       line and spends the rest on retry noise, so the tail printed 58 identical
       "retrying click action" entries and cut off the one fact worth having.
       Print the head as well, and the last assertion that did pass — that is
       where the suite actually got to. */
    const lines=out.split('\n');
    const lastPass=lines.filter(l=>/^\s*(PASS|--)/.test(l)).slice(-3);
    if(lastPass.length){console.log('    ...got as far as:');lastPass.forEach(l=>console.log('    '+l.trim()));}
    console.log('    --- first 20 lines of the failure ---');
    console.log(lines.filter(l=>!/^\s*PASS/.test(l)).slice(0,20).map(l=>'    '+l).join('\n'));
    console.log('    --- last 8 ---');
    console.log(lines.slice(-8).map(l=>'    '+l).join('\n'));
  }
}
console.log('\n'+total+' checks passed'+(failed.length?', suites failed: '+failed.join(' '):', nothing failed'));
process.exit(failed.length?1:0);
