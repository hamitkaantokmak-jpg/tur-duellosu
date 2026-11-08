import json,math,xml.etree.ElementTree as E
from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('input');args=parser.parse_args()
r=E.parse(args.input).getroot();nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])]for n in r.findall('node')};ways=[]
for w in r.findall('way'):
 t={a.attrib['k']:a.attrib['v']for a in w.findall('tag')}
 if t.get('highway')=='raceway' and t.get('sport')=='motor' and t.get('name')!='Pit Lane':ways.append({'id':int(w.attrib['id']),'coordinates':[nodes[n.attrib['ref']]for n in w.findall('nd') if n.attrib['ref']in nodes]})
source=json.loads(Path('assets/tracks/mexico.geojson').read_text())['features'][0]['geometry']['coordinates'];lon,lat=source[0];cos=math.cos(lat*math.pi/180)
def project(p):return ((p[0]-lon)*111320*cos,-(p[1]-lat)*111320)
segments=[(project(a),project(b))for w in ways for a,b in zip(w['coordinates'],w['coordinates'][1:])]
def distance(p):
 best=1e20
 for a,b in segments:
  dx,dz=b[0]-a[0],b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz or 1)));best=min(best,math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz))
 return best
values=sorted(distance(project(p))for p in source);result={'source':'OSM API bbox, 2026-11-08','comparison':'Bacinger source vertices to nearest OSM motor raceway segment (pit excluded; shared and alternative Formula E/oval branches included), local equirectangular metres; alternative raceway branches may be included. This is a consistency check, not survey accuracy or full lap topology validation.','sampleCount':len(values),'median_m':values[len(values)//2],'p95_m':values[int(len(values)*.95)],'max_m':max(values),'racewayWays':ways}
Path('assets/tracks/v3/geographic-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in result.items() if k!='racewayWays'})
