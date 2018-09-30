// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave.Exchange' )
const linker = require( './linker' )
const printer = require( './printer' )

const { EventEmitter } = require( 'events' )
const fs = require( 'fs' )
const { STATUS_CODES } = require( 'http' )
const os = require( 'os' )
const path = require( 'path' )
const url = require( 'url' )

// Declare our exchange states as constants, for verbosity
const [ NEW, HEAD, BODY, COMPLETE ] = [ 0, 1, 2, 3 ]

// End packet buffer for connection: keep-alive
const n = Buffer.from( '\r\n' )
const z = Buffer.from( '0\r\n\r\n' )

// The Exchange class determines which App is responsible
// for handling the ClientRequest and ServerResponse
// as well as interfacing between them.
weave.Exchange = class Exchange extends EventEmitter {
	constructor( secure, request, response ) {
		// Make it an EventEmitter
		super()

    // Make sure the Host header is valid, and strip off the port number if necessary.
		const hostMatch = /^([A-Za-z0-9\-.[\]:]+?)(:(\d{1,5}))?$/.exec( request.headers.host )

    // Normalize the path before parsing to prevent any ../ tomfoolery
    const normalizedUrl = url.parse( path.normalize( request.url ) )
    normalizedUrl.pathname = unescape( normalizedUrl.pathname )

    const urlProperties = {
      protocol: secure ? 'https:' : 'http:',
			slashes: '//',
  		hostname: hostMatch[ 1 ],
  	  port: request.connection.localPort
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
  		date: new Date(),
  	  state: NEW,

      // requestUrl should remain unchanged and read-only. relativeUrl is used
      // to handle subdirectories and mounts.
      requestUrl: Object.assign( {}, normalizedUrl, urlProperties ),
      relativeUrl: Object.assign( { prefix: '', suffix: '', depth: 0 }, normalizedUrl, urlProperties ),

  	  // What kind of Connection are we dealing with?
  	  method: request.method.toLowerCase(),
  	  isKeepAlive: /keep-alive/i.test( request.headers.connection ),
  	  isUpgrade: /upgrade/i.test( request.headers.connection ),
      secure
    })

    // If we don't have a valid Host header then there's no way to figure
	  // out which app is supposed to be used to handle the Connection.
    // We can't throw this earlier, because generateErrorPage needs a
    // certain level of information.

		// TODO: This line of code would break the websocket plugin.
		// We only support keep-alive for HTTP, but Upgrades can be handled differently.
		// Find a way to make this check robust enough to reject if it's not intercepted.
		// if ( !this.isKeepAlive ) return request.connection.destroy()
	  if ( !hostMatch ) return this.generateErrorPage( new weave.HttpError( 400, 'Request must have a valid Host header.' ) )

		// This is so that we don't start forwarding data until someone is listening
		// to it, since we don't implement a Readable Stream, we just forward events.
		this.on( 'newListener', event => {
			if ( event === 'data' ) {
				request.on( 'data', data => this.emit( 'data', data ) )
				this.removeAllListeners( 'newListener' )
			}
		})

		// Send our freshly configured exchange to the proper places
		linker.call( this )
	}

  // Methods for getting information about the request

	behavior( name ) {
		if ( typeof name !== 'string' ) return garden.typeerror( 'Configuration behavior must be a string' )
    if ( !this.app || !this.app.options ) return undefined

	  let behavior
	  let nests = name.split(" ")
		let scopes = [ this.app.options ]

    let level = this.app.options
    while ( level._super ) {
      level = level._super
      scopes.push( level )
    }

		// garden.log( 'Scope count: ', scopes.length, 'Item name: ', nests )

	  // Load in order of priority. Check the most relevant configurations first.
	  scopes.some( ( cursor, x ) => {
			// garden.log( 'Checking scope', x )
	      // Make sure the cursor actually exists, in case
	      // this.configuration._super isn't defined.
	      if ( cursor ) {
	        // If the cursor follows all the way to the requested property
	        // then set the behavior. If it's every undefined then it stops.
	        if ( nests.every( nest => cursor = cursor[ nest ] ) ) {
	          behavior = cursor
						// Crazy bug fix for inherited error pages
            // XXX: This is gross and not robust
        		if ( nests[ 0 ] === 'errorPages'
        		&& this.options && this.options.location
        		&& x > 0 && scopes[ x ].location ) {
        			behavior = path.join( path.relative( scopes[ x ].location, scopes[ 0 ].location ), behavior )
        		}

						return true;
	        }
	      }
	  } )

		// If the location begins with ~, replace it with the users home directory.
    // TODO: Do this without RegExp because it's slow and bad
		if ( name === 'location' && typeof behavior === 'string' )
			behavior = behavior.replace( /^~/, os.homedir() )

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

	  this._NODE_CONNECTION.write( `HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n` )
		this._WRITTEN_STATUS = status
		this._WRITTEN_HEADERS = {}
	  this.state = HEAD

	  return this
	}

	header( header, value ) {
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

	write( content, encoding ) {
	  if ( this.state === COMPLETE ) return garden.error( 'Cannot write data, response has already been completed.' )
		if ( typeof content !== 'string' && !Buffer.isBuffer( content ) )
			return garden.typeerror( 'Content must be a string or buffer' )

    if ( this.state < BODY ) {
      // Write preconfigured constant headers, if they are specified, and a Date header.
  		this.head( Object.assign( { 'Date': this.date.toUTCString() }, this.behavior( 'headers' ) ) )

  		this.header( 'Transfer-Encoding', 'chunked' )

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
				// This is such a mess, we really need to clean this up.
	    }
		}

	  return this
	}

	end( ...args ) {
	  // Write any data given, and then send the "last chunk"
		// Firefox will hang on requests if there is no body present,
		// such as 3xx redirects, so write a blank one if we haven't.
	  if ( args.length > 0 ) this.write( ...args )
		if ( this.state < BODY ) this.write( '' )

	  // Send the end of file buffer
	  this._NODE_CONNECTION.write( z )

    // garden.timeEnd( this.requestUrl.pathname )

	  this.state = COMPLETE
		return this
	}

  // Utilities for quickly finishing responses

	redirect( location, status = 302 ) {
		if ( location === 304 ) return this.status( 304 ).end()
		if ( typeof location !== 'string' ) return garden.typeerror( 'Redirect location is not a string!' ) && this.generateErrorPage( 500 )
		if ( typeof status !== 'number' || status < 300 || status > 399 ) return garden.error( 'Invalid redirect status!' ) && this.generateErrorPage( 500 )

		return this.head( status, { 'Location': location } ).end()
	}

	generateErrorPage( error, description ) {
		// Make sure we can generate a valid error page.
		if ( typeof error === 'number' ) error = new weave.HttpError( error, description )
		else if ( !( error instanceof weave.HttpError ) ) error = new weave.HttpError( 500, error )

    // If it was a server error, log it
    if ( error.statusCode >= 500 ) garden.catch( error.description )

		// Get the manifest ready for the printer, and make the printer easy to call.
		let manifest = new weave.Manifest({ url: this.url })
		let print = more => printer.call( this, error, manifest.extend( more ) )

    // Search for a path for an error file. If there is no file name, or the file is
		// relative, but we have no cursor to search at, print the default page.
    let cursor = this.behavior( 'location' )
    let errorPageName = this.behavior( `errorPages ${error.statusCode}` )
		if ( !errorPageName || (!cursor && !path.isAbsolute( errorPageName )) ) return print()

		// Error page paths can be relative, and will point inside the root location of the app,
		// or they can be absolute and point anywhere on the file system.
		let errorPagePath = path.isAbsolute( errorPageName )
				? errorPageName
				: path.join( cursor, errorPageName )

		fs.stat( errorPagePath, ( serror, stats ) => {
			print( !serror && stats.isFile() ? { path: errorPagePath, stats: stats, type: 'file' } : null )
		})
	}
}
