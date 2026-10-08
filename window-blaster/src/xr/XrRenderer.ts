/**
 * Raw WebGL2 drawing for the headset view: textured quads (camera image, effect layer, HUD)
 * and thin lines (controller rays). No three.js – the game itself still draws with Canvas 2D,
 * the 2D canvases are uploaded as textures every frame.
 */
import { multiply, type Mat4, type V3 } from './xrMath';

const QUAD_VS = `#version 300 es
in vec2 aPos;
uniform mat4 uMvp;
uniform vec4 uUv; // x0, y0, w, h in texture space
out vec2 vUv;
void main() {
  vec2 uv = vec2(aPos.x + 0.5, 0.5 - aPos.y);
  vUv = uUv.xy + uv * uUv.zw;
  gl_Position = uMvp * vec4(aPos, 0.0, 1.0);
}`;

const QUAD_FS = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uAlpha;
out vec4 outColor;
void main() {
  if (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) { outColor = vec4(0.0); return; }
  outColor = texture(uTex, vUv) * uAlpha;
}`;

const LINE_VS = `#version 300 es
in vec3 aPos;
uniform mat4 uVp;
void main() { gl_Position = uVp * vec4(aPos, 1.0); }`;

const LINE_FS = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 outColor;
void main() { outColor = uColor; }`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

export type TexSource = HTMLCanvasElement | HTMLVideoElement;

export class XrRenderer {
  private readonly quadProg: WebGLProgram;
  private readonly lineProg: WebGLProgram;
  private readonly quadVao: WebGLVertexArrayObject;
  private readonly lineVao: WebGLVertexArrayObject;
  private readonly lineBuf: WebGLBuffer;
  private readonly textures = new Map<string, WebGLTexture>();
  private readonly sizes = new Map<string, { w: number; h: number }>();
  private readonly u: Record<string, WebGLUniformLocation | null>;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.quadProg = compile(gl, QUAD_VS, QUAD_FS);
    this.lineProg = compile(gl, LINE_VS, LINE_FS);
    this.u = {
      mvp: gl.getUniformLocation(this.quadProg, 'uMvp'),
      uv: gl.getUniformLocation(this.quadProg, 'uUv'),
      tex: gl.getUniformLocation(this.quadProg, 'uTex'),
      alpha: gl.getUniformLocation(this.quadProg, 'uAlpha'),
      vp: gl.getUniformLocation(this.lineProg, 'uVp'),
      color: gl.getUniformLocation(this.lineProg, 'uColor'),
    };
    this.quadVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.quadVao);
    const qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    const qa = gl.getAttribLocation(this.quadProg, 'aPos');
    gl.enableVertexAttribArray(qa);
    gl.vertexAttribPointer(qa, 2, gl.FLOAT, false, 0, 0);
    this.lineVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.lineVao);
    this.lineBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(6), gl.DYNAMIC_DRAW);
    const la = gl.getAttribLocation(this.lineProg, 'aPos');
    gl.enableVertexAttribArray(la);
    gl.vertexAttribPointer(la, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /** Uploads a 2D canvas / video frame into the named texture (premultiplied alpha). */
  upload(name: string, src: TexSource): boolean {
    const gl = this.gl;
    const w = src instanceof HTMLVideoElement ? src.videoWidth : src.width;
    const h = src instanceof HTMLVideoElement ? src.videoHeight : src.height;
    if (!w || !h) return false;
    let tex = this.textures.get(name);
    if (!tex) {
      tex = gl.createTexture()!;
      this.textures.set(name, tex);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    try {
      // same size as last frame: update in place instead of reallocating the texture every frame
      const size = this.sizes.get(name);
      if (size && size.w === w && size.h === h) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
      else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        this.sizes.set(name, { w, h });
      }
    } catch {
      return false;
    }
    return true;
  }

  beginView(viewport: { x: number; y: number; width: number; height: number }, clear: [number, number, number, number] | null): void {
    const gl = this.gl;
    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (clear) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height);
      gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  /** Draws the unit quad transformed by `model`, showing `uvRect` of the texture. */
  quad(viewProj: Mat4, model: Mat4, tex: string, alpha = 1, uvRect: [number, number, number, number] = [0, 0, 1, 1]): void {
    const t = this.textures.get(tex);
    if (!t) return;
    const gl = this.gl;
    gl.useProgram(this.quadProg);
    gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.uniform1i(this.u.tex, 0);
    gl.uniform1f(this.u.alpha, alpha);
    gl.uniform4f(this.u.uv, uvRect[0], uvRect[1], uvRect[2], uvRect[3]);
    gl.uniformMatrix4fv(this.u.mvp, false, multiply(viewProj, model));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  line(viewProj: Mat4, a: V3, b: V3, color: [number, number, number, number]): void {
    const gl = this.gl;
    gl.useProgram(this.lineProg);
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]));
    gl.uniformMatrix4fv(this.u.vp, false, viewProj);
    gl.uniform4f(this.u.color, color[0] * color[3], color[1] * color[3], color[2] * color[3], color[3]);
    gl.drawArrays(gl.LINES, 0, 2);
  }

  dispose(): void {
    const gl = this.gl;
    for (const t of this.textures.values()) gl.deleteTexture(t);
    this.textures.clear();
    this.sizes.clear();
    gl.deleteProgram(this.quadProg);
    gl.deleteProgram(this.lineProg);
  }
}
