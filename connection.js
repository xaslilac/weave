// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.Connection' )

let events = require( 'events' )
let fs = require( 'fs' )
let path = require( 'path' )
let url = require( 'url' )
let Wildcard = require( './utilities/Wildcard' )

// n is a CRLF buffer, z is an end packet buffer.
const n = new Buffer('\r\n')
const z = new Buffer('0\r\n\r\n')

// The Connection class determines which App is responsible
// for handling the ClientRequest and ServerResponse
// as well as interfacing between them.
weave.Connection = class Connection extends events.EventEmitter {
	constructor( i, o ) {
		// Make it an EventEmitter
		super()

		// For time tracking and caching purposes, save the time that
	  // the connection first began processing. Initialize the state.
	  this.date = new Date()
	  this.state = 0

	  // What kind of Connection are we dealing with?
	  this.method      = i.method
	  this.isKeepAlive = i.headers.connection === "keep-alive"
	  this.isUpgrade   = i.headers.connection === "Upgrade"

	  // If we don't have a valid Host header then there's no way to figure
	  // out which app is supposed to be used to handle the Connection.
	  if ( !i.headers.host ) return this.generateErrorPage( new weave.HTTPError( 400, 'Request must have a Host header.' ) )
		let hostMatch = i.headers.host.match( /^(.+?)(\:([0-9]{1,5}))?$/ )
		if ( !hostMatch ) return this.generateErrorPage( new weave.HTTPError( 400, 'Invalid Host header.' ) )

	  // Save these here, mainly for internal use with the classes methods.
	  // Ideally these wouldn't be used outside of Weave. All interactions
	  // with them should be through using methods of the Connection class.
	  this._NODE_CONNECTION = i.connection,
	  this._NODE_REQUEST = i, this._NODE_RESPONSE = o

	  // Normalize the url to prevent anyone being sneaky with, say, some "../../"
	  // tomfoolery to get low level file system access, and fill in the blanks.
		this.url = url.parse( path.normalize( i.url ) )
	  this.url.protocol = "http:"
	  this.url.slashes = "//"
		this.url.hostname = hostMatch[1]
	  this.url.port = i.connection.localPort
	  this.host = this.url.host = this.url.hostname + ':' + this.url.port

	  // Check for a direct host match, or a cached wildcard match.
	  // If there isn't one, check against wildcards, filtering out hosts
	  // that don't contain at least one wildcard since they won't match.
	  if ( weave.hosts[ this.host ] ) {
	    this.app = weave.hosts[ this.host ].app
	  } else if ( weave.cache.wildcardMatches[ this.host ] ) {
	    this.app = weave.hosts[ weave.cache.wildcardMatches[ this.host ] ]
	  } else {
			let appName = Wildcard.bestMatch(
	      Object.keys( weave.hosts ).filter( host => /\*/.test( host ) ),
	    this.host )

	    // If there isn't a linked app then just end the connection.
			if ( !appName ) {
	      // XXX: Should we really do this silently? Or should we report?
      	// We're trying to pretend that there isn't a server connected but
	      // is that really a good idea? We should probably tell someone that
	      // the server is connected and just not active. Maybe a 501.
				garden.warning( "Incoming connection rejected. No app found." )
	      return i.connection.destroy()
			}

			// Remember which wildcard best matched this host for next time
			weave.cache.wildcardMatches[ this.host ] = appName
			this.app = weave.hosts[ appName ]
		}

		// Give each connection a UUID for a little bit of tracing.
		this.UUID = weave.Connection.generateUUID()
		// Set directory to an empty string for length comparisons.
		this.directory = ''

	  // Check to see if we've already found the configuration for this path.
	  // If not check to see if there's a directory with a configuration that
	  // matches the URL we're processing and cache it. If there are multiple
	  // matches we check it against the longest match to see if it's longer.
	  // The longest match should always be the most specific configuration.
	  if ( this.app.cache.parentDirectories[ i.url ] ) {
	    this.directory = this.app.cache.parentDirectories[ i.url ]
	  } else {
	    Object.keys( this.app.configuration ).forEach( dir => {
        // The 2nd condition ensures that the client is requesting *this*
				// directory, and not a file or directory with a longer, overlapping
				// name. Trailing slashes are sanitized on directory names in weave.App,
				// so the forward slash will always 1 character after the dir name.
        if ( i.url.startsWith( dir )
        && ( i.url === dir || i.url.charAt( dir.length ) === "/" )
        && dir.length > this.directory.length ) {
          this.directory = this.app.cache.parentDirectories[ i.url ] = dir
        }
	    })
	  }

	  if ( this.directory ) {
			// If we found a matching directory, shorten the URL relative to the directory.
			this.url.path = path.join( '/', path.relative( this.directory, this.url.path ) )
			this.configuration = this.app.configuration[ this.directory ]

			if ( this.configuration.type === 'interface' ) {
		    this.url.description = path.relative( this.directory, this.url.pathname )

				let manifest = new weave.Manifest( { url: this.url, type: 'interface' } )
		    let handle = this.configuration[ this.method ] || this.configuration.any
		    if ( typeof handle !== 'function' ) return this.generateErrorPage(new weave.HTTPError( 405 ))

				try {
					Promise.resolve( handle.call( this.app, this, manifest ) )
						.catch( conf => {
							if ( conf instanceof Error )
								return this.generateErrorPage(new weave.HTTPError( 500, conf ))

							this.configuration = conf
							this.app.emit( 'connection', this )
							this.app.route( this )
						})
				} catch ( error ) {
					this.generateErrorPage(new weave.HTTPError( 500, error ))
				}

				// Once the handle has been started, we can start listening for data.
				i.on( 'data', data => this.emit( 'data', data ) )

		    return
			}
		}

    // Begin emiting data and connection events
    this.app.emit( 'connection', this )
		i.on( 'data', data => this.emit( 'data', data ) )

		// Begin routing the connection
		 try { this.app.route( this ) }
		 catch ( error ) { this.generateErrorPage(new weave.HTTPError( 500, error )) }
	}

	static generateUUID() {
		return weave.util.RNDM_RG(0x10000000,     0xFFFFFFFF,     16) + "-" +
					 weave.util.RNDM_RG(0x1000,         0xFFFF,         16) + "-" +
					 weave.util.RNDM_RG(0x4000,         0x4FFF,         16) + "-" +
					 weave.util.RNDM_RG(0x8000,         0xBFFF,         16) + "-" +
					 weave.util.RNDM_RG(0x100000,       0xFFFFFF,       16) + // The last range has to be split into
					 weave.util.RNDM_RG(0x100000,       0xFFFFFF,       16)   // two calls because it has more digits
																																		// than Math.random() generates
	}

	behavior( name ) {
		if ( typeof name !== 'string' ) return garden.typeerror( 'Configuration behavior must be a string' )

	  let behavior
	  let nests = name.split(" ")
		let scopes = this.configuration ? [ this.configuration, this.configuration._super ] : []

	  // Load in order of priority. Check the most relevant configurations first.
	  scopes.concat([ this.app.configuration, weave.configuration ]).some( cursor => {
	      // Make sure the cursor actually exists, in case
	      // this.configuration._super isn't defined.
	      if ( cursor ) {
	        // If the cursor follows all the way to the requested property
	        // then set the behavior and return true to stop checking.
	        if ( nests.every( nest => cursor = cursor[ nest ] ) ) {
	          behavior = cursor
	          return true;
	        }
	      }
	  } )

		// If the location begins with ~, replace it with the users home directory.
		// weave.constants.HOME normalizes the API for Node across different platforms.
		if ( name === 'location' && typeof behavior === 'string' )
			behavior = behavior.replace( /^~/, weave.constants.HOME )

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
	        if ( header ) { return new Date( header ) }
	        break;
	      case "cookie":
	        // I think this is how we parse cookies but I suck at them???
					if ( typeof header === 'string' ) {
						let data = {}
						header.split( ';' ).forEach( cookie => {
							cookie = cookie.trim().split( '=' )
							data[cookie.shift()] = cookie.join( '=' ) || true
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

	status( status ) {
	  // Check to make sure the status is valid, and has not yet been written.
	  if ( this.state !== 0 ) { return garden.warning( `Cannot write status ${status} to HTTP stream, already wrote ${this._WRITTEN_STATUS}!` ) }
		if ( typeof status !== 'number' ) { return garden.typeerror( 'IStatus is not a number!', status ) }

	  this._NODE_CONNECTION.write( `HTTP/1.1 ${status} ${weave.constants.STATUS_CODES[status]}\r\n` )
		this._WRITTEN_STATUS = status
		this._WRITTEN_HEADERS = {}
	  this.state = 1

	  return this
	}

	writeHeader( header, value = true ) {
		// To write headers we must have a status, no body, and a valid header name.
		if ( typeof header !== 'string' ) return garden.typeerror( 'Header arugment must be a string' )
	  if ( this.state > 1 ) return garden.error( 'Headers already sent!' )

		if ( this.state === 0 ) this.status( 200 )

		// You can't cache an error!
		if ( header.toLowerCase() === "last-modified" && this._STATUS >= 300 ) {
			garden.warning( "You can't cache an error!" )
		}

		this._WRITTEN_HEADERS[ header ] = value
		this._NODE_CONNECTION.write( `${header}: ${value}${n}` )

	  return this
	}

	writeHead( status, headers ) {
		if ( typeof status !== 'number' ) {
			headers = status
			status = 200
		}

		if ( !headers ) return garden.error( 'No headers given to weave.Connection::writeHead!' )

	  if ( !this._WRITTEN_STATUS ) this.status( status )
	  Object.keys( headers ).forEach( name => this.writeHeader( name, headers[ name ] ) )

	  return this
	}

	endHead( header, value ) {
	  // If there's an actual header to right, then right it.
	  // Then end the header and start righting the body.
	  if ( header ) this.writeHeader( header, value )

		// Write preconfigured constant headers, if they are specified, and a Date header.
		this.writeHead( Object.assign( { 'Date': this.date.toUTCString() }, this.behavior( 'headers' ) ) )

		this.isKeepAlive ?
			this.writeHeader( "Transfer-Encoding", "chunked" ) :
			this.writeHeader( "Content-Length", 0 ) // content.length ) uhh how does this work now that I moved it???

	  this._NODE_CONNECTION.write( n )
	  this.state = 2

	  return this
	}

	hasBody() {
		return this.method !== "HEAD" && this._STATUS !== 304
	}

	// XXX: Is the connection keep-alive or close?
	// TODO: Check before assuming Transfer-encoding: chunked
	// XXX: Should we only support Keep-Alive and chunked??
	// TODO: Check before writing the Date header as well. Or disallow anyone else
	// from writing it with a condition in ::writeHeader().
	write( content, encoding ) {
	  // If we aren't writing the body yet, right some final headers.
	  if ( this.state === 3 ) {
			return garden.error( "Cannot write data, response has already been completed." )
		}

	  if ( this.state < 2 ) {
	    this.endHead()
	  }

		if ( this.hasBody() ) {
	    if ( this.isKeepAlive ) {
	      let buf = Buffer.concat( [
	        new Buffer( Buffer.byteLength( content, encoding ).toString( 16 ) ), n,
	        new Buffer( content, encoding ), n ] )

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
		if ( this.state < 2 ) this.write('')

	  // Keep the connection alive or kill it
	  this.isKeepAlive
	    ? this._NODE_CONNECTION.write( z )
	    : this._NODE_CONNECTION.end()

	  this.state = 3
		return this
	}

	redirect( location, status = 301 ) {
		if ( typeof location !== 'string' ) return garden.typeerror( 'Redirect location is not a string!' ) && connection.generateErrorPage( 500 )
		if ( typeof status !== 'number' || status < 300 || status > 399 ) return garden.error( 'Invalid redirect status!' ) && connection.generateErrorPage( 500 )

		return this.writeHead( status, { 'Location': location } ).end()
	}

	generateErrorPage( error ) {
		// Make sure we can generate a valid error page
		if ( typeof error === 'number' ) error = new weave.HTTPError( error )
		else if ( !error instanceof weave.HTTPError ) return garden.error( 'generateErrorPage requires a weave.HTTPError argument!' )
		if ( error.statusCode >= 500 ) garden.error( error.description )

		// Get the manifest ready for the printer, and make the printer easy to call.
		let manifest = new weave.Manifest( { url: this.url } )
		let print = more => weave.App.prototype.printer( error, manifest.extend( more ), this )
    let cursor = this.app && this.behavior( 'location' )
    let errorPageName = this.behavior( `errorPages ${error.statusCode}` )
		if ( !errorPageName ) return print()

		// TODO: Make sure this actually works, so that we can have absolute paths.
		// If it doesn't work, then switch it back to .join for now.
		let errorPagePath = cursor
			? path.resolve( cursor, errorPageName )
			: errorPageName

		fs.stat( errorPagePath, ( serror, stats ) => {
			print( !serror && stats.isFile ? { path: errorPagePath, stats: stats, type: 'file' } : null )
		})
	}
}





// Create destroy, pause, and resume reference methods.
;['destroy', 'pause', 'resume'].forEach( name => weave.Connection.prototype[name] = () => this._NODE_CONNECTION[name]() )
