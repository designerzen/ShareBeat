///<reference path="../definitions/waa.d.ts" />
///<reference path="Instrument.ts" />
module audiobus.instruments
{
    export class Saw extends Oscillator implements ISoundControl
    {
		// create
		constructor( audioContext:AudioContext, outputTo:GainNode )
		{
			super( audioContext, outputTo );
            super.setType( OscillatorType.sawtooth );
			this.durationFadeOut = 1;
		}
	}

}
