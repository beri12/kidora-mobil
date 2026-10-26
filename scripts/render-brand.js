// Renders Kidora brand art (owl mascot "Kai") to the PNG sizes Expo needs.
// Usage: node render.js <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

const C = {
  iris50: '#F3F0FF', iris100: '#E9E3FF', iris200: '#D5CBFF', iris300: '#B7A6FF',
  iris500: '#6E52F5', iris600: '#5B3CF0', iris700: '#4B2ED6', iris900: '#2A1A78',
  sun300: '#FDE68A', sun400: '#FACC15', sun500: '#F59E0B', coral400: '#FB7185',
  grass500: '#22C55E', sky500: '#0EA5E9', ink: '#1E1B4B',
};

/** The owl, drawn in a 1024 box centred on (512, 540). `mono` = flat white silhouette. */
function owl({ mono = false } = {}) {
  const body = mono ? '#fff' : C.iris500;
  const bodyDark = mono ? '#fff' : C.iris700;
  const belly = mono ? 'none' : C.iris100;
  const eyeWhite = mono ? '#000' : '#fff';
  const pupil = mono ? '#fff' : C.ink;
  const beak = mono ? '#000' : C.sun500;
  const cap = mono ? '#fff' : C.ink;
  const tassel = mono ? '#fff' : C.sun400;
  return `
  <g>
    <!-- ear tufts -->
    <path d="M300 330 L268 190 L410 285 Z" fill="${bodyDark}" stroke-linejoin="round" stroke="${bodyDark}" stroke-width="28"/>
    <path d="M724 330 L756 190 L614 285 Z" fill="${bodyDark}" stroke-linejoin="round" stroke="${bodyDark}" stroke-width="28"/>
    <!-- body -->
    <ellipse cx="512" cy="560" rx="270" ry="300" fill="${body}" ${mono ? '' : `stroke="${C.iris200}" stroke-width="10"`}/>
    <!-- wings -->
    <ellipse cx="262" cy="640" rx="70" ry="150" fill="${bodyDark}" transform="rotate(14 262 640)"/>
    <ellipse cx="762" cy="640" rx="70" ry="150" fill="${bodyDark}" transform="rotate(-14 762 640)"/>
    <!-- belly with feather scallops -->
    ${mono ? '' : `<ellipse cx="512" cy="680" rx="160" ry="165" fill="${belly}"/>
    <path d="M430 640 q20 26 40 0 q20 26 40 0 q20 26 40 0 q20 26 40 0" fill="none" stroke="${C.iris300}" stroke-width="12" stroke-linecap="round"/>
    <path d="M450 710 q20 26 40 0 q20 26 40 0 q20 26 40 0" fill="none" stroke="${C.iris300}" stroke-width="12" stroke-linecap="round"/>`}
    <!-- eyes -->
    <circle cx="410" cy="470" r="108" fill="${eyeWhite}"/>
    <circle cx="614" cy="470" r="108" fill="${eyeWhite}"/>
    <circle cx="425" cy="482" r="54" fill="${pupil}"/>
    <circle cx="599" cy="482" r="54" fill="${pupil}"/>
    ${mono ? '' : `<circle cx="444" cy="460" r="19" fill="#fff"/><circle cx="618" cy="460" r="19" fill="#fff"/>
    <circle cx="410" cy="502" r="8" fill="#fff" opacity=".8"/><circle cx="584" cy="502" r="8" fill="#fff" opacity=".8"/>`}
    <!-- beak -->
    <path d="M478 560 Q512 545 546 560 L520 612 Q512 624 504 612 Z" fill="${beak}"/>
    ${mono ? '' : `<circle cx="330" cy="585" r="30" fill="${C.coral400}" opacity=".55"/><circle cx="694" cy="585" r="30" fill="${C.coral400}" opacity=".55"/>`}
    <!-- feet -->
    ${mono ? '' : `<path d="M440 850 q12 30 24 0 q12 30 24 0" fill="${C.sun500}" stroke="${C.sun500}" stroke-width="18" stroke-linejoin="round"/>
    <path d="M536 850 q12 30 24 0 q12 30 24 0" fill="${C.sun500}" stroke="${C.sun500}" stroke-width="18" stroke-linejoin="round"/>`}
    <!-- graduation cap -->
    <path d="M512 150 L740 228 L512 306 L284 228 Z" fill="${cap}" stroke="${cap}" stroke-width="16" stroke-linejoin="round"/>
    <path d="M400 268 L400 318 Q512 360 624 318 L624 268 L512 306 Z" fill="${cap}"/>
    <path d="M512 228 L700 262 L700 352" fill="none" stroke="${tassel}" stroke-width="14" stroke-linecap="round"/>
    <circle cx="700" cy="362" r="22" fill="${tassel}"/>
  </g>`;
}

function star(x, y, r, fill) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="${r * 0.18}" stroke-linejoin="round"/>`;
}

const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.iris500}"/><stop offset="1" stop-color="${C.iris700}"/>
  </linearGradient>
</defs>`;

const sparkles = `${star(185, 300, 46, C.sun400)}${star(860, 520, 34, C.sun300)}${star(170, 800, 28, '#fff')}${star(850, 840, 40, C.coral400)}`;

/** Owl scaled by `s` around the canvas centre. */
const scaled = (s, inner) => `<g transform="translate(512 512) scale(${s}) translate(-512 -540)">${inner}</g>`;

const svgs = {
  // App icon: full-bleed purple, no transparency (iOS rejects alpha).
  'icon.png': { size: 1024, svg: `${defs}<rect width="1024" height="1024" fill="url(#bg)"/>
    <circle cx="512" cy="540" r="380" fill="#fff" opacity=".12"/>${sparkles}${scaled(0.86, owl())}` },
  // Splash: purple disc on transparent, shown on the iris50 splash background.
  'splash-icon.png': { size: 1024, transparent: true, svg: `${defs}<circle cx="512" cy="512" r="500" fill="url(#bg)"/>${sparkles}${scaled(0.78, owl())}` },
  // Android adaptive icon: foreground kept inside the 66% safe zone.
  'android-icon-foreground.png': { size: 512, transparent: true, svg: `${scaled(0.58, owl())}` },
  'android-icon-background.png': { size: 512, svg: `${defs}<rect width="1024" height="1024" fill="url(#bg)"/>${star(200, 230, 40, C.sun400)}${star(840, 800, 34, C.coral400)}` },
  'android-icon-monochrome.png': { size: 432, transparent: true, svg: `<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#000"/>${scaled(0.58, owl({ mono: true }))}</mask></defs><rect width="1024" height="1024" fill="#fff" mask="url(#m)"/>` },
  'favicon.png': { size: 48, svg: `${defs}<rect width="1024" height="1024" rx="230" fill="url(#bg)"/>${scaled(0.92, owl())}` },
  // In-app art for the animated splash and auth screens.
  'images/kidora-owl.png': { size: 512, transparent: true, svg: `${scaled(0.95, owl())}` },
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, { size, svg, transparent }] of Object.entries(svgs)) {
    const html = `<html><body style="margin:0;background:transparent">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${svg}</svg></body></html>`;
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html);
    const file = path.join(out, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, omitBackground: !!transparent, clip: { x: 0, y: 0, width: size, height: size } });
    fs.writeFileSync(file.replace(/\.png$/, '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${svg}</svg>`);
    console.log('wrote', name);
  }
  await browser.close();
})();
