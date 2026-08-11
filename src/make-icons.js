/* Rasterise the app icons from the one vector mark.

   A PWA needs real PNG files at fixed sizes, and two different shapes: a plain
   icon that platforms round themselves, and a maskable one that must fill its
   square edge to edge because Android crops it to whatever shape it likes. Both
   come from logo_vector.svg here rather than being drawn once and forgotten, so
   the icon can never drift away from the mark in the app. */
const fs=require('fs');
const {chromium}=require('playwright');

const path=require('path');
const OUT=path.resolve(__dirname,'..','dist','icons');
const SVG=fs.readFileSync(path.join(__dirname,'brand','logo_vector.svg'),'utf8').trim();
const CREAM='#f3efe2';

/* any: the mark on a rounded cream tile, inset like an app icon.
   maskable: the same mark, smaller, on a square that bleeds to every edge —
   Android's safe zone is the middle 80%, so the art sits inside 60% of the box. */
function page(size,maskable){
  const pad=maskable?Math.round(size*0.21):Math.round(size*0.16);
  const radius=maskable?0:Math.round(size*0.22);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:transparent}
  .t{width:${size}px;height:${size}px;background:${CREAM};border-radius:${radius}px;
     display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:${pad}px}
  svg{width:100%;height:100%;display:block}
  </style></head><body><div class="t">${SVG}</div></body></html>`;
}

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const out=[];
  for(const [size,maskable,name] of [
    [192,false,'icon-192.png'],
    [512,false,'icon-512.png'],
    [512,true ,'icon-maskable-512.png'],
    [180,false,'apple-touch-icon.png']]){
    const ctx=await b.newContext({viewport:{width:size,height:size},deviceScaleFactor:1});
    const p=await ctx.newPage();
    await p.setContent(page(size,maskable),{waitUntil:'load'});
    await p.screenshot({path:path.join(OUT,name),omitBackground:true});
    out.push(name+' '+size+(maskable?' maskable':''));
    await ctx.close();
  }
  await b.close();
  console.log(out.join('\n'));
})();
