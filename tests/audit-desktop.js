/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');
const fs=require('fs');
const URL='file://'+path.resolve('index.html');
const FULLCAT=fs.readdirSync('catalog').filter(f=>/\.json$/.test(f)&&f!=='index.json').map(f=>JSON.parse(fs.readFileSync('catalog/'+f,'utf8')));

function lum(c){const s=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}
function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
function parseRGB(s){const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return {rgb:[p[0],p[1],p[2]],a:p.length>3?p[3]:1};}

const VIEWPORTS=[
  {name:'laptop', w:1280, h:800},
  {name:'desktop', w:1440, h:900},
  {name:'wide',    w:1728, h:1000},
];
const SHOT = process.argv.includes('--shots');

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const issues=[];const rows=[];
for(const vp of VIEWPORTS){
 for(const theme of ['dark','light']){
  const ctx=await b.newContext({javaScriptEnabled:true,viewport:{width:vp.w,height:vp.h},deviceScaleFactor:1});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto(URL,{waitUntil:'load'});
  await p.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);
  await p.evaluate(([t,cs])=>{var d=new Date().toISOString().slice(0,10);localStorage.setItem('courseapp_v1',JSON.stringify({imported:JSON.parse(JSON.stringify(cs)),settings:{theme:t,palette:'aurora',scale:1},gam:{xp:340,goal:30,today:d,todayXP:20,streak:3,done:{},badges:{first:1},tokens:3},progress:{'app-builder':{passed:{m1:true,m2:true},finalPassed:false,lastPage:'m3-l1',name:''},'personal-finance':{passed:{m1:true,m2:true,m3:true,m4:true,m5:true,m6:true,m7:true,m8:true,m9:true},finalPassed:true,finalPct:91,finalDate:'2026-07-01'}},recent:{courseId:'app-builder',page:'m3-l1'},review:{'app-builder:m1:0':{c:'app-builder',k:'m1',i:0,box:1,due:'2020-01-01'}},bookmarks:[],notes:{},marks:{},assignments:{}}));},[theme,FULLCAT]);
  await p.reload({waitUntil:'load'});
  await p.evaluate(cs=>{window.STORE_CATALOG=cs;},FULLCAT);
  await p.waitForTimeout(350);

  const screens=[['home',''],['library','#library'],['store','#library/store'],['track','#track/web'],['course','#c/app-builder'],['lesson','#c/app-builder/m1-l1'],['quiz','#c/app-builder/m1-quiz'],['settings','#settings'],['review','#review'],['transcript','#transcript'],['design','#design'],['module','#m/app-builder/4'],['glossary','#c/app-builder/glossary'],['path','#design'],['badges','#badges']];
  for(const [name,hash] of screens){
    await p.evaluate(hh=>{location.hash=hh;},hash);await p.waitForTimeout(340);
    const data=await p.evaluate(()=>{
      const out={h:document.documentElement.scrollHeight,vw:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,measure:[],gutter:0,contentW:0,wide:[],text:[]};
      const wrap=document.querySelector('.wrap');
      if(wrap){const r=wrap.getBoundingClientRect();out.contentW=Math.round(r.width);out.gutter=Math.round(r.left);}
      // reading measure: characters per line for body paragraphs
      document.querySelectorAll('.lesson p, .tkabouttxt, .sub, .cc-body, p.p').forEach(el=>{
        const t=(el.textContent||'').trim();if(t.length<80)return;
        const cs=getComputedStyle(el);const w=el.getBoundingClientRect().width;
        const ch=w/(parseFloat(cs.fontSize)*0.5);
        if(ch>95)out.measure.push({ch:Math.round(ch),t:t.slice(0,32)});
      });
      // elements far wider than needed (single-column stretch)
      document.querySelectorAll('.statrow,.homegrid,.trackrows,.careergrid,.setcard,.libcard,.reviewcard,.streakcard').forEach(el=>{
        const cs=getComputedStyle(el);
        if(cs.display==='flex'&&cs.flexDirection==='column')out.wide.push({cls:String(el.className).split(' ')[0],w:Math.round(el.getBoundingClientRect().width)});
      });
      document.querySelectorAll('p,span,div,a,b,small,h1,h2,h3,h4,li,td,th,button,summary').forEach(el=>{
        if(!el.childNodes.length)return;let hasText=false;
        el.childNodes.forEach(n=>{if(n.nodeType===3&&n.nodeValue.trim().length>1)hasText=true;});
        if(!hasText)return;
        const cs=getComputedStyle(el);const fs=parseFloat(cs.fontSize);
        // composite stacked semi-transparent backgrounds up to the first opaque one
        const layers=[];let bgEl=el;
        for(let i=0;i<12&&bgEl;i++){
          const c=getComputedStyle(bgEl).backgroundColor;
          const m=c&&c.match(/rgba?\(([^)]+)\)/);
          if(m){const q=m[1].split(',').map(parseFloat);const a=q.length>3?q[3]:1;
            if(a>0.004){layers.push([q[0],q[1],q[2],a]);if(a>=0.999)break;}}
          bgEl=bgEl.parentElement;
        }
        if(!layers.length||layers[layers.length-1][3]<0.999){const q=getComputedStyle(document.body).backgroundColor.match(/rgba?\(([^)]+)\)/);if(q)layers.push(q[1].split(',').map(parseFloat).slice(0,3).concat([1]));}
        let comp=layers.length?layers[layers.length-1].slice(0,3):[0,0,0];
        for(let i=layers.length-2;i>=0;i--){const l=layers[i];comp=[0,1,2].map(k=>l[k]*l[3]+comp[k]*(1-l[3]));}
        out.text.push({t:el.textContent.trim().slice(0,26),fg:cs.color,bg:'rgb('+comp.map(Math.round).join(', ')+')',fs:Math.round(fs*10)/10,w:cs.fontWeight});
      });
      return out;
    });
    const key=vp.name+'/'+theme+'/'+name;
    const bad=[];const seen=new Set();
    data.text.forEach(t=>{
      const f=parseRGB(t.fg),g=parseRGB(t.bg);if(!f||!g||f.a<0.5)return;
      const r=ratio(f.rgb,g.rgb);const large=(t.fs>=18.66&&+t.w>=700)||t.fs>=24;const need=large?3:4.5;
      if(r<need){const k=t.t+'|'+Math.round(r*10);if(seen.has(k))return;seen.add(k);bad.push({t:t.t,ratio:Math.round(r*100)/100,need});}
    });
    rows.push({key,gutter:data.gutter,contentW:data.contentW,used:Math.round(data.contentW/vp.w*100),longLines:data.measure.length,stretched:data.wide.length,lowContrast:bad.length,overflow:data.overflow});
    if(data.overflow)issues.push(key+': horizontal overflow');
    data.measure.slice(0,2).forEach(m=>issues.push(key+': line length '+m.ch+'ch (>95) "'+m.t+'"'));
    bad.slice(0,4).forEach(t=>issues.push(key+': low contrast '+t.ratio+':1 "'+t.t+'"'));
    if(SHOT&&vp.name==='desktop'){await p.screenshot({path:'dt_'+theme+'_'+name+'.png',fullPage:false});}
  }
  if(errs.length)issues.push(vp.name+'/'+theme+': console errors '+JSON.stringify(errs.slice(0,3)));
  await ctx.close();
 }
}
console.log('key'.padEnd(30),'gutter'.padStart(7),'content'.padStart(8),'used'.padStart(6),'longLn'.padStart(7),'stretch'.padStart(8),'contrast'.padStart(9));
rows.forEach(r=>console.log(r.key.padEnd(30),String(r.gutter).padStart(7),String(r.contentW).padStart(8),(r.used+'%').padStart(6),String(r.longLines).padStart(7),String(r.stretched).padStart(8),String(r.lowContrast).padStart(9)));
console.log('\n=== ISSUES ('+issues.length+') ===');
issues.forEach(i=>console.log(' - '+i));
await b.close();
})();
