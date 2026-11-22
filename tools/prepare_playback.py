"""Encode rendered states for responsive, bidirectional browser seeking.
Requires ffmpeg and Pillow. Independent-frame proxies avoid decoding neighboring
frames during scroll scrubbing; the original 4K encode is retained separately.
"""
import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--sequence', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1])
args = parser.parse_args()
assets = args.output / 'assets'
assets.mkdir(parents=True, exist_ok=True)
manifest = json.loads((args.sequence / 'manifest.json').read_text())
frames = manifest['frames']
for frame in frames:
    assert (args.sequence / frame['file']).is_file(), frame['file']
fps = 30
for name, width, keyframes in [('throw-4k.mp4', 3840, 4), ('throw-mobile.mp4', 1280, 4),
                               ('throw-scrub.mp4', 1920, 1), ('throw-scrub-mobile.mp4', 1280, 1)]:
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-framerate', str(fps), '-i', str(args.sequence / 'frame_%04d_4k.png'),
        '-frames:v', str(len(frames)), '-vf', f'scale={width}:-2',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', ('20' if keyframes == 1 else '18'), '-threads', '4',
        '-g', str(keyframes), '-keyint_min', str(keyframes), '-sc_threshold', '0', '-bf', '0', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', '-an', str(assets / name)], check=True)
# Use the decoded first video frame for an exposure/lighting-matched fallback.
poster = assets / 'poster-motion.png'
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i',
    str(assets / 'throw-4k.mp4'), '-frames:v', '1', str(poster)], check=True)
with Image.open(poster) as image:
    image.save(assets / 'poster-motion.webp', 'WEBP', quality=95, method=4)
poster.unlink()
(assets / 'playback.json').write_text(json.dumps(dict(src='assets/throw-4k.mp4',
    mobile='assets/throw-mobile.mp4', scrub='assets/throw-scrub.mp4',
    scrubMobile='assets/throw-scrub-mobile.mp4', fps=fps, frameCount=len(frames)), indent=2))
scene = manifest.pop('scene')
manifest['recording'] = {k: scene[k] for k in ('native_episode', 'condition_key', 'category', 'task')}
manifest['frames'] = [dict(state_index=f['state_index'], time_s=f['time_s']) for f in frames]
manifest['moving_frames'] = 'Chronological recorded physical states; no interpolated motion or physics resimulation'
manifest['opening_rendering'] = 'Decoded first motion frame; identical renderer, lighting and exposure throughout'
manifest['playback_encoding'] = 'Original 4K H.264 retained; 1920px desktop and 1280px mobile all-intra CRF 20 scroll proxies'
manifest['scroll_timing'] = 'Equal scroll distance per frame; dense 60Hz recorded-state sampling from 8.3s through landing gives the throw more scroll distance'
(assets / 'camera.json').write_text(json.dumps(manifest, indent=2))
print(f'Encoded {len(frames)} seek-optimized frames.', flush=True)
