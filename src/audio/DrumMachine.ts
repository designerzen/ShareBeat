import { BassDrum } from "./instruments/BassDrum";
import { Snare } from "./instruments/Snare";
import { HiHat } from "./instruments/HiHat";
import { Conga } from "./instruments/Conga";
import { CowBell } from "./instruments/CowBell";
export class DrumMachine
    {
		// shared variables
		public bpm:number = 120;
		public tempo:number;
		
		public bassdrum:BassDrum;
		public snare:Snare;
		public hihat:HiHat;
		public conga:Conga;
		public cowbell:CowBell;
		
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
				// Use the native context sample rate.
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
			this.bassdrum = new BassDrum( this.dsp, this.gain );
			this.conga = new Conga( this.dsp, this.gain );
			this.snare = new Snare( this.dsp, this.gain );
			this.hihat = new HiHat( this.dsp, this.gain );
			this.cowbell = new CowBell( this.dsp, this.gain );
			
			// If you want to connect this DrumMachine machine to 
			// another DrumMachine machine or to the Spectrum Analyser
			// this is the place to intercept it!
			
			
			// 	Route SIGNALS - MIX AND OUTPUT
			this.gain.connect( this.dsp.destination );
		}
		
		public trigger( id:number=0 ):void
		{
			switch (id)
			{
			
				default:
				case 0:
					this.bassdrum.start(2050, 0.005, 0.01, 0.7);
					break;			
				case 1:
					this.bassdrum.start(4050, 0.007, 0.01, 0.6);
					
					break;			
				case 2:
					this.bassdrum.start(8050, 0.008, 0.03, 0.5);
					
					break;			
				case 3:
					this.bassdrum.start(12050, 0.005, 0.01, 0.4);
					
					break;
					
				case 4:
					this.snare.start( 2050, 0.005, 0.01, 0.1);
					break;			
				case 5:
					this.snare.start( 2050, 0.006, 0.02, 0.1);
					break;			
				case 6:
					this.snare.start( 2050, 0.007, 0.03, 0.1);
					break;			
					
				case 7:
					this.snare.start( 2050, 0.008, 0.04, 0.1);
					break;			
				case 8:
					this.conga.start( 1200, 0.160);
					break;			
				case 9:
					this.conga.start( 2200, 0.260);
					
					break;			
				case 10:
					this.conga.start( 3200, 0.360);
					
					break;			
				case 11:
					this.conga.start( 4200, 0.460);
					
					break;			
				case 12:
					this.hihat.start( );
					break;			
				case 13:
					this.hihat.start( );
					break;			
				case 14:

					break;			
				case 15:
					this.cowbell.start( 0.015, 0.03, 0.2);
					break;			
				case 16:
					this.cowbell.start( 0.005, 0.01, 0.2);
					break;
			}
		}
	}
