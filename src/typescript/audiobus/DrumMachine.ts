///<reference path="definitions/waa.d.ts" />
///<reference path="instruments/BassDrum.ts" />
///<reference path="instruments/Snare.ts" />
///<reference path="instruments/HiHat.ts" />
///<reference path="instruments/Conga.ts" />
///<reference path="instruments/CowBell.ts" />
module audiobus
{
    export class DrumMachine
    {
		// shared variables
		public bpm:number = 120;
		public tempo:number;
		
		public bassdrum:audiobus.instruments.BassDrum;
		public snare:audiobus.instruments.Snare;
		public hihat:audiobus.instruments.HiHat;
		public conga:audiobus.instruments.Conga;
		public cowbell:audiobus.instruments.CowBell;
		
		public dsp:AudioContext;
		public gain:GainNode;			// MAIN volume 

		/*
		public set volume( vol:number=1 ):void
		{
			this.gain.gain = vol;
		}
		
		public get volume( ):number
		{
			return this.gain.gain;
		}
		*/
		// starts here...
		constructor( audioContext:AudioContext = null, outputTo:GainNode = null )
		{
			var available:boolean = this.initDSP( window );
			if (!available)
			{
				// END prematurely ;(
				alert('Web Audio API is not supported in this browser');
			}else{
				this.setup();
			}
		}
	
		private initDSP( window ):boolean
		{
			try {
				// Fix up for prefixing
				window.AudioContext = window.AudioContext || window.webkitAudioContext || window.msAudioContext || window.mozAudioContext;
				this.dsp = new AudioContext();
				this.dsp.sampleRate = 22050;
				return true;
				
			} catch(error) {
				
				return false;
			}
		}	
		
		private setup():void
		{
			// Setup Main OUTPUT LEVEL
			this.gain = this.dsp.createGain();
		
			// Create Instruments
			this.bassdrum = new audiobus.instruments.BassDrum( this.dsp, this.gain );
			this.conga = new audiobus.instruments.Conga( this.dsp, this.gain );
			this.snare = new audiobus.instruments.Snare( this.dsp, this.gain );
			this.hihat = new audiobus.instruments.HiHat( this.dsp, this.gain );
			this.cowbell = new audiobus.instruments.CowBell( this.dsp, this.gain );
			
			// If you want to connect this DrumMachine machine to 
			// another DrumMachine machine or to the Spectrum Analyser
			// this is the place to intercept it!
			
			
			// 	Route SIGNALS - MIX AND OUTPUT
			this.gain.connect( this.dsp.destination );
			
			// Fix FF
			//for legacy browsers
			//this.osc1.start = this.osc1.start || this.osc1.noteOn;
			//this.osc1.stop = this.osc1.stop || this.osc1.noteOff;
		}
		
		public trigger( id:number=0 ):void
		{
			switch (id)
			{
				case 1:
					this.snare.start();
					break;
				case 2:
					this.hihat.start();
					break;
				case 3:
					this.conga.start();
					break;
				case 4:
					this.cowbell.start();
					break;
					
				case 0:
				default:
					this.bassdrum.start();
			}
		}
	}
}