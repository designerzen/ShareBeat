///<reference path="../../definitions/waa.d.ts" />

module audiobus.visualisation
{
	export class Visualiser
    {
		//static context(k: number, v: Vector) { return new Vector(k * v.x, k * v.y, k * v.z); }

		public context:AudioContext;
		public canvas;

		// create
		constructor( audioContext:AudioContext )
		{
			this.context = audioContext;
		}

		private createCanvas()
		{
			this.canvas = document.createElement("canvas");
			this.canvas.width = 256;
			this.canvas.height = 256;

			document.body.appendChild( this.canvas );

			this.context = this.canvas.getContext("2d");
		}
	}

}
