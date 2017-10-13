// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.Connection' )

let events = require('events')
let fs = require( 'fs' )
let http = require( 'http' )
let path = require( 'path' )
let util = require( 'util' )
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

	  // If we don't have a Host header then there's no way to figure
	  // out which app is supposed to be used to handle the Connection.
	  if ( !i.headers.host )
	    this.generateErrorPage(
				new weave.HTTPError( 400, `The request is missing the
			  Host header that is required to determine how to direct it.` ) )

	  // Save these here, mainly for internal use with the classes methods.
	  // Ideally these wouldn't be used outside of Weave. All interactions
	  // with them should be through using methods of the Connection class.
	  this._NODE_CONNECTION = i.connection,
	  this._NODE_REQUEST = i, this._NODE_RESPONSE = o

	  // Give each connection a UUID for a little bit of tracing.
	  this.UUID = weave.Connection.generateUUID()
	  // Initialize @directory for the initial length comparisons.
	  this.directory = ""
	  // Normalize the url to prevent anyone being sneaky with, say, some "../../"
	  // tomfoolery to get low level file system access.
		this.url = url.parse( path.normalize( i.url ) )
	  // File out the url object with all the missing standard properties.
	  this.url.protocol = "http:"
	  this.url.slashes = "//"
	  // hostname should never have the port, but the host header sometimes will.
		this.url.hostname = this.get( 'host' ).match( /^(.+?)(\:([0-9]{1,5}))?$/ )[1]
	  this.url.port = i.connection.localPort
	  // host should always have the port, so apply it
		// Also make a shortcut to be lazy with
	  this.host = this.url.host = this.url.hostname + ":" + this.url.port

	  // Check for a direct host match, or a cached wildcard match.
	  // If there isn't one, check against wildcards, filtering out hosts
	  // that don't contain at least one wildcard since they won't match.
	  if ( weave.hosts[ this.host ]  ) {
	    this.app = weave.hosts[ this.host ].app
	  } else if ( weave.cache.wildcardMatches[ this.host ]  ) {
	    this.app = weave.cache.wildcardMatches[ this.host ]
	  } else {
			let app = Wildcard.bestMatch(
	      Object.keys( weave.hosts ).filter( host => /\*/.test( host ) ),
	    this.host )

	    // If there isn't a linked app then just end the connection.
			if ( !app ) {
	      // If there isn't an app listening end the connection.
	      // XXX: Should we really do this silently? Or should we report?
      	// We're trying to pretend that there isn't a server connected but
	      // is that really a good idea? We should probably tell someone that
	      // the server is connected and just not active. Maybe a 501.
				garden.warning( "Incoming connection rejected. No app found." )
	      return i.connection.destroy()
			}

			// Remember which wildcard best matched this host for next time
			this.app = weave.cache.wildcardMatches[ this.host ] = weave.hosts[ app ]
		}

	  // Check to see if we've already found the configuration for this path.
	  // If not check to see if there's a directory with a configuration that
	  // matches the URL we're processing and cache it. If there are multiple
	  // matches we check it against the longest match to see if it's longer.
	  // The longest match should always be the most specific configuration.
	  if ( this.app.cache.parentDirectories[ this.url.pathname ]  ) {
	    this.directory = this.app.cache.parentDirectories[ this.url.pathname ]
	  } else {
	    Object.keys( this.app.configuration ).forEach( directory => {
	      if ( this.app.configuration.hasOwnProperty( directory )  ) {
	        // Check if the directory matches the beginning of the requested URL, and
	        // that it is a full directory. The second line avoids some issues, i.e.
	        // if you have a configuration for /abc/ but the file requested is /abc.html
	        // The correct directory for that should be /, but before this fix would
	        // have been thought to be /abc/.
	        if ( ~this.url.path.indexOf( directory )
	        && ( this.url.path === directory
	          || this.url.path.charAt( directory.length ) === "/"
	          || this.url.path.charAt( directory.length - 1 ) === "/" )
	        && directory.length > this.directory.length  ) {
	          this.directory = this.app.cache.parentDirectories[ this.url.pathname ] = directory
	        }
	      }
	    })
	  }

	  // If we found a matching directory, then we save which configuration
	  // is handling the connection, and shorten the URL relative to the
	  // directory. If we didn't find a match then report a 501 (Not Implemented).
	  if ( this.directory ) {
			// We check if this connection already has our data event listener to
			// avoid adding it multiple times if the connection is keep alive.
			// TODO: Figure out why this must go through REQUEST, and not CONNECTION
			if ( !this._NODE_REQUEST._weavePipe  ) {
				this._NODE_REQUEST._weavePipe = this
				//@_NODE_REQUEST.resume()
			  this._NODE_REQUEST.on( 'data', data => this.emit( 'data', data ) )
				// @_NODE_REQUEST.on( 'close', function () {
				// 	@_NODE_REQUEST.unpipe( connection )
				// })
			}

	    this.configuration = this.app.configuration[ this.directory ]
	    this.url.path = path.join( "/", path.relative( this.directory, this.url.path ) )

	    // Emit the connection event to so that the connection can be handed to
	    // the router and any other user code.
	    this.app.emit( "connection", this )
	    this.app.router( this )
	  } else {
	    if ( !this.app.emit( "unconfigurable connection", this )  ) {
	      // TODO: Log an error here
	      this.generateErrorPage( new weave.HTTPError( 501, "No configuration set for requested URL" ) )
	    }
	  }
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


}

weave.Connection.prototype.behavior = function ( name ) {
  let behavior;
  let nests = name.split(" ");

  // Load in order of priority. Check the most relevant configurations first.
  [ this.configuration, this.configuration._super,
    this.app.configuration, weave.configuration ].some( cursor => {
      // Make sure the cursor actually exists, in case
      // @configuration._super isn't defined.
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
	if ( name === 'location' && String.is( behavior ) )
		behavior = behavior.replace( /^~/, weave.constants.HOME )

  // Return the matching behavior. If we didn't find one this should
  // still just be undefined.
  return behavior
}

weave.Connection.prototype.detail = function ( name, untampered ) {
  // Make sure the header name is lowercase, so that it
  // can be case insensitive.
	name = name.toLowerCase()
  let header = this._NODE_REQUEST.headers[ name ]

  // If untampered is true then the header must be returned as a
  // plain string. If it's not, then we can do some processing
  // to make it more useful than a string.
  if ( !untampered  ) {
    switch ( name ) {
      case "if-modified-since":
        if ( header ) { return new Date( header ) }
        break;
      case "cookie":
        // I think this is how we parse cookies but I suck at them???
				if ( String.is( header )  ) {
					let data = {}
					header.split(";").forEach( cookie => {
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
};

// Create destroy, pause, and resume reference methods.
['destroy', 'pause', 'resume'].forEach( name => weave.Connection.prototype[name] = () => this._NODE_CONNECTION[name]() )

weave.Connection.prototype.status = function ( status ) {
  // Check to make sure the status is valid, and has not yet been written.
  if ( this.state !== 0          ) { return garden.log( 'Cannot write status '+status+' to HTTP stream, already wrote '+this._STATUS+'!' ) }
	if ( !Number.is( status )  ) { return garden.error( 'Invalid status!', status ) }

  this._NODE_CONNECTION.write( "HTTP/1.1 "+status+" "+http.STATUS_CODES[status]+"\r\n")
	this._STATUS = status
	this._WRITTEN_HEADERS = {}
  this.state = 1

  return this
}

weave.Connection.prototype.writeHeader = function ( header, value = true ) {
	// To write headers we must have a status, no body, and a valid header name.
	if ( !String.is( header )  ) { return garden.error( 'Header arugment must be a string' ) }
	if ( this.state === 0  ) { return this.status( 200 ) }
  if ( this.state > 1    ) { return garden.log( 'Headers already sent!') }

	// You can't cache an error!
	if ( header.toLowerCase() === "last-modified" && this._STATUS >= 300  ) {
		garden.error( "You can't cache an error!" )
	}

	this._WRITTEN_HEADERS[ header ] = value
	this._NODE_CONNECTION.write( `${header}: ${value}${n}` )

  return this
}

weave.Connection.prototype.writeHead = function ( status, headers ) {
	if ( !Number.is( status ) ) {
		if ( !this._STATUS  ) return garden.error( 'No status written yet, we need a status!' )
	  headers = status
	}

	if ( !headers ) return garden.error( 'No headers given to weave.Connection::writeHead!' )

  this.status( status )
  Object.keys( headers ).forEach( name => this.writeHeader( name, headers[ name ] ) )

  return this
}

weave.Connection.prototype.endHead = function ( header, value ) {
  // If there's an actual header to right, then right it.
  // Then end the header and start righting the body.
  if ( header ) this.writeHeader( header, value )

	// Write required headers and shit
	this.writeHeader( "Date", this.date.toUTCString() )
	this.isKeepAlive ?
		this.writeHeader( "Transfer-Encoding", "chunked" ) :
		this.writeHeader( "Content-Length", 0 ) // content.length ) uhh how does this work now that I moved it???

  this._NODE_CONNECTION.write( n )
  this.state = 2

  return this
}

weave.Connection.prototype.hasBody = function () {
	return this.method !== "HEAD" && this._STATUS !== 304
}

// XXX: Is the connection keep-alive or close?
// TODO: Check before assuming Transfer-encoding: chunked
// TODO: Check before writing the Date header as well. Or disallow anyone else
// from writing it with a condition in ::writeHeader().
weave.Connection.prototype.write = function ( content, encoding  ) {
  // If we aren't writing the body yet, right some final headers.
  if ( this.state === 3  ) {
		return garden.error( "Cannot write data, response has already been completed." )
	}

  if ( this.state < 2  ) {
    this.endHead()
    this.state = 2
  }

	if ( this.hasBody()  ) {
    if ( this.isKeepAlive  ) {
      var buf = Buffer.concat( [
        new Buffer( Buffer.byteLength( content, encoding ).toString( 16 ) ), n,
        new Buffer( content, encoding ), n ] )

      this._NODE_CONNECTION.write( buf )
    } else {
			// XXX: I don't know if this is 100%, but I think it is.
      this._NODE_CONNECTION.write( content, encoding )
			this._NODE_CONNECTION.end()
    }
	}

  return this
}

weave.Connection.prototype.end = function (  ) {
  // Write any data given, and then send the "last chunk"
  if ( arguments.length > 0  ) { this.write.apply( this, arguments ) }
	// Firefox will hang on requests if there is no body present,
	// such as 3xx redirects, so write a blank one.
	if ( this.state < 2  ) { this.write("") }

  // Keep the connection alive or kill it
  this.isKeepAlive ?
    this._NODE_CONNECTION.write( z ) :
    this._NODE_CONNECTION.end()

  this.state = 3
	return this
}

weave.Connection.prototype.redirect = function ( location, status  ) {
	if ( !Number.is( status )  ) {
		if ( status == null  ) {
			status = 301
		} else {
			// TODO: Log this error for debugging
			return connection.generateErrorPage( 500 )
		}
	}

	return this.writeHead( status, { "Location": location } ).end()
}

weave.Connection.prototype.generateErrorPage = function ( error ) {
	// Create a details object for us to pass to printer.
	let details = Object.create( weave.constants.DETAILS, {
		url: {
			value: this.url,
			enumerable: true, writable: true, configurable: true } } );

	// Make the printer easier to call in different contexts.
	var print = more => this.app.printer( error, Object.extend( details, more ), this )

	if ( Number.is( error )  ) { error = new weave.HTTPError( error ) }

	// cursor points to where ever we're searching for files.
	var cursor = this.behavior( "location" )

	// NOTE: Router and this share a lot of boilerplate code. We should do something
	// to merge them together maybe?

  if ( weave.HTTPError.is( error )  ) {
		var errorPageName = this.behavior( 'errorPages '+error.status )
		if ( errorPageName  ) {
			// TODO: Make sure this actually works, so that we can have absolute paths.
			// If it doesn't work, then switch it back to .join for now.
			var errorPagePath = cursor ?
				path.resolve( cursor, errorPageName ) :
				errorPageName
			fs.exists( errorPagePath, function ( exists  ) {
				if ( exists  ) {
					fs.stat( errorPagePath, function ( serror, stats  ) {
						if ( !serror && stats.isFile()  ) {
							print({ path: errorPagePath, stats: stats, type: "file" })
						}
					})
				} else return print()
			})
		} else return print()
	} else {
		console.error( "Connection::generateErrorPage requires argument weave.HTTPError!" )
	}
}
