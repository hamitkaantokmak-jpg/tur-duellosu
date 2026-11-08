"""Verify matched real-render evidence, not visual quality (which requires human inspection)."""
import json
from pathlib import Path
root=Path('docs/visual/v4');before=json.loads((root/'before/captures.json').read_text());after=json.loads((root/'after/captures.json').read_text())
assert len(before['shots'])==len(after['shots'])==8
for key in ['profile','adaptive','ao']:assert before[key]==after[key],key
for a,b in zip(before['shots'],after['shots']):
 for key in ['id','time','camera','target','render','delta']:assert a[key]==b[key],(a['id'],key)
 assert b['render']==[1920,1080];assert not b['assetErrors']
print('Eight pairs match actual camera/target/time/delta/native1080p/profile; visual review remains separate.')
