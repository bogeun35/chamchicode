// Original anime artwork, animated by song time on the recorded game canvas.
const animeBgaImages = {};
const animeReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
for (const id of ['drive-party','autumn-rain']) {
  const img = new Image(); img.src = `o2jam/bga/${id}-heroine.png`;
  animeBgaImages[id] = img;
}
function drawAnimeBga(ctx, r, settings, time, width, height) {
  if (!r || settings.bga === false) return false;
  const image = animeBgaImages[r.song.id];
  if (!image || !image.complete || !image.naturalWidth) return false;
  const reduced = animeReducedMotion.matches;
  const t = Math.max(0,time), rain = r.song.id === 'autumn-rain';
  const zoom = reduced ? 1.04 : 1.055 + .012 * Math.sin(t / (rain ? 11 : 7));
  const scale = Math.max(width/image.naturalWidth,height/image.naturalHeight)*zoom;
  const iw=image.naturalWidth*scale, ih=image.naturalHeight*scale;
  ctx.save();
  const dx = reduced ? 0 : Math.sin(t / 13) * 8;
  ctx.drawImage(image,(width-iw)/2+dx,(height-ih)/2,iw,ih);
  if (!reduced) {
    ctx.lineWidth=rain?1:2;ctx.strokeStyle=rain?'rgba(185,215,245,.25)':'rgba(102,222,255,.28)';
    ctx.beginPath();
    for(let i=0;i<(rain?48:20);i++) {
      const x=(i*173.7+t*(rain?32:340))%(width+100)-50;
      const y=(i*97.3+t*(rain?430:45))%(height+60)-30;
      ctx.moveTo(x,y);ctx.lineTo(x+(rain?-6:35),y+(rain?22:3));
    }
    ctx.stroke();
  }
  // Protect note contrast and score readability without hiding the portrait.
  ctx.fillStyle='rgba(3,7,18,.40)';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='rgba(3,7,18,.52)';ctx.fillRect(0,0,440,height);
  ctx.restore();return true;
}
