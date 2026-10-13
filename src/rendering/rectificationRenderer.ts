import {
  createWarpRenderer,
  matrixToUniform,
  vertexShader,
} from "./warpRenderer";
import {
  createSnapshot,
  type RectificationSnapshot,
} from "../math/rectification";

const fragment = `precision highp float;
uniform sampler2D perspective;
uniform mat3 forwardH;
uniform float size;
uniform bool rectify;
void main(){
  vec2 uv=vec2(mod(gl_FragCoord.x,size)/size,1.0-gl_FragCoord.y/size);
  if(rectify){
    vec3 p=vec3(400.0*uv,1.0);
    // Backward sampling of I_perspective uses FORWARD H, not H inverse.
    vec3 q=forwardH*p;
    float scale=abs(forwardH[0][2]*p.x)+abs(forwardH[1][2]*p.y)+abs(forwardH[2][2]);
    if(abs(q.z)<=max(1.0e-30,1.0e-6*scale)) discard;
    uv=(q.xy/q.z+vec2(42.0,40.0))/484.0;
  }
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0)))) discard;
  // copyTexImage2D stores bottom-up framebuffer rows, unlike SVG uploads.
  gl_FragColor=texture2D(perspective,vec2(uv.x,1.0-uv.y));
}`;

export function createRectificationRenderer(canvas: HTMLCanvasElement) {
  const base = createWarpRenderer(canvas),
    { gl } = base.resources;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null,
    texture: WebGLTexture | null = null;
  let snapshot: RectificationSnapshot | null = null,
    disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (texture && gl.isTexture(texture)) gl.deleteTexture(texture);
    if (program && gl.isProgram(program)) gl.deleteProgram(program);
    shaders.forEach((s) => {
      if (gl.isShader(s)) gl.deleteShader(s);
    });
    base.dispose();
  }
  try {
    const compile = (type: number, code: string) => {
      const s = gl.createShader(type);
      if (!s) throw new Error("Shader allocation failed.");
      shaders.push(s);
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) || "Shader compilation failed.");
      return s;
    };
    program = gl.createProgram();
    if (!program) throw new Error("Program allocation failed.");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        gl.getProgramInfoLog(program) || "Program linking failed.",
      );
    texture = gl.createTexture();
    if (!texture) throw new Error("Perspective texture allocation failed.");
    function check() {
      if (gl.getError() !== gl.NO_ERROR)
        throw new Error("Rectification GPU operation failed.");
    }
    function drawComparison() {
      if (disposed || !snapshot || gl.isContextLost())
        throw new Error("Rectification image is unavailable.");
      const n = snapshot.size;
      canvas.width = 2 * n;
      canvas.height = n;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, base.resources.buffer);
      const position = gl.getAttribLocation(program!, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(program!, "perspective"), 0);
      gl.uniform1f(gl.getUniformLocation(program!, "size"), n);
      gl.uniformMatrix3fv(
        gl.getUniformLocation(program!, "forwardH"),
        false,
        matrixToUniform(snapshot.H),
      );
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (let i = 0; i < 2; i++) {
        gl.viewport(i * n, 0, n, n);
        gl.uniform1i(gl.getUniformLocation(program!, "rectify"), i);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      check();
    }
    return {
      prepare(image: HTMLCanvasElement, captured: RectificationSnapshot) {
        if (disposed || gl.isContextLost())
          throw new Error("WebGL context is unavailable.");
        if (
          captured.size * 2 > gl.getParameter(gl.MAX_TEXTURE_SIZE) ||
          captured.size * 2 > gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]
        )
          throw new Error("Requested image exceeds GPU limits.");
        captured = createSnapshot(captured.H, captured.grid, captured.size);
        snapshot = captured;
        gl.useProgram(base.resources.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, base.resources.buffer);
        const position = gl.getAttribLocation(
          base.resources.program!,
          "position",
        );
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, base.resources.texture);
        base.setTexture(image);
        base.draw(captured.inverse, captured.size, captured.size);
        // Capture the first pass on GPU. Only THIS perspective image feeds pass two.
        // No readPixels, original SVG substitution or CPU reconstruction occurs.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.copyTexImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          0,
          0,
          captured.size,
          captured.size,
          0,
        );
        check();
        drawComparison();
      },
      drawComparison,
      dispose,
      resources: { gl, texture, program, shaders, base: base.resources },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
