document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.partners-marquee').forEach((marquee) => {
    const track = marquee.querySelector('.partners-track');
    if (!track || track.dataset.loopReady) return;
    track.dataset.loopReady = 'true';
    const group = document.createElement('div');
    group.className = 'partners-group';
    while (track.firstElementChild) group.appendChild(track.firstElementChild);
    const duplicate = group.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    duplicate.querySelectorAll('a, button, [tabindex]').forEach((item) => item.setAttribute('tabindex', '-1'));
    duplicate.querySelectorAll('img').forEach((image) => image.setAttribute('alt', ''));
    track.append(group, duplicate);
  });
});
