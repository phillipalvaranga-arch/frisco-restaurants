import json,collections,re
o=json.load(open("final.json"))
o=[r for r in o if not re.search(r"shops at|hookah|candies|wonderkids|lazi cow|dave & buster",r["n"],re.I)]
OVR={"88 Baobao":["Chinese"],"H2 Fresh":["Indian"],"Real 真饌":["Chinese"],"La Parisienne":["French"],"Dillas Quesadillas":["Mexican"],"Crimson Coward":["Chicken & wings"],"Yum Asian Bistro":["Asian"],"Didi's Downtown":["American"],"Litehouse":["American"]}
for r in o:
    for k,v in OVR.items():
        if k in r["n"]: r["tags"]=v
L=[]
for i,r in enumerate(o):
    d={"id":i,"n":r["n"].replace(" - Frisco TX","").replace(" Frisco","") if False else r["n"],"tags":r["tags"],"a":r["a"],"ph":r["ph"],"r":r["r"],"v":r["v"],"w":r["w"],"m":r["m"],"h":r["h"],"hraw":r["hraw"],"dishes":r["dishes"],"msrc":r["msrc"]}
    if r["halal"]:
        d["halal"]=True
        if "Halal" not in d["tags"]: d["tags"]=d["tags"]+["Halal"]
    if r.get("pork"): d["pork"]=r["pork"]
    notes=[]
    if r["halal"]: notes.append("Halal: "+r.get("hsrc","")+".")
    if r.get("pork")=="has": notes.append("Menu text mentions: "+", ".join(r.get("pk",[]))+" — check the menu for what is pork.")
    if r.get("pork")=="none": notes.append("No pork words found in the menu text we read; ask about shared fryers/ingredients.")
    if notes: d["note"]=" ".join(notes)
    for k in ("pm","pn","pt"):
        if k in r: d[k]=r[k]
    d["g"]=r["g"]
    L.append(d)
js="window.FRD="+json.dumps({"asOf":"2026-11-24","asOfLabel":"Nov 24, 2026","menuAsOfLabel":"Nov 24, 2026","source":"Google Maps public listings","list":L},ensure_ascii=False,separators=(",",":"))+";\n"
open("/workspace/frisco-restaurants/data.js","w").write(js)
print(len(L),len(js)//1024,"KB")
c=collections.Counter(t for r in L for t in r["tags"]); print(c.most_common())
print("with dishes",sum(1 for r in L if r["dishes"]),"no website",sum(1 for r in L if not r["w"] and not r["m"]))
