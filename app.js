'use strict';
const sequence = document.querySelector('.sequence');
const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d', {alpha: false});
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sceneWindow = document.querySelector('.scene-window');
const cue = document.querySelector('.scroll-cue');
const poster = document.querySelector('.poster');
let opened = false;
async function reveal() {
  try { await poster.decode(); } catch (_) { /* Preserve navigation if the poster fails. */ }
  sceneWindow.classList.add('revealed');
  if (reducedMotion.matches) finishReveal();
}
function finishReveal() {
  opened = true;
  sequence.classList.add('opened');
  schedule();
}
sceneWindow.addEventListener('animationend', finishReveal, {once:true});
cue.addEventListener('click', () => {
  window.scrollBy({top: innerHeight * .7, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
});
let frames = [], desired = 0, displayed = -1, active = 0, scheduled = false;
const cache = new Map(), pending = new Set(), failed = new Set();
const mobile = matchMedia('(max-width: 700px)').matches;
function draw(index) {
  const img = cache.get(index);
  if (!img) return;
  const width = innerWidth, height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2, 3840 / width);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  ctx.fillStyle = '#151a16'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale);
  canvas.style.opacity = desired === 0 || reducedMotion.matches ? 0 : 1;
  displayed = index;

}
function pump() {
  if (!frames.length || reducedMotion.matches) return;
  const wanted = [desired];
  for (let offset = 1; offset <= (mobile ? 4 : 3); offset++) wanted.push(desired + offset, desired - offset);
  for (const index of wanted) {
    if (active >= 3) break;
    if (index < 0 || index >= frames.length || cache.has(index) || pending.has(index) || failed.has(index)) continue;
    active++; pending.add(index);
    const img = new Image();
    img.onload = () => {
      active--; pending.delete(index); cache.set(index, img);
      if (index === desired) draw(index);
      while (cache.size > (mobile ? 14 : 7)) {
        const furthest = [...cache.keys()].filter(key => key !== displayed && key !== desired).sort((a,b) => Math.abs(b-desired)-Math.abs(a-desired))[0];
        cache.delete(furthest);
      }
      pump();
    };
    img.onerror = () => {
      active--; pending.delete(index); failed.add(index);

      pump();
    };
    img.src = mobile && frames[index].mobile ? frames[index].mobile : frames[index].src;
  }
}
function update() {
  scheduled = false;
  const rect = sequence.getBoundingClientRect();
  const progress = reducedMotion.matches ? 0 : Math.min(1, Math.max(0, -rect.top / Math.max(1, sequence.offsetHeight - innerHeight)));
  cue.classList.toggle('visible', opened && progress < .006);
  cue.tabIndex = opened && progress < .006 ? 0 : -1;
  if (progress === 0 || reducedMotion.matches) canvas.style.opacity = 0;
  desired = Math.round(progress * Math.max(0, frames.length - 1));
  if (frames.length && !reducedMotion.matches) { draw(desired); pump(); }
}
function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
addEventListener('scroll', schedule, {passive:true});
addEventListener('resize', schedule);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishReveal(); schedule(); });
fetch('assets/sequence.json').then(r => {if (!r.ok) throw Error('Sequence unavailable'); return r.json();}).then(data => {
  frames = data.frames;

  update();
}).catch(() => { sequence.classList.add('sequence-unavailable'); });
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
reveal();
