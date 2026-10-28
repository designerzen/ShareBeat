import { DrumMachine } from './DrumMachine';
import { Sine } from './instruments/sine';
import { Saw } from './instruments/Saw';
import { Netronome } from './netronome';
import { defaultWaveforms, isWaveform } from './waveforms';

// A playback instance owns its context, voices, and clock; no document or UI state.
export class BeatPlayer {
    private drums = new DrumMachine();
    private voices = [
        new Sine(this.drums.dsp, this.drums.gain), null,
        new Sine(this.drums.dsp, this.drums.gain), new Saw(this.drums.dsp, this.drums.gain)
    ];
    private clock = new Netronome(() => this.playBeat(), () => {}, this);
    private closed = false;
    public tracks: number[][] = [];
    public get context(): AudioContext { return this.drums.dsp; }

    constructor(private onStep: (step: number) => void) {
        this.voices.forEach((voice, user) => {
            if (!voice) return;
            voice.durationFadeIn = user === 2 ? 0.025 : 0.02;
            voice.durationFadeOut = user === 2 ? 0.16 : 0.12;
            if (user === 2) voice.glideTime = 0.012;
        });
        this.drums.gain.gain.value = 0.154;
    }
    public configure(waveforms: readonly string[], bpm: number, clockOffset: number): void {
        this.voices.forEach((voice, user) => voice?.setType(isWaveform(waveforms[user]) ? waveforms[user] : defaultWaveforms[user]));
        this.clock.clockOffset = Number.isFinite(clockOffset) ? clockOffset : 0;
        this.bpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 200;
        if (this.running) this.clock.start(this.bpm);
    }
    private bpm = 200;
    private running = false;
    public async start(): Promise<void> {
        if (this.closed) return;
        await this.context.resume();
        if (this.closed) return;
        this.running = true;
        this.clock.start(this.bpm);
    }
    private playBeat(): void {
        const step = this.clock.stepIndex(16);
        this.onStep(step);
        this.voices.forEach((voice, user) => {
            const row = this.tracks[user]?.[step] ?? -1;
            if (row < 0) { voice?.stop(); return; }
            if (user === 1) this.drums.trigger(16 - row);
            else {
                const midi = (user === 2 ? 48 : 72) - row;
                voice.start(440 * 2 ** ((midi - 69) / 12));
            }
        });
    }
    public async close(): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        this.running = false;
        this.clock.stop();
        await this.context.close();
    }
}
