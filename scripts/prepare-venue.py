import xml.etree.ElementTree as E,json,pathlib,math,hashlib
import argparse
parser=argparse.ArgumentParser(description='Extract public circuit footprints and trees from OSM XML (ODbL).')
parser.add_argument('input',help='OSM XML from the bbox URL embedded in output metadata')
args=parser.parse_args()
r=E.parse(args.input).getroot();nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])]for n in r.findall('node')};features=[]
for w in r.findall('way'):
 t={a.attrib['k']:a.attrib['v']for a in w.findall('tag')};kind='building'if'building'in t else'pit'if t.get('name')=='Pit Lane'else'stadium'if t.get('loc_name')=='Foro Sol'else'pitch'if t.get('leisure')=='pitch'else None
 if not kind:continue
 coords=[nodes[n.attrib['ref']]for n in w.findall('nd')if n.attrib['ref']in nodes]
 if len(coords)<3:continue
 cx=sum(p[0]for p in coords)/len(coords);cy=sum(p[1]for p in coords)/len(coords)
 if not(-99.0985<cx<-99.081 and 19.396<cy<19.408):continue
 if kind=='building'and t.get('building')=='grandstand':kind='grandstand'
 record={'id':int(w.attrib['id']),'kind':kind,'coordinates':coords,'name':t.get('name',''),'levels':t.get('building:levels'),'height':t.get('height'),'heightSource':'OSM tag'if'height'in t else'estimated','roofColour':t.get('roof:colour')}
 features.append(record)
trees=[]
for n in r.findall('node'):
 t={a.attrib['k']:a.attrib['v']for a in n.findall('tag')}
 if t.get('natural')=='tree':trees.append({'id':int(n.attrib['id']),'coordinate':nodes[n.attrib['id']]})
obj={'source':'https://api.openstreetmap.org/api/0.6/map?bbox=-99.098,19.3965,-99.082,19.4075','retrieved':'2026-11-08','license':'ODbL-1.0','attribution':'© OpenStreetMap contributors','features':features,'trees':trees,'notes':'Only public circuit-area footprints and tree positions. Address, contact and personal fields excluded. Heights without an OSM height tag, facade details, temporary stands and track widths are representative.'}
p=pathlib.Path('assets/tracks/v3/venue-osm.json');p.write_text(json.dumps(obj,separators=(',',':'),ensure_ascii=False)+'\n');pathlib.Path('assets/tracks/v3/venue-osm.js').write_text('/* © OpenStreetMap contributors, ODbL 1.0. See venue-osm.json and assets/licenses/ODbL-1.0.txt. */\nglobalThis.MEXICO_VENUE='+json.dumps(obj,separators=(',',':'),ensure_ascii=False)+';\n');print(len(features),'features',len(trees),'trees')
