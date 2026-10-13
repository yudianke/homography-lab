import type { Matrix3x3 } from "../math/homography";
export const MAP_VIEW = { x: -42, y: -40, width: 484, height: 484 } as const;
/** WebGL accepts column-major matrices, transpose must be false. */
export function matrixToUniform(H: Matrix3x3): Float32Array {
  return new Float32Array([
    H[0][0],
    H[1][0],
    H[2][0],
    H[0][1],
    H[1][1],
    H[2][1],
    H[0][2],
    H[1][2],
    H[2][2],
  ]);
}
export const vertexShader = `
attribute vec2 position;
void main() { gl_Position = vec4(position,0.0,1.0); }
`;
export const fragmentShader = `
precision highp float;
uniform mat3 inverseH;
uniform vec2 resolution;
uniform sampler2D artwork;
void main() {
  // Framebuffer origin is bottom-left; our map/SVG origin is top-left.
  vec2 screenUV = gl_FragCoord.xy / resolution;
  vec3 q = vec3(-42.0 + 484.0 * screenUV.x, -40.0 + 484.0 * (1.0-screenUV.y), 1.0);
  vec3 p = inverseH * q;
  float wScale = abs(inverseH[0][2]*q.x) + abs(inverseH[1][2]*q.y) + abs(inverseH[2][2]);
  if (abs(p.z) <= max(1.0e-30, 1.0e-6*wScale)) discard;
  vec2 source = p.xy / p.z;
  if (source.x < 0.0 || source.y < 0.0 || source.x > 400.0 || source.y > 400.0) discard;
  // Canvas upload is unflipped: v=0 samples the SVG's top row.
  gl_FragColor = texture2D(artwork, source / 400.0);
}
`;
export function createWarpRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!gl)
    throw new Error(
      "WebGL is unavailable in this browser. Please enable hardware acceleration or try a recent version of Chrome, Edge, Firefox, or Safari. Geometry lessons and the comic remain available.",
    );
  if (
    !gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision
  )
    throw new Error(
      "High-precision fragment shaders are unavailable on this device.",
    );
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null,
    buffer: WebGLBuffer | null = null,
    texture: WebGLTexture | null = null;
  let disposed = false,
    hasTexture = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    gl!.useProgram(null);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, null);
    gl!.bindTexture(gl!.TEXTURE_2D, null);
    if (texture && gl!.isTexture(texture)) gl!.deleteTexture(texture);
    if (buffer && gl!.isBuffer(buffer)) gl!.deleteBuffer(buffer);
    if (program && gl!.isProgram(program)) gl!.deleteProgram(program);
    shaders.forEach((s) => {
      if (gl!.isShader(s)) gl!.deleteShader(s);
    });
  }
  function check() {
    const error = gl!.getError();
    if (error !== gl!.NO_ERROR)
      throw new Error(`WebGL rendering failed (code ${error}).`);
  }
  try {
    function compile(type: number, source: string) {
      const shader = gl!.createShader(type);
      if (!shader) throw new Error("Unable to allocate shader.");
      shaders.push(shader);
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS))
        throw new Error(
          gl!.getShaderInfoLog(shader) || "Shader compilation failed.",
        );
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER, vertexShader),
      fragment = compile(gl.FRAGMENT_SHADER, fragmentShader);
    program = gl.createProgram();
    if (!program) throw new Error("Unable to allocate shader program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        gl.getProgramInfoLog(program) || "Shader linking failed.",
      );
    buffer = gl.createBuffer();
    texture = gl.createTexture();
    if (!buffer || !texture)
      throw new Error("Unable to allocate GPU resources.");
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "artwork"), 0);
    const inverseLocation = gl.getUniformLocation(program, "inverseH"),
      resolution = gl.getUniformLocation(program, "resolution");
    check();
    return {
      setTexture(image: HTMLCanvasElement) {
        if (disposed) return;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        check();
        hasTexture = true;
      },
      draw(inverse: Matrix3x3 | null, width: number, height: number) {
        if (disposed || gl.isContextLost()) return;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (inverse && hasTexture) {
          gl.useProgram(program);
          gl.uniform2f(resolution, width, height);
          gl.uniformMatrix3fv(inverseLocation, false, matrixToUniform(inverse));
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        check();
      },
      dispose,
      // Read-only resource handles allow the browser regression harness to verify disposal.
      resources: { gl, program, buffer, texture, shaders },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
export type WarpRenderer = ReturnType<typeof createWarpRenderer>;
