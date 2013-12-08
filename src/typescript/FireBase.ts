///<reference path="audiobus/definitions/firebase.d.ts" />
class Firebase 
{
	private io;
	private usersRef;
	private dataRef;

	private firstRun = 1;
	private max = 4;
	private userid = -1;
	private userRef = [];
	private sequence = [];

	constructor(  )
	{
		this.io = new Firebase('https://sharebeat.firebaseio.com/');
		this.usersRef = io.child('users');
		this.dataRef = io.child('data');
		
		// startup event : load whatever is in db
		this.io.on('child_added', function(s) {
				
			var n  = s.name();
			var v	= s.val();
			
			if(	firstRun && n == 'users'){
			
				console.log('name = ' + n);
				//console.log('value = ' + print(val) );
				//console.table(v)
			
				console.log('new user found');
				firstRun = 0;
				registerUser(v);
				return true;	
			}	
		});
	
		
		// someone enters or leaves the room
		usersRef.on('child_changed', function(s) {
		
			var n = s.name();
			var v = s.val();
				
				v == -1 ?
				console.log( n + ' just left!') : 
				console.log( n + ' just joined the community');
		
		})
		
		
		var refresh = function(s) {
		  
			var n = s.name();
			var v = s.val();
			
			console.log('refresh :  + u +  ' + n + ' '  + v);
		};
		
		
		
		var refreshAll = function(s){
		
			var n = s.name() ;
			var v = s.val() ;
			var u = parseInt( n.substring( n.length -1 ) );;
			
			console.log(n + ' : ' , v);
			console.log('user ' + u);
			
			for( var k in v){
				console.log('onvalue : user ' + u + ' updated step '+ k +' to ' + v[k] );
			
			}
		}
		
		
		//dataRef.on('child_added',		refreshAll);
		//dataRef.on('child_changed',	refreshAll);
		//dataRef.on('child_removed',	refreshAll);
		
		
		for(var i = 0; i < max; i++){
			
			// only do this on one node
			
			dataRef.child('user'+i).on('child_added',	refresh);
			dataRef.child('user'+i).on('child_changed',	refresh);
			dataRef.child('user'+i).on('child_removed',	refresh);
		}
		
		
		// when user closes the window
		window.onunload = function(){
			if(userid != -1){
				this.unregisterUser();
			}
		}
	}
	
	
	
	// register user in db and assign unique userid	
	public registerUser(v):boolean
	{
		var ctr = 0;
		for( var x in v)
		{
			if( v[x] == -1 ) 
			{	
				console.log('a free slot was found for this user ' + ctr);
				userid = ctr;
				io.child('users').child('user'+userid).set( userid );
				io.child('data').child('user'+userid).remove();
				return true;
			}
			ctr++;
		}
		
		alert('This room is full');
		return false;
		
	}
	
	
	// remove user presence and data from db
	public unregisterUser():void
	{
		io.child('data').child('user'+userid).remove();
		io.child('users').child('user'+userid).set( -1 );
	}
	
	
}