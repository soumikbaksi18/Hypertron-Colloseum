let audio: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let lastHover = 0;

function context() {
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

function noiseBuffer(ctx: AudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const length = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noise = buffer;
  return buffer;
}

function grain(ctx: AudioContext, start: number, duration: number, peak: number, frequency: number) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(frequency, start);
  filter.Q.setValueAtTime(6, start);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function bit(ctx: AudioContext, start: number, frequency: number, duration: number, peak: number) {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(frequency, start);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2800, start);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function chirp(ctx: AudioContext, start: number, from: number, to: number, duration: number, peak: number) {
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(7, start);
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playLandingSound(kind: "hover" | "press" | "open" | "close") {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const now = performance.now();
  if (kind === "hover") {
    if (now - lastHover < 90) return;
    lastHover = now;
  }

  const ctx = context();
  const t = ctx.currentTime;
  if (kind === "hover") {
    bit(ctx, t, 1760, 0.018, 0.02);
    grain(ctx, t, 0.04, 0.045, 3400);
    return;
  }
  if (kind === "open") {
    chirp(ctx, t, 420, 2100, 0.12, 0.03);
    grain(ctx, t + 0.04, 0.08, 0.04, 2400);
    return;
  }
  if (kind === "close") {
    chirp(ctx, t, 1800, 280, 0.11, 0.028);
    grain(ctx, t, 0.06, 0.035, 900);
    return;
  }
  bit(ctx, t, 1480, 0.02, 0.022);
  bit(ctx, t + 0.028, 2140, 0.016, 0.018);
  bit(ctx, t + 0.05, 980, 0.022, 0.02);
  grain(ctx, t, 0.07, 0.04, 1800);
}
