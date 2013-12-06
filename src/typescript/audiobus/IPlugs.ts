/*

this is a common interface that all components adhere to

The main points to notice :
	
	setInput 
	getInput 

	setOutput
	getOutput
*/

interface Navigator {
			getUserMedia(
				options: { video?: boolean; audio?: boolean; }, 
				success: (stream: any) => void, 
				error?: (error: string) => void
				) : void;
		}