///<reference path="audiobus/definitions/firebase.d.ts" />
class FireBaseAPI 
{
	private io:Firebase;
	private usersRef:Firebase;
	private dataRef:Firebase;

	private firstRun:boolean = true;
	private max:number = 4;
	
	// -1 means an EMPTY user, in the db we Check a ROOM to see
	// if there are any spaces 
	public userid:number = -1;

	private callback:(user:number, step:number, key:number)=>any;
	private callbackID:(user:number)=>any;
	
	private roomName:String = "";
	
	private tagChild:String = "users";
	private tagData:String = "data";
	private tagUser:String = "";
	
	constructor( onNoteCallback:(user:number, step:number, key:number)=>any, onUserID:(user:number)=>any )
	{
		this.callback = onNoteCallback;
		this.callbackID = onUserID;
	}

	public connect():void
	{
		this.io = new Firebase('https://sharebeat.firebaseio.com/');
		this.usersRef = this.io.child(tagChild);
		this.dataRef = this.io.child('data');
		
		console.log("Frebase API connectin..."+this.io);

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
		var n:String  = <String>s.name();
		var v:IFirebaseDataSnapshot = s.val();
		
		if ((this.firstRun == true) && (n == tagChild) )
		{
			//console.log('name = ' + n);
			//console.log('value = ' + print(val) );
			//console.table(v)
		
			console.log('New user found ============= ');
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
		var v:IFirebaseDataSnapshot = snapShot.val() ;
		
		
		// ROOM DATA EMPTY!
		if ( v == null ) return;
		
		// Check to see if this is YOUR data!
		var uid = parseInt(v.id) ;
		
		if ( this.userid == uid) return;
		console.log( v );
		//var u = parseInt( n.substring( n.length -1 ) );
		/*
		
		// id
		v.id;
		// note
		v.n;
		// step
		v.s;
		*/
		this.callback( uid, v.s, v.n );
	}
	
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
				console.log('a free slot was found for this user ' + ctr);
				this.userid = ctr;
				this.io.child( tagChild ).child('user'+this.userid).set( this.userid );
				this.io.child('data').child('user'+this.userid).remove();
				this.callbackID( this.userid );
				return true;
			}
			ctr++;
		}
		
		alert("I'm sorry, we had to limit the quantity of people using this app, perhaps try again later!");
		return false;
	}
	
	// remove user presence and data from db
	public unregisterUser():void
	{
		this.io.child('data').child('user'+this.userid).remove();
		this.io.child( tagChild).child('user'+this.userid).set( -1 );
	}
	
}