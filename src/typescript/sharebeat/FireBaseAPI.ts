/*

SERVICE and MODEL 

*/

///<reference path="definitions/firebase.d.ts" />
module sharebeat
{
    export class FireBaseAPI
    {

		private io:Firebase;
		private usersRef:Firebase;
		private dataRef:Firebase;

		private firstRun:boolean = true;
		private max:number = 4;

		// -1 means an EMPTY user, in the db we Check a ROOM to see
		// if there are any spaces
		public userid:number = -1;

		public callback:(user:number, step:number, key:number)=>any;
		public callbackID:(user:number)=>any;

		public callbackUserNote:(user:number, step:number, key:number)=>any;
		public callbackUserID:(user:number)=>any;

		//private roomName:string = "";

		// Model Keys
		private tagChild:string = "users";
		private tagData:string = "data";
		private tagUser:string = "";

		constructor()
		{
		}

		public connect():void
		{
			this.io = new Firebase('https://sharebeat.firebaseio.com/');
			this.usersRef = this.io.child( this.tagChild );
			this.dataRef = this.io.child('data');

			// startup event : load whatever is in db
			this.io.on('child_added', (s) => this.onChildAdded(s) );
			this.dataRef.on('value', (s) =>  this.onAudioData(s) );
		}


		public disconnect():void
		{
			if( this.userid != -1)
			{
				this.unregisterUser();
			}
		}

		private onChildAdded( s ):boolean
		{
			var n:string  = <string>s.name();
			var v:IFirebaseDataSnapshot = s.val();

			if ((this.firstRun == true) && (n == this.tagChild) )
			{
				//console.log('name = ' + n);
				//console.log('value = ' + print(val) );
				//console.table(v)

				//console.log('New user found ============= ');
				this.firstRun = false;
				this.registerUser(v);
				return true;
			}
		}

		private onChildChanged( snapShot:IFirebaseDataSnapshot ):void
		{
			// var n = s.name();
			// var v = s.val();

			// v == -1 ?
			// console.log( n + ' just left!') :
			// console.log( n + ' just joined the community');
		}

		private onAudioData( snapShot:IFirebaseDataSnapshot ):void
		{
			var n = snapShot.name() ;
			var v:any = snapShot.val() ;


			// ROOM DATA EMPTY!
			if ( v == null ) return;

			// Check to see if this is YOUR data!
			var userID:number = parseInt(v.id);
			var step:number = v.s;
			var key:number = v.n;
			
			if ( this.userid == userID) return;
			console.error( n, v );
			//var u = parseInt( n.substring( n.length -1 ) );

			if (this.callbackUserNote) this.callbackUserNote( userID, step, key );
		}

		// Send this data to the central sockets server
		public sendData( step:number, note:number ):void
		{
			this.dataRef.set({'id' : this.userid, 's' : step, 'n' : note });
		}

		// register user in db and assign unique userid
		private registerUser( snapShot:IFirebaseDataSnapshot ):boolean
		{
			var ctr:number = 0;
			for( var x in snapShot )
			{
				if( snapShot[x] == -1 )
				{
					this.userid = ctr;
					var tag:Firebase = this.io.child( this.tagChild );
					tag.child('user'+this.userid).set( this.userid );
					tag.child('data').child('user'+this.userid).remove();
					
					if (this.callbackUserID) this.callbackUserID( this.userid );
					else console.log( 'FireBase - Register user as ID : ' + this.userid );
					
					return true;
				}
				ctr++;
			}
			
			if (this.callbackUserID) this.callbackUserID( -1 );
			else console.log( 'FireBase - Could not register user as room is full! ID : -1');
			
			
			return false;
		}

		// remove user presence and data from db
		public unregisterUser():void
		{
			this.io.child('data').child('user'+this.userid).remove();
			this.io.child( this.tagChild).child('user'+this.userid).set( -1 );
		}

	}
}
