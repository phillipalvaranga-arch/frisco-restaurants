import re,json,glob,os
FOOD="""chicken beef pork lamb goat mutton duck turkey fish salmon tuna shrimp prawn crab lobster oyster oysters scallop scallops calamari squid octopus eel snapper tilapia catfish cod halibut mahi seafood steak ribeye sirloin filet brisket ribs rib sausage bacon ham burger cheeseburger sandwich sub hoagie wrap burrito taco tacos quesadilla nachos enchilada enchiladas fajita fajitas tamale tamales torta pozole menudo birria barbacoa carnitas al pastor asada carne chimichanga flauta flautas elote guacamole queso salsa chilaquiles huevos tostada tostadas gordita
pizza pasta spaghetti lasagna ravioli gnocchi risotto fettuccine alfredo penne linguine carbonara marinara parmesan parmigiana calzone panini bruschetta tiramisu cannoli
sushi sashimi nigiri roll rolls maki temaki ramen udon soba tempura teriyaki katsu donburi bento yakitori gyoza hibachi teppanyaki miso edamame takoyaki okonomiyaki tonkotsu
curry tikka masala biryani naan paneer korma vindaloo saag samosa pakora dosa idli vada uttapam tandoori kebab kabob chaat bhaji thali paratha roti dal daal lassi haleem nihari karahi chana choley bhatura puri
noodle noodles lo mein chow fried rice dumpling dumplings wonton bao bun buns dim sum egg roll rolls spring szechuan sichuan kung pao general tso's tso orange sesame mongolian hunan broccoli beef lomein congee hotpot hot pot bbq
pad thai tom yum tom kha larb satay papaya basil
pho banh mi bun bo vermicelli bahn
bulgogi bibimbap kimchi galbi japchae tteokbokki
gyro gyros shawarma falafel hummus pita tabbouleh baba ganoush kofta souvlaki spanakopita dolma moussaka tzatziki shish baklava lahmacun
jerk oxtail plantain plantains ackee saltfish callaloo escovitch patty patties curry goat rice and peas
gumbo jambalaya etouffee po'boy crawfish catfish collard collards cornbread mac cheese fried chicken wings wing tenders nuggets fries grits biscuits pancakes waffles waffle omelet omelette scramble benedict toast french toast crepe crepes hash brown skillet breakfast brunch
salad soup bowl bowls platter combo plate entree lunch dinner special appetizer dessert cheesecake cake pie brownie
vegetarian vegan veggie tofu paneer chickpea lentil
fufu jollof suya egusi injera wat doro tibs
empanada empanadas ceviche arepa arepas pupusa pupusas lomo saltado cubano mojo ropa vieja churrasco picanha rodizio feijoada
smoked pulled chopped burnt ends bbq brisket link links
lamb chops cutlet tenderloin pork loin chop gravy mashed potatoes potato fries onion rings corn okra greens beans slaw
""".split()
FOODRE=re.compile(r"\b("+"|".join(sorted(set(re.escape(w) for w in FOOD if len(w)>2),key=len,reverse=True))+r")\b",re.I)
STOP=re.compile(r"order online|order now|gift card|copyright|©|privacy|terms|allerg|sign up|subscribe|newsletter|call us|follow us|reservation|catering|open |closed|hours|monday|tuesday|wednesday|thursday|friday|saturday|sunday|address|phone|e-mail|email|click|view full|download|join our|careers|rewards|nutrition|calories|cal\b|delivery|pickup|pick up|doordash|uber|grubhub|login|log in|cart|checkout|skip to|menu$|add to|choose|select|required|served with|comes with|includes|please|available|starting at|gratuity|tax|powered by|http|www\.|\.com|we |our |you |your |all rights|\bcompare\b|whats?app",re.I)
PRICE=re.compile(r"\$\s?(\d{1,3}(?:\.\d{2})?)\b|\b(\d{1,3}\.\d{2})\b")
def clean(s):
    s=s.replace("\u200b","").replace("\u00a0"," ").replace("\u2019","'").strip(" \t-–—•*·|:.")
    return re.sub(r"\s+"," ",s)
def looks_name(s):
    if re.search(r"\b(suite|ste\.?|blvd|pkwy|parkway|rd\.|ave\.?|street|drive)\b|\b\d{3,}\b",s,re.I): return False
    if not (3<=len(s)<=60): return False
    if STOP.search(s): return False
    if s.count(",")>1 or s.endswith(".") or "!" in s or "?" in s: return False
    words=re.findall(r"[A-Za-z'&]+",s)
    if not words or len(words)>9: return False
    big=[w for w in words if len(w)>3 or w.isupper()]
    if not big: return True
    cap=sum(1 for w in big if w[0].isupper())
    return cap/len(big)>=0.6
def items_from(text):
    lines=[clean(l) for l in text.split("\n")]
    out={}
    for i,l in enumerate(lines):
        if not l: continue
        price=None
        m=PRICE.search(l)
        name=l
        if m:
            name=clean(PRICE.sub("",l)); price=float(m.group(1) or m.group(2))
        else:
            nxt=lines[i+1] if i+1<len(lines) else ""
            if re.fullmatch(r"\$?\s?\d{1,3}(\.\d{2})?",nxt): price=float(nxt.replace("$","").strip())
        name=re.sub(r"\(.*?\)","",name)
        name=re.sub(r"[^\x00-\u024f\u2000-\u206f]+","",name)
        name=re.sub(r"^[A-Za-z]{0,2}\d{1,3}\s*[\.\):\-]\s*","",name)
        name=re.sub(r"^(order|add|new)\s+","",name,flags=re.I)
        name=name.strip(" -–—•*·|:.,/")
        name=clean(name)
        if not looks_name(name) or not FOODRE.search(name): continue
        key=name.lower()
        if key not in out or (price and not out[key][1]): out[key]=(name,price)
    return list(out.values())
