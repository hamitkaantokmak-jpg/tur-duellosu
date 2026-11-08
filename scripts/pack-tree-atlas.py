from PIL import Image
from pathlib import Path
p=Path('assets/v4');atlas=Image.new('RGBA',(1536,512))
for i in range(3):atlas.paste(Image.open(p/f'tree-view-{i}.png'),(i*512,0))
atlas.save(p/'tree-atlas.png',optimize=True)
