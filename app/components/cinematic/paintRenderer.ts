import {buildPaintFragmentShader, PAINT_VERTEX_SHADER} from './paintedShader.ts';

/** Linear-light RGB, the space the palette lerps and the shader run in. */
export type LinearColor = [number, number, number];

export type PaintUniforms = {
  time: number;
  /** CSS pixels, not device pixels. */
  resolution: [number, number];
  pointer: [number, number];
  scrollVel: number;
  colors: [LinearColor, LinearColor, LinearColor];
};

export type PaintRenderer = {
  setSize: (width: number, height: number) => void;
  /** 'pending' while the shader links (or the context is lost). */
  render: (uniforms: PaintUniforms) => 'drawn' | 'pending' | 'failed';
  destroy: () => void;
};

/**
 * Hex sRGB → linear RGB. The background was first drawn with Three.js,
 * which converts hex colors to linear and then writes the shader output
 * to the canvas unconverted; doing the same here keeps every palette
 * exactly as it looked.
 */
export function hexToLinear(hex: string): LinearColor {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const channel = (byte: number) => {
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [
    channel((value >> 16) & 255),
    channel((value >> 8) & 255),
    channel(value & 255),
  ];
}

const UNIFORM_NAMES = [
  'uTime',
  'uResolution',
  'uPointer',
  'uScrollVel',
  'uColorA',
  'uColorB',
  'uColorC',
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];

/**
 * A plain WebGL 1 renderer for the painted background: one shader program
 * drawing one full-screen quad. Replaces Three.js (~180 kB gzip) for a
 * scene that never needed more. Returns null when WebGL is unavailable;
 * render() reports 'failed' if the shader does not link. Either way the
 * caller keeps the CSS paper fallback.
 */
export function createPaintRenderer(
  canvas: HTMLCanvasElement,
  {octaves, pixelRatio}: {octaves: 3 | 4; pixelRatio: number},
): PaintRenderer | null {
  const options: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  };
  const context = canvas.getContext('webgl', options);
  if (!context) return null;
  const gl: WebGLRenderingContext = context;

  // Phones without highp in fragment shaders fall back the way Three.js did.
  const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const fragmentSource = buildPaintFragmentShader(octaves).replace(
    'precision highp float;',
    highp && highp.precision > 0
      ? 'precision highp float;'
      : 'precision mediump float;',
  );

  // Asking for LINK_STATUS straight after linkProgram blocks the main thread
  // until the GPU process has compiled the shader (~80 ms on a cold start).
  // Where the browser supports it, poll for completion on later frames.
  const parallelCompile = gl.getExtension('KHR_parallel_shader_compile') as {
    COMPLETION_STATUS_KHR: number;
  } | null;

  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let locations: Record<UniformName, WebGLUniformLocation | null> | null =
    null;
  let state: 'linking' | 'ready' | 'failed' = 'linking';
  let lost = false;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  const startLink = () => {
    state = 'linking';
    const vertex = compile(gl.VERTEX_SHADER, PAINT_VERTEX_SHADER);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const next = gl.createProgram();
    if (!vertex || !fragment || !next) {
      state = 'failed';
      return;
    }
    gl.attachShader(next, vertex);
    gl.attachShader(next, fragment);
    gl.bindAttribLocation(next, 0, 'aPosition');
    gl.linkProgram(next);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    program = next;
    if (!parallelCompile) finishLink();
  };

  const finishLink = () => {
    if (!program) return;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (!gl.isContextLost()) {
        console.warn(
          'Painted background shader:',
          gl.getProgramInfoLog(program),
        );
      }
      gl.deleteProgram(program);
      program = null;
      state = 'failed';
      return;
    }
    gl.useProgram(program);

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const found = {} as Record<UniformName, WebGLUniformLocation | null>;
    for (const name of UNIFORM_NAMES) {
      found[name] = gl.getUniformLocation(program, name);
    }
    locations = found;
    state = 'ready';
  };

  startLink();

  let cssWidth = 0;
  let cssHeight = 0;
  const setSize = (width: number, height: number) => {
    cssWidth = width;
    cssHeight = height;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  // The browser may drop the GPU context (driver reset, memory pressure);
  // keep the canvas and rebuild when it comes back.
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
    locations = null;
    startLink();
    setSize(cssWidth, cssHeight);
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    setSize,
    render: ({time, resolution, pointer, scrollVel, colors}) => {
      if (lost) return 'pending';
      if (
        state === 'linking' &&
        program &&
        parallelCompile &&
        gl.getProgramParameter(program, parallelCompile.COMPLETION_STATUS_KHR)
      ) {
        finishLink();
      }
      if (state !== 'ready' || !locations) return state === 'failed' ? 'failed' : 'pending';
      gl.uniform1f(locations.uTime, time);
      gl.uniform2f(locations.uResolution, resolution[0], resolution[1]);
      gl.uniform2f(locations.uPointer, pointer[0], pointer[1]);
      gl.uniform1f(locations.uScrollVel, scrollVel);
      gl.uniform3fv(locations.uColorA, colors[0]);
      gl.uniform3fv(locations.uColorB, colors[1]);
      gl.uniform3fv(locations.uColorC, colors[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return 'drawn';
    },
    destroy: () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (!gl.isContextLost()) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      }
      locations = null;
    },
  };
}
