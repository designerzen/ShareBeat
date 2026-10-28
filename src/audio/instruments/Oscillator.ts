import { Instrument } from './Instrument';

export class Oscillator extends Instrument {
    private osc: OscillatorNode;

    constructor(context: AudioContext, outputTo: GainNode) {
        super(context, outputTo);
        this.osc = context.createOscillator();
        this.osc.connect(this.gain);
    }

    public setType(type: OscillatorType): void {
        this.osc.type = type;
    }

    public start(frequency: number): void {
        const now = this.context.currentTime;
        this.osc.frequency.value = frequency;
        this.gain.gain.cancelScheduledValues(now);
        if (this.isPlaying) this.gain.gain.value = 0.5;
        else this.gain.gain.exponentialRampToValueAtTime(0.5, now + this.durationFadeIn);
        // An oscillator can only start once; subsequent notes reuse it.
        if (!this.hasInitialised) this.osc.start(now);
        super.start();
    }
}
