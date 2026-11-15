# Extrinsic Dexterity project website

A self-contained static site for GitHub Pages. The opening reveals a full-screen angle-16 4K render through an expanding circle from black, followed by an animated downward arrow. No text overlays the opening; scrolling scrubs chronological recorded states forward and backward before reaching the research section. No build, backend, or API keys are needed.

## Preview

From this folder:

```bash
python -m http.server 8000
```

Open http://localhost:8000. Use an HTTP server rather than opening index.html directly, because the sequence manifest is loaded with fetch.

## Deploy as a standalone GitHub repository

Copy this folder's **contents**, including `.github` and `.nojekyll`, to the root of your website repository. Push to the `main` branch. In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions**. The included workflow deploys the static files. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

All site URLs are relative, so repository subpaths work. If keeping this folder inside the research repository instead, place its workflow at the repository root under `.github/workflows/` and change the upload artifact `path` from `.` to `website`.

## Edit content

- `index.html`: research introduction, title, paper metadata, section text. The project name is used provisionally; replace the publication note with confirmed authors, paper, code, and dataset links when available.
- `style.css`: colors, layout, mobile behavior, and scroll duration (`.sequence` height).
- `app.js`: scroll-to-video mapping, coalesced seeking, and gallery filters.
- `assets/playback.json`: video paths, frame count, and encoding frame rate.
- `assets/camera.json`: exact camera pose, intrinsics, and rendering provenance.

The opening and animation use the same native 3840 × 2160 RTX rendering and exposure. The fallback poster is extracted from the first encoded video frame, preventing a lighting change when scrolling starts. Gallery stills retain the supplied 2,048-sample renders.

The browser preloads a seek-optimized H.264 video with a keyframe every four frames. Only one seek is active at a time; new scroll input replaces the pending destination. Mobile devices load a 1280px video; desktop playback retains 3840 × 2160 resolution. Slow connections can still delay uncached positions. With reduced motion enabled, the opening becomes a single still and the paper is immediately below it. Without JavaScript the poster and research text remain accessible.

## Source assets

The gallery comes from `nine_combination_angle16_4k_20261114`. The animation restores chronological physical states from the cereal-box / wooden-tray episode (`demo_320`, batch_000001/run_000), using the relative angle-16 camera rule from the supplied target-extremes renders, then aiming 0.28 m left in the camera plane and widening the lens (0.78× focal length) to show more of the robot’s motion. This successful 10.48-second trajectory was selected for its shorter, more direct arm path. It does not interpolate stills or resimulate the trajectory. The original data and renders remain untouched outside this folder.

The throw from 8.3 seconds onward is sampled at 60 Hz from recorded physics states, versus roughly 14 Hz during the approach. Each encoded frame receives equal scroll distance, slowing the throw for inspection without synthesizing motion.

To repackage a completed render, install FFmpeg and Pillow and run:

```bash
python tools/prepare_playback.py --sequence /path/to/completed/sequence
```

The input sequence directory must contain its render manifest and all referenced 4K PNGs. The packager writes desktop and mobile MP4 files, a matching WebP poster, and portable manifests; the website does not require the source dataset or simulation environment.
