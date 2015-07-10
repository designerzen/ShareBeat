///<reference path="definitions/jquery.d.ts" />
//<reference path="lib.d.ts" />

module sharebeat
{
	// Reference :
	// https://github.com/bradvin/social-share-urls
    export class Share
    {
		private iconGoogle:string 	= '<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><title>Google+</title><g fill="none" fill-rule="evenodd"><path d="M.5.18h55.127v55.127H.5V.18z" fill="#DD4B39"/><path d="M28.49 29.307c-.54-.38-1.57-1.31-1.57-1.855 0-.64.18-.954 1.144-1.707.986-.77 1.685-1.855 1.685-3.115 0-1.5-.67-2.963-1.924-3.446h1.89l1.336-.965h-5.966c-2.674 0-5.19 2.026-5.19 4.372 0 2.4 1.822 4.335 4.543 4.335.19 0 .372-.004.552-.017-.176.338-.303.72-.303 1.113 0 .667.358 1.208.81 1.65-.342 0-.673.01-1.032.01-3.314 0-5.864 2.11-5.864 4.297 0 2.155 2.796 3.503 6.108 3.503 3.777 0 5.863-2.143 5.863-4.298 0-1.728-.51-2.763-2.086-3.878zM25.3 26.32c-1.537-.047-2.998-1.72-3.263-3.74-.266-2.017.765-3.562 2.3-3.517 1.538.047 3 1.665 3.264 3.684.265 2.02-.765 3.618-2.302 3.572zM24.7 36.53c-2.29 0-3.944-1.45-3.944-3.19 0-1.707 2.052-3.128 4.342-3.103.534.006 1.032.09 1.484.238 1.243.864 2.134 1.352 2.386 2.338.047.2.073.405.073.615 0 1.742-1.12 3.1-4.34 3.1z" fill="#FFF"/><path d="M34.846 26.494v-2.322h-1.87v2.322h-2.32v1.87h2.32v2.322h1.87v-2.322h2.323v-1.87h-2.324" fill="#FFF"/></g></svg>';
		private iconFacebook:string	= '<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><g fill="none" fill-rule="evenodd"><path d="M.32.183h55.127V55.31H.32V.183z" fill="#3B5998"/><path d="M32.446 24.287h-3.108V22.25c0-.766.507-.945.865-.945h2.192V17.94l-3.02-.01c-3.352 0-4.114 2.508-4.114 4.114v2.243h-1.938v3.467h1.94v9.81h4.076v-9.81h2.75l.358-3.467" fill="#FFF"/></g></svg>';
		private iconTwitter:string 	= '<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><title>Twitter</title><g fill="none" fill-rule="evenodd"><path d="M.106.183h55.127V55.31H.106V.183z" fill="#00ACED"/><path d="M37.09 21.016c-.728.352-1.504.58-2.325.685.837-.538 1.48-1.387 1.784-2.404-.784.497-1.65.852-2.575 1.06-.735-.85-1.79-1.38-2.95-1.38-2.234 0-4.045 1.946-4.045 4.354 0 .338.035.673.102.988-3.355-.174-6.34-1.914-8.336-4.544-.346.642-.545 1.388-.545 2.19 0 1.506.714 2.848 1.8 3.617-.663-.026-1.287-.21-1.832-.54v.06c0 2.105 1.395 3.862 3.245 4.27-.34.097-.698.143-1.07.143-.258 0-.505-.018-.755-.078.513 1.737 2.008 2.998 3.777 3.023-1.385 1.174-3.128 1.864-5.023 1.864-.328 0-.65-.02-.966-.06 1.79 1.24 3.912 1.964 6.2 1.964 7.44 0 11.51-6.638 11.51-12.39 0-.186-.004-.372-.013-.558.79-.623 1.476-1.39 2.018-2.262" fill="#FFF"/></g></svg>';
		
		constructor(){}
		
		
		public getGoogle( text:string, url:string ):string
		{
			var google:string = '<a href="https://plus.google.com/share?';
			google += 'url=' + escape(url);	// url
			google += '" target="_blank" title="Google+">';
			return google + text + '</a>';
		}
		
		// https://twitter.com/share?url={url}&text={title}&via={via}&hashtags={hashtags}
		public getTwitter( text:string, url:string, title:string, hashTags:string='' ):string
		{
			var twitter:string = '<a href="https://twitter.com/intent/tweet?';
			twitter += 'text=' + title;		// title
			twitter += '&url=' + escape(url);	// url
			if (hashTags) twitter += '&hashtags=' +escape(url);	// url
			//twitter += '&via=wdweekly';
			twitter += '" target="_blank" title="twitter">';	
			return twitter + text + '</a>';
		}
		
		
		public getFacebook( text:string, url:string ):string
		{
			var facebook:string = '<a href="https://www.facebook.com/sharer/sharer.php?u=';
			facebook += escape(url);	// url
			facebook += '" target="_blank" title="Facebook">';
			return facebook + text + '</a>';
		}
		
		public getMarkup( text:string, url:string, title:string, showIcons:boolean=true ):string
		{
			// anchors...
			if (showIcons)
			{
				// replace text with icons?
			}
			
			var facebook:string = (showIcons) ? this.getFacebook( this.iconFacebook + text, url ) : this.getFacebook( text, url );
			var google:string = (showIcons) ? this.getGoogle( this.iconGoogle + text, url ) :  this.getGoogle( text, url );
			var twitter:string = (showIcons) ? this.getTwitter( this.iconTwitter + text, url, title ) : this.getTwitter( text, url, title );
			
			var output:string = '<ul class="share">';
			
			output += '<li class="share--twitter">'+twitter+'</li>';
			output += '<li class="share--facebook">'+facebook+'</li>';
			output += '<li class="share--google">'+google+'</li>';
			
			return output;
		}
	}
	
}
