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
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.exponentialRampToValueAtTime(this.amplitude, now + time);
        this.gain.gain.setValueAtTime(this.amplitude, now + time + 0.01);
    }

    public fadeOut(time = 0.1): void {
        const now = this.context.currentTime;
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.exponentialRampToValueAtTime(this.SILENCE, now + time);
        this.gain.gain.setValueAtTime(0, now + time + 0.01);
    }
}
