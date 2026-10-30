import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LOGO_HORIZONTAL, LOGO_MARK, LOGO_STACKED} from '../app/content/logo.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Windows checkouts may carry CRLF; compare on LF.
const read = (file) =>
  readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const LOGO = read('app/components/BrandLogo.tsx');
const SHELL = read('app/components/ClaraShell.tsx');
const CSS = read('app/styles/app.css');

const section = (source, start) => {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `${start} is in the file`);
  const to = source.indexOf('\nfunction ', from + 1);
  return source.slice(from, to === -1 ? undefined : to);
};

const HEADER = section(SHELL, 'function ClaraHeader(');
const FOOTER = section(SHELL, 'function ClaraFooter(');
const DRAWER = section(SHELL, 'function ClaraMobileNav(');

/** Body of the first `selector {…}` rule after `from` (or anywhere). */
const ruleBody = (css, selector, from = 0) => {
  const at = css.indexOf(`${selector} {`, from);
  assert.ok(at >= 0, `${selector} has a rule`);
  return css.slice(at, css.indexOf('}', at));
};

test('BrandLogo draws the lockup inline from the vector data', () => {
  assert.match(LOGO, /export function BrandLogo\(/);
  assert.match(LOGO, /from '~\/content\/logo'/);
  assert.match(LOGO, /horizontal: LOGO_HORIZONTAL/);
  assert.match(LOGO, /stacked: LOGO_STACKED/);
  assert.match(LOGO, /LOGO_MARK\.rects\.map/);
  // The counters of A, R and D need evenodd; the text takes the link colour.
  assert.match(
    LOGO,
    /<path fill="currentColor" fillRule="evenodd" d=\{lockup\.textPath\} \/>/,
  );
  assert.match(
    LOGO,
    /rect\.fill === 'ink' \? 'currentColor' : LOGO_COLORS\[rect\.fill\]/,
  );
  assert.match(
    LOGO,
    /viewBox=\{`0 0 \$\{lockup\.width\} \$\{lockup\.height\}`\}/,
  );
  assert.match(LOGO, /'brand-logo', `brand-logo--\$\{variant\}`/);
  assert.match(LOGO, /aria-hidden="true"/);
  assert.match(LOGO, /focusable="false"/);
  // CSS sizes it: no width or height attributes on the svg itself.
  const svgTag = LOGO.slice(
    LOGO.indexOf('<svg'),
    LOGO.indexOf('>', LOGO.indexOf('<svg')),
  );
  assert.doesNotMatch(svgTag, /\b(width|height)=/);
});

test('the placed mark sits inside each lockup box, flush right', () => {
  for (const lockup of [LOGO_HORIZONTAL, LOGO_STACKED]) {
    const {x, y, scale} = lockup.mark;
    let right = 0;
    for (const r of LOGO_MARK.rects) {
      const left = Math.round(x + r.x * scale);
      const top = Math.round(y + r.y * scale);
      const w = Math.round(r.width * scale);
      const h = Math.round(r.height * scale);
      assert.ok(
        left >= 0 && left + w <= lockup.width,
        `${r.fill} x in ${lockup.width}`,
      );
      assert.ok(
        top >= 0 && top + h <= lockup.height,
        `${r.fill} y in ${lockup.height}`,
      );
      right = Math.max(right, left + w);
    }
    assert.equal(right, lockup.width);
  }
});

test('the header, drawer and footer links carry the logo, named for screen readers', () => {
  assert.equal(SHELL.match(/<BrandLogo /g)?.length, 3);
  assert.match(SHELL, /import \{BrandLogo\} from '\.\/BrandLogo';/);
  const link =
    /<Link\s+className="brand-mark"\s+to="\/"\s+aria-label="Clara Mendes home"[^>]*>\s*([\s\S]*?)\s*<\/Link>/;

  const header = HEADER.match(link);
  assert.ok(header, 'header brand link');
  assert.equal(header[1], '<BrandLogo variant="horizontal" />');

  const footer = FOOTER.match(link);
  assert.ok(footer, 'footer brand link');
  assert.equal(footer[1], '<BrandLogo variant="stacked" />');

  const drawer = DRAWER.match(link);
  assert.ok(drawer, 'drawer brand link');
  assert.match(drawer[0], /onClick=\{close\}/);
  assert.match(drawer[1], /<BrandLogo variant="stacked" \/>/);

  // The text wordmark is gone from all three links.
  for (const [name, part] of [
    ['header', header],
    ['footer', footer],
    ['drawer', drawer],
  ]) {
    assert.doesNotMatch(part[1], /Clara Mendes/, name);
  }
});

test('the closed drawer leaves the stacked logo out of the page HTML', () => {
  // Not drawn on the server or before the first open; kept once drawn so it
  // does not vanish while the drawer slides shut.
  assert.match(DRAWER, /const isOpen = type === 'mobile';/);
  assert.match(
    DRAWER,
    /const \[logoDrawn, setLogoDrawn\] = useState\(false\);/,
  );
  assert.match(
    DRAWER,
    /useEffect\(\(\) => \{\s*if \(isOpen\) setLogoDrawn\(true\);\s*\}, \[isOpen\]\);/,
  );
  assert.match(
    DRAWER,
    /\{isOpen \|\| logoDrawn \? <BrandLogo variant="stacked" \/> : null\}/,
  );
  assert.equal(DRAWER.match(/<BrandLogo /g)?.length, 1);
});

test('app.css sizes the logo per place and breakpoint, with no italic wordmark left', () => {
  const brandMark = ruleBody(CSS, '\n.brand-mark');
  assert.doesNotMatch(brandMark, /font-style: italic|font-family|font-size/);
  for (const match of CSS.matchAll(/\.brand-mark \{[^}]*\}/g)) {
    assert.doesNotMatch(match[0], /font-style: italic/);
  }
  assert.match(
    ruleBody(CSS, '\n.brand-logo'),
    /display: block;[\s\S]*width: auto;/,
  );

  assert.match(ruleBody(CSS, '\n.site-header .brand-logo'), /height: 36px;/);
  // The header drops to 68 px at 720 px and to 60 px at 480 px.
  for (const [query, height] of [
    ['@media (max-width: 720px) {\n  .site-header .brand-logo', '30px'],
    ['@media (max-width: 480px) {\n  .site-header .brand-logo', '26px'],
    ['@media (max-width: 340px) {\n  .site-header .brand-logo', '24px'],
  ]) {
    const at = CSS.indexOf(query);
    assert.ok(at >= 0, query);
    assert.match(
      CSS.slice(at, CSS.indexOf('}', at)),
      new RegExp(`height: ${height};`),
    );
  }
  assert.match(
    ruleBody(CSS, '.mobile-nav-header .brand-logo'),
    /height: 72px;/,
  );
  assert.match(ruleBody(CSS, '.footer-brand .brand-logo'), /height: 82px;/);
  assert.match(
    ruleBody(CSS, '.footer-brand .brand-mark'),
    /margin-bottom: \d+px;/,
  );
  // The footer's focus ring is paper, so it shows on the deep brown.
  assert.match(
    ruleBody(CSS, '.site-footer .brand-mark:focus-visible'),
    /outline-color: var\(--color-paper\);/,
  );
  // The phone touch targets stay.
  assert.match(
    CSS,
    /\.site-header \.brand-mark,\n {2}\.site-footer \.brand-mark \{[^}]*min-height: 44px;/,
  );
});

test('the homepage and Our Story hero headers carry the one-line logo too', () => {
  for (const [file, brandClass] of [
    ['app/routes/_index.tsx', 'hm-brand'],
    ['app/routes/our-story.tsx', 'os-brand'],
  ]) {
    const source = read(file);
    assert.match(source, /import \{BrandLogo\} from '~\/components\/BrandLogo';/, file);
    const link = source.match(
      new RegExp(
        String.raw`<Link[^>]*className="[a-z-]+ ${brandClass}"[^>]*aria-label="Clara Mendes home"[^>]*>\s*<BrandLogo variant="horizontal" \/>\s*<\/Link>`,
      ),
    );
    assert.ok(link, `${file}: the ${brandClass} link draws the logo`);
    assert.doesNotMatch(source, /Clara Mendes\s*<\/Link>/, `${file}: no text wordmark left`);
    for (const rule of source.matchAll(new RegExp(String.raw`\.${brandClass}[^{]*\{[^}]*\}`, 'g'))) {
      assert.doesNotMatch(rule[0], /font-style: italic|font-family|font-size/, `${file}: ${rule[0]}`);
    }
    assert.match(source, new RegExp(String.raw`\.${brandClass} \.brand-logo \{\s*height: 34px;`), file);
  }
});
