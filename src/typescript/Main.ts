///<reference path="sharebeat/definitions/jquery.d.ts" />
//<reference path="sharebeat/definitions/greensock.d.ts" />

///<reference path="audiobus/DrumMachine.ts" />

//<reference path="audiobus/ISoundControl.ts" />

///<reference path="audiobus/instruments/Instrument.ts" />
///<reference path="audiobus/instruments/Sine.ts" />
///<reference path="audiobus/instruments/Saw.ts" />
///<reference path="audiobus/instruments/Snare.ts" />
///<reference path="audiobus/instruments/Conga.ts" />
///<reference path="audiobus/instruments/BassDrum.ts" />
///<reference path="audiobus/instruments/Conga.ts" />
///<reference path="audiobus/instruments/HiHat.ts" />
///<reference path="audiobus/inputs/Microphone.ts" />
///<reference path="audiobus/visualisation/SpectrumAnalyzer.ts" />

///<reference path="audiobus/Netronome.ts" />

///<reference path="sharebeat/FireBaseAPI.ts" />
///<reference path="sharebeat/AudioInstruments.ts" />
///<reference path="sharebeat/Matrix.ts" />
///<reference path="sharebeat/Share.ts" />

class Main
{
	// Instruments
	private instruments:sharebeat.AudioInstruments;

	// Universal Metronome
	private netronome:audiobus.Netronome;

	// Sockets & Webservices
	private db:sharebeat.FireBaseAPI;

	// Playback
	private timeout:number;
	
	// Config
	private steps:number = 16;
	private notes:number = 16;
	private quantity:number = this.steps * this.notes;

	// Settings
	private userNames = [ "A", "B", "C", "D" ];
	private octave:number = -10;
	private bpm:number = 200;

	// Operations
	private isLoaded:boolean = false;

	// DOM Elements
	private matrix:sharebeat.Matrix;
	private social:sharebeat.Share;
	private content:JQuery;

	static go():void
	{
		new Main();
	}

	constructor()
	{
		// Attach event listeners() => 
		$(document).ready( e => this.onDOMReady(e) );
		
		// show loading events...
		// already present in html
		// body.addClass("loading");
	}
	
	//////////////////////////////////////////////////////////////
	// DOM is available...
	//////////////////////////////////////////////////////////////
	public onDOMReady(e):void
	{
		this.content = $('#content');
	
		// Instruments
		this.instruments = new sharebeat.AudioInstruments();
		
		// Timing
		this.netronome = new audiobus.Netronome();
		this.netronome.callOnBeat = ( time) => this.onEveryBeat( time);
		this.netronome.callOnProgress = ( percent) => this.onProgress( percent);
		
		// Matrix
		// Create our Matrix for this Instrument 
		this.matrix = new sharebeat.Matrix( 'matrix', this.userNames, this.steps, this.notes, 0 );
		
		// var mic = new audiobus.inputs.Microphone( this.drums.dsp, this.drums.gain );
		// mic.getMic();

		//var viz = new audiobus.visualisation.SpectrumAnalyzer( this.drums.dsp, this.drums.gain );
		// now hook into our analyser for updates

		// Make sure we resize before presenting it
		$(window).resize( e => this.onResize(e) );
		this.onDOMResize();
		
		// Sockets
		this.db = new sharebeat.FireBaseAPI();
		this.db.callbackUserNote = ( user, step, key ) => this.onForeignBeat( user, step, key );
		this.db.callbackUserID = ( user ) => this.onUserID(user);
		
		// Kick things off!
		this.db.connect(); 
	}
	
	//////////////////////////////////////////////////////////////
	// WEBSERVICE : On User ID has been received from the web service
	//////////////////////////////////////////////////////////////
	private onUserID( user:number ):void
	{
		// room full!
		if ( user < 0 )
		{
			// reload in new room?
			this.onRoomFullError();

		}else{
			
			this.begin( user );
			
			//var progress:number = netronome.percentage * steps;
			//this.index = progress >> 0;
			
			// we can stop attempting to re-load this
			this.isLoaded = true;
		}
	}
	
	private onRoomFullError():void
	{
		var copy = "I'm sorry, we had to limit the quantity of people using this app, perhaps try again later!";
		$('body').removeClass("loading").addClass("error").html( copy );
		//==$matrix.html( copy );
	}
	
	private begin( user:number ):void
	{
		var userName:string = this.userNames[ user ];
		var instrumentType:string = this.instruments.getInstrument( user );
		
		// Update GUI
		$( 'body' ).removeClass("loading").addClass( instrumentType );
		$( 'footer' ).append(instrumentType);
		
		
		this.matrix.registerUser( userName );
		// as we don't want the callbackto be triggered yet...
		this.matrix.callbackActivated = (step, key) => this.onUserSelectedBeat(step, key);
		this.matrix.show();		// now show the matrix
		
		
		// SHARE BOX :
		// create and add the share dialogue
		var shareText:string = '';
		var shareTitle:string = '';
		var shareURL:string = window.location.href;
		
		this.social = new sharebeat.Share();
		var markup:string = this.social.getMarkup( shareText, shareURL, shareTitle, true );
		$( '#share' ).html(markup);
		
		
		
		// wtach for unload
		$(window).unload( e => this.onQuiting(e) );
		
		// allow for extrabeats!
		$(document).keypress( e => this.onKeyPress(e) );
		
		// now start the metrnonome
		this.netronome.start( this.bpm );
	}
			
	
	/*
		// fetch all foreign beats associated with
		private getOthersBeats( column )
		{
			var output = {};
			// go through all of the players and
			for ( var n, l = userNames.length; n < l ; ++n )
			{
				var userName = userNames[n];
				var data = userName + column;
				var $existing = $matrix.data( data );

				if ( $existing )
				{
					output[ userName ] = true;
					//console.log("Found friend "+userName+" in this column");
				}else{
					//
					//console.log("There are no other nodes for this friend ");
				}
			}
			return output;
		}
*/
		
	//////////////////////////////////////////////////////////////
	// WEBSERVICE : A User on another machine has inputted some data...
	//////////////////////////////////////////////////////////////
	private onForeignBeat( user:number, step:number, key:number ):void
	{
		// console.error( user, step, key );
		
		var userName:string = this.userNames[user];
		var i:number = step+(this.notes*key);
		
		console.error( this.matrix, i);
		
		var $element:JQuery = this.matrix.getButton(i);
		
		//return;
		this.matrix.selectBeat( $element, userName );
	}
	
	//////////////////////////////////////////////////////////////
	// USER EVENT : Beat was selected that was not selected before
	//////////////////////////////////////////////////////////////
	private onUserSelectedBeat( step:number, key:number ):void
	{
		console.error("User has toggled beat @ "+step +' key '+key );
		// now save the beat in remote database which in 
		// turn results in an onForeignBeat on the other user's machine
		this.db.sendData( step, key );
	}
	
	//////////////////////////////////////////////////////////////
	// METRNONOME : A UNIVERSAL Beat has happened
	//////////////////////////////////////////////////////////////
	private onEveryBeat( t ):void
	{
		// firstly, set the new index
		var originalIndex:number = this.matrix.index;
		var index:number = this.matrix.nextStep();
		var hasLooped:boolean = index === this.steps - 1;
		
		//console.log('BEAT : '+index+' looped:'+hasLooped );
		// check all users...
		for ( var u=0,l= this.userNames.length; u < l; ++u)
		{
			// fetch the user name
			var userName:string = this.userNames[u];
			var data:string;
			var $element;
			
			// previous...
			var oldKey:number = this.matrix.sequences.getUserKeyAtStep( userName, originalIndex );
				
			// there is a key in the last slot...
			if (oldKey > -1) 
			{
				//console.log('clearing activation for '+userName);
				data = userName + originalIndex;
				$element = this.matrix.getElement( data );
				$element.removeClass("activated");
			}
			
			data = userName + index;
			$element =  this.matrix.getElement( data );
			
			// check to see if an existing note already exists
			if ($element)
			{
				// so we have an element in our db!
				var position = parseInt( $element.attr( "alt" ) );
				var key = this.notes - (position / this.steps) >> 0;
				
				//console.log('Netronome :: '+this.index +' p:'+position+' c:'+column);
				//console.log(userName+" Beat "+index+" in key "+key+" occurred checking "+data);
			
				// add an animation class that does something fancy?
				
				//0000 $element = $( $buttons[ index ] );
				$element.addClass("activated");
				
				//$element.removeClass("activated");
				
				// check to see if there are any nodes registered here
				//console.log( "Key found, not playing" );
				
				this.instruments.playUserInstrument( u, key );
				
			}else{
				this.instruments.stopInstrument(u);
				
			}
		}
		// console.log('loop :'+hasLooped);
	}
	

	//////////////////////////////////////////////////////////////
	// METRNONOME : Has advanced
	//////////////////////////////////////////////////////////////
	private onProgress( t ):void
	{
		
	}
	

	//////////////////////////////////////////////////////////////
	//  USER EVENT : A Key has been pressed
	//////////////////////////////////////////////////////////////
	public onKeyPress(e:JQueryKeyEventObject):void
	{
		switch( e.keyCode )
		{
			//keyCode 37 is left arrow
			case 37:
				this.instruments.drums.trigger(1);
				break;

			//keyCode 38 is down arrow
			case 38:
				this.instruments.drums.trigger(2);
				break;

			//keyCode 39 is right arrow
			case 39:
				this.instruments.drums.trigger(3);
				break;

			//keyCode 40 is up arrow
			case 40:
				this.instruments.drums.trigger(4);
				break;
		}
	}

	// we used an interim step for resizeing...
	public onResize(e):void
	{
		if (this.timeout) clearTimeout(this.timeout);
		this.timeout = setTimeout( () => this.onDOMResize(), 30 );
	}
	
	public onDOMResize():void
	{
		console.error('Resizing...',this.content);
		// resize matrix
		var win = $(window);
		var screenWidth:number = win.width();
		var screenHeight:number = win.height();
		
		if ( screenWidth < screenHeight )
		{
			// no scrollbar
			//console.log( "safe height for matrix "+screenHeight+" with "+$matrix.height() );
			this.content.width( "100%" );
			this.content.css( "margin-left", 0 );
		}else{
			// scroll bar so readjust size
			//console.log( "matrix exceeding height "+screenHeight+" with "+$matrix.height() );
			this.content.width( screenHeight + "px" );
			var leftOver = win.width() - screenHeight;
			this.content.css( "margin-left", leftOver * 0.5 );
		}
	}
	
	//////////////////////////////////////////////////////////////
	// Good Bye!
	//////////////////////////////////////////////////////////////
	public onQuiting(e):void
	{
		console.error('DOM Unloading');
		// <- ENSURE we DISCONNECT from our Socket based Webservice
		// Otherwise the rooms will fill up with ghost users
		this.db.disconnect();
	}
}

// End of Typescript
Main.go();



/*
// jQuery Commence!
$(document).ready(function(){

	var $body = $('body'),
		$matrix = $('#matrix'),
		$content = $('#content'),
		$window = $(window),
		buttonHtml = 'article.button';

	var timeout;
	var steps = 16 ;
	var notes = 16;
	var quantity = steps * notes;
	var mouseDown = false;
	var isLoaded = false;

	var index = 0;
	var octave = -10;
	var bpm = 200;

	// fetch all foreign beats associated with
	function getOthersBeats( column )
	{
		var output = {};
		// go through all of the players and
		for ( var n, l = userNames.length; n < l ; ++n )
		{
			var userName = userNames[n];
			var data = userName + column;
			var $existing = $matrix.data( data );

			if ( $existing )
			{
				output[ userName ] = true;
				//console.log("Found friend "+userName+" in this column");
			}else{
				//
				//console.log("There are no other nodes for this friend ");
			}
		}
		return output;
	}

	// fetch all foreign beats associated with
	function getOthersBeatString( column )
	{
		var output = "";
		// go through all of the players and
		for ( var n, l = userNames.length; n < l ; ++n )
		{
			var userName = userNames[n];
			var data = userName + column;
			var $existing = $matrix.data( data );

			if ( $existing ) output += userName + " ";
		}
		return output;
	}

	
*/
