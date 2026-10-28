import { Instrument } from './Instrument';

export class Oscillator extends Instrument {
    private osc: OscillatorNode;
    public glideTime = 0.008;

    constructor(context: AudioContext, outputTo: GainNode) {
        super(context, outputTo);
        this.osc = context.createOscillator();
        this.osc.connect(this.gain);
    }

    public setType(type: OscillatorType): void {
        this.osc.type = type;
    }

    public start(frequency: number): void {
        if (!Number.isFinite(frequency) || frequency <= 0) return;
        const now = this.context.currentTime;
        this.osc.frequency.cancelAndHoldAtTime(now);
        if (!this.hasInitialised) this.osc.frequency.setValueAtTime(frequency, now);
        else this.osc.frequency.setTargetAtTime(frequency, now, this.glideTime);
        // Hold the actual envelope value when retriggering, including during release.
        // The oscillator keeps running, preserving phase between adjacent notes.
        this.gain.gain.cancelAndHoldAtTime(now);
        this.gain.gain.setTargetAtTime(0.5, now, Math.max(0.003, this.durationFadeIn / 5));
        if (!this.hasInitialised) this.osc.start(now);
        super.start();
    }
}
