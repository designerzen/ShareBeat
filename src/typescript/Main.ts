///<reference path="audiobus/definitions/jquery.d.ts" />
///<reference path="audiobus/definitions/greensock.d.ts" />
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
///<reference path="FireBaseAPI.ts" />
class Main 
{
	
	private drums:audiobus.DrumMachine;
	
	static main():void 
	{
		new Main();
	}
	
	constructor(  )
	{
		this.drums = new audiobus.DrumMachine();
		this.drums.trigger();
		this.drums.trigger(1);
		this.drums.trigger(2);
		this.drums.trigger(3);
		this.drums.trigger(4);
		
		// var mic = new audiobus.inputs.Microphone( this.drums.dsp, this.drums.gain );
		// mic.getMic();
		
		//var viz = new audiobus.visualisation.SpectrumAnalyzer( this.drums.dsp, this.drums.gain );
		
		// now hook into our analyser for updates
		
		
		// Attach key event
		document.onkeydown = (event) => {
            this.keyListener(event);
        }
	}
	
	private keyListener(e) 
	{
		if (!e)	e = window.event;

		switch( e.keyCode )
		{
			//keyCode 37 is left arrow
			case 37:
				this.drums.trigger(1);
				break;
				
			
		}
		
		if (e.keyCode == 38) {
			//keyCode 38 is down arrow
			this.drums.trigger(2);
		}
		if (e.keyCode == 39) {
			//keyCode 39 is right arrow
			this.drums.trigger(3);
		}
		if (e.keyCode == 40) {
			//keyCode 40 is up arrow
			this.drums.trigger(4);
		}
	}

}


// jQuery Commence!
$(document).ready(function(){
	
	var $body = $('body'),
		$matrix = $('#matrix'),
		$content = $('#content'),
		buttonHtml = 'article.button';
		
	var timeout;	
	var steps = 16 ;
	var notes = 16;
	var quantity = steps * notes;
	var mouseDown = false;
	var isLoaded:boolean = false;
	
	var userNames = [ "A", "B", "C", "D" ];
	var colours = [ "" ];
	
	var index = 0;
	var octave = -10;
	var bpm = 200;
	
	var db = new FireBaseAPI( onForeignBeat, onUserID );
	var drums  = new audiobus.DrumMachine();
	
	var sine = new audiobus.instruments.Sine( drums.dsp, drums.gain );
	var sineB = new audiobus.instruments.Sine( drums.dsp, drums.gain );
	var saw = new audiobus.instruments.Saw( drums.dsp, drums.gain );
	var snare = new audiobus.instruments.Snare( drums.dsp, drums.gain );
	var hihat = new audiobus.instruments.HiHat( drums.dsp, drums.gain );
	var kick = new audiobus.instruments.BassDrum( drums.dsp, drums.gain );
	var cowbell = new audiobus.instruments.CowBell( drums.dsp, drums.gain );
	var conga = new audiobus.instruments.Conga( drums.dsp, drums.gain );
	
	var netronome = new audiobus.Netronome( onEveryBeat, onProgress, this );
	
	var instruments:audiobus.instruments.Instrument[] = [ sine, kick, hihat, cowbell ];
	
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
		
	
	function selectBeat( $element, user:number=0, save:boolean=true )
	{
		var userName = userNames[user];
		var index = parseInt( $element.attr( "alt" ) );
		var column = index % steps;
		var originalKey = (index / steps) >> 0;
		var key = notes - originalKey;
				
		var data = userName + column;
		var $existing = $matrix.data( data );
		var className = "selected user"+userName + " ";
		
		console.log("Adding beat to user "+user+" key:"+key);
		
		if ( $existing ) 
		{
			deselectBeat( $existing , user );
			//console.log("Found previous in this column at key "+key );
		}else{
			// 
			//console.log("There is no entry in this column currently at key "+key );
		}
		
		//var users = getOthersBeats( column );
		//console.log( users );
		
		// append other users onto this
		className += getOthersBeatString( column );
		
		// This is where we do the colour magic...
		$element.addClass( className );
		$element.data( "active"+userName, key );
		//$element.css( "background-color", colour );
		
		// set in global data base
		$matrix.data( data, $element  );
		
		// set in cloud data base
		if (save) db.sendData( column, originalKey );
	}
	
	function deselectBeat( $element:JQuery, user:number=0 )
	{
		var userName = userNames[user];
		var position:number = parseInt( $element.attr( "alt" ) );
		var column = position % steps;
		var data = userName + column;
			
		$element.removeClass("selected user"+userName);
		//$element.data( "active"+userNames[user], -1 );
		$element.removeData( "active"+userName );
		
		// set in global data base
		$matrix.removeData( data  );
	}
	
	function playDrums( key:number )
	{
		/*
		 sine = new audiobus.instruments.Sine( drums.dsp, drums.gain );
		var hihat = new audiobus.instruments.HiHat( drums.dsp, drums.gain );
		var kick = new audiobus.instruments.BassDrum( drums.dsp, drums.gain );
		var cowbell = new audiobus.instruments.CowBell( drums.dsp, drums.gain );
		var conga =
	*/
		switch( key )
		{
			case 0:
				kick.start(2050, 0.005, 0.01, 0.7);
				break;			
			case 1:
				kick.start(4050, 0.007, 0.01, 0.6);
				
				break;			
			case 2:
				kick.start(8050, 0.008, 0.03, 0.5);
				
				break;			
			case 3:
				kick.start(12050, 0.005, 0.01, 0.4);
				
				break;
				
			case 4:
				snare.start( 2050, 0.005, 0.01, 0.1);
				break;			
			case 5:
				snare.start( 2050, 0.006, 0.02, 0.1);
				break;			
			case 6:
				snare.start( 2050, 0.007, 0.03, 0.1);
				break;			
				
			case 7:
				snare.start( 2050, 0.008, 0.04, 0.1);
				break;			
			case 8:
				conga.start( 1200, 0.160);
				break;			
			case 9:
				conga.start( 2200, 0.260);
				
				break;			
			case 10:
				conga.start( 3200, 0.360);
				
				break;			
			case 11:
				conga.start( 4200, 0.460);
				
				break;			
			case 12:
				cowbell.start( 0.025, 0.05, 0.4);
				break;			
			case 13:
				cowbell.start( 0.020, 0.04, 0.3);
				break;			
			case 14:
				cowbell.start( 0.015, 0.03, 0.2);
				break;			
			case 15:
				cowbell.start( 0.010, 0.02, 0.3);
				break;			
			case 16:
				cowbell.start( 0.005, 0.01, 0.2);
				break;
			
				
		}
	}
	// Privates
	
	// Beat commencing at point due to netronome...
	function playUserInstrument( user, key )
	{
		//var instrument:audiobus.instruments.Instrument = instruments[ user ];
		var instrument = <audiobus.instruments.Instrument>instruments[ user ];
		var frequency;
		
		switch( user )
		{
			// Simple sine wave
			case 0:
				console.log("Sine ... ");
				frequency = 440 * Math.pow(2, ( (key + octave) / 12 ) );	
				sine.start( frequency );
				break;
				
			// DrumMachine kit
			case 1:
				playDrums( key );
				
				break;
			
			// Sine Bass
			case 2:
				frequency = 440 * Math.pow(2, ( (key + octave - 12) / 12 ) );	
				sineB.start( frequency );
				break;
				
			// Saw tooth
			case 3:
				frequency = 440 * Math.pow(2, ( (key + octave) / 12 ) );	
				saw.start( frequency );
				break;
			
			
			
		}
		console.log( frequency + "Hz" );
		
	}
	
	// 
	function onEveryBeat( t )
	{
		// check all users...
		for ( var u=0,l=userNames.length; u < l; ++u)
		{
			// fetch the user name
			var userName = userNames[u];
			var data = userName + index;
			
			console.log("Looking for element "+data );
			
			var $element =  $matrix.data( data );
			if ($element)
			{
				console.log( $element );
			
				// so we have an element in our db!
				var position = parseInt( $element.attr( "alt" ) );
				var column = position % steps;
				var key = notes - (position / steps) >> 0;
				
				// console.log(userName+" Beat "+index+" in key "+key+" occurred checking "+data);
			
				// check to see if an existing note already exists
			
				//$element = $( $buttons[ index ] );
		
				// check to see if there are any nodes registered here
				//console.log( "Key found, not playing" );
				
				playUserInstrument( u, key );
				
			}else{
				//console.log("No Beat "+userName+" index:"+ index+" key:"+key);
		
				var instrument = <audiobus.instruments.Instrument>instruments[ u];
				instrument.stop();
			}
		}
		
		
		
		// move bar to correct position 
		$bar.css( "left", (index*100/steps)+"%" );
		
		//console.log("Beat "+index+" occurred bar : "+(index*100/16));
			
		index = (index+1) % steps;	// find relevant step
		return index;
	}
	
	// Beat commencing at point due to netronome...
	function onProgress(  percent )
	{
		// console.log("Progress : "+percent);
		return true;
	}
	
	// Beat has been pressed
	function onBeatSelected(element)
	{
		var $this = $(element);
		// check to see if it is already pressed...
		var isActive = $this.data( "activeA" )|| false;
		
		console.log("Beat selected active:"+isActive);
		
		if ( isActive ) onBeatDeselect( $this );
		else onBeatRequest( $this );
	}
	
	// Beat has been pressed
	function onBeatRequest($element)
	{
		selectBeat( $element, db.userid );
	}
	
	// Beat has been pressed
	function onBeatDeselect($element)
	{
		deselectBeat( $element, db.userid );
	}
	
	function onBeatPressed(event)
	{
		var $this = $( this );
		var isActive = $this.data( "activeA" ) || false;
		
		if (isActive) deselectBeat( $this, db.userid );
		else selectBeat( $this, db.userid );
		//console.log("Beat pressed");
		
	}
	
	function onBeatRolledOver(event)
	{
		//console.log("Beat over");
		
		if (mouseDown) onBeatSelected( this );
		else $(this).addClass("over");
		//console.log("Beat selected");
		
		
	}
	
	function onBeatRolledOut()
	{
		//console.log("Beat out");
		$(this).removeClass("over");
		//$( this ).unbind( "mouseout" );
		
	}
	
	// Foreign events from web service!
	function onForeignBeat( user:number, step:number, key:number )
	{
		//alert("on foreign beat");
		// figure out where the beat is on the system...
		
		//key = notes - key;
		// this is WRONG!
		//var index:number = (step*notes) / key;
		var i:number = step+(notes*key);
		var $element:JQuery = $( $buttons[ i ] );
		
		selectBeat( $element, user, false );
	}
	
	// Mouse events
	
	function onMouseDown(event)
	{
		mouseDown = true;
		
	}
	function onMouseUp(event)
	{
		mouseDown = false;
	}
	
	// Screen resize
	function onMatrixResize(event)
	{
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout( onActualResize, 400 ); 
	}
	
	// Screen resize
	function onActualResize(event)
	{
		// throw an alert when height of matrix exceeds screeen height!
		var screenWidth = $(window).width();
		var screenHeight = $(window).height();
		
		if ( screenWidth < screenHeight )
		{
			// no scrollbar
			//console.log( "safe height for matrix "+screenHeight+" with "+$matrix.height() );
			$content.width( "100%" );
			$content.css( "margin-left", 0 );
		}else{
			// scroll bar so readjust size
			//console.log( "matrix exceeding height "+screenHeight+" with "+$matrix.height() );
			$content.width( screenHeight + "px" );
			var leftOver = $(window).width() - screenHeight;
			$content.css( "margin-left", leftOver * 0.5 );
		}
		
		
	}
	
	function onUserID( id:number )
	{
		id = id >> 0;
		switch( id )
		{
			// Simple sine wave
			case 0:
				$body.addClass('sine');
				break;
				
			// DrumMachine kit
			case 1:
				$body.addClass('drums');
				break;
			
			// Sine Bass
			case 2:
				$body.addClass('bass');
				break;
				
			// Saw tooth
			case 3:
				$body.addClass('saw');
				break;
		}
		isLoaded = true;
		$body.removeClass("loading");
		netronome.start( bpm );
		
		var progress:number = netronome.percentage * steps;
		index = progress >> 0;
		
		//alert( "INDEX : " + index );
		//index = 0;
		
		$matrix.show();
	}
	
	// BEGIN
	
	// loop through here and create our 16 x 16 grid
	var boxes = "";
	for ( var g=0; g < quantity; ++g )
	{
		boxes += '<article alt="'+g+'" class="button"></article>';
	}
	
	// add in our progress bar
	boxes += '<div class="progress"></div>'
	
	// finally inject boxes!
	$matrix.html( boxes );
	$matrix.hide();
	
	var $buttons = $( "article.button" , $matrix );
	var $bar = $( "div.progress" , $matrix );
	
	// first check for mouse down
	$matrix.mousedown( onMouseDown );
	$matrix.mouseup( onMouseUp );
	
	// now convert each of these boxes into a specific ID
	$buttons.mouseover( onBeatRolledOver );
	$buttons.mouseout( onBeatRolledOut );
	$buttons.click( onBeatPressed );
	
	// now before we reveal the $matrix...
	// let's hide all oour buttons then stagger them in with GSAP
	//TweenMax.staggerToFrom( $buttons, 1, { alpha:0 }, { alpha:1 }, 1 )//.onComplete( function(){ $matrix.show(); } );
	//TweenMax.staggerTo( $buttons, 1, {alpha:1 }, 1 , $matrix.show )//.onComplete( function(){ $matrix.show(); } );
	
	
	$( window ).resize( onMatrixResize );
	
	$( window ).keydown(
		function( event ) {
			
			if ( event.which == 13 ) {
				event.preventDefault();
			}
			var user = 1+(Math.random() * 3) >> 0;
			var step = ( Math.random() * 16 ) >> 0;
			var key = ( Math.random() * 16 ) >> 0;
			onForeignBeat( user, step, key );
			console.log("keypress "+event.which );
		}
	);
	
	function onUnloaded()
	{
		db.disconnect();
	}
	
	
	$body.addClass("loading");
	// when user closes the window
	window.onunload = onUnloaded;
	
	onActualResize( null );
	
	// Kick things off!
	db.connect();
		
});
