// E-commerce Operations Atlas: site logic, ported from legacy/index.html.
// Content comes from atlas-data.js (generated from data/ and rules/); calculations from calculators.js (models/).
// Licensed under Apache-2.0 (see LICENSE).
import * as Calc from "./calculators.js";
(function(){
let lang="en"; try{lang=localStorage.getItem("ecomLang")||"en"}catch(e){}
const tx=k=>UI[lang][k];
const tf=(k,o)=>String(tx(k)).replace(/\{(\w+)\}/g,(_,x)=>o[x]);
const ZH={dom:DOMAINS.map(d=>({name:d.name,desc:d.desc})),nodes:Object.fromEntries(NODES.map(n=>[n.id,{n:n.n,what:n.what,how:n.how,m:n.m,data:n.data}])),
  edges:EDGES.map(e=>e[2]),ex:{...EX},tour:TOUR.map(x=>({title:x.title,one:x.one,ex:x.ex})),gloss:{...GLOSS},phases:PHASES.map(x=>({t:x.t,out:x.out,warn:x.warn})),tools:TOOLS.map(x=>x.t)};
function applyData(l){
  const E=l==="en";
  DOMAINS.forEach((d,i)=>{const z=E?DOMAINS_EN[d.k]:ZH.dom[i]; d.name=z.name; d.desc=z.desc;});
  NODES.forEach(n=>{const z=E?NODES_EN[n.id]:ZH.nodes[n.id]; n.n=z.n; n.what=z.what; n.how=z.how; n.m=z.m; n.data=z.data;});
  EDGES.forEach((e,i)=>{e[2]=E?EDGE_EN_LIST[i]:ZH.edges[i];});
  Object.assign(EX,E?EX_EN:ZH.ex);
  TOUR.forEach((x,i)=>{const z=E?TOUR_EN[i]:ZH.tour[i]; x.title=z.title; x.one=z.one; x.ex=z.ex;});
  Object.keys(GLOSS).forEach(k=>delete GLOSS[k]); Object.assign(GLOSS,E?GLOSS_EN:ZH.gloss);
  PHASES.forEach((x,i)=>{const z=E?PHASES_EN[i]:ZH.phases[i]; x.t=z.t; x.out=z.out; x.warn=z.warn;});
  TOOLS.forEach((x,i)=>{x.t=E?TOOLS_EN[i]:ZH.tools[i];});
}
applyData(lang);
const byId = Object.fromEntries(NODES.map(n=>[n.id,n]));
const dom = Object.fromEntries(DOMAINS.map(d=>[d.k,d]));
const out = {}, inn = {};
NODES.forEach(n=>{out[n.id]=[];inn[n.id]=[]});
EDGES.forEach(([a,b,l])=>{ if(!byId[a]||!byId[b]) console.warn("bad edge",a,b); else {out[a].push({to:b,l});inn[b].push({to:a,l});}});
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let GRE, GCI={};
function buildGloss(){
  const keys=Object.keys(GLOSS).sort((a,b)=>b.length-a.length); GCI={}; keys.forEach(k=>GCI[k.toLowerCase()]=k);
  GRE=new RegExp("(?<![A-Za-z0-9])("+keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/&/g,"(?:&|&amp;)")).join("|")+")(?![A-Za-z0-9])",lang==="en"?"gi":"g");
}
buildGloss();
function gl(escaped){ const seen=new Set(); return escaped.replace(GRE,m=>{ const k=GLOSS[m]?m:GCI[m.toLowerCase().replace(/&amp;/g,"&")]; if(!k||seen.has(k)) return m; seen.add(k); return `<span class="term" tabindex="0" data-term="${esc(k)}">${m}</span>`; }); }
function rebuildAdj(){ NODES.forEach(n=>{out[n.id].length=0;inn[n.id].length=0}); EDGES.forEach(([a,b,l])=>{out[a].push({to:b,l});inn[b].push({to:a,l});}); }
const G=t=>gl(esc(t));

/* ---------- market rules (rules/): law of the destination country + rules of the chosen marketplace ---------- */
const MARKETS=[...new Set(RULES.filter(r=>r.kind==="platform").map(r=>r.platform+"/"+r.marketplace))];
let market=MARKETS[0]; try{const m=localStorage.getItem("ecomMarket"); if(MARKETS.includes(m)) market=m;}catch(e){}
const marketLabel=()=>{const [p,m]=market.split("/"); return tx(`sel_${p}_${m}`)||market;};
const today=(d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`)(new Date());
function applies(r){ const [p,m]=market.split("/"); return r.kind==="law" ? (r.jurisdiction===m||r.jurisdiction.startsWith(m+"-")) : (r.platform===p&&r.marketplace===m); }
function kindLabel(r){ const k=r.kind==="law"?`k_law_${r.jurisdiction.replace(/-/g,"_")}`:`k_plat_${r.platform}_${r.marketplace}`; return tx(k)||(r.kind==="law"?r.jurisdiction.toUpperCase():`${r.platform} ${r.marketplace}`); }
const ruleById=Object.fromEntries(RULES.map(r=>[r.id,r]));
const ruleNodes=id=>NODES.filter(n=>(n.rules||[]).includes(id));
const ruleAnchor=id=>"rule-"+id.split("/").join("-");
function ruleCard(r,{links=true}={}){
  return `<div class="rule ${r.kind}" id="${esc(ruleAnchor(r.id))}">
   <div><span class="kind ${r.kind}">${esc(kindLabel(r))}</span>${r.status==="pending"?`<span class="warn">${tx("r_pending")}</span>`:""}</div>
   <p>${G(r.summary[lang])}</p>
   ${r.next_review<today?`<p class="warn">${tx("r_stale")}</p>`:""}
   <div class="meta">${r.effective_date?`<span>${tx("r_effective")} ${r.effective_date}</span>`:""}<span>${tx("r_checked")} ${r.last_checked}</span><span>${tx("r_next")} ${r.next_review}</span></div>
   <details><summary style="font-size:13px;cursor:pointer">${tx("r_sources")} (${r.sources.length})</summary><ul class="srcl">${r.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> · ${esc(s.publisher)}</li>`).join("")}</ul></details>
   ${links?`<div class="links">${ruleNodes(r.id).map(n=>`<button class="chip" style="--dc:var(${dom[n.d].c})" data-jump="${n.id}">${esc(n.n)}</button>`).join("")}</div>`:""}
  </div>`;
}
function nodeRules(n){
  const rs=(n.rules||[]).map(id=>ruleById[id]).filter(r=>r&&applies(r));
  return rs.length ? rs.map(r=>ruleCard(r,{links:false})).join("") : `<p style="color:var(--muted);font-size:14px">${tx("no_rules")}</p>`;
}
let sel = null, mode = "down", curView = "h";
const hvS = {level:1, domain:null};
let MAXD = 3;
document.querySelectorAll("[data-depth]").forEach(b=>b.onclick=()=>{
  MAXD=+b.dataset.depth;
  document.querySelectorAll("[data-depth]").forEach(x=>x.setAttribute("aria-pressed",x===b));
  render();
});

/* build map */
const map = document.getElementById("map"), ov = document.getElementById("ov"), detail = document.getElementById("detail");
function buildMap(){
map.querySelectorAll(".domain").forEach(x=>x.remove());
DOMAINS.forEach(d=>{
  const box = document.createElement("div");
  box.className = "domain"; box.style.setProperty("--dc", `var(${d.c})`);
  box.innerHTML = `<h3><span>${esc(d.name)}</span><span class="code">${esc(d.code)}</span></h3><p class="dd">${esc(d.desc)}</p><div class="chips"></div>`;
  const chips = box.querySelector(".chips");
  NODES.filter(n=>n.d===d.k).forEach(n=>{
    const b = document.createElement("button");
    b.type="button"; b.className="chip"; b.dataset.id=n.id; b.style.setProperty("--dc",`var(${d.c})`);
    b.textContent = n.n; b.dataset.st = tx("src");
    b.addEventListener("click",()=>select(sel===n.id?null:n.id, true));
    chips.appendChild(b);
  });
  map.appendChild(box);
});
document.getElementById("nodelist").innerHTML = NODES.map(n=>`<option value="${esc(n.n)}">`).join("");
}
buildMap();
const q = document.getElementById("q");
q.addEventListener("change",()=>{const v=q.value.trim().toLowerCase(); if(!v) return; const n=NODES.find(x=>x.n.toLowerCase()===v)||NODES.find(x=>x.n.toLowerCase().includes(v)); if(n){select(n.id,true); q.value="";}});
q.addEventListener("keydown",e=>{if(e.key==="Enter"){q.dispatchEvent(new Event("change"))}});

function setMode(m){
  mode=m; map.dataset.mode=m; detail.dataset.mode=m;
  document.getElementById("m-down").setAttribute("aria-pressed",m==="down");
  document.getElementById("m-up").setAttribute("aria-pressed",m==="up");
  renderLegend(); render();
}
document.getElementById("m-down").onclick=()=>setMode("down");
document.getElementById("m-up").onclick=()=>setMode("up");

function renderLegend(){
  const w = mode==="down"?tx("lvDown"):tx("lvUp");
  const c = mode==="down"?["--l1","--l2","--l3"]:["--up1","--up2","--up3"];
  document.getElementById("legend").innerHTML = w.map((t,i)=>`<span><i style="background:var(${c[i]})"></i>${t}</span>`).join("");
}

function bfs(start){
  const adj = mode==="down"?out:inn;
  const lvl = {[start]:0}, par = {}, order=[[],[],[],[]];
  let frontier=[start];
  for(let d=1; d<=MAXD; d++){
    const next=[];
    frontier.forEach(u=>adj[u].forEach(({to,l})=>{
      if(lvl[to]===undefined){lvl[to]=d; par[to]={from:u,l}; next.push(to); order[d].push(to);}
    }));
    frontier=next;
  }
  return {lvl,par,order};
}

function select(id, scroll){
  sel=id;
  if(id){ hvS.level=3; hvS.domain=byId[id].d; } else if(hvS.level===3){ hvS.level=2; }
  render();
  if(id && scroll && window.matchMedia("(max-width:1040px)").matches) detail.scrollIntoView({behavior:"smooth",block:"start"});
}

function render(){
  const chips = map.querySelectorAll(".chip");
  map.classList.toggle("has-sel",!!sel);
  let res=null;
  if(sel) res=bfs(sel);
  chips.forEach(c=>{
    const id=c.dataset.id; c.className="chip";
    c.querySelector(".ord")?.remove();
    if(!sel){ if(inn[id].length===0) c.classList.add("src"); return; }
    if(id===sel) c.classList.add("sel");
    else if(res.lvl[id]!==undefined) c.classList.add("lv"+res.lvl[id]);
    else c.classList.add("dim");
  });
  if(!map.hidden) drawEdges(res);
  m3.update(res);
  renderHV();
  renderDetail(res);
}

function drawEdges(res){
  const R = map.getBoundingClientRect();
  ov.setAttribute("viewBox",`0 0 ${R.width} ${R.height}`);
  if(!res){ov.innerHTML="";return;}
  let s = `<defs>${[1,2,3].map(k=>`<marker id="ar${k}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="m${k}" d="M0,0 L8,4 L0,8 z"/></marker>`).join("")}</defs>`;
  const pos = id=>{const el=map.querySelector(`.chip[data-id="${id}"]`).getBoundingClientRect();return {x:el.left-R.left+el.width/2,y:el.top-R.top+el.height/2,w:el.width,h:el.height};};
  Object.entries(res.par).forEach(([child,{from}])=>{
    const k=res.lvl[child];
    let a=pos(from), b=pos(child);
    if(mode==="up"){[a,b]=[b,a];} // arrows always point in causal direction
    const clip=(p,q)=>{const dx=q.x-p.x,dy=q.y-p.y; const t=Math.min(Math.abs((p.w/2+2)/(dx||1e-6)),Math.abs((p.h/2+2)/(dy||1e-6)),1); return {x:p.x+dx*t,y:p.y+dy*t};};
    const p1=clip(a,b), p2=clip(b,a);
    const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2, dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.hypot(dx,dy)||1;
    const bend=Math.min(60,len*0.18);
    const cx=mx-dy/len*bend, cy=my+dx/len*bend;
    s+=`<path class="e l${k}" d="M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}" marker-end="url(#ar${k})"/>`;
  });
  ov.innerHTML=s;
}


let moreOpen=false;
function renderDetail(res){
  if(!sel && curView!=="2d" && hvS.level===2){ renderDomainPanel(hvS.domain); return; }
  if(!sel){
    detail.innerHTML = `<div class="empty"><h2>${tx("e_h")}</h2>
    <p style="color:var(--muted);margin-bottom:10px">${tx("e_p")}</p>
    <p><button class="ghost" id="gotour">${tx("e_tour")}</button></p>
    <p style="color:var(--muted);font-size:13.5px;margin-top:12px">${tx("e_or")} ${["unit_econ","landed_cost","inventory_plan"].map(id=>`<button class="ghost" data-go="${id}">${esc(byId[id].n)}</button>`).join(" ")}</p></div>`;
    detail.querySelector("#gotour").onclick=()=>{location.hash="tour";};
    detail.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>select(b.dataset.go,true));
    return;
  }
  const n=byId[sel], d=dom[n.d];
  detail.style.setProperty("--dc",`var(${d.c})`);
  const lvName = ["",...(mode==="down"?tx("lvDown"):tx("lvUp"))];
  let chain="";
  for(let k=1;k<=MAXD;k++){
    if(!res.order[k].length) continue;
    chain+=`<div class="lvl k${k}"><b>${lvName[k]} · ${res.order[k].length}</b><ul>`+res.order[k].map(id=>{
      const p=res.par[id];
      const via = mode==="down" ? `${esc(byId[p.from].n)} → ${esc(byId[id].n)}` : `${esc(byId[id].n)} → ${esc(byId[p.from].n)}`;
      return `<li><button data-go="${id}">${esc(byId[id].n)}</button> <span class="via">${via}：${esc(p.l)}</span></li>`;
    }).join("")+`</ul></div>`;
  }
  if(!chain) chain = `<p style="color:var(--muted);font-size:14px">${mode==="down"?tx("noDown"):tx("noUp")}</p>`;
  detail.innerHTML = `
   <div class="dtag">${esc(d.code)} · ${esc(d.name)}</div>
   <h2>${esc(n.n)}</h2>
   ${lang==="en"?"":`<div style="font-family:var(--mono);font-size:12px;color:var(--muted)">${esc(n.en)}</div>`}
   <h4>${tx("h_what")}</h4><p>${G(n.what)}</p>
   <h4>${tx("h_ex")}</h4><div class="exbox"><span class="badge">${tx("badge")}</span>${G(EX[n.id]||"")}</div>
   <details class="more" id="more"${moreOpen?" open":""}><summary>${tx("more")}</summary>
   <h4>${tx("h_how")}</h4><ol>${n.how.map(h=>`<li>${G(h)}</li>`).join("")}</ol>
   <h4>${tx("h_m")}</h4><div class="metrics">${n.m.map(x=>`<span>${G(x)}</span>`).join("")}</div>
   <h4>${tf("h_rules",{m:esc(marketLabel())})}</h4>${nodeRules(n)}
   <h4>${tx("h_data")}</h4><p class="datab">${G(n.data)}</p>
   <h4>${mode==="down"?tx("h_chainDown"):tx("h_chainUp")}</h4>
   <div class="chain">${chain}</div>
   <div class="btnrow"><button class="ghost" id="flip">${mode==="down"?tx("flipDown"):tx("flipUp")}</button></div>
   </details>
   <div class="btnrow" style="margin-top:12px"><button class="ghost" id="clr">${tx("back")}</button></div>`;
  detail.querySelector("#more").addEventListener("toggle",e=>{moreOpen=e.target.open;});
  detail.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>select(b.dataset.go,false));
  detail.querySelector("#flip").onclick=()=>setMode(mode==="down"?"up":"down");
  detail.querySelector("#clr").onclick=()=>select(null);
  detail.scrollTop=0;
}

let rt; window.addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>{if(sel)render();},120)});
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{if(sel)render();});

/* ---------- 3D topology (layered, shares level state with the layered view) ---------- */
function domainLayers(k){
  const ids=NODES.filter(n=>n.d===k).map(n=>n.id), set=new Set(ids);
  const ie=EDGES.filter(([a,b])=>set.has(a)&&set.has(b));
  const st={}, back=new Set();
  const dfs=u=>{st[u]=1; ie.filter(e=>e[0]===u).forEach(([,v])=>{if(st[v]===1)back.add(u+">"+v); else if(!st[v])dfs(v);}); st[u]=2;};
  ids.filter(id=>!ie.some(e=>e[1]===id)).forEach(id=>{if(!st[id])dfs(id)}); ids.forEach(id=>{if(!st[id])dfs(id)});
  const L={}; const lay=id=>{if(L[id]!==undefined)return L[id]; let m=0; ie.filter(e=>e[1]===id&&!back.has(e[0]+">"+id)).forEach(([a])=>m=Math.max(m,lay(a)+1)); return L[id]=m;};
  ids.forEach(lay);
  return {ids,ie,back,L,nL:Math.max(...ids.map(i=>L[i]))+1};
}
const m3 = (function(){
  const wrap=document.getElementById("m3"), cv=wrap.querySelector("canvas"), ctx=cv.getContext("2d");
  const legend=document.getElementById("m3legend");
  let C={}, scene={nodes:[],edges:[]}, sceneKey="", NB={};
  function hexRgb(h){h=(h||"#888").trim().replace("#",""); if(h.length===3)h=h.split("").map(c=>c+c).join(""); const v=parseInt(h,16); return [(v>>16)&255,(v>>8)&255,v&255];}
  const VARS=["--fg","--muted","--surface","--bg","--ink","--up1","--l1","--line",...DOMAINS.map(d=>d.c)];
  function readColors(){const cs=getComputedStyle(document.documentElement); VARS.forEach(v=>C[v]=hexRgb(cs.getPropertyValue(v))); dirty=true;}
  const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix=(c,w,t)=>c.map((v,i)=>Math.round(v+(w[i]-v)*t));

  /* scene builders */
  function circle(n,r,i,off){const a=(n<=1?0:i/n*Math.PI*2)+(off||0); return [r*Math.cos(a), r*Math.sin(a)];}
  function buildL1(){
    const nodes=[], edges=[];
    MAIN.forEach((k,i)=>{const a=Math.PI*0.8-i/8*Math.PI*2; const n=NODES.filter(x=>x.d===k).length;
      nodes.push({id:"d:"+k,kind:"dom",key:k,label:dom[k].name,sub:`0${i+1} · ${tf("nodesN",{n})}`,col:dom[k].c,r:18,x:330*Math.cos(a),y:0,z:330*Math.sin(a)});});
    nodes.push({id:"d:D",kind:"dom",key:"D",label:dom.D.name,sub:tx("support"),col:dom.D.c,r:15,x:0,y:330,z:0});
    for(let i=0;i<MAIN.length-1;i++) edges.push({a:"d:"+MAIN[i],b:"d:"+MAIN[i+1],col:"--muted",w:2});
    edges.push({a:"d:$",b:"d:S",col:dom["$"].c,w:2,dash:true,label:tx("loop")});
    MAIN.forEach(k=>edges.push({a:"d:D",b:"d:"+k,col:"--muted",w:1,dash:true,faint:true,noArrow:true}));
    {const g=tx("lg1"); legend.innerHTML=`<span><i style="width:16px;height:0;border-radius:0;border-top:2px solid var(--muted)"></i>${g[0]}</span><span class="fb"><i></i>${g[1]}</span><span>${g[2]}</span>`;}
    return {nodes,edges,yaw:0,pitch:0.5};
  }
  function buildL2(k){
    const {ids,ie,back,L,nL}=domainLayers(k), cl=crossLinks(k), nodes=[], edges=[];
    for(let l=0;l<nL;l++){const row=ids.filter(i=>L[i]===l), rr=row.length<=1?0:60+26*row.length;
      row.forEach((id,i)=>{const [x,z]=circle(row.length,rr,i,l*0.9); nodes.push({id,kind:"node",key:id,label:byId[id].n,col:dom[k].c,r:13,x,y:(l-(nL-1)/2)*115,z});});}
    const port=(arr,side,pre)=>arr.forEach((dk,i)=>{const n=arr.length, rr=n<=1?0:50+26*n; const [y,z]=circle(n,rr,i,0.4);
      nodes.push({id:pre+dk,kind:"port",key:dk,label:dom[dk].name,sub:tf("rels",{n:(pre==="in:"?cl.ins:cl.outs)[dk].length}),col:dom[dk].c,r:9,x:side*330,y,z});});
    port(cl.inK,-1,"in:"); port(cl.outK,1,"out:");
    Object.entries(cl.ins).forEach(([dk,es])=>es.forEach(e=>edges.push({a:"in:"+dk,b:e.b,col:dom[dk].c,w:1.2,ext:true,tip:`${byId[e.a].n} → ${byId[e.b].n}：${e.l}`})));
    Object.entries(cl.outs).forEach(([dk,es])=>es.forEach(e=>edges.push({a:e.a,b:"out:"+dk,col:dom[dk].c,w:1.2,ext:true,tip:`${byId[e.a].n} → ${byId[e.b].n}：${e.l}`})));
    ie.forEach(([a,b,l])=>edges.push({a,b,col:"--fg",w:2,dash:back.has(a+">"+b),tip:`${byId[a].n} → ${byId[b].n}：${l}`}));
    {const g=tx("lg2"); legend.innerHTML=`<span><i style="background:var(${dom[k].c})"></i>${esc(g[0].replace("{d}",dom[k].name))}</span><span><i style="width:7px;height:7px;opacity:.7;background:var(--muted)"></i>${g[1]}</span><span><i style="width:7px;height:7px;opacity:.7;background:var(--muted)"></i>${g[2]}</span><span class="fb"><i></i>${g[3]}</span>`;}
    return {nodes,edges,yaw:-0.25,pitch:0.22};
  }
  function buildL3(id){
    const n=byId[id], ins=inn[id], outs=out[id], nodes=[], edges=[];
    nodes.push({id,kind:"center",key:id,label:n.n,sub:dom[n.d].name,col:dom[n.d].c,r:22,x:0,y:0,z:0});
    const ring=(arr,side,pre)=>arr.forEach((o,i)=>{const k=arr.length, rr=k<=1?0:55+30*k; const [y,z]=circle(k,rr,i,0.3); const m=byId[o.to];
      nodes.push({id:pre+o.to,kind:"node",key:o.to,label:m.n,sub:o.l,col:dom[m.d].c,r:12,x:side*300,y,z});
      edges.push(side<0?{a:pre+o.to,b:id,col:"--up1",w:2,tip:o.l}:{a:id,b:pre+o.to,col:"--l1",w:2,tip:o.l});});
    ring(ins,-1,"i:"); ring(outs,1,"o:");
    {const g=tx("lg3"); legend.innerHTML=`<span><i style="background:var(--up1)"></i>${g[0].replace("{a}",ins.length)}</span><span><i style="background:var(--l1)"></i>${g[1].replace("{b}",outs.length)}</span><span>${g[2]}</span>`;}
    return {nodes,edges,yaw:0.3,pitch:0.2};
  }
  function rebuild(){
    const key=`${hvS.level}|${hvS.domain}|${sel}`; if(key===sceneKey) return; sceneKey=key;
    scene = hvS.level===1?buildL1(): hvS.level===2?buildL2(hvS.domain): buildL3(sel);
    NB={}; scene.nodes.forEach(n=>NB[n.id]=n);
    yaw=scene.yaw; pitch=scene.pitch; zoomMul=1; appear=0; hover=null; fit(); dirty=true;
  }

  /* camera */
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W=0,H=0,dpr=1,yaw=0,pitch=.3,zoomMul=1,baseZoom=1,ox=0,oy=0,dirty=true,hover=null,auto=false,appear=1,proj={};
  const F=2400;
  let portrait=false;
  function rot(p0){const p=!portrait?p0:hvS.level>=2?{x:p0.y,y:p0.x,z:p0.z}:{x:p0.x,y:p0.z,z:p0.y}; const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const x1=p.x*cy+p.z*sy, z1=-p.x*sy+p.z*cy, y1=p.y*cp-z1*sp, z2=p.y*sp+z1*cp, s=F/(F+z2); return {x:x1*s,y:y1*s,s,z:z2};}
  function fit(){
    if(!W||!scene.nodes.length) return;
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    // fit over a full turn so auto-rotation never leaves the frame
    const sv=yaw; for(let t=0;t<8;t++){yaw=sv+t/8*Math.PI*2; scene.nodes.forEach(p=>{const r=rot(p);x0=Math.min(x0,r.x-p.r);x1=Math.max(x1,r.x+p.r);y0=Math.min(y0,r.y-p.r);y1=Math.max(y1,r.y+p.r);});} yaw=sv;
    const labelPad=W<500?90:150;
    baseZoom=Math.min(1.6,(W-labelPad-40)/(x1-x0||1),(H-110)/(y1-y0||1)); ox=(x0+x1)/2+labelPad/2/baseZoom*0.5; oy=(y0+y1)/2;
  }
  function resize(){const r=wrap.getBoundingClientRect(); if(!r.width) return; dpr=Math.min(window.devicePixelRatio||1,2); W=r.width; H=r.height;
    portrait=H>W*1.15; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); fit(); dirty=true;}
  new ResizeObserver(resize).observe(wrap);

  function project(){const z0=baseZoom*zoomMul; scene.nodes.forEach(p=>{const r=rot(p); proj[p.id]={x:W/2+(r.x-ox)*z0,y:H/2+8+(r.y-oy)*z0,s:r.s,z:r.z,R:Math.max(4,p.r*r.s*z0)};});}
  function arrow(x1,y1,x2,y2,size,color){const a=Math.atan2(y2-y1,x2-x1); ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x2,y2);
    ctx.lineTo(x2-size*Math.cos(a-0.42),y2-size*Math.sin(a-0.42)); ctx.lineTo(x2-size*Math.cos(a+0.42),y2-size*Math.sin(a+0.42)); ctx.closePath(); ctx.fill();}

  function draw(){
    if(!W) return;
    ctx.clearRect(0,0,W,H); project();
    const A=appear, hv=hover;
    const conn=e=>hv&&(e.a===hv||e.b===hv);
    const zs=scene.nodes.map(n=>proj[n.id].z), zmin=Math.min(...zs), zmax=Math.max(...zs);
    const depth=id=>1-(proj[id].z-zmin)/((zmax-zmin)||1);
    // edges, far first
    const es=[...scene.edges].sort((e,f)=>(proj[f.a].z+proj[f.b].z)-(proj[e.a].z+proj[e.b].z));
    es.forEach(e=>{
      const a=proj[e.a], b=proj[e.b]; const c=C[e.col];
      const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1;
      const x1=a.x+dx/len*(a.R+2), y1=a.y+dy/len*(a.R+2), x2=b.x-dx/len*(b.R+4), y2=b.y-dy/len*(b.R+4);
      const dpt=(depth(e.a)+depth(e.b))/2;
      let al=(e.faint?.25:e.ext?.45:.8)*(.55+.45*dpt);
      if(hv) al = conn(e)? 1 : al*.18;
      al*=A;
      ctx.strokeStyle=rgba(c,al); ctx.lineWidth=(conn(e)?e.w+1:e.w); ctx.setLineDash(e.dash?[6,5]:[]);
      // gentle arc so edges read as 3D curves
      const mx=(x1+x2)/2-dy/len*len*0.08, my=(y1+y2)/2+dx/len*len*0.08;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(mx,my,x2,y2); ctx.stroke(); ctx.setLineDash([]);
      if(!e.noArrow) arrow(mx,my,x2,y2,e.ext?7:9,rgba(c,Math.min(1,al+.15)));
      if(e.label && (!hv||conn(e))){ctx.font=`500 12px "Noto Sans SC","PingFang SC",sans-serif`; ctx.textAlign="center"; ctx.fillStyle=rgba(C["--muted"],A); ctx.fillText(e.label,mx,my-8);}
    });
    // nodes far → near
    const ns=[...scene.nodes].sort((a,b)=>proj[b.id].z-proj[a.id].z);
    ns.forEach(n=>{
      const p=proj[n.id], c=C[n.col], dp=depth(n.id);
      let al=(.55+.45*dp)*A; const on=!hv||n.id===hv||scene.edges.some(e=>conn(e)&&(e.a===n.id||e.b===n.id));
      if(!on) al*=.3;
      const g=ctx.createRadialGradient(p.x-p.R*.35,p.y-p.R*.4,p.R*.1,p.x,p.y,p.R);
      g.addColorStop(0,rgba(mix(c,[255,255,255],.55),al)); g.addColorStop(1,rgba(c,al));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.R,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
      if(n.kind==="port"){ctx.setLineDash([3,3]); ctx.lineWidth=1.2; ctx.strokeStyle=rgba(C["--fg"],.5*al); ctx.beginPath(); ctx.arc(p.x,p.y,p.R+4,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);}
      if(n.kind==="center"){ctx.lineWidth=2; ctx.strokeStyle=rgba(C["--fg"],A); ctx.beginPath(); ctx.arc(p.x,p.y,p.R+5,0,Math.PI*2); ctx.stroke();}
      if(n.id===hv){ctx.lineWidth=2; ctx.strokeStyle=rgba(C["--fg"],.9); ctx.beginPath(); ctx.arc(p.x,p.y,p.R+3,0,Math.PI*2); ctx.stroke();}
      // label
      const big=n.kind==="center"||n.kind==="dom";
      const fs=Math.max(11.5,Math.min(big?18:15,(big?15.5:13.5)*Math.sqrt(p.s*zoomMul)));
      const la=on?(.5+.5*dp)*A:.25*A;
      ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.lineJoin="round";
      ctx.font=`${big||n.id===hv?700:600} ${fs}px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif`;
      const tx=p.x+p.R+7, ty=n.sub?p.y-7:p.y;
      ctx.lineWidth=3.5; ctx.strokeStyle=rgba(C["--bg"],.85*la); ctx.strokeText(n.label,tx,ty);
      ctx.fillStyle=rgba(C["--fg"],la); ctx.fillText(n.label,tx,ty);
      if(n.sub){ctx.font=`400 ${Math.max(10.5,fs-3)}px "Noto Sans SC","PingFang SC",sans-serif`;
        const sub=n.id===hv?n.sub:fitText(n.sub,lang==="en"?240:200,Math.max(10.5,fs-3));
        ctx.strokeText(sub,tx,ty+fs*.95); ctx.fillStyle=rgba(C["--muted"],la); ctx.fillText(sub,tx,ty+fs*.95);}
    });
  }

  /* interaction */
  const ptrs=new Map(); let moved=0,pinch0=0,zoom0=1;
  function hit(x,y){let best=null,bz=1e9; scene.nodes.forEach(n=>{const p=proj[n.id]; if(p&&Math.hypot(p.x-x,p.y-y)<p.R+8&&p.z<bz){best=n;bz=p.z;}}); return best;}
  const local=e=>{const r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top};};
  cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,local(e)); moved=0;
    if(ptrs.size===2){const [a,b]=[...ptrs.values()]; pinch0=Math.hypot(a.x-b.x,a.y-b.y); zoom0=zoomMul;}});
  cv.addEventListener("pointermove",e=>{const q=local(e);
    if(!ptrs.has(e.pointerId)){const h=hit(q.x,q.y), id=h?h.id:null; if(id!==hover){hover=id; cv.classList.toggle("hov",!!h); dirty=true;} return;}
    const p=ptrs.get(e.pointerId);
    if(ptrs.size===1){const dx=q.x-p.x, dy=q.y-p.y; moved+=Math.abs(dx)+Math.abs(dy); yaw+=dx*.006; pitch=Math.max(-1.3,Math.min(1.3,pitch+dy*.006)); cv.classList.add("drag"); dirty=true;}
    ptrs.set(e.pointerId,q);
    if(ptrs.size===2){const [a,b]=[...ptrs.values()]; zoomMul=Math.max(.4,Math.min(4,zoom0*Math.hypot(a.x-b.x,a.y-b.y)/(pinch0||1))); moved=99; dirty=true;}});
  cv.addEventListener("pointerup",e=>{const single=ptrs.size===1, q=local(e); ptrs.delete(e.pointerId); cv.classList.remove("drag");
    if(single&&moved<6){const h=hit(q.x,q.y); if(!h) return;
      if(h.kind==="dom"){hvS.level=2;hvS.domain=h.key;sel=null;render();}
      else if(h.kind==="port"){hvS.level=2;hvS.domain=h.key;sel=null;render();}
      else if(h.kind==="node") select(h.key,false);}});
  cv.addEventListener("pointercancel",e=>{ptrs.delete(e.pointerId);cv.classList.remove("drag");});
  cv.addEventListener("pointerleave",()=>{if(hover){hover=null;cv.classList.remove("hov");dirty=true;}});
  cv.addEventListener("wheel",e=>{e.preventDefault(); zoomMul=Math.max(.4,Math.min(4,zoomMul*Math.exp(-e.deltaY*.0015))); dirty=true;},{passive:false});
  const rotBtn=document.getElementById("m3rot");
  rotBtn.onclick=()=>{auto=!auto; rotBtn.setAttribute("aria-pressed",auto);};
  document.getElementById("m3reset").onclick=()=>{yaw=scene.yaw;pitch=scene.pitch;zoomMul=1;fit();dirty=true;};
  if(!reduce){auto=true; rotBtn.setAttribute("aria-pressed","true");}
  readColors();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",readColors);
  new MutationObserver(readColors).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>dirty=true);
  (function loop(){
    if(wrap.offsetParent!==null){
      if(appear<1){appear=reduce?1:Math.min(1,appear+0.07); dirty=true;}
      if(auto&&ptrs.size===0&&!hover){yaw+=0.0025; dirty=true;}
      if(dirty){draw(); dirty=false;}
    }
    requestAnimationFrame(loop);
  })();
  return { reset(){ sceneKey=""; if(!wrap.hidden){rebuild(); dirty=true;} }, update(){ if(!wrap.hidden){ rebuild(); dirty=true; } }, show(on){ wrap.hidden=!on; if(on){ sceneKey=""; resize(); rebuild(); } } };
})();

/* ---------- layered view ---------- */
const hvEl=document.getElementById("hv"), hvBody=document.getElementById("hvbody"), crumbs=document.getElementById("crumbs"), hvSub=document.getElementById("hvsub");
const MAIN=["S","P","C","L","F","M","X","$"];
const dCol=k=>`var(${dom[k].c})`;
function crossLinks(k){
  const ins={}, outs={};
  EDGES.forEach(([a,b,l])=>{const da=byId[a].d, db=byId[b].d;
    if(db===k && da!==k)(ins[da]=ins[da]||[]).push({a,b,l});
    if(da===k && db!==k)(outs[db]=outs[db]||[]).push({a,b,l});});
  const ord=o=>DOMAINS.map(d=>d.k).filter(x=>o[x]);
  return {ins,outs,inK:ord(ins),outK:ord(outs)};
}
const tw=(s,fs)=>{let w=0; for(const ch of String(s)) w+= /[\u2E80-\uFFEF]/.test(ch)?fs:(/[A-Z]/.test(ch)?fs*.66:fs*.54); return w;};
function fitText(s,maxW,fs){ s=String(s); if(tw(s,fs)<=maxW) return s; let o=""; for(const ch of s){ if(tw(o+ch+"…",fs)>maxW) break; o+=ch; } return o.replace(/\s+$/,"")+"…"; }
function wrapLines(s,maxW,fs,max){ s=String(s); if(tw(s,fs)<=maxW) return [s];
  const toks=/\s/.test(s)?s.split(/(\s+)/):[...s]; const lines=[]; let cur="";
  for(const tk of toks){ if(tw(cur+tk,fs)>maxW && cur.trim()){ lines.push(cur.trim()); cur=tk.trim()?tk:""; } else cur+=tk; }
  if(cur.trim()) lines.push(cur.trim());
  if(lines.length>max){ const keep=lines.slice(0,max); keep[max-1]=fitText(lines.slice(max-1).join(/\s/.test(s)?" ":""),maxW,fs); return keep; }
  return lines.map(l=>fitText(l,maxW,fs)); }
function fontFit(s,maxW,fs,min){ let f=fs; while(f>min && tw(s,f)>maxW) f-=.5; return f; }
function wrapName(t,max){ if(t.length<=max) return [t]; const h=Math.ceil(t.length/2); return [t.slice(0,h),t.slice(h)]; }
function textLines(lines,x,y,cls,size,weight,anchor){
  const lh=size*1.3, y0=y-(lines.length-1)*lh/2;
  return lines.map((t,i)=>`<text x="${x}" y="${(y0+i*lh).toFixed(1)}" font-size="${size}" font-weight="${weight||500}" text-anchor="${anchor||"middle"}" dominant-baseline="central"${cls?` class="${cls}"`:""}>${esc(t)}</text>`).join("");
}
function defs(){
  const cs=[["mu","var(--muted)"],["fg","var(--fg)"],["up","var(--up1)"],["dn","var(--l1)"],...DOMAINS.map(d=>["d"+DOMAINS.indexOf(d),`var(${d.c})`])];
  return `<defs>${cs.map(([k,c])=>`<marker id="hv-${k}" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" style="fill:${c}"/></marker>`).join("")}</defs>`;
}
const mk=k=>`url(#hv-d${DOMAINS.findIndex(d=>d.k===k)})`;
function curveH(x1,y1,x2,y2){const dx=Math.max(28,Math.abs(x2-x1)/2);return `M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`;}
function curveV(x1,y1,x2,y2){const dy=Math.max(24,Math.abs(y2-y1)/2);return `M${x1},${y1} C${x1},${y1+dy} ${x2},${y2-dy} ${x2},${y2}`;}

function renderHV(){
  if(hvEl.hidden) return;
  if(hvS.level===3 && !sel) hvS.level=hvS.domain?2:1;
  const W=Math.max(300,hvBody.clientWidth);
  const lvTxt=tx("lvTxt")[hvS.level];
  let c=`<button type="button" data-hv="top">${tx("all")}</button>`;
  if(hvS.level>=2){ c+=`<span class="sep">›</span>`+(hvS.level===2?`<span class="cur">${esc(dom[hvS.domain].name)}</span>`:`<button type="button" data-hv="dom">${esc(dom[hvS.domain].name)}</button>`); }
  if(hvS.level===3){ c+=`<span class="sep">›</span><span class="cur">${esc(byId[sel].n)}</span>`; }
  if(hvS.level===1) c=`<span class="cur">${tx("all")}</span>`;
  crumbs.innerHTML=c+`<span class="lv">${lvTxt}</span>`;
  crumbs.querySelector('[data-hv="top"]')?.addEventListener("click",()=>{hvS.level=1;hvS.domain=null;sel=null;render();});
  crumbs.querySelector('[data-hv="dom"]')?.addEventListener("click",()=>{hvS.level=2;sel=null;render();});
  if(hvBody.hidden){
    hvSub.textContent = hvS.level===1 ? tx("s3d1") : hvS.level===2 ? tf("s3d2",{d:dom[hvS.domain].name}) : tf("s3d3",{n:byId[sel].n});
    m3.update(); return;
  }
  if(hvS.level===1) hvL1(W); else if(hvS.level===2) hvL2(W,hvS.domain); else hvL3(W,sel);
  const svg=hvBody.querySelector("svg.hsvg");
  if(svg) bindHover(svg);
}
function bindHover(svg){
  svg.addEventListener("pointerover",e=>{const g=e.target.closest("g.n"); if(!g) return;
    const id=g.dataset.k; svg.classList.add("hl");
    svg.querySelectorAll(".e").forEach(p=>p.classList.toggle("on",p.dataset.a===id||p.dataset.b===id));
    svg.querySelectorAll("g.n").forEach(n=>{const on=n===g||[...svg.querySelectorAll(".e.on")].some(p=>p.dataset.a===n.dataset.k||p.dataset.b===n.dataset.k); n.classList.toggle("on",on);});
  });
  svg.addEventListener("pointerout",e=>{const g=e.target.closest("g.n"); if(g && !g.contains(e.relatedTarget)) svg.classList.remove("hl");});
  svg.querySelectorAll("g.clk").forEach(g=>g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();g.dispatchEvent(new MouseEvent("click",{bubbles:true}));}}));
}

/* level 1: main business flow */
function hvL1(W){
  hvSub.textContent=tx("sL1");
  const vert=W<640, P={}; let H;
  if(!vert){
    const pad=16, gx=(W-2*pad)/4, bw=Math.min(210,gx-38), bh=lang==='en'?132:118;
    MAIN.forEach((k,i)=>{const row=i<4?0:1, col=row?3-(i-4):i; P[k]={x:pad+gx*(col+.5),y:row?(lang==='en'?335:320):(lang==='en'?86:80),w:bw,h:bh};});
    P.D={x:W/2,y:lang==='en'?490:470,w:W-2*pad-8,h:58}; H=lang==='en'?525:505;
  } else {
    const bw=W-58, bh=78;
    MAIN.forEach((k,i)=>P[k]={x:W/2+16,y:52+i*104,w:bw,h:bh});
    P.D={x:W/2,y:52+8*104,w:W-8,h:62}; H=52+8*104+44;
  }
  let s=`<svg class="hsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tx("flowAria")}">${defs()}`;
  // flow edges
  for(let i=0;i<MAIN.length-1;i++){
    const a=P[MAIN[i]], b=P[MAIN[i+1]]; let d;
    if(Math.abs(a.y-b.y)<1){ d = a.x<b.x?`M${a.x+a.w/2},${a.y} L${b.x-b.w/2-2},${b.y}`:`M${a.x-a.w/2},${a.y} L${b.x+b.w/2+2},${b.y}`; }
    else d=`M${a.x},${a.y+a.h/2} L${b.x},${b.y-b.h/2-2}`;
    s+=`<path class="e" d="${d}" style="stroke:var(--muted)" marker-end="url(#hv-mu)"/>`;
  }
  const f=P["$"], st=P["S"];
  if(!vert){
    s+=`<path class="e bk" d="M${f.x},${f.y-f.h/2} L${st.x},${st.y+st.h/2+2}" style="stroke:var(--dF2)" marker-end="url(#hv-d7)"/>`;
    s+=textLines(tx("loop2"),f.x+10,(f.y+st.y)/2,"mu",11.5,500,"start");
  } else {
    s+=`<path class="e bk" d="M${f.x-f.w/2},${f.y} H8 V${st.y} H${st.x-f.w/2-2}" style="stroke:var(--dF2)" marker-end="url(#hv-d7)"/>`;
  }
  // boxes
  MAIN.forEach((k,i)=>{const p=P[k], d=dom[k], n=NODES.filter(x=>x.d===k).length, cl=crossLinks(k);
    const nIn=Object.values(cl.ins).reduce((a,v)=>a+v.length,0), nOut=Object.values(cl.outs).reduce((a,v)=>a+v.length,0);
    s+=`<g class="clk" data-dom="${k}" tabindex="0" role="button" aria-label="${tx("enter")}${esc(d.name)}">
      <rect class="box" x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="8"/>
      <rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="4" height="${p.h}" rx="2" style="fill:${dCol(k)}"/>
      <text class="mono" x="${p.x-p.w/2+14}" y="${p.y-p.h/2+17}" font-size="11">0${i+1}</text>
      <text x="${p.x-p.w/2+14}" y="${p.y-p.h/2+(vert?40:42)}" font-size="${fontFit(d.name,p.w-24,16,12)}" font-weight="700">${esc(d.name)}</text>
      ${(()=>{const ls=vert?[fitText(d.desc,p.w-26,12)]:wrapLines(d.desc,p.w-26,12,lang==='en'?3:2);
        return ls.map((x,j)=>`<text class="mu" x="${p.x-p.w/2+14}" y="${p.y-p.h/2+(vert?59:62)+j*16}" font-size="12">${esc(x)}</text>`).join("");})()}
      <text class="mono" x="${p.x-p.w/2+14}" y="${p.y+p.h/2-(vert?6:11)}" font-size="10">${tf("boxFoot",{n,i:nIn,o:nOut})}</text>
    </g>`;});
  const p=P.D;
  s+=`<g class="clk" data-dom="D" tabindex="0" role="button" aria-label="${tx("enter")}${esc(dom.D.name)}">
    <rect class="box port" x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="8"/>
    <rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="4" height="${p.h}" rx="2" style="fill:${dCol("D")}"/>
    <text x="${p.x-p.w/2+14}" y="${p.y-6}" font-size="15" font-weight="700">${esc(dom.D.name)}</text>
    <text class="mu" x="${p.x-p.w/2+14}" y="${p.y+14}" font-size="12">${vert?tx("support"):tx("supportLong")}</text></g>`;
  s+=`</svg>`;
  hvBody.innerHTML=s;
  hvBody.querySelectorAll("g[data-dom]").forEach(g=>g.addEventListener("click",()=>{hvS.level=2;hvS.domain=g.dataset.dom;sel=null;render();}));
}

/* level 2: inside one domain */
function hvL2(W,k){
  const d=dom[k], ids=NODES.filter(n=>n.d===k).map(n=>n.id), set=new Set(ids);
  hvSub.textContent=tf("sL2",{d:d.name,desc:d.desc});
  const ie=EDGES.filter(([a,b])=>set.has(a)&&set.has(b));
  const st={}, back=new Set();
  const dfs=u=>{st[u]=1; ie.filter(e=>e[0]===u).forEach(([,v])=>{if(st[v]===1)back.add(u+">"+v); else if(!st[v])dfs(v);}); st[u]=2;};
  ids.filter(id=>!ie.some(e=>e[1]===id)).forEach(id=>{if(!st[id])dfs(id)}); ids.forEach(id=>{if(!st[id])dfs(id)});
  const L={}; const lay=id=>{if(L[id]!==undefined)return L[id]; let m=0; ie.filter(e=>e[1]===id&&!back.has(e[0]+">"+id)).forEach(([a])=>m=Math.max(m,lay(a)+1)); return L[id]=m;};
  ids.forEach(lay);
  const nL=Math.max(...ids.map(i=>L[i]))+1, rows=[...Array(nL)].map((_,l)=>ids.filter(i=>L[i]===l));
  const cl=crossLinks(k);
  const vert=W<680;
  const nodeHv=vert&&lang==="en"?58:48; const portW=vert?0:Math.min(lang==="en"?172:124,W*(lang==="en"?0.2:0.15)), nodeH=nodeHv, rowGap=92;
  let P={}, H, top;
  if(!vert){
    const cx0=16+portW+56, cx1=W-16-portW-56, cw=cx1-cx0, mid=(cx0+cx1)/2;
    const maxRow=Math.max(...rows.map(r=>r.length)); const nodeW=Math.min(150,(cw-(maxRow-1)*20)/maxRow);
    const nPort=Math.max(cl.inK.length,cl.outK.length);
    const inner=Math.max((nL-1)*rowGap, (nPort-1)*52);
    top=50; H=top+inner+nodeH+40;
    const off=top+nodeH/2+(inner-(nL-1)*rowGap)/2;
    rows.forEach((r,l)=>{ // order by parents' x
      if(l>0) r.sort((a,b)=>{const px=id=>{const ps=ie.filter(e=>e[1]===id&&P[e[0]]).map(e=>P[e[0]].x);return ps.length?ps.reduce((x,y)=>x+y)/ps.length:mid;};return px(a)-px(b);});
      r.forEach((id,i)=>P[id]={x:mid+(i-(r.length-1)/2)*(nodeW+20),y:off+l*rowGap,w:nodeW,h:nodeH});});
    const pTop=k=>top+nodeH/2+(inner-(k-1)*52)/2;
    cl.inK.forEach((x,i)=>P["in:"+x]={x:16+portW/2,y:pTop(cl.inK.length)+i*52,w:portW,h:38});
    cl.outK.forEach((x,i)=>P["out:"+x]={x:W-16-portW/2,y:pTop(cl.outK.length)+i*52,w:portW,h:38});
  } else {
    const cols=W<420?2:3, pw=(W-8-(cols-1)*8)/cols;
    const place=(arr,pre,y0)=>arr.forEach((x,i)=>P[pre+x]={x:4+pw/2+(i%cols)*(pw+8),y:y0+Math.floor(i/cols)*44,w:pw,h:36});
    const inRows=Math.ceil(cl.inK.length/cols), outRows=Math.ceil(cl.outK.length/cols);
    place(cl.inK,"in:",44);
    top=44+inRows*44+40;
    const maxRow=Math.max(...rows.map(r=>r.length)); const nodeW=Math.min(150,(W-8-(maxRow-1)*10)/maxRow);
    rows.forEach((r,l)=>r.forEach((id,i)=>P[id]={x:W/2+(i-(r.length-1)/2)*(nodeW+10),y:top+nodeH/2+l*rowGap,w:nodeW,h:nodeH}));
    const yOut=top+(nL-1)*rowGap+nodeH+70;
    place(cl.outK,"out:",yOut+16);
    H=yOut+16+outRows*44+10;
  }
  let s=`<svg class="hsvg${vert?" v":""}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(d.name)}${tx("innerAria")}">${defs()}`;
  if(!vert){
    s+=`<text class="mu" x="${16}" y="24" font-size="12" font-weight="700">${tx("inFrom")}</text>`;
    s+=`<text class="mu" x="${W-16}" y="24" font-size="12" font-weight="700" text-anchor="end">${tx("outTo")}</text>`;
    s+=`<text class="mu" x="${W/2}" y="24" font-size="12" font-weight="700" text-anchor="middle">${esc(d.name)} · ${tx("inner")}</text>`;
  } else {
    s+=`<text class="mu" x="4" y="16" font-size="12" font-weight="700">${tx("inFrom")}</text>`;
    s+=`<text class="mu" x="4" y="${top-18}" font-size="12" font-weight="700">${esc(d.name)} · ${tx("inner")}</text>`;
    const yo=P["out:"+cl.outK[0]]; if(yo) s+=`<text class="mu" x="4" y="${yo.y-30}" font-size="12" font-weight="700">${tx("outTo")}</text>`;
  }
  // external edges
  Object.entries(cl.ins).forEach(([dk,es])=>es.forEach(e=>{const a=P["in:"+dk], b=P[e.b];
    const dpath=vert?curveV(a.x,a.y+a.h/2,b.x,b.y-b.h/2-2):curveH(a.x+a.w/2,a.y,b.x-b.w/2-2,b.y);
    s+=`<path class="e ext" data-a="in:${dk}" data-b="${e.b}" d="${dpath}" style="stroke:${dCol(dk)}" marker-end="${mk(dk)}"><title>${esc(byId[e.a].n)} → ${esc(byId[e.b].n)}：${esc(e.l)}</title></path>`;}));
  Object.entries(cl.outs).forEach(([dk,es])=>es.forEach(e=>{const a=P[e.a], b=P["out:"+dk];
    const dpath=vert?curveV(a.x,a.y+a.h/2,b.x,b.y-b.h/2-2):curveH(a.x+a.w/2,a.y,b.x-b.w/2-2,b.y);
    s+=`<path class="e ext" data-a="${e.a}" data-b="out:${dk}" d="${dpath}" style="stroke:${dCol(dk)}" marker-end="${mk(dk)}"><title>${esc(byId[e.a].n)} → ${esc(byId[e.b].n)}：${esc(e.l)}</title></path>`;}));
  // internal edges
  ie.forEach(([a,b,l])=>{const A=P[a],B=P[b]; let dpath, bk=false;
    if(B.y>A.y+1) dpath=curveV(A.x,A.y+A.h/2,B.x,B.y-B.h/2-2);
    else if(Math.abs(B.y-A.y)<1) dpath=`M${A.x+(B.x>A.x?A.w/2:-A.w/2)},${A.y} L${B.x-(B.x>A.x?B.w/2+2:-B.w/2-2)},${B.y}`;
    else { bk=true; const xr=Math.max(A.x+A.w/2,B.x+B.w/2)+36; dpath=`M${A.x+A.w/2},${A.y} C${xr},${A.y} ${xr},${B.y} ${B.x+B.w/2+2},${B.y}`; }
    s+=`<path class="e${bk?" bk":""}" data-a="${a}" data-b="${b}" d="${dpath}" style="stroke:var(--fg)" marker-end="url(#hv-fg)"><title>${esc(byId[a].n)} → ${esc(byId[b].n)}：${esc(l)}</title></path>`;});
  // ports
  const port=(dk,pre)=>{const p=P[pre+dk], n=(pre==="in:"?cl.ins:cl.outs)[dk].length;
    return `<g class="n clk" data-k="${pre}${dk}" data-port="${dk}" tabindex="0" role="button" aria-label="${tx("jump")}${esc(dom[dk].name)}">
      <rect class="box port" x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="6"/>
      <rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="3" height="${p.h}" style="fill:${dCol(dk)}"/>
      <text x="${p.x-p.w/2+10}" y="${p.y}" font-size="12.5" font-weight="500" dominant-baseline="central">${esc(fitText(dom[dk].name,p.w-26,12.5))}</text>
      <text class="mono" x="${p.x+p.w/2-7}" y="${p.y}" font-size="10.5" text-anchor="end" dominant-baseline="central">${n}</text></g>`;};
  cl.inK.forEach(dk=>s+=port(dk,"in:")); cl.outK.forEach(dk=>s+=port(dk,"out:"));
  // nodes
  ids.forEach(id=>{const p=P[id], n=byId[id];
    s+=`<g class="n clk" data-k="${id}" data-node="${id}" tabindex="0" role="button" aria-label="${esc(n.n)}">
      <rect class="box" x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="7" style="stroke:${dCol(k)}"/>
      ${vert?textLines(wrapLines(n.n,p.w-10,12,3),p.x,p.y,"",12,700):textLines(wrapLines(n.n,p.w-14,13.5,2),p.x,p.y,"",13.5,700)}</g>`;});
  s+=`</svg>`;
  hvBody.innerHTML=s;
  hvBody.querySelectorAll("g[data-node]").forEach(g=>g.addEventListener("click",()=>select(g.dataset.node,true)));
  hvBody.querySelectorAll("g[data-port]").forEach(g=>g.addEventListener("click",()=>{hvS.domain=g.dataset.port;hvS.level=2;sel=null;render();}));
}

/* level 3: one node */
function hvL3(W,id){
  const n=byId[id], ins=inn[id], outs=out[id];
  hvSub.textContent=tf("sL3",{n:n.n});
  const vert=W<760; let s, H;
  const nb=(x,y,w,h,o,side)=>{const m=byId[o.to]; const lab=fitText(o.l,w-22,11.5);
    return `<g class="n clk" data-k="${o.to}" data-node="${o.to}" tabindex="0" role="button" aria-label="${esc(m.n)}">
      <rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>
      <rect x="${x}" y="${y}" width="3" height="${h}" style="fill:${dCol(m.d)}"/>
      <text x="${x+12}" y="${y+18}" font-size="13.5" font-weight="700">${esc(fitText(m.n,w-24,13.5))}${tw(m.n,13.5)+tw(dom[m.d].name,10.5)+10<w-24?`<tspan class="mono" font-size="10.5" dx="6" font-weight="400" style="fill:var(--muted)">${esc(dom[m.d].name)}</tspan>`:""}</text>
      <text class="mu" x="${x+12}" y="${y+37}" font-size="11.5">${esc(lab)}<title>${esc(o.l)}</title></text></g>`;};
  const center=(x,y,w,h)=>`<g><rect class="box center" x="${x}" y="${y}" width="${w}" height="${h}" rx="9"/>
      ${(()=>{const ls=wrapLines(n.n,w-20,16,2); return ls.map((l,j)=>`<text class="oncenter" x="${x+w/2}" y="${y+h/2-9-(ls.length-1)*9+j*18}" font-size="16" font-weight="900" text-anchor="middle" dominant-baseline="central" style="font-family:var(--display)">${esc(l)}</text>`).join("");})()}
      <text class="oncenter" x="${x+w/2}" y="${y+h/2+14}" font-size="11" text-anchor="middle" dominant-baseline="central" style="opacity:.75">${esc(dom[n.d].name)}</text></g>`;
  if(!vert){
    const cw=190, ch=72, nbW=Math.min(250,(W-32-cw-120)/2), nbH=48, gap=58;
    const nMax=Math.max(ins.length,outs.length,1); H=Math.max(160,nMax*gap+44);
    const cy=H/2, cx=W/2;
    s=`<svg class="hsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(n.n)}${tx("relOf")}">${defs()}`;
    s+=`<text class="mu" x="16" y="14" font-size="12" font-weight="700">${tx("directIn")} · ${ins.length}</text><text class="mu" x="${W-16}" y="14" font-size="12" font-weight="700" text-anchor="end">${tx("directOut")} · ${outs.length}</text>`;
    const yOf=(i,k)=>cy+(i-(k-1)/2)*gap;
    ins.forEach((o,i)=>{const y=yOf(i,ins.length); s+=`<path class="e" data-a="${o.to}" data-b="${id}" d="${curveH(16+nbW,y,cx-cw/2-2,cy)}" style="stroke:var(--up1)" marker-end="url(#hv-up)"/>`;});
    outs.forEach((o,i)=>{const y=yOf(i,outs.length); s+=`<path class="e" data-a="${id}" data-b="${o.to}" d="${curveH(cx+cw/2,cy,W-16-nbW-2,y)}" style="stroke:var(--l1)" marker-end="url(#hv-dn)"/>`;});
    ins.forEach((o,i)=>s+=nb(16,yOf(i,ins.length)-nbH/2,nbW,nbH,o));
    outs.forEach((o,i)=>s+=nb(W-16-nbW,yOf(i,outs.length)-nbH/2,nbW,nbH,o));
    s+=center(cx-cw/2,cy-ch/2,cw,ch);
    if(!ins.length) s+=textLines(tx("origin2"),16+nbW/2,cy,"mu",12);
  } else {
    const nbH=48, gap=56, x0=30, w=W-x0-4, cw=Math.min(240,W-40), ch=64;
    let y=24; s="";
    const inY=ins.map(()=>{const v=y; y+=gap; return v;});
    const cY=y+20; y=cY+ch+40;
    const outY=outs.map(()=>{const v=y; y+=gap; return v;});
    H=y;
    s=`<svg class="hsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(n.n)}${tx("relOf")}">${defs()}`;
    s+=`<text class="mu" x="4" y="12" font-size="12" font-weight="700">${tx("directIn")} · ${ins.length}</text>`;
    if(ins.length){ s+=`<path class="e" d="M14,${inY[0]+nbH/2} V${cY-4}" style="stroke:var(--up1)" marker-end="url(#hv-up)"/>`;
      ins.forEach((o,i)=>{s+=`<path class="e" data-a="${o.to}" data-b="${id}" d="M${x0},${inY[i]+nbH/2} H14" style="stroke:var(--up1)"/>`; s+=nb(x0,inY[i],w,nbH,o);}); }
    else s+=`<text class="mu" x="4" y="${cY-8}" font-size="12">${tx("origin1")}</text>`;
    s+=center(W/2-cw/2,cY,cw,ch);
    if(outs.length){ s+=`<text class="mu" x="4" y="${cY+ch+26}" font-size="12" font-weight="700">${tx("directOut")} · ${outs.length}</text>`;
      s+=`<path class="e" d="M14,${cY+ch/2} V${outY[outY.length-1]+nbH/2}" style="stroke:var(--l1)"/>`;
      outs.forEach((o,i)=>{s+=`<path class="e" data-a="${id}" data-b="${o.to}" d="M14,${outY[i]+nbH/2} H${x0-2}" style="stroke:var(--l1)" marker-end="url(#hv-dn)"/>`; s+=nb(x0,outY[i],w,nbH,o);}); }
  }
  s+=`</svg><div class="hsteps-h">${tx("h_how")}</div><ol class="hsteps">${n.how.map(h=>`<li>${G(h)}</li>`).join("")}</ol>`;
  hvBody.innerHTML=s;
  hvBody.querySelectorAll("g[data-node]").forEach(g=>g.addEventListener("click",()=>select(g.dataset.node,false)));
}

function renderDomainPanel(k){
  const d=dom[k], cl=crossLinks(k), t=TOUR.find(x=>x.d===k);
  detail.style.setProperty("--dc",dCol(k));
  const grp=(o,keys,dir)=>keys.map(dk=>`<li><b style="color:${dCol(dk)}">${esc(dom[dk].name)}</b><ul class="dlist">${o[dk].map(e=>`<li>${dir==="in"?`<button class="linkbtn" data-go="${e.a}">${esc(byId[e.a].n)}</button> → ${esc(byId[e.b].n)}`:`${esc(byId[e.a].n)} → <button class="linkbtn" data-go="${e.b}">${esc(byId[e.b].n)}</button>`} <span class="mu">${esc(e.l)}</span></li>`).join("")}</ul></li>`).join("");
  detail.innerHTML=`<div class="dtag">${esc(d.code)}</div><h2>${esc(d.name)}</h2>
   <p>${t?G(t.one):esc(d.desc)}</p>
   <h4>${tx("dp_has")}</h4><div class="metrics">${NODES.filter(n=>n.d===k).map(n=>`<span><button class="linkbtn" style="font-weight:500" data-go="${n.id}">${esc(n.n)}</button></span>`).join("")}</div>
   <p style="font-size:13px;color:var(--muted);margin-top:10px">${tx("dp_hint")}</p>
   <details class="more"><summary>${tx("dp_more")}</summary>
   <h4>${tx("dp_in")}</h4><ul class="dlist">${grp(cl.ins,cl.inK,"in")||`<li class='mu'>${tx("none")}</li>`}</ul>
   <h4>${tx("dp_out")}</h4><ul class="dlist">${grp(cl.outs,cl.outK,"out")||`<li class='mu'>${tx("none")}</li>`}</ul></details>`;
  detail.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>select(b.dataset.go,true));
}

document.addEventListener("keydown",e=>{ if(e.key==="Escape" && curView!=="2d" && !document.getElementById("v-map").hidden){
  if(hvS.level===3){hvS.level=2;sel=null;render();} else if(hvS.level===2){hvS.level=1;hvS.domain=null;render();} }});
let hvRt; new ResizeObserver(()=>{clearTimeout(hvRt);hvRt=setTimeout(()=>{if(!hvBody.hidden)renderHV();},80)}).observe(hvBody);

function setView(v){
  curView=v;
  map.hidden=v!=="2d"; hvEl.hidden=v==="2d"; hvBody.hidden=v!=="h"; m3.show(v==="3d");
  ["h","3d","2d"].forEach(x=>document.getElementById(x==="h"?"vwh":x==="3d"?"vw3":"vw2").setAttribute("aria-pressed",x===v));
  try{localStorage.setItem("ecomView2",v)}catch(e){}
  requestAnimationFrame(render);
}
document.getElementById("vwh").onclick=()=>setView("h");
document.getElementById("vw3").onclick=()=>setView("3d");
document.getElementById("vw2").onclick=()=>setView("2d");
let savedView="h"; try{savedView=localStorage.getItem("ecomView2")||"h"}catch(e){}

/* ---------- beginner tour ---------- */
let tourI=0;
function waterfall(){
  /* the running example, computed by the same calculators as the calculator page */
  const L=tx("wf"), ex=Calc.inputsFromCase(CASE), lc=Calc.landedCost(ex), pf=Calc.platformFees(ex).lines, up=Calc.unitProfit(ex);
  const rows=[[L[0],ex.price,"p"],[L[1],-lc.total,"c"],[L[2],-pf.referral,"c"],[L[3],-pf.fulfilment,"c"],[L[4],-pf.storage,"c"],[L[5],up.lines.returns,"c"],[L[6],up.lines.ads,"c"],[L[7],up.total,"n"]];
  const W=560, lw=lang==="en"?100:92, vw=64, bw=W-lw-vw-8, rh=30, H=rows.length*rh+6, sc=bw/ex.price;
  let run=0, out=`<svg class="wf" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tx("wfAria")}">`;
  rows.forEach(([lab,v,k],i)=>{const y=i*rh+4; let x0,x1;
    if(k==="p"){x0=0;x1=v;run=v;} else if(k==="n"){x0=0;x1=v;} else {x1=run;x0=run+v;run=x0;}
    out+=`<text x="0" y="${y+rh/2}" dominant-baseline="central">${lab}</text>
      <rect class="b${k}" x="${lw+x0*sc}" y="${y+5}" width="${Math.max(1.5,(x1-x0)*sc)}" height="${rh-12}" rx="3"/>
      <text class="v" x="${W}" y="${y+rh/2}" text-anchor="end" dominant-baseline="central">${v<0?"−":""}$${Math.abs(v).toFixed(2)}</text>`;});
  return out+`</svg>`;
}
function renderTour(){
  const el=document.getElementById("v-tour"), N=TOUR.length;
  const steps=`<div class="tsteps" role="list">${TOUR.map((t,i)=>`<button type="button" role="listitem" data-ti="${i}" class="${i<tourI?"done":""}" ${i===tourI?'aria-current="step"':""}>${i+1} ${esc(t.title||dom[t.d].name)}</button>`).join("")}<button type="button" data-ti="${N}" ${tourI===N?'aria-current="step"':""}>${tx("end")}</button></div>`;
  const note=`<p class="tnote">${tx("tnote")}</p>`;
  if(tourI<N){
    const t=TOUR[tourI], d=dom[t.d];
    const ex=t.ex==="__WATERFALL__" ? `<p class="head">${tx("wfHead")}</p>${waterfall()}`+gl(tx("wfList")) : gl(t.ex);
    el.innerHTML=note+steps+`<article class="tcard" style="--dc:var(${d.c})">
      <div class="tnum">${tf("stopOf",{i:tourI+1,n:N})} · ${esc(d.code)}</div>
      <h2>${esc(t.title||d.name)}</h2>
      <p class="tone">${G(t.one)}</p>
      <div class="tex"><span class="badge">${tx("badge")}</span>${ex}</div>
      <div class="tnav">
        <div>${tourI>0?`<button type="button" class="link" id="tprev">${tx("prev")}</button>`:""} <button type="button" class="link" id="tmap">${t.node?tx("seeNode"):tx("seeDom")}</button></div>
        <button type="button" class="primary" id="tnext">${tourI===N-1?tx("toEnd"):tf("nextStop",{s:esc(TOUR[tourI+1].title||dom[TOUR[tourI+1].d].name)})} →</button>
      </div></article>`;
    el.querySelector("#tnext").onclick=()=>{tourI++;renderTour();window.scrollTo({top:0,behavior:"smooth"});};
    el.querySelector("#tprev")?.addEventListener("click",()=>{tourI--;renderTour();});
    el.querySelector("#tmap").onclick=()=>{ if(t.node){ location.hash="map"; setTimeout(()=>select(t.node,true),30); } else { hvS.level=2;hvS.domain=t.d;sel=null;location.hash="map"; } };
  } else {
    el.innerHTML=note+steps+`<article class="tcard tend" style="--dc:var(--dD)">
      ${gl(tx("endHtml"))}
      <div class="tnav"><button type="button" class="link" id="trestart">${tx("restart")}</button>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="ghost" id="tstart">${tx("byStart")}</button><button type="button" class="primary" id="tgo">${tx("goMap")}</button></div></div></article>`;
    el.querySelector("#trestart").onclick=()=>{tourI=0;renderTour();};
    el.querySelector("#tstart").onclick=()=>{location.hash="start";};
    el.querySelector("#tgo").onclick=()=>{hvS.level=1;hvS.domain=null;sel=null;location.hash="map";};
  }
  el.querySelectorAll("[data-ti]").forEach(b=>b.onclick=()=>{tourI=+b.dataset.ti;renderTour();});
}
document.addEventListener("click",e=>{const ad=document.getElementById("adv"); if(ad.open && !ad.contains(e.target)) ad.open=false;});
document.getElementById("tourbtn").onclick=()=>{tourI=0;location.hash="tour";};

/* glossary tooltip */
const tip=document.createElement("div"); tip.id="tip"; tip.hidden=true; tip.setAttribute("role","tooltip"); document.body.appendChild(tip);
let tipFor=null;
function showTip(el){ const k=el.dataset.term; tip.innerHTML=`<b>${esc(k)}</b>${esc(GLOSS[k]||"")}`; tip.hidden=false; tipFor=el;
  const r=el.getBoundingClientRect(), tw=tip.offsetWidth, th=tip.offsetHeight;
  let x=Math.min(Math.max(8,r.left+r.width/2-tw/2),window.innerWidth-tw-8), y=r.top-th-8; if(y<8) y=r.bottom+8;
  tip.style.left=x+"px"; tip.style.top=y+"px"; }
function hideTip(){ tip.hidden=true; tipFor=null; }
document.addEventListener("pointerover",e=>{const t=e.target.closest(".term"); if(t&&e.pointerType==="mouse") showTip(t);});
document.addEventListener("pointerout",e=>{const t=e.target.closest(".term"); if(t&&e.pointerType==="mouse") hideTip();});
document.addEventListener("focusin",e=>{const t=e.target.closest(".term"); if(t) showTip(t);});
document.addEventListener("focusout",e=>{if(e.target.closest(".term")) hideTip();});
document.addEventListener("click",e=>{const t=e.target.closest(".term"); if(t){ if(tipFor===t) hideTip(); else showTip(t); } else if(tipFor) hideTip();});
window.addEventListener("scroll",()=>{if(tipFor)hideTip();},{passive:true});

function renderStatic(){
const P=k=>PAGES[k][lang];
/* start view */
document.getElementById("v-start").innerHTML = P("start_intro")+
PHASES.map((p,i)=>`<div class="phase"><div class="n">${i}</div><div><h3>${esc(p.t)}</h3><p class="out">${G(p.out)}</p><p class="warn">${G(p.warn)}</p><div class="links">${p.ids.map(id=>`<button class="chip" style="--dc:var(${dom[byId[id].d].c})" data-jump="${id}">${esc(byId[id].n)}</button>`).join("")}</div></div></div>`).join("");

/* data view */
document.getElementById("v-data").innerHTML = P("data_page");

renderRules();

/* sources: every source cited by a rule, with the rules citing it */
const bySrc=new Map();
RULES.forEach(r=>r.sources.forEach(s=>{ if(!bySrc.has(s.url)) bySrc.set(s.url,{s,rules:[]}); bySrc.get(s.url).rules.push(r); }));
document.getElementById("v-sources").innerHTML = P("sources_intro")+
`<ol class="srcs">${[...bySrc.values()].map(({s,rules})=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><br><span style="color:var(--muted);font-size:13px">${esc(s.publisher)} · ${tx("r_checked")} ${esc(s.accessed)} · ${tx("r_cited")}: ${rules.map(r=>`<a href="#rules" data-rule="${esc(r.id)}">${esc(kindLabel(r))} · ${esc(r.id.split("/").pop())}</a>`).join(", ")}</span></li>`).join("")}</ol>
<p class="note">${esc(P("not_advice"))}</p>`;

/* footer */
document.getElementById("foot").innerHTML = `<p>${esc(P("not_advice"))}</p><p>${tx("foot_licence")} <a href="https://github.com/Arthur-LeoAI/E-Commerce-Knowledge-Graph" target="_blank" rel="noopener">GitHub</a></p>`;

renderCalc();
}

/* market rules view: laws of the destination country + rules of the chosen marketplace */
function renderRules(){
  const el=document.getElementById("v-rules");
  const rs=RULES.filter(applies);
  const law=rs.filter(r=>r.kind==="law").sort((a,b)=>a.jurisdiction.length-b.jurisdiction.length||a.topic.localeCompare(b.topic));
  const plat=rs.filter(r=>r.kind==="platform").sort((a,b)=>a.topic.localeCompare(b.topic));
  el.innerHTML = PAGES.rules_intro[lang];
  el.insertAdjacentHTML("beforeend", `<div class="selrow"><label for="market">${tx("sel_label")}</label><select id="market">${MARKETS.map(m=>{const [p,k]=m.split("/");return `<option value="${esc(m)}"${m===market?" selected":""}>${esc(tx(`sel_${p}_${k}`)||m)}</option>`;}).join("")}</select></div>
   <h3>${tx("r_law_h")}</h3>${law.map(r=>ruleCard(r)).join("")}
   <h3 style="margin-top:22px">${tx("r_plat_h")}</h3>${plat.map(r=>ruleCard(r)).join("")}
   <h3 style="margin-top:22px">${tx("tools_h")}</h3><ul class="srcs">${TOOLS.map(t=>`<li><a href="${esc(t.u)}" target="_blank" rel="noopener">${esc(t.t)}</a></li>`).join("")}</ul>
   <p class="note">${esc(PAGES.not_advice[lang])}</p>`);
  el.querySelector("#market").onchange=e=>{ market=e.target.value; try{localStorage.setItem("ecomMarket",market)}catch(_){} renderRules(); if(sel) renderDetail(bfs(sel)); };
}

/* ---------- calculator (models/calculators.js) ---------- */
const CALC_GROUPS=[
  ["g_product",["price","purchase_price_cny","fx_cny_per_usd","freight_per_unit","duty_rate","clearance_per_unit","testing_cost","batch_size"]],
  ["g_fees",["referral_rate","fulfilment_fee","storage_per_unit"]],
  ["g_sales",["ad_cost_per_unit","return_rate","loss_per_return","units_per_month","launch_ad_budget"]],
  ["g_stock",["daily_sales","production_days","transit_days","receiving_days","safety_days"]],
];
const CALC_RULES=["platform/amazon/us/referral-fees","platform/amazon/us/fba-fulfillment-fees","platform/amazon/us/fees-2026-changes","law/us/hts-duty-rates","law/us/tariffs-2026"];
const EXAMPLE=Calc.inputsFromCase(CASE);
const PCT=new Set(["duty_rate","referral_rate","return_rate"]); // shown and entered as percentages
let calcVals={...EXAMPLE};
try{ const s=JSON.parse(localStorage.getItem("ecomCalc")||"null"); if(s&&typeof s==="object") for(const k in EXAMPLE) if(typeof s[k]==="number") calcVals[k]=s[k]; }catch(e){}
let tlVals={};
try{ tlVals=JSON.parse(localStorage.getItem("ecomTimeline")||"{}")||{}; }catch(e){}
const usd=x=>(x<0?"−":"")+"$"+Math.abs(x).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const pctf=r=>(r*100).toLocaleString("en-US",{maximumFractionDigits:1})+"%";
const intf=x=>x.toLocaleString("en-US");
const shown=(k,v)=>PCT.has(k)?+(v*100).toFixed(4):v;

function renderCalc(){
  const el=document.getElementById("v-calc");
  const field=k=>{ const c=CASE.inputs[k], unit=PCT.has(k)?"%":c.unit;
    return `<div class="field"><label for="ci-${k}">${esc(c.label[lang])}<small>${esc(unit)}</small></label><input id="ci-${k}" data-k="${k}" type="number" inputmode="decimal" step="any" value="${shown(k,calcVals[k])}"><span class="tag" id="ct-${k}"></span></div>`; };
  const tlRow=ph=>`<div>${tx("tl_"+ph)}</div>${["low","typical","high"].map(q=>`<input data-ph="${ph}" data-q="${q}" type="number" inputmode="numeric" min="0" step="1" aria-label="${esc(tx("tl_"+ph))} ${esc(tx(q==="low"?"tl_low":q==="typical"?"tl_typ":"tl_high"))}" value="${tlVals[ph]?.[q]??""}">`).join("")}`;
  el.innerHTML = `<div class="prose">${PAGES.calc_intro[lang]}</div>
  <div class="calc">
   <div><h3>${tx("calc_inputs")} <button type="button" class="ghost" id="calcReset">${tx("calc_reset")}</button></h3>
    ${CALC_GROUPS.map(([g,ks])=>`<fieldset><legend>${tx(g)}</legend>${ks.map(field).join("")}</fieldset>`).join("")}
    <fieldset><legend>${tx("tl_h")}</legend><p style="font-size:13px;color:var(--muted);margin:0 0 8px">${tx("tl_note")}</p>
     <div class="tl"><div></div><div class="hd">${tx("tl_low")}</div><div class="hd">${tx("tl_typ")}</div><div class="hd">${tx("tl_high")}</div>
     ${["production","transit","receiving"].map(tlRow).join("")}</div></fieldset>
   </div>
   <div><h3>${tx("calc_results")}</h3><div id="calcOut" aria-live="polite"></div>
    <h3 style="margin-top:18px">${tx("calc_rules_h")}</h3>${CALC_RULES.map(id=>ruleById[id]).filter(Boolean).map(r=>ruleCard(r,{links:false})).join("")}
    <p class="note">${esc(PAGES.not_advice[lang])}</p></div>
  </div>`;
  el.querySelectorAll("input[data-k]").forEach(i=>i.addEventListener("input",()=>{
    const k=i.dataset.k, v=i.value===""?NaN:Number(i.value);
    calcVals[k]=PCT.has(k)?v/100:v; saveCalc(); calcOutput();
  }));
  el.querySelectorAll("input[data-ph]").forEach(i=>i.addEventListener("input",()=>{
    const ph=i.dataset.ph; tlVals[ph]={...(tlVals[ph]||{}),[i.dataset.q]:i.value===""?"":Number(i.value)};
    try{localStorage.setItem("ecomTimeline",JSON.stringify(tlVals))}catch(e){}
    calcOutput();
  }));
  el.querySelector("#calcReset").onclick=()=>{ calcVals={...EXAMPLE}; saveCalc(); renderCalc(); };
  calcOutput();
}
function saveCalc(){ try{localStorage.setItem("ecomCalc",JSON.stringify(calcVals))}catch(e){} }

function calcOutput(){
  const out=document.getElementById("calcOut"); if(!out) return;
  const bad=new Set();
  for(const k in EXAMPLE){ const v=calcVals[k]; if(typeof v!=="number"||!Number.isFinite(v)||v<0) bad.add(k); }
  ["price","fx_cny_per_usd","batch_size"].forEach(k=>{ if(calcVals[k]===0) bad.add(k); });
  document.querySelectorAll("#v-calc input[data-k]").forEach(i=>{
    const k=i.dataset.k, same=Math.abs(calcVals[k]-EXAMPLE[k])<1e-9;
    i.setAttribute("aria-invalid",bad.has(k));
    const t=document.getElementById("ct-"+k); t.textContent=same?tx("calc_example"):tx("calc_yours"); t.className="tag"+(same?"":" yours");
  });
  const table=(lines,total,keyPrefix="ln_")=>`<table>${Object.entries(lines).map(([k,v])=>`<tr><td>${esc(tx(keyPrefix+k)||k)}</td><td class="n">${usd(v)}</td></tr>`).join("")}<tr class="t"><td>${tx("ln_total")}</td><td class="n">${usd(total)}</td></tr></table>`;
  const box=(h,big,body,neg)=>`<div class="res"><h3>${h}</h3><div class="big${neg?" neg":""}">${big}</div>${body}</div>`;
  let html="";
  if(bad.size){ html=`<p class="calcerr">${tx("calc_bad")}</p>`; }
  else{
    const v=calcVals, lc=Calc.landedCost(v), pf=Calc.platformFees(v), up=Calc.unitProfit(v), be=Calc.breakEvenAdCost(v),
          mp=Calc.monthlyProfit(v), rp=Calc.reorderPoint(v), fc=Calc.firstOrderCash(v);
    html+=box(tx("res_landed"),usd(lc.total),table(lc.lines,lc.total));
    html+=box(tx("res_fees"),usd(pf.total),table(pf.lines,pf.total)+`<p>${tf("res_margin",{p:pctf(pf.share_of_price)})}</p>`);
    html+=box(tx("res_unit"),usd(up.total),table(up.lines,up.total)+`<p>${tf("res_margin",{p:pctf(up.margin)})}${up.total<0?" "+tx("res_loss"):""}</p>`,up.total<0);
    html+=box(tx("res_be"),usd(be.per_unit),`<p>${G(tf("res_be_note",{p:pctf(be.acos)}))}</p>`,be.per_unit<0);
    html+=box(tx("res_month"),usd(mp.total),`<p>${tf("res_month_note",{u:intf(mp.units),p:usd(mp.per_unit)})}</p>`,mp.total<0);
    html+=box(tx("res_rop"),intf(rp.units),`<p>${tf("res_rop_note",{d:intf(v.daily_sales),l:rp.lead_days,a:intf(rp.lead_demand),s:intf(rp.safety_stock)})}</p>`);
    html+=box(tx("res_cash"),usd(fc.total),table(fc.lines,fc.total)+`<p>${tx("res_cash_note")}</p>`);
  }
  /* timeline: only phases with all three numbers */
  const phases=["production","transit","receiving"].map(ph=>({id:ph,...(tlVals[ph]||{})}))
    .filter(p=>["low","typical","high"].every(q=>typeof p[q]==="number"&&Number.isFinite(p[q])));
  let tl;
  if(!phases.length) tl=`<p>${tx("tl_empty")}</p>`;
  else{
    try{ const r=Calc.timeline(phases,{simulations:5000,seed:1});
      tl=`<div class="big">${r.total.low}–${r.total.high}</div><p>${tf("tl_total",{a:r.total.low,b:r.total.typical,c:r.total.high})}</p><p>${tf("tl_mc",{n:intf(5000),p50:r.monte_carlo.p50,p90:r.monte_carlo.p90})}</p>`;
    }catch(e){ tl=`<p class="calcerr">${tx("tl_bad")}</p>`; }
  }
  html+=`<div class="res"><h3>${tx("tl_h")}</h3>${tl}</div>`;
  out.innerHTML=html;
}

document.addEventListener("click",e=>{
  const j=e.target.closest("[data-jump]"); if(j){ location.hash="map"; setTimeout(()=>select(j.dataset.jump,true),30); }
  const r=e.target.closest("[data-rule]"); if(r){ e.preventDefault(); location.hash="rules"; setTimeout(()=>document.getElementById(ruleAnchor(r.dataset.rule))?.scrollIntoView({block:"center"}),30); }
});

/* routing */
const views=["tour","map","start","calc","rules","data","sources"];
function route(){
  const v = views.includes(location.hash.slice(1))?location.hash.slice(1):"tour";
  if(v==="tour") renderTour();
  views.forEach(x=>document.getElementById("v-"+x).hidden = x!==v);
  document.querySelectorAll("nav.tabs a").forEach(a=>{ if(a.dataset.v===v) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  if(v==="map") requestAnimationFrame(render);
}
window.addEventListener("hashchange",route);
function applyStatic(){
  document.documentElement.lang = lang==="en"?"en":"zh-CN";
  document.querySelectorAll("[data-i18n]").forEach(el=>{el.innerHTML=tx(el.dataset.i18n);});
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{el.placeholder=tx(el.dataset.i18nPh);});
  const lb=document.getElementById("langbtn"); lb.textContent=tx("langbtn"); lb.setAttribute("aria-label",tx("langlabel"));
}
function setLang(l){
  lang=l; try{localStorage.setItem("ecomLang",l)}catch(e){}
  applyData(l); rebuildAdj(); buildGloss(); applyStatic(); buildMap(); renderStatic(); renderLegend(); m3.reset(); hideTip(); render(); route();
}
document.getElementById("langbtn").onclick=()=>setLang(lang==="en"?"zh":"en");
applyStatic(); renderStatic();
renderLegend(); setView(savedView); route();
})();
