///<reference path="Sequence.ts" />

/*

MODEL :

Holds *ALL* of the individual user sequences and 
provides a nice interface for manipulating the data

*/

module sharebeat
{
    export class Sequences
    {
		public users:Array<string>;
		public sequences:Object = new Object();
		
		constructor( userNames:Array<string>, steps:number=16 )
		{
			// create an object with the usernames as the key
			// loop through all usernames and create our queue
			for (var u:number=0, l=userNames.length ; u < l ; ++u)
			{
				var userName:string = userNames[u];
				var sequence:Sequence = new sharebeat.Sequence( userName, steps );
				this.sequences[ userName ] = sequence;
			}
			this.users = userNames;
		}
		
		public setUserKeyAtStep( userName:string, step:number, key:number=-1 ):void
		{
			this.getUserSequence(userName).setKeyAtStep( step, key );
		}
		
		public getUserKeyAtStep( userName:string,step:number ):number
		{
			return this.getUserSequence(userName).getKeyAtStep(step);
		}
		
		public getUserSequence( userName:string ):Sequence
		{
			return this.sequences[userName];
		}
		
		
		public toString():string
		{
			var output:string = 'SEQUENCES ________ \n';
			for ( var user in this.sequences)
			{
				var sequence:Sequence = this.sequences[user];
				output += '\n';
				output += user;
				output += '\n';
				output += sequence.toString();
				output += '\n';
				
			}
			return output;
		}
	}
	
}
