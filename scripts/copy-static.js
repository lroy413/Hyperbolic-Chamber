/* Everything in static/ ships as-is: the headers file, and anything else that is
   authored rather than generated. Kept as a step so `dist/` can be deleted at
   any time and rebuilt from nothing. */
const fs=require('fs'),path=require('path');
const SRC=path.resolve(__dirname,'..','static');
const DIST=path.resolve(__dirname,'..','dist');
function copy(from,to){
  fs.mkdirSync(to,{recursive:true});
  for(const e of fs.readdirSync(from,{withFileTypes:true})){
    const a=path.join(from,e.name),b=path.join(to,e.name);
    if(e.isDirectory())copy(a,b); else fs.copyFileSync(a,b);
  }
}
if(fs.existsSync(SRC)){copy(SRC,DIST);console.log('copied static/ into dist/');}
