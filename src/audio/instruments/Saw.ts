import { Oscillator } from './Oscillator';

export class Saw extends Oscillator {
    constructor(context: AudioContext, outputTo: GainNode) {
        super(context, outputTo);
        this.setType('sawtooth');
        this.durationFadeOut = 1;
    }
}
