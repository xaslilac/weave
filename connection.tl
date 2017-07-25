// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( './weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n');
var Wildcard, Zen;



module 'events', 'fs', 'http', 'path', 'util', 'url';
Wildcard = require( './utilities/Wildcard' )
Zen = require( './utilities/Zen' )

// The Connection class is responsible for determining which App is
// responsible for handling the ClientRequest and ServerResponse
// as well as interfacing between them.
weave.Connection = weave.Class( events.EventEmitter, function i, o {
	var app, directory, connection = @;

  // For time tracking and caching purposes, save the time that
  // the connection first began processing. Initialize the state.
  @date = new Date()
  @state = 0

  // What kind of Connection are we dealing with?
  @method      = i.method
  @isKeepAlive = i.headers.connection === "keep-alive"
  @isUpgrade   = i.headers.connection === "Upgrade"

  // If we don't have a Host header then there's no way to figure
  // out which app is supposed to be used to handle the Connection.
  if !i.headers.host {
    // XXX: @error isn't complete yet, but it will probably depend
    // on having an app the handle the error. We might just need
    // to immediately end the connection if there is no Host Header.
    @generateErrorPage( new weave.HTTPError( 400, "The request is missing the" +
		  "Host header, and I am unable to determine how to direct this request." ) )
  }

  // Save these here, mainly for internal use with the classes methods.
  // Ideally these wouldn't be used outside of Weave. All interactions
  // with them should be through using methods of the Connection class.
  @_NODE_REQUEST = i, @_NODE_RESPONSE = o,
  @_NODE_CONNECTION = i.connection

  // Give each connection a UUID for a little bit of tracing.
  @UUID = weave.util.RNDM_RG(0x10000000,     0xFFFFFFFF,     16) + "-" +
          weave.util.RNDM_RG(0x1000,         0xFFFF,         16) + "-" +
          weave.util.RNDM_RG(0x4000,         0x4FFF,         16) + "-" +
          weave.util.RNDM_RG(0x8000,         0xBFFF,         16) + "-" +
          weave.util.RNDM_RG(0x100000,       0xFFFFFF,       16) + // The last range has to be
          weave.util.RNDM_RG(0x100000,       0xFFFFFF,       16)   // be split into two calls
                                                                   // because it has more digits
  // Initialize @directory for the initial length comparisons.     // than Math.random() generates
  @directory = ""
  // Normalize the url to prevent anyone being sneaky with, say, some "../../"
  // tomfoolery to get low level file system access.
	@url = url.parse( path.normalize( i.url ) )
  // File out the url object with all the missing standard properties.
  @url.protocol = "http:"
  @url.slashes = "//"
  // hostname should never have the port, but the host header sometimes will.
	@url.hostname = @get( 'host' ).match( /^(.+?)(\:([0-9]{1,5}))?$/ )[1]
  @url.port = i.connection.localPort
  // host should always have the port, so apply it
	// Also make a shortcut to be lazy with
  @host = @url.host = @url.hostname + ":" + @url.port

  // Check for a direct host match, or a cached wildcard match.
  // If there isn't one, check against wildcards, filtering out hosts
  // that don't contain at least one wildcard since they won't match.
  if weave.hosts[ @host ] {
    @app = weave.hosts[ @host ].app
  } else if weave.cache.wildcardMatches[ @host ] {
    @app = weave.cache.wildcardMatches[ @host ]
  } else {
		app = Wildcard.bestMatch(
      Object.keys( weave.hosts ).filter( function host {
        return /\*/.test( host )
      }),
    @host )

    // Remember which wildcard best matched this host for next time
    // If there isn't a linked app then just end the connection
    // and exit out of the function.
		if app {
			@app = weave.cache.wildcardMatches[ @host ] = weave.hosts[ app ]
		} else {
      // If there isn't an app listening end the connection.
      // NOTE: Should we really do this silently? Or should we report?
      // We're trying to pretend that there isn't a server connected but
      // is that really a good idea? We should probably tell someone that
      // the server is connected and just not active.
      return i.connection.destroy()
		}
	}

  // Check to see if we've already found the configuration for this path.
  // If not check to see if there's a directory with a configuration that
  // matches the URL we're processing and cache it. If there are multiple
  // matches we check it against the longest match to see if it's longer.
  // The longest match should always be the most specific configuration.
  if @app.cache.parentDirectories[ @url.pathname ] {
    @directory = @app.cache.parentDirectories[ @url.pathname ]
  } else {
    Object.keys( @app.configuration ).forEach( function directory {
      if @app.configuration.hasOwnProperty( directory ) {
        // Check if the directory matches the beginning of the requested URL, and
        // that it is a full directory. The second line avoids some issues, i.e.
        // if you have a configuration for /abc/ but the file requested is /abc.html
        // The correct directory for that should be /, but before this fix would
        // have been thought to be /abc/.
        if ~@url.path.indexOf( directory )
        && ( @url.path === directory
          || @url.path.charAt( directory.length ) === "/"
          || @url.path.charAt( directory.length - 1 ) === "/" )
        && directory.length > @directory.length {
          @directory = @app.cache.parentDirectories[ @url.pathname ] = directory
        }
      }
    }, @)
  }

  // If we found a matching directory, then we save which configuration
  // is handling the connection, and shorten the URL relative to the
  // directory. If we didn't find a match then report a 501 (Not Implemented).
  if @directory {
		// We check if this connection already has our data event listener to
		// avoid adding it multiple times if the connection is keep alive.
		if !@_NODE_CONNECTION._weavePipe {
			@_NODE_CONNECTION._weavePipe = connection
		  @_NODE_CONNECTION.on( 'data', function data { connection.emit( 'data', data ) })
		}

    @configuration = @app.configuration[ @directory ]
    @url.path = path.join( "/", path.relative( @directory, @url.path ) )

    // Emit the connection event to so that the connection can be handed to
    // the router and any other user code.
    @app.emit( "connection", @ )
    @app.router( @ )
  } else {
    if !@app.emit( "failed connection", @ ) {
      @app.error( "No configured directory for requested URL {{@url.pathname}}" )
      @generateErrorPage( new weave.HTTPError( 501, "No configuration set for requested URL" ) )
    }
  }
})

weave.Connection::behavior = function name {
  var behavior,
  nests = name.split(" ");

  // Load in order of priority. If there is a directory configuration then
  // that is the most important. The next most important would be the
  // configuration that our directory is inheriting from. Next is the general
  // app configuration and our last resort is weave's global configuration.
  // If we find a high priority match first, don't bother checking for a low
  // priority match. Just return the behavior.
  [ @configuration, @configuration._super,
    @app.configuration, weave.configuration ].some( function cursor {
      // Make sure the cursor actually exists, in case
      // @configuration._super isn't defined.
      if cursor {
        // If the cursor follows all the way to the requested property
        // then set the behavior and return true to stop checking.
        if ( nests.every( function nest { return cursor = cursor[ nest ] } ) ) {
          behavior = cursor
          return true;
        }
      }
  })

  // Return the matching behavior. If we didn't find one this should
  // still just be undefined.
  return behavior
}

weave.Connection::get =
weave.Connection::getHeader = function name, asString {
  // Make sure the header name is lowercase, so that it
  // can be case insensitive.
  var header = @_NODE_REQUEST.headers[ name ],
	data; name = name.toLowerCase();

  // If asString is true then the header must be returned as a
  // plain string. If it's not, then we can do some processing
  // to make it more useful than a string.
  if !asString {
    switch name {
      // TODO: When case gets implemented in Teal 0.4,
      // make sure this gets updated.
      // case "if-modified-since" {
      // }
      case "if-modified-since":
        if header { return new Date( header ) }
        break;
      case "cookie":
        // I think this is how we parse cookies but I suck at them???
				if String.is( header ) {
					data = {}
					header.split(";").forEach( function cookie {
						cookie = cookie.trim().split( '=' )
						data[cookie.shift()] = cookie.join( '=' ) || true
					})
					return data
				}
        break;
    }
  }

  // If something else hasn't already been returned, or if asString
  // is true then just return the header as a normal string.
  return header
};

// Create destroy, pause, and resume reference methods.
['destroy', 'pause', 'resume'].forEach( function name {
  weave.Connection::[name] = function {
    @_NODE_CONNECTION[name]()
  }
})

weave.Connection::status = function status {
  // If we haven't written the status yet, right it
  // and start writting headers.
  if @state === 0 && Number.is( status ) {
    @_NODE_CONNECTION.write( "HTTP/1.1 {{status}} {{http.STATUS_CODES[status]}}\r\n")
		@_STATUS = status
		@_WRITTEN_HEADERS = {}
    @state = 1
  } else {
		console.log( 'Cannot write status {{status}} to HTTP stream, already wrote {{@_STATUS}}!' )
	}

  return @
}

weave.Connection::writeHeader = function header, value {
	if !String.is( header ) {
		console.error( 'argument header must be a string' )
		return @
	}

  // If no body content has been sent yet, check if the status has.
  // If not, right the status, and then right the header.
  if @state < 2 {
    if @state === 0 {
      @status( 200 )
    }

		if header.toLowerCase() === "last-modified" && @_STATUS >= 300 {
			console.error( "You can't cache an error!" )
		}
		@_WRITTEN_HEADERS[ header ] = value
    @_NODE_CONNECTION.write( "{{header}}: {{value + n}}" )
  } else {
		console.log( 'Headers already sent! Perharps use a trailer.')
	}

  return @
}

weave.Connection::endHead = function header, value {
  // If there's an actual header to right, then right it.
  // Then end the header and start righting the body.
  if header {
    @writeHeader( header, value )
  }
  @_NODE_CONNECTION.write( n )
  @state = 2

  return @
}

weave.Connection::writeHead = function status, headers {
  var connection = @;
  if Number.is( status ) /*&& Object.is( headers )*/ {
    @status( status )
    Object.keys( headers ).forEach( function key {
      connection.writeHeader( key, headers[ key ] )
    })

  } else {
    @app.error( "writeHead: invalid header", status, headers )
  }
  return @
}

weave.Connection::hasBody = function {
	return @method !== "HEAD" && @_STATUS !== 304
}

// XXX: Is the connection keep-alive or close?
// TODO: Check before assuming Transfer-encoding: chunked
// TODO: Check before writing the Date header as well. Or disallow anyone else
// from writing it with a condition in ::writeHeader().
weave.Connection::write = function content, encoding {
  var buf;

  // If we aren't writing the body yet, right some final headers.
  if @state < 3 {
    if @state < 2 {
      // Write required headers and shit
      @isKeepAlive ?
				@writeHeader( "Transfer-Encoding", "chunked" ) :
				@writeHeader( "Content-Length", content.length )
      @endHead( "Date", @date.toUTCString() )

      @state = 2
    }

		if @hasBody() {
	    if @isKeepAlive {
	      buf = Buffer.concat( [
	        new Buffer( Buffer.byteLength( content, encoding ).toString( 16 ) ), n,
	        new Buffer( content, encoding ), n ] )

	      @_NODE_CONNECTION.write( buf )
	    } else {
				// XXX: I don't know if this is 100%, but I think it is.
	      @_NODE_CONNECTION.write( content, encoding )
				@_NODE_CONNECTION.end()
	    }
		}
  }

  return @
}

weave.Connection::end = function {
  // Write any data given, and then send the "last chunk"
  if arguments.length > 0 { @write.apply( @, arguments ) }

  // Keep the connection alive or kill it
  @isKeepAlive ?
    @_NODE_CONNECTION.write( z ) :
    @_NODE_CONNECTION.end()

  @state = 3
}

weave.Connection::generateErrorPage = function error {
	// Create a details object for us to pass to printer.
	var errorPageName, errorPagePath, cursor, connection = @,
	details = Object.create( weave.constants.DETAILS, {
		url: {
			value: @url,
			enumerable: true, writable: true, configurable: true } } );

	// Make the printer easier to call in different contexts.
	print = function more {
		return connection.app.printer( error, Object.extend( details, more ), connection )
	}

	// cursor points to where ever we're searching for files.
	// If the app location begins with ~, replace it with the users home directory.
	// weave.constants.HOME normalizes the API for Node across different platforms.
	if connection.behavior( "location" ) {
		cursor = path.join( connection.behavior( "location" ).replace( /^~/, weave.constants.HOME ) )
	} else return print()

	// NOTE: Router and this share a lot of boilerplate code. We should do something
	// to merge them together maybe?

  if weave.HTTPError.is( error ) {
		errorPageName = @behavior( 'errorPages {{error.status}}' )
		if errorPageName {
			errorPagePath = path.join( cursor, @behavior( 'errorPages {{error.status}}' ) )
			fs.exists( errorPagePath, function exists {
				if exists {
					fs.stat( errorPagePath, function serror, stats {
						if !serror && stats.isFile() {
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
