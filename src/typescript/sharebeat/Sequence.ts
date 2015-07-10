/*

MODEL 

*/

module sharebeat
{
    export class Sequence
    {
		public sequence:Array<number>;
		public name:string;
		
		constructor( userName:string, steps:number=16 )
		{
			// create our empty array for this user
			// Position in Array is the STEP or POSITION
			// Value in the item is -1 for EMPTY
			// or > -1 for the KEY
			// [-1][-1][2]
			this.name = userName;
			this.sequence = new Array();
			
			for (var s:number=0 ; s < steps ; ++s)
			{
				// Push emptiness into the sequunce 
				this.sequence.push( -1 );
			}
		}
		
		public setKeyAtStep( step:number, key:number=-1 ):void
		{
			this.sequence[step] = key;
		}
		
		public getKeyAtStep( step:number ):number
		{
			return this.sequence[step];
		}
		public toString():string
		{
			return this.sequence.join(',');
		}
	}
	
}
