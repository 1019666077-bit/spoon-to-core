type SfxKind = "hit" | "break" | "treasure" | "ui" | "warn" | "return" | "shop";

/**
 * Placeholder oscillator SFX. No licensed audio.
 * Unlock must be called synchronously from a user gesture.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  volume = 1;
  enabled = true;

  unlock(): void {
    const Ctor =
      typeof AudioContext !== "undefined"
        ? AudioContext
        : typeof window !== "undefined"
          ? (
              window as unknown as {
                webkitAudioContext?: typeof AudioContext;
              }
            ).webkitAudioContext
          : undefined;
    if (!Ctor) return;
    if (!this.ctx) {
      this.ctx = new Ctor({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume * this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume * this.volume, this.ctx.currentTime, 0.02);
    }
  }

  play(kind: SfxKind): void {
    if (!this.enabled || this.volume <= 0) return;
    this.unlock();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    if (kind === "hit") this.blip(now, 140, 90, 0.045, 0.09);
    else if (kind === "break") this.noise(now, 0.09, 0.14);
    else if (kind === "treasure") {
      this.blip(now, 520, 740, 0.07, 0.08);
      this.blip(now + 0.07, 740, 980, 0.09, 0.07);
    } else if (kind === "ui") this.blip(now, 420, 380, 0.05, 0.05);
    else if (kind === "shop") this.blip(now, 300, 540, 0.08, 0.06);
    else if (kind === "warn") this.blip(now, 180, 120, 0.12, 0.08);
    else if (kind === "return") this.blip(now, 240, 420, 0.16, 0.07);
  }

  private blip(when: number, from: number, to: number, dur: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private noise(when: number, dur: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const count = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, count, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / count);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    src.buffer = buffer;
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(when);
    src.stop(when + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
}
