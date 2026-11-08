"""Bake simple offset boundaries; build-only dependency: Shapely 2.1.2 (BSD-3-Clause).
Derived from the MIT render path. 16m offsets are representative, not surveyed barriers.
"""
import json
from pathlib import Path
from shapely.geometry import Polygon
from shapely.geometry.polygon import orient
source=Path('assets/tracks/v3/render-path.js').read_text().split('globalThis.MEXICO_RENDER_PATH=')[1].rstrip(';\n')
polygon=Polygon(json.loads(source)['points'])
assert polygon.is_valid
boundaries=[]
for side in [-1,1]:
    buffered=polygon.buffer(side*16,quad_segs=8,join_style='round')
    assert buffered.geom_type=='Polygon' and buffered.is_valid
    points=[[round(x,3),round(z,3)] for x,z in orient(buffered,sign=1).exterior.coords]
    boundaries.append({'side':side,'points':points})
Path('assets/tracks/v3/boundaries.js').write_text('/* MIT render-path derivative. Simple 16m offsets, not surveyed race barriers. */\nglobalThis.MEXICO_BOUNDARIES='+json.dumps(boundaries,separators=(',',':'))+';\n')
print([len(b['points'])for b in boundaries])
