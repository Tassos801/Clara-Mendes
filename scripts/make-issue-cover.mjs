/* eslint-disable no-console */
// Renders a typographic issue cover for the Karina of Time journal.
// Edit the ISSUE labels/title below per issue, then:
//   node scripts/make-issue-cover.mjs <output.png>
// Same visual language as the journal's dusk sky: near-black to amber
// gradient, turbulence cloud layers, grain, typewriter + serif type.
// Output: 1200x1500 (4:5, matching the ring's plate covers).
import sharp from 'sharp';

const W = 1200;
const H = 1500;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#100d0a"/>
      <stop offset="0.26" stop-color="#1f1812"/>
      <stop offset="0.52" stop-color="#3a2b1e"/>
      <stop offset="0.76" stop-color="#6b4a35"/>
      <stop offset="0.9" stop-color="#9a6b52"/>
      <stop offset="1" stop-color="#b98a6e"/>
    </linearGradient>
    <filter id="haze" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.005 0.009" numOctaves="5" seed="11" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.91  0 0 0 0 0.85  0.55 0.55 0.55 0 -0.62"/>
    </filter>
    <filter id="billow" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0016 0.0042" numOctaves="5" seed="9" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.94  0 0 0 0 0.78  0 0 0 0 0.62  1.15 1.15 1.15 0 -1.02"/>
    </filter>
    <filter id="shadowmass" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0017 0.0045" numOctaves="5" seed="17" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.075  0 0 0 0 0.06  1.05 1.05 1.05 0 -1.05"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.16 0.16 0.16 0 -0.14"/>
    </filter>
    <linearGradient id="billowfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.3" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.62" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="lowhalf">
      <rect width="${W}" height="${H}" fill="url(#billowfade)"/>
    </mask>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#dusk)"/>
  <rect width="${W}" height="${H}" filter="url(#haze)" opacity="0.5"/>
  <rect width="${W}" height="${H}" filter="url(#shadowmass)" opacity="0.75" mask="url(#lowhalf)"/>
  <rect width="${W}" height="${H}" filter="url(#billow)" opacity="0.8" mask="url(#lowhalf)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.5"/>

  <text x="600" y="360" text-anchor="middle" font-family="Courier New, monospace" font-size="34" letter-spacing="14" fill="#d9cfc0">ISSUE 01</text>
  <text x="600" y="415" text-anchor="middle" font-family="Courier New, monospace" font-size="25" letter-spacing="9" fill="#bfb3a2">THE FOUNDING DISPATCH</text>

  <text x="600" y="640" text-anchor="middle" font-family="Georgia, serif" font-size="120" fill="#f2ece1">Karina</text>
  <text x="600" y="770" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="86" fill="#f2ece1">of</text>
  <text x="600" y="905" text-anchor="middle" font-family="Georgia, serif" font-size="120" fill="#f2ece1">Time</text>

  <rect x="599" y="980" width="2" height="90" fill="#f2ece1" opacity="0.4"/>

  <text x="600" y="1160" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="40" fill="#e6dccb">&#954;&#945;&#961;&#943;&#957;&#945; &#183; the keel</text>

  <text x="600" y="1370" text-anchor="middle" font-family="Courier New, monospace" font-size="26" letter-spacing="8" fill="#d9cfc0">THE CLARA MENDES JOURNAL</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(process.argv[2] ?? 'issue-01-cover.png');
console.log('cover written');
/* eslint-enable no-console */
