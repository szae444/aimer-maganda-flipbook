let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** A synthesized paper "swish", so the site needs no audio files. */
export function playFlip(volume = 0.5) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (!noise) {
      const len = ctx.sampleRate * 0.6;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        // brown-ish noise reads as paper rather than hiss
        last = (last + 0.06 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.2;
      }
    }
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.25;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.8;
    band.frequency.setValueAtTime(900, t);
    band.frequency.exponentialRampToValueAtTime(3200, t + 0.16);
    band.frequency.exponentialRampToValueAtTime(700, t + 0.42);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(volume * 0.35, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    src.connect(band).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.5);
  } catch {
    /* audio is a nicety; never break flipping */
  }
}
