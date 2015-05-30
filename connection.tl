// MIT License / Copyright Tyler Washburn 2015
"use strict";

var weave, q, u, n, z, Wildcard;
weave = require( "./weave" )

Array::someAsync = function f,c {var a=@,i=0,v=!1,t={
  next:function {i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function {c(!0)}};t.next()}
q = function s { return s.split(",") },n = new Buffer("\r\n"),z = new Buffer("0\r\n\r\n")



module "events", "http", "path", "util", "url";
Wildcard = require( "./utilities/Wildcard" )

// The Connection class is responsible for determining which App is
// responsible for handling the ClientRequest and ServerResponse
// as well as interfacing between them.
weave.Connection = weave.Class( events.EventEmitter, function i, o {
	var app, directory;

  // For time tracking and caching purposes, save the time that
  // the connection first began processing. Initialize the state.
  @date = new Date()
  @state = 0

  // What kind of Connection are we dealing with?
  @method = i.method
  @isKeepAlive = i.headers.connection === "keep-alive"
  @isUpgrade   = i.headers.connection === "Upgrade"

  // If we don't have a Host header then there's no way to figure
  // out which app is supposed to be used to handle the Connection.
  if !i.headers.host {
    // XXX: @error isn't written yet, but it will probably depend
    // on having an app the handle the error. We might just need
    // to immediately end the connection if there is no Host Header.
    @error( 404, "The request is missing the Host header used to " +
                 "find the website the client is attempting to view." )
  }

  // Save these here, mainly for internal use with the classes methods.
  // Ideally these wouldn't be used outside of Weave. All interactions
  // with them should be through using methods of the Connection class.
  @_NODE_REQUEST = i
  @_NODE_CONNECTION = i.connection

  // Give each connection a UUID for a little bit of tracing.
  @UUID = weave.util.RNDM_RG(0x10000000,     0xFFFFFFFF,     16) + "-" +
          weave.util.RNDM_RG(0x1000,         0xFFFF,         16) + "-" +
          weave.util.RNDM_RG(0x4000,         0x4FFF,         16) + "-" +
          weave.util.RNDM_RG(0x8000,         0xBFFF,         16) + "-" +
          weave.util.RNDM_RG(0x100000,       0xFFFFFF,       16) + // The last range has to be
          weave.util.RNDM_RG(0x100000,       0xFFFFFF,       16)   // be split into two calls
                                                                   // because it's has more digits
  // Initialize @directory for the initial length comparisons.     // than Math.random() generates
  // Make sure the host header is valid, and strip the port
  // and reapply it. This insures that it isn't missing from @host
  // and that it's the real connection port. Seperate parts of the
  // url into a url object.
  @directory = ""
	@host = i.headers.host.match( /^(.+?)(\:([0-9]{1,5}))?$/ )[1] + ":" + i.connection.localPort
	@url = url.parse( path.normalize( i.url ) )

  // Check for a direct host match, or a cached wildcard match.
  // If there isn't one, check against wildcards, filtering out hosts
  // that don't contain at least one wildcard since they won't match.
  if weave.apps[ @host ] {
    @app = weave.apps[ @host ].app
  } else if weave.cache.wildcardMatches[ @host ] {
    @app = weave.cache.wildcardMatches[ @host ]
  } else {
		app = Wildcard.bestMatch(
      Object.keys( weave.apps ).filter( function host {
        return /\*/.test( host )
      }),
    @host )

    // Remember which wildcard best matched this host for next time
    // If there isn't a linked app then just end the connection
    // and exit out of the function.
		if app {
			@app = weave.cache.wildcardMatches[ @host ] = weave.apps[ app ]
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
    // TODO: Convert this to Object.keys().forEach
    for directory in @app.configuration {
      if @app.configuration.hasOwnProperty( directory ) {
        if ~@url.pathname.indexOf( directory ) && directory.length > @directory.length {
          @directory = @app.cache.parentDirectories[ @url.pathname ] = directory
        }
      }
    }
  }

  // If we found a matching directory, then we save which configuration
  // is handling the connection, and shorten the URL relative to the
  // directory. If we didn't find a match then report a 501 (Not Implemented).
  if @directory {
    @configuration = @app.configuration[ @directory ]
    @url.pathname = path.relative( @directory, @url.pathname )

    // Announce that the app matched an incoming connection and check
    // if the app has any responders. If it does, run them and then
    // hand the connection off the router, and then off to the engine.
    @app.emit( "match", @, @configuration, app )
    if @app.responders.length {
      @app.responsers.forEach( function responder {
        responder.call( @app, @ )
      })
    }

    @app.router( @, @app.printer )
  } else {
    @app.error( "No configured directory for requested URL " + @url.pathname )
    @error( 404, "Requested URL did matched an app but did not have a configuration." )
  }
})

weave.Connection::behavior = function name {
  var behavior,
  nests = name.split(" ");

  // Load from @configuration, @configuration._super,
  // @app.configuration, and then weave.configuration
  [ @configuration, @configuration._super,
    @app.configuration, weave.configuration ].some( function cursor {
      // Make sure the cursor actually exists, in case
      // @configuration._super isn't defined.
      if cursor {
        // If the cursor follows all the way to the requested property
        // the set the behavior and return true to stop checking.
        if ( nests.every( function nest { return cursor = cursor[ nest ] } ) ) {
          behavior = cursor
          return true;
        }
      }
  })

  // Behavior will only be defined if we actually found a match.
  // Otherwise it will just be undefined. Return it anyway.
  return behavior
}

weave.Connection::get =
weave.Connection::getHeader = function name, asString {
  // Make sure the header name is lowercase, so that it
  // can be case insensitive.
  var header;
  name = name.toLowerCase()

  // If asString is true then the header must be returned as a
  // plain string. If it's not, then we can do some processing
  // to make it more useful than a string.
  if !asString {
    switch name {
      // TODO: When this gets implemented in Teal 0.4,
      // make sure this gets updated.
      // case "if-modified-since" {
      // }
      case "if-modified-since":
        // FIXME: If the header is undefined it will just
        // return whatever the date is right now.
        header = @_NODE_REQUEST.headers[ name ]
        if header {
          return new Date( header )
        }
        break;
      case "cookies":
        // I think this is how we parse cookies but I suck at them???
        return querystring.parse( @_NODE_REQUEST.headers.cookie, "; " )
        break;
    }
  }

  // If something else hasn't already been returned, or if asString
  // is true then just return the header as a normal string.
  return @_NODE_REQUEST.headers[ name ]
}

// Create destroy, pause, and resume reference methods.
q("destroy,pause,resume").forEach( function name {
  weave.Connection::[name] = function {
    @_NODE_CONNECTION[name]()
  }
})

weave.Connection::status = function status {
  // If we haven't written the status yet, right it
  // and start writting headers.
  if @state === 0 {
    @_NODE_CONNECTION.write( "HTTP/1.1 {{status}} {{http.STATUS_CODES[status]}}\r\n")
    @state = 1
  }
}

weave.Connection::writeHeader = function header, value {
  // If no body content has been sent yet, check if the status has.
  // If not, right the status, and then right the header.
  if @state < 2 {
    if @state === 0 {
      @status( 200 )
    }
    @_NODE_CONNECTION.write( "{{header}}: {{value + n}}" )
  }
}

weave.Connection::writeLastHeader = function header, value {
  // If there's an actual header to right, then right it.
  // Then end the header and start righting the body.
  if header {
    @writeHeader( header, value )
  }
  @_NODE_CONNECTION.write( n )
  @state = 2
}

weave.Connection::writeHead = function status, headers {
  if Number.is( status ) && Object.is( headers ) {
    @status( status )
    Object.keys( second ).forEach( function key {
      @writeHeader( key, second[ key ] )
    })
  } else {
    @app.error( "writeHead: invalid header", status, headers )
  }
}

// XXX: Is the connection keep-alive or close?
// TODO: Check before assuming Transfer-encoding: chunked
weave.Connection::write = function content, encoding {
  var buf;

  // If we aren't writing the body yet, right some final headers.
  if @state < 3 {
    if @state < 2 {
      // Write required headers and shit
      @isKeepAlive && @writeHeader( "Transfer-Encoding", "chunked" )
      @writeLastHeader( "Date", @date.toUTCString() )

      @state = 2
    }

    if @isKeepAlive {
      buf = Buffer.concat( [
        new Buffer( Buffer.byteLength( content, encoding ).toString( 16 ) ), n,
        new Buffer( content, encoding ), n ] )

      @_NODE_CONNECTION.write( buf )
    } else {
      // TODO: Something more informative/productive.
      console.log( "NOOOO" )
      @_NODE_CONNECTION.write( content, encoding )
    }
  }
}

weave.Connection::end = function {
  // Write all the arguments, and then send "last chunk"
  @write.apply( @, arguments )
  @isKeepAlive ?
    @_NODE_CONNECTION.write( z ) :
    200

  @state = 3
}

weave.Connection::error = function code, description {
  // wtf do I do here
}
