///<reference path="definitions/jquery.d.ts" />

module sharebeat
{
    export class ProgressBar
    {
		
		private bar;
		
		constructor( id:string )
		{
			this.bar = $("."+id );
		}
		
		public setProgress( progress:number ):void
		{
			// move bar to correct position
			this.bar.css( "left", progress+"%" );
		}
		
		
	}
	
}
