///<reference path="definitions/jquery.d.ts" />
/*

MODEL for VIEW

*/
module sharebeat
{
    export class Step
    {
		public id:number;
		public step:number;
		public element:JQuery;
		
		constructor( position:number, steps:number )
		{
			this.id = position;
			this.step = position % steps;
		}
		public getMarkup():string
		{
			var markup:string = '<li id="beat-'+this.id+'" alt="'+this.id+'" class="button sequencer--step step-'+this.step+'">';
			markup += '';
			markup += '</li>';
			return markup;
		}
		public register():JQuery
		{
			this.element = $('#beat-'+this.id );
			return this.element; 
		}
	}
	
}
