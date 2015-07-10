/*

CONTROLLER 

*/

///<reference path="../audiobus/DrumMachine.ts" />

//<reference path="../audiobus/ISoundControl.ts" />

///<reference path="../audiobus/instruments/Instrument.ts" />
///<reference path="../audiobus/instruments/Sine.ts" />
///<reference path="../audiobus/instruments/Saw.ts" />
///<reference path="../audiobus/instruments/Snare.ts" />
///<reference path="../audiobus/instruments/Conga.ts" />
///<reference path="../audiobus/instruments/BassDrum.ts" />
///<reference path="../audiobus/instruments/Conga.ts" />
///<reference path="../audiobus/instruments/HiHat.ts" />

module sharebeat
{
    export class AudioInstruments
    {
		
		// Instruments
		public drums:audiobus.DrumMachine;
		public sine:audiobus.instruments.Sine;
		public sineB:audiobus.instruments.Sine;
		public saw:audiobus.instruments.Saw;

		private octave:number = 3;
		
		constructor(  )
		{
			// Instruments
			this.drums  = new audiobus.DrumMachine();
			this.sine = new audiobus.instruments.Sine( this.drums.dsp, this.drums.gain );
			this.sineB = new audiobus.instruments.Sine( this.drums.dsp, this.drums.gain );
			this.saw = new audiobus.instruments.Saw( this.drums.dsp, this.drums.gain );

		}

		// Beat commencing at point due to netronome...
		public getInstrument( user:number):string
		{
			user = user >> 0;
			switch( user )
			{
				// Simple sine wave
				case 0: return 'sine';
				// DrumMachine kit
				case 1: return 'drums' ;
				// Sine Bass
				case 2: return 'bass';
				// Saw tooth
				case 3: return 'saw';
			}
			return 'unknown';
		}
		public playUserInstrument( user:number, key:number )
		{
			//var instrument:audiobus.instruments.Instrument = instruments[ user ];
			//var instrument = <audiobus.instruments.Instrument>instruments[ user ];
			var frequency;
			var note = key + this.octave;
			switch( user )
			{
				// Simple sine wave
				case 0:
					frequency = note / 12;
					frequency = 440 * frequency * frequency;
					this.sine.start( frequency );
					break;

				// DrumMachine kit
				case 1:
					this.drums.trigger( key );
					break;

				// Sine Bass
				case 2:
					frequency = (note - 12) / 12;
					frequency = 440 * frequency * frequency;
					this.sineB.start( frequency );
					break;

				// Saw tooth
				case 3:
					frequency = note / 12;
					frequency = 440 * frequency * frequency;
					this.saw.start( frequency );
					break;
			}
			//console.log( frequency + "Hz" );
		}
		
		public stopInstrument( user )
		{
			switch( user )
			{
				// Simple sine wave
				case 0:
					this.sine.stop( );
					break;

				// DrumMachine kit
				case 1:
					//drums.trigger(  );
					break;

				// Sine Bass
				case 2:
					this.sineB.stop( );
					break;

				// Saw tooth
				case 3:
					this.saw.stop( );
					break;
			}
		}

	}
}
