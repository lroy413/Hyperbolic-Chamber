/* Paths below are relative to the built site, so the suite always tests what
   would actually ship rather than a stray file in the working directory. */
process.chdir(require('path').resolve(__dirname,'..','dist'));
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve('index.html');

// WCAG contrast
function lum(c){const s=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}
function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
function parseRGB(s){const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return {rgb:[p[0],p[1],p[2]],a:p.length>3?p[3]:1};}

(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const report={screens:{},issues:[]};
for(const theme of ['dark','light']){
  const ctx=await b.newContext({javaScriptEnabled:true,viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto(URL,{waitUntil:'load'});
  await p.evaluate(t=>{var d=new Date().toISOString().slice(0,10);localStorage.setItem('courseapp_v1',JSON.stringify({settings:{theme:t,palette:'aurora',scale:1},gam:{xp:340,goal:30,today:d,todayXP:20,streak:3,done:{},badges:{first:1},tokens:3},progress:{'app-builder':{passed:{m1:true,m2:true},finalPassed:false,lastPage:'m3-l1',name:''},'personal-finance':{passed:{m1:true,m2:true,m3:true,m4:true,m5:true,m6:true,m7:true,m8:true,m9:true},finalPassed:true,finalPct:91,finalDate:'2026-07-01'}},recent:{courseId:'app-builder',page:'m3-l1'},review:{'app-builder:m1:0':{c:'app-builder',k:'m1',i:0,box:1,due:'2020-01-01'}},bookmarks:[],notes:{},marks:{},assignments:{}}));},theme);
  await p.reload({waitUntil:'load'});await p.waitForTimeout(300);

  const screens=[['home',''],['library','#library'],['store','#library/store'],['track','#track/web'],['course','#c/app-builder'],['lesson','#c/app-builder/m1-l1'],['settings','#settings'],['review','#review'],['transcript','#transcript'],['design','#design'],['module','#m/app-builder/4'],['glossary','#c/app-builder/glossary'],['path','#design']];
  for(const [name,hash] of screens){
    await p.evaluate(hh=>{location.hash=hh;},hash);await p.waitForTimeout(320);
    const data=await p.evaluate(()=>{
      const out={h:document.documentElement.scrollHeight,vw:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,small:[],taps:[],text:[]};
      // tap targets: interactive elements
      document.querySelectorAll('a,button,input,summary,label.opt,.chip,.libtab,.collhead,.navitem').forEach(el=>{
        const r=el.getBoundingClientRect();if(r.width===0||r.height===0)return;
        const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return;
        if(r.height<40||r.width<40){out.taps.push({t:(el.textContent||el.getAttribute('aria-label')||el.tagName).trim().slice(0,28),w:Math.round(r.width),h:Math.round(r.height),cls:String(el.className).slice(0,24)});}
      });
      // text: font size + colors for contrast
      document.querySelectorAll('p,span,div,a,b,small,h1,h2,h3,h4,li,td,th,button,summary').forEach(el=>{
        if(!el.childNodes.length)return;
        let hasText=false;el.childNodes.forEach(n=>{if(n.nodeType===3&&n.nodeValue.trim().length>1)hasText=true;});
        if(!hasText)return;
        const cs=getComputedStyle(el);const fs=parseFloat(cs.fontSize);
        if(fs<11.5)out.small.push({t:el.textContent.trim().slice(0,26),fs:Math.round(fs*10)/10});
        // find effective background
        let bgEl=el,bg=null;
        for(let i=0;i<8&&bgEl;i++){const c=getComputedStyle(bgEl).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)){bg=c;break;}bgEl=bgEl.parentElement;}
        out.text.push({t:el.textContent.trim().slice(0,26),fg:cs.color,bg:bg||getComputedStyle(document.body).backgroundColor,fs:Math.round(fs*10)/10,w:cs.fontWeight});
      });
      return out;
    });
    const key=theme+'/'+name;
    // contrast analysis
    const bad=[];
    const seen=new Set();
    data.text.forEach(t=>{
      const f=parseRGB(t.fg),g=parseRGB(t.bg);
      if(!f||!g||f.a<0.5)return;
      const r=ratio(f.rgb,g.rgb);
      const large=(t.fs>=18.66&&+t.w>=700)||t.fs>=24;
      const need=large?3:4.5;
      if(r<need){const k=t.t+'|'+Math.round(r*10);if(seen.has(k))return;seen.add(k);bad.push({t:t.t,ratio:Math.round(r*100)/100,need,fs:t.fs});}
    });
    report.screens[key]={scrollH:data.h,screens:Math.round(data.h/844*10)/10,overflow:data.overflow,smallText:data.small.length,tinyTaps:data.taps.length,lowContrast:bad.length};
    if(data.overflow)report.issues.push(key+': horizontal overflow');
    data.taps.slice(0,6).forEach(t=>report.issues.push(key+': small tap target "'+t.t+'" '+t.w+'x'+t.h+' ('+t.cls+')'));
    data.small.slice(0,4).forEach(t=>report.issues.push(key+': tiny text '+t.fs+'px "'+t.t+'"'));
    bad.slice(0,6).forEach(t=>report.issues.push(key+': low contrast '+t.ratio+':1 (need '+t.need+') "'+t.t+'"'));
  }
  if(errs.length)report.issues.push(theme+': console errors '+JSON.stringify(errs.slice(0,3)));
  await ctx.close();
}
console.log('=== SCREEN METRICS (scroll height in viewports) ===');
Object.entries(report.screens).forEach(([k,v])=>console.log(k.padEnd(18), 'scroll:'+String(v.screens).padStart(4)+'vh', 'overflow:'+(v.overflow?'YES':'no'), 'tinyTaps:'+v.tinyTaps, 'smallText:'+v.smallText, 'lowContrast:'+v.lowContrast));
console.log('\n=== ISSUES ('+report.issues.length+') ===');
report.issues.forEach(i=>console.log(' - '+i));
await b.close();
})();
