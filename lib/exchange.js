// MIT License / Copyright 2015

'use strict';

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave.Exchange' )

const events = require( 'events' )
const fs = require( 'fs' )
const path = require( 'path' )
const url = require( 'url' )
const Spirit = require( 'string-spirits' )

// Declare our exchange states as constants, for verbosity
const [ NEW, HEAD, BODY, COMPLETE ] = [ 0, 1, 2, 3 ]

// end packet buffer for connection: keep-alive
const n = Buffer.from( '\r\n' )
const z = Buffer.from( '0\r\n\r\n' )

// A generic class to describe errors to the client.
weave.HTTPError = class HTTPError {
  constructor( code, error ) {
    if ( typeof code !== 'number' ) return garden.typeerror( 'HTTPError requires argument code to be a number!' )

    let desc, stack
    if ( typeof error === 'string' ) desc = error
    else if ( error != null ) [desc, stack] = [ `${error.name}: ${error.message}`, error.stack ]

    Object.defineProperties( this, {
      status: { value: weave.constants.STATUS_CODES[ code ], enumerable: true },
      statusCode: { value: code, enumerable: true },
      description: { value: desc, enumerable: true },
      stack: { value: stack, enumberable: !!stack }
    })
  }
}

// Manifest is a small class to describe the *response* to the exchange.
weave.Manifest = class Manifest {
  isDirectory() { return this.type === "directory" }
  isFile()      { return this.type === "file" }
  isInterface() { return this.type === "interface" }
  // XXX: What is this even for?
  isNA() { return this.type === "na" } // Not applicable.
                                       // This might not be the best name though.

  extend( more ) {
    if ( more != null ) Object.keys( more ).forEach( prop => this[ prop ] = more[ prop ] );
    return this
  }

  constructor( more ) {
    if ( more ) this.extend( more )
  }
}


// The Exchange class determines which App is responsible
// for handling the ClientRequest and ServerResponse
// as well as interfacing between them.
weave.Exchange = class Exchange extends events.EventEmitter {
	constructor( secure, request, response ) {
		// Make it an EventEmitter
		super()

    // Shortcut, because we kind of use this a lot and it's very verbose.
    const binding = weave.bindings[ request.connection.localPort ]

    // Make sure the Host header is valid, and strip off the port number if necessary.
		const hostMatch = request.headers.host && /^([A-Za-z0-9\-\.\[\]\:]+?)(\:(\d{1,5}))?$/.exec( request.headers.host )

    // Normalize the path before parsing to prevent any ../ tomfoolery
    const normalizedUrl = url.parse( path.normalize( request.url ) )
    const urlProperties = {
      protocol: secure ? 'https:' : 'http:',
  	  slashes: '//',
  		hostname: hostMatch[1],
  	  port: request.connection.localPort,
  	  host: hostMatch[1] + ':' + request.connection.localPort
    }

    Object.assign( this, {
      // Set UUID, state constants, and garden
  		NEW, HEAD, BODY, COMPLETE,

      // Save these here, mainly for internal use with the classes methods.
  	  // Ideally these wouldn't be used outside of Weave. All interactions
  	  // with them should be through using methods of the Connection class.
      _NODE_CONNECTION: request.connection,
      _NODE_REQUEST: request,
      _NODE_RESPONSE: response,

  		// Set directory to an empty string for length comparisons.
  		directory: '',
      date: new Date(),
  	  state: NEW,

      // requestUrl should remain unchanged and read-only. relativeUrl is used
      // to handle subdirectories and mounts.
      requestUrl: Object.assign( {}, normalizedUrl, urlProperties ),
      relativeUrl: Object.assign( { prefix: '', depth: 0 }, normalizedUrl, urlProperties ),

  	  // What kind of Connection are we dealing with?
  	  method: request.method,
  	  isKeepAlive: /keep-alive/i.test( request.headers.connection ),
  	  isUpgrade: /upgrade/i.test( request.headers.connection ),
      secure
    })

    // If we don't have a valid Host header then there's no way to figure
	  // out which app is supposed to be used to handle the Connection.
	  if ( !hostMatch ) return this.generateErrorPage( new weave.HTTPError( 400, 'Request must have a valid Host header.' ) )

		// This is so that we don't start forwarding data until someone is listening
		// to it, since we don't implement a Readable Stream, we just forward events.
		this.on( 'newListener', event => {
			if ( event === 'data' ) {
				request.on( 'data', data => this.emit( 'data', data ) )
				this.removeAllListeners( 'newListener' )
			}
		})

    // Debug inspecting
    garden.debug( this.method, this.requestUrl )
    garden.time( this.requestUrl.pathname )

	  // Check for a direct host match, or a cached wildcard match.
	  // If there isn't one, check against wildcards, filtering out hosts
	  // that don't contain at least one wildcard since they won't match.
	  if ( binding.attachments[ this.requestUrl.hostname ] ) {
	    this.app = binding.attachments[ this.requestUrl.hostname ]
	  } else if ( binding.hostMatches[ this.requestUrl.hostname ] ) {
	    this.app = binding.hostMatches[ this.requestUrl.hostname ]
	  } else {
      let appHostName = Spirit.bestMatch(
	      Object.keys( binding.attachments ).filter( hostname => /\*/.test( hostname ) ), this.requestUrl.hostname
      ).toString()

	    // If there isn't a linked app then just end the connection.
			if ( !appHostName ) {
	      // XXX: Should we really do this silently? Or should we report?
      	// We're trying to pretend that there isn't a server connected but
	      // is that really a good idea? We should probably tell someone that
	      // the server is connected and just not active. Maybe a 501.
				garden.warning( 'Incoming connection rejected. No app found.' )
	      return request.connection.destroy()
			}

			// Remember which wildcard best matched this host for next time
			this.app = binding.hostMatches[ this.requestUrl.hostname ] = binding.attachments[ appHostName ]
		}

	  // Check to see if we've already found the configuration for this path.
	  // If not check to see if there's a directory with a configuration that
	  // matches the URL we're processing and cache it. If there are multiple
	  // matches we check it against the longest match to see if it's longer.
	  // The longest match should always be the most specific configuration.
	  if ( this.app.cache.parentDirectories[ this.requestUrl.pathname ] ) {
	    this.directory = this.app.cache.parentDirectories[ this.requestUrl.pathname ]
			this.configuration = this.app.configuration[ this.directory ]
	  } else {
	    Object.keys( this.app.configuration ).forEach( dir => {
        // The 2nd condition ensures that the client is requesting *this*
				// directory, and not a file or directory with a longer, overlapping
				// name. Trailing slashes are sanitized on directory names in weave.App,
				// so the forward slash will always 1 character after the dir name.
        if ( this.requestUrl.pathname.startsWith( dir )
        && ( this.requestUrl.pathname === dir || this.requestUrl.pathname.charAt( dir.length ) === "/" )
        && dir.length > this.directory.length ) {
          this.directory = this.app.cache.parentDirectories[ this.requestUrl.pathname ] = dir
					this.configuration = this.app.configuration[ this.directory ]
        }
	    })
	  }

	  if ( this.configuration ) {
			// If we found a matching directory with a configured location,
			// shorten the URL relative to the directory.
			if ( this.configuration.location ) {
				this.relativeUrl.pathname = path.join( '/', path.relative( this.directory, this.requestUrl.pathname ) )
				this.relativeUrl.prefix = this.directory
			} else if ( this.configuration.type === 'interface' ) {
				return this.handleInterface()
			}

			// Refuse access if specified to do so
      // TODO: This isn't very good for mounts/subdirectories
			if ( this.configuration.hasOwnProperty( 'access' ) ) {
				if ( this.configuration.access === false
				  || this.configuration.access[ this.requestUrl.pathname ] === false )
					return this.generateErrorPage( new weave.HTTPError( 403, 'Access to this URL has been blocked.' ) )
			}
		}

    // TODO: These should be improved to be more robust, especially secure.
    // We should make the secure port configurable, just in case.
    // We also still need to make it so that you can force secure, but only on
    // certain paths.
		// Enforce default domains
		let domain = this.behavior( 'domain' )
		if ( typeof domain === 'string' && domain !== this.requestUrl.hostname )
			return this.redirect( url.format( Object.assign({
        host: `${domain}:${this.requestUrl.port}` }, this.requestUrl ) ))

		// Enforce secure connections
		let force = this.behavior( 'secure' )
		if ( force && !secure )
      return this.redirect( url.format( Object.assign({
        protocol: 'https:', host: `${this.requestUrl.hostname}:443` }, this.requestUrl ) ))

		// Send our freshly configured exchange to the proper places
    this.app.emit( 'exchange', this )
		this.route()
	}

  // Methods for getting information about the request

	behavior( name ) {
		if ( typeof name !== 'string' ) return garden.typeerror( 'Configuration behavior must be a string' )

	  let behavior, point
	  let nests = name.split(" ")
		let scopes = ( this.configuration ? [ this.configuration,
			this.configuration._super ] : [] ).concat([ this.app.configuration, weave.configuration ])

	  // Load in order of priority. Check the most relevant configurations first.
	  scopes.some( ( cursor, x ) => {
	      // Make sure the cursor actually exists, in case
	      // this.configuration._super isn't defined.
	      if ( cursor ) {
	        // If the cursor follows all the way to the requested property
	        // then set the behavior and return true to stop checking.
	        if ( nests.every( nest => cursor = cursor[ nest ] ) ) {
	          behavior = cursor
						point = x

						return true;
	        }
	      }
	  } )

		// If the location begins with ~, replace it with the users home directory.
		if ( name === 'location' && typeof behavior === 'string' )
			behavior = behavior.replace( /^~/, weave.constants.HOME )

		// Crazy bug fix for inherited error pages
		if ( nests[0] === 'errorPages'
		&& this.configuration && this.configuration.location
		&& point > 0 && scopes[ point ].location ) {
			behavior = path.join( path.relative( this.configuration.location, scopes[ point ].location ), behavior )
		}

	  // Return the matching behavior. If we didn't find one this should
	  // still just be undefined.
	  return behavior
	}

	detail( name, untampered ) {
	  // Make sure the header name is lowercase, so that it
	  // can be case insensitive.
		name = name.toLowerCase()
	  let header = this._NODE_REQUEST.headers[ name ]

	  // If untampered is true then the header must be returned as a
	  // plain string. If it's not, then we can do some processing
	  // to make it more useful than a string.
	  if ( !untampered ) {
	    switch ( name ) {
	      case "if-modified-since":
	        if ( header ) return new Date( header )
	        break;
	      case "cookie":
	        // I think this is how we parse cookies but I suck at them???
					if ( typeof header === 'string' ) {
						let data = {}
            let value
						header.split( ';' ).forEach( cookie => {
              [ cookie, ...value ] = cookie.trim().split( '=' )
							data[ cookie ] = value || true
						})
						return data
					}
	        break;
	    }
	  }

	  // If something else hasn't already been returned, or if untampered
	  // is true then just return the header as a normal string.
	  return header
	}

  read( encoding = 'utf-8', timeout = 3000 ) {
    return new Promise( ( fulfill, reject ) => {
      let temper = setTimeout( () => {
        reject( this.garden.warn( 'No data to read!' ) )
      }, timeout )

      this.once( 'data', data => {
        clearTimeout( temper )
        fulfill( data.toString( encoding ) )
      })
    })
  }

  // Methods for sending a response for the client.

	status( status ) {
    // Check to make sure the status is valid, and has not yet been written.
	  if ( this.state !== NEW ) return garden.error( `Cannot write status ${status} to HTTP stream, already wrote ${this._WRITTEN_STATUS}!` )
		if ( typeof status !== 'number' ) return garden.typeerror( `Status ${status} is not a number!` )

	  this._NODE_CONNECTION.write( `HTTP/1.1 ${status} ${weave.constants.STATUS_CODES[status]}\r\n` )
		this._WRITTEN_STATUS = status
		this._WRITTEN_HEADERS = {}
	  this.state = HEAD

	  return this
	}

	header( header, value = true ) {
		// To write headers we must have a status, no body, and a valid header name.
		if ( typeof header !== 'string' ) return garden.typeerror( 'Header arugment must be a string' )
	  if ( this.state > HEAD ) return garden.error( 'Headers already sent!' )

		if ( this.state === NEW ) this.status( 200 )

		// You can't cache an error!
		if ( header.toLowerCase() === "last-modified" && this._STATUS >= 300 ) {
			garden.warning( "You can't cache an error!" )
		}

		this._WRITTEN_HEADERS[ header ] = value
		this._NODE_CONNECTION.write( `${header}: ${value}\r\n` )

	  return this
	}

	head( status, headers ) {
		if ( typeof status !== 'number' ) {
			headers = status
			status = 200
		}

		if ( !headers ) return garden.error( 'No headers given to weave.Exchange::head!' )

	  if ( !this._WRITTEN_STATUS ) this.status( status )
	  Object.keys( headers ).forEach( name => this.header( name, headers[ name ] ) )

	  return this
	}

	hasBody() {
		return this.method !== 'HEAD' && this._STATUS !== 304
	}

	// XXX: Is the connection keep-alive or close?
	// TODO: Check before assuming Transfer-encoding: chunked
	// XXX: Should we only support Keep-Alive and chunked??
	// TODO: Check before writing the Date header as well. Or disallow anyone else
	// from writing it with a condition in ::writeHeader().
	write( content, encoding ) {
	  if ( this.state === COMPLETE ) return garden.error( 'Cannot write data, response has already been completed.' )
		if ( typeof content !== 'string' && !Buffer.isBuffer( content ) )
			return garden.typeerror( 'Content must be a string or buffer' )

    if ( this.state < BODY ) {
      // Write preconfigured constant headers, if they are specified, and a Date header.
  		this.head( Object.assign( { 'Date': this.date.toUTCString() }, this.behavior( 'headers' ) ) )

  		// this.isKeepAlive ?
  		this.header( 'Transfer-Encoding', 'chunked' )
  			// : this.writeHeader( "Content-Length", 0 ) // content.length ) uhh how does this work now that I moved it???

  	  this._NODE_CONNECTION.write( n )
  	  this.state = BODY
    }

		if ( this.hasBody() ) {
	    if ( this.isKeepAlive ) {
	      let buf = Buffer.concat( [
	        Buffer.from( Buffer.byteLength( content, encoding ).toString( 16 ) ), n,
	        Buffer.from( content, encoding ), n ] )

	      this._NODE_CONNECTION.write( buf )
	    } else {
				// this.writeHeader( 'Content-Length', content.length )
				// XXX: I don't know if this is 100%, but I think it is.
	      this._NODE_CONNECTION.write( content, encoding )
				this._NODE_CONNECTION.end()
	    }
		}

	  return this
	}

	end( ...args ) {
	  // Write any data given, and then send the "last chunk"
	  if ( args.length > 0 ) this.write( ...args )
		// Firefox will hang on requests if there is no body present,
		// such as 3xx redirects, so write a blank one.
		if ( this.state < BODY ) this.write('')

	  // Keep the connection alive or kill it
	  // this.isKeepAlive ?
	  this._NODE_CONNECTION.write( z )
	    // : this._NODE_CONNECTION.end()

    garden.timeEnd( this.requestUrl.pathname )

	  this.state = COMPLETE
		return this
	}

  // Utilities for quickly finishing responses

	redirect( location, status = 301 ) {
		if ( location === 304 ) return this.status( 304 ).end()
		if ( typeof location !== 'string' ) return garden.typeerror( 'Redirect location is not a string!' ) && this.generateErrorPage( 500 )
		if ( typeof status !== 'number' || status < 300 || status > 399 ) return garden.error( 'Invalid redirect status!' ) && this.generateErrorPage( 500 )

		return this.head( status, { 'Location': location } ).end()
	}

	generateErrorPage( error ) {
		// Make sure we can generate a valid error page.
		if ( typeof error === 'number' ) error = new weave.HTTPError( error )
		else if ( !( error instanceof weave.HTTPError ) ) return garden.error( 'generateErrorPage requires an instance of weave.HTTPError or a number!' )

    // If it was a server error, log it
    if ( error.statusCode >= 500 ) garden.catch( error.description )

		// Get the manifest ready for the printer, and make the printer easy to call.
		let manifest = new weave.Manifest({ url: this.url })
		let print = more => this.printer( error, manifest.extend( more ), this )

    // Search for a path for an error file.
    let cursor = this.app && this.behavior( 'location' )
    let errorPageName = this.app && this.behavior( `errorPages ${error.statusCode}` )
		if ( !errorPageName ) return print()

		// TODO: Make sure this actually works, so that we can have absolute paths.
		// If it doesn't work, then switch it back to .join for now.
		let errorPagePath = cursor
			? path.resolve( cursor, errorPageName )
			: errorPageName

		fs.stat( errorPagePath, ( serror, stats ) => {
			print( !serror && stats.isFile() ? { path: errorPagePath, stats: stats, type: 'file' } : null )
		})
	}
}
