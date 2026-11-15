'use strict';
const sequence = document.querySelector('.sequence');
const video = document.querySelector('#scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sceneWindow = document.querySelector('.scene-window');
const cue = document.querySelector('.scroll-cue');
const poster = document.querySelector('.poster');
let opened = false, scheduled = false, desired = 0, displayed = 0;
let frameCount = 0, fps = 30, seekingFrame = null, ready = false;
let revealStarted = false;
async function reveal() {
  if (revealStarted) return;
  revealStarted = true;
  try { await poster.decode(); } catch (_) {}
  sceneWindow.classList.add('revealed');
  if (reducedMotion.matches) finishReveal();
}
function finishReveal() { opened = true; schedule(); }
sceneWindow.addEventListener('animationend', finishReveal, {once:true});
cue.addEventListener('click', () => {
  window.scrollBy({top: innerHeight * .7, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
});
function seekLatest() {
  if (!ready || reducedMotion.matches || seekingFrame !== null || video.seeking || desired === displayed) return;
  // Finish the current decode before seeking again. Rapid wheel input replaces
  // the destination, never queues a backlog of obsolete frames.
  seekingFrame = desired;
  video.currentTime = (desired + .25) / fps;
}
video.addEventListener('seeked', () => {
  displayed = seekingFrame === null ? Math.min(frameCount - 1, Math.floor(video.currentTime * fps)) : seekingFrame;
  seekingFrame = null;
  schedule();
});
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
  cue.classList.toggle('visible', opened && progress < .006);
  cue.tabIndex = opened && progress < .006 ? 0 : -1;
  desired = Math.round(progress * Math.max(0, frameCount - 1));
  video.style.opacity = ready && !reducedMotion.matches ? 1 : 0;
  seekLatest();
}
function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
addEventListener('scroll', schedule, {passive:true});
addEventListener('resize', schedule);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishReveal(); schedule(); });
fetch('assets/playback.json').then(r => { if (!r.ok) throw Error('Playback unavailable'); return r.json(); }).then(data => {
  frameCount = data.frameCount; fps = data.fps;
  video.src = matchMedia('(max-width: 700px)').matches ? data.mobile : data.src;
  video.load();
  if (reducedMotion.matches) reveal();
  update();
}).catch(() => { sequence.classList.add('sequence-unavailable'); reveal(); });
// A slow connection must not leave visitors staring at black indefinitely.
setTimeout(reveal, 2500);
const families = {rigid:'Rigid', irregular:'Irregular', dynamic_mass:'Dynamic mass'};
const destinations = {static_single:'Single destination',static_multiple:'Multiple destinations',moving_target:'Moving target'};
const grid = document.querySelector('#gallery-grid');
let ordinal = 0;
for (const [family,label] of Object.entries(families)) {
  for (const [destination,name] of Object.entries(destinations)) {
    ordinal++;
    const id = `${family}__${destination}`;
    const card = document.createElement('figure');
    card.className = 'scene-card'; card.dataset.family = family;
    card.innerHTML = `<a href="assets/gallery/${id}-4k.webp" target="_blank" rel="noopener" aria-label="Open 4K render: ${label}, ${name}"><img src="assets/gallery/${id}.webp" loading="lazy" decoding="async" width="960" height="540" alt="${label} object scene with ${name.toLowerCase()}"></a><figcaption>${label}<span>${String(ordinal).padStart(2,'0')} ↗</span></figcaption><p>${name}</p>`;
    grid.append(card);
  }
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  grid.querySelectorAll('.scene-card').forEach(card => {card.hidden = button.dataset.filter !== 'all' && card.dataset.family !== button.dataset.filter;});
}));

update();
