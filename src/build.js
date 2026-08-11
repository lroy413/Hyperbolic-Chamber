const fs=require('fs');
const path=require('path');
/* ---------------------------------------------------------------------------
   Paths. Sources live in src/, everything the site needs is written to dist/.
   Nothing in dist/ is committed — CI rebuilds it on every push — so the repo
   only ever holds things a person wrote.
   --------------------------------------------------------------------------- */
const SRC=__dirname;                                  // src/
const ROOT=path.resolve(__dirname,'..');              // the repo
const DIST=path.join(ROOT,'dist');
const src=function(f){return path.join(SRC,f);};
const dist=function(f){return path.join(DIST,f);};
fs.mkdirSync(DIST,{recursive:true});
const style=fs.readFileSync(src('style.css'),'utf8');
let appInner=fs.readFileSync(src('appinner.html'),'utf8');
const courses=JSON.parse(fs.readFileSync(src('data/courses.json'),'utf8'));
const storeCatalog=JSON.parse(fs.readFileSync(src('data/store-courses.json'),'utf8'));
const renderersJs=fs.readFileSync(src('renderers.js'),'utf8');
let engineJs=fs.readFileSync(src('engine.js'),'utf8');
const MARK_SVG=fs.readFileSync(src('brand/logo_vector.svg'),'utf8').trim();
const MARK_URI='data:image/svg+xml,'+encodeURIComponent(MARK_SVG);   // crisp vector for the wordmark
const TILE_URI=fs.readFileSync(src('brand/tile_uri.txt'),'utf8').trim();        // cream tile PNG for the favicon/app icon

const GAM_CSS=`
/* streak + goal card */
.streakcard{display:flex;gap:6px;background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:16px 14px;margin:10px 0}
.streakcard .stcell{flex:1;display:flex;align-items:center;justify-content:center;gap:9px;min-width:0}
.streakcard .stcell.stgoal{flex:1.7}
.flamewrap{opacity:.35;filter:grayscale(1);flex:0 0 auto}
.flamewrap.lit{opacity:1;filter:none}
.stinfo{line-height:1.15;min-width:0}
.stinfo b{font-size:17px;font-weight:700;display:block;white-space:nowrap}
.stinfo small{font-size:11.5px;color:var(--muted);font-weight:600;white-space:nowrap}
.goalring span{width:34px;height:34px;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700}
@media(max-width:520px){.stinfo b{font-size:17px}.streakcard{padding:14px 10px;gap:3px}}
/* review prompt on dashboard */
.reviewcard{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:14px;padding:14px 16px;margin:10px 0;text-decoration:none;color:inherit;border:1px solid var(--hairline)}
.reviewcard.due{background:linear-gradient(135deg,rgba(245,158,11,.16),rgba(242,104,127,.10));border-color:var(--warn)}
.reviewcard.caught{background:var(--panel)}
.rvtag{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--warn)}
.reviewcard.caught .rvtag{color:var(--muted)}
.rvtitle{font-size:17px;font-weight:700;margin-top:2px}
.rvsub{font-size:13px;color:var(--muted)}
.rvbtn{background:var(--warn);color:#141a26;font-weight:700;padding:10px 16px;border-radius:14px;white-space:nowrap;font-size:15px;flex:0 0 auto}
.rvbtn.ghost{background:var(--panel3);color:var(--ink);border:1px solid var(--hairline)}
/* review session */
.revempty{text-align:center;background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:34px 22px;margin:14px 0}
.revbig{font-size:20px;font-weight:800;margin-bottom:6px}
.revcard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:22px 20px;margin:10px 0}
.revcount{font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--accent);display:flex;justify-content:space-between;gap:8px}
.revsrc{color:var(--muted);font-weight:700;text-transform:none;letter-spacing:0;font-size:11.5px}
.revq{font-size:17px;font-weight:700;margin:12px 0 14px;line-height:1.4}
.revopts{display:flex;flex-direction:column;gap:9px}
.revopt{display:flex;align-items:flex-start;gap:11px;text-align:left;border:1px solid var(--hairline);background:var(--panel2);border-radius:14px;padding:12px 14px;font-size:15px;font-family:inherit;color:var(--ink);cursor:pointer;width:100%}
.revopt:hover:not(.done){border-color:var(--accent)}
.revopt .box{width:20px;height:20px;border-radius:50%;border:2px solid var(--muted);flex:0 0 auto;margin-top:1px}
.revopt.done{cursor:default}
.revopt.correct{border-color:var(--accent2);background:rgba(49,196,141,.12)}
.revopt.correct .box{border-color:var(--accent2);background:var(--accent2)}
.revopt.wrong{border-color:var(--bad);background:rgba(242,104,127,.12)}
.revopt.wrong .box{border-color:var(--bad);background:var(--bad)}
.revfb{display:none;margin-top:12px;padding:11px 14px;border-radius:10px;font-size:13px;line-height:1.5}
.revfb.show{display:block}
.revfb.ok{background:rgba(49,196,141,.12);border-left:3px solid var(--accent2)}
.revfb.no{background:rgba(242,104,127,.1);border-left:3px solid var(--bad)}
.reviewcard.saved{background:var(--panel)}
`;

const NOTE_CSS=`
/* study bar: bookmark + note + highlight */
.studybar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:2px 0 14px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.stbtn{display:inline-flex;align-items:center;gap:6px;background:var(--panel2);border:1px solid var(--hairline);color:var(--ink);border-radius:999px;padding:7px 13px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer}
.stbtn:hover{border-color:var(--accent)}
.stbtn.on{background:rgba(245,158,11,.14);border-color:var(--warn);color:var(--ink)}
.stbtn .bmkico{font-size:15px;line-height:1;color:var(--warn)}
.sthint{margin-left:auto;font-size:11.5px;color:var(--muted);font-weight:600}
.notebox{display:none;margin:0 0 16px}
.notebox.open{display:block}
.notebox textarea{width:100%;min-height:90px;resize:vertical;border:1px solid var(--hairline);border-radius:14px;background:var(--panel);color:var(--ink);padding:12px 14px;font-family:inherit;font-size:15px;line-height:1.5;box-sizing:border-box}
.notebox textarea:focus{outline:none;border-color:var(--accent)}
mark.hl{background:linear-gradient(180deg,transparent 55%,rgba(245,158,11,.55) 55%);color:inherit;padding:0 1px;border-radius:2px;cursor:pointer;transition:background .12s}
mark.hl:hover{background:rgba(242,104,127,.35)}
[data-theme="dark"] mark.hl,html:not([data-theme="light"]) mark.hl{background:linear-gradient(180deg,transparent 55%,rgba(245,158,11,.45) 55%)}
#hlbtn{position:absolute;z-index:1000;background:#141a26;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:7px 13px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:var(--e2)}
#hlbtn:before{content:"\\270E  "}
/* saved page */
.savedsec{margin:18px 0}
.savedrow{gap:8px;background:var(--panel);padding:4px 6px 4px 4px;margin:8px 0}
.savedmain{flex:1;display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;padding:9px 10px;border-radius:10px;min-width:0}
.savedmain:hover{background:var(--panel2)}
.savedico{color:var(--warn);font-size:15px;flex:0 0 auto}
.savedtxt{font-size:15px;font-weight:600;min-width:0}
.savedx{background:none;border:none;color:var(--muted);font-size:20px;line-height:1;cursor:pointer;padding:6px 10px;border-radius:10px;font-family:inherit}
.savedx:hover{color:var(--bad);background:var(--panel2)}
.notecard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:14px 16px;margin:10px 0}
.notehd{display:inline-block;font-size:13px;font-weight:700;color:var(--accent);text-decoration:none;margin-bottom:8px}
.notebody{font-size:15px;line-height:1.55;white-space:pre-wrap}
.notedel{font-size:13px;font-weight:700;color:var(--muted);margin-top:10px}
.hllist{margin:4px 0 0;padding-left:18px}
.hllist li{font-size:15px;line-height:1.5;margin:5px 0;border-left:3px solid var(--warn);padding-left:10px;list-style:none;margin-left:-8px}
`;

const QUIZ_CSS=`
/* new question types + randomization */
.qmulti{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);background:rgba(91,140,255,.12);border-radius:10px;padding:1px 7px;margin-left:6px;vertical-align:middle}
.box.sq{border-radius:10px}
.mopt input:checked ~ .box.sq{border-color:var(--accent);background:var(--accent)}
.mopt input:checked ~ .box.sq::after{content:"";position:absolute;left:5px;top:1.5px;width:5px;height:10px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);border-radius:0;background:none}
.quizwrap.graded .opt.mc-correct{border-color:var(--accent2);background:rgba(49,196,141,.10)}
.quizwrap.graded .opt.mc-correct .box{border-color:var(--accent2);background:var(--accent2)}
.quizwrap.graded .opt.mc-wrong{border-color:var(--bad);background:rgba(242,104,127,.08)}
.quizwrap.graded .opt.mc-wrong .box{border-color:var(--bad);background:var(--bad)}
.qinput,.revinput{width:100%;box-sizing:border-box;border:1px solid var(--hairline);border-radius:10px;background:var(--panel);color:var(--ink);padding:11px 13px;font-family:inherit;font-size:15px}
.qinput:focus,.revinput:focus{outline:none;border-color:var(--accent)}
.qinput.ok,.revinput.ok{border-color:var(--accent2);background:rgba(49,196,141,.08)}
.qinput.no,.revinput.no{border-color:var(--bad);background:rgba(242,104,127,.07)}
.qexplain{display:none;margin:6px 0 2px;padding:11px 14px;border-radius:10px;font-size:13px;line-height:1.5}
.qexplain.show{display:block}
.qexplain.ok{background:rgba(49,196,141,.12);border-left:3px solid var(--accent2)}
.qexplain.no{background:rgba(242,104,127,.1);border-left:3px solid var(--bad)}
.qexplain em{font-style:normal;font-weight:700}
.revopts.multi{gap:9px}
.revchk{display:flex;align-items:flex-start;gap:11px;text-align:left;border:1px solid var(--hairline);background:var(--panel2);border-radius:14px;padding:12px 14px;font-size:15px;cursor:pointer;position:relative}
.revchk input{position:absolute;opacity:0;width:1px;height:1px}
.revchk .box{width:20px;height:20px;border:2px solid var(--muted);border-radius:10px;flex:0 0 auto;margin-top:1px;position:relative}
.revchk input:checked ~ .box{border-color:var(--accent);background:var(--accent)}
.revchk input:checked ~ .box::after{content:"";position:absolute;left:5px;top:1.5px;width:5px;height:10px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.revchk.correct{border-color:var(--accent2);background:rgba(49,196,141,.12)}
.revchk.correct .box{border-color:var(--accent2);background:var(--accent2)}
.revchk.wrong{border-color:var(--bad);background:rgba(242,104,127,.12)}
.revchk.wrong .box{border-color:var(--bad);background:var(--bad)}
.revchk.done{cursor:default}
`;

const STUDY_CSS=`
/* study & practice tiles on course home */
.studygrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:2px 0 10px}
.studytile{display:flex;flex-direction:column;gap:2px;align-items:flex-start;border:1px solid var(--hairline);background:var(--panel);border-radius:14px;padding:14px 14px 16px;text-decoration:none;color:inherit}
.studytile:hover{border-color:var(--accent)}
.studytile .sgico{font-size:20px;margin-bottom:5px}
.studytile b{font-size:15px}
.studytile small{color:var(--muted);font-size:11.5px;line-height:1.3}
/* flashcards */
.flashcard{perspective:1200px;cursor:pointer;margin:6px 0 4px}
.flashinner{position:relative;transform-style:preserve-3d;transition:transform .5s;min-height:210px}
.flashcard.flipped .flashinner{transform:rotateY(180deg)}
.flashface{position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px 22px;border:1px solid var(--hairline);border-radius:14px;background:var(--panel);text-align:center;overflow:auto}
.flashface.back{transform:rotateY(180deg);background:var(--panel2)}
.flabel{font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.flashface .ftext{font-size:20px;font-weight:700;line-height:1.4}
.flashface.back .ftext{font-size:15px;font-weight:500;line-height:1.55}
.fhint{color:var(--muted);font-size:13px}
.flashmeta{text-align:center;color:var(--muted);font-size:13px;font-weight:600;margin:10px 0}
/* match */
.matchbar{display:flex;justify-content:space-between;font-size:13px;color:var(--muted);font-weight:600;margin:6px 2px 10px}
.matchbar b{color:var(--ink)}
.matchgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.matchtile{min-height:66px;border:1px solid var(--hairline);background:var(--panel);border-radius:14px;padding:10px 12px;font-family:inherit;font-size:13px;line-height:1.35;color:var(--ink);cursor:pointer;text-align:center;display:flex;align-items:center;justify-content:center;transition:border-color .12s,background .12s}
.matchtile:hover{border-color:var(--accent)}
.matchtile.sel{border-color:var(--accent);background:rgba(91,140,255,.14);box-shadow:0 0 0 2px var(--accent) inset}
.matchtile.bad{border-color:var(--bad);background:rgba(242,104,127,.16)}
.matchtile.matched{opacity:0;pointer-events:none;transition:opacity .3s}
/* practice picker */
.pracpick{display:flex;flex-direction:column;gap:10px;margin-top:6px}
.pracopt{display:flex;align-items:center;gap:14px;border:1px solid var(--hairline);background:var(--panel);border-radius:14px;padding:16px;text-decoration:none;color:inherit}
.pracopt:hover{border-color:var(--accent)}
.pracopt.dim{opacity:.6}
.pracopt .pkico{font-size:27px;flex:0 0 auto}
.pracopt .pkinfo{flex:1;min-width:0}
.pracopt .pkinfo b{display:block;font-size:15px}
.pracopt .pkinfo small{color:var(--muted);font-size:13px}
.pracopt .go{color:var(--muted);font-size:20px}
/* badges + rewards */
.reviewcard.rewards,.reviewcard.saved{background:var(--panel)}
.reviewcard .rwico{font-size:15px}
.rewardcard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:16px;margin:10px 0 4px}
.rwtok{display:flex;align-items:center;gap:12px}
.rwico{font-size:20px}
.rwtok b{font-size:17px;display:block}
.rwtok small{color:var(--muted);font-size:13px}
.perklist{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.perk{display:flex;align-items:center;gap:12px;border:1px solid var(--hairline);border-radius:14px;padding:10px 12px;opacity:.6}
.perk.on{opacity:1}
.perk .pkico{font-size:20px}
.perk .pkinfo{flex:1}
.perk .pkinfo b{display:block;font-size:15px}
.perk .pkinfo small{color:var(--muted);font-size:13px}
.perk .btick{color:var(--accent2);font-weight:700}
.perk .block{color:var(--muted);font-size:11.5px;font-weight:700}
.badgegrid{display:grid;grid-template-columns:1fr;gap:9px;margin-top:12px}
@media(min-width:560px){.badgegrid{grid-template-columns:1fr 1fr}}
.badge{display:flex;align-items:center;gap:13px;border:1px solid var(--hairline);background:var(--panel);border-radius:14px;padding:13px 15px;opacity:.55}
.badge.got{opacity:1;border-color:var(--accent2)}
.badge .bicon{font-size:27px;width:34px;text-align:center;filter:grayscale(1)}
.badge.got .bicon{filter:none}
.badge .binfo{flex:1;min-width:0}
.badge .binfo b{display:block;font-size:15px}
.badge .binfo small{color:var(--muted);font-size:13px}
.badge .btick{color:var(--accent2);font-weight:700;font-size:17px}
.badge .block{color:var(--muted);font-size:11.5px;font-weight:700;white-space:nowrap}
/* power-ups */
.powerbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--panel2);border:1px solid var(--hairline);border-radius:14px;padding:9px 12px;margin-bottom:14px}
.pbtok{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700}
.pbtok b{font-size:15px}
.pbnote{font-size:11.5px;color:var(--muted)}
.pbpeek{margin-left:auto;display:inline-flex;align-items:center;min-height:44px;background:var(--panel);border:1px solid var(--hairline);border-radius:10px;padding:7px 13px;font-family:inherit;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer}
.pbpeek:hover{border-color:var(--accent)}
.tk{display:inline-block;background:var(--warn);color:#141a26;border-radius:10px;padding:0 5px;font-size:11.5px;font-weight:700;margin-left:3px}
.hintbtn{display:inline-flex;align-items:center;min-height:44px;background:none;border:1px dashed var(--line);border-radius:10px;padding:6px 13px;font-family:inherit;font-size:13px;font-weight:700;color:var(--muted);cursor:pointer;margin-top:8px}
.hintbtn:hover{border-color:var(--warn);color:var(--ink)}
.hintbtn.used{border-style:solid;opacity:.55;cursor:default}
.opt.eliminated{opacity:.32;text-decoration:line-through;pointer-events:none}
.qhint{margin-top:8px;font-size:13px;color:var(--ink);background:rgba(245,158,11,.12);border-left:3px solid var(--warn);border-radius:10px;padding:9px 12px}
.peekoverlay{position:fixed;inset:0;background:rgba(10,14,20,.62);z-index:2000;display:flex;align-items:flex-start;justify-content:center;padding:34px 16px;overflow:auto}
.peekcard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;max-width:640px;width:100%;padding:18px 20px;box-shadow:var(--e3)}
.peekhd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.peekhd b{font-size:17px}
.peekcount{background:var(--warn);color:#141a26;font-weight:700;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px}
.peekbody{max-height:60vh;overflow:auto}
`;

const BACKEND_CSS=`
/* account chip in the top bar */
.acctchip{display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--muted);font-size:13px;font-weight:700;border:1px solid var(--hairline);border-radius:999px;padding:5px 11px;margin-right:8px}
.acctchip:hover{border-color:var(--accent);color:var(--ink)}
.acctchip.in{padding:4px 5px}
.acctav{width:24px;height:24px;border-radius:50%;background:var(--accent-solid);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.acctdot{width:8px;height:8px;border-radius:50%;margin-left:3px}
/* account page */
.acctcard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:20px;margin:12px 0}
.acctbig{font-size:17px;font-weight:700}
.acctsync{color:var(--muted);font-size:13px;margin-top:4px}
.authtabs{display:flex;gap:6px;background:var(--pill);border-radius:14px;padding:4px;margin-bottom:16px}
.authtab{flex:1;border:none;background:none;font-family:inherit;font-size:15px;font-weight:700;color:var(--muted);padding:8px;border-radius:10px;cursor:pointer}
.authtab.on{background:var(--panel);color:var(--ink);box-shadow:var(--e1)}
.authinput{width:100%;box-sizing:border-box;border:1px solid var(--hairline);border-radius:14px;background:var(--panel2);color:var(--ink);padding:12px 14px;font-family:inherit;font-size:15px;margin-bottom:10px}
.authinput:focus{outline:none;border-color:var(--accent)}
.authwide{width:100%;box-sizing:border-box;justify-content:center}
.author{display:flex;align-items:center;text-align:center;color:var(--muted);font-size:13px;margin:14px 0}
.author:before,.author:after{content:"";flex:1;height:1px;background:var(--line)}
.author span{padding:0 12px}
.autherr{color:var(--bad);font-size:13px;font-weight:600;margin:10px 0 0;display:none}
/* course store */
.storegrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px}
.storecard{position:relative;display:flex;background:var(--panel);border:1px solid var(--hairline);border-radius:14px;overflow:hidden}
.storecard .stripe{width:5px;flex:0 0 auto}
.storebody{padding:15px 16px;flex:1;min-width:0}
.storetitle{font-size:17px;font-weight:700}
.storetag{font-size:13px;color:var(--muted);margin-top:3px;line-height:1.4}
.storeauth{font-size:11.5px;color:var(--muted);margin-top:6px;font-style:italic}
.storefoot{display:flex;align-items:center;justify-content:space-between;margin-top:14px;gap:10px}
.storeprice{font-size:15px;font-weight:700;color:var(--accent2)}
.storebtn{background:var(--accent-solid);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}
.storebtn:hover{filter:brightness(1.06)}
.storebtn.installed{background:var(--pill);color:var(--muted);font-weight:700;cursor:default}
`;

const MEDIA_CSS=`
/* ---- media blocks: image / video / compare ---- */
.figblock{margin:18px 0;text-align:center}
.figimg{max-width:100%;height:auto;border-radius:14px;border:1px solid var(--hairline);box-shadow:var(--shadow);display:block;margin:0 auto}
.figimg.zoomable{cursor:zoom-in}
.figblock.wide .figimg{width:100%}
/* inline themed SVG figures (premium, theme-aware, course-accented) */
.figsvg{--fig:var(--accent);background:var(--panel2);border:1px solid var(--hairline);border-radius:14px;padding:16px 16px 14px;box-shadow:var(--edge),var(--shadow);margin:0 auto;max-width:560px}
.figblock.wide .figsvg{max-width:100%}
.figsvg svg{width:100%;height:auto;display:block}
.figsvg svg text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.videoblock{margin:18px 0}
.videoframe{position:relative;width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;border:1px solid var(--hairline);box-shadow:var(--shadow);background:#000}
.videoframe iframe,.videoframe video{position:absolute;inset:0;width:100%;height:100%;border:0}
.compareblock{margin:18px 0}
.cmpwrap{position:relative;width:100%;border-radius:14px;overflow:hidden;border:1px solid var(--hairline);box-shadow:var(--shadow);user-select:none;touch-action:pan-y;background:#000;line-height:0}
.cmpimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.cmptop{clip-path:inset(0 calc(100% - var(--cmp)) 0 0)}
.cmpdivider{position:absolute;top:0;bottom:0;left:var(--cmp);width:2px;background:#fff;transform:translateX(-1px);box-shadow:0 0 0 1px rgba(0,0,0,.28);pointer-events:none}
.cmpknob{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:#fff;box-shadow:var(--e2);display:flex;align-items:center;justify-content:center}
.cmpknob::before{content:"\\2039\\2003\\203A";font-size:15px;font-weight:700;color:#111}
.cmplabel{position:absolute;bottom:10px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.62);color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;pointer-events:none}
.cmplabel.l{left:10px}.cmplabel.r{right:10px}
.cmprange{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;opacity:0;cursor:ew-resize;-webkit-appearance:none;appearance:none;background:transparent}
.cmprange::-webkit-slider-thumb{-webkit-appearance:none;width:46px;height:400px;cursor:ew-resize}
.cmprange::-moz-range-thumb{width:46px;height:400px;border:0;background:transparent;cursor:ew-resize}
/* =========================================================================
   FIGURE VIEWER
   Course diagrams render about 330px wide on a phone. Tapping one opens it
   full-bleed, fitted to however the phone is being held, with pinch and
   double-tap zoom. dvh rather than vh so the iOS toolbar cannot clip it.
   ========================================================================= */
.zoomfig{position:relative}
/* 44px of touch target, 34px of ink: the extra 5px is transparent border, so the
   badge stays small without the thumb having to be accurate. */
.figzoom{position:absolute;top:3px;right:3px;z-index:2;display:flex;align-items:center;justify-content:center;
  width:44px;height:44px;padding:0;border:5px solid transparent;background-clip:padding-box;
  border-radius:14px;cursor:pointer;
  background-color:color-mix(in srgb,var(--panel) 86%,transparent);color:var(--muted);
  box-shadow:inset 0 0 0 1px var(--hairline);
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
  opacity:0;transition:opacity .16s,color .16s,transform .16s}
.zoomfig:hover .figzoom,.figzoom:focus-visible{opacity:1;color:var(--ink)}
@media (hover:none){.figzoom{opacity:1}}
.figzoom:hover{transform:scale(1.06)}
/* the figure itself is the target, so the small button never has to be hit */
.zoomfig>.figsvg,.zoomfig>svg,.zoomfig>.anwrap,.zoomfig>img{cursor:zoom-in}

#figview{position:fixed;inset:0;z-index:130;display:none;flex-direction:column;
  background:color-mix(in srgb,var(--bg) 97%,transparent);
  -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);
  height:100vh;height:100dvh}
#figview.open{display:flex}
.fvbar{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:10px 12px;
  padding-top:calc(10px + env(safe-area-inset-top,0px));border-bottom:1px solid var(--hairline)}
.fvcap{flex:1;min-width:0;font-size:13px;font-weight:700;color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fvx{flex:0 0 auto;width:44px;height:44px;border-radius:14px;border:0;cursor:pointer;
  background:var(--panel2);color:var(--ink);font-size:17px;line-height:1;
  display:flex;align-items:center;justify-content:center}
.fvx:hover{background:var(--panel3)}
.fvstage{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;
  display:flex;align-items:center;justify-content:center;touch-action:pan-x pan-y;
  overscroll-behavior:contain;cursor:zoom-in}
#figview.zoomed .fvstage{cursor:grab}
.fvpane{flex:0 0 auto;margin:auto;position:relative}
.fvinner{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);transform-origin:50% 50%;
  display:flex;align-items:center;justify-content:center;box-sizing:border-box;
  padding:2.5%;background:var(--panel2);border:1px solid var(--hairline);border-radius:14px;
  box-shadow:var(--edge),var(--shadow-h);
  transition:transform .22s cubic-bezier(.2,.7,.3,1)}
/* the lesson's own figure chrome must not follow the artwork in here */
#figview .fvinner{--fig:var(--accent)}
#figview .fvinner>*{width:100%!important;height:100%!important;max-width:none!important;margin:0;flex:1 1 auto}
#figview .fvinner svg{width:100%!important;height:100%!important;display:block}
#figview .fvinner img{object-fit:contain}
@media(prefers-reduced-motion:reduce){.fvinner{transition:none}}
.fvrot{display:none}
#figview.canturn .fvrot{display:flex}
#figview.turned .fvrot{background:var(--accent-solid);color:#fff}
/* the annotation dots are positioned in percentages, so they scale with the pane */
.fvinner .anwrap{position:relative}
.fvfoot{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:10px 12px;
  padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--hairline)}
.fvhint{flex:1;min-width:0;font-size:11.5px;font-weight:600;color:var(--muted);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fvzoom{flex:0 0 auto;display:flex;gap:6px;background:var(--pill);border-radius:14px;padding:4px}
.fvb{min-width:44px;height:44px;border:0;border-radius:10px;cursor:pointer;
  background:transparent;color:var(--ink);font-size:17px;font-weight:700;line-height:1;
  display:flex;align-items:center;justify-content:center}
.fvb.wide{min-width:56px;font-size:13px}
.fvb:hover{background:var(--panel2)}
@media(min-width:820px){
  .fvbar,.fvfoot{padding-left:20px;padding-right:20px}
  .fvcap{font-size:15px}
}
/* A phone held sideways has ~390px of height. Two bars in the flow would spend a
   third of it on chrome, so the controls float over the diagram instead. */
@media(max-height:520px){
  .fvbar{padding:3px 8px;padding-top:calc(3px + env(safe-area-inset-top,0px));border-bottom:0}
  .fvcap{font-size:11.5px}
  .fvhint{display:none}
  .fvfoot{position:absolute;left:auto;right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));
    padding:0;border-top:0;background:transparent}
  .fvzoom{background:color-mix(in srgb,var(--panel) 92%,transparent);
    -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
    box-shadow:var(--shadow-h);border:1px solid var(--hairline)}
}
/* ---- media placeholders (until real assets are dropped in) ---- */
.mediaph{width:100%;aspect-ratio:16/9;border:1.5px dashed var(--line);border-radius:14px;background:var(--panel2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;color:var(--muted)}
.mphico{font-size:27px;opacity:.8}
.mphtxt{font-size:13px;font-weight:600;text-align:center;max-width:80%;line-height:1.4}
.cmpph{position:relative;width:100%;border-radius:14px;overflow:hidden;border:1.5px dashed var(--line);display:flex}
.cmpph .cmpphside{flex:1;background:var(--panel2)}
.cmpph .cmpphside:first-child{border-right:2px solid var(--line)}
.cmpph .mphico{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
.anph{position:relative;width:100%;border:1.5px dashed var(--line);border-radius:14px;background:var(--panel2);display:flex;align-items:center;justify-content:center}
.anph .mphico{opacity:.6}
/* ---- annotate (image hotspots) ---- */
.annotateblock{margin:18px 0;text-align:center}
.anwrap{position:relative;display:inline-block;max-width:100%}
.anwrap .figimg{max-width:100%}
.anpt{position:absolute;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;background:var(--accent-solid);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:var(--e2)}
.anlist{text-align:left;margin:12px 0 0;padding-left:26px}
.anlist li{margin:7px 0;font-size:15px;line-height:1.5}
.anlist li::marker{color:var(--accent);font-weight:700}
/* ---- resources (go deeper) ---- */
.resources{background:var(--panel2);border:1px solid var(--hairline);border-left:3px solid var(--accent2);border-radius:0 12px 12px 0;padding:14px 16px;margin:16px 0}
.restitle{font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--accent2);margin-bottom:8px}

.reslist{margin:0;padding-left:18px}
.reslist li{margin:6px 0;font-size:15px;line-height:1.5}
/* ---- rubric / assignment ---- */
.rubricblock{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 8%,var(--panel)),var(--panel));border:1px solid var(--accent);border-radius:14px;padding:16px 18px;margin:18px 0;box-shadow:var(--shadow)}
.rbhead{font-size:15px;font-weight:700;color:var(--accent);display:flex;align-items:center;gap:8px;margin-bottom:6px}
.rbicon{font-size:17px}
.rbbrief{font-size:15px;line-height:1.55;margin:0 0 12px}
.rbitems{display:flex;flex-direction:column;gap:9px;margin-bottom:14px}
.rbitem{display:flex;align-items:flex-start;gap:11px;font-size:15px;line-height:1.5;cursor:pointer}
.rbitem input{position:absolute;opacity:0;width:1px;height:1px}
.rbbox{flex:0 0 auto;width:20px;height:20px;border:2px solid var(--muted);border-radius:10px;margin-top:1px;position:relative;transition:.12s}
.rbitem input:checked ~ .rbbox{border-color:var(--accent2);background:var(--accent2)}
.rbitem input:checked ~ .rbbox::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.rbitem input:checked ~ .rbtext{color:var(--muted);text-decoration:line-through}
.rbdone{background:var(--accent-solid);color:#fff;font-weight:800;border:0;border-radius:14px;padding:11px 18px;font-size:15px;font-family:inherit;cursor:pointer;width:100%}
.rbdone.done{background:var(--accent2)}
.rubricblock.done{border-color:var(--accent2)}
/* ---- specialization tracks ---- */
.trackgrid{display:flex;flex-direction:column;gap:10px}
.trackcard{display:flex;align-items:stretch;background:var(--panel);border:1px solid var(--hairline);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:var(--edge),var(--shadow);background-image:var(--sheen);background-repeat:no-repeat;transition:transform .16s,box-shadow .16s,border-color .16s}
.trackcard:hover{transform:translateY(-2px);box-shadow:var(--edge),var(--shadow-h)}
.tstripe{width:6px;flex:0 0 auto}
.tkbody{flex:1;min-width:0;padding:14px 16px}
.tktitle{font-size:17px;font-weight:700}
.tksub{font-size:13px;color:var(--muted);margin:2px 0 9px}
.tkbar{height:6px;background:var(--pill);border-radius:999px;overflow:hidden}
.tkbar i{display:block;height:100%;border-radius:999px}
.tkmeta{font-size:13px;color:var(--muted);font-weight:700;margin-top:7px}
.tkdone{color:var(--accent2)}
.tkchev{display:flex;align-items:center;padding:0 14px;color:var(--muted);font-size:20px}
.trow{gap:13px;background:var(--panel);padding:12px 14px;margin:9px 0;box-shadow:var(--edge),var(--shadow)}
a.trow:hover{border-color:var(--accent)}
.trow.locked{opacity:.6}
.trnum{flex:0 0 auto;width:32px;height:32px;border-radius:50%;background:var(--panel3);color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center}
.trbody{flex:1;min-width:0}
.trtitle{font-size:15px;font-weight:700}
.trbar{height:5px;background:var(--pill);border-radius:999px;overflow:hidden;margin:7px 0 3px}
.trbar i{display:block;height:100%;border-radius:999px}
.trmeta{font-size:13px;color:var(--muted);font-weight:600}
.progcert{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 16%,var(--panel)),var(--panel));border:1px solid var(--accent);border-radius:14px;padding:22px;text-align:center;margin:14px 0;box-shadow:var(--shadow)}
.pcseal{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.pctitle{font-family:var(--serif);font-size:27px;font-weight:800;margin:8px 0 4px}
.pcbody{font-size:15px;color:var(--muted)}
.pcdate{font-size:13px;color:var(--muted);margin-top:10px;font-weight:700}
/* ---- library tabs + My Learning bits ---- */
.libtabs{display:flex;gap:6px;background:var(--panel2);border:1px solid var(--hairline);border-radius:14px;padding:5px;margin:14px 0 16px}
.libtab{flex:1;text-align:center;padding:10px 12px;border-radius:10px;font-weight:700;font-size:15px;color:var(--muted);text-decoration:none;transition:.14s}
.libtab.on{background:var(--panel);color:var(--ink);box-shadow:var(--edge),var(--shadow)}
.libtab:not(.on):hover{color:var(--ink)}
.libhero{padding-top:16px;padding-bottom:2px}
.libhero .hero2-h{font-size:27px}
@media(max-width:520px){.libhero .hero2-h{font-size:27px}}
.libstoresub{text-align:left;margin:0 0 14px}
.startcta .contbtn{background:var(--accent-solid);color:#fff}
.sugcard{cursor:pointer}
/* ---- topbar quick-action icon (library hotkey) ---- */
.iconbtn{width:46px;height:46px;border-radius:14px;border:1px solid var(--hairline);background:var(--panel);display:flex;align-items:center;justify-content:center;color:var(--muted);text-decoration:none;flex:0 0 auto;margin-right:8px;transition:.15s}
.iconbtn:hover,.iconbtn:focus-visible{color:var(--accent);border-color:var(--accent)}
.iconbtn .nvic{width:22px;height:22px}
/* ---- collapsible sections ---- */
/* A section header was a full card — panel, border, shadow, 14px radius — sitting
   above items that were also full cards, at the same width, outside it. So the
   label for a group weighed more than the group, and nothing looked contained.
   A label is a label: it sits on the page, the cards below are the content. */
.coll{margin:22px 0}
.coll:first-child{margin-top:6px}
.collhead{width:100%;display:flex;align-items:center;gap:10px;background:transparent;border:0;
  border-radius:10px;padding:0 2px;min-height:34px;cursor:pointer;font-family:inherit;
  text-align:left;transition:color .14s}
.collhead:hover .collttl{color:var(--ink)}
.collttl{flex:1;font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);transition:color .14s}
.coll.open .collttl{color:var(--ink)}
.collcount{font-size:11.5px;font-weight:700;color:var(--muted);background:var(--pill);
  border-radius:999px;padding:3px 9px;line-height:1}
.collchev{color:var(--muted);font-size:17px;line-height:1;width:20px;text-align:center;
  transform:rotate(90deg);transition:transform .2s}
.coll.open .collchev{transform:rotate(-90deg)}
/* the header's tap target reaches the full 44px without the label being 44px tall */
.collhead::before{content:'';position:absolute;left:0;right:0;top:-5px;height:44px}
.coll{position:relative}
.collhead{position:relative}
.collbody{display:none;padding-top:10px}
.coll.open .collbody{display:block;animation:collin .18s ease}
@keyframes collin{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
/* ---- compact track rows ---- */
.trackrows{display:flex;flex-direction:column;gap:8px}
.tkrow{margin:0}
.trdot{flex:0 0 auto;width:10px;height:10px;border-radius:50%}
/* ---- compact course cards ---- */
.libcard.compact{margin:0 0 9px}
/* reserve room on the right so content never sits under the drag handle */
.libcard.compact .libbody{padding:13px 34px 13px 14px}
.libcard.compact .draghandle{width:26px;opacity:.3;font-size:13px}
.libcard.compact .draghandle:hover{opacity:.9}
.lctop{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.libcard.compact .cattag{margin-bottom:0}
.libcard.compact .libtitle{display:block;font-size:15px;font-weight:700;line-height:1.3}
.libcard.compact .libbar{margin:8px 0 6px}
.libcard.compact .libmeta{display:flex;align-items:center;justify-content:space-between;gap:10px}
.libcard.compact .libmods{font-size:13px;color:var(--muted);font-weight:700}
.lcgo{font-size:13px;font-weight:700;color:var(--accent);text-decoration:none;white-space:nowrap}
.libcard.compact .cardcollapse{margin-top:9px;border-top:1px solid var(--line);padding-top:8px}
.libcard.compact .cardcollapse summary{font-size:13px;color:var(--muted);font-weight:700;cursor:pointer}
.lcacts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.homegrid{display:flex;flex-direction:column}
/* compact "add a course" row */
.coll .libcard.addcard{margin:2px 0 0;border-style:dashed;background:none;box-shadow:none}
.coll .libcard.addcard .libbody{padding:12px 14px;text-align:center}
.coll .libcard.addcard b{font-size:15px}
.coll .libcard.addcard small{display:block;font-size:11.5px;color:var(--muted);margin-top:2px}
.coll .libcard.addcard:hover{border-color:var(--accent)}
/* tighter library hero */
.libhero{padding-top:12px;padding-bottom:0}
.libhero .hero2-sub{font-size:15px;margin-bottom:14px;max-width:40ch}

/* ===== accessibility pass (from the UI/UX audit) ===== */
/* a text-safe accent derived from the palette: lighter on dark, deeper on light,
   so accent-coloured TEXT clears WCAG AA while filled buttons keep the brand colour. */
:root{--accent-t:color-mix(in srgb,var(--accent) 70%,#fff)}
html[data-theme="dark"]{--accent-t:color-mix(in srgb,var(--accent) 70%,#fff)}
html[data-theme="light"]{--accent-t:color-mix(in srgb,var(--accent) 88%,#000)}
@media (prefers-color-scheme: light){:root{--accent-t:color-mix(in srgb,var(--accent) 88%,#000)}}
.kicker,.tbback,.lcgo,.conttag,.revcount,.notehd,.rbhead,.pcseal,.vistitle,.qmulti,.flabel,
.kcheck .qhead,.callout.tip .lbl,.ccard .go,.pagetop .pos,.lesson h4,.brand span,.storeprice,
.rvtag,.secttitle a,.cattag,.certd,.anlist li::marker,.libtitle:hover{color:var(--accent-t)}
.cattag{background:color-mix(in srgb,var(--accent) 15%,transparent)}
a{color:var(--accent-t)}
/* tap targets — Apple HIG asks for ~44px on primary controls */
.tbback{display:inline-flex;align-items:center;min-height:44px;padding:6px 8px 6px 0}
.chip{min-height:40px;display:inline-flex;align-items:center;justify-content:center}
.storebtn{min-height:44px;padding-left:18px;padding-right:18px}
.stbtn{min-height:40px}
.navclose{width:40px;height:40px}
.lcgo{display:inline-flex;align-items:center;min-height:44px;padding:0 2px}
.macstart{min-height:44px;display:inline-flex;align-items:center;justify-content:center}
/* keeps the 44px hit area the base rule establishes, with the tighter
   optical spacing the compact card wants */
.libcard.compact .libtitle{padding:13px 0 11px;margin:-9px 0 -9px}
.resetbtn{min-height:40px}
.collhead{min-height:48px}
/* small-label legibility */
.stinfo small,.goalring span{font-size:11.5px}
.cattag,.mtag,.storeauth{font-size:11.5px}
.trmeta,.libcard.compact .libmods{font-size:13px}
/* settings + secondary controls */
/* one place, one value — these had been drifting below 44 individually */
.segbtn{min-height:44px}
.swatch{width:46px;height:46px}
.swatch span{width:26px;height:26px}
.minibtn{min-height:44px}
/* the native disclosure triangle is the last piece of platform furniture in an
   app that draws everything else itself */
.cardcollapse summary{min-height:44px;display:flex;align-items:center;gap:8px;list-style:none}
.cardcollapse summary::-webkit-details-marker{display:none}
.cardcollapse summary::before{content:"";width:14px;height:14px;flex:0 0 auto;
  background:currentColor;transition:transform .16s;
  -webkit-mask:var(--chevmask) center/contain no-repeat;mask:var(--chevmask) center/contain no-repeat}
.cardcollapse[open] summary::before{transform:rotate(90deg)}
:root{--chevmask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 5.5 7 6.5-7 6.5'/%3E%3C/svg%3E")}
@media (prefers-reduced-motion:reduce){.cardcollapse summary::before{transition:none}}
/* locked modules stay legible while still reading as locked */
.modcard.locked{opacity:.82}
/* course-accent text is set inline from course data; nudge it darker on light
   backgrounds so it clears AA without touching the stripe/fill colours */
.phpos{color:var(--accent-t)}
/* ===== collegiate assessment engine ===== */
/* math */
math{font-size:1em}
.formula{margin:16px 0;padding:14px 16px;background:var(--panel2);border:1px solid var(--hairline);border-left:3px solid var(--accent);border-radius:0 12px 12px 0;overflow-x:auto;text-align:center}
.formula math{display:block;font-size:1.13em}
.formula[data-label]::before{content:attr(data-label);display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent-t);margin-bottom:8px;text-align:left}
/* difficulty + written badges */
.qdiff{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:999px;margin-left:6px;vertical-align:middle}
.qdiff.d2{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent-t)}
.qdiff.d3{background:color-mix(in srgb,var(--bad) 18%,transparent);color:var(--bad)}
.qmulti.wr{background:color-mix(in srgb,var(--accent2) 16%,transparent);color:var(--accent2-t)}
/* scenario / case sets */
.qcase{border:1px solid var(--hairline);border-radius:14px;padding:16px 16px 6px;margin:18px 0;background:var(--panel);box-shadow:var(--edge),var(--shadow)}
.csbadge{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent-t);background:color-mix(in srgb,var(--accent) 13%,transparent);padding:3px 10px;border-radius:999px;margin-bottom:10px}
.csstem{font-size:15px;line-height:1.6;padding-bottom:14px;margin-bottom:6px;border-bottom:1px solid var(--line)}
/* numeric */
.numwrap{display:flex;flex-direction:row;align-items:center;gap:10px}
.qnum{max-width:230px}
.qunit{font-size:15px;font-weight:700;color:var(--muted)}
.qhint{font-size:13px;color:var(--muted);margin:8px 0 0;font-style:italic}
/* ordering */
.ordlist{display:flex;flex-direction:column;gap:9px}
.orditem{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:1px solid var(--hairline);background:var(--panel2);color:var(--ink);border-radius:14px;padding:12px 14px;font-family:inherit;font-size:15px;cursor:pointer;min-height:48px}
.orditem:hover:not(:disabled){border-color:var(--accent)}
.orditem .ordnum{flex:0 0 auto;width:26px;height:26px;border-radius:50%;border:2px dashed var(--line);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--muted)}
.orditem.set .ordnum{border:0;background:var(--accent-solid);color:#fff}
.orditem.set{border-color:var(--accent)}
.orditem.ok{border-color:var(--accent2);background:color-mix(in srgb,var(--accent2) 12%,transparent)}
.orditem.no{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,transparent)}
.orditem:disabled{cursor:default}
/* matching */
.mcols{display:flex;gap:10px}
.mcol{flex:1;display:flex;flex-direction:column;gap:9px;min-width:0}
.mchl,.mchr{width:100%;text-align:left;border:1px solid var(--hairline);background:var(--panel2);color:var(--ink);border-radius:14px;padding:11px 12px;font-family:inherit;font-size:13px;cursor:pointer;min-height:48px;line-height:1.35}
.mchl:hover:not(:disabled),.mchr:hover:not(:disabled){border-color:var(--accent)}
.mchl.sel{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent)}
.mchl.paired{border-color:var(--accent)}
.mpin{display:block;font-size:11.5px;font-weight:700;color:var(--accent-t);margin-top:5px}
.mchl.ok{border-color:var(--accent2);background:color-mix(in srgb,var(--accent2) 12%,transparent)}
.mchl.no{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,transparent)}
.mchl:disabled,.mchr:disabled{cursor:default}
/* written / free response */
.qfree{width:100%;border:1px solid var(--hairline);border-radius:14px;background:var(--panel);color:var(--ink);padding:12px 14px;font-family:inherit;font-size:15px;line-height:1.55;box-sizing:border-box;resize:vertical}
.qfree:focus{outline:none;border-color:var(--accent)}
.freemodel{display:none;margin-top:12px;border:1px solid var(--hairline);border-left:3px solid var(--accent2);border-radius:0 12px 12px 0;background:var(--panel2);padding:13px 15px}
.q.revealed .freemodel{display:block}
.fmhead{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--accent2-t);margin-bottom:6px}
.fmbody{font-size:15px;line-height:1.6}
.fmpoints{margin:10px 0 0;padding-left:18px}
.fmpoints li{font-size:13px;line-height:1.5;margin:4px 0}
.fmself{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.fmq{font-size:13px;font-weight:700;color:var(--muted);width:100%}
.fmbtn{flex:1;min-width:96px;min-height:44px;border:1px solid var(--hairline);background:var(--panel);color:var(--ink);border-radius:14px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}
.fmbtn:hover:not(:disabled){border-color:var(--accent)}
.fmbtn.on{background:var(--accent);border-color:var(--accent);color:#fff}
.fmbtn:disabled{opacity:.55;cursor:default}
.fmbtn.on:disabled{opacity:1}
/* timer */
.qtimer{position:sticky;top:64px;z-index:9;display:inline-flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--hairline);border-radius:999px;padding:8px 15px;margin-bottom:14px;box-shadow:var(--edge),var(--shadow);font-weight:700}
.qtico{font-size:15px}
.qtval{font-size:15px;font-variant-numeric:tabular-nums}
.qtlbl{font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.qtimer.low{border-color:var(--warn);color:var(--warn)}
.qtimer.up{border-color:var(--bad);color:var(--bad)}
.qbanner.pend{background:color-mix(in srgb,var(--accent) 12%,transparent);border-color:var(--accent)}
/* module pacing */
.weekpill{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--accent-t);background:color-mix(in srgb,var(--accent) 13%,transparent);padding:3px 10px;border-radius:999px;margin-right:8px}
.modhours{font-size:13px;color:var(--muted);font-weight:700}
/* ---- specialization detail page ---- */
.tkabout{margin:18px 0}
.tkabouttxt{font-size:15px;line-height:1.65;color:var(--ink);margin:0;opacity:.92}
.tkoutcomes{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px}
.tkoutcomes li{position:relative;padding-left:26px;font-size:15px;line-height:1.5}
.tkoutcomes li::before{content:"";position:absolute;left:4px;top:.5em;width:9px;height:5px;border:solid var(--accent-t);border-width:0 0 2px 2px;transform:rotate(-45deg)}
.careergrid{display:flex;flex-direction:column;gap:9px}
.career{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:13px 15px;box-shadow:var(--edge),var(--shadow);background-image:var(--sheen);background-repeat:no-repeat}
.crole{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:700;margin-bottom:4px}
.cdot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}
.cdesc{font-size:13px;line-height:1.55;color:var(--muted)}
.trow.instore{border-style:dashed}
.trow.instore .trtitle{color:var(--ink)}
/* ---- empty library state ---- */
.emptylib{text-align:center;background:var(--panel);border:1px dashed var(--line);border-radius:14px;padding:30px 22px;margin:4px 0 10px}
.elico{color:var(--accent-t);display:flex;justify-content:center;margin-bottom:10px}
.elico .nvic{width:30px;height:30px}
.elbig{font-size:17px;font-weight:700;margin-bottom:6px}
.emptylib .sub{font-size:15px;margin:0 auto 16px;max-width:34ch}
.emptylib .btn{display:inline-block;background:var(--accent-solid);color:#fff;border:0;font-weight:800;font-size:15px;padding:12px 22px;border-radius:14px;box-shadow:var(--e1),0 6px 16px -6px var(--glow)}
.emptylib .btn:hover{filter:brightness(1.06)}
/* success/teal used as TEXT needs the same treatment as the accent */
:root{--accent2-t:color-mix(in srgb,var(--accent2) 88%,#fff)}
html[data-theme="dark"]{--accent2-t:color-mix(in srgb,var(--accent2) 88%,#fff)}
html[data-theme="light"]{--accent2-t:color-mix(in srgb,var(--accent2) 74%,#000)}
@media (prefers-color-scheme: light){:root{--accent2-t:color-mix(in srgb,var(--accent2) 74%,#000)}}
/* frost — streak freezes. Ice blue reads beautifully on dark and illegibly on
   light, so it gets the same two-tone treatment as the accent. */
:root{--frost:#6cc4f5}
html[data-theme="dark"]{--frost:#6cc4f5}
html[data-theme="light"]{--frost:#0b6a99}
@media (prefers-color-scheme: light){:root{--frost:#0b6a99}}
.certd,.macstat,.tkdone,.storeprice,.scoretag.pass,.scoretag.pass b,.term,.analogy b,
.restitle,.acclesson.done,.acclesson.quizrow.done,.modcard.isdone .macstat{color:var(--accent2-t)}
.macnum{color:var(--accent-t)}
.macsub,.maclock{color:var(--muted)}
/* course accent comes from course data; expose it as a var so light mode can deepen it */
.landinghero .kicker{color:var(--ca,var(--accent-t))}
html[data-theme="light"] .landinghero .kicker{color:color-mix(in srgb,var(--ca,var(--accent)) 76%,#000)}
@media (prefers-color-scheme: light){html:not([data-theme]) .landinghero .kicker{color:color-mix(in srgb,var(--ca,var(--accent)) 76%,#000)}}
`;

const PATHS_CSS=`
/* =========================================================================
   Design your learning — modules that stand alone, and paths you build.
   ========================================================================= */
.mhero .cheroin .kicker,.phero .cheroin .kicker{opacity:.9}
/* the offer to take one module without the other thirty-four hours */
.soloffer{background:linear-gradient(180deg,color-mix(in srgb,var(--ga) 10%,var(--panel)),var(--panel));
  border:1px solid color-mix(in srgb,var(--ga) 40%,var(--hairline));border-radius:14px;
  padding:16px 18px 14px;margin:14px 0;box-shadow:var(--edge),var(--shadow)}
.sofhead b{font-size:17px;font-weight:700;color:var(--ink)}
.sofbody{margin:6px 0 12px;font-size:15px;line-height:1.5;color:var(--muted)}
.sofbody em{color:var(--ink);font-style:normal;font-weight:700}
.sofbtn{width:100%;min-height:48px;border:0;border-radius:14px;cursor:pointer;
  background:var(--cta,var(--accent-solid));color:#fff;font-size:17px;font-weight:800;font-family:inherit}
.soflink{display:block;text-align:center;margin-top:8px;font-size:13px;font-weight:700;
  color:var(--muted);text-decoration:none;min-height:44px;line-height:44px}
.soflink:hover{color:var(--ink)}
.acclock a{color:var(--accent-t);font-weight:700}
.macstart.solo{background:var(--pill);color:var(--muted)}
.macstart.solo:hover{background:var(--panel3);color:var(--ink)}
/* why this module is open to you */
.modwhy{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700;color:var(--muted);
  background:var(--panel2);border:1px solid var(--hairline);border-radius:14px;padding:10px 14px;margin:0 0 12px}
.modwhy a{color:var(--accent-t);text-decoration:none}
.mwdot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}
/* ---- the design hub ---- */
.dshero{padding:4px 0 0;margin-bottom:16px}
.dshero h1{font-size:27px;font-weight:800;letter-spacing:-.4px;margin:2px 0 6px}
.dshero .sub{font-size:15px;line-height:1.55;color:var(--muted);margin:0;max-width:56ch}
.newpath{display:flex;gap:8px;margin:0 0 16px}
.npin{flex:1;min-width:0;min-height:48px;border-radius:14px;border:1px solid var(--line);
  background:var(--panel2);color:var(--ink);padding:0 14px;font-size:17px;font-family:inherit}
.npin::placeholder{color:var(--muted)}
.npin:focus{outline:2px solid var(--accent);outline-offset:1px}
.npbtn{flex:0 0 auto;min-height:48px;padding:0 20px;border:0;border-radius:14px;cursor:pointer;
  background:var(--accent-solid);color:#fff;font-size:15px;font-weight:800;font-family:inherit}
.dsempty{background:var(--panel2);border:1px dashed var(--line);border-radius:14px;padding:16px 18px;margin-bottom:16px}
.dsempty p{margin:0;font-size:15px;line-height:1.55;color:var(--muted)}
/* a path, as a card */
.pathgrid{display:flex;flex-direction:column;gap:10px}
.pathcard{gap:14px;background:var(--panel);border-radius:14px;padding:14px;box-shadow:var(--edge),var(--shadow);background-image:var(--sheen);background-repeat:no-repeat;transition:transform .16s,border-color .16s}
.pathcard:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--ga) 45%,var(--hairline))}
.ring{flex:0 0 auto;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}
.ring::after{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--panel)}
.ring i{position:relative;z-index:1;font-style:normal;font-size:13px;font-weight:700;color:var(--ink)}
.pcmeta{flex:1;min-width:0}
.pcmeta b{display:block;font-size:17px;font-weight:700;color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pcmeta small{display:block;margin-top:3px;font-size:13px;font-weight:600;color:var(--muted)}
/* the lure shown when no path exists yet — one row, not an empty screen */
.dslure{gap:13px;margin:14px 0;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 9%,var(--panel)),var(--panel));border:1px solid color-mix(in srgb,var(--accent) 32%,var(--hairline));border-radius:14px;padding:13px 15px;box-shadow:var(--edge),var(--shadow)}
.dsico{flex:0 0 auto;width:38px;height:38px;border-radius:14px;background:var(--accent-solid);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:17px}
.dstxt2{flex:1;min-width:0}
.dstxt2 b{display:block;font-size:15px;font-weight:700;color:var(--ink)}
.dstxt2 small{display:block;margin-top:2px;font-size:13px;font-weight:600;color:var(--muted);line-height:1.4}
/* module catalogue, grouped by course */
.dsgrp{border:1px solid var(--hairline);border-radius:14px;background:var(--panel);margin-bottom:8px;overflow:hidden}
.dsgs{display:flex;align-items:center;gap:10px;padding:0 14px;min-height:56px;cursor:pointer;list-style:none}
.dsgs::-webkit-details-marker{display:none}
.dsgs:hover{background:var(--panel2)}
.dgdot{flex:0 0 auto;width:9px;height:9px;border-radius:50%}
.dgname{flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dgcount{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--muted);
  background:var(--pill);border-radius:999px;padding:4px 9px}
.dgcount.on{background:var(--accent-solid);color:#fff}
.dgchev{flex:0 0 auto;color:var(--muted);font-size:11.5px;transition:transform .16s}
.dsgrp[open] .dgchev{transform:rotate(180deg)}
.dsgb{padding:2px 10px 10px}
.dsc{margin-bottom:14px}
.dscname{font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 7px 2px}
.dsmod{gap:11px;border-radius:14px;padding:10px 12px;margin-bottom:6px;min-height:56px;cursor:pointer}
.dsmod:hover{background:var(--panel3)}
.dsmod.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel2))}
.dsnum{flex:0 0 auto;width:26px;height:26px;border-radius:10px;background:var(--pill);color:var(--muted);
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.dstxt{flex:1;min-width:0}
.dstxt b{display:block;font-size:15px;font-weight:700;color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dstxt small{display:block;margin-top:2px;font-size:11.5px;font-weight:600;color:var(--muted)}
.dsdone{flex:0 0 auto;color:var(--accent2);font-weight:700;font-size:15px}
/* path picker rows */
.pathpick{display:flex;flex-direction:column;gap:7px}
.pprow{gap:11px;border-radius:14px;padding:10px 12px;min-height:56px;cursor:pointer}
.pprow.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel2))}
.ppbox{flex:0 0 auto;width:26px;height:26px;border-radius:10px;background:var(--pill);color:var(--muted);
  display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700}
.pprow.on .ppbox,.dsmod.on .ppbox{background:var(--accent-solid);color:#fff}
.pptxt{flex:1;min-width:0}
.pptxt b{display:block;font-size:15px;font-weight:700;color:var(--ink)}
.pptxt small{display:block;margin-top:2px;font-size:11.5px;font-weight:600;color:var(--muted)}
.ppempty{margin:0 0 10px;font-size:15px;line-height:1.55;color:var(--muted)}
.ppnew{display:block;margin-top:10px;text-align:center;min-height:44px;line-height:44px;
  border-radius:14px;background:var(--pill);color:var(--ink);text-decoration:none;font-size:15px;font-weight:700}
.ppnew:hover{background:var(--panel3)}
/* ordered rows inside a path */
.pedit{display:flex;justify-content:flex-end;margin:-4px 0 8px}
.pedbtn{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 14px;
  border:1px solid var(--hairline);border-radius:14px;background:var(--panel2);color:var(--muted);
  font-size:13px;font-weight:700;font-family:inherit;cursor:pointer}
.pedbtn .gi{width:15px;height:15px}
.pedbtn:hover{background:var(--panel3);color:var(--ink)}
.pedbtn.on{background:var(--accent-solid);border-color:transparent;color:#fff}
.prchev{flex:0 0 auto;color:var(--muted);font-size:20px;padding-right:6px}
.prow.editing{padding-right:6px}
.prow{gap:8px;border-radius:14px;padding:8px 10px 8px 12px;margin-bottom:7px}
.prow.done{border-color:color-mix(in srgb,var(--accent2) 40%,var(--hairline))}
.prmain{flex:1;min-width:0;display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit;min-height:48px}
.prnum{flex:0 0 auto;width:28px;height:28px;border-radius:10px;display:flex;align-items:center;
  justify-content:center;font-size:13px;font-weight:700}
.prtxt{flex:1;min-width:0}
.prtxt b{display:block;font-size:15px;font-weight:700;color:var(--ink);line-height:1.3;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.prtxt small{display:block;margin-top:2px;font-size:11.5px;font-weight:600;color:var(--muted);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prow:not(.editing) .prtxt b{-webkit-line-clamp:2}
.prctl{flex:0 0 auto;display:flex;gap:2px}
.prb{width:44px;height:44px;border:0;border-radius:10px;background:transparent;color:var(--muted);
  font-size:17px;font-weight:700;cursor:pointer;font-family:inherit}
.prb:hover:not(:disabled){background:var(--panel3);color:var(--ink)}
.prb:disabled{opacity:.28;cursor:default}
.prb.del:hover{background:color-mix(in srgb,var(--bad) 22%,transparent);color:var(--bad)}
@media(min-width:760px){
  .pathgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
}
`;

const TUTOR_CSS=`
/* =========================================================================
   Explain this — a bottom sheet, because the lesson underneath is the context.
   ========================================================================= */
#tutor{position:fixed;inset:0;z-index:140;display:none}
#tutor.open{display:block}
.tvscrim{position:absolute;inset:0;background:rgba(0,0,0,.55);
  -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.tvsheet{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;
  max-height:min(86vh,86dvh);background:var(--panel);border-top:1px solid var(--hairline);
  border-radius:20px 20px 0 0;box-shadow:var(--e3);
  padding-bottom:env(safe-area-inset-bottom,0px)}
@media(min-width:760px){
  .tvsheet{left:50%;right:auto;transform:translateX(-50%);width:640px;border-radius:20px;
    bottom:24px;border:1px solid var(--hairline)}
}
.tvbar{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 18px;
  border-bottom:1px solid var(--hairline)}
.tvttl{flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tvx{flex:0 0 auto;width:44px;height:44px;border:0;border-radius:14px;cursor:pointer;
  background:var(--panel2);color:var(--ink);font-size:17px;display:flex;align-items:center;justify-content:center}
.tvbody{flex:1;min-height:96px;overflow:auto;-webkit-overflow-scrolling:touch;padding:14px 18px 4px}
.tvhint{font-size:15px;line-height:1.55;color:var(--muted);margin-bottom:12px}
.tvchips{display:flex;flex-wrap:wrap;gap:8px}
.tvchip{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--line);
  background:var(--panel2);color:var(--ink);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
.tvchip:hover{background:var(--panel3);border-color:var(--accent)}
.tvturn{border-radius:14px;padding:12px 14px;margin-bottom:10px;font-size:15px;line-height:1.6}
.tvturn.you{background:var(--pill);color:var(--ink);font-weight:700}
.tvturn.ai{background:var(--panel2);border:1px solid var(--hairline);color:var(--ink)}
.tvturn.ai p{margin:0 0 10px}
.tvturn.ai p:last-child{margin-bottom:0}
.tvturn.ai.wait{color:var(--muted);font-style:italic}
.tvturn.ai.err{border-color:color-mix(in srgb,var(--bad) 50%,var(--hairline));color:var(--bad)}
.tvask{flex:0 0 auto;display:flex;gap:8px;padding:10px 14px 6px;align-items:flex-end}
.tvq{flex:1;min-width:0;resize:none;border-radius:14px;border:1px solid var(--line);
  background:var(--panel2);color:var(--ink);padding:11px 13px;font-size:17px;font-family:inherit;line-height:1.4}
.tvq:focus{outline:2px solid var(--accent);outline-offset:1px}
.tvgo{flex:0 0 auto;min-width:72px;min-height:48px;border:0;border-radius:14px;cursor:pointer;
  background:var(--accent-solid);color:#fff;font-size:15px;font-weight:700;font-family:inherit}
.tvgo:disabled{opacity:.6;cursor:default}
.tvnote{margin:0;padding:0 18px 12px;font-size:11.5px;font-weight:600;color:var(--muted)}
/* how far through a lesson you are */
.readbar{position:fixed;left:0;right:0;top:0;height:2px;z-index:60;
  background:transparent;opacity:0;transition:opacity .2s}
.readbar.on{opacity:1}
.readbar i{display:block;height:100%;width:0;border-radius:0 2px 2px 0;
  background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .12s linear}
@media(prefers-reduced-motion:reduce){.readbar i{transition:none}}
/* the lesson-page button */
.stbtn.tutb{color:var(--accent-t)}
/* settings */
.setrow.col{flex-direction:column;align-items:stretch;gap:7px}
.setinput{width:100%;box-sizing:border-box;min-height:48px;border-radius:14px;border:1px solid var(--line);
  background:var(--panel2);color:var(--ink);padding:0 13px;font-size:17px;font-family:inherit}
.setinput:focus{outline:2px solid var(--accent);outline-offset:1px}
.airow{display:flex;gap:8px}
.aion{color:var(--accent2);font-weight:700}
.setsub{font-size:11.5px;font-weight:600;color:var(--muted)}
.aistatus{font-size:13px;font-weight:700;padding:0 2px}
.aistatus:not(:empty){padding:8px 2px 2px}
.aistatus.ok{color:var(--accent2)}
.aistatus.err{color:var(--bad)}
/* Warning-coloured body text measured 3.13:1. A warning has to be readable to
   be a warning, so the colour moved to a rule and the text stays at full ink. */
.setnote.warn{color:var(--ink);border-left:3px solid var(--warn);padding-left:11px;margin-top:10px}
`;

const RW_CSS=`
/* =========================================================================
   Rewards — the mark is a snake closing a circle, so the page is made of rings.
   ========================================================================= */
.snkring{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
/* > svg, not any svg: a glyph nested inside the ring was being caught by this and
   absolutely positioned into the corner of a zero-width box. */
.snkring > svg{position:absolute;inset:0;width:100%;height:100%}
.snkin{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;line-height:1.05;text-align:center}
.snkin b{font-size:20px;font-weight:800;color:var(--ink)}
.snkin small{font-size:11.5px;font-weight:700;color:var(--muted);margin-top:2px}
.snkring.big .snkin b{font-size:27px;letter-spacing:-.5px}
.snkring.big .snkin small{font-size:11.5px;margin-top:3px}
/* the sizes the one ring is used at */
.snkring.tbr{margin-right:1px}
.snkring.cr .snkin b{font-size:15px}
.snkring.cr .snkin small{font-size:11.5px}
.snkring.gl .snkin b{font-size:17px;display:flex;align-items:baseline;gap:1px}
.snkring.gl .snkin b i{font-style:normal;font-size:11.5px;font-weight:800;color:var(--muted)}
.snkring.pc .snkin b{font-size:13px;font-weight:800;color:var(--ink)}
.snkring.rr .snkin b{font-size:13px}
.snkring.mst .snkin b{font-size:15px}
.snkring.mst.lo .snkin b{color:var(--muted)}
.snkring .snkin b.rl{font-size:13px}
.snkring.shut svg{filter:drop-shadow(0 0 7px color-mix(in srgb,var(--accent) 55%,transparent))}
/* the hero */
.rwhero{position:relative;overflow:hidden;background:linear-gradient(165deg,var(--panel2),var(--panel));
  border:1px solid var(--hairline);border-radius:20px;padding:20px 18px 16px;margin-bottom:14px;
  box-shadow:var(--edge),var(--shadow);text-align:center}
.rwhero::before{content:"";position:absolute;left:50%;top:-52%;width:120%;height:150%;
  transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 20%,transparent),transparent 72%);
  opacity:.65}
.rwhero.met::before{opacity:1}
.rwring{position:relative;display:flex;justify-content:center;margin-bottom:12px}
.rwsay{position:relative;margin-bottom:16px}
.rwsay b{display:block;font-size:17px;font-weight:800;color:var(--ink);letter-spacing:-.2px}
.rwsay span{display:block;margin-top:4px;font-size:13px;font-weight:600;color:var(--muted);line-height:1.45}
.rwstats{position:relative;display:flex;gap:8px}
.rwstat{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px;
  min-height:74px;justify-content:center;text-decoration:none;color:inherit;
  background:var(--panel3);border:1px solid var(--hairline);border-radius:14px;padding:8px 4px}
a.rwstat:hover{border-color:var(--accent)}
.rwsico{font-size:17px;line-height:1;display:flex;align-items:center;justify-content:center;height:18px}
.rwsico svg{width:16px;height:16px}
.rwstat b{font-size:17px;font-weight:700;color:var(--ink)}
.rwstat small{font-size:11.5px;font-weight:700;color:var(--muted);text-align:center;line-height:1.2}
/* quest tiles */
.qtiles{display:flex;flex-direction:column;gap:9px}
.qtile{gap:13px;border-radius:14px;padding:11px 14px 11px 11px}
.qtile.done{border-color:color-mix(in srgb,var(--accent2) 45%,var(--hairline));
  background:color-mix(in srgb,var(--accent2) 8%,var(--panel2))}
.qtico{font-size:20px;line-height:1}
.qtmid{flex:1;min-width:0}
.qtmid b{display:block;font-size:15px;font-weight:700;color:var(--ink);line-height:1.3}
.qtmid small{display:block;margin-top:3px;font-size:11.5px;font-weight:700;color:var(--muted)}
.qtxp{flex:0 0 auto;font-size:13px;font-weight:700;color:var(--muted);
  background:var(--pill);border-radius:999px;padding:5px 10px}
.qtxp.won{background:var(--accent2);color:#fff}
/* badge medallions */
.bsub{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
  color:var(--muted);margin:2px 0 8px 2px}
.bsub+.bgrid{margin-bottom:16px}
.bmring{position:absolute;inset:1px;display:flex;align-items:center;justify-content:center}
.bmring .snkring svg circle:first-child{stroke:transparent}
.bmnear{color:var(--accent-t)!important;font-weight:700!important;opacity:1!important}
.bgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.bmed{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;
  background:var(--panel2);border:1px solid var(--hairline);border-radius:14px;padding:13px 8px 11px}
.bmdisc{position:relative;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;background:var(--pill);border:1px solid var(--hairline)}
.bmed.got .bmdisc{background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 40%,var(--panel3)),var(--panel3));
  border-color:color-mix(in srgb,var(--accent) 55%,var(--hairline));
  box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 14%,transparent)}
.bmico{font-size:20px;line-height:1;filter:grayscale(1);opacity:.35}
.bmed.got .bmico{filter:none;opacity:1}
.bmlock{position:absolute;right:-2px;bottom:-2px;font-size:11.5px;background:var(--panel);
  border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;
  border:1px solid var(--hairline)}
.bmed b{font-size:11.5px;font-weight:700;color:var(--muted);line-height:1.25}
.bmed.got b{color:var(--ink)}
.bmed small{font-size:11.5px;font-weight:600;color:var(--muted);line-height:1.3;opacity:.85;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* the "how this works" fold */
.inote{margin-top:12px;border-top:1px solid var(--hairline);padding-top:10px}
.inote summary{display:flex;align-items:center;gap:8px;list-style:none;cursor:pointer;
  min-height:44px;font-size:13px;font-weight:700;color:var(--muted)}
.inote summary::-webkit-details-marker{display:none}
.ini{width:20px;height:20px;flex:0 0 auto;border-radius:50%;background:var(--pill);color:var(--muted);
  display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;font-style:italic}
.inote[open] .ini{background:var(--accent-solid);color:#fff}
.inote p{margin:6px 0 2px;font-size:13px;line-height:1.6;color:var(--muted)}
@media(min-width:560px){
  .bgrid{grid-template-columns:repeat(4,1fr)}
}
@media(min-width:760px){
  .rwhero{display:grid;grid-template-columns:auto 1fr;grid-template-areas:"ring say" "ring stats";
    text-align:left;gap:6px 22px;padding:22px 24px;align-items:center}
  .rwring{grid-area:ring;margin:0}
  .rwsay{grid-area:say;margin:0}
  .rwstats{grid-area:stats;margin-top:12px}
  .bgrid{grid-template-columns:repeat(5,1fr)}
}
`;

const ICON_CSS=`
/* =========================================================================
   One icon system: 24-grid, 1.7px stroke, currentColor. Every glyph inherits
   the size of whatever it sits in, so a rank chip and a badge medallion are the
   same drawing at two sizes rather than two drawings.
   ========================================================================= */
.gi{width:1em;height:1em;display:block;flex:0 0 auto;overflow:visible}
.tbrk .gi{width:17px;height:17px}
.rkicon .gi{width:24px;height:24px}
.rkdot .gi{width:17px;height:17px}
.rwsico .gi{width:19px;height:19px}
.qtico .gi{width:22px;height:22px}
.bmico .gi{width:24px;height:24px}
.bmlock .gi{width:11px;height:11px}
.pkico .gi,.rwico .gi,.arico .gi,.lfico .gi,.frzico .gi{width:20px;height:20px}
.sgico .gi{width:24px;height:24px}
.qlink .gi,.lockicon .gi,.combotag .gi,.wcfrz .gi{width:16px;height:16px}
.ccard .num .gi{width:20px;height:20px}
.stbtn .gi{width:16px;height:16px}
.hintbtn .gi,.pbpeek .gi,.peekhd .gi,.setval .gi{width:15px;height:15px}
/* anything that holds a glyph beside text lines them up on the text baseline */
.qlink,.lockicon,.combotag,.wcfrz,.stbtn,.hintbtn,.pbpeek,.pbtok,.setval,.peekhd b,.rvtitle{
  display:inline-flex;align-items:center;gap:7px}
.rkicon,.rkdot,.rwsico,.qtico,.bmico,.bmlock,.pkico,.rwico,.arico,.lfico,.frzico,.sgico,.tbrk{
  display:inline-flex;align-items:center;justify-content:center}
/* the medallions carry colour through the stroke rather than through a picture */
.bmed.got .bmico{color:var(--accent);opacity:1;filter:none}
.bmico{color:var(--muted);opacity:.5;filter:none}
.frzico{color:var(--accent2)}
.frzico.dim{color:var(--muted);opacity:.55}
.arico{color:var(--warn)}
.sgico{color:var(--accent)}
/* inside a course, module or path, accents come from that thing's own colour */
.oncourse .sgico,.oncourse .qlink .gi,.oncourse .modwhy a,.oncourse .acclock a{color:var(--gk,var(--accent))}
.oncourse .prnum{color:inherit}
/* One accent per screen: the primary action is coloured, everything else is quiet.
   Rows of coloured buttons made the eye pick between six equals. */
.oncourse .macnum{color:var(--gk,var(--accent))}
.oncourse .pip.done{background:linear-gradient(90deg,var(--ga),var(--gk))}
.oncourse .crbar i,.oncourse .trbar i{background:var(--gk)}
.modcard.isdone .macnum{background:var(--accent2);color:#fff}
/* "Passed" measured 2.61:1 on light — the raw accent2 is a fill colour, not a
   text colour. The -t tokens exist precisely for this. */
.modcard.isdone .macstat{color:var(--accent2-t)}
.qtico{color:var(--muted)}
.qtile.done .qtico{color:var(--accent2)}
.rkdot{color:var(--muted)}
.rkstep.got .rkdot{color:var(--accent)}
.rkstep.cur .rkdot{color:var(--accent)}
.rkicon{color:var(--accent)}
.navav .gi{width:18px;height:18px}
.bmkico .gi,.savedico .gi{width:16px;height:16px}
.stbtn.bmk.on .bmkico .gi{fill:currentColor}
.savedico .gi{fill:currentColor}
.navav{display:inline-flex;align-items:center;justify-content:center}
.flamegi{width:19px;height:19px;color:var(--muted)}
.flame.lit .flamegi,.rwstat .flamegi{color:var(--warn)}
/* a quest that has not started shows a filled disc, not an empty circle that
   reads as a ring someone forgot to draw */
.qtile .snkring::before{content:"";position:absolute;inset:6px;border-radius:50%;
  background:var(--pill);z-index:0}
.qtile.done .snkring::before{background:color-mix(in srgb,var(--accent2) 22%,var(--panel2))}
.qtile .snkin{z-index:1}
.tbs.flame.lit .flamegi{color:var(--warn)}
.rwsico{color:var(--muted)}
a.rwstat:hover .rwsico{color:var(--accent)}
`;

const MOTION_CSS=`
/* =========================================================================
   Motion. Four things move, all under 260ms, all switched off for anyone who
   asked for less. Nothing moves that the user did not just cause.
   ========================================================================= */
/* the ring draws itself once, on arrival */
@keyframes snkdraw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
/* > svg only: a quest tile puts a glyph inside the ring, and without this the
   icon draws itself on every render too */
.snkring:not(.tiny) > svg path{stroke-dasharray:var(--len,300);stroke-dashoffset:0;
  animation:snkdraw .62s cubic-bezier(.22,.75,.3,1) both}
.snkring:not(.tiny) > svg circle:not(:first-child){animation:snkpop .3s .34s both}
@keyframes snkpop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.snkring > svg circle:not(:first-child){transform-box:fill-box;transform-origin:center}
/* rows settle after a reorder rather than teleporting */
@keyframes rowin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.prow{animation:rowin .22s ease both}
/* the sheet springs up */
@keyframes sheetup{from{tran.prow{animation:rowin .22s ease both}transform:none;opacity:1}}
#tutor.open .tvsheet{animation:sheetup .26s cubic-bezier(.2,.8,.25,1) both}
#tutor.open .tvscrim{animation:fadein .2s both}
@keyframes fadein{from{opacity:0}to{opacity:1}}
/* the viewer fades in rather than appearing */
#figview.open{animation:fadein .18s both}
/* pressing something acknowledges the press */
.cgobtn,.sofbtn,.npbtn,.tvgo,.pedbtn,.chbtn,.macstart,.lcgo,.crgo{transition:transform .12s ease}
.cgo:active .cgobtn,.sofbtn:active,.npbtn:active,.tvgo:active,.pedbtn:active{transform:scale(.97)}
.pathcard:active,.libcard:active,.trow:active,.dsmod:active,.qtile:active{transform:scale(.995)}
/* the reachable copy of the primary action */
#stickygo{position:fixed;left:0;right:0;bottom:calc(var(--tabh,64px) + var(--tabgap,12px) * 2 + env(safe-area-inset-bottom,0px));
  z-index:70;padding:0 12px 10px;pointer-events:none;
  transform:translateY(130%);transition:transform .24s cubic-bezier(.2,.8,.25,1)}
#stickygo.on{transform:none}
.sgo{display:flex;align-items:center;gap:12px;pointer-events:auto;text-decoration:none;color:inherit;
  background:color-mix(in srgb,var(--panel) 94%,transparent);
  -webkit-backdrop-filter:saturate(180%) blur(18px);backdrop-filter:saturate(180%) blur(18px);
  border:1px solid var(--hairline);border-radius:14px;padding:8px 8px 8px 16px;
  box-shadow:var(--e3)}
.sgtxt{flex:1;min-width:0;font-size:13px;font-weight:700;color:var(--muted);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sgbtn{flex:0 0 auto;min-height:44px;display:flex;align-items:center;padding:0 18px;border-radius:14px;
  background:var(--cta,var(--accent-solid));color:#fff;font-size:15px;font-weight:800}
@media(min-width:1080px){#stickygo{display:none}}
@media (prefers-reduced-motion:reduce){
  .snkring > svg path,.snkring > svg circle,.prow,#tutor.open .tvsheet,#tutor.open .tvscrim,
  #figview.open{animation:none!important}
  #stickygo{transition:none}
  .cgo:active .cgobtn,.sofbtn:active,.npbtn:active,.tvgo:active,.pedbtn:active,
  .pathcard:active,.libcard:active,.trow:active,.dsmod:active,.qtile:active{transform:none}
}
`;

const ROW_CSS=`
/* =========================================================================
   One row.

   Fifteen variants of "lead, title, subtitle, trailing thing" each redeclared
   the same eight properties: display, align-items, gap, radius, padding,
   border, background, transition. They now share a base and keep only what is
   actually different about them, which is mostly colour and one or two sizes.
   ========================================================================= */
.row{display:flex;align-items:center;gap:12px;box-sizing:border-box;width:100%;
  min-height:62px;padding:11px 13px;border-radius:14px;
  background:var(--panel2);border:1px solid var(--hairline);
  color:inherit;text-decoration:none;text-align:left;font-family:inherit;
  transition:background .14s,border-color .14s,transform .14s}
a.row:hover,button.row:hover{background:var(--panel3)}
.row:active{transform:scale(.995)}
@media (prefers-reduced-motion:reduce){.row,.row:active{transition:none;transform:none}}
/* the three slots, for anything written from here on */
.rlead{flex:0 0 auto;display:flex;align-items:center;justify-content:center}
.rbody{flex:1;min-width:0}
.rtail{flex:0 0 auto;display:flex;align-items:center;gap:8px;color:var(--muted)}
/* titles and subtitles read the same everywhere they appear */
.rbody>b,.trbody .trtitle,.pcmeta b,.dstxt b,.prtxt b,.pptxt b,.mstmid b,.qtmid b,
.artxt b,.dstxt2 b,.ccard .meta b{
  display:block;font-size:15px;font-weight:700;color:var(--ink);line-height:1.3}
.rbody>small,.trbody .trmeta,.pcmeta small,.dstxt small,.prtxt small,.pptxt small,
.mstmid small,.qtmid small,.artxt small,.dstxt2 small,.ccard .meta small{
  display:block;margin-top:2px;font-size:13px;font-weight:600;color:var(--ink2);line-height:1.4}

`;

const DEPTH_CSS=`
/* =========================================================================
   Depth.

   Every icon sat on a flat fill, which reads as a placeholder rather than a
   made thing. One treatment, applied once: a light source at the top, a hairline
   of it caught on the upper edge, and a shadow underneath. Nothing is embossed
   and nothing is glossy — the depth is about a millimetre.
   ========================================================================= */
/* only things that already have a fill — a bare glyph given a gradient just looks
   like a grey box someone forgot to remove */
.dsico,.bmdisc,.macnum,.trnum,.prnum,.dsnum,.ppbox,.qtxp,.dgcount,.collcount,
.rkicon,.rkdot,.acli,.bmlock{
  background-image:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,0) 62%);
  box-shadow:var(--edge2), var(--e1);
}
html[data-theme="light"] .dsico,html[data-theme="light"] .bmdisc,
html[data-theme="light"] .macnum,html[data-theme="light"] .trnum,
html[data-theme="light"] .prnum,html[data-theme="light"] .dsnum,
html[data-theme="light"] .ppbox,html[data-theme="light"] .acli{
  background-image:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0) 70%);
  box-shadow:var(--edge2), var(--e1);
}
/* the accent-filled ones get the light source in their own colour */
.dsico,.trnum,.macnum.on,.sofbtn,.cgobtn,.sgbtn,.npbtn{
  background-image:linear-gradient(180deg,rgba(255,255,255,.17),rgba(255,255,255,0) 58%)}
.dsico{box-shadow:var(--edge3), 0 2px 6px color-mix(in srgb,var(--accent) 30%,transparent)}
/* an earned badge is a struck medal, not a coloured square */
.bmed.got .bmdisc{
  background-image:
    radial-gradient(120% 90% at 50% 6%,rgba(255,255,255,.20),rgba(255,255,255,0) 60%),
    linear-gradient(165deg,color-mix(in srgb,var(--accent) 46%,var(--panel3)),var(--panel3));
  box-shadow:var(--edge3),
             0 0 0 3px color-mix(in srgb,var(--accent) 13%,transparent),
             var(--e2)}
.bmed.got .bmico{filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
/* the quest disc, and any ring that holds a glyph */
.qtile .snkring::before{
  background-image:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0) 64%);
  box-shadow:var(--edge2)}
.qtile.done .snkring::before{
  box-shadow:var(--edge3)}
/* the ring itself catches a little light at its head */
.snkring:not(.tiny).shut > svg{filter:drop-shadow(0 0 7px color-mix(in srgb,var(--accent) 45%,transparent))}
/* buttons stop looking like flat rectangles */
.cgobtn,.sofbtn,.sgbtn,.npbtn,.chbtn,.rbdone{
  box-shadow:var(--edge3), var(--e2)}
.macchev,.prb,.azb,.tvx,.fvx,.pedbtn{box-shadow:var(--edge)}
@media (prefers-reduced-transparency:reduce){
  .dsico,.bmdisc,.macnum,.trnum,.prnum,.dsnum,.ppbox{background-image:none;box-shadow:none}
}
`;

const GLOSS_CSS=`
/* =========================================================================
   The glossary. 186 terms is a reference work, not a page you read top to
   bottom, so it gets the tools a reference work needs.
   ========================================================================= */
.glosswrap{padding-bottom:120px}
.glosstools{position:sticky;top:0;z-index:40;padding:14px 0 10px;margin:0 0 10px;
  background:linear-gradient(180deg,var(--bg) 76%,transparent)}
.glosstools .searchwrap{margin:0 0 8px}
/* the A-Z rail: full-height targets, scrolled sideways rather than squeezed
   into 15px each */
.azrail{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;
  -webkit-overflow-scrolling:touch;padding:1px 0 3px;scroll-snap-type:x proximity}
.azrail::-webkit-scrollbar{display:none}
.azb{flex:0 0 auto;width:44px;height:44px;border-radius:14px;border:1px solid var(--hairline);
  background:var(--panel2);color:var(--ink);font-size:15px;font-weight:700;font-family:inherit;
  cursor:pointer;scroll-snap-align:start;transition:background .14s,color .14s,opacity .14s}
.azb:hover{background:var(--panel3);border-color:var(--gk,var(--accent))}
.azb.off{opacity:.26;pointer-events:none}
/* letter groups, with the heading pinned while you read under it */
.gletter{margin:0 0 4px}
/* a whole panel for one character was heavier than the terms it labelled */
.glh{position:sticky;top:var(--topbarh,58px);z-index:20;margin:0;
  font-size:13px;font-weight:700;letter-spacing:.12em;color:var(--gk,var(--accent));
  padding:9px 2px 7px;border-bottom:1px solid var(--gk,var(--accent));
  background:color-mix(in srgb,var(--bg) 92%,transparent);
  -webkit-backdrop-filter:saturate(180%) blur(14px);backdrop-filter:saturate(180%) blur(14px)}
.gterm[hidden],.gletter[hidden]{display:none}
.gterm{padding:10px 2px 11px;border-bottom:1px solid var(--hairline)}
.gterm:last-child{border-bottom:0}
.gterm dt{font-size:15px;font-weight:700;color:var(--ink);margin:0 0 3px;
  display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
.gterm dd{margin:0;font-size:15px;line-height:1.55;color:var(--muted)}
.gterm .gmod{flex:0 0 auto;font-size:11.5px;font-weight:700;letter-spacing:.04em;
  color:var(--muted);background:var(--pill);border-radius:999px;padding:3px 9px}
.glossnone{margin:22px 2px;font-size:15px;line-height:1.6;color:var(--muted);text-align:center}
@media(min-width:760px){
  .gterm dt{font-size:17px}
}
`;

const CHEER_CSS=`
/* =========================================================================
   The moment. A ring closing behind a sentence, gone in under two seconds,
   and never in the way of a tap.
   ========================================================================= */
#cheer{position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;
  pointer-events:none;opacity:0;visibility:hidden;transition:opacity .18s}
#cheer.on{opacity:1;visibility:visible}
/* the page behind quiets down so the moment is read, not decoded against body text */
#cheer::before{content:'';position:absolute;inset:0;
  background:radial-gradient(58% 34% at 50% 50%,color-mix(in srgb,var(--bg) 88%,transparent) 0%,color-mix(in srgb,var(--bg) 62%,transparent) 45%,transparent 78%)}
.chin{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;
  padding:24px 28px;border-radius:20px;max-width:min(320px,84vw);
  background:color-mix(in srgb,var(--panel) 92%,transparent);
  -webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);
  border:1px solid var(--hairline);box-shadow:var(--e3);
  transform:scale(.9);opacity:0}
#cheer.on .chin{animation:cheerin .42s cubic-bezier(.2,.9,.28,1) forwards}
@keyframes cheerin{to{transform:scale(1);opacity:1}}
.chin b{font-size:17px;font-weight:800;color:var(--ink);line-height:1.25}
.chin small{font-size:13px;font-weight:600;color:var(--ink2);line-height:1.45}
.chring{display:block}
#cheer.done .chin{border-color:color-mix(in srgb,var(--accent2) 42%,var(--hairline))}
#cheer.warm .chin{border-color:color-mix(in srgb,var(--warn) 42%,var(--hairline))}
/* the ring redraws itself every time the moment fires */
#cheer.on .snkring.cheer > svg path{animation:snkdraw .68s cubic-bezier(.2,.8,.3,1) both}
#cheer.on .snkring.cheer > svg circle:not(:first-child){animation:snkpop .3s .42s both}
@media (prefers-reduced-motion:reduce){
  #cheer.on .chin{animation:none;transform:none;opacity:1}
  #cheer .snkring{display:none}
  #cheer.on .snkring.cheer > svg path,#cheer.on .snkring.cheer > svg circle{animation:none}
}
`;

const BENTO_CSS=`
/* =========================================================================
   The home bento. One tall tile that leads, two short ones under it.
   ========================================================================= */
.bento{display:grid;grid-template-columns:1fr;gap:10px;margin:2px 0 20px}
.bmain{position:relative;display:flex;align-items:flex-end;min-height:186px;overflow:hidden;
  border-radius:20px;text-decoration:none;color:inherit;padding:18px;
  border:1px solid color-mix(in srgb,var(--ga) 34%,var(--hairline));
  background:var(--panel);box-shadow:var(--e2);
  transition:transform .16s,box-shadow .16s}
.bmain:hover{transform:translateY(-2px);box-shadow:var(--e3)}
.bmain:active{transform:none}
.bart{position:absolute;inset:0;z-index:0}
.bart .cvsvg{display:block;width:100%;height:100%;object-fit:cover}
.bart::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,
    transparent 0%,
    color-mix(in srgb,var(--panel) 46%,transparent) 40%,
    color-mix(in srgb,var(--panel) 92%,transparent) 78%,
    var(--panel) 100%)}
.bart.plain{background:linear-gradient(150deg,color-mix(in srgb,var(--ga) 26%,var(--panel)),var(--panel))}
.bmin{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%}
.btag{font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:color-mix(in srgb,var(--ga) 62%,var(--ink))}
.bttl{font-size:20px;font-weight:800;line-height:1.2;color:var(--ink);letter-spacing:-.01em;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* not .bsub — the badge section already owns that name */
.bmsub{font-size:13px;font-weight:600;color:var(--ink2);line-height:1.4;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bgo{margin-top:10px;min-height:44px;display:inline-flex;align-items:center;padding:0 20px;
  border-radius:14px;background:var(--cta,var(--accent-solid));color:#fff;
  font-size:15px;font-weight:800;
  box-shadow:var(--edge3),var(--e1)}
/* the two habits */
.brow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.btile{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:2px;
  min-height:132px;padding:14px;border-radius:14px;text-decoration:none;color:inherit;
  background:var(--panel2);border:1px solid var(--hairline);box-shadow:var(--e1);
  background-image:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,0) 60%);
  transition:transform .16s,border-color .16s}
.btile:hover{transform:translateY(-1px)}
.btile:active{transform:none}
.btile b{font-size:27px;font-weight:800;line-height:1;color:var(--ink);letter-spacing:-.02em}
.btile small{font-size:11.5px;font-weight:600;color:var(--ink2);line-height:1.3}
.btgo{margin-top:auto;padding-top:8px;font-size:11.5px;font-weight:700;color:var(--muted)}
.btile:hover .btgo{color:var(--ink)}
.btico{display:flex;margin-bottom:2px}
.btico .flamegi{width:22px;height:22px;color:var(--muted)}
.btile.warm.lit{border-color:color-mix(in srgb,var(--warn) 38%,var(--hairline))}
.btile.warm.lit .flamegi{color:var(--warn)}
.btile.warm.done{border-color:color-mix(in srgb,var(--accent2) 38%,var(--hairline))}
.btile.goal .snkring{margin-bottom:4px}
.btile.goal .snkin b{font-size:15px}
.btile.goal.met{border-color:color-mix(in srgb,var(--accent2) 40%,var(--hairline))}

/* ---- today: one card, one ring ----
   .btile lays out as a column and .btgo pushes itself down with margin-top:auto,
   so the row direction lives here and .btgo moves inside .tdside to keep the
   column it depends on. */
.brow:has(.btoday){grid-template-columns:1fr}
.btoday{flex-direction:row;align-items:center;gap:15px}
.btoday > .snkring{flex:0 0 auto}
/* At 104px the unfilled track is a large area of --pill, and on day one — 0 XP,
   no streak — it is the entire object: the focal point of the screen reads as a
   smudge. Stronger here only. The small rings elsewhere sit on busier surfaces
   at sizes where --pill is enough. */
.btoday .snkring > svg circle:first-child{stroke:var(--line)}
.btoday .snkin b{font-size:20px}
.btoday .snkin small{font-size:11.5px;font-weight:600;color:var(--ink2);display:block;margin-top:1px}
/* Centred beside the ring as one group. .btgo's margin-top:auto would otherwise
   shove the call to action to the floor of the card, leaving it stranded a long
   way under the streak it belongs to. */
.tdside{display:flex;flex-direction:column;align-items:flex-start;gap:4px;flex:1 1 auto;min-width:0;align-self:center}
.btoday .btgo{margin-top:2px;padding-top:0}
/* The freeze badge was a corner ornament on the old tile, absolutely placed. In
   a row it has to sit with the streak it qualifies, not float at the card edge.
   Two classes deep on purpose: the ".btile .wcfrz" rule pins it, and that rule
   lives in DESKTOP_CSS, which is concatenated after this block and would
   otherwise win on source order at equal specificity. The component's rules
   belong here, so the selector gets more specific rather than the rule moving
   somewhere it does not belong. (No backticks in these comments — the blocks are
   template literals and a stray one ends the string.) */
.btile.btoday .wcfrz{position:static}
.tdstreak{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.tdstreak .flamegi{width:22px;height:22px;color:var(--muted)}
.tdstreak small{font-size:11.5px;font-weight:600;color:var(--ink2)}
.btoday.lit .flamegi{color:var(--warn)}
.btoday.met{border-color:color-mix(in srgb,var(--accent2) 40%,var(--hairline))}
.btoday.warmdone .btgo{color:var(--accent2)}
/* The mark reads as artwork at this size, so it keeps a radius rather than
   floating as a bare cut-out. */
.tdapple{width:38px;height:38px;display:block;margin:0 auto;border-radius:10px}
/* Two moments, both one-shot. Nothing here loops — ambient animation is what
   makes an interface feel like a toy rather than a tool. */
@keyframes tdpop{from{transform:scale(.55);opacity:0}to{transform:scale(1);opacity:1}}
.btoday.met .tdapple{animation:tdpop .34s .28s cubic-bezier(.2,.9,.3,1.25) both}
/* No card-level glow. Animating box-shadow between --e1 and --e2 puts an
   interpolated shadow on the card for the length of the tween — a value on
   neither tier — and test40 samples exactly that and fails, correctly. The ring
   already carries its own glow through .snkring.shut, so the moment was drawn
   twice anyway. */
@media (prefers-reduced-motion:reduce){
  .btoday.met .tdapple{animation:none}
}
@media(min-width:600px){
  .bento{grid-template-columns:1.55fr 1fr;align-items:stretch}
  .bmain{min-height:216px}
  .brow{grid-template-columns:1fr;gap:10px}
  .btile{min-height:0;flex:1}
}
`;

const SEARCH_CSS=`
/* =========================================================================
   IN-COURSE SEARCH — results are a reading list, not a table.
   ========================================================================= */
.searchpage .searchwrap{margin:0 0 16px}
.srhint{color:var(--ink2);font-size:13px;line-height:1.55;margin:2px 0 0}
.srcount{color:var(--muted);font-size:11.5px;font-weight:700;letter-spacing:.06em;
  text-transform:uppercase;margin:0 0 10px}
.srgroup{margin:0 0 14px;background:var(--panel);border:1px solid var(--hairline);
  border-radius:14px;overflow:hidden;box-shadow:var(--edge),var(--e1)}
.srhead{display:block;padding:12px 14px 10px;text-decoration:none;color:inherit;
  border-bottom:1px solid var(--hairline)}
.srhead:hover{background:var(--panel2)}
.srwhere{display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;
  text-transform:uppercase;color:var(--accent)}
.srhead.lock .srwhere{color:var(--muted)}
.srtitle{display:block;font-size:15px;font-weight:700;color:var(--ink);line-height:1.3;margin-top:2px}
.srhit{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;text-decoration:none;
  color:inherit;border-top:1px solid color-mix(in srgb,var(--hairline) 60%,transparent)}
.srhit:first-of-type{border-top:0}
.srhit:hover{background:var(--panel2)}
.srkind{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--muted);
  background:var(--pill);border-radius:999px;padding:2px 8px;margin-top:1px}
.srtext{flex:1;min-width:0;font-size:13px;line-height:1.5;color:var(--ink2)}
.srtext mark{background:color-mix(in srgb,var(--accent) 28%,transparent);color:var(--ink);
  border-radius:10px;padding:0 2px}
.srlock{display:block;padding:10px 14px;font-size:13px;font-weight:700;color:var(--accent);
  text-decoration:none;border-top:1px solid var(--hairline)}
.srlock:hover{text-decoration:underline}
.findb{text-decoration:none}
.findb svg,.rrfind svg{width:15px;height:15px}
.rrfind{display:flex;align-items:center;gap:7px;margin-top:12px;padding:8px 6px;border-radius:10px;
  font-size:13px;font-weight:700;color:var(--accent-t);text-decoration:none}
.rrfind:hover{background:var(--panel2)}
@media(min-width:820px){
  .srhit{padding:11px 16px}
  .srtitle{font-size:17px}
}
`;

const READ_CSS=`
/* =========================================================================
   READ TIME — how long a lesson takes, drawn from the lesson.
   Deliberately quiet: it is a hint, not a headline, so it takes the chrome
   tone and the smallest step on the scale everywhere it appears.
   ========================================================================= */
.accmin{margin-left:auto;flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--muted);
  background:var(--pill);border-radius:999px;padding:2px 8px}
.acclesson.dim .accmin{opacity:.75}
.rrmin{margin-left:auto;flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--muted)}
.rritem.on .rrmin{color:var(--accent-t)}
.posmin{color:var(--ink2);letter-spacing:0;text-transform:none;font-weight:600}
.cheroread{color:rgba(255,255,255,.72);font-size:11.5px;font-weight:600;margin-top:3px}
`;

const TEXT_CSS=`
/* =========================================================================
   The text ladder, applied last so it wins over the per-component defaults it
   is correcting. ink = titles and prose. ink2 = secondary content that still
   says something — state, meta, values, definitions. muted = chrome only.
   ========================================================================= */
.rbody>small,.trbody .trmeta,.pcmeta small,.dstxt small,.prtxt small,.pptxt small,
.mstmid small,.qtmid small,.artxt small,.dstxt2 small,.ccard .meta small,
.setval,.libmods,.stmeta,.macstat,.grpsub,.crmeta,.trmeta,.gterm dd,.cherosub,
.cprogtxt,.rwsay span,.sub,.qtmid small,.rvsub,.stinfo small,.pkinfo small,
.bmed small,.dsempty p,.ppempty,.inote p,.setnote,.glossnone,
.cardcollapse .cc-body{color:var(--ink2)}
/* and the things that really are chrome stay dim */
.collchev,.tkchev,.setchev,.archev,.prchev,.grpchev,.collcount,.grpcount,.dgcount,
.dsnum,.acli,.trn,.stn,.qtxp,.gmod,.viscap{color:var(--muted)}
`;

const BRAND_CSS=`
/* Oboros wordmark + logo */
.brand{display:inline-flex;align-items:center;gap:1px;font-weight:700;font-size:20px;letter-spacing:-.3px;color:var(--ink)}
.brand .brandtext{color:var(--ink)}
.oblogo{flex:0 0 auto;display:block}
.obmark{height:1.22em;width:auto;display:inline-block;vertical-align:middle;margin-right:2px;position:relative;top:-.08em}
/* color-theme swatches in settings */
.palrow{align-items:center}
.swatches{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.swatch{width:46px;height:46px;box-sizing:border-box;border-radius:50%;border:2px solid var(--line);background:none;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.swatch span{width:26px;height:26px;border-radius:50%;display:block}
.swatch.on{border-color:var(--ink)}
/* alternate color palettes (Aurora is the base :root default) */
html[data-palette="ember"]{--accent:#fb5607;--accent-solid:#ce4706;--accent2:#ff477e}
html[data-palette="verdant"]{--accent:#16a34a;--accent-solid:#12873d;--accent2:#0d9488}
html[data-palette="tide"]{--accent:#2563eb;--accent-solid:#2563eb;--accent2:#06b6d4}
html[data-palette="bloom"]{--accent:#d6409f;--accent-solid:#c93c95;--accent2:#7c5cff}
html[data-palette="classic"]{--accent:#5b8cff;--accent-solid:#4a71cf;--accent2:#31c48d}

/* ===== depth pass: cards feel raised & lit ===== */
.libcard,.stat,.streakcard,.reviewcard,.continue,.progresspanel,.pagecard,.panelcard,.modcard,.studytile,.storecard,.qlink,.navacct,.peekcard,.acctcard,.notecard,.revempty{
  box-shadow:var(--edge),var(--shadow);
}
/* subtle top sheen only on solid-panel cards (skip ones with their own gradient) */
.libcard,.stat,.streakcard,.reviewcard.caught,.progresspanel,.pagecard,.panelcard,.modcard,.studytile,.storecard,.qlink,.navacct,.peekcard,.acctcard,.notecard,.revempty{
  background-image:var(--sheen);background-repeat:no-repeat;background-position:top;
}
/* interactive lift */
.libcard,.studytile,.storecard,.qlink,.reviewcard,.continue,.navacct{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
.studytile:hover,.storecard:hover,.qlink:hover,.reviewcard:hover,.navacct:hover{transform:translateY(-2px);box-shadow:var(--edge),var(--shadow-h)}
.libcard:hover{box-shadow:var(--edge),var(--shadow-h)}
.contbtn,.btn,.rvbtn:not(.ghost){box-shadow:var(--e1),0 6px 16px -6px var(--glow)}

/* ===== simulated hero light ===== */
/* The glow used to be 112% of the section, which pushed 6px past the right edge
   of the page and gave every screen with a hero a horizontal scrollbar. The
   radial fades to transparent at 72% anyway, so 100% looks identical. */
.hero2{position:relative;overflow-x:clip}
.hero2::before{content:"";position:absolute;top:-30px;left:50%;width:min(620px,100%);height:300px;transform:translateX(-50%);
  background:radial-gradient(50% 58% at 50% 40%,var(--glow),transparent 72%);filter:blur(4px);pointer-events:none;z-index:0}
.hero2>*{position:relative;z-index:1}
/* elegant top-lit gradient on the display headline */
.hero2-h{background:linear-gradient(180deg,var(--ink),color-mix(in srgb,var(--ink) 72%,var(--muted)));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;text-shadow:none}
.hero2-h .kw{-webkit-text-fill-color:transparent;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 88%,#fff),var(--accent));-webkit-background-clip:text;background-clip:text}
.landinghero h1{font-family:var(--serif);letter-spacing:-.01em}
/* fallback: if background-clip:text is unsupported, keep the text visible */
@supports not ((-webkit-background-clip:text) or (background-clip:text)){
  .hero2-h,.hero2-h .kw{-webkit-text-fill-color:currentColor;color:var(--ink);background:none}
  .hero2-h .kw{color:var(--accent)}
}
`;

/* =========================================================================
   DESKTOP + specialization chooser. Loaded last so it wins the cascade.
   Everything here is additive: below 1080px the app is byte-for-byte the
   mobile experience it has always been.
   ========================================================================= */
const DESKTOP_CSS=`
/* ---------- specialization chooser ---------- */
.secttitle{display:flex;align-items:center;gap:10px}
.secta{margin-left:auto;font-size:13px;font-weight:700;letter-spacing:.04em;color:var(--accent);text-transform:none}
.secta:hover{text-decoration:underline}
.chooser{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:18px 18px 16px;box-shadow:var(--edge),var(--shadow);background-image:var(--sheen);background-repeat:no-repeat;background-position:top}
.chintro{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px}
.chico{width:42px;height:42px;flex:0 0 auto;border-radius:14px;display:flex;align-items:center;justify-content:center;color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent)}
.chintro b{display:block;font-size:17px;margin-bottom:4px}
.chintro p{margin:0;color:var(--muted);font-size:13px;line-height:1.55}
.chlist{display:flex;flex-direction:column;gap:8px}
.chrow{display:flex;align-items:center;gap:12px;padding:12px 13px;border:1px solid var(--hairline);border-radius:14px;background:var(--panel2);transition:border-color .15s,transform .15s}
.chrow:hover{border-color:var(--accent)}
.chrow.on{border-color:var(--accent2);background:color-mix(in srgb,var(--accent2) 9%,var(--panel2))}
.chdot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.chbody{flex:1;min-width:0}
.chtitle{display:block;font-weight:700;font-size:15px;color:var(--ink);text-decoration:none;padding:11px 0;margin:-11px 0}
.chtitle:hover{color:var(--accent)}
.chsub{color:var(--muted);font-size:13px;line-height:1.45;margin-top:2px}
.chmeta{color:var(--muted);font-size:11.5px;font-weight:700;margin-top:4px}
.chbtn{flex:0 0 auto;background:var(--accent-solid);color:#fff;border:none;font-family:inherit;font-weight:700;font-size:13px;padding:10px 15px;border-radius:14px;cursor:pointer;min-height:40px;box-shadow:var(--e1),0 6px 16px -6px var(--glow)}
.chbtn:hover{filter:brightness(1.08)}
.chon{flex:0 0 auto;color:var(--accent2);font-weight:700;font-size:13px;white-space:nowrap}
.chfoot{color:var(--muted);font-size:13px;line-height:1.55;margin:14px 2px 0}
.chlist-page{margin-top:6px}
.chlist-page .chrow{background:var(--panel);padding:15px 16px}
.chclear{margin-top:16px}
.trackhead{flex-wrap:wrap}
.stpick{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
/* "Make this my specialization" is 200px of button. Both cells are flex:1 with a
   zero basis, so the row never wrapped — it just pushed the button off the right
   edge of the phone and gave the whole page a horizontal scrollbar. Below the
   width where both fit side by side, stack them and let the button span. */
/* 40px was under the 44px minimum for a primary action people are meant to tap */
.chbtn{max-width:100%;white-space:normal;min-height:44px;font-size:13px}

/* =========================================================================
   LIBRARY & STORE, ORGANISED BY SPECIALIZATION
   A flat alphabetical grid answers "what exists". It cannot answer "what does
   this belong to and what comes before it", which is the question someone
   browsing a curriculum is actually asking.
   ========================================================================= */
/* library header — orientation, not brand */
.libhead{padding:16px 0 2px;margin-bottom:2px}
.libh1{font-size:27px;font-weight:800;letter-spacing:-.012em;margin:0}
.libstat{font-size:13px;font-weight:600;color:var(--muted);margin:5px 0 0}
.libstat b{color:var(--ink);font-weight:700}
@media(min-width:820px){.libhead{padding:22px 0 4px}.libh1{font-size:27px}}
.stwrap{margin-top:10px}
.stbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:4px 0 12px}
.stcount{font-size:13px;font-weight:700;color:var(--muted)}
.libbar2{justify-content:flex-end;margin:2px 0 10px}
.grpsw{display:inline-flex;background:var(--pill);border-radius:14px;padding:3px;gap:2px}
.grpb{appearance:none;border:0;background:transparent;color:var(--muted);font-family:inherit;font-weight:700;
  font-size:13px;padding:8px 13px;border-radius:10px;cursor:pointer;min-height:44px;white-space:nowrap;transition:.15s}
.grpb.on{background:var(--panel2);color:var(--ink);box-shadow:var(--edge),var(--e1)}
.grpb:hover{color:var(--ink)}

.grp{margin:0 0 22px}
.grphead{position:relative;display:flex;align-items:center;gap:13px;text-decoration:none;color:inherit;
  padding:13px 14px;border-radius:14px;background:var(--panel);overflow:hidden;
  margin-bottom:10px;min-height:64px;box-shadow:var(--edge),var(--shadow);
  transition:transform .16s ease,box-shadow .16s ease}
a.grphead:hover{transform:translateY(-1px);box-shadow:var(--edge),var(--shadow-h)}
.grphead.plain{background:transparent;border:1px dashed var(--line);box-shadow:none;min-height:52px}
/* generated cover: a square crop on the left of the row, not a full-bleed band —
   it has to sit beside the title without pushing the row past two lines */
.grpart{position:relative;flex:0 0 auto;width:52px;height:52px;border-radius:10px;overflow:hidden;
  display:block;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.grpart .cvsvg{display:block;width:100%;height:100%}
.grptxt{flex:1;min-width:0;display:block}
.grpname{display:block;font-size:15px;font-weight:800;letter-spacing:-.005em;
  color:var(--ink);line-height:1.25}
.grpsub{display:block;font-size:11.5px;font-weight:600;margin-top:2px}
.grpcount{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--muted);
  background:var(--pill);border-radius:999px;padding:3px 9px;min-width:26px;text-align:center}
.grphead .grpchev{flex:0 0 auto;color:var(--muted);font-size:20px;line-height:1}

/* A specialization and the courses under it were the same size, the same weight
   and the same card, so the group read as a flat list of six equal things. The
   header stays a card; its courses are attached to it, indented, and smaller. */
.grp{margin-bottom:22px}
.grp .grphead{margin-bottom:0;border-bottom-left-radius:0;border-bottom-right-radius:0}
.grp .stlist{position:relative;display:flex;flex-direction:column;gap:0;
  padding:4px 0 4px 12px;margin-left:20px;
  border-left:2px solid color-mix(in srgb,var(--line) 80%,transparent)}
.stlist{display:flex;flex-direction:column;gap:8px}
/* position:relative is load-bearing — the stretched title overlay below anchors
   to it. Without it the overlay escapes to the page and swallows every tap. */
.strow{position:relative;display:flex;align-items:center;gap:11px;background:var(--panel);border:1px solid var(--hairline);
  border-radius:14px;padding:11px 13px;min-height:60px;box-shadow:var(--edge)}
/* inside a group the course is a row, not a card: no border, no fill, less of it */
.grp .strow,.grp .strow.have{background:transparent;border:0;box-shadow:none;padding:6px 4px 6px 0;
  min-height:52px;border-radius:0;gap:10px}
.grp .strow+.strow{border-top:1px solid var(--hairline)}
/* a course nested under a specialization is a step down the scale, not the same
   size in a different colour — 15 for the group, 13 for what it contains */
.grp .sttitle{font-size:13px;line-height:1.32}
.grp .stn{width:22px;height:22px;border-radius:10px;font-size:11.5px}
.grp .stmeta{font-size:11.5px;margin-top:2px}
/* smaller to look at, but still 44px to hit — it is the only way to add a course */
.grp .stbtn{font-size:13px;padding:0 14px;min-height:44px;border-radius:14px;
  box-shadow:var(--edge3),var(--e1)}
.grp .sttitle.stretch{min-height:40px}
/* the description folds rather than truncating mid-sentence */
.strow{flex-wrap:wrap}
.stmore{flex:0 0 auto;position:relative;z-index:1;width:40px;height:40px;border:0;cursor:pointer;
  background:transparent;color:var(--muted);border-radius:10px;display:flex;
  align-items:center;justify-content:center;font-family:inherit}
.stmore:hover{background:var(--panel3);color:var(--ink)}
.stmore .gi{width:15px;height:15px;transition:transform .16s}
.strow.showdesc .stmore .gi{transform:rotate(90deg)}
.strow.showdesc .stmore{background:var(--panel3);color:var(--ink)}
.stsub{flex-basis:100%;order:9;margin:0 0 6px;font-size:13px;line-height:1.55;
  color:var(--muted);font-weight:600;padding-left:33px}
.grp .stsub{padding-left:32px}
@media (prefers-reduced-motion:reduce){.stmore .gi{transition:none}}
/* owned rows sit back rather than looking like empty slots — dashed reads as
   "add something here", which is the opposite of what it means */
.strow.have{background:transparent;box-shadow:none;box-shadow:inset 0 0 0 1px var(--hairline)}
.stn{flex:0 0 auto;width:26px;height:26px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:700;color:#fff;background:var(--sa,var(--accent))}
.strow.have .stn{background:var(--pill);color:var(--muted)}
.stmid{flex:1;min-width:0}
.sttitle{display:block;font-size:15px;font-weight:700;color:var(--ink);text-decoration:none;line-height:1.28}
a.sttitle:hover{color:var(--accent-t)}
/* the whole row is the target, not the 19px of text. The measured box has to
   say so too, or an audit reads it as a 19px tap target. */
.sttitle.stretch{display:flex;align-items:center;min-height:44px}
.sttitle.stretch::after{content:'';position:absolute;inset:0;z-index:0}
.strow .stbtn{position:relative;z-index:1}
/* the scale line: what this actually costs you in hours */
.stmeta{font-size:11.5px;font-weight:700;color:var(--muted);letter-spacing:.01em;margin-top:4px}
.strow:not(.have) .stmeta{color:color-mix(in srgb,var(--sa,var(--accent)) 62%,var(--ink))}

/* the button belongs to its specialization, not to the palette — the store shows
   several groups at once, so one accent for the whole page would flatten them */
.stbtn{flex:0 0 auto;appearance:none;border:0;background:var(--sacta,var(--accent-solid));color:#fff;font-family:inherit;
  font-weight:800;font-size:13px;padding:11px 14px;border-radius:14px;cursor:pointer;min-height:44px;
  white-space:nowrap;text-decoration:none;display:flex;align-items:center;
  box-shadow:var(--e1),0 6px 16px -6px var(--glow)}
.stbtn:hover{filter:brightness(1.08)}
.stbtn.have,.stbtn.go{background:var(--panel2);color:var(--ink);box-shadow:none;font-size:13px}
.strow.have .stbtn.go:hover{background:var(--panel3);filter:none}
.strow.justadded{border:1px solid color-mix(in srgb,var(--accent2) 55%,transparent);border-style:solid}
.strow.justadded .stbtn.go{background:var(--accent2);color:#08130f}
.stsoon{font-size:13px;color:var(--muted);font-weight:600;padding:9px 13px 2px;line-height:1.5}
/* the tracks that exist as an outline but have no courses written yet */
.pllist{display:flex;flex-direction:column;gap:6px}
.grpart.sm{width:30px;height:30px;border-radius:10px;opacity:.7}
/* the category chip repeats the group it already sits inside */
.libgrp .cattag{display:none}
.libgrp .lctop:empty{display:none}
/* =========================================================================
   COURSE LANDING — the highest-traffic screen in the app. It used to put the
   first control 860px down, behind a 244px legal notice.
   ========================================================================= */
.chero{position:relative;display:flex;align-items:flex-end;border-radius:14px;overflow:hidden;
  margin:14px 0 12px;min-height:168px;background:#0d1017;box-shadow:var(--edge),var(--shadow)}
.chero .cvsvg{position:absolute;inset:0;width:100%;height:100%}
.chero::after{content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(6,8,14,0) 6%,rgba(6,8,14,.66) 56%,rgba(6,8,14,.92) 100%)}
.cheroin{position:relative;z-index:1;padding:16px 17px 15px;width:100%}
.cheroin .kicker{color:rgba(255,255,255,.8);margin-bottom:3px}
.cheroin h1{color:#fff;font-size:20px;line-height:1.2;margin:0 0 5px;max-width:22ch;text-shadow:0 1px 14px rgba(0,0,0,.5)}
.cherosub{color:rgba(255,255,255,.85);font-size:13px;line-height:1.45;margin:0 0 7px;max-width:44ch}
.cherometa{color:rgba(255,255,255,.72);font-size:11.5px;font-weight:700}
.cherometa b{color:#fff}

/* the one control the page exists for */
.cgo{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;
  background:var(--panel);border-radius:14px;padding:13px 14px;min-height:66px;margin-bottom:12px;
  box-shadow:var(--edge),var(--shadow);transition:transform .16s ease,box-shadow .16s ease}
.cgo:hover{transform:translateY(-1px);box-shadow:var(--edge),var(--shadow-h)}
.cgotxt{flex:1;min-width:0}
.cgotxt b{display:block;font-size:17px;font-weight:700;letter-spacing:-.01em}
.cgotxt small{display:block;font-size:13px;color:var(--muted);font-weight:600;margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cgobtn{flex:0 0 auto;background:var(--cta,var(--accent-solid));color:#fff;font-weight:800;font-size:13px;
  padding:12px 15px;border-radius:14px;min-height:44px;display:flex;align-items:center;white-space:nowrap;
  box-shadow:var(--e1),0 8px 18px -8px var(--glow)}
.cgo.done .cgobtn{background:var(--accent2);color:#08130f}

/* progress: one strip instead of a panel, a ribbon and a caption */
.cprog{background:var(--panel);border-radius:14px;padding:12px 14px 13px;margin-bottom:10px;box-shadow:var(--edge)}
.cprogtop{display:flex;align-items:baseline;gap:9px;margin-bottom:9px}
.cprogpct{font-size:20px;font-weight:800;letter-spacing:-.02em}
.cprogtxt{font-size:13px;color:var(--muted);font-weight:600;min-width:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* the notice is present, not prominent */
.discl{background:transparent;border:1px solid var(--hairline);border-radius:14px;margin:0 0 12px;overflow:hidden}
.discl summary{display:flex;align-items:center;gap:9px;padding:11px 13px;min-height:44px;cursor:pointer;list-style:none}
.discl summary::-webkit-details-marker{display:none}
.discl summary::after{content:'\\25BE';margin-left:auto;color:var(--muted);font-size:13px}
.discl[open] summary::after{content:'\\25B4'}
.dlbl{flex:0 0 auto;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  color:var(--warn-t);background:color-mix(in srgb,var(--warn) 16%,transparent);padding:3px 8px;border-radius:999px}
.dsum{font-size:13px;color:var(--muted);font-weight:600;min-width:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dbody{padding:0 13px 13px;font-size:13px;line-height:1.6;color:var(--muted)}

/* locked modules, folded */
.lockfold{display:flex;align-items:center;gap:11px;width:100%;text-align:left;cursor:pointer;
  background:transparent;border:1px dashed var(--line);border-radius:14px;padding:12px 14px;
  min-height:56px;color:inherit;margin-top:9px;transition:.15s}
.lockfold:hover{border-color:var(--muted);background:var(--panel)}
.lfico{flex:0 0 auto;font-size:15px;opacity:.65}
.lftxt{flex:1;min-width:0}
.lftxt b{display:block;font-size:15px;font-weight:700}
.lftxt small{display:block;font-size:13px;color:var(--muted);font-weight:600;margin-top:2px}
.lfchev{flex:0 0 auto;color:var(--muted);font-size:13px}

@media(min-width:820px){
  .chero{min-height:220px}
  .cheroin{padding:24px 26px 22px}
  .cheroin h1{font-size:27px}
  .cherosub{font-size:15px}
}

/* the specialization page opens on its own cover rather than a text header */
/* an explicitly dark block in both themes: it is a cover, and white type
   over generated art has to sit on a known surface for contrast to be real */
.tkhero{position:relative;display:block;border-radius:14px;overflow:hidden;margin:14px 0 4px;background:#0d1017;
  min-height:186px;display:flex;align-items:flex-end;box-shadow:var(--edge),var(--shadow)}
.tkhero .cvsvg{position:absolute;inset:0;width:100%;height:100%}
.tkhero::after{content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(6,8,14,0) 8%,rgba(6,8,14,.62) 58%,rgba(6,8,14,.9) 100%)}
.tkheroin{position:relative;z-index:1;padding:18px 18px 17px;width:100%}
.tkheroin .kicker{color:rgba(255,255,255,.82);margin-bottom:3px}
.tkheroin h1{color:#fff;font-size:27px;line-height:1.15;margin:0 0 6px;max-width:16ch;text-shadow:0 1px 14px rgba(0,0,0,.5)}
.tkheroin .sub{color:rgba(255,255,255,.86);margin:0;max-width:42ch;font-size:15px}
@media(min-width:820px){
  .tkhero{min-height:236px}
  .tkheroin{padding:26px 28px 24px}
  .tkheroin h1{font-size:27px;max-width:20ch}
}
.plrow{display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit;
  padding:9px 13px;border-radius:14px;border:1px dashed var(--line);min-height:48px;transition:.15s}
.plrow:hover{border-color:color-mix(in srgb,var(--ga,var(--accent)) 55%,var(--line));background:var(--panel)}
.plname{flex:1;min-width:0;font-size:13px;font-weight:700;color:var(--muted)}
.plct{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--muted)}

/* the compact specialization row used in the library list */
.tkrow.mini{padding:9px 13px;margin:7px 0;min-height:46px;gap:11px}
.tkrow.mini .trtitle{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tkrow.mini .trbar{height:3px;margin:6px 0 0}
.tkrow.mini .trn{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--muted);
  background:var(--pill);border-radius:999px;padding:3px 8px;white-space:nowrap}
.tkrow.mini .tkchev{padding:0 0 0 2px;font-size:20px}

@media(min-width:820px){
  .stlist,.grp .stlist{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:10px 16px}
  /* the rail and indent stay: the group still owns its columns */
  .grp .stlist{padding:6px 0 6px 14px}
  .grp .strow+.strow{border-top:0}
  .grp .strow{border-bottom:1px solid var(--hairline)}
  .grphead{margin-bottom:11px}
  .trackrows{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0 12px}
}
@media(max-width:600px){
  .streakcard.trackhead{flex-direction:column;align-items:stretch;gap:14px}
  .trackhead .stcell{justify-content:flex-start;flex:1 1 auto}
  .trackhead .stcell.stgoal{flex:1 1 auto}
  .trackhead .stpick{flex-direction:column;align-items:stretch;gap:8px}
  .trackhead .stpick .chbtn,.trackhead .stpick .minibtn{width:100%;justify-content:center;text-align:center}
  .trackhead .stpick .chon{text-align:center;padding:2px 0}
}

/* ---------- desktop study rail (lesson pages) ---------- */
.readrail{display:none}
.rrcard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:16px 16px 14px;box-shadow:var(--edge),var(--shadow);background-image:var(--sheen);background-repeat:no-repeat;background-position:top}
.rrtitle{display:block;font-weight:700;font-size:15px;color:var(--ink);text-decoration:none;line-height:1.3}
.rrtitle:hover{color:var(--accent)}
.rrprog{display:flex;align-items:center;gap:11px;margin:13px 0 4px;padding-bottom:13px;border-bottom:1px solid var(--line)}
.rrring::after{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--panel)}
.rrring span{position:relative;z-index:1;font-size:11.5px;font-weight:700}
.rrmeta b{display:block;font-size:13px}
.rrmeta small{color:var(--muted);font-size:11.5px;font-weight:600}
.rrsect{font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-top:12px}
.rrmod{font-size:13px;font-weight:700;margin:4px 0 8px;line-height:1.35}
.rrlist{list-style:none;margin:0;padding:0}
.rritem a,.rritem{display:flex;align-items:flex-start;gap:9px;padding:7px 6px;border-radius:10px;color:var(--muted);text-decoration:none;font-size:13px;line-height:1.4}
.rritem a:hover{background:var(--panel2);color:var(--ink)}
.rrdot{width:7px;height:7px;border-radius:50%;background:var(--line);flex:0 0 auto;margin-top:5px}
.rritem.on>a{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);font-weight:700}
.rritem.on .rrdot{background:var(--accent)}
.rritem.lock{opacity:.55}
.rritem.lock .rrlbl::after{content:" \\1F512";font-size:11.5px}
.rrnext{display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:var(--accent);text-decoration:none}
.rrnext:hover{text-decoration:underline}
.rrnote{color:var(--muted);font-size:13px;line-height:1.55;margin:6px 0 0}
.rrkeys{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted);font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:5px}
.rrkeys kbd{font-family:inherit;font-size:11.5px;font-weight:700;background:var(--panel3);border:1px solid var(--hairline);border-bottom-width:2px;border-radius:10px;padding:1px 6px;color:var(--ink)}
.rrkeys kbd+kbd{margin-right:3px}

/* ---------- contrast repairs surfaced by the audit ---------- */
/* text-safe warn: --warn stays as-is for fills (buttons/rings), --warn-t is for words */
:root{--warn-t:var(--warn)}
html[data-theme="dark"]{--warn-t:var(--warn)}
html[data-theme="light"]{--warn-t:#8a5a05;--bad:#c62d4d}
@media (prefers-color-scheme: light){:root{--warn-t:#8a5a05}}
html[data-theme="light"] .mtag.imp{color:color-mix(in srgb,var(--accent2) 62%,#000)}
html[data-theme="light"] .mtag.rem{color:var(--warn-t)}
.acclock{color:var(--warn-t)}
.modcard.locked{opacity:1}
.modcard.locked .macmeta b,.modcard.locked .macnum{opacity:.62}
/* accent-on-panel text always uses the AA-safe accent variant */
.navitem.on,.navitem.on .nvic,.rrsect,.rrnext,.rritem.on>a,.secta,.chtitle:hover,.chico{color:var(--accent-t)}

/* ---------- .btn never had a global rule ----------
   Empty states, the import screen and the review summary all used class="btn"
   on links and <button>s that fell through to browser defaults. */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
  background:var(--accent-solid);color:#fff;border:1px solid transparent;font-family:inherit;
  font-weight:800;font-size:15px;line-height:1.2;padding:12px 20px;border-radius:14px;
  text-decoration:none;cursor:pointer;min-height:44px;box-sizing:border-box;transition:filter .15s,border-color .15s,color .15s;
  box-shadow:var(--e1),0 6px 16px -6px var(--glow)}
.btn:hover{filter:brightness(1.08)}
.btn.ghost{background:var(--panel3);color:var(--ink);border-color:var(--line);box-shadow:none}
.btn.ghost:hover{border-color:var(--accent);color:var(--accent);filter:none}
.btn.danger{background:var(--bad);color:#fff}
.revempty .btn{margin-top:16px}
.revempty .btnrow{justify-content:center;margin-top:16px}
.filelabel{display:inline-flex}

/* ---------- tap targets: real 42-44px hit areas, same visual weight ---------- */
a.brand{display:inline-flex;align-items:center;min-height:44px}
.stepbtn{height:44px;min-width:44px}
.secta{display:inline-flex;align-items:center;min-height:44px;margin-top:-12px;margin-bottom:-12px}
.swatches{gap:0}
.swatch{width:46px;height:46px;border:none;background:none}
.swatch span{width:26px;height:26px;box-shadow:0 0 0 2px var(--line)}
.swatch.on{border:none}
.swatch.on span{box-shadow:0 0 0 2px var(--ink)}
.rvtag{font-size:11.5px}

/* =========================================================================
   CREDITS, TRANSCRIPT & COURSE MILESTONES
   The reward for depth, in an academic register rather than a game one.
   ========================================================================= */
.trsum{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--panel);
  border:1px solid var(--hairline);border-radius:14px;padding:16px 8px;margin:14px 0 18px;
  box-shadow:var(--edge),var(--shadow);background-image:var(--sheen);background-repeat:no-repeat;background-position:top}
.trs{text-align:center;min-width:0;padding:2px}
.trs b{display:block;font-family:var(--serif);font-size:27px;font-weight:700;line-height:1}
.trs small{display:block;color:var(--muted);font-size:11.5px;font-weight:700;margin-top:5px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trlist{display:flex;flex-direction:column;gap:10px}
.trrow{display:flex;align-items:stretch;background:var(--panel);border:1px solid var(--hairline);
  border-radius:14px;overflow:hidden;text-decoration:none;color:var(--ink);
  box-shadow:var(--edge),var(--shadow);transition:border-color .15s,transform .15s}
.trrow:hover{border-color:var(--accent);transform:translateY(-1px)}
.trrow.done{border-color:color-mix(in srgb,var(--accent2) 45%,var(--line))}
.trstripe{width:5px;flex:0 0 auto}
.trmain{flex:1;min-width:0;padding:14px 16px}
.trhead{display:flex;align-items:baseline;gap:12px}
.trhead b{flex:1;min-width:0;font-size:15px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trgrade{flex:0 0 auto;font-family:var(--serif);font-size:20px;font-weight:700;color:var(--accent2-t);line-height:1}
.trgrade.pending{font-family:inherit;font-size:13px;font-weight:700;color:var(--muted)}
.trbar2{height:5px;border-radius:999px;background:var(--pill);margin:9px 0 8px;overflow:hidden}
.trbar2 i{display:block;height:100%;border-radius:999px}
.trmeta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11.5px;font-weight:600;color:var(--muted)}
.trdone{color:var(--accent2-t);font-weight:700}
.trmini{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:9px}
.trm{gap:10px;font-size:13px}
.trmdot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}
.trmname{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.trmcr{flex:0 0 auto;font-weight:700;color:var(--muted);font-size:13px}
@media(min-width:1080px){.trlist{display:grid;grid-template-columns:1fr 1fr;gap:12px}}

/* quarter markers on a course page — a ribbon you glance at, never a popup */
.milerow{display:flex;gap:6px;margin:14px 0 0}
.mile{flex:1;text-align:center;min-width:0;opacity:.42;transition:opacity .2s}
.mile.on{opacity:1}
.miledot{display:flex;align-items:center;justify-content:center;height:30px;border-radius:10px;
  background:var(--pill);font-size:11.5px;font-weight:700;color:var(--muted);
  border:1px solid transparent;transition:.2s}
.mile.on .miledot{background:color-mix(in srgb,var(--accent2) 20%,transparent);
  color:var(--accent2-t);border-color:color-mix(in srgb,var(--accent2) 42%,transparent)}
.mile small{display:block;font-size:11.5px;font-weight:700;color:var(--muted);margin-top:5px;line-height:1.25}
@media(max-width:420px){.mile small{font-size:11.5px}}
/* everything else on this page is left-aligned */
.milecap{font-size:13px;color:var(--muted);font-weight:600;margin:10px 2px 16px}

/* streak freezes, finally visible */
.frzline{display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap;
  margin-top:14px;padding-top:13px;border-top:1px solid var(--line);font-size:13px}
.frzline b{font-weight:700}
.frzline small{color:var(--muted);font-size:13px}
.frzico{font-size:17px;color:var(--frost)}
.frzico.dim{opacity:.4}
.frzline.used{color:var(--ink)}
.frzline.used b{color:var(--frost)}
.frzline.earned b{color:var(--accent2-t)}
.wcfrz{flex:0 0 auto;font-size:13px;font-weight:700;color:var(--frost);
  background:color-mix(in srgb,var(--frost) 15%,transparent);border-radius:999px;padding:4px 9px;margin-left:2px}
.btile .wcfrz{position:absolute;top:11px;right:11px;font-size:11.5px;padding:3px 8px;
  display:inline-flex;align-items:center;gap:3px}
.btile .wcfrz .gi{width:13px;height:13px}

/* =========================================================================
   DAILY WARM-UP — the streak lives on the bento tile now; the old home card
   and its five rules went with it.
   ========================================================================= */
.wuprog{margin:6px 0 14px}
.wuprog span{font-size:13px;font-weight:700;color:var(--muted)}
.wubar{height:5px;border-radius:999px;background:var(--pill);margin-top:7px;overflow:hidden}
.wubar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .3s}
.wulist{display:flex;flex-direction:column;gap:12px}
.wuhead{padding-top:14px}
.wuhead h1{font-size:20px;margin:2px 0 0}
.wuhead .sub{font-size:13px;margin-top:4px}
.wucard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:15px 15px 13px;
  box-shadow:var(--edge),var(--shadow)}
.wutop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.wucat{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--accent-t);background:color-mix(in srgb,var(--accent) 13%,transparent);padding:3px 9px;border-radius:999px}
.wunum{font-size:11.5px;font-weight:700;color:var(--muted)}
.wuverdict{font-size:15px;font-weight:700}
.wuverdict.ok{color:var(--accent2-t)}
.wuverdict.no{color:var(--bad-t)}
.wuq{font-size:15px;line-height:1.45;font-weight:600;margin:0 0 12px}
.wuopts{display:flex;flex-direction:column;gap:8px}
.wuopt{text-align:left;font-family:inherit;font-size:15px;padding:12px 14px;border-radius:14px;
  border:1px solid var(--hairline);background:var(--panel2);color:var(--ink);cursor:pointer;min-height:44px;
  transition:border-color .14s,background .14s}
.wuopt:hover:not(:disabled){border-color:var(--accent);background:var(--panel3)}
.wuopt:disabled{cursor:default}
.wuopt.right{border-color:var(--accent2);background:color-mix(in srgb,var(--accent2) 14%,var(--panel2));font-weight:700}
.wuopt.wrong{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,var(--panel2))}
.wuexp{display:none;font-size:13px;line-height:1.55;color:var(--muted);margin-top:11px;
  padding-top:11px;border-top:1px solid var(--line)}
.wuexp.show{display:block}
.wuexp b{color:var(--ink)}
.wuexp em{font-style:normal;font-weight:700;color:var(--ink)}
.wufoot{margin-top:18px;text-align:center}
.wufoot .btn{width:100%;max-width:340px;justify-content:center}
.wufoot .btn:disabled{opacity:.5;cursor:not-allowed;filter:none}
.wuresult{text-align:center;background:var(--panel);border:1px solid var(--hairline);border-radius:14px;
  padding:22px 18px 18px;margin:6px 0 18px;box-shadow:var(--edge),var(--shadow)}
.wuresult.perfect{border-color:var(--accent2)}
.wrbig{font-size:34px;font-weight:800;line-height:1;font-family:var(--serif)}
.wrsub{color:var(--muted);font-size:15px;margin-top:7px}
.wrstreak{display:inline-flex;align-items:center;gap:9px;margin-top:16px;padding:10px 16px;
  border-radius:999px;background:var(--panel2);border:1px solid var(--hairline)}
.wrstreak b{font-size:15px}
.wrstreak small{color:var(--muted);font-size:13px}
@media(min-width:1080px){.wulist{max-width:760px}.wuresult{max-width:760px}}

/* =========================================================================
   BOTTOM TAB BAR — every destination one thumb-tap away.
   Replaces navigation that lived behind a hamburger in the far top corner.
   ========================================================================= */
/* The bar floats: inset from all three edges, its own rounded shape, content
   passing beneath it rather than stopping at a full-width wall.
   --tabgap is the inset, and everything that positions off the bar (the offline
   notice, toasts, the sticky continue button) has to add it or they sit under
   the bar instead of above it. */
:root{--tabh:64px;--tabgap:12px}
.tabbar{position:fixed;left:var(--tabgap);right:var(--tabgap);z-index:55;display:flex;box-sizing:border-box;
  bottom:calc(var(--tabgap) + env(safe-area-inset-bottom,0px));
  min-height:var(--tabh);
  /* Same lesson as the top bar: 88% is not opaque enough for body text scrolling
     underneath, and iOS gets no blur at all without the -webkit- prefix. A
     floating bar has content passing under every edge, so it leans opaque. */
  background:color-mix(in srgb,var(--bg) 97%,transparent);
  -webkit-backdrop-filter:saturate(180%) blur(22px);backdrop-filter:saturate(180%) blur(22px);
  border:1px solid var(--line);
  border-radius:20px;
  box-shadow:var(--e3);
  padding:5px 5px}
/* Detached, it needs a lit top edge like every other floating surface here, or
   it reads as a flat plate rather than something above the page. */
.tabbar::before{content:"";position:absolute;inset:0;border-radius:20px;pointer-events:none;
  box-shadow:var(--edge2)}
.tab{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  padding:6px 2px;min-height:52px;text-decoration:none;color:var(--muted);border-radius:14px;
  transition:color .14s,background .14s}
.tab:hover{background:var(--panel2)}
.tab.on{color:var(--accent-t)}
.tabico{position:relative;display:flex;align-items:center;justify-content:center;height:24px}
.tabico svg{width:23px;height:23px}
.tab.on .tabico svg{stroke-width:2.2}
.tablbl{font-size:11.5px;font-weight:700;letter-spacing:.01em}
.tbadge{position:absolute;top:-5px;right:-9px;min-width:17px;height:17px;border-radius:999px;
  background:var(--bad);color:#fff;font-size:11.5px;font-weight:700;display:flex;align-items:center;
  justify-content:center;padding:0 4px;border:2px solid var(--bg)}
/* Clears the bar AND its inset — the page scrolls under the bar, so the last row
   of content has to come to rest above it rather than behind it. */
body{padding-bottom:calc(var(--tabh) + var(--tabgap) + 12px + env(safe-area-inset-bottom,0px))}
#offbar{bottom:calc(var(--tabh) + var(--tabgap) * 2 + env(safe-area-inset-bottom,0px));border-radius:14px;border-bottom:1px solid var(--line)}
#toast{bottom:calc(var(--tabh) + var(--tabgap) * 2 + 6px + env(safe-area-inset-bottom,0px))}
@media(min-width:1080px){
  .tabbar{display:none}
  body{padding-bottom:0}
  #offbar{bottom:0;border-bottom:none;border-radius:14px 14px 0 0}
  #toast{bottom:26px}
}

/* ---- top bar as a live dashboard, not a nameplate ---- */
.topbar.hasstats{padding:8px 14px;position:relative}
.topbar.hasstats .in{gap:8px}
/* The first card started at exactly the bar's bottom edge, so its border sat on
   the rank rail and the two read as one overlapping element. */
.topbar.hasstats + .wrap{padding-top:14px}
.tbstats{flex:1;display:flex;align-items:center;gap:6px;min-width:0}
/* Three bare glyphs and three numbers floating on black read as debug output.
   Each is a chip now — its own surface, its own edge, and its own colour once
   there is something to be pleased about. Grey until earned, lit after. */
.tbs{display:flex;align-items:center;gap:7px;padding:0 11px;border-radius:14px;min-height:40px;
  box-sizing:border-box;text-decoration:none;color:var(--ink);
  background:var(--panel2);border:1px solid var(--hairline);
  background-image:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,0) 62%);
  box-shadow:var(--edge),var(--e1);
  position:relative;transition:background-color .16s,border-color .16s,transform .14s}
/* the chip looks 40px because 44 is chunky in a 67px bar; the target is still 44 */
a.tbs::after{content:'';position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:44px}
a.tbs:hover{background-color:var(--panel3);transform:translateY(-1px)}
a.tbs:active{transform:none}
.tbs b{font-size:15px;font-weight:700;line-height:1;white-space:nowrap}
.tbs b small{font-size:11.5px;font-weight:700;color:var(--muted)}
/* a cold streak is grey; a live one is warm, and says so with its whole chip */
.tbs.flame .flamegi{color:var(--muted)}
.tbs.flame.lit{border-color:color-mix(in srgb,var(--warn) 42%,var(--hairline));
  background-color:color-mix(in srgb,var(--warn) 13%,var(--panel2))}
.tbs.flame.lit .flamegi{color:var(--warn)}
.tbs.flame.lit b{color:var(--warn-t,var(--ink))}
.tbs.flame svg{width:19px;height:19px}
/* the goal chip fills with the accent as the day closes */
.tbs.goal.met{border-color:color-mix(in srgb,var(--accent2) 45%,var(--hairline));
  background-color:color-mix(in srgb,var(--accent2) 14%,var(--panel2))}
.tbrk{font-size:17px;line-height:1;color:var(--accent-t)}
@media(min-width:520px){.tbs{padding:0 13px;min-height:42px}}
/* The rank rail along the bottom edge of the bar. It needs a visible track:
   a 2px line that simply stops at 89% of the screen reads as a glitch, not as
   progress. With the unfilled remainder drawn, the same pixel row reads
   correctly at a glance and needs no label. */
.topbar.hasstats::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;
  background:var(--pill);opacity:.7;pointer-events:none}
.tbfill{position:absolute;left:0;bottom:-1px;height:2px;z-index:1;border-radius:0 2px 2px 0;
  background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .4s;pointer-events:none}
@media(max-width:380px){.tbs{padding:0 8px;gap:5px}.tbs b{font-size:15px}}

/* =========================================================================
   HOME — compact, action-first. Replaces cards that were mostly padding.
   ========================================================================= */
.dashhead.tight{margin:14px 0 12px}
.dashhead.tight h1{font-size:27px;margin:2px 0 0}
.dashhead.tight .kicker{font-size:11.5px}

/* the one action */
.nextup{--nu:var(--accent);display:flex;align-items:center;gap:14px;margin:16px 0 0;padding:16px 16px;
  border-radius:14px;text-decoration:none;color:var(--ink);position:relative;overflow:hidden;
  border:1px solid color-mix(in srgb,var(--nu) 45%,var(--line));
  background:linear-gradient(135deg,color-mix(in srgb,var(--nu) 15%,var(--panel)),var(--panel) 68%);
  box-shadow:var(--edge),var(--shadow);transition:transform .16s,box-shadow .16s}
.nextup:hover{transform:translateY(-2px);box-shadow:var(--edge),var(--shadow-h)}
.nextup::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--nu)}
.nutxt{flex:1;min-width:0;padding-left:4px}
.nutag{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--accent-t)}
.nutitle{font-size:17px;font-weight:700;line-height:1.25;margin:4px 0 2px}
.nusub{font-size:13px;color:var(--muted);line-height:1.45}
.nubtn{flex:0 0 auto;background:var(--accent-solid);color:#fff;font-weight:700;font-size:13px;
  padding:11px 15px;border-radius:14px;white-space:nowrap;min-height:44px;display:flex;align-items:center;
  box-shadow:var(--e1),0 6px 16px -6px var(--glow)}

/* due-now alerts */
.alerts{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.alertrow{padding:12px 13px;background:var(--panel);color:var(--ink);min-height:44px;transition:border-color .14s,transform .14s}
.alertrow:hover{border-color:var(--accent);transform:translateY(-1px)}
.alertrow.rev{border-color:color-mix(in srgb,var(--warn) 55%,var(--line));background:color-mix(in srgb,var(--warn) 7%,var(--panel))}
.alertrow.stale{border-color:color-mix(in srgb,var(--bad) 45%,var(--line))}
.arico{width:32px;height:32px;flex:0 0 auto;border-radius:10px;display:flex;align-items:center;justify-content:center;
  background:var(--panel3);color:var(--accent-t);font-size:15px}
.artxt{flex:1;min-width:0}
.artxt b{display:block;font-size:15px;line-height:1.3}
.artxt small{display:block;color:var(--muted);font-size:13px;margin-top:2px;line-height:1.4}
.archev{color:var(--muted);font-size:20px;flex:0 0 auto}

/* daily quests */
.qlist{display:flex;flex-direction:column;gap:9px;padding:2px 0}
.qrow{display:flex;align-items:center;gap:11px}
.qtick{width:21px;height:21px;flex:0 0 auto;border-radius:50%;border:2px solid var(--line);
  display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:#fff}
.qrow.done .qtick{background:var(--accent2);border-color:var(--accent2)}
.qmid{flex:1;min-width:0}
.qlbl{font-size:13px;font-weight:700;line-height:1.3}
.qrow.done .qlbl{color:var(--muted);text-decoration:line-through}
.qbar{height:4px;border-radius:999px;background:var(--pill);margin-top:5px;overflow:hidden}
.qbar i{display:block;height:100%;background:var(--accent);transition:width .4s}
.qrow.done .qbar i{background:var(--accent2)}
.qxp{flex:0 0 auto;font-size:13px;font-weight:700;color:var(--muted);min-width:34px;text-align:right}
.qrow.done .qxp{color:var(--accent2-t)}

/* compact course rows */
.crows{display:flex;flex-direction:column;gap:2px}
.crow{gap:11px;padding:11px 6px;transition:background .14s}
.crow:hover{background:var(--panel2)}
.crdot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.crmid{flex:1;min-width:0;padding-right:6px}
.crtitle{display:block;font-size:15px;font-weight:700;color:var(--ink);text-decoration:none;padding:10px 0;margin:-10px 0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.crtitle:hover{color:var(--accent-t)}
.crbar{height:4px;border-radius:999px;background:var(--pill);margin:6px 0 5px;overflow:hidden}
.crbar i{display:block;height:100%;border-radius:999px}
.crmeta{font-size:11.5px;color:var(--muted);font-weight:600}
.crmast{color:var(--accent2-t)}
.crmast.stale{color:var(--warn-t)}
.crgo{flex:0 0 auto;font-size:13px;font-weight:700;color:var(--accent-t);text-decoration:none;
  white-space:nowrap;padding:12px 4px;margin:-12px 0}

/* streak calendar */
/* Dots, since the numerals went. A row of marks reads as a rhythm — you see a
   run and a gap without counting — where fourteen two-digit numbers read as a
   table you have to parse. They stay square-ish with the same radius rather
   than becoming circles, so they still belong to the same family as the pills
   and chips around them. */
.skgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
/* Width, not height. A grid column here is about 46px, so capping the height
   alone left aspect-ratio nothing to do and the marks came out as wide
   rectangles. Cap the width and centre them in the column instead. */
.skday{aspect-ratio:1;border-radius:10px;background:var(--pill);border:1px solid transparent;
  width:100%;max-width:34px;margin:0 auto;transition:background .16s ease}
.skday.on{background:color-mix(in srgb,var(--accent) 34%,transparent);border-color:color-mix(in srgb,var(--accent) 58%,transparent)}
.skday.now{border-color:var(--ink);border-width:2px}
.skday.on.now{background:color-mix(in srgb,var(--accent) 52%,transparent)}

/* one-line stat strip instead of four big tiles */
.statstrip{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--panel);
  border:1px solid var(--hairline);border-radius:14px;padding:12px 6px;box-shadow:var(--edge),var(--shadow)}
.ss{text-align:center;min-width:0;padding:4px 2px}
.ss b{display:block;font-size:17px;font-weight:700;line-height:1.1}
.ss small{display:block;color:var(--muted);font-size:11.5px;font-weight:700;margin-top:3px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* =========================================================================
   REWARDS — rank ladder, quests, activity, mastery
   ========================================================================= */
.secttitle .secnote{margin-left:auto;font-size:11.5px;font-weight:700;color:var(--muted);text-transform:none;letter-spacing:0}
.rankcard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:17px 17px 15px;
  margin:14px 0 4px;box-shadow:var(--edge),var(--shadow);background-image:var(--sheen);
  background-repeat:no-repeat;background-position:top}
.rkhead{display:flex;align-items:center;gap:14px}
.rkicon{line-height:1;flex:0 0 auto;width:54px;height:54px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  background:color-mix(in srgb,var(--accent) 14%,transparent)}
.rkinfo{min-width:0}
.rklvl{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--accent-t)}
.rkinfo b{display:block;font-size:20px;line-height:1.2;margin:2px 0 1px}
.rkinfo small{color:var(--muted);font-size:13px;font-weight:600}
.rankbar.big{height:7px;margin:14px 0 0}
.rkladder{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin-top:14px}
.rkstep{text-align:center;min-width:0;opacity:.4}
.rkstep.got{opacity:1}
.rkdot{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;max-width:34px;
  margin:0 auto;border-radius:50%;background:var(--pill);font-size:15px;border:1px solid transparent}
.rkstep.got .rkdot{background:color-mix(in srgb,var(--accent) 22%,transparent)}
.rkstep.cur .rkdot{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
.rkstep small{display:block;font-size:11.5px;font-weight:700;color:var(--muted);margin-top:4px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:520px){.rkstep small{display:none}.rkladder{gap:5px}}

.qpanel,.skcard{background:var(--panel);border:1px solid var(--hairline);border-radius:14px;padding:15px 15px 13px;
  box-shadow:var(--edge),var(--shadow)}
/* square cells look absurd stretched across a desktop column */
.skcard .skgrid{max-width:400px;margin:0 auto}
.skcard .skday{max-height:46px}
.mstlist{display:flex;flex-direction:column;gap:8px}
.mstrow{gap:13px;padding:12px 13px;background:var(--panel);color:var(--ink);transition:border-color .14s,transform .14s;box-shadow:var(--edge),var(--shadow)}
.mstrow:hover{border-color:var(--accent);transform:translateY(-1px)}
.mstring::after{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--panel)}
.mstring span{position:relative;z-index:1;font-size:13px;font-weight:700}
.mstmid{flex:1;min-width:0}
.mstmid b{display:block;font-size:15px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mstmid small{display:block;color:var(--muted);font-size:13px;margin-top:3px;line-height:1.4}
.mstgo{flex:0 0 auto;font-size:13px;font-weight:700;color:var(--accent-t);white-space:nowrap}
@media(min-width:1080px){.mstlist{display:grid;grid-template-columns:1fr 1fr;gap:10px}}

/* quiz combo */
.combotag{display:inline-block;background:color-mix(in srgb,var(--warn) 20%,transparent);
  color:var(--warn-t);font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;margin:0 8px 6px 0}

/* collapsible groups reused inside Settings / Rewards / Specialization */
.setgroup.ingroup{margin:0}
.setgroup.ingroup .setglabel{display:none}
/* the palette row runs out of width once it sits inside a collapsible card */
@media(max-width:520px){
  .setrow.palrow{flex-direction:column;align-items:flex-start;gap:8px}
  .setrow.palrow .swatches{justify-content:flex-start;margin-left:-9px}
}
.coll .setnote:last-child{margin-bottom:0}
.coll .tkabout,.coll .dashsection{margin-top:0}
.coll .savedsec{margin:0}
.coll .badgegrid{margin-top:0}
.coll .trow:first-child{margin-top:0}
.coll .resources{margin:0}
.collhead .collcount{white-space:nowrap}
/* a page that is only headers needs them to breathe a little less */
.coll+.coll{margin-top:9px}

/* ---------- course validation results ---------- */
.lintcard{border:1px solid var(--hairline);border-radius:14px;padding:13px 15px;margin:14px 0;background:var(--panel2)}
.lintcard.bad{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 8%,var(--panel2))}
.lintcard.warn{border-color:var(--warn)}
.lintcard.ok{border-color:var(--accent2)}
.linthead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:15px}
.linthead span{color:var(--muted);font-size:13px;font-weight:700;white-space:nowrap}
.lintlist{margin:9px 0 0;padding-left:18px;font-size:13px;line-height:1.55;color:var(--muted)}
.lintlist.err{color:var(--ink)}
.lintlist li{margin:3px 0}
.lintwarn{margin-top:9px}
.lintwarn>summary{cursor:pointer;font-size:13px;font-weight:700;color:var(--warn-t)}
.lintok{margin:8px 0 0;font-size:13px;color:var(--accent2-t)}

/* ---------- sync diagnostics ---------- */
.syncerr{background:color-mix(in srgb,var(--bad) 12%,transparent);border:1px solid var(--bad);
  border-radius:14px;padding:11px 13px;font-size:13px;line-height:1.5;color:var(--ink);margin:10px 0 2px}
.diag{margin-top:14px;border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:9px}
.diagrow{display:flex;align-items:flex-start;gap:11px;font-size:13px;line-height:1.45}
.diagrow b{font-weight:700;display:block}
.diagrow small{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.diagico{width:22px;height:22px;flex:0 0 auto;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:13px;font-weight:700;background:var(--panel3);color:var(--muted)}
.diagrow.ok .diagico{background:color-mix(in srgb,var(--accent2) 18%,transparent);color:var(--accent2-t)}
.diagrow.bad .diagico{background:color-mix(in srgb,var(--bad) 16%,transparent);color:var(--bad-t)}

/* ---------- offline bar ---------- */
#offbar{position:fixed;left:50%;bottom:0;transform:translate(-50%,120%);z-index:70;
  display:flex;align-items:center;gap:9px;background:var(--panel3);border:1px solid var(--hairline);
  border-bottom:none;border-radius:14px 14px 0 0;color:var(--ink);font-size:13px;font-weight:700;
  padding:10px 18px;box-shadow:var(--shadow);transition:transform .25s cubic-bezier(.4,0,.2,1);max-width:92vw}
#offbar.show{transform:translate(-50%,0)}
.offdot{width:8px;height:8px;border-radius:50%;background:var(--warn);flex:0 0 auto}
@media(min-width:1080px){#offbar{left:calc(50% + 132px)}}
.setval.ok{color:var(--accent2-t)}
/* danger used as TEXT needs the same treatment as the accents */
:root{--bad-t:color-mix(in srgb,var(--bad) 86%,#fff)}
html[data-theme="dark"]{--bad-t:color-mix(in srgb,var(--bad) 86%,#fff)}
html[data-theme="light"]{--bad-t:var(--bad)}
@media (prefers-color-scheme: light){:root{--bad-t:#c62d4d}}
.setrow.danger .setname{color:var(--bad-t)}
/* chooser links need a real hit area without moving anything */
.chtitle{padding:11px 0;margin:-11px 0}
.chfoot a{display:inline-block;padding:14px 0;margin:-14px 0}

/* ---------- keyboard focus, everywhere ---------- */
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible,label.opt:focus-visible,[tabindex]:focus-visible{
  outline:2px solid var(--accent);outline-offset:2px;border-radius:10px}

/* =========================================================================
   >= 1080px: the drawer becomes a permanent left rail and the single
   column becomes a real dashboard.
   ========================================================================= */
@media(min-width:1080px){
  body.hasrail{padding-left:264px}
  .navscrim{display:none!important}
  .navbtn{display:none!important}
  .navdrawer{left:0;right:auto;width:264px;max-width:264px;transform:none!important;
    border-left:none;border-right:1px solid var(--line);box-shadow:none;background:var(--panel);visibility:visible}
  .navclose{display:none}
  .navhead{padding:20px 18px 16px;border-bottom:1px solid var(--line)}
  .navlist{padding:12px 12px}
  .navitem{padding:11px 12px;font-size:15px}
  .navfoot{padding:12px 14px 16px}
  body.navopen{overflow:auto}
  .topbar a.brand{display:none}
  .topbar .iconbtn{display:none}
  .topbar.nb{display:none}
  .topbar{padding:9px 30px}
  .topbar .in,.wrap{max-width:1060px}
  .wrap{padding-left:30px;padding-right:30px;padding-bottom:70px}
  .topbar.nb + .wrap{padding-top:22px}
  footer{padding-left:30px;padding-right:30px}
  .dashhead h1{max-width:none;font-size:27px}
  .landinghero h1{max-width:20ch}
  .hero{padding-top:34px}
  /* settings-style row lists read better in a column, not a 1060px band */
  .setgroup,.setnote{max-width:780px}

  /* two-column dashboard */
  .dashcols{display:grid;grid-template-columns:minmax(0,1fr) 330px;column-gap:28px;align-items:start}
  .dashside{position:sticky;top:24px}
  .dashmain>.dashsection:first-child{margin-top:22px}
  .dashside>.dashsection:first-child{margin-top:22px}
  .statrow{grid-template-columns:1fr 1fr}
  /* suggested cards sit in a narrow grid cell — stack the action under the text */
  .homegrid .sugcard{flex-direction:column;align-items:stretch}
  .homegrid .sugcard .stripe{width:auto;height:5px}
  .homegrid .sugcard .libactions{border-left:none;border-top:1px solid var(--line);flex-direction:row;justify-content:flex-end}
  /* specialization header: progress left, action right */
  .trackhead .stcell{justify-content:flex-start}
  .trackhead .stpick{justify-content:flex-end}
  #toast{left:calc(50% + 132px)}

  /* grids that were stacked on phones */
  .homegrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:stretch}
  .homegrid>.libcard{margin:0}
  .homegrid .sugcard .libbody{flex:1}
  .homegrid>.libempty,.homegrid>.emptylib{grid-column:1/-1}
  .dashside .homegrid{grid-template-columns:1fr}
  .trackrows,.trackgrid,.careergrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .dashmain .trackgrid,.dashmain .trackrows{grid-template-columns:1fr}
  .chlist,.chlist-page,.dashmain .chlist{display:grid;grid-template-columns:1fr;gap:10px}
  /* #storelist used to hold the flat card grid directly. Now it holds one
     .stwrap, so a 2-column grid here left the whole right half of a 1440px
     window empty. The columns belong on .stlist, inside each group. */
  #storelist{display:block}
  #storelist>.revempty{grid-column:1/-1}
  /* the tabs, the search field and the cards below all share one left edge and
     one right edge; capping the tabs alone left the row looking unfinished */

  .readmain{min-width:0}
  .pagecard{margin-top:14px}
  /* keep prose at a comfortable measure even in a wide card */
  .lesson>p,.lesson>ul,.lesson>ol,.lesson>h4,.objectives,.quizsub,.startline{max-width:70ch}
  .tkabouttxt,.tkoutcomes,.dashhead .sub,.libstoresub,.reslist{max-width:74ch}
  /* page intros sit under a left-aligned h1 — don't centre their box */
  .dashhead .sub,.wrap>.sub,.dash>.sub{margin-left:0;max-width:74ch}
  /* single-focus screens read better in a column than a 1060px band */
  #revhost,.revempty,.flashcard,.matchwrap,.glosswrap{max-width:820px;margin-left:auto;margin-right:auto}

  /* pointer affordances */
  .libcard:hover,.trow:hover,.modcard:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
  .trow{transition:border-color .15s,transform .15s}
  a.trow:hover{transform:translateY(-1px)}
  .navitem{transition:background .15s}
}
/* The contents rail appears once the reading column can still hold ~60 characters */
@media(min-width:1200px){
  .readwrap{display:grid;grid-template-columns:minmax(0,1fr) 268px;column-gap:28px;align-items:start}
  .readrail{display:block;position:sticky;top:78px;margin-top:14px;max-height:calc(100vh - 96px);overflow-y:auto;scrollbar-width:thin}
}
@media(min-width:1500px){
  .topbar .in,.wrap{max-width:1180px}
  .homegrid{grid-template-columns:repeat(3,1fr)}
  .dashside .homegrid{grid-template-columns:1fr}
  .readwrap{grid-template-columns:minmax(0,1fr) 300px}
  .statrow{grid-template-columns:1fr 1fr}
}
/* wide but short (laptops): don't let the sticky rails outgrow the viewport */
@media(min-width:1080px){
  .dashside{max-height:calc(100vh - 96px);overflow-y:auto;scrollbar-width:thin}
  .dashside::-webkit-scrollbar,.readrail::-webkit-scrollbar{width:6px}
  .dashside::-webkit-scrollbar-thumb,.readrail::-webkit-scrollbar-thumb{background:var(--line);border-radius:3px}
}
/* no-JS reading view gets the same comfortable measure */
@media(min-width:1080px){
  #static-fallback .spage,#static-fallback .scard{max-width:820px}
}
`;

const tracks=JSON.parse(fs.readFileSync(src('data/tracks.json'),'utf8'));
var BUILTINS=JSON.stringify(courses).replace(/<\//g,'<\\/');
var TRACKS=JSON.stringify(tracks).replace(/<\//g,'<\\/');
var WARMUP=JSON.stringify(JSON.parse(fs.readFileSync(src('data/warmup.json'),'utf8'))).replace(/<\//g,'<\\/');
// Courses are served as separate JSON files so index.html stays small.
// Only lightweight summaries are inlined (used as an offline/no-fetch fallback).
const CATALOG_DIR=dist('catalog');
if(!fs.existsSync(CATALOG_DIR))fs.mkdirSync(CATALOG_DIR,{recursive:true});
fs.readdirSync(CATALOG_DIR).forEach(function(f){if(/\.json$/.test(f))fs.unlinkSync(CATALOG_DIR+'/'+f);});
const summary=c=>({id:c.id,title:c.title,subtitle:c.subtitle,tagline:c.tagline,accent:c.accent,
  price:c.price||0,author:c.author||'',category:c.category||'',weeks:c.weeks||0,hours:c.hours||0});
storeCatalog.forEach(function(c){fs.writeFileSync(CATALOG_DIR+'/'+c.id+'.json',JSON.stringify(c));});
// index.json has exactly one owner — make-catalog.js, the same script the repo's
// GitHub Action runs. Two writers with different formatting would flip-flop the
// file on every build and fight the Action's commit.
require('child_process').execSync('node '+JSON.stringify(src('make-catalog.js'))+' '+JSON.stringify(CATALOG_DIR),{stdio:'inherit'});
var inlineIndex=JSON.parse(fs.readFileSync(CATALOG_DIR+'/index.json','utf8'));
console.log('catalog: '+storeCatalog.length+' course files ('+
  Math.round(storeCatalog.reduce((n,c)=>n+JSON.stringify(c).length,0)/1024)+'KB total)');
var CATALOG=JSON.stringify(inlineIndex).replace(/<\//g,'<\\/');
var CONFIG='<script>\n/* ===== BACKEND CONFIG =====\n   Leave blank for offline/local-only mode (default).\n   To enable accounts + cross-device sync, paste your Supabase project URL and\n   anon (public) key below, then host the file. See SUPABASE-SETUP.md. */\nwindow.COURSEAPP_BACKEND = { url: "", anonKey: "" };\n</script>';
var FAVICON=TILE_URI;
// static fallback wordmark: use the mark as the "O"
appInner=appInner.replace(/<span class="brand">[\s\S]*?<\/span><\/span>/, '<span class="brand"><img class="obmark" src="'+MARK_URI+'" alt="O">boros</span>');
var html='<!DOCTYPE html>\n<html lang="en"><head>\n<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Oboros</title>\n<link rel="icon" href="'+FAVICON+'">\n<link rel="apple-touch-icon" href="'+TILE_URI+'">\n<link rel="manifest" href="./manifest.webmanifest">\n<meta name="theme-color" content="#f3efe2" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#101420" media="(prefers-color-scheme: dark)">\n<meta name="description" content="Oboros — a self-paced learning app that works offline.">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Oboros">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="mobile-web-app-capable" content="yes">\n<style>\n'+ROW_CSS+'\n'+style+'\n'+GAM_CSS+'\n'+NOTE_CSS+'\n'+QUIZ_CSS+'\n'+STUDY_CSS+'\n'+BACKEND_CSS+'\n'+MEDIA_CSS+'\n'+GLOSS_CSS+'\n'+ICON_CSS+'\n'+MOTION_CSS+'\n'+PATHS_CSS+'\n'+RW_CSS+'\n'+TUTOR_CSS+'\n'+DEPTH_CSS+'\n'+SEARCH_CSS+'\n'+READ_CSS+'\n'+CHEER_CSS+'\n'+BENTO_CSS+'\n'+TEXT_CSS+'\n'+BRAND_CSS+'\n'+DESKTOP_CSS+'\n</style></head>\n<body>\n<div id="app">'+appInner+'</div>\n<footer style="max-width:860px;margin:0 auto;color:var(--muted);text-align:center;font-size:13px;padding:26px 16px 40px">Oboros — a self-paced learning app. Educational only — not legal or financial advice. Passing mark is 80%. Progress saves in your browser on this device.</footer>\n'+CONFIG+'\n<script>\nwindow.OB_MARK = '+JSON.stringify(MARK_URI)+';\nwindow.BUILTIN_COURSES = '+BUILTINS+';\nwindow.STORE_CATALOG = '+CATALOG+';\nwindow.COURSEAPP_CATALOG = "./catalog";\nwindow.TRACKS = '+TRACKS+';\nwindow.WARMUP = '+WARMUP+';\n</script>\n<script>\n'+renderersJs+'\n</script>\n<script>\n'+engineJs+'\n</script>\n</body></html>';

/* The web app manifest. It only means anything when the app is hosted — a
   single file opened from disk has no origin to install into — so it is written
   alongside index.html and linked relatively. Nothing breaks without it. */
var MANIFEST={
  name:'Oboros', short_name:'Oboros',
  description:'A self-paced learning app that works offline.',
  start_url:'./', scope:'./', id:'/',
  display:'standalone', display_override:['standalone','minimal-ui'],
  orientation:'any',
  background_color:'#f3efe2', theme_color:'#f3efe2',
  categories:['education','productivity'],
  icons:[
    {src:'./icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
    {src:'./icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
    {src:'./icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
  ],
  shortcuts:[
    {name:'Daily warm-up',url:'./#warmup'},
    {name:'Review',url:'./#review'},
    {name:'Library',url:'./#library'}
  ]
};
fs.writeFileSync(dist('manifest.webmanifest'),JSON.stringify(MANIFEST,null,2));
console.log('written manifest.webmanifest');

fs.writeFileSync(dist('index.html'), html);
console.log('written dist/index.html ('+html.length+' bytes)');
// Service worker, stamped with a hash of the shell so every deploy invalidates
// the old precache instead of stranding people on a stale build.
var swBuild=require('crypto').createHash('sha1').update(html).digest('hex').slice(0,12);
var sw=fs.readFileSync(src('sw.src.js'),'utf8').replace('__BUILD__',swBuild);
fs.writeFileSync(dist('sw.js'),sw);
console.log('written sw.js (build '+swBuild+')');
