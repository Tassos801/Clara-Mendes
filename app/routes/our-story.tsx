import {useEffect, useRef} from 'react';
import {Link, useNavigate} from 'react-router';
import type {Route} from './+types/our-story';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Our Story | Clara Mendes'}];
};

export default function OurStory() {
  const navigate = useNavigate();
  const blurRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const outlineRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const blur = blurRef.current;
    const dot = dotRef.current;
    const outline = outlineRef.current;
    if (!root || !blur || !dot || !outline) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    };

    const tick = () => {
      const ease = 0.08;
      cursorX += (mouseX - cursorX) * ease;
      cursorY += (mouseY - cursorY) * ease;
      outline.style.left = `${cursorX}px`;
      outline.style.top = `${cursorY}px`;

      const xPercent = (cursorX / window.innerWidth) * 100;
      const yPercent = (cursorY / window.innerHeight) * 100;
      blur.style.setProperty('--x', `${xPercent}%`);
      blur.style.setProperty('--y', `${yPercent}%`);

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const orb = orbRef.current;
    const outline = outlineRef.current;
    const root = rootRef.current;
    if (!orb || !outline || !root) return;

    const down = () => {
      outline.style.transform = 'translate(-50%, -50%) scale(0.5)';
    };
    const up = () => {
      outline.style.transform = 'translate(-50%, -50%) scale(1)';
    };
    const click = () => {
      root.style.opacity = '0';
      root.style.transition = 'opacity 1s ease';
      setTimeout(() => {
        void navigate('/');
      }, 800);
    };

    orb.addEventListener('mousedown', down);
    orb.addEventListener('mouseup', up);
    orb.addEventListener('click', click);
    return () => {
      orb.removeEventListener('mousedown', down);
      orb.removeEventListener('mouseup', up);
      orb.removeEventListener('click', click);
    };
  }, [navigate]);

  return (
    <div ref={rootRef} className="our-story-root">
      <style suppressHydrationWarning>{ourStoryCss}</style>
      <div className="os-layer-sharp" />
      <div ref={blurRef} className="os-layer-blur" />
      <div className="os-noise-overlay" />

      <div className="os-ui-layer">
        <header className="os-header-top">
          <Link to="/" className="os-nav-text os-brand">
            Clara Mendes
          </Link>
          <div className="os-nav-group">
            <Link to="/collections/all" className="os-nav-text">
              Collection
            </Link>
            <Link to="/our-story" className="os-nav-text os-active-tab">
              Our Story
            </Link>
          </div>
        </header>

        <main className="os-content-container">
          <h1 className="os-story-title">
            The quiet pursuit of <i>permanence</i>.
          </h1>
          <div className="os-story-body">
            <p>
              Clara Mendes was born from a singular belief: that the objects we
              live with should hold a history of their own. We curate pieces
              that bridge the gap between utility and sculpture.
            </p>
            <p>
              Our journey takes us across remote workshops and quiet studios,
              seeking the makers who still understand the language of raw clay,
              solid timber, and hand-spun linen. Every object in our collection
              is chosen for its ability to age with grace and silence.
            </p>
          </div>
        </main>

        <div className="os-interaction-back">
          <button
            ref={orbRef}
            type="button"
            className="os-orb-btn"
            aria-label="Return to Home"
          />
          <span className="os-label-back">Return</span>
        </div>
      </div>

      <div ref={dotRef} className="os-cursor-dot" />
      <div ref={outlineRef} className="os-cursor-outline" />
    </div>
  );
}

const ourStoryCss = `
html:has(.our-story-root) .site-header,
html:has(.our-story-root) .site-footer,
html:has(.our-story-root) .cart-button {
  display: none !important;
}
html:has(.our-story-root) body {
  overflow: hidden;
}
html:has(.our-story-root) main {
  margin: 0;
  padding: 0;
}

.our-story-root {
  --os-bg-base: #6B655B;
  --os-text-main: #ffffff;
  --os-text-muted: rgba(255, 255, 255, 0.7);
  --os-ease-fluid: cubic-bezier(0.25, 1, 0.5, 1);
  --os-font-serif: Georgia, 'Times New Roman', serif;
  --os-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--os-bg-base);
  color: var(--os-text-main);
  font-family: var(--os-font-sans);
  -webkit-font-smoothing: antialiased;
  z-index: 100;
  cursor: none;
}

.our-story-root * { cursor: none; }

.os-layer-sharp {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url('https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2560&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  z-index: 1;
  filter: sepia(0.3) grayscale(0.2) brightness(0.9);
}

.os-layer-blur {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url('https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2560&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(0.7) sepia(0.4);
  transform: scale(1.1);
  z-index: 2;
  mask-image: radial-gradient(circle 320px at var(--x, 50%) var(--y, 50%), transparent 0%, black 100%);
  -webkit-mask-image: radial-gradient(circle 320px at var(--x, 50%) var(--y, 50%), transparent 0%, black 100%);
}

.os-noise-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 3;
  opacity: 0.12;
  pointer-events: none;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}

.os-ui-layer {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 4rem 5rem;
  pointer-events: none;
}

.os-nav-text {
  font-family: var(--os-font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--os-text-main);
  pointer-events: auto;
  transition: opacity 0.3s ease;
  text-decoration: none;
}

.os-nav-text:hover { opacity: 0.6; }

.os-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 1.5rem;
}

.os-nav-group {
  display: flex;
  gap: 3rem;
}

.os-brand {
  font-family: var(--os-font-serif);
  font-size: 1.8rem;
  font-style: italic;
  text-transform: none;
  letter-spacing: 0;
}

.os-content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 600px;
  margin-top: -2rem;
}

.os-story-title {
  font-family: var(--os-font-serif);
  font-size: 3.5rem;
  font-weight: 400;
  font-style: italic;
  margin-bottom: 2.5rem;
  opacity: 0;
  animation: osFadeInSlow 2.5s var(--os-ease-fluid) forwards 0.4s;
  line-height: 1.15;
}

.os-story-body {
  font-family: var(--os-font-sans);
  font-size: 1.1rem;
  line-height: 1.8;
  font-weight: 300;
  color: var(--os-text-muted);
  opacity: 0;
  animation: osFadeInSlow 2.5s var(--os-ease-fluid) forwards 0.8s;
}

.os-story-body p { margin-bottom: 1.5rem; }

.os-interaction-back {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  pointer-events: auto;
  position: absolute;
  bottom: 4rem;
  right: 5rem;
}

.os-orb-btn {
  width: 10px; height: 10px;
  background: transparent;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.5);
  transition: all 0.6s var(--os-ease-fluid);
  position: relative;
  padding: 0;
}

.os-orb-btn::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 32px; height: 32px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 50%;
  transition: all 0.4s var(--os-ease-fluid);
}

.os-orb-btn:hover::before {
  width: 44px; height: 44px;
  border-color: rgba(255,255,255,0.4);
}

.os-label-back {
  font-family: var(--os-font-sans);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--os-text-muted);
}

.os-cursor-dot,
.os-cursor-outline {
  position: fixed;
  top: 0; left: 0;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  z-index: 9999;
  pointer-events: none;
}

.os-cursor-dot {
  width: 4px; height: 4px;
  background-color: white;
}

.os-cursor-outline {
  width: 32px; height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: width 0.2s, height 0.2s, background-color 0.2s;
}

.os-active-tab {
  border-bottom: 1px solid white;
  padding-bottom: 2px;
}

@keyframes osFadeInSlow {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .our-story-root,
  .our-story-root * {
    cursor: auto;
  }

  .os-story-title { font-size: 2.2rem; }
  .os-ui-layer { padding: 2rem; }
  .os-nav-group {
    flex-wrap: wrap;
    gap: 0.8rem 1.2rem;
    justify-content: flex-end;
  }
  .os-nav-text {
    font-size: 0.62rem;
    letter-spacing: 0.16em;
  }
  .os-brand {
    font-size: 1.38rem;
    line-height: 1.08;
    max-width: 7.5rem;
  }
  .os-interaction-back { right: 2rem; bottom: 2rem; }
  .os-cursor-dot,
  .os-cursor-outline {
    display: none;
  }
}
`;
