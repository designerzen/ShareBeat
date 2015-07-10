///<reference path="definitions/jquery.d.ts" />
///<reference path="ProgressBar.ts" />
///<reference path="Step.ts" />
///<reference path="Sequences.ts" />

module sharebeat
{
	// Only sends out events from interaction of THIS matrix
	// And can therefore be used to show multiple matrices
    export class Matrix
    {
		private steps:number;
		private notes:number;
		private index:number = 0;
		
		// unique for each matrix!
		private users:Array<string>;
		private user:string = 'unknown';

		private quantity:number;
		public sequences:Sequences;
		
		private domElement;
		private beats:Array<Step> = new Array();
		private progress:sharebeat.ProgressBar;
		private mouseDown:boolean  = false;

		public callbackActivated;
		//public callbackDeactivated;
		
		constructor( domID:string, userNames:Array<string>, steps:number=16, notes:number=16, startIndex:number=0 )
		{
			this.users = userNames;
			this.index = startIndex;
			this.steps = steps;
			this.notes = notes;
			this.quantity = this.steps * this.notes;
			this.sequences = new sharebeat.Sequences( userNames, steps );
			this.create( domID, this.quantity );
			
			console.error('Creating Matrix for with '+steps+' steps and '+notes+' notes');
			console.error( this.sequences.toString() );
		}
		
		public getButtons():Array<Step>
		{
			return this.beats;
		}
		
		public getButton( id:number ):JQuery
		{
			//console.log('Button Requested '+id+" of "+this.beats.length );
			return this.beats[ id ].element;
		}
		
		public getElement( data:string ):JQuery
		{
			return this.domElement.data( data );
		}
		
		//
		public registerUser( userName:string )
		{
			console.log('Matrix user '+userName );
			this.user = userName;
			this.addListeners();
		}

		//////////////////////////////////////////////////////////////
		// SHOW this Matrix
		//////////////////////////////////////////////////////////////
		public deselectAll( userName:string ):void
		{
			// take off all of the 'activated' classes ...
			for ( var column=0; column<this.steps; ++column)
			{
				var data:string = userName + column;
				var $element =  this.getElement( data );
				if ( $element ) $element.removeClass("activated");
			}
		}
		
		public show():void
		{
			this.domElement.show();
		}
		public hide():void
		{
			this.domElement.hide();
		}

		//////////////////////////////////////////////////////////////
		// Highlight a BEAT and make it ACTIVE
		//////////////////////////////////////////////////////////////
		private toggleBeat(element, userName:string):void
		{
			// check to see if it is already pressed...
			var isActive = element.data( "active"+userName )|| false;
			//console.log("Beat selected active:"+isActive);
			if ( isActive )
			{
				//console.log("De-activating beat",element );
				this.deselectBeat( element, userName );
			}else{
				//console.log("Activating beat",element );
				this.selectBeat( element, userName );
			}
			console.error( this.sequences.toString() );
		}
		
		//////////////////////////////////////////////////////////////
		// Highlight a BEAT and make it ACTIVE
		// This may De-activate other beats in this column!
		//////////////////////////////////////////////////////////////
		public selectBeat( element:JQuery, userName:string ):void
		{
			var position:number = parseInt( element.attr( "alt" ) );
			var column:number = position % this.steps;
			
			// work out which row it is in...
			var originalKey:number = parseInt(position / this.steps) ;
			var key:number = this.notes - originalKey;
			
			var data:string = userName + column;
			var existing = this.domElement.data( data );
			var className = "selected user"+userName + " ";

			//console.log(this.user +" Selecting Beat ",position, column,originalKey, key);
			//console.log(data, this.domElement.data( data ));
			console.log(this.index+" Adding beat to user "+userName+" key:"+key+' originalKey:'+originalKey );
			
			// check for other beats within this column..
			if ( existing )
			{
				this.deselectBeat( existing, userName );
			}
			
			// check what other users are toggled...
			//var users = getOthersBeats( column );
			//console.log( users );

			// append other users onto this too
			className += this.getOthersBeatString( column );

			// This is where we do the colour magic...
			element.addClass( className ).data( "active"+userName, key );
			
			// set in global data base
			this.domElement.data( data, element  );
			
			// now shout out the callbacks if we are the main user...
			// if username hasn't been sent it wont callback either
			if ( (userName === this.user) && this.callbackActivated ) this.callbackActivated( column, originalKey );
	
			// TODO: Use this instead of DOM
			this.sequences.setUserKeyAtStep( userName, column, originalKey );
		}
		
		// fetch all foreign beats associated with this column...
		private getOthersBeatString( column:number ):string
		{
			var output:string = "";
			// go through all of the players and see if they hold data
			for ( var n, l = this.users.length; n < l ; ++n )
			{
				var userName:string = this.users[n];
				//var data = userName + column;
				//var $existing = this.getElement( data );
				//if ( $existing ) output += userName + " ";
				
				// replacement
				var key:number = this.sequences.getUserKeyAtStep( userName, column );
				if ( key > -1 ) 
				{
					// we have a note!
					output += userName + " ";
				}
			}
			return output;
		}
	
		//////////////////////////////////////////////////////////////
		// UNHLIGHLIGHT a BEAT and make it INACTIVE
		//////////////////////////////////////////////////////////////
		public deselectBeat( element:JQuery, userName:string ):void
		{
			var position:number = parseInt( element.attr( "alt" ) );
			var column = position % this.steps;
			var data = userName + column;

			// deselect on element
			element.removeClass("activated selected user"+userName).removeData( "active"+userName );

			// set in global data base
			this.domElement.removeData( data  );
			
			
			// TODO : 
			this.sequences.setUserKeyAtStep( userName, column, -1 );
		}
		
		
		//////////////////////////////////////////////////////////////
		// Select the ACTIVE step
		//////////////////////////////////////////////////////////////
		public nextStep():number
		{
			// increase!
			this.index = (this.index+1) % this.steps;	// find relevant step
			
			// move bar to correct position
			var percent:number = this.index*100/this.steps;
			
			this.progress.setProgress( percent );
			
			return this.index;
		}
		
		//////////////////////////////////////////////////////////////
		// Select the ACTIVE step
		//////////////////////////////////////////////////////////////
		public setStep( step:number ):number
		{
			var percent:number = step*100/this.steps;
			
			// move bar to correct position
			this.progress.setProgress( percent );
			this.index = step;	// find relevant step
			
			return this.index;
		}
		
		//////////////////////////////////////////////////////////////
		// Construct HTML elements
		//////////////////////////////////////////////////////////////
		private create( domID:String, quantity:number=16 ):void
		{
			this.domElement = $('#'+domID);

			// loop through here and create our 16 x 16 grid
			var boxes = "";
			var stepItem:Step;
			for ( var g=0; g < quantity; ++g )
			{
				stepItem = new sharebeat.Step( g, this.steps );
				boxes += stepItem.getMarkup();
				this.beats.push( stepItem );
			}

			// add in our progress bar
			boxes += '<div class="progress"></div>';
			
			// finally inject boxes!
			this.domElement.hide();
			this.domElement.html( boxes );
			
			// now these have injected we can reverse sniff them out
			for ( var b=0; b < quantity; ++b )
			{
				stepItem = this.beats[b];
				var stepElement:JQuery = stepItem.register();
			}

			this.progress = new sharebeat.ProgressBar( 'progress' );
			
		}
		
		private addListeners():void
		{
			// first check for mouse down
			// DOWN
			this.domElement.mousedown( e => this.onMouseDown(e) );
			this.domElement.on( "touchstart", e => this.onMouseDown(e) );
			
			//$(document).mousedown( e => this.mousedown() );
			//$(document).mousedown( function(){ alert('mouse down'); } );

			// UP
			//domElement.mouseup( this.onMouseUp );
			$(document).on( "touchend", e => this.onMouseUp(e) );
			$(document).mouseup( e => this.onMouseUp(e) );
			$(document).mouseleave( e => this.onMouseUp(e) );
			
			// now convert each of these boxes into a specific ID
			var beatButtons = $( ".sequencer--step" , this.domElement );
			beatButtons.mouseover( e => this.onBeatRolledOver(e) );
			beatButtons.mouseout( e => this.onBeatRolledOut(e) );
			beatButtons.mousedown( e => this.onBeatPressed(e) );
		}
		


		// EVENTS ===============================================
		
		private onMouseDown(event:JQueryInputEventObject):void
		{
			this.mouseDown = true;
			//console.log("mousedown:"+this.mouseDown );
		}
		private onMouseUp(event:JQueryInputEventObject):void
		{
			this.mouseDown = false;
			//console.log("mousedown:"+this.mouseDown );
		}

		//////////////////////////////////////////////////////////////
		// User is passing over a GRID item
		//////////////////////////////////////////////////////////////
		private onBeatRolledOver(event: JQueryMouseEventObject ):void
		{
			var element = $(event.currentTarget);
			
			if (this.mouseDown) this.toggleBeat( element, this.user );
			else element.addClass("over");
			
			//console.log("Beat over "+element+" mousedown:"+this.mouseDown );
		}
		
		//////////////////////////////////////////////////////////////
		// User hass passing over and now out of a GRID item
		//////////////////////////////////////////////////////////////
		private onBeatRolledOut(event: JQueryMouseEventObject ):void
		{
			var element = $(event.currentTarget);
			
			//console.log("Beat out "+element+" mousedown:"+this.mouseDown);
			element.removeClass("over");
			//$( this ).unbind( "mouseout" );
		}

		//////////////////////////////////////////////////////////////
		// BEAT Pressed -> Check states and cause updates
		//////////////////////////////////////////////////////////////
		private onBeatPressed(event: JQueryMouseEventObject):void
		{
			var element = $(event.currentTarget);
			this.toggleBeat( element, this.user );
		}

	}

}
