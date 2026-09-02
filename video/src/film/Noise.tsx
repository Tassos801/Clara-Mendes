import {AbsoluteFill} from 'remotion';

const NOISE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
const NOISE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}`;

/** Static grain at 5 %, the film's version of the site's os-noise-overlay. */
export const Noise: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("${NOISE_URL}")`,
        backgroundSize: '240px 240px',
        mixBlendMode: 'multiply',
        opacity: 0.05,
        pointerEvents: 'none',
      }}
    />
  );
};
