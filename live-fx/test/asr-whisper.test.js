// node --test test/asr-whisper.test.js
// Unit tests for the offline `whisper` backend in js/asr.js, the js/whisper-worker.js protocol and the
// URL/file-list helpers of scripts/setup-offline.js. Node has no Worker/getUserMedia/AudioContext: the
// backend takes `workerFactory` + `mediaFactory`, and a fake `globalThis.AudioContext` hands out a
// ScriptProcessor node whose `onaudioprocess` the test drives with synthetic 48 kHz frames.
// Network is never touched (the setup script is only required, never run).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('../js/asr.js');
const { LiveFXASR } = globalThis;

// ---------------------------------------------------------------- fakes

class FakeWorker {
  constructor() {
    this.messages = []; // everything the backend posted
    this.transfers = [];
    this.terminated = 0;
    this.onmessage = null;
    this.onerror = null;
  }
  postMessage(m, transfer) {
    this.messages.push(m);
    this.transfers.push(transfer || null);
  }
  terminate() {
    this.terminated++;
  }
  /** Simulates a message from the worker. */
  emit(data) {
    if (typeof this.onmessage === 'function') this.onmessage({ data });
  }
  ofType(type) {
    return this.messages.filter((m) => m.type === type);
  }
}

class FakeTrack {
  constructor() {
    this.stopped = 0;
  }
  stop() {
    this.stopped++;
  }
}

class FakeStream {
  constructor() {
    this.tracks = [new FakeTrack()];
  }
  getTracks() {
    return this.tracks;
  }
}

class FakeNode {
  constructor(size) {
    this.bufferSize = size;
    this.onaudioprocess = null;
    this.connected = [];
    this.disconnected = 0;
  }
  connect(x) {
    this.connected.push(x);
  }
  disconnect() {
    this.disconnected++;
  }
  /** Feeds one frame of PCM as if the browser rendered it. */
  feed(frame) {
    if (typeof this.onaudioprocess === 'function') this.onaudioprocess({ inputBuffer: { getChannelData: () => frame } });
  }
}

class FakeAudioContext {
  constructor() {
    FakeAudioContext.instances.push(this);
    this.sampleRate = 48000;
    this.state = 'running';
    this.destination = { kind: 'destination' };
    this.closed = 0;
    this.node = null;
  }
  createMediaStreamSource() {
    return { connect() {}, disconnect() {} };
  }
  createScriptProcessor(size) {
    this.node = new FakeNode(size);
    return this.node;
  }
  close() {
    this.closed++;
    this.state = 'closed';
    return Promise.resolve();
  }
}
FakeAudioContext.instances = [];

const RATE = 48000;
const FRAME = 4096;

/** A frame of `FRAME` samples: constant-ish tone at `amp` (0 = silence). */
function frame(amp) {
  const f = new Float32Array(FRAME);
  if (amp) for (let i = 0; i < FRAME; i++) f[i] = amp * Math.sin(i / 3);
  return f;
}

/** Feeds `seconds` of audio at `amp` in 4096-sample frames (rounded up to whole frames). */
function feedSeconds(node, amp, seconds) {
  const frames = Math.ceil((seconds * RATE) / FRAME);
  for (let i = 0; i < frames; i++) node.feed(frame(amp));
  return frames;
}

function setup(t, opts = {}) {
  FakeAudioContext.instances = [];
  const worker = new FakeWorker();
  const stream = new FakeStream();
  const origAC = globalThis.AudioContext;
  const origNow = performance.now;
  globalThis.AudioContext = FakeAudioContext;
  performance.now = () => 4242;
  const calls = [];
  const states = [];
  const errors = [];
  const events = [];
  const asr = LiveFXASR.create('whisper', {
    lang: 'de-DE',
    workerFactory: () => worker,
    mediaFactory: () => Promise.resolve(stream),
    onText: (text, isFinal, meta) => calls.push({ text, isFinal, meta }),
    onState: (s) => states.push(s),
    onError: (e) => errors.push(e),
    onEvent: (e) => events.push(e),
    ...opts,
  });
  t.after(() => {
    asr.stop();
    if (origAC === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = origAC;
    performance.now = origNow;
  });
  return { asr, worker, stream, calls, states, errors, events };
}

/** start() + wait for the mic + `ready` from the worker -> state 'listening'; returns the audio node. */
async function startListening(asr, worker) {
  await asr.start();
  worker.emit({ type: 'ready' });
  const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
  return ctx.node;
}

// ---------------------------------------------------------------- registry

test('whisper: backend registry and support probe', async (t) => {
  await t.test('listed with the German label; unsupported outside http(s) (no probe possible)', async () => {
    const b = LiveFXASR.backends.find((x) => x.name === 'whisper');
    assert.ok(b, 'whisper is listed');
    assert.equal(b.label, 'Offline (Whisper, experimentell)');
    assert.equal(b.supported, false);
    assert.equal(typeof LiveFXASR.probeWhisper, 'function');
    assert.equal(await LiveFXASR.probeWhisper(), false, 'no location/fetch -> false');
    assert.equal(LiveFXASR.WHISPER_DEFAULT_MODEL, 'onnx-community/whisper-tiny');
  });

  await t.test('create without Worker and without workerFactory -> unsupported; start() reports it', () => {
    assert.equal(typeof globalThis.Worker, 'undefined', 'Node has no Worker global');
    const errors = [];
    const states = [];
    const asr = LiveFXASR.create('whisper', { onError: (e) => errors.push(e), onState: (s) => states.push(s) });
    assert.equal(asr.name, 'whisper');
    assert.equal(asr.state, 'unsupported');
    asr.start();
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'unsupported');
    assert.equal(errors[0].fatal, true);
    asr.stop();
    assert.equal(asr.state, 'unsupported');
  });
});

// ---------------------------------------------------------------- lifecycle

test('whisper: start -> load -> progress -> ready', async (t) => {
  await t.test('start() spawns the worker with a load message and opens the mic', async (t) => {
    const { asr, worker, states, events } = setup(t);
    assert.equal(asr.state, 'idle');
    await asr.start();
    assert.equal(worker.messages.length, 1);
    assert.deepEqual(worker.messages[0], {
      type: 'load',
      model: 'onnx-community/whisper-tiny',
      modelBase: '/models/',
      vendorUrl: '/vendor/transformers.min.js',
    });
    assert.equal(FakeAudioContext.instances.length, 1);
    const ctx = FakeAudioContext.instances[0];
    assert.equal(ctx.node.bufferSize, 4096);
    assert.deepEqual(ctx.node.connected, [ctx.destination], 'ScriptProcessor is connected to the destination');
    assert.deepEqual(states, ['starting']);

    worker.emit({ type: 'progress', pct: 12.4, file: 'onnx/encoder_model_quantized.onnx' });
    worker.emit({ type: 'progress', pct: 80 });
    assert.equal(asr.state, 'starting');
    const prog = events.filter((e) => e.type === 'progress');
    assert.equal(prog.length, 2);
    assert.equal(prog[0].pct, 12);
    assert.equal(prog[0].file, 'onnx/encoder_model_quantized.onnx');
    assert.equal(prog[1].pct, 80);
    assert.equal(typeof prog[1].at, 'number');

    worker.emit({ type: 'ready' });
    assert.equal(asr.state, 'listening');
    assert.deepEqual(states, ['starting', 'listening']);
    assert.equal(typeof asr.stats.chunks, 'number');
    assert.equal(asr.stats.chunks, 0);
  });

  await t.test('custom model + device reach the load message; setOptions is a no-op', async (t) => {
    const { asr, worker } = setup(t, { model: 'onnx-community/whisper-base', device: 'wasm' });
    await asr.start();
    assert.equal(worker.messages[0].model, 'onnx-community/whisper-base');
    assert.equal(worker.messages[0].device, 'wasm');
    assert.doesNotThrow(() => asr.setOptions({ alternatives: true }));
    assert.deepEqual(asr.options, { model: 'onnx-community/whisper-base' });
  });

  await t.test('mic failure -> fatal error, worker terminated, state error', async (t) => {
    const { asr, worker, errors } = setup(t, { mediaFactory: () => Promise.reject(new Error('NotAllowedError: Permission denied')) });
    await asr.start();
    assert.equal(asr.state, 'error');
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'whisper');
    assert.equal(errors[0].fatal, true);
    assert.match(errors[0].message, /Mikrofon/);
    assert.equal(worker.terminated, 1);
  });
});

// ---------------------------------------------------------------- VAD chunking

test('whisper: energy VAD chunking', async (t) => {
  await t.test('silence, 1 s speech, 0.8 s silence -> exactly one transcribe chunk (16 kHz, ~1.0-1.7 s, lang de)', async (t) => {
    const { asr, worker, events } = setup(t);
    const node = await startListening(asr, worker);
    feedSeconds(node, 0, 1.0);
    assert.equal(worker.ofType('transcribe').length, 0, 'silence alone sends nothing');
    feedSeconds(node, 0.05, 1.0);
    assert.equal(worker.ofType('transcribe').length, 0, 'still speaking (hangover not over)');
    feedSeconds(node, 0, 0.8);
    const tr = worker.ofType('transcribe');
    assert.equal(tr.length, 1, 'exactly one chunk');
    assert.ok(tr[0].audio instanceof Float32Array);
    const seconds = tr[0].audio.length / 16000;
    assert.ok(seconds >= 1.0 && seconds <= 1.7, `chunk length ${seconds}s`);
    assert.equal(tr[0].lang, 'de');
    assert.deepEqual(worker.transfers[worker.messages.indexOf(tr[0])], [tr[0].audio.buffer], 'buffer is transferred');
    assert.equal(asr.stats.chunks, 1);
    const chunk = events.find((e) => e.type === 'chunk');
    assert.ok(chunk && Math.abs(chunk.seconds - seconds) < 1e-6);
    // a further 2 s of silence sends nothing more
    feedSeconds(node, 0, 2);
    assert.equal(worker.ofType('transcribe').length, 1);
  });

  await t.test('7 s of continuous speech -> first chunk cut at exactly 6 s', async (t) => {
    const { asr, worker } = setup(t);
    const node = await startListening(asr, worker);
    feedSeconds(node, 0.05, 7.0);
    const tr = worker.ofType('transcribe');
    assert.equal(tr.length, 1, 'one chunk while still speaking');
    assert.equal(tr[0].audio.length, 6 * 16000);
    feedSeconds(node, 0, 0.8);
    const all = worker.ofType('transcribe');
    assert.equal(all.length, 2, 'the remainder follows after the silence');
    const rest = all[1].audio.length / 16000;
    assert.ok(rest >= 1.0 && rest <= 1.8, `remainder ${rest}s`);
  });

  await t.test('chunks shorter than 0.4 s are dropped (a click)', async (t) => {
    const { asr, worker } = setup(t);
    const node = await startListening(asr, worker);
    node.feed(frame(0.05)); // ~85 ms
    feedSeconds(node, 0, 0.8);
    assert.equal(worker.ofType('transcribe').length, 0);
    assert.equal(asr.stats.chunks, 0);
  });

  await t.test('audio before `ready` is ignored', async (t) => {
    const { asr, worker } = setup(t);
    await asr.start();
    const node = FakeAudioContext.instances[0].node;
    feedSeconds(node, 0.05, 1);
    feedSeconds(node, 0, 0.8);
    assert.equal(worker.ofType('transcribe').length, 0);
    worker.emit({ type: 'ready' });
    feedSeconds(node, 0.05, 1);
    feedSeconds(node, 0, 0.8);
    assert.equal(worker.ofType('transcribe').length, 1);
  });

  await t.test('setLang("tr-TR") -> the next chunk carries lang "tr"', async (t) => {
    const { asr, worker } = setup(t);
    const node = await startListening(asr, worker);
    asr.setLang('tr-TR');
    assert.equal(asr.lang, 'tr-TR');
    feedSeconds(node, 0.05, 1);
    feedSeconds(node, 0, 0.8);
    const tr = worker.ofType('transcribe');
    assert.equal(tr.length, 1);
    assert.equal(tr[0].lang, 'tr');
  });

  await t.test('too many chunks in flight -> new chunks are dropped with an event', async (t) => {
    const { asr, worker, events } = setup(t);
    const node = await startListening(asr, worker);
    for (let i = 0; i < 5; i++) {
      feedSeconds(node, 0.05, 1);
      feedSeconds(node, 0, 0.8);
    }
    assert.equal(worker.ofType('transcribe').length, 3);
    assert.equal(events.filter((e) => e.type === 'dropped').length, 2);
    worker.emit({ type: 'result', text: 'x' });
    feedSeconds(node, 0.05, 1);
    feedSeconds(node, 0, 0.8);
    assert.equal(worker.ofType('transcribe').length, 4, 'a result frees a slot');
  });
});

// ---------------------------------------------------------------- results, errors, stop

test('whisper: worker results and errors', async (t) => {
  await t.test('result -> onText(text, true, {source:"Whisper", lang, at})', async (t) => {
    const { asr, worker, calls, events } = setup(t);
    await startListening(asr, worker);
    worker.emit({ type: 'result', text: '  hallo   welt \n' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, 'hallo welt');
    assert.equal(calls[0].isFinal, true);
    assert.deepEqual(calls[0].meta, { source: 'Whisper', lang: 'de-DE', at: 4242 });
    assert.equal(asr.stats.results, 1);
    assert.equal(asr.stats.finals, 1);
    assert.equal(asr.stats.lastFinalAt, 4242);
    const fin = events.find((e) => e.type === 'final');
    assert.ok(fin && fin.text === 'hallo welt' && fin.isFinal === true);
  });

  await t.test('empty / whitespace results are ignored', async (t) => {
    const { asr, worker, calls } = setup(t);
    await startListening(asr, worker);
    worker.emit({ type: 'result', text: '' });
    worker.emit({ type: 'result', text: '   ' });
    worker.emit({ type: 'result' });
    assert.equal(calls.length, 0);
    assert.equal(asr.stats.results, 0);
  });

  await t.test('error -> onError({code:"whisper", fatal:true}) + state error + cleanup', async (t) => {
    const { asr, worker, stream, errors, states } = setup(t);
    await startListening(asr, worker);
    worker.emit({ type: 'error', message: 'Modell nicht gefunden' });
    assert.equal(asr.state, 'error');
    assert.deepEqual(errors, [{ code: 'whisper', message: 'Modell nicht gefunden', fatal: true }]);
    assert.deepEqual(states, ['starting', 'listening', 'error']);
    assert.equal(worker.terminated, 1);
    assert.equal(stream.tracks[0].stopped, 1);
    assert.equal(FakeAudioContext.instances[0].closed, 1);
    // stale messages from the terminated worker are ignored
    worker.emit({ type: 'ready' });
    assert.equal(asr.state, 'error');
  });

  await t.test('worker.onerror (script failed to load) is fatal too', async (t) => {
    const { asr, worker, errors } = setup(t);
    await asr.start();
    worker.onerror({ message: 'Failed to fetch' });
    assert.equal(asr.state, 'error');
    assert.match(errors[0].message, /Failed to fetch/);
  });

  await t.test('stop() terminates the worker, stops the tracks, closes the context -> idle', async (t) => {
    const { asr, worker, stream, states } = setup(t);
    const node = await startListening(asr, worker);
    asr.stop();
    assert.equal(asr.state, 'idle');
    assert.equal(worker.terminated, 1);
    assert.equal(stream.tracks[0].stopped, 1);
    assert.equal(node.disconnected, 1);
    assert.equal(FakeAudioContext.instances[0].closed, 1);
    assert.deepEqual(states, ['starting', 'listening', 'idle']);
    // late audio / late messages do nothing
    feedSeconds(node, 0.05, 1);
    feedSeconds(node, 0, 0.8);
    worker.emit({ type: 'result', text: 'spät' });
    assert.equal(worker.ofType('transcribe').length, 0);
    asr.stop(); // idempotent
    assert.equal(worker.terminated, 1);
  });

  await t.test('stop() while the permission prompt is open releases the stream', async (t) => {
    let resolve;
    const stream = new FakeStream();
    const { asr, worker } = setup(t, { mediaFactory: () => new Promise((r) => (resolve = r)) });
    const p = asr.start();
    asr.stop();
    resolve(stream);
    assert.equal(await p, false);
    assert.equal(stream.tracks[0].stopped, 1);
    assert.equal(FakeAudioContext.instances.length, 0, 'no AudioContext was opened');
    assert.equal(worker.terminated, 1);
  });

  await t.test('start() twice reuses the running session', async (t) => {
    const { asr, worker } = setup(t);
    await asr.start();
    await asr.start();
    assert.equal(worker.ofType('load').length, 1);
  });
});

// ---------------------------------------------------------------- worker protocol (js/whisper-worker.js)

/** Evaluates js/whisper-worker.js in a vm context; `self.__import` replaces `import()`. Returns `self`. */
function runWorker(selfProps) {
  const vm = require('vm');
  const fs = require('fs');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'whisper-worker.js'), 'utf8');
  assert.equal((src.match(/\bimport\(/g) || []).length, 1, 'exactly one dynamic import in the worker');
  // Messages come from the vm realm (foreign Object prototype): clone them so deepEqual works.
  const self = Object.assign({ onmessage: null }, selfProps, { postMessage: (m) => selfProps.postMessage(structuredClone(m)) });
  const ctx = vm.createContext({ self, navigator: {}, Float32Array, Array, Object, Number, String, Math, Promise, console, setTimeout });
  new vm.Script(src.replace(/\bimport\(/g, 'self.__import('), { filename: 'whisper-worker.js' }).runInContext(ctx);
  assert.equal(typeof self.onmessage, 'function');
  return self;
}

test('whisper-worker: load/transcribe protocol against a fake transformers module', async (t) => {
  const posted = [];
  const calls = [];
  const fakeEnv = { backends: { onnx: { wasm: {} } } };
  const fakeModule = {
    env: fakeEnv,
    pipeline: async (task, model, opts) => {
      calls.push({ task, model, opts });
      opts.progress_callback({ status: 'progress', file: 'a.onnx', progress: 50 });
      opts.progress_callback({ status: 'done', file: 'a.onnx' });
      return async (audio, o) => ({ text: o.language === 'tr' ? ' merhaba ' : ` ${audio.length} samples ` });
    },
  };
  // The worker source uses `import()` (vm cannot run that without --experimental-vm-modules):
  // rewrite it to an injected `__import` and run the script in a bare vm context.
  const self = runWorker({
    postMessage: (m) => posted.push(m),
    __import: async (spec) => {
      calls.push({ import: spec });
      return fakeModule;
    },
  });
  assert.equal(typeof self.onmessage, 'function');
  const flush = () => new Promise((r) => setTimeout(r, 5));

  self.onmessage({ data: { type: 'load', model: 'onnx-community/whisper-tiny', modelBase: '/models/', vendorUrl: '/vendor/transformers.min.js', device: 'wasm' } });
  await flush();
  assert.deepEqual(calls[0], { import: '/vendor/transformers.min.js' });
  assert.equal(calls[1].task, 'automatic-speech-recognition');
  assert.equal(calls[1].model, 'onnx-community/whisper-tiny');
  assert.equal(calls[1].opts.dtype, 'q8');
  assert.equal(calls[1].opts.device, 'wasm');
  assert.equal(fakeEnv.allowRemoteModels, false);
  assert.equal(fakeEnv.allowLocalModels, true);
  assert.equal(fakeEnv.localModelPath, '/models/');
  assert.equal(fakeEnv.backends.onnx.wasm.wasmPaths, '/vendor/');
  assert.deepEqual(posted, [
    { type: 'progress', pct: 50, file: 'a.onnx' },
    { type: 'progress', pct: 100, file: 'a.onnx' },
    { type: 'ready' },
  ]);

  posted.length = 0;
  self.onmessage({ data: { type: 'transcribe', audio: new Float32Array(16000), lang: 'de' } });
  self.onmessage({ data: { type: 'transcribe', audio: new Float32Array(8000), lang: 'tr' } });
  await flush();
  assert.deepEqual(posted, [
    { type: 'result', text: ' 16000 samples ' },
    { type: 'result', text: ' merhaba ' },
  ]);
});

test('whisper-worker: import failure -> error message', async () => {
  const posted = [];
  const self = runWorker({
    postMessage: (m) => posted.push(m),
    __import: async () => {
      throw new Error('404 /vendor/transformers.min.js');
    },
  });
  self.onmessage({ data: { type: 'load', model: 'x' } });
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(posted, [{ type: 'error', message: '404 /vendor/transformers.min.js' }]);
});

// ---------------------------------------------------------------- scripts/setup-offline.js helpers

test('setup-offline: modelFiles(), fileUrl(), REPOS and argument parsing (no network)', () => {
  const s = require('../scripts/setup-offline.js');
  const files = s.modelFiles('onnx-community/whisper-tiny');
  assert.deepEqual(files, [
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'generation_config.json',
    'preprocessor_config.json',
    'onnx/encoder_model_quantized.onnx',
    'onnx/decoder_model_merged_quantized.onnx',
  ]);
  assert.equal(files.length, 7);
  files.push('x'); // a copy, not the internal list
  assert.equal(s.modelFiles('onnx-community/whisper-tiny').length, 7);
  assert.equal(s.fileUrl('onnx-community/whisper-tiny', 'onnx/encoder_model_quantized.onnx'), 'https://huggingface.co/onnx-community/whisper-tiny/resolve/main/onnx/encoder_model_quantized.onnx');
  assert.deepEqual(s.REPOS, { tiny: 'onnx-community/whisper-tiny', base: 'onnx-community/whisper-base' });
  assert.equal(s.parseArgs([]).repo, 'onnx-community/whisper-tiny');
  assert.equal(s.parseArgs(['--model', 'base']).repo, 'onnx-community/whisper-base');
  assert.equal(s.parseArgs(['--model=base', '--data', '/tmp/x']).data, path.resolve('/tmp/x'));
  assert.equal(s.parseArgs(['--force']).force, true);
  assert.throws(() => s.parseArgs(['--model', 'large']), /tiny oder base/);
  assert.throws(() => s.parseArgs(['--bogus']), /Unbekanntes Argument/);
});
