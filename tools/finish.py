import json,subprocess,concurrent.futures as cf,sys,re
from build import run
out,links=run()
for r in out:
    for k in ("w","m"):
        if r[k]:
            r[k]=re.sub(r"&y_source=.*$","",r[k]).replace("http://","https://",1)
links={u for r in out for u in (r["w"],r["m"]) if u}
def chk(u):
    try:
        r=subprocess.run(["curl","-sL","-o","/dev/null","-m","20","-A","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36","-w","%{http_code}",u],capture_output=True,text=True)
        return u,int(r.stdout or 0)
    except Exception: return u,0
import os
cache=json.load(open("linkstat.json")) if os.path.exists("linkstat.json") else {}
todo=[u for u in links if u not in cache]
with cf.ThreadPoolExecutor(12) as ex:
    for u,c in ex.map(chk,todo): cache[u]=c
json.dump(cache,open("linkstat.json","w"))
def okc(c): return c not in (404,410)
dropped=[]
for r in out:
    for k in ("w","m"):
        u=r[k]
        if u and not okc(cache.get(u,0)):
            dropped.append((r["n"],k,u,cache.get(u))); r[k]=None
    if r["m"] and r["m"]==r["w"]: r["m"]=None
    if not r["w"] and not r["m"]: r["nolink"]=True
json.dump(out,open("final.json","w"))
print("dropped",len(dropped)); [print(d) for d in dropped[:30]]
print(len(out))
