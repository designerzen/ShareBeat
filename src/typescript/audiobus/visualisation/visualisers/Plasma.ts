//<reference path="../../../definitions/waa.d.ts" />
///<reference path="Visualiser.ts" />
module audiobus.visualisation
{
	export class Plasma extends Visualiser
    {
		private palette:Array<number>;
		private sineTable:Array<number>;
		private pos1:number = 0;
		private pos2:number = 0;

		// create
		constructor( audioContext:AudioContext )
		{
			super( audioContext );
			this.createTable();
		}

		private createTable():void
		{
			var i:number, r:number, g:number, b:number, rad:number;

			this.palette = new Array<number>();
			this.sineTable = new Array<number>();

			for (i = 0; i < 512; ++i)
			{
				rad = i * 0.703125 * 0.0174532;
				this.sineTable[i] = Math.sin(rad) * 1024;
			}

			for (i = 0; i < 64; ++i)
			{
				r = i << 2;
				g = 255 - ((i << 2) + 1);
				b = 0;
				this.palette[i] = r << 16 | g << 8 | b;

				r = 255;
				g = (i << 2) + 1;
				this.palette[i + 64] = r << 16 | g << 8 | b;

				r = 255 - ((i << 2) + 1);
				g = r;
				b = 0;
				this.palette[i + 128] = r << 16 | g << 8 | b;

				r = 0;
				g = (i << 2) + 1;
				b = 0;
				this.palette[i + 192] = r << 16 | g << 8 | b;
			}
		}

		public update( frequencyData:Array<number> ):void
		{
			//this.canvas;
			var i:number, j:number, p:number, 
				tp1:number, tp2:number, tp3:number, tp4:number;

			tp3 = this.pos2;
			//canvas.lock();

			for (i = 0; i < 360; ++i)
			{
				tp1 = this.pos1 + 5;
				tp2 = 3;
				tp3 &= 511;
				tp4 &= 511;

				for (j = 0; j < 480; ++j)
				{
					tp1 &= 511;
					tp2 &= 511;

					p = this.sineTable[tp1] + this.sineTable[tp2] + this.sineTable[tp3] + this.sineTable[tp4];
					p = (128 + (p >> 4)) & 255;
					// this.canvas.setPixel(j, i, this.palette[p]);

					tp1 += 5;
					tp2 += 3;
				}

				tp3++;
				tp4 += 3;
			}

			// this.canvas.unlock();

			this.pos1 += 9;
			this.pos2 += 8;
		}
	}

}
