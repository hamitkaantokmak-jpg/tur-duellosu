"""Download the CC0 Tree Small 02 source and verify Poly Haven MD5 metadata.
Usage: python3 scripts/fetch-tree-v4.py /tmp/td-v4-tree
Requires curl. Keeps proxy and TLS verification defaults.
"""
import json,subprocess,hashlib,sys
from pathlib import Path
meta=json.loads(Path('art/blender/tree-source.json').read_text())['gltf'];root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=True)
for name,f in [('tree_small_02.gltf',meta),*meta['include'].items()]:
 path=Path(name);assert not path.is_absolute()and '..'not in path.parts
 p=root/path;p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists()and hashlib.md5(p.read_bytes()).hexdigest()==f['md5']:continue
 subprocess.run(['curl','-fsSL','--max-time','180',f['url'],'-o',str(p)],check=True)
 assert hashlib.md5(p.read_bytes()).hexdigest()==f['md5'],name
 print(name,p.stat().st_size)
