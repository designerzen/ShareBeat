import { holdParam } from '../hold-param';

export class Instrument {
    public gain: GainNode;
    public isPlaying = false;
    public hasInitialised = false;
    public durationFadeIn = 0.1;
    public durationFadeOut = 3;
    public amplitude = 1;
    public SILENCE = 0.00000001;

    constructor(public context: AudioContext, outputTo: GainNode) {
        this.gain = context.createGain();
        this.gain.gain.value = this.SILENCE;
        this.gain.connect(outputTo);
    }

    public start(...args: any[]): void {
        this.isPlaying = true;
        this.hasInitialised = true;
    }

    public stop(): void {
        if (!this.hasInitialised || !this.isPlaying) return;
        this.fadeOut(this.durationFadeOut);
        this.isPlaying = false;
    }

    public fadeIn(time = 0.1): void {
        const now = this.context.currentTime;
        holdParam(this.gain.gain, now);
        this.gain.gain.setTargetAtTime(this.amplitude, now, Math.max(0.003, time / 5));
    }

    public fadeOut(time = 0.1): void {
        const now = this.context.currentTime;
        holdParam(this.gain.gain, now);
        this.gain.gain.setTargetAtTime(this.SILENCE, now, Math.max(0.003, time / 5));
    }
}
