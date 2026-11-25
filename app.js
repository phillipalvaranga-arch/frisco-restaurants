(function(){
"use strict";
var D=window.FRD, L=D.list;
var $=function(id){return document.getElementById(id)};
/* ---------- text helpers ---------- */
function norm(s){return String(s).toLowerCase().replace(/[\u2019'`]/g,"").replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim()}
function stem(w){return (w.length>3&&w.slice(-1)==="s"&&w.slice(-2)!=="ss")?w.slice(0,-1):w}
function toks(s){return norm(s).split(" ").filter(Boolean).map(stem)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function lev(a,b,max){ // Damerau-Levenshtein (optimal string alignment) with early exit
  if(Math.abs(a.length-b.length)>max)return max+1;
  var d=[],i,j;for(i=0;i<=a.length;i++){d[i]=[i]}for(j=1;j<=b.length;j++)d[0][j]=j;
  for(i=1;i<=a.length;i++)for(j=1;j<=b.length;j++){
    var c=a[i-1]===b[j-1]?0:1;
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
  }
  return d[a.length][b.length];
}
/* ---------- cuisine vocabulary (type of food -> synonyms) ---------- */
var CUIS=[
 ["Chinese","chinese china","dim sum dimsum wok lo mein lomein chow mein fried rice dumpling wonton egg roll kung pao general tso mongolian beef hot pot hotpot szechuan sichuan cantonese mandarin hunan"],
 ["Japanese","japanese japan","hibachi teppanyaki teriyaki tempura udon katsu yakitori izakaya omakase bento"],
 ["Sushi","sushi","sashimi nigiri maki"],
 ["Ramen","ramen","tonkotsu"],
 ["Mexican","mexican mexico mexicano tex mex texmex","taco burrito quesadilla enchilada fajita birria barbacoa carnitas tamale nachos guacamole queso al pastor"],
 ["Italian","italian italy","pasta spaghetti lasagna ravioli gnocchi risotto fettuccine alfredo carbonara parmigiana calzone"],
 ["Pizza","pizza pizzeria","pepperoni"],
 ["Indian","indian india","curry tikka masala biryani naan paneer korma vindaloo samosa dosa tandoori dal thali makhani"],
 ["Pakistani","pakistani pakistan","karahi nihari haleem"],
 ["Thai","thai thailand","pad thai tom yum tom kha"],
 ["Vietnamese","vietnamese vietnam","pho banh mi vermicelli"],
 ["Korean","korean korea","bulgogi bibimbap kimchi galbi kbbq"],
 ["Mediterranean","mediterranean middle eastern lebanese greek turkish persian","gyro shawarma falafel hummus kebab kabob kofta souvlaki pita tzatziki baklava"],
 ["Caribbean","caribbean jamaican jamaica cuban","jerk oxtail plantain ackee saltfish curry goat"],
 ["Soul food","soul food southern cajun creole","gumbo jambalaya collard greens cornbread catfish po boy"],
 ["BBQ","bbq barbecue barbeque","brisket smoked ribs pulled pork burnt ends"],
 ["Seafood","seafood","fish shrimp lobster crab oyster crawfish salmon scallop"],
 ["Steakhouse","steakhouse steak house","steak ribeye filet prime rib"],
 ["Halal","halal",""],
 ["Vegetarian","vegetarian vegan veggie plant based",""],
 ["Breakfast","breakfast brunch","pancake waffle omelet omelette eggs benedict"],
 ["Burgers","burger hamburger cheeseburger",""],
 ["Chicken & wings","","wings wing tenders nuggets"],
 ["Sandwiches","sandwich","sub hoagie deli wrap panini"],
 ["Hawaiian","hawaiian hawaii","poke"],
 ["African","african west african nigerian ethiopian","jollof suya egusi injera fufu"],
 ["French","french france",""],
 ["Asian","asian fusion",""],
 ["American","american",""]
];
var CMAP={},LABELS={}; // stemmed word -> [cuisine keys]; LABELS = words that name a whole cuisine
function addC(w,k,lab){(CMAP[w]=CMAP[w]||[]);if(CMAP[w].indexOf(k)<0)CMAP[w].push(k);if(lab)LABELS[w]=1}
CUIS.forEach(function(c){toks(c[1]).forEach(function(w){addC(w,c[0],true)});toks(c[2]).forEach(function(w){addC(w,c[0],false)});if(c[0]==="Chicken & wings"){toks("chicken wing").forEach(function(w){addC(w,c[0],false)})}else toks(c[0]).forEach(function(w){addC(w,c[0],true)})});
// words too generic to imply a cuisine on their own
["roll","pot","hot","pad","pastor","soul","food","pork","beef","egg","curry","fish","end","burnt","pulled","smoked","prime","house","goat","chow","lo","mein","sum","dim","fried","sesame","orange","mongolian","tom","spring","plant","based","middle","eastern","po","boy","collard","green","rib","mi","general","tso","kung","pao","tex","mex","butter","tikka","masala","al"].forEach(function(w){if(!LABELS[w])delete CMAP[w]});
/* dish synonyms (spellings / alternate names) */
var SYN=[["tso","tsao","tao"],["bbq","barbecue","barbeque"],["kabob","kebab","kabab","kebob"],["biryani","biriyani","briyani"],["shawarma","shwarma","shawerma"],["gyro","gyros"],["fries","fry"],["burger","hamburger","cheeseburger"],["wing","wings"],["pho","faux"],["ramen","raman"],["mac","macaroni"],["taco","tacos"],["sushi","susi"],["teriyaki","terriyaki"],["hummus","humus","hommus"],["falafel","felafel"],["tikka","tika"],["masala","masaala"],["lomein","lo mein"],["poboy","po boy"]];
var SYNMAP={};SYN.forEach(function(g){g.forEach(function(w){SYNMAP[stem(norm(w))]=g.map(function(x){return stem(norm(x))})})});
var PHRASE=[ // [phrase, [alternate token lists, optional required tag]]
 [["butter","chicken"],[{q:["murgh","makhani"]},{q:["chicken","makhani"]}]],
 [["general","tso"],[{q:["general","tao"]},{q:["general","tsao"]}]],
 [["sushi","roll"],[{q:["maki"]},{q:["roll"],tag:"Sushi"}]],
 [["pad","thai"],[{q:["phad","thai"]}]],
 [["jerk","chicken"],[{q:["jerk"]}]],
 [["birria","taco"],[{q:["birria"]}]],
 [["fried","rice"],[]]
];
var STOP={restaurant:1,restaurants:1,food:1,place:1,places:1,near:1,me:1,in:1,frisco:1,tx:1,texas:1,best:1,good:1,the:1,a:1,an:1,and:1,for:1,to:1,want:1,i:1,some:1,spot:1,spots:1,cuisine:1,eat:1,eats:1,top:1,find:1,order:1,buy:1,get:1,dish:1,menu:1,of:1,with:1,my:1,craving:1,looking:1,need:1};
/* ---------- build per-restaurant search index ---------- */
var VOCAB={};
function addVocab(w){VOCAB[w]=(VOCAB[w]||0)+1}
Object.keys(CMAP).forEach(addVocab);Object.keys(SYNMAP).forEach(addVocab);
L.forEach(function(r){
  r._name=toks(r.n);r._tags=r.tags;r._open=null;
  r._items=(r.dishes||[]).map(function(d){var t=toks(d[0]);t.forEach(addVocab);return {n:d[0],p:d[1],t:t}});
  r._name.forEach(addVocab);
  var rt=r.r,v=r.v; r._best=0;
});
var VWORDS=Object.keys(VOCAB);
var meanR=L.reduce(function(s,r){return s+r.r},0)/L.length, M=150;
L.forEach(function(r){r._best=(r.v/(r.v+M))*r.r+(M/(r.v+M))*meanR});
/* ---------- query parsing ---------- */
function wm(w,t){return w===t||(t.length>=5&&w.indexOf(t)===0)}
function wmC(w,t){return w===t||(t.length>=3&&w.indexOf(t)===0)}
function snap(t){ // typo tolerance: return {tok, changed}
  if(VOCAB[t])return {tok:t};
  if(t.length>=3){for(var i=0;i<VWORDS.length;i++){if(VWORDS[i].indexOf(t)===0)return {tok:t}}}
  var max=t.length<=3?0:(t.length<=5?1:2),best=null,bd=99;
  if(max>0)for(var j=0;j<VWORDS.length;j++){var d=lev(t,VWORDS[j],max);if(d<bd||(d===bd&&best&&VOCAB[VWORDS[j]]>VOCAB[best])){bd=d;best=VWORDS[j]}}
  if(best&&bd<=max)return {tok:best,changed:true,from:t};
  return {tok:t};
}
function parse(q){
  var raw=norm(q).split(" ").filter(Boolean).filter(function(w){return !STOP[w]});
  var out=[],fixes=[];
  raw.forEach(function(w){var s=snap(stem(w));out.push(s.tok);if(s.changed)fixes.push([w,s.tok])});
  return {t:out,fixes:fixes};
}
function altQueries(t){
  var qs=[{q:t}];
  PHRASE.forEach(function(p){
    var key=p[0];
    for(var i=0;i+key.length<=t.length;i++){
      var ok=true;for(var k=0;k<key.length;k++){if(!wm(t[i+k],stem(key[k]))){ok=false;break}}
      if(ok)p[1].forEach(function(alt){qs.push({q:t.slice(0,i).concat(alt.q.map(stem),t.slice(i+key.length)),tag:alt.tag})});
    }
  });
  return qs;
}
function itemHas(it,tk){ // does item contain token (with synonyms/prefix)?
  var alts=SYNMAP[tk]||[tk];
  for(var a=0;a<alts.length;a++)for(var i=0;i<it.t.length;i++)if(wm(it.t[i],alts[a]))return true;
  return false;
}
function nameHas(r,tk){for(var i=0;i<r._name.length;i++)if(wm(r._name[i],tk))return true;return false}
var cuisCache={};
function cuisKeys(tk){if(cuisCache[tk])return cuisCache[tk];var ks=[];for(var w in CMAP){if(wmC(w,tk)){CMAP[w].forEach(function(k){if(ks.indexOf(k)<0)ks.push(k)})}}return cuisCache[tk]=ks}
function isLabel(tk){for(var w in LABELS){if(wmC(w,tk))return true}return false}
function hasTag(r,keys){for(var i=0;i<keys.length;i++)if(r.tags.indexOf(keys[i])>=0)return true;return false}
function adjacent(it,q){ // tokens appear next to each other, in order
  for(var i=0;i<it.t.length;i++){var ok=true;for(var k=0;k<q.length;k++){var alts=SYNMAP[q[k]]||[q[k]],hit=false;for(var a=0;a<alts.length;a++)if(it.t[i+k]&&wm(it.t[i+k],alts[a]))hit=true;if(!hit){ok=false;break}}if(ok)return true}return false}
function matchR(r,t){
  // returns null or {tier,items,q,fb}; tier 4 exact dish phrase, 3 dish/cuisine, 2 name, 1 same cuisine but dish not confirmed
  var best=null;
  altQueries(t).forEach(function(alt){
    var q=alt.q;
    if(alt.tag&&r.tags.indexOf(alt.tag)<0)return;
    var lab=[],dish=[];
    q.forEach(function(tk){(isLabel(tk)?lab:dish).push(tk)});
    var tier=0,items=[],fb=false,weak=false;
    // label tokens (Chinese, Mexican, sushi...) must match the restaurant's food type
    for(var i=0;i<lab.length;i++){
      var ks=cuisKeys(lab[i]);
      if(hasTag(r,ks))continue;
      if(nameHas(r,lab[i])||r._items.some(function(it){return itemHas(it,lab[i])})){weak=true;continue}
      return;
    }
    if(dish.length){
      var all=r._items.filter(function(it){return dish.every(function(tk){return itemHas(it,tk)})});
      if(all.length){items=all;tier=all.some(function(it){return adjacent(it,dish)})?4:3;if(tier===4)items=all.filter(function(it){return adjacent(it,dish)}).concat(all.filter(function(it){return !adjacent(it,dish)}))}
      else if(dish.every(function(tk){return nameHas(r,tk)}))tier=2;
      else{
        var imp=[];dish.forEach(function(tk){cuisKeys(tk).forEach(function(k){imp.push(k)})});
        if(imp.length&&hasTag(r,imp)){tier=1;fb=true}else return;
      }
    }else{
      tier=3;
      var mx=0;r._items.forEach(function(it){var c=0;lab.forEach(function(tk){if(itemHas(it,tk))c++});it._c=c;if(c>mx)mx=c});
      var dishy=lab.every(function(tk){return {sushi:1,ramen:1,pizza:1,seafood:1,burger:1,bbq:1,breakfast:1,brunch:1,sandwich:1,vegan:1,vegetarian:1}[tk]});
      if(mx>0&&dishy)items=r._items.filter(function(it){return it._c===mx});
    }
    if(weak)tier=Math.min(tier,1);
    if(!best||tier>best.tier)best={tier:tier,items:items,q:q,fb:fb,weak:weak};
  });
  return best;
}
/* ---------- hours ---------- */
var DAYN=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function chicagoNow(){
  var p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short",hour:"numeric",minute:"numeric",hour12:false}).formatToParts(new Date()),o={};
  p.forEach(function(x){o[x.type]=x.value});
  return {d:DAYN.indexOf(o.weekday),m:(+o.hour%24)*60+(+o.minute)};
}
function openState(r){
  if(!r.h)return "unk";
  var n=chicagoNow(),today=r.h[n.d],prev=r.h[(n.d+6)%7],known=false;
  if(today){known=true;for(var i=0;i<today.length;i++){if(n.m>=today[i][0]&&n.m<today[i][1])return "open"}}
  if(prev){for(var j=0;j<prev.length;j++){if(prev[j][1]>1440&&n.m<prev[j][1]-1440)return "open"}}
  return (today||known)?"closed":"unk";
}
/* ---------- state ---------- */
var FAVKEY="frisco-rest-favs-v1";
function loadFavs(){try{return JSON.parse(localStorage.getItem(FAVKEY)||"[]")}catch(e){return []}}
var favs=loadFavs();
function saveFavs(){try{localStorage.setItem(FAVKEY,JSON.stringify(favs))}catch(e){}$("favCount").textContent=favs.length}
var shown=40;
/* ---------- search ---------- */
function run(q,opts){
  var P=parse(q),res=[];
  L.forEach(function(r){
    if(opts.halal&&!(r.halal||r.pork==="none"))return;
    var m=P.t.length?matchR(r,P.t):{tier:0,items:[]};
    if(!m)return;
    r._st=openState(r);
    if(opts.open&&r._st!=="open")return;
    res.push({r:r,m:m});
  });
  var s=opts.sort;
  res.sort(function(a,b){
    var A=a.r,B=b.r,x,ga=a.m.tier>=2?1:0,gb=b.m.tier>=2?1:0;
    if(ga!==gb)return gb-ga;
    if(s==="rating"){x=B.r-A.r;if(x)return x;return B.v-A.v}
    if(s==="reviews"){return B.v-A.v}
    if(s==="price"){var pa=A.pm==null?1e9:A.pm,pb=B.pm==null?1e9:B.pm;if(pa!==pb)return pa-pb;return B._best-A._best}
    if(s==="open"){var oa={open:0,unk:1,closed:2}[A._st],ob={open:0,unk:1,closed:2}[B._st];if(oa!==ob)return oa-ob;return B._best-A._best}
    if(a.m.tier!==b.m.tier)return b.m.tier-a.m.tier;
    return B._best-A._best;
  });
  return {res:res,fixes:P.fixes,toks:P.t};
}
/* ---------- rendering ---------- */
function money(p){return "$"+(p%1?p.toFixed(2):p)}
function hilite(name,tks){
  var words=name.split(/(\s+)/);
  return words.map(function(w){
    if(!w.trim())return w;var n=stem(norm(w)),hit=false;
    for(var i=0;i<tks.length;i++){var alts=SYNMAP[tks[i]]||[tks[i]];for(var a=0;a<alts.length;a++){if(n&&(wm(n,alts[a])||false))hit=true}}
    return hit?"<mark>"+esc(w)+"</mark>":esc(w);
  }).join("");
}
function hoursHtml(r){
  if(!r.hraw||!r.hraw.length)return "";
  return "<details><summary>Hours</summary><div class=hrs>"+r.hraw.map(function(x){return "<span>"+esc(x[0])+"</span><span>"+esc(x[1])+"</span>"}).join("")+"</div><div class=note>Hours from Google Maps, "+esc(D.asOfLabel)+". Holiday-week hours (Thanksgiving) can differ — call to confirm.</div></details>";
}
function directions(r){return "https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(r.n+", "+r.a)}
function mapsPlace(r){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(r.n+", "+r.a)}
function card(e,rank,showRank){
  var r=e.r,m=e.m,tk=m.q||[];
  var isFav=favs.indexOf(r.id)>=0;
  var st=r._st||(r._st=openState(r));
  var h='<article class=card data-id="'+r.id+'"><h2><span>'+(showRank?'<span class=rank>#'+rank+'</span>':'')+esc(r.n)+'</span><button class="fav'+(isFav?' on':'')+'" data-fav="'+r.id+'" aria-label="'+(isFav?'Remove from favorites':'Add to favorites')+'" aria-pressed="'+isFav+'">'+(isFav?'♥':'♡')+'</button></h2>';
  h+='<div class=rate><span class=star>★</span> <b>'+r.r.toFixed(1)+'</b> <span class=muted>('+r.v.toLocaleString()+' Google reviews) · as of '+esc(D.asOfLabel)+'</span></div>';
  h+='<div class=tags>'+r.tags.map(function(t){return '<span class=tag>'+esc(t)+'</span>'}).join("")
    +(st==="open"?'<span class="badge b-open">Open now</span>':st==="closed"?'<span class="badge b-closed">Closed now</span>':'')
    +(r.halal?'<span class="badge b-halal">Halal</span>':'')
    +(r.pork==="none"?'<span class="badge b-nopork">No pork on menu</span>':r.pork==="has"?'<span class="badge b-pork">Pork on menu</span>':'')+'</div>';
  if(r.pm!=null)h+='<div class=line>💲 Typical dish ≈ <b>'+money(r.pm)+'</b> <span class=muted>('+esc(r.pt)+', median of '+r.pn+' priced items on their online menu)</span></div>';
  h+='<div class=line>📍 '+esc(r.a)+'</div>';
  if(r.ph)h+='<div class=line>📞 <a href="tel:'+esc(r.ph.replace(/[^\d+]/g,""))+'">'+esc(r.ph)+'</a></div>';
  if(m.fb){h+='<div class=dishes style="background:#fffbeb;border-color:#fde68a"><h3 style="color:#92400e">Dish not confirmed</h3><div class=line>'+esc(r._items.length?'“'+tk.join(' ')+'” was not found in the menu text we read':'We could not read this restaurant’s dish list')+' — it is a '+esc(r.tags[0])+' restaurant, so check the menu link.</div></div>'}
  if(m.items&&m.items.length&&tk.length){
    var its=m.items.slice().sort(function(a,b){return (b.p!=null)-(a.p!=null)}).slice(0,5);
    h+='<div class=dishes><h3>🍜 Matching dishes on their menu</h3><ul>'+its.map(function(it){return '<li>'+hilite(it.n,tk)+(it.p!=null?' <span class=dp>— '+money(it.p)+'</span>':'')+'</li>'}).join("")+'</ul>'
      +(m.items.length>5?'<div class=note>+'+(m.items.length-5)+' more matching dishes — see full menu.</div>':'')
      +'<div class=note>From '+esc(r.msrc)+', '+esc(D.menuAsOfLabel)+'. Prices shown only when listed on that page; they may change.</div></div>';
  }else if(tk.length&&!r._items.length){
    // no dish info; matched by type/name only
  }
  if(r._items.length)h+='<details><summary>All dishes we found ('+r._items.length+')</summary><ul class=alldish>'+r._items.slice(0,80).map(function(it){return '<li>'+hilite(it.n,tk)+(it.p!=null?' <span class=dp>— '+money(it.p)+'</span>':'')+'</li>'}).join("")+'</ul><div class=note>Dish names read from '+esc(r.msrc)+' on '+esc(D.menuAsOfLabel)+'. This may not be the complete menu — use the menu link.</div></details>';
  else h+='<div class="line muted">Dish list not available — use the menu link.</div>';
  h+=hoursHtml(r);
  h+='<div class=acts><a class="btn p" target=_blank rel=noopener href="'+esc(directions(r))+'">Directions</a>';
  var ml=r.m||r.w;
  if(ml)h+='<a class=btn target=_blank rel=noopener href="'+esc(ml)+'">'+(r.m?'Full menu':'Website / menu')+'</a>';
  if(r.w&&r.m&&r.w!==r.m)h+='<a class=btn target=_blank rel=noopener href="'+esc(r.w)+'">Website</a>';
  h+='<a class=btn target=_blank rel=noopener href="'+esc(mapsPlace(r))+'">Google Maps</a></div>';
  if(r.note)h+='<div class=note>'+esc(r.note)+'</div>';
  return h+'</article>';
}
var state={q:"",sort:"best",open:false,halal:false,view:"find"};
var lastList=[];
function render(){
  var out=run(state.q,state),res=out.res;
  lastList=res;
  var s="";
  if(out.fixes.length)s='<div class=dym>Showing results for <b>'+out.fixes.map(function(f){return esc(f[1])}).join(", ")+'</b> (you typed '+out.fixes.map(function(f){return esc(f[0])}).join(", ")+')</div>';
  var fbn=res.filter(function(e){return e.m.fb}).length,sure=res.length-fbn;
  var qq=state.q.trim()?' for “'+esc(state.q.trim())+'”':' in Frisco, TX';
  var msg=sure+' restaurant'+(sure===1?'':'s')+qq+(fbn?' + '+fbn+' similar place'+(fbn===1?'':'s')+' where the dish is not confirmed':'');
  $("summary").innerHTML=s+msg+' · ranked '+({best:"by weighted Google rating + review count",rating:"by highest Google rating",reviews:"by most Google reviews",price:"by menu price (lowest first; unknown last)",open:"open-now first"}[state.sort]);
  var h=res.slice(0,shown).map(function(e,i){return card(e,i+1,state.sort==="best")}).join("");
  if(res.length>shown)h+='<button class="btn p" id="more" type="button">Show more ('+(res.length-shown)+' left)</button>';
  if(!res.length)h='<div class=empty><p>No Frisco restaurants match “'+esc(state.q)+'”.</p><p>Try a food type (Chinese, Mexican, Thai) or a dish (pho, oxtail, brisket).</p></div>';
  $("results").innerHTML=h;
  $("clear").hidden=!state.q;
  syncChips();
}
function renderFav(){
  var res=L.filter(function(r){return favs.indexOf(r.id)>=0}).map(function(r){r._st=openState(r);return {r:r,m:{tier:0,items:[]}}});
  $("favSummary").textContent=res.length?res.length+" saved restaurant"+(res.length===1?"":"s"):"";
  $("favResults").innerHTML=res.length?res.map(function(e,i){return card(e,i+1,false)}).join(""):'<div class=empty><p>No favorites yet.</p><p>Tap the ♡ on any restaurant to save it here. Saved only on this device.</p></div>';
}
function setView(v){
  state.view=v;
  ["Find","Fav","About"].forEach(function(n){$("view"+n).hidden=(n.toLowerCase()!==v);$("tab"+n).classList.toggle("on",n.toLowerCase()===v)});
  $("chips").parentNode.classList.toggle("nofind",v!=="find");
  if(v==="fav")renderFav();
  if(v==="about")renderAbout();
}
/* ---------- chips ---------- */
var CHIPS=[];
function buildChips(){
  var cnt={};L.forEach(function(r){r.tags.forEach(function(t){cnt[t]=(cnt[t]||0)+1})});
  CHIPS=CUIS.map(function(c){return c[0]}).filter(function(k){return cnt[k]}).sort(function(a,b){return cnt[b]-cnt[a]});
  $("chips").innerHTML=CHIPS.map(function(k){return '<button type=button class=chip data-q="'+esc(k)+'">'+esc(k)+' <small>'+cnt[k]+'</small></button>'}).join("");
  var DISHES=["General Tso's chicken","Pho","Ramen","Sushi roll","Birria tacos","Jerk chicken","Oxtail","Butter chicken","Pad Thai","Brisket","Lobster","Biryani","Gyro","Shawarma","Dumplings","Wings"];
  var h="";
  DISHES.forEach(function(d){var n=run(d,{sort:"best"}).res.filter(function(e){return e.m.items&&e.m.items.length}).length;if(n)h+='<button type=button class=chip data-q="'+esc(d)+'">'+esc(d)+' <small>'+n+'</small></button>'});
  $("dishchips").innerHTML='<span class=chip style="border:0;background:none;padding-left:0;opacity:.9">Dishes:</span>'+h;
}
function syncChips(){
  var q=state.q.trim().toLowerCase();
  document.querySelectorAll(".chip[data-q]").forEach(function(c){c.classList.toggle("on",c.getAttribute("data-q").toLowerCase()===q)});
}
/* ---------- about ---------- */
function renderAbout(){
  var cnt={};L.forEach(function(r){r.tags.forEach(function(t){cnt[t]=(cnt[t]||0)+1})});
  var withD=L.filter(function(r){return r.dishes&&r.dishes.length}).length;
  $("viewAbout").innerHTML='<h2>About this app</h2><p>'+L.length+' real Frisco, TX restaurants that were listed as open on Google Maps on '+esc(D.asOfLabel)+'. '+withD+' of them have dish names read from their own online menus.</p>'
   +'<p><b>“Best”</b> is a weighted score: a restaurant with few reviews is pulled toward the Frisco average, so a 5.0 with 8 reviews does not beat a 4.7 with 1,500.</p>'
   +'<p><b>Search</b> understands food types (Chinese, Mexican…), dishes (pho, oxtail, General Tso’s…), restaurant names, other spellings, and small typos.</p>'
   +'<p><b>Prices</b> are shown only when the restaurant’s own menu page lists them, and may have changed. The price tier is estimated from those listed prices; restaurants without a priced menu show no price.</p>'
   +'<p><b>Halal / no pork:</b> “Halal” appears only if Google lists the place as halal or its own site says halal. “No pork on menu” means no pork words (pork, bacon, ham, sausage, chorizo, carnitas, pepperoni, al pastor, prosciutto…) were found in the menu text we read — ask the restaurant about shared fryers or hidden ingredients.</p>'
   +'<table><tr><th>Food type</th><th>Restaurants</th></tr>'+Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]}).map(function(k){return '<tr><td>'+esc(k)+'</td><td>'+cnt[k]+'</td></tr>'}).join("")+'</table>'
   +'<p class=note>Sources: ratings, review counts, addresses, phones, hours — Google Maps public listings ('+esc(D.asOfLabel)+'). Dishes and prices — each restaurant’s official website/menu page ('+esc(D.menuAsOfLabel)+'). Informational only.</p>';
}
/* ---------- events ---------- */
var timer;
function setQ(v,now){
  $("q").value=v;state.q=v;shown=40;
  if(now)render();
}
$("q").addEventListener("input",function(){state.q=this.value;shown=40;clearTimeout(timer);timer=setTimeout(render,60);$("clear").hidden=!this.value});
$("searchForm").addEventListener("submit",function(e){e.preventDefault();state.q=$("q").value;render();$("q").blur();window.scrollTo(0,0)});
$("clear").addEventListener("click",function(){setQ("",true);$("q").focus()});
document.addEventListener("click",function(e){
  var c=e.target.closest(".chip[data-q]");
  if(c){var q=c.getAttribute("data-q");if(state.q.trim().toLowerCase()===q.toLowerCase())setQ("",true);else setQ(q,true);if(state.view!=="find")setView("find");window.scrollTo(0,0);return}
  var f=e.target.closest("[data-fav]");
  if(f){var id=+f.getAttribute("data-fav"),i=favs.indexOf(id);if(i<0)favs.push(id);else favs.splice(i,1);saveFavs();if(state.view==="fav")renderFav();else render();return}
  if(e.target.id==="more"){shown+=40;render()}
});
$("sort").addEventListener("change",function(){state.sort=this.value;render()});
$("fOpen").addEventListener("change",function(){state.open=this.checked;render()});
$("fHalal").addEventListener("change",function(){state.halal=this.checked;render()});
$("tabFind").onclick=function(){setView("find")};$("tabFav").onclick=function(){setView("fav")};$("tabAbout").onclick=function(){setView("about")};
saveFavs();buildChips();render();
window.FRSEARCH=function(q,sort){var o=run(q,{sort:sort||"best"});return o.res.map(function(e){return {name:e.r.n,tier:e.m.tier,fb:!!e.m.fb,items:e.m.items.map(function(i){return i.n})}})};
if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js")})}
})();
