///<reference path="../definitions/waa.d.ts" />
///<reference path="Instrument.ts" />
///<reference path="Oscillator.ts" />
///<reference path="../ISoundControl.ts" />
module audiobus.instruments
{
    export class Sine extends Oscillator implements ISoundControl
    {
		// create
		constructor( audioContext:AudioContext, outputTo:GainNode )
		{
			super( audioContext, outputTo );
            super.setType( OscillatorType.sine );
			this.durationFadeOut = 3;
		}
	}

}
