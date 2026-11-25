import json,re,glob,os,statistics,sys,collections
from urllib.parse import urlparse
from extract import items_from,clean
P=json.load(open("places.json")); det=json.load(open("det_all.json")); cand={v["id"]:v for v in json.load(open("cand.json"))}
ASOF="2026-11-24"; ASOFL="Nov 24, 2026"
GENERIC=set("dessert desserts appetizer appetizers salad salads soup soups entree entrees side sides drink drinks lunch dinner breakfast brunch special specials combo combos platter platters plate plates menu bowl bowls kids kid beverages sandwiches sandwich burgers burger wraps wrap pizza pizzas pasta pastas rice noodles noodle seafood chicken beef lamb vegetarian vegan sushi rolls roll tacos taco nachos wings starters starter mains main extras extra add ons sauces sauce items item".split())
BADSTART=re.compile(r"^(come|start|pick|bring|let|enjoy|join|make|choose|build|create|explore|learn|try|get|view|see|shop|find|visit|read|meet|about|contact|follow|call|book|buy|catering|party|private|happy hour|best|welcome|new|our|the history|history)\b",re.I)
CATLAST=set("favorites favourites specials menu items selections options combos platters plates sides drinks appetizers entrees desserts salads soups sandwiches burgers wraps bowls dishes classics creations picks links lunch dinner brunch breakfast".split())
def good_item(n,rname=""):
    w0=re.findall(r"[a-z']+",n.lower())
    if w0 and w0[-1] in CATLAST and len(w0)<=3: return False
    if n[:1].islower() or re.search(r"booths|authentic|cozy|experience|latest|up to date|online from|frisco|—|welcome|since|located|handles|let dinner|bring people",n,re.I): return False
    if re.search(r"quick links|should be|since \d{4}|est\.|locations?|about us|what is|family owned",n,re.I): return False
    rn=set(re.findall(r"[a-z]+",rname.lower()))-{"the","and","of","restaurant","frisco","tx","grill","kitchen","bar","cafe"}
    if rn and w0 and len(set(w0)&rn)/len(set(w0))>=0.6 and len(w0)<=5: return False
    w=re.findall(r"[a-z']+",n.lower())
    if not w or all(x in GENERIC for x in w): return False
    if BADSTART.match(n): return False
    if len(w)>5 and n.isupper(): return False
    if len(w)==1 and w[0] in ("food","menu","lunch","dinner"): return False
    return True
CATMAP=[(r"chinese|dim sum|hot pot|noodle",["Chinese"]),(r"conveyor|sushi",["Japanese","Sushi"]),(r"ramen",["Japanese","Ramen"]),(r"japanese|teppanyaki|shabu",["Japanese"]),
 (r"mexican|taco|tex-mex",["Mexican"]),(r"italian",["Italian"]),(r"pizza",["Pizza"]),(r"indian|gujarati|nepal",["Indian"]),(r"pakistani",["Pakistani"]),(r"thai",["Thai"]),(r"vietnam",["Vietnamese"]),(r"korean",["Korean"]),
 (r"mediterranean|greek|turkish|gyro|persian|shawarma|middle eastern|lebanese",["Mediterranean"]),(r"caribbean|jamaican|cuban",["Caribbean"]),(r"african|ethiopian|nigerian",["African"]),(r"southern|soul|cajun|creole",["Soul food"]),(r"barbecue|bbq",["BBQ"]),(r"seafood",["Seafood"]),(r"steak",["Steakhouse"]),
 (r"halal",["Halal"]),(r"vegetarian|vegan",["Vegetarian"]),(r"breakfast|brunch",["Breakfast"]),(r"hamburger|burger",["Burgers"]),(r"chicken",["Chicken & wings"]),(r"sandwich",["Sandwiches"]),(r"hawaiian",["Hawaiian"]),(r"american|bar & grill|diner|family|fast food",["American"])]
NAMEMAP=[(r"pizza|pizzeria|piada",["Pizza"]),(r"sushi|nigiri",["Japanese","Sushi"]),(r"ramen",["Japanese","Ramen"]),(r"hibachi|teppan|izakaya",["Japanese"]),(r"taco|taqueria|cantina|mexican|tex-mex|burrito",["Mexican"]),(r"\bpho\b|banh|viet",["Vietnamese"]),
 (r"thai",["Thai"]),(r"korean|k-?bbq",["Korean"]),(r"bbq|barbecue|smokehouse|smoke",["BBQ"]),(r"burger",["Burgers"]),(r"steak",["Steakhouse"]),(r"seafood|oyster|crab|fish|shrimp|lobster",["Seafood"]),(r"halal",["Halal"]),(r"jamaican|caribbean|reggae",["Caribbean"]),
 (r"chinese|china|wok|panda|dumpling|szechuan|sichuan|noodle",["Chinese"]),(r"indian|biryani|tandoor|curry|masala|desi|bawarchi|karahi|dosa|spice|veg\b",["Indian"]),(r"greek|mediterranean|kebab|shawarma|gyro|hummus|pita|falafel|turkish|persian",["Mediterranean"]),
 (r"italian|pasta|trattoria|osteria|ristorante",["Italian"]),(r"wing|chicken|tender|cane",["Chicken & wings"]),(r"breakfast|brunch|pancake|waffle|egg|first watch|diner|cafe",["Breakfast"]),(r"sandwich|sub|deli|jersey|jimmy",["Sandwiches"]),(r"poke|hawaiian",["Hawaiian"]),(r"cajun|soul|southern|creole",["Soul food"]),(r"vegan|vegetarian",["Vegetarian"])]
MENUWORDS=[("Sushi",r"\b(sushi|sashimi|nigiri)\b"),("Ramen",r"\bramen\b"),("Mexican",r"\b(taco|tacos|burrito|enchilada|quesadilla|fajita)\b"),("Chinese",r"\b(lo mein|fried rice|kung pao|general tso|szechuan|egg roll|chow mein|wonton)\b"),("Indian",r"\b(tikka|masala|biryani|naan|paneer|korma|samosa)\b"),("Thai",r"\b(pad thai|tom yum|tom kha|green curry|red curry)\b"),("Vietnamese",r"\b(pho|banh mi)\b"),("Italian",r"\b(lasagna|ravioli|gnocchi|fettuccine|spaghetti|risotto)\b"),("Pizza",r"\bpizza\b"),("BBQ",r"\b(brisket|burnt ends|pulled pork)\b"),("Mediterranean",r"\b(gyro|shawarma|falafel|hummus|kebab|kabob)\b"),("Burgers",r"\b(burger|cheeseburger)\b"),("Seafood",r"\b(lobster|shrimp|oyster|crab|salmon)\b"),("Steakhouse",r"\b(ribeye|filet mignon|sirloin)\b"),("Breakfast",r"\b(pancake|omelet|omelette|waffle|benedict)\b"),("Caribbean",r"\b(jerk|oxtail|plantain)\b"),("Korean",r"\b(bulgogi|bibimbap|kimchi)\b")]
PORK=re.compile(r"\b(pork|bacon|ham|sausage|chorizo|carnitas|pepperoni|prosciutto|pancetta|al pastor|salami|lard|char siu|chashu|tonkotsu|tonkatsu|spare ?ribs|baby back|pulled pork|pork belly|canadian bacon|andouille|bratwurst|hot dog|hot dogs|luau pork|pigs? in)\b",re.I)
def hostpath(u):
    p=urlparse(u); return (p.netloc.replace("www.","")+p.path).rstrip("/")
def pt(s,dflt=None):
    m=re.fullmatch(r"(\d{1,2})(?::(\d{2}))?\s*([AP]M)?",s.strip(),re.I)
    if not m: return None
    h=int(m[1])%12; mi=int(m[2] or 0); ap=(m[3] or dflt or "").upper()
    if not m[3] and not dflt: return None
    return h*60+mi+(720 if ap=="PM" else 0), ap
def parse_hours(rows):
    days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
    H=[None]*7; raw=[]; nk=0
    for r in rows:
        r=re.sub(r"[\ue000-\uf8ff]","",r).replace("\u202f"," ").replace("\u2009"," ").strip()
        m=re.match(r"(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*(\([^)]*\))?\s*(.*)$",r)
        if not m: continue
        di=days.index(m[1]); rest=m[3].replace("Hours might differ","").replace("Holiday hours","").strip()
        raw.append([m[1]+(" "+m[2] if m[2] else ""),rest or "—"])
        if m[2]: continue
        if re.match(r"closed",rest,re.I): H[di]=[];continue
        if re.match(r"open 24",rest,re.I): H[di]=[[0,1440]];continue
        rngs=[]
        parts=[x[0]+"–"+x[1] for x in re.findall(r"(\d{1,2}(?::\d\d)?\s*(?:[AP]M)?)\s*[–-]\s*(\d{1,2}(?::\d\d)?\s*[AP]M)",rest,re.I)]
        if not parts: continue
        for part in parts:
            a=re.split(r"[–-]",part.strip())
            if len(a)!=2: rngs=None;break
            e=pt(a[1]); 
            if not e: rngs=None;break
            s=pt(a[0],e[1])
            if not s: rngs=None;break
            o=s[0]; c=e[0]
            if not re.search(r"[AP]M",a[0],re.I) and o>c: 
                o=(o-720)%1440 if o>=720 else o+720
            if c<=o: c+=1440
            rngs.append([o,c])
        if rngs: H[di]=rngs
    return (H if any(h is not None for h in H) else None),raw
def tags_for(p,text):
    t=[]
    cat=(p["cat"] or "").lower()
    for rx,ts in CATMAP:
        if re.search(rx,cat):
            for x in ts:
                if x not in t: t.append(x)
            break
    nm=p["name"].lower()
    for rx,ts in NAMEMAP:
        if re.search(rx,nm):
            if t and t[0] in("American","Breakfast","Sandwiches","Chicken & wings") or not t or cat in("restaurant","asian restaurant","fast food restaurant") or True:
                # add strong name signals (not weak words) 
                weak=ts[0] in ("Breakfast","Sandwiches","Chicken & wings","Indian","Seafood")
                if weak and t: continue
                for x in ts:
                    if x not in t: t.append(x)
    if not t or t==["American"]:
        sc=[(len(re.findall(rx,text,re.I)),k) for k,rx in MENUWORDS]
        sc=[x for x in sc if x[0]>=6]; sc.sort(reverse=True); sc=sc[:1]
        for n,k in sc[:2]:
            if k not in t: t.insert(0,k)
            if k=="Sushi" and "Japanese" not in t: t.append("Japanese")
            if k=="Ramen" and "Japanese" not in t: t.append("Japanese")
    if "Pizza" in t and "Italian" not in t and re.search(r"italian",cat+nm): t.append("Italian")
    if not t: t=["American"] if re.search(r"grill|bar|kitchen|cafe|house",nm) else ["Restaurant"]
    return t
def run():
    closed=set()
    out=[]; stats=collections.Counter()
    links=set()
    for p in P:
        d=det[str(p["id"])]
        if re.search(r"Permanently closed|Temporarily closed",d["body"]): continue
        if "Frisco, TX" not in p["address"]: continue
        if re.search(r"coffee|grinds?\b|kolache|bakery|boba|creamery|donut|doughnut|smoothie|juice|dessert|bubble|\btea\b|latte|ice cream|gelato|hookah",p["name"],re.I): continue
        mf="menus/%d.json"%p["id"]
        pages=json.load(open(mf))["pages"] if os.path.exists(mf) else []
        items={}; best_url=None; bn=0; text=""
        for pg in pages:
            its=[(n,pr) for n,pr in items_from(pg["text"]) if good_item(n,p['name'])]
            text+="\n"+pg["text"]
            if len(its)>bn: bn=len(its); best_url=pg["url"]
            for n,pr in its:
                k=n.lower()
                if k not in items or (pr and not items[k][1]): items[k]=(n,pr)
        dl=list(items.values())[:140]
        if len(dl)<3: dl=[]
        w=p["website"]; 
        if w: w=re.sub(r"[?&]utm_[^&]*","",w).rstrip("?&")
        murl=None
        if best_url and bn>=3:
            bu=re.sub(r"[?&]utm_[^&]*","",best_url).rstrip("?&")
            if w and hostpath(bu)!=hostpath(w): murl=bu
            elif w and urlparse(bu).path.strip("/")!="" : murl=bu
        if p.get("menu"): murl=murl or p["menu"]
        tg=tags_for(p,text)
        rec={"id":len(out),"n":p["name"],"tags":tg,"cat":p["cat"],"a":p["address"].replace(", USA",""),"ph":p["phone"],"r":p["rating"],"v":p["rev"],"w":w,"m":murl,"lat":p["lat"],"lng":p["lng"],"g":p["gurl"].split("?")[0]}
        hrows=p["hours"] or []
        if not hrows and os.path.exists("h_out.json"):
            ho=json.load(open("h_out.json")).get(p["name"])
            if ho: hrows=ho[:7]
        h,raw=parse_hours(hrows)
        rec["h"]=h; rec["hraw"]=raw
        # halal / pork
        low=text.lower()
        halal=("halal" in (p["cat"] or "").lower()) or ("halal" in p["name"].lower()) 
        hsrc="Google category/name" if halal else None
        if not halal and re.search(r"\bhalal\b",low) and not re.search(r"(not|non|no)[- ]halal",low): halal=True; hsrc="mentioned on its website/menu"
        rec["halal"]=halal; 
        if halal: rec["hsrc"]=hsrc
        pk=sorted(set(x.lower() for x in PORK.findall(text)))
        if len(dl)>=10:
            rec["pork"]="has" if pk else "none"
            if pk: rec["pk"]=pk[:4]
        else: rec["pork"]=None
        rec["dishes"]=[[n,pr if pr and 1<=pr<=150 else None] for n,pr in dl]
        pr=[pr for n,pr in dl if pr and 4<=pr<=80]
        if len(pr)>=5:
            med=statistics.median(pr); rec["pm"]=round(med,2); rec["pn"]=len(pr)
            rec["pt"]="$" if med<10 else "$$" if med<17 else "$$$" if med<30 else "$$$$"
        rec["msrc"]=hostpath(best_url) if best_url and dl else (hostpath(w) if w else "")
        out.append(rec)
        for u in (w,murl):
            if u: links.add(u)
    return out,links
if __name__=="__main__":
    out,links=run()
    json.dump(out,open("built.json","w"))
    json.dump(sorted(links),open("links.json","w"))
    print(len(out),"with dishes",sum(1 for r in out if r["dishes"]),"links",len(links))
    c=collections.Counter(t for r in out for t in r["tags"]); print(c.most_common())
