import { Oscillator } from './Oscillator';

export class Sine extends Oscillator {
    constructor(context: AudioContext, outputTo: GainNode) {
        super(context, outputTo);
        this.setType('sine');
        this.durationFadeOut = 3;
    }
}
