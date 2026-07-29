/**
 * Painted-texture background shader and the brand-derived chapter palettes.
 *
 * The fragment shader is a domain-warped fbm: one noise field distorts the
 * sample coordinates of another, which reads as slow marbled brushstrokes.
 * The pointer displaces the warp origin so the paint swirls toward the
 * cursor; scroll velocity adds a directional flow.
 */

export type PaletteName = 'umber' | 'linen' | 'clay' | 'ink';

/** Three paint colors per palette: base, deep, highlight. */
export const PALETTES: Record<PaletteName, [string, string, string]> = {
  umber: ['#6b655b', '#4a443c', '#8d8475'],
  linen: ['#f4f0e6', '#e3dccb', '#d3c7af'],
  clay: ['#a87966', '#8a5f4e', '#d9c2b2'],
  ink: ['#2c2823', '#1d1b17', '#544c41'],
};

export const DEFAULT_PALETTE: PaletteName = 'linen';

export function isPaletteName(value: unknown): value is PaletteName {
  return typeof value === 'string' && value in PALETTES;
}

export const PAINT_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

/**
 * GLSL loop bounds must be compile-time constants, so octave count is baked
 * in per device tier: 4 on fine pointers, 3 on coarse pointers where the
 * shader runs on a phone GPU (5 fbm calls per pixel makes each octave ~25%
 * of the whole background's cost).
 */
export function buildPaintFragmentShader(octaves: 3 | 4) {
  return /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uScrollVel;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int i = 0; i < ${octaves}; i++) {
      value += amplitude * noise(p);
      p = p * 2.04 + vec2(13.7, 7.1);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2(vUv.x * aspect, vUv.y);

    vec2 pointer = vec2(uPointer.x * aspect, uPointer.y);
    vec2 toPointer = pointer - p;
    float pointerField = exp(-dot(toPointer, toPointer) * 2.4);

    float t = uTime * 0.045;

    vec2 q = vec2(
      fbm(p * 1.6 + vec2(0.0, t)),
      fbm(p * 1.6 + vec2(5.2, t * 1.27))
    );

    vec2 warp = q * 1.9
      + toPointer * pointerField * 0.85
      + vec2(uScrollVel * 0.45, -uScrollVel * 0.3);

    vec2 r = vec2(
      fbm(p * 1.8 + warp + vec2(1.7, 9.2)),
      fbm(p * 1.8 + warp + vec2(8.3, 2.8))
    );

    float f = fbm(p * 1.7 + r * 1.55);

    vec3 col = mix(uColorA, uColorB, smoothstep(0.16, 0.74, f));
    col = mix(
      col,
      uColorC,
      smoothstep(0.42, 0.96, length(q) * 0.72 + pointerField * 0.22)
    );

    float vig = smoothstep(1.3, 0.42, distance(vUv, vec2(0.5, 0.45)));
    col *= mix(0.93, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;
}
