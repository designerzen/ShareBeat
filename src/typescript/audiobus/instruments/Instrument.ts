///<reference path="../definitions/waa.d.ts" />
///<reference path="../definitions/greensock.d.ts" />

// interface IPlugs
module audiobus.instruments
{
    export class Instrument
    {
		public context:AudioContext;
		public gain:GainNode;
		public isPlaying:boolean = false;
		public hasInitialised:boolean = false;
		
		public durationFadeIn:number = 0.15;
		public durationFadeOut:number = 0.15;
		
		public SILENCE:number = Number.MIN_VALUE + Number.MIN_VALUE;
		
		/*
		public set volume( vol:number=1 )
		{
			this.gain.gain = vol;
		}
		
		public get volume( ):number
		{
			return this.gain.gain;
		}
		*/
		
		// create
		constructor( audioContext:AudioContext, outputTo:GainNode )
		{
			this.context = audioContext;
			this.gain = audioContext.createGain();
			this.gain.connect( outputTo );
		}
		
		public start( ...args: any[] ):void
		{
			var t:number = this.context.currentTime;
			
			this.isPlaying = true;
			this.hasInitialised = true;
			console.log( 'start ' +this.isPlaying  );
		}
		
		public stop():void
		{
			if ( !this.hasInitialised ) return;
			
			//this.gain.gain.value = 0;
			//
    			// An exception will be thrown if this value is less than or equal to 0,
				// or if the value at the time of the previous event is less than or equal to 0.
			//this.gain.gain.setValueAtTime(0.01, t + durationFadeOut);	
			this.fadeOut(this.durationFadeOut);
			console.log( 'stop vol:', this.gain );
			//if (this.gain.gain.value > 0 ) console.error('could not stop'+this);
			this.isPlaying = false;
			
		}
		
		public fadeIn( time:number=0.1 ):void
		{
			TweenLite.to(this.gain, time, {gain:1, onComplete:this.onFaded });
		}
		
		public onFaded(  ):void
		{
			alert("fade complete "+this.gain.gain);
		}
		public fadeOut( time:number=0.1 ):void
		{
			var t:number = this.context.currentTime;
			console.log( "fading out in "+time );
			this.gain.gain.cancelScheduledValues( t );
			this.gain.gain.exponentialRampToValueAtTime( this.SILENCE, t + time );
			
		}
		
	}
	
}