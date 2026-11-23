'use strict';
const sequence = document.querySelector('.sequence');
const video = document.querySelector('#scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sceneWindow = document.querySelector('.scene-window');
const cue = document.querySelector('.scroll-cue');
const poster = document.querySelector('.poster');
let opened = false, scheduled = false, desired = 0, displayed = 0;
let frameCount = Number(video.dataset.frameCount), fps = Number(video.dataset.fps), seekingFrame = null, ready = false;
let revealStarted = false;
async function reveal() {
  if (revealStarted) return;
  revealStarted = true;
  try { await poster.decode(); } catch (_) {}
  sceneWindow.classList.add('revealed');
  if (reducedMotion.matches) finishReveal();
  else setTimeout(showOpeningControls, 1000);
}
const introHint = document.querySelector('#intro-hint');
let hintTimer;
function dismissHint() {
  introHint.classList.add('dismissed');
  introHint.inert = true;
  clearTimeout(hintTimer);
}
function showOpeningControls() {
  cue.classList.add('visible');
  document.querySelector('.site-header').classList.add('visible');
}
function finishReveal() {
  if (!opened) hintTimer = setTimeout(dismissHint, 4000);
  opened = true;
  showOpeningControls();
  schedule();
}
sceneWindow.addEventListener('animationend', finishReveal, {once:true});
cue.addEventListener('click', () => {
  dismissHint();
  window.scrollBy({top: innerHeight * .7, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
});
function seekLatest() {
  if (!ready || reducedMotion.matches || seekingFrame !== null || video.seeking || desired === displayed) return;
  const targetTime = (desired + .25) / fps;
  // A partially downloaded video may not yet allow this position. Retry when
  // more data arrives instead of treating a clamped seek as a rendered frame.
  let available = false;
  for (let i = 0; i < video.seekable.length; i++) {
    if (targetTime >= video.seekable.start(i) && targetTime < video.seekable.end(i)) available = true;
  }
  if (!available) return;
  // Finish the current decode before seeking again. Rapid wheel input replaces
  // the destination, never queues a backlog of obsolete frames.
  seekingFrame = desired;
  video.currentTime = targetTime;
}
video.addEventListener('seeked', () => {
  displayed = Math.min(frameCount - 1, Math.floor(video.currentTime * fps));
  seekingFrame = null;
  // Start the newest pending seek immediately; waiting for another animation
  // frame here adds a full display refresh to every decoded frame.
  seekLatest();
  schedule();
});
video.addEventListener('progress', schedule);
video.addEventListener('canplay', schedule);
video.addEventListener('loadeddata', () => {
  ready = true;
  video.classList.add('ready');
  reveal();
  schedule();
});
video.addEventListener('error', () => { sequence.classList.add('sequence-unavailable'); reveal(); });
function update() {
  scheduled = false;
  const rect = sequence.getBoundingClientRect();
  const progress = reducedMotion.matches ? 0 : Math.min(1, Math.max(0, -rect.top / Math.max(1, sequence.offsetHeight - innerHeight)));
  // Hide the arrow once the visitor has started scrolling the throw.
  const scrolled = progress > .02;
  if (window.scrollY > 40) dismissHint();
  cue.classList.toggle('scrolled', scrolled);
  cue.tabIndex = scrolled ? -1 : 0;
  desired = Math.round(progress * Math.max(0, frameCount - 1));
  video.style.opacity = ready && !reducedMotion.matches ? 1 : 0;
  seekLatest();
}
function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
addEventListener('scroll', schedule, {passive:true});
addEventListener('resize', schedule);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishReveal(); schedule(); });
// Reveal the lightweight poster immediately; video loads in parallel from HTML.
// Handle a cached video that became ready before this deferred script ran.
if (video.readyState >= 2) {
  ready = true;
  video.classList.add('ready');
}
reveal();
const families = {rigid: ['Uniform mass', 'uniform'], irregular: ['Irregular mass', 'irregular'], dynamic_mass: ['Dynamic mass', 'dynamic']};
const destinations = {static_single: ['Single destination', 'single'], static_multiple: ['Multiple destinations', 'multiple'], moving_target: ['Moving destination', 'moving']};
const grid = document.querySelector('#gallery-grid');
let ordinal = 0;
const taskWatcher = new IntersectionObserver(entries => entries.forEach(({target: video, isIntersecting}) => {
  video.dataset.visible = isIntersecting ? '1' : '';
  if (isIntersecting && !video.closest('.scene-card').hidden) {
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    if (!reducedMotion.matches && !video.dataset.userPaused) video.play().catch(() => {});
  } else video.pause();
}), {threshold: .25});
for (const [family, [label, fileFamily]] of Object.entries(families)) {
  for (const [destination, [name, fileDestination]] of Object.entries(destinations)) {
    ordinal++;
    const base = `assets/task-gallery-videos/${fileFamily}-${fileDestination}`;
    const card = document.createElement('figure');
    card.className = 'scene-card'; card.dataset.family = family;
    card.innerHTML = `<div class="task-media"><video muted loop playsinline controls preload="none" poster="${base}.webp" data-src="${base}.mp4" aria-label="${label}, ${name.toLowerCase()} — recorded throwing demonstration"></video><span class="task-number" aria-hidden="true">${String(ordinal).padStart(2,'0')}</span></div><figcaption><span class="task-family">${label}</span><a class="task-expand" href="${base}.mp4" target="_blank" rel="noopener" aria-label="Open ${label}, ${name.toLowerCase()} video">↗</a></figcaption><p><span class="task-marker" aria-hidden="true"></span>${name}</p>`;
    grid.append(card);
    const clip = card.querySelector('video');
    clip.addEventListener('pause', () => {
      if (clip.dataset.visible && !card.hidden && !reducedMotion.matches) clip.dataset.userPaused = '1';
    });
    clip.addEventListener('play', () => { delete clip.dataset.userPaused; });
    taskWatcher.observe(clip);
  }
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  grid.querySelectorAll('.scene-card').forEach(card => {
    card.hidden = button.dataset.filter !== 'all' && card.dataset.family !== button.dataset.filter;
    if (card.hidden) card.querySelector('video').pause();
  });
}));
reducedMotion.addEventListener('change', () => grid.querySelectorAll('video').forEach(clip => {
  if (reducedMotion.matches) clip.pause();
  else if (clip.dataset.visible && !clip.closest('.scene-card').hidden && !clip.dataset.userPaused) clip.play().catch(() => {});
}));

update();

// Showcase grid video: load only when near the viewport, play only while visible.
const showcase = document.querySelector('.showcase-video');
if (showcase) {
  const pick = () => matchMedia('(max-width: 1280px)').matches ? showcase.dataset.mobile : showcase.dataset.src;
  const play = () => { if (!reducedMotion.matches) showcase.play().catch(() => {}); };
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!showcase.src) { showcase.src = pick(); showcase.preload = 'auto'; }
      play();
    } else if (showcase.src) showcase.pause();
  }, {rootMargin: '50% 0px'}).observe(showcase);
  reducedMotion.addEventListener('change', () => reducedMotion.matches ? showcase.pause() : play());
}

// Real-world experiments: one success and one failure per policy for the chosen condition.
const realGrid = document.querySelector('#real-grid');
if (realGrid) {
  const policies = ['ForceVLA', 'Groot'];
  const outcomes = ['success', 'failure'];
  const watcher = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => {
    target.dataset.visible = isIntersecting ? '1' : '';
    if (isIntersecting) {
      if (target.dataset.src && target.getAttribute('src') !== target.dataset.src) target.src = target.dataset.src;
      if (!reducedMotion.matches) target.play().catch(() => {});
    } else target.pause();
  }), {threshold: .15});
  for (const policy of policies) {
    const row = document.createElement('div');
    row.className = 'real-row';
    const label = policy === 'Groot' ? 'GR00T N1.7' : policy;
    row.innerHTML = `<h3>${label}</h3>` + outcomes.map(o =>
      `<figure class="real-clip" data-outcome="${o}"><figcaption><span class="outcome-dot" aria-hidden="true"></span>${o === 'success' ? 'Successful throw' : 'Failed attempt'}</figcaption><video muted loop playsinline controls preload="none" data-policy="${policy}" data-outcome="${o}" aria-label="${label} ${o} rollout"></video></figure>`).join('');
    realGrid.append(row);
  }
  const videos = [...realGrid.querySelectorAll('video')];
  const show = condition => videos.forEach(v => {
    const base = `assets/real/${v.dataset.policy}-${condition}-${v.dataset.outcome}`;
    v.poster = `${base}.webp`;
    v.dataset.src = `${base}.mp4`;
    // Swap immediately if this clip is already loaded; untouched clips load when scrolled near.
    if (v.getAttribute('src')) { v.src = v.dataset.src; if (v.dataset.visible && !reducedMotion.matches) v.play().catch(() => {}); }
  });
  show('Normal');
  videos.forEach(v => watcher.observe(v));
  reducedMotion.addEventListener('change', () => videos.forEach(v => {
    if (reducedMotion.matches) v.pause();
    else if (v.dataset.visible) v.play().catch(() => {});
  }));
  document.querySelectorAll('[data-condition]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-condition]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    show(button.dataset.condition);
  }));
}

// Replay each chart on re-entry, without intercepting scrolling.
const resultCharts = [...document.querySelectorAll('.result-chart')];
if (resultCharts.length && 'IntersectionObserver' in window) {
  const chartWatcher = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      target.classList.toggle('chart-pending', !isIntersecting && !reducedMotion.matches);
    });
  }, {threshold: .2});
  resultCharts.forEach(chart => {
    if (!reducedMotion.matches) chart.classList.add('chart-pending');
    chartWatcher.observe(chart);
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) resultCharts.forEach(chart => chart.classList.remove('chart-pending'));
  });
}

const copyCitation = document.querySelector('#copy-citation');
if (copyCitation) copyCitation.addEventListener('click', async () => {
  const content = document.querySelector('#citation-text');
  const status = document.querySelector('#citation-status');
  try {
    await navigator.clipboard.writeText(content.textContent);
    status.textContent = 'Citation copied.';
  } catch (_) {
    const range = document.createRange();
    range.selectNodeContents(content);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = 'Citation selected. Press Ctrl+C or ⌘C to copy.';
  }
});
