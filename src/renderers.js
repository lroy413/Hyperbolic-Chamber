





(function(){
var R={};
R.staticMode=false;
R._kc=0; R._tab=0;
R.resetSeq=function(){R._kc=0;R._tab=0;R._rub=0;R._cmp=0;};
R.esc=function(s){return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
// rich(): safe inline HTML for question text / explanations. Escapes everything,
// then restores only a whitelist of inline tags. Any other tag an author wrote
// literally (e.g. talking about <header> or <input>) shows as text, never breaks layout.
R.rich=function(s){
  // pull <math> blocks out before escaping so MathML survives verbatim
  var maths=[];
  s=(''+s).replace(/<math[\s\S]*?<\/math>/gi,function(m){maths.push(m);return '\u0000M'+(maths.length-1)+'\u0000';});
  var e=R.esc(s);
  e=e.replace(/\u0000M(\d+)\u0000/g,function(_,i){return maths[+i];});
  e=e.replace(/&lt;(\/?)(b|strong|em|i|code|u|sub|sup|mark)&gt;/gi,'<$1$2>');
  e=e.replace(/&lt;span class=&quot;(term|qn)&quot;&gt;/gi,'<span class="$1">');
  e=e.replace(/&lt;span class="(term|qn)"&gt;/gi,'<span class="$1">');
  // restore </span> only for the spans we opened above
  e=e.replace(/&lt;\/span&gt;/gi,'</span>');
  e=e.replace(/&lt;br\s*\/?&gt;/gi,'<br>');
  return e;
};

// ---- question helpers (types + randomization) ----
R.shuffle=function(arr){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;};
R.range=function(n){var a=[];for(var i=0;i<n;i++)a.push(i);return a;};
R.qType=function(q){var t=q.type||'single';if(t==='tf')return 'single';return t;};
R.multiAnswers=function(q){var a=(q.answers!=null)?q.answers:q.answer;if(!Array.isArray(a))a=[a];return a.map(Number);};
R.normText=function(s){return (''+s).toLowerCase().replace(/\s+/g,' ').trim().replace(/[.!?,;:]+$/,'');};
R.textMatch=function(q,val){var acc=q.accept||(q.answer!=null?[q.answer]:[]);for(var i=0;i<acc.length;i++)if(R.normText(acc[i])===R.normText(val))return true;return false;};
R.answerDisplay=function(q){var t=R.qType(q);
  if(t==='multi'){return R.multiAnswers(q).map(function(i){return q.options[i];}).join(', ');}
  if(t==='text'){var acc=q.accept||[q.answer];return acc[0];}
  if(t==='numeric'){return q.answer+(q.unit?' '+q.unit:'');}
  if(t==='order'){return (q.items||[]).join('  \u2192  ');}
  if(t==='match'){return (q.pairs||[]).map(function(p){return p[0]+' \u2194 '+p[1];}).join('; ');}
  if(t==='free'){return q.model||'';}
  return q.options[q.answer];};
R.diffLabel=function(d){return d>=3?'Challenge':d===2?'Core':'Intro';};
function optHTML(name,text,correct,explainCorrect,correctText,why){
  var w=why?' '+R.rich(why):'';
  var vd = correct
    ? '<span class="vd correct">&#10003; Correct.'+w+' '+R.rich(explainCorrect)+'</span>'
    : '<span class="vd wrong">&#10007; Not quite.'+w+' The correct answer is: <em>'+R.esc(correctText)+'</em>. '+R.rich(explainCorrect)+'</span>';
  return '<label class="opt '+(correct?'isc':'isw')+'"><input type="radio" name="'+name+'" data-correct="'+(correct?'1':'0')+'"><span class="box"></span><span class="ot">'+R.esc(text)+'</span>'+vd+'</label>';
}
R.renderKcheck=function(b){
  var name='kc'+(R._kc++);
  var h='<div class="kcheck"><div class="qhead">Knowledge check</div><p class="qtext">'+R.rich(b.q)+'</p><div class="opts">';
  for(var i=0;i<b.options.length;i++){var correct=(i===b.answer);h+='<label class="opt '+(correct?'isc':'isw')+'"><input type="radio" name="'+name+'" data-kc="1"><span class="box"></span><span class="ot">'+R.esc(b.options[i])+'</span>'+(correct?'<span class="vd correct">&#10003; Correct. '+R.rich(b.explain)+'</span>':'<span class="vd wrong">&#10007; Not quite. The correct answer is: <em>'+R.esc(b.options[b.answer])+'</em>. '+R.rich(b.explain)+'</span>')+'</label>';}
  h+='</div><p class="kctip">Tap an answer to check it — instant feedback, nothing graded.</p></div>';
  return h;
};
R.renderExplorer=function(b){
  var h='<div class="vis"><div class="vistitle">'+(b.title||'Explore — tap each')+'</div><div class="blockmap">';
  for(var i=0;i<b.items.length;i++){var it=b.items[i];h+='<details class="card2"><summary><span class="dot" style="background:'+(it.color||'#5b8cff')+'"></span>'+it.label+'</summary><div class="body2">'+it.html+'</div></details>';if(i<b.items.length-1)h+='<span class="bm-arrow">&#8646;</span>';}
  h+='</div>'+(b.caption?'<p class="viscap">'+b.caption+'</p>':'')+'</div>';return h;
};
R.renderStepper=function(b){
  var h='<div class="vis"><div class="vistitle">'+(b.title||'Step by step')+'</div><div class="stepper">';
  for(var i=0;i<b.steps.length;i++){var last=i===b.steps.length-1;h+='<div class="steprow"><div class="stepcol"><div class="stepnum">'+(i+1)+'</div>'+(last?'':'<div class="stepconn"></div>')+'</div><div class="steptext"><b>'+b.steps[i][0]+'</b><span>'+b.steps[i][1]+'</span></div></div>';}
  h+='</div></div>';return h;
};
R.renderFlip=function(b){
  var h='<div class="vis"><div class="vistitle">'+(b.title||'Tap to reveal')+'</div><div class="flipgrid'+(b.two?' two':'')+'">';
  for(var i=0;i<b.cards.length;i++){var c=b.cards[i];h+='<details class="card2"><summary><span class="dot" style="background:'+(c.color||'#5b8cff')+'"></span>'+c.label+'</summary><div class="body2">'+c.html+'</div></details>';}
  h+='</div></div>';return h;
};
R.renderTabs=function(b){
  if(R.staticMode){
    var s='<div class="vis"><div class="vistitle">'+(b.title||'Compare')+'</div>';
    for(var i=0;i<b.tabs.length;i++){s+='<div class="stacktab"><div class="stlabel">'+b.tabs[i].label+'</div><div class="stbody">'+b.tabs[i].html+'</div></div>';}
    return s+'</div>';
  }
  var name='tb'+(R._tab++);var h='<div class="vis"><div class="vistitle">'+(b.title||'Compare — tap a tab')+'</div><div class="ctabs jstabs">';
  var labels='<div class="tablabels">';var panels='<div class="tabpanels">';
  for(var j=0;j<b.tabs.length;j++){labels+='<label class="jstab'+(j===0?' active':'')+'" data-tab="'+name+'-'+j+'">'+b.tabs[j].label+'</label>';panels+='<div class="tp jstp'+(j===0?' show':'')+'" id="'+name+'-'+j+'">'+b.tabs[j].html+'</div>';}
  labels+='</div>';panels+='</div>';h+=labels+panels+'</div></div>';return h;
};
R.renderTable=function(b){
  var h='<table><tr>';for(var i=0;i<b.head.length;i++)h+='<th>'+b.head[i]+'</th>';h+='</tr>';
  for(var r=0;r<b.rows.length;r++){h+='<tr>';for(var c=0;c<b.rows[r].length;c++)h+='<td>'+b.rows[r][c]+'</td>';h+='</tr>';}
  return h+'</table>';
};
R.renderChart=function(b){
  var candles=b.candles||[];var vols=b.volumes||null;var ann=b.annotations||[];
  var H=b.height||230;var W=Math.max(300,40+candles.length*30+30);
  var lo=Infinity,hi=-Infinity;
  candles.forEach(function(c){lo=Math.min(lo,c[2]);hi=Math.max(hi,c[1]);});
  ann.forEach(function(a){if(a.price!=null){lo=Math.min(lo,a.price);hi=Math.max(hi,a.price);}if(a.from&&a.from.length===2){lo=Math.min(lo,a.from[1]);hi=Math.max(hi,a.from[1]);}if(a.to&&a.to.length===2){lo=Math.min(lo,a.to[1]);hi=Math.max(hi,a.to[1]);}if(a.y1!=null){lo=Math.min(lo,a.y1,a.y2);hi=Math.max(hi,a.y1,a.y2);}});
  var pad=(hi-lo)*0.12||1;lo-=pad;hi+=pad;
  var L=44,Rt=64,T=14;var volH=vols?Math.round(H*0.22):0;var B=18;
  var plotB=H-B-volH;var plotH=plotB-T;
  var n=candles.length;var step=(W-L-Rt)/Math.max(n,1);var bw=Math.min(18,step*0.6);
  function y(p){return T+(hi-p)/(hi-lo)*plotH;}
  function cx(i){return L+i*step+step/2;}
  var svg='<svg viewBox="0 0 '+W+' '+H+'" class="chart" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto">';
  var lines=4;
  for(var g=0;g<=lines;g++){var pv=hi-(hi-lo)*g/lines;var yy=y(pv);svg+='<line x1="'+L+'" y1="'+yy.toFixed(1)+'" x2="'+(W-Rt)+'" y2="'+yy.toFixed(1)+'" class="cgrid"/>';svg+='<text x="'+(L-6)+'" y="'+(yy+3).toFixed(1)+'" class="clabel" text-anchor="end">'+pv.toFixed(1)+'</text>';}
  ann.forEach(function(a){if(a.type==='zone'){var yA=y(Math.max(a.y1,a.y2)),yB=y(Math.min(a.y1,a.y2));svg+='<rect x="'+L+'" y="'+yA.toFixed(1)+'" width="'+(W-L-Rt)+'" height="'+(yB-yA).toFixed(1)+'" fill="'+(a.color||'#5b8cff')+'" opacity="0.10"/>';if(a.label)svg+='<text x="'+(W-Rt+4)+'" y="'+((yA+yB)/2+3).toFixed(1)+'" class="cann" fill="'+(a.color||'#5b8cff')+'">'+a.label+'</text>';}});
  ann.forEach(function(a){if(a.type==='ma'){var p=a.period||3;var pts='';for(var i=0;i<n;i++){if(i<p-1)continue;var sum=0;for(var j=0;j<p;j++)sum+=candles[i-j][3];var avg=sum/p;pts+=cx(i).toFixed(1)+','+y(avg).toFixed(1)+' ';}svg+='<polyline points="'+pts.trim()+'" fill="none" stroke="'+(a.color||'#5b8cff')+'" stroke-width="2" opacity="0.9"/>';if(a.label)svg+='<text x="'+(W-Rt+4)+'" y="'+(y(candles[n-1][3])+3).toFixed(1)+'" class="cann" fill="'+(a.color||'#5b8cff')+'">'+a.label+'</text>';}});
  for(var i=0;i<n;i++){var o=candles[i][0],h=candles[i][1],l=candles[i][2],cl=candles[i][3];var up=cl>=o;var col=up?'#31c48d':'#f2687f';var X=cx(i);
    svg+='<line x1="'+X.toFixed(1)+'" y1="'+y(h).toFixed(1)+'" x2="'+X.toFixed(1)+'" y2="'+y(l).toFixed(1)+'" stroke="'+col+'" stroke-width="1.5"/>';
    var yO=y(o),yC=y(cl);var top=Math.min(yO,yC),bh=Math.max(2,Math.abs(yC-yO));
    svg+='<rect x="'+(X-bw/2).toFixed(1)+'" y="'+top.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+col+'" rx="1"/>';}
  ann.forEach(function(a){if(a.type==='hline'){var yy=y(a.price);svg+='<line x1="'+L+'" y1="'+yy.toFixed(1)+'" x2="'+(W-Rt)+'" y2="'+yy.toFixed(1)+'" stroke="'+(a.color||'#98a1b2')+'" stroke-width="1.4" stroke-dasharray="5 4"/>';if(a.label)svg+='<text x="'+(W-Rt+4)+'" y="'+(yy+3).toFixed(1)+'" class="cann" fill="'+(a.color||'#98a1b2')+'">'+a.label+'</text>';}});
  ann.forEach(function(a){if(a.type==='trend'){var x1=cx(a.from[0]),y1=y(a.from[1]),x2=cx(a.to[0]),y2=y(a.to[1]);svg+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(a.color||'#98a1b2')+'" stroke-width="1.6" stroke-dasharray="4 3"/>';if(a.label)svg+='<text x="'+(x2+4).toFixed(1)+'" y="'+(y2-4).toFixed(1)+'" class="cann" fill="'+(a.color||'#98a1b2')+'">'+a.label+'</text>';}});
  ann.forEach(function(a){if(a.type==='mark'){var c=candles[a.index];var pv=a.at==='high'?c[1]:a.at==='low'?c[2]:a.at==='open'?c[0]:c[3];var X=cx(a.index);var yy=y(pv);var above=(a.at==='high'||a.at==='open');var ly=above?yy-8:yy+14;svg+='<circle cx="'+X.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="3.2" fill="'+(a.color||'#98a1b2')+'"/>';svg+='<text x="'+X.toFixed(1)+'" y="'+ly.toFixed(1)+'" class="cann" fill="'+(a.color||'#98a1b2')+'" text-anchor="middle">'+a.label+'</text>';}});
  if(vols){var vmax=Math.max.apply(null,vols);var vB=H-B;for(var i2=0;i2<n;i2++){var vh=(vols[i2]/vmax)*(volH-4);var up2=candles[i2][3]>=candles[i2][0];svg+='<rect x="'+(cx(i2)-bw/2).toFixed(1)+'" y="'+(vB-vh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+vh.toFixed(1)+'" fill="'+(up2?'#31c48d':'#f2687f')+'" opacity="0.45"/>';}svg+='<text x="'+(L-6)+'" y="'+(vB-2).toFixed(1)+'" class="clabel" text-anchor="end">Vol</text>';}
  svg+='</svg>';
  return '<div class="vis chartwrap zoomfig"><div class="vistitle">'+(b.title||'Chart')+'</div>'+svg+R.zoomBtn+(b.caption?'<p class="viscap">'+b.caption+'</p>':'')+'</div>';
};
R._cmp=0;
R.isPH=function(s){return !s||s==='PLACEHOLDER'||/^REPLACE/i.test(s);};
R.phBox=function(label,icon){return '<div class="mediaph"><span class="mphico">'+(icon||'&#128247;')+'</span><span class="mphtxt">'+R.esc(label||'Visual to be added')+'</span></div>';};
/* Every diagram in the catalogue is an inline SVG, and the old lightbox only
   ever fired on <img>, so no figure in any course was ever tappable. The
   expand control below is the affordance; engine.js opens the viewer. */
R.zoomBtn='<button class="figzoom" type="button" data-zoom aria-label="View this diagram full screen">'
  +'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">'
  +'<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>';
R.renderImage=function(b){
  var cls='figblock zoomfig'+(b.wide?' wide':'');
  var cap=b.caption?'<figcaption class="viscap">'+R.rich(b.caption)+'</figcaption>':'';
  var media;
  if(b.svg){media='<div class="figsvg"'+(b.accent?' style="--fig:'+R.esc(b.accent)+'"':'')+'>'+b.svg+'</div>';}
  else if(R.isPH(b.src)){media=R.phBox(b.alt||b.caption||'Image','&#128247;');}
  else{media='<img class="figimg" src="'+R.esc(b.src)+'" alt="'+R.esc(b.alt||b.caption||'')+'" loading="lazy">';}
  return '<figure class="'+cls+'">'+media+R.zoomBtn+cap+'</figure>';
};
R.renderVideo=function(b){
  var inner;
  if(R.isPH(b.id)&&R.isPH(b.src)){var cap0=b.caption?'<figcaption class="viscap">'+R.rich(b.caption)+'</figcaption>':'';return '<figure class="videoblock">'+R.phBox((b.caption||'Video clip'),'&#9654;&#65039;')+cap0+'</figure>';}
  if(b.provider==='youtube'){inner='<iframe src="https://www.youtube-nocookie.com/embed/'+R.esc(b.id)+'" title="'+R.esc(b.title||'Video')+'" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe>';}
  else if(b.provider==='vimeo'){inner='<iframe src="https://player.vimeo.com/video/'+R.esc(b.id)+'" title="'+R.esc(b.title||'Video')+'" frameborder="0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen loading="lazy"></iframe>';}
  else {inner='<video controls preload="metadata" src="'+R.esc(b.src)+'"'+(b.poster?' poster="'+R.esc(b.poster)+'"':'')+'></video>';}
  var cap=b.caption?'<figcaption class="viscap">'+R.rich(b.caption)+'</figcaption>':'';
  return '<figure class="videoblock"><div class="videoframe">'+inner+'</div>'+cap+'</figure>';
};
R.renderCompare=function(b){
  R._cmp++;
  var before=b.before||{}, after=b.after||{};
  var start=(b.start!=null?b.start:50);
  var ratio=b.ratio||'16/9';
  var cap=b.caption?'<figcaption class="viscap">'+R.rich(b.caption)+'</figcaption>':'';
  if(R.isPH(before.src)||R.isPH(after.src)){
    return '<figure class="compareblock"><div class="cmpph" style="aspect-ratio:'+ratio+'"><div class="cmpphside"><span class="cmplabel l">'+R.esc(before.label||'Before')+'</span></div><div class="cmpphside"><span class="cmplabel r">'+R.esc(after.label||'After')+'</span></div><span class="mphico">&#128253;</span></div>'+cap+'</figure>';
  }
  return '<figure class="compareblock">'
    +'<div class="cmpwrap" style="--cmp:'+start+'%;aspect-ratio:'+ratio+'">'
      +'<img class="cmpimg cmpbase" src="'+R.esc(after.src)+'" alt="'+R.esc(after.label||'After')+'">'
      +'<img class="cmpimg cmptop" src="'+R.esc(before.src)+'" alt="'+R.esc(before.label||'Before')+'">'
      +'<div class="cmpdivider"><span class="cmpknob"></span></div>'
      +(before.label?'<span class="cmplabel l">'+R.esc(before.label)+'</span>':'')
      +(after.label?'<span class="cmplabel r">'+R.esc(after.label)+'</span>':'')
      +'<input class="cmprange" type="range" min="0" max="100" value="'+start+'" aria-label="Drag to compare before and after">'
    +'</div>'+cap+'</figure>';
};
R._rub=0;
R.renderAnnotate=function(b){
  var pts=b.points||[];var dots='';
  for(var i=0;i<pts.length;i++){var p=pts[i];dots+='<span class="anpt" style="left:'+(p.x||0)+'%;top:'+(p.y||0)+'%">'+(i+1)+'</span>';}
  var list='<ol class="anlist">';
  for(var j=0;j<pts.length;j++){list+='<li><b>'+R.esc(pts[j].label||'')+'</b> '+(pts[j].html||'')+'</li>';}
  list+='</ol>';
  var cap=b.caption?'<figcaption class="viscap">'+R.rich(b.caption)+'</figcaption>':'';
  var canvas=R.isPH(b.src)?'<div class="anph" style="aspect-ratio:16/9"><span class="mphico">&#128204;</span>'+dots+'</div>':'<img class="figimg" src="'+R.esc(b.src)+'" alt="'+R.esc(b.alt||'')+'" loading="lazy">'+dots;
  return '<figure class="annotateblock zoomfig"><div class="anwrap">'+canvas+'</div>'+R.zoomBtn+list+cap+'</figure>';
};
R.renderResources=function(b){
  var h='<div class="resources"><div class="restitle">'+R.esc(b.title||'Go deeper')+'</div><ul class="reslist">';
  (b.items||[]).forEach(function(it){var label,note;if(Array.isArray(it)){label=it[0];note=it[1];}else{label=(it&&it.label)||'';note=(it&&(it.note||it.html))||'';}h+='<li><b>'+R.esc(label)+'</b>'+(note?' — '+R.rich(note):'')+'</li>';});
  return h+'</ul></div>';
};
R.renderRubric=function(b){
  var idx=R._rub++;var items='';
  (b.items||[]).forEach(function(it){items+='<label class="rbitem"><input type="checkbox"><span class="rbbox"></span><span class="rbtext">'+R.rich(it)+'</span></label>';});
  return '<div class="rubricblock" data-rub="'+idx+'"><div class="rbhead">'+R.esc(b.title||'Assignment')+'</div>'
    +(b.brief?'<p class="rbbrief">'+R.rich(b.brief)+'</p>':'')
    +'<div class="rbitems">'+items+'</div>'
    +'<button class="rbdone" type="button" data-rubdone="'+idx+'">Mark assignment complete</button></div>';
};
R.renderFormula=function(b){
  return '<figure class="formula"'+(b.label?' data-label="'+R.esc(b.label)+'"':'')+'>'+(b.math||'')
    +(b.caption?'<figcaption class="viscap">'+R.rich(b.caption)+'</figcaption>':'')+'</figure>';
};
R.renderBlock=function(b){
  switch(b.t){
    case 'formula':return R.renderFormula(b);
    case 'image':return R.renderImage(b);
    case 'video':return R.renderVideo(b);
    case 'compare':return R.renderCompare(b);
    case 'annotate':return R.renderAnnotate(b);
    case 'resources':return R.renderResources(b);
    case 'rubric':return R.renderRubric(b);
    case 'p':return '<p>'+b.html+'</p>';
    case 'h':return '<h4>'+R.esc(b.text)+'</h4>';
    case 'callout':return '<div class="callout '+(b.kind==='warn'?'warn':'tip')+'"><span class="lbl">'+R.esc(b.label||'')+'</span>'+b.html+'</div>';
    case 'analogy':return '<div class="analogy">'+b.html+'</div>';
    case 'list':var tag=b.ordered?'ol':'ul';var h='<'+tag+'>';b.items.forEach(function(it){h+='<li>'+it+'</li>';});return h+'</'+tag+'>';
    case 'table':return R.renderTable(b);
    case 'kcheck':return R.renderKcheck(b);
    case 'explorer':return R.renderExplorer(b);
    case 'stepper':return R.renderStepper(b);
    case 'flip':return R.renderFlip(b);
    case 'tabs':return R.renderTabs(b);
    case 'chart':return R.renderChart(b);
    case 'code':return R.renderCode(b);
    case 'html':return b.html;
    default:return '';
  }
};
R.renderCode=function(b){
  return '<div class="codewrap">'+(b.lang?'<div class="codelang">'+R.esc(b.lang)+'</div>':'')+'<pre class="code"><code>'+R.esc(b.code)+'</code></pre>'+(b.caption?'<p class="viscap">'+b.caption+'</p>':'')+'</div>';
};
R.renderVocab=function(gloss){
  if(!gloss||!gloss.length)return '';
  var h='<details class="card2 vocabcard" open><summary><span class="dot" style="background:#31c48d"></span>Key vocabulary ('+gloss.length+')</summary><div class="body2"><dl class="gloss">';
  gloss.forEach(function(g){h+='<dt>'+R.esc(g[0])+'</dt><dd>'+R.rich(g[1])+'</dd>';});
  return h+'</dl></div></details>';
};
R.renderRefs=function(refs){
  if(!refs||!refs.length)return '';
  var h='<details class="card2 refcard"><summary><span class="dot" style="background:#5b8cff"></span>Further reading &amp; references ('+refs.length+')</summary><div class="body2"><ul class="refs">';
  refs.forEach(function(r){h+='<li><b>'+R.esc(r[0])+'</b>'+(r[1]?' — '+R.esc(r[1]):'')+'</li>';});
  return h+'</ul></div></details>';
};
R.renderLesson=function(lesson){
  var h;
  if(lesson.blocks){h='<div class="lesson"><h3 class="ltitle">'+R.esc(lesson.title)+'</h3>';lesson.blocks.forEach(function(b){h+=R.renderBlock(b);});h+='</div>';}
  else h=lesson.html||'';
  var extra='';
  if((lesson.glossary&&lesson.glossary.length)||(lesson.references&&lesson.references.length)){
    extra='<div class="lessonextras">'+R.renderVocab(lesson.glossary)+R.renderRefs(lesson.references)+'</div>';
  }
  return h+extra;
};
R.glossTerms=function(course){
  var terms=[],seen={};
  /* A catalogue summary carries `modules` as a count, not an array — this page
     can be reached before the body has hydrated out of IndexedDB. */
  if(!course||!Array.isArray(course.modules))return terms;
  course.modules.forEach(function(m,mi){(m.lessons||[]).forEach(function(l){
    (l.glossary||[]).forEach(function(g){
      var k=String(g[0]).toLowerCase();
      if(seen[k])return;            // the same term defined twice reads as a bug
      seen[k]=1;terms.push({t:g[0],d:g[1],m:mi+1});
    });});});
  terms.sort(function(a,b){
    var x=a.t.toLowerCase(),y=b.t.toLowerCase();
    return x<y?-1:x>y?1:0;});
  return terms;
};
R.glossLetter=function(t){
  var ch=String(t||'').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(ch)?ch:'#';
};
/* 186 terms in one flat list is thirteen screens with no way in. Grouped by
   letter, with the group headings sticky, it is something you can actually use. */
R.courseGlossary=function(course){
  var terms=R.glossTerms(course);
  if(!terms.length)return '<p class="sub">No glossary terms defined for this course yet.</p>';
  var groups=[],cur=null;
  terms.forEach(function(g){
    var L=R.glossLetter(g.t);
    if(!cur||cur.L!==L){cur={L:L,items:[]};groups.push(cur);}
    cur.items.push(g);
  });
  var h='';
  groups.forEach(function(gr){
    h+='<section class="gletter" data-letter="'+gr.L+'" id="gl-'+gr.L.replace('#','hash')+'">'
      +'<h3 class="glh">'+R.esc(gr.L)+'</h3><dl class="gloss biggloss">';
    gr.items.forEach(function(g){
      h+='<div class="gterm" data-term="'+R.esc((g.t+' '+g.d).toLowerCase())+'">'
        +'<dt>'+R.esc(g.t)+' <span class="gmod">Module '+g.m+'</span></dt>'
        +'<dd>'+R.rich(g.d)+'</dd></div>';
    });
    h+='</dl></section>';
  });
  return h;
};
function qBody(name,q){
  var type=R.qType(q);
  if(type==='multi'){
    var ans=R.multiAnswers(q);var h='<div class="opts">';
    R.shuffle(R.range(q.options.length)).forEach(function(oi){var correct=ans.indexOf(oi)>-1;
      h+='<label class="opt mopt"><input type="checkbox" name="'+name+'" data-correct="'+(correct?'1':'0')+'"><span class="box sq"></span><span class="ot">'+R.esc(q.options[oi])+'</span></label>';});
    return h+'</div>';
  }
  if(type==='text'){
    return '<div class="opts"><input type="text" class="qinput" name="'+name+'" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer…"></div>';
  }
  if(type==='numeric'){
    return '<div class="opts numwrap"><input type="text" class="qinput qnum" name="'+name+'" inputmode="decimal" autocomplete="off" placeholder="Your answer\u2026">'
      +(q.unit?'<span class="qunit">'+R.esc(q.unit)+'</span>':'')+'</div>'
      +(q.hint?'<p class="qhint">'+R.rich(q.hint)+'</p>':'');
  }
  if(type==='order'){
    var oh='<div class="ordwrap"><p class="qhint">Tap the steps in the correct order.</p><div class="ordlist">';
    R.shuffle(R.range((q.items||[]).length)).forEach(function(oi){
      oh+='<button type="button" class="orditem" data-oi="'+oi+'"><span class="ordnum"></span><span class="ordtx">'+R.esc(q.items[oi])+'</span></button>';
    });
    return oh+'</div></div>';
  }
  if(type==='match'){
    var pairs=q.pairs||[];
    var mh='<div class="matchwrap"><p class="qhint">Tap one on the left, then its partner on the right.</p><div class="mcols"><div class="mcol">';
    R.range(pairs.length).forEach(function(i){mh+='<button type="button" class="mchl" data-li="'+i+'">'+R.esc(pairs[i][0])+'</button>';});
    mh+='</div><div class="mcol">';
    R.shuffle(R.range(pairs.length)).forEach(function(i){mh+='<button type="button" class="mchr" data-ri="'+i+'">'+R.esc(pairs[i][1])+'</button>';});
    return mh+'</div></div></div>';
  }
  if(type==='free'){
    return '<div class="opts freewrap"><textarea class="qfree" name="'+name+'" rows="5" placeholder="Write your answer\u2026"></textarea>'
      +'<div class="freemodel"><div class="fmhead">Model answer</div><div class="fmbody">'+R.rich(q.model||'')+'</div>'
      +((q.points||[]).length?'<ul class="fmpoints">'+q.points.map(function(p){return '<li>'+R.rich(p)+'</li>';}).join('')+'</ul>':'')
      +'<div class="fmself"><span class="fmq">How did yours compare?</span>'
      +'<button type="button" class="fmbtn" data-self="1">Covered it</button>'
      +'<button type="button" class="fmbtn" data-self="0.5">Partly</button>'
      +'<button type="button" class="fmbtn" data-self="0">Missed it</button></div></div></div>';
  }
  var h2='<div class="opts">';
  R.shuffle(R.range(q.options.length)).forEach(function(oi){h2+=optHTML(name,q.options[oi],oi===q.answer,q.explain,q.options[q.answer],(q.why||[])[oi]);});
  return h2+'</div>';
}
// opts: {shuffle:true(default), pick:N}. Questions keep their ORIGINAL index in data-qi
// so spaced-repetition review keys stay stable no matter how they're shuffled/sampled.
// One quiz item = a standalone question OR a case: {type:'case',stem,qs:[...]}
// Cases shuffle and are drawn as a single unit so the stem stays with its questions.
function qOne(key,q,oi,sub,num,rk){
  var type=R.qType(q);var name=key+'_'+oi+(sub!=null?'_'+sub:'');
  var d=q.difficulty||0;
  var badge=d>=2?' <span class="qdiff d'+d+'">'+R.diffLabel(d)+'</span>':'';
  var tag=type==='multi'?' <span class="qmulti">Select all that apply</span>':(type==='free'?' <span class="qmulti wr">Written</span>':'');
  var h='<div class="q" data-q="'+name+'" data-qi="'+oi+'"'+(sub!=null?' data-sub="'+sub+'"':'')+' data-qtype="'+type+'" data-diff="'+(d||1)+'"'+(rk||'')+'>'
    +'<p class="qtext"><span class="qn">'+num+'.</span> '+R.rich(q.q)+tag+badge+'</p>';
  h+=qBody(name,q);
  return h+'<div class="qexplain"></div></div>';
}
R.renderQuiz=function(questions,key,opts){
  opts=opts||{};
  var order=R.range(questions.length);
  if(opts.pick&&opts.pick<order.length){order=R.shuffle(order).slice(0,opts.pick);}
  else if(opts.shuffle!==false){order=R.shuffle(order);}
  var origins=opts.origins||null;
  // total gradable questions (a case contributes its sub-questions)
  var total=0;order.forEach(function(oi){var q=questions[oi];total+=(R.qType(q)==='case')?((q.qs||[]).length||1):1;});
  var lim=opts.timeLimit||0, pass=opts.pass||0.8;
  var h='<div class="quizwrap" data-quiz="'+key+'" data-count="'+total+'" data-pass="'+pass+'"'+(lim?' data-time="'+lim+'"':'')+'>';
  if(lim)h+='<div class="qtimer" id="qtimer"><span class="qtico">&#9201;</span><span class="qtval">'+lim+':00</span><span class="qtlbl">remaining</span></div>';
  var num=0;
  for(var p=0;p<order.length;p++){var oi=order[p];var q=questions[oi];
    var rk=origins?' data-rk="'+origins[oi]+'"':'';
    if(R.qType(q)==='case'){
      h+='<div class="qcase"><div class="csbadge">Scenario</div><div class="csstem">'+R.rich(q.stem||'')+'</div>';
      (q.qs||[]).forEach(function(sq,si){num++;h+=qOne(key,sq,oi,si,num,rk);});
      h+='</div>';
    } else { num++; h+=qOne(key,q,oi,null,num,rk); }
  }
  h+='<p class="presubmit-note">Answers stay hidden until you press Submit.</p>';
  h+='<div class="quizactions"><button class="submitbtn" type="button">Submit answers</button><button class="retakebtn" type="button" style="display:none">Retake quiz</button></div>';
  h+='<div class="qbanner"></div></div>';
  return h;
};
R.renderQuizInstant=function(questions){
  var h='';for(var i=0;i<questions.length;i++){var q=questions[i];h+=R.renderKcheck({q:'<span class="qn">'+(i+1)+'.</span> '+q.q,options:q.options,answer:q.answer,explain:q.explain});}
  return h;
};
/* ================= state merge (for cross-device sync) =================
   Forward-only, lossless-biased merge of two saved states (local vs remote).
   Progress only ever moves forward, so we take the "further along" value per
   field. Pure function — no DOM — so it can be unit-tested in Node. */
function _num(x){return (typeof x==='number'&&isFinite(x))?x:0;}
function _unionArr(a,b){var out=(a||[]).slice();(b||[]).forEach(function(x){if(out.indexOf(x)<0)out.push(x);});return out;}
function _unionByKey(a,b,k){var out=(a||[]).slice();var seen={};out.forEach(function(x){seen[x[k]]=1;});(b||[]).forEach(function(x){if(!seen[x[k]]){out.push(x);seen[x[k]]=1;}});return out;}
function _unionById(a,b){return _unionByKey(a,b,'id');}
function _countTrue(o){var n=0;if(o)for(var k in o)if(o[k])n++;return n;}
function _mergeProgress(a,b){var out={},ids={};Object.keys(a).forEach(function(k){ids[k]=1;});Object.keys(b).forEach(function(k){ids[k]=1;});
  Object.keys(ids).forEach(function(id){var pa=a[id]||{},pb=b[id]||{};var passed={};[pa.passed,pb.passed].forEach(function(p){if(p)Object.keys(p).forEach(function(m){if(p[m])passed[m]=true;});});
    var lead=_countTrue(pa.passed)>=_countTrue(pb.passed)?pa:pb;
    out[id]={passed:passed,finalPassed:!!(pa.finalPassed||pb.finalPassed),lastPage:lead.lastPage||pa.lastPage||pb.lastPage||'',name:pa.name||pb.name||''};});
  return out;}
function _mergeReview(a,b){var out={},ids={};Object.keys(a).forEach(function(k){ids[k]=1;});Object.keys(b).forEach(function(k){ids[k]=1;});
  Object.keys(ids).forEach(function(k){var ra=a[k],rb=b[k];if(!ra){out[k]=rb;return;}if(!rb){out[k]=ra;return;}var ba=ra.box||1,bb=rb.box||1;
    if(ba>bb)out[k]=ra;else if(bb>ba)out[k]=rb;else out[k]=((ra.due||'')>=(rb.due||''))?ra:rb;});
  return out;}
function _mergeMap(a,b,pick){var out={},ids={};Object.keys(a||{}).forEach(function(k){ids[k]=1;});Object.keys(b||{}).forEach(function(k){ids[k]=1;});
  Object.keys(ids).forEach(function(k){out[k]=pick(a?a[k]:undefined,b?b[k]:undefined);});return out;}
function _mergeGam(a,b){a=a||{};b=b||{};var out=Object.assign({},b,a);
  out.xp=Math.max(_num(a.xp),_num(b.xp));out.best=Math.max(_num(a.best),_num(b.best));
  out.tSpent=Math.max(_num(a.tSpent),_num(b.tSpent));out.perfects=Math.max(_num(a.perfects),_num(b.perfects));out.reviewsDone=Math.max(_num(a.reviewsDone),_num(b.reviewsDone));
  var aDay=a.today||'',bDay=b.today||'';if(bDay>aDay){out.today=b.today;out.todayXP=_num(b.todayXP);}else{out.today=a.today||'';out.todayXP=_num(a.todayXP);}
  var aMet=a.lastMet||'',bMet=b.lastMet||'';if(bMet>aMet){out.lastMet=b.lastMet;out.streak=_num(b.streak);}else{out.lastMet=a.lastMet||'';out.streak=_num(a.streak);}
  out.goal=a.goal||b.goal||30;out.freezes=Math.max(_num(a.freezes),_num(b.freezes));
  out.done=Object.assign({},b.done||{},a.done||{});out.badges=Object.assign({},b.badges||{},a.badges||{});
  return out;}
// the ids of every course a state blob says the learner owns, whether that blob
// carries the full course bodies (legacy rows) or just the id list (what we sync now)
R.importedIds=function(s){
  s=s||{};
  var out=[],seen={};
  (Array.isArray(s.importedIds)?s.importedIds:[]).forEach(function(id){if(id&&!seen[id]){seen[id]=1;out.push(id);}});
  (Array.isArray(s.imported)?s.imported:[]).forEach(function(c){var id=c&&c.id;if(id&&!seen[id]){seen[id]=1;out.push(id);}});
  return out;
};
R.mergeState=function(a,b){a=a||{};b=b||{};
  return {
    progress:_mergeProgress(a.progress||{},b.progress||{}),
    imported:_unionById(a.imported||[],b.imported||[]),
    // union of what both sides claim to own — bodies for anything missing are
    // re-fetched from the catalogue, so a remote blob need not carry them
    importedIds:_unionArr(R.importedIds(a),R.importedIds(b)),
    recent:a.recent||b.recent||null,
    hidden:_unionArr(a.hidden||[],b.hidden||[]),
    order:_unionArr(a.order||[],b.order||[]),
    review:_mergeReview(a.review||{},b.review||{}),
    gam:_mergeGam(a.gam||{},b.gam||{}),
    bookmarks:_unionByKey(a.bookmarks||[],b.bookmarks||[],'k'),
    notes:_mergeMap(a.notes||{},b.notes||{},function(x,y){x=x||'';y=y||'';return x.length>=y.length?x:y;}),
    marks:_mergeMap(a.marks||{},b.marks||{},function(x,y){return _unionArr(x||[],y||[]);}),
    // rubric/assignment completions were silently dropped by this merge before,
    // so signing in wiped every completed assignment
    assignments:Object.assign({},b.assignments||{},a.assignments||{}),
    settings:Object.assign({},b.settings||{},a.settings||{})
  };
};
/* ================= course validation =================
   One rule set, used by the import screen in the app AND by the command-line
   linter that guards publishing. A course that installs but has an out-of-range
   answer index breaks a quiz for every learner who downloads it, so these checks
   run before anything reaches the store.
   Returns {errors:[], warnings:[]} — errors block, warnings advise. */
var BLOCK_TYPES=['p','h','callout','analogy','list','table','stepper','flip','tabs','explorer','code',
  'formula','image','video','compare','annotate','kcheck','resources','rubric','chart','html','divider','quote'];

function _lintQuestion(q,where,E,W,inline){
  if(!q||typeof q!=='object'){E.push(where+': not an object');return;}
  var t=q.type||'single';
  if(t==='case'){
    if(!q.stem)E.push(where+': case question has no "stem"');
    if(!Array.isArray(q.qs)||!q.qs.length)E.push(where+': case question has no "qs"');
    else q.qs.forEach(function(sub,i){_lintQuestion(sub,where+' › sub-question '+(i+1),E,W);});
    return;
  }
  if(t!=='free'&&!q.q)E.push(where+': missing "q" (the question text)');
  if(t==='single'||t==='multi'){
    if(!Array.isArray(q.options)||q.options.length<2){E.push(where+': needs an "options" array of at least 2');return;}
    var n=q.options.length;
    if(t==='single'){
      if(typeof q.answer!=='number'||q.answer<0||q.answer>=n||q.answer%1!==0)
        E.push(where+': "answer" must be an option index 0–'+(n-1)+' (got '+JSON.stringify(q.answer)+')');
    } else {
      if(!Array.isArray(q.answers)||!q.answers.length)E.push(where+': multi needs a non-empty "answers" array');
      else q.answers.forEach(function(a){if(typeof a!=='number'||a<0||a>=n)E.push(where+': "answers" contains '+JSON.stringify(a)+', outside 0–'+(n-1));});
    }
    // inline knowledge checks show one explanation, not per-distractor feedback,
    // so only graded exam questions are held to the "why" standard
    if(!inline){
      if(!Array.isArray(q.why))W.push(where+': no "why" array — learners get no feedback on wrong options');
      else if(q.why.length!==n)W.push(where+': "why" has '+q.why.length+' entries for '+n+' options');
    } else if(Array.isArray(q.why)&&q.why.length!==n)W.push(where+': "why" has '+q.why.length+' entries for '+n+' options');
    if(!q.explain)W.push(where+': no "explain"');
  }
  else if(t==='text'){ if(!Array.isArray(q.accept)||!q.accept.length)E.push(where+': text question needs an "accept" array'); }
  else if(t==='numeric'){
    if(typeof q.answer!=='number')E.push(where+': numeric "answer" must be a number');
    if(q.tolerance!=null&&typeof q.tolerance!=='number')E.push(where+': "tolerance" must be a number');
    if(q.tolerance==null)W.push(where+': no "tolerance" — only an exact match will be accepted');
  }
  else if(t==='order'){ if(!Array.isArray(q.items)||q.items.length<2)E.push(where+': order question needs an "items" array of 2+'); }
  else if(t==='match'){
    if(!Array.isArray(q.pairs)||q.pairs.length<2)E.push(where+': match question needs a "pairs" array of 2+');
    else q.pairs.forEach(function(p,i){if(!Array.isArray(p)||p.length!==2)E.push(where+': pair '+(i+1)+' must be [left, right]');});
  }
  else if(t==='free'){
    if(!q.q)E.push(where+': missing "q"');
    if(!q.model)W.push(where+': free question has no "model" answer to self-grade against');
  }
  else W.push(where+': unknown question type "'+t+'"');
  if(q.difficulty!=null&&[1,2,3].indexOf(q.difficulty)<0)W.push(where+': "difficulty" should be 1, 2 or 3');
}

function _lintExam(ex,where,E,W,minQ){
  if(!ex){E.push(where+': missing');return;}
  if(!Array.isArray(ex.questions)||!ex.questions.length){E.push(where+': no questions');return;}
  ex.questions.forEach(function(q,i){_lintQuestion(q,where+' Q'+(i+1),E,W);});
  if(ex.pick!=null){
    if(typeof ex.pick!=='number'||ex.pick<1)E.push(where+': "pick" must be a positive number');
    else if(ex.pick>ex.questions.length)E.push(where+': "pick" is '+ex.pick+' but there are only '+ex.questions.length+' questions');
  }
  if(ex.pass!=null&&(typeof ex.pass!=='number'||ex.pass<=0||ex.pass>1))E.push(where+': "pass" must be a fraction between 0 and 1 (e.g. 0.8)');
  if(ex.timeLimit!=null&&(typeof ex.timeLimit!=='number'||ex.timeLimit<=0))E.push(where+': "timeLimit" must be minutes as a positive number');
  if(minQ&&ex.questions.length<minQ)W.push(where+': only '+ex.questions.length+' questions');
}

R.lintCourse=function(c){
  var E=[],W=[];
  if(!c||typeof c!=='object'){return {errors:['Not a JSON object.'],warnings:[]};}
  if(typeof c.id!=='string'||!c.id.trim())E.push('Missing "id"');
  else if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id))W.push('"id" should be lower-case kebab-case (got "'+c.id+'")');
  if(typeof c.title!=='string'||!c.title.trim())E.push('Missing "title"');
  if(!c.tagline&&!c.subtitle)W.push('No "tagline" or "subtitle" — the store card will look bare');
  if(c.accent&&!/^#[0-9a-fA-F]{3,8}$/.test(c.accent))W.push('"accent" is not a hex colour (got "'+c.accent+'")');
  if(!c.category)W.push('No "category" — the library filter chips need one');

  if(!Array.isArray(c.modules)||!c.modules.length){E.push('"modules" must be a non-empty array');}
  else c.modules.forEach(function(m,mi){
    var mw='Module '+(mi+1);
    if(!m||typeof m!=='object'){E.push(mw+': not an object');return;}
    if(!m.title)E.push(mw+': missing "title"');
    if(!Array.isArray(m.objectives)||!m.objectives.length)W.push(mw+': no "objectives"');
    if(!Array.isArray(m.lessons)||!m.lessons.length)E.push(mw+': needs a non-empty "lessons" array');
    else m.lessons.forEach(function(l,li){
      var lw=mw+' lesson '+(li+1);
      if(!l||typeof l!=='object'){E.push(lw+': not an object');return;}
      if(!l.title)W.push(lw+': missing "title"');
      if(!Array.isArray(l.blocks)&&typeof l.html!=='string')E.push(lw+': needs "blocks" (an array) or "html"');
      else if(Array.isArray(l.blocks)){
        if(!l.blocks.length)E.push(lw+': "blocks" is empty');
        l.blocks.forEach(function(b,bi){
          if(!b||typeof b!=='object'){E.push(lw+' block '+(bi+1)+': not an object');return;}
          if(!b.t){E.push(lw+' block '+(bi+1)+': missing "t" (block type)');return;}
          if(BLOCK_TYPES.indexOf(b.t)<0)W.push(lw+' block '+(bi+1)+': unknown block type "'+b.t+'"');
          if(b.t==='kcheck')_lintQuestion(b,lw+' knowledge check',E,W,true);
          if((b.t==='image'||b.t==='annotate')&&!b.svg&&!b.src)E.push(lw+' block '+(bi+1)+': image needs "svg" or "src"');
          if(b.t==='table'&&(!Array.isArray(b.rows)||!b.rows.length))W.push(lw+' block '+(bi+1)+': table has no rows');
          if(b.t==='resources'&&(!Array.isArray(b.items)||!b.items.length))W.push(lw+' block '+(bi+1)+': resources block has no items');
        });
      }
      if(l.glossary!=null){
        if(!Array.isArray(l.glossary))E.push(lw+': "glossary" must be an array');
        else l.glossary.forEach(function(g,gi){if(!Array.isArray(g)||g.length!==2)E.push(lw+' glossary entry '+(gi+1)+': must be ["term","definition"]');});
      }
      if(m.week!=null&&typeof m.week!=='number')W.push(mw+': "week" should be a number');
    });
    _lintExam(m.quiz,mw+' quiz',E,W,4);
  });
  _lintExam(c.finalExam,'Final exam',E,W,10);

  // duplicate ids inside the course would make navigation ambiguous
  var seen={};
  (Array.isArray(c.modules)?c.modules:[]).forEach(function(m,i){
    var t=(m&&m.title)||'';
    if(t&&seen[t])W.push('Two modules share the title "'+t+'"');
    seen[t]=1;
  });
  return {errors:E,warnings:W};
};
R.lintSummary=function(r){
  if(!r.errors.length&&!r.warnings.length)return 'Clean.';
  return (r.errors.length?r.errors.length+' error'+(r.errors.length>1?'s':''):'')
    +(r.errors.length&&r.warnings.length?', ':'')
    +(r.warnings.length?r.warnings.length+' warning'+(r.warnings.length>1?'s':''):'');
};

if(typeof module!=='undefined'&&module.exports)module.exports=R;
if(typeof window!=='undefined')window.R=R;
})();






