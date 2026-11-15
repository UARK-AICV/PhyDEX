"""Package actual rendered frames; no generated/interpolated motion. Requires Pillow."""
import argparse
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--stills', type=Path, required=True)
parser.add_argument('--sequence', type=Path, required=True)
parser.add_argument('--output', type=Path, help='Optional staging website directory')
parser.add_argument('--reuse-frames', action='store_true', help='Reuse frames already encoded into this output directory')
args = parser.parse_args()
root = args.output or Path(__file__).resolve().parents[1]
assets = root / 'assets'

def encode(source, destination, width=None):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        if width:
            image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        image.convert('RGB').save(destination, 'WEBP', quality=90, method=4)

for family in ('rigid', 'irregular', 'dynamic_mass'):
    for destination in ('static_single', 'static_multiple', 'moving_target'):
        key = f'{family}__{destination}'
        source = args.stills / key / 'right_initial_4k.png'
        encode(source, assets / 'gallery' / f'{key}.webp', 960)
        encode(source, assets / 'gallery' / f'{key}-4k.webp')
manifest = json.loads((args.sequence / 'manifest.json').read_text())
frames = []
episode = manifest['scene']['native_episode']
for index, frame in enumerate(manifest['frames']):
    source = args.sequence / frame['file']
    full = f'assets/sequence/{episode}/{index:04d}.webp'
    mobile = f'assets/sequence/{episode}/mobile/{index:04d}.webp'
    if not args.reuse_frames or not (root / full).exists(): encode(source, root / full)
    if not args.reuse_frames or not (root / mobile).exists(): encode(source, root / mobile, 1280)
    frames.append(dict(src=full, mobile=mobile, time_s=frame['time_s'], state_index=frame['state_index']))
encode(args.sequence / 'poster_4k.png', assets / 'poster.webp')
(assets / 'sequence.json').write_text(json.dumps(dict(frames=frames), indent=2))
# Keep camera/render provenance without private machine paths.
scene = manifest.pop('scene', {})
manifest['recording'] = {key: scene[key] for key in ('native_episode', 'condition_key', 'category', 'task') if key in scene}
manifest['poster_rendering'] = '3840x2160 RTX PathTracing, 512 spp, 16 bounces, OptiX denoising'
manifest['frames'] = frames
manifest['moving_frames'] = 'Chronological samples of recorded physical states; no interpolation or physics resimulation'
(assets / 'camera.json').write_text(json.dumps(manifest, indent=2))
print(f'Packaged {len(frames)} chronological frames and nine gallery scenes.')
