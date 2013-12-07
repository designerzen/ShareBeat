///<reference path="audiobus/definitions/jquery.d.ts" />
///<reference path="audiobus/DrumMachine.ts" />
///<reference path="audiobus/instruments/Sine.ts" />
///<reference path="audiobus/inputs/Microphone.ts" />
///<reference path="audiobus/visualisation/SpectrumAnalyzer.ts" />

///<reference path="audiobus/Netronome.ts" />
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
	
	var $matrix = $('#matrix'),
		$content = $('#content');
	var timeout;	
	var buttonHtml = 'article.button';
	var steps = 16 ;
	var notes = 16;
	var quantity = steps * notes;
	var mouseDown = false;
	
	var userNames = [ "A", "B", "C", "D" ];
	var colours = [ "" ];
	
	var index = 0;
	var octave = 6;
	
	var drums  = new audiobus.DrumMachine();
	
	var sine = new audiobus.instruments.Sine( drums.dsp, drums.gain );
	var netronome = new audiobus.Netronome( onEveryBeat, onProgress, this );
	
	var instruments = [];
	
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
				console.log("Found friend "+userName+" in this column");
			}else{
				// 
				console.log("There are no other nodes for this friend ");
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
			
			if ( $existing ) 
			{
				output += userName + " ";
				
				console.log("Found friend "+userName+" in this column");
			}else{
				// 
				console.log("There are no other nodes for this friend ");
			}
		}
		return output;
	}
		
	function selectBeat( $element, user:number=0 )
	{
		var userName = userNames[user];
		var index = parseInt( $element.attr( "alt" ) );
		var column = index % steps;
		var key = (index / steps) >> 0;
		var data = userName + column;
		var $existing = $matrix.data( data );
		var className = "selected user"+userName + " ";
		
		if ( $existing ) 
		{
			deselectBeat( $existing , user );
			console.log("Found previous in this column at key "+key );
		}else{
			// 
			console.log("There is no entry in this column currently at key "+key );
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
	}
	
	function deselectBeat( $element, user:number=0 )
	{
		var userName = userNames[user];
		var position = parseInt( $element.attr( "alt" ) );
		var column = position % steps;
		var data = userName + column;
			
		$element.removeClass("selected user"+userName);
		//$element.data( "active"+userNames[user], -1 );
		$element.removeData( "active"+userName );
		
		// set in global data base
		$matrix.removeData( data  );
	}
	
	
	// Privates
	
	// Beat commencing at point due to netronome...
	function onEveryBeat( scope, t )
	{
		
		// check all users...
		for ( var u=0,l=userNames.length; u < l; ++u)
		{
			// fetch the user name
			var userName = userNames[u];
			var data = userName + index;
			
			
			var $element =  $matrix.data( data );
			if ($element)
			{
				
				//console.log( $element );
			
				// so we have an element in our db!
				var position = parseInt( $element.attr( "alt" ) );
				var column = position % steps;
				var key = notes - (position / steps) >> 0;
			
				console.log(userName+" Beat "+index+" in key "+key+" occurred checking "+data);
			
				// check to see if an existing note already exists
			
				//$element = $( $buttons[ index ] );
		
				// check to see if there are any nodes registered here
				//console.log( "Key found, not playing" );
				var frequency = 440 * Math.pow(2, ( (key + octave) / 12 ) );
				sine.start( frequency );
			}else{
				//console.log("No Beat "+userName+" index:"+ index+" key:"+key);
		
				//sine.stop();
				if ( u == 0 ) 
				{
					console.log("Stopping note "+ $element);
					sine.stop();
					//sine.fadeOut();
				}
			}
			
		}
		
		// move bar to correct position 
		$bar.css( "left", (index*100/16)+"%" );
		
		console.log("Beat "+index+" occurred bar : "+(index*100/16));
			
		// find relevant step
		index = (index+1) % steps;

		
		
		return true;
	}
	
	// Beat commencing at point due to netronome...
	function onProgress( scope, percent )
	{
		// scope is netronome :(
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
		selectBeat( $element, 0 );
	}
	
	// Beat has been pressed
	function onBeatDeselect($element)
	{
		deselectBeat( $element, 0 );
	}
	
	function onBeatPressed(event)
	{
		var $this = $( this );
		var isActive = $this.data( "activeA" ) || false;
		
		if (isActive) deselectBeat( $this, 0 );
		else selectBeat( $this, 0 );
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
		console.log("Beat out");
		$(this).removeClass("over");
		//$( this ).unbind( "mouseout" );
		
	}
	
	// Foreign events from web service!
	function onForeignBeat( user, step, key )
	{
		// figure out where the beat is on the system...
		var index = step * key;
		var $element = $( $buttons[ index ] );
		
		selectBeat( $element, user );
	}
	
	// Mouse events
	
	function onMouseDown(event)
	{
		mouseDown = true;
		$matrix.mouseup( onMouseUp );
	}
	function onMouseUp(event)
	{
		//sine.stop();
		mouseDown = false;
	}
	
	// Screen resize
	function onMatrixResize(event)
	{
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout( onActualResize, 500 ); 
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
			console.log( "safe height for matrix "+screenHeight+" with "+$matrix.height() );
			$content.width( "100%" );
			$content.css( "margin-left", 0 );
		}else{
			// scroll bar so readjust size
			console.log( "matrix exceeding height "+screenHeight+" with "+$matrix.height() );
			$content.width( screenHeight + "px" );
			var leftOver = $(window).width() - screenHeight;
			$content.css( "margin-left", leftOver * 0.5 );
		}
		
		
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
	
	var $buttons = $( "article.button" , $matrix );
	var $bar = $( "div.progress" , $matrix );
	
	// first check for mouse down
	$matrix.mousedown( onMouseDown );
	
	// now convert each of these boxes into a specific ID
	$buttons.mouseover( onBeatRolledOver );
	$buttons.mouseout( onBeatRolledOut );
	$buttons.click( onBeatPressed );
	
	$( window ).resize( onMatrixResize );
	
	$( window ).keydown(
		function( event ) {
			
			if ( event.which == 13 ) {
				event.preventDefault();
			}
			var user = 1;
			var step = ( Math.random() * 16 ) >> 0;
			var key = ( Math.random() * 16 ) >> 0;
			onForeignBeat( user, step, key );
			console.log("keypress "+event.which );
		}
	);
	
	onActualResize( null );
	netronome.start( 120 );
	
});
