// LiveFX – Whisper worker (offline speech recognition, experimental). Runs transformers.js from
// /vendor/transformers.min.js with an ONNX model from /models/<repo>/ (both placed there by
// `npm run setup-offline`). Protocol with js/asr.js (backend `whisper`):
//
//   in : { type:'load', model, modelBase='/models/', vendorUrl='/vendor/transformers.min.js', device? }
//        { type:'transcribe', audio: Float32Array (16 kHz mono), lang: 'de'|'tr'|'en' }
//   out: { type:'progress', pct, file }   while model files load
//        { type:'ready' }
//        { type:'result', text }          one per transcribe message (text may be '')
//        { type:'error', message }        fatal – the backend terminates the worker
'use strict';

let asr = null; // the loaded pipeline
let queue = Promise.resolve(); // transcribe calls run strictly one after another
const progress = Object.create(null); // file -> 0..100

function post(msg) {
  self.postMessage(msg);
}

function fail(e) {
  post({ type: 'error', message: e && e.message ? e.message : String(e) });
}

function onProgress(p) {
  if (!p || !p.file) return;
  if (p.status === 'progress') progress[p.file] = Math.max(0, Math.min(100, Number(p.progress) || 0));
  else if (p.status === 'done' || p.status === 'ready') progress[p.file] = 100;
  else if (p.status === 'initiate' || p.status === 'download') progress[p.file] = progress[p.file] || 0;
  else return;
  const files = Object.keys(progress);
  const pct = Math.round(files.reduce((s, f) => s + progress[f], 0) / files.length);
  post({ type: 'progress', pct, file: p.file });
}

function vendorDir(url) {
  const i = String(url).lastIndexOf('/');
  return i >= 0 ? url.slice(0, i + 1) : '/vendor/';
}

async function load(m) {
  try {
    const vendorUrl = m.vendorUrl || '/vendor/transformers.min.js';
    const mod = await import(vendorUrl);
    const { env, pipeline } = mod;
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = m.modelBase || '/models/';
    // The ONNX runtime .wasm/.mjs files are vendored next to the library (no CDN).
    if (env.backends && env.backends.onnx && env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = vendorDir(vendorUrl);
    const device = m.device || (typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm');
    asr = await pipeline('automatic-speech-recognition', m.model, { dtype: 'q8', device, progress_callback: onProgress });
    post({ type: 'ready' });
  } catch (e) {
    fail(e);
  }
}

async function transcribe(m) {
  if (!asr) return post({ type: 'result', text: '' });
  try {
    const audio = m.audio instanceof Float32Array ? m.audio : Float32Array.from(m.audio || []);
    const out = await asr(audio, { language: m.lang || 'de', task: 'transcribe', chunk_length_s: 30 });
    const text = out && typeof out.text === 'string' ? out.text : Array.isArray(out) && out[0] && out[0].text ? out[0].text : '';
    post({ type: 'result', text });
  } catch (e) {
    fail(e);
  }
}

self.onmessage = (ev) => {
  const m = ev && ev.data ? ev.data : {};
  if (m.type === 'load') {
    load(m);
  } else if (m.type === 'transcribe') {
    queue = queue.then(() => transcribe(m)).catch(fail);
  }
};
