/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2014
   Weave - Make webs [-0.3] (pre-release) */

// Strict mode is actually great for use in debugging, and catching
// problems in code that wouldn't usually be found. You should try it.
"use strict";

// Some basic utilities, like an asynchronous implemenation of Array::some,
// basic type detection (Constructor.is(possibleInstance)), an object extender,
// and a way to quickly write Arrays of strings. u is just short for undefined.
// n is short for a carriage return line feed buffer, and z is the last chunk
// of a message with Transfer-Encoding: chunked for Keep-Alive connections.
var q, u, n, z;

Array::someAsync = function f,c {var a=@,i=0,v=!1,t={
  next:function {i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function {c(!0)}};t.next()}
Function::is = function a {return a!=null&&(a.constructor===@::constructor)}
Object.extend = function o,e {@keys(o).forEach(function p {if !e.hasOwnProperty(p){e[p]=o[p]}});return e}
q = function s { return s.split(",") },n = new Buffer("\r\n"),z = new Buffer("0\r\n\r\n")





// TODO: So here are all the things I still need to bring over from Trailer.

// GZip, URL Redirects, URL Cleaning (maybe? but different?),
// request:data -> Connection piping, ReadFile with Content-Length, caching,
// Last-Modified, and Content-Type. directory.html, directory.json, and
// directory listings in general? Remember the whole depth === 1 thing.
// Auto-generate error pages. There's still no way to write to the response
// without accessing Connection::_NODE_RESPONSE. Should we allow Constant
// HTTP Headers? Do they need to be written directly to each individual
// request? How will they be written?






// TODO: All the things that are going to be new features in Weave that have
// not yet found a spot for implementation or are still being discussed.

// # Console logging - scheduled for v0.4
// We needs to add some sort of unified error reporting system.

// # Command Line Interface - scheduled for v0.6
// The main reason this would be important, is it would provide a simple way
// to actively maintain your server while it is running, without needing to
// close a process, and open a new one. You could essentially "hot-swap" your
// configuration of the directory by using the command line. This could also
// also provide a simple way to start a server from the command line without
// directly handling a node process instance. This would allow you to close
// your terminal window when it's unneeded instead of leaving it open all the
// time. This is something that I've wanted to be able to do for a while, but
// is incredibly hard to implement, and would need to be outlined in detail.

// # Remote debugging / Admin panel - scheduled for v0.8
// Add the ability to have an online debug console/admin panel that you would
// active with App.addInterface( "/net-internals", new weave.AdminPanel(App) )
// or something similar. You'd be able to monitor an incoming request queue,
// interface directly with the App collection from a secure, remote, REPL with
// syntax highlighting, pretty printing, and more.

// # SPDY Protocol / GZip / HTTP 2.0 / HTTPS support - scheduled for v1.0
// Add support for Google's SPDY protocol and for HTTP 2.0. HTTPS support is
// hard for me to implement without access to any sort of secure certificate
// of my own to work with, and is a requirement for SPDY.
// So it seems that HTTPS support is simply creating an extra server, using
// certificates supplied, and doing some extra stuff to hook up the server
// to the app.





// First we import Node core modules, then we import our own modules.
var weave, DOM, MIME, Router, Wildcard;
module 'crypto', 'events', 'fs', 'http', 'path', 'url', 'util';
DOM = require( "./utilities/DOM" )
MIME = require( "./utilities/MIME" )
Router = require( "./router")
Wildcard = require( "./utilities/Wildcard" )

module.exports = exports = weave = {
  version: 0.3,

  servers: {}, apps: {},
  cache: { wildcardMatches: {} },
  // constants: {}, ???????????????????????????????????????

  util: {
    SHA1_64: function data {
      return crypto.createHash( "sha1" ).update( data ).digest( "base64" ) },
    RNDM_RG: function min, max, base {
      return Math.floor( ( Math.random() * ( ( max + 1 ) - min ) ) + min ).toString( base ) } },

  Class: function inherit, constructor {
    constructor:: = Object.create( inherit::, {
      constructor: {
        value: constructor,
        enumerable: false, writable: true, configurable: true },
      _super: {
        value: inherit,
        enumerable: false, writable: true, configurable: true } } )

    return constructor
  },

  Dictionary: MIME,
  Router: Router,

  configuration: {
    //adminEmail: "foo@bar.com"
  }
}





weave.App = weave.Class( events.EventEmitter, function appName {
  // Create the initial configuration storage object and use
  // resetCache() to create the initial empty cache.
  @configuration = {
    appName: appName,
    //adminEmail: "foo@bar.com"
  }
  @cache = {
    parentDirectories: {},
    resolvedPaths: {}
  }

  // All apps being run within the same process can be
  // configured with the use of flags.
  // TODO: Make this better, configurable.
  // We'll put a lot more effort into this around the version 0.5~0.6
  // time frame, when we implement an actual CLI for managing servers.
  process.argv.forEach( function arg {
    switch arg {
      case "--weave-debug":
        @configuration.debug = true
    }
  }, @ )

  // An array of functions that are run prior to the router.
  @responders = []

  // The router processes the request and turns it into something
  // slightly more meaningful, so that we can generate a response.
  @router = new weave.Router()
  @engine // do something cool here I guess.

  // @error is the function that should be called for all errors
  // relating to a particular app. 
  // @warning is used when something isn't going quite as planned,
  // but can still be handled.
  // @debug can be called to output anything to the console, but
  // will only print if the app is in debug mode.
  // These are not prototype methods because in the future they might
  // do something specific to each app.
  // XXX: Actually, these probably still should be prototype methods.
  @error = function e {
    console.error.apply( console, arguments )
    return {
      type: "error",
      message: e
    }
  }
  @warning = function e {
    console.log.apply( console, arguments )
    return {
      type: "warning",
      message: e
    }
  }
  @debug = function e {
    app.configuration.debug && e && console.log.apply( console, arguments )
    return app.configuration.debug
  }
})

weave.App::listen =
weave.App::linkHost = function {
  Array::forEach.call( arguments, function host {
    var wildcard, cachedhost, split, hostname, port, server;

    // If the argument is just the port, default the host to *
    if Number.is( host ) {
      host = "*:{{host}}"
    }

    // If the host is a wildcard then clear all wildcardMatches that match
    // it. If it's a literal, clear wildcardMatches for that literal.
    // TODO: Eventually we should translate this to Object.keys().forEach
    if /\*/.test( host ) {
      wildcard = new Wildcard( host )
      for cachedhost in weave.cache.wildcardMatches {
        if weave.cache.wildcardMatches.hasOwnProperty( cachedhost ) {
          if wildcard.match( weave.cache.wildcardMatches[ cachedhost ] ) {
            weave.cache.wildcardMatches[ cachedhost ] = false
          }
        }
      }
    } else if weave.cache.wildcardMatches[ host ] {
      weave.cache.wildcardMatches[ host ] = false
    }

    // Check for a valid hostname and port. (Inside the range 0x1-0xFFFF)
    if split = host.match( /^(.+?)(\:([0-9]{1,5}))$/ ) {
      port = Number( split[3] )
      if port < 1 || port > 65535 {
        return @error( "app.linkHost: {{port}} is not a valid port number." )
      }

      // We save the app to the host so that we can
      // quickly relate the Host header to the app.
      weave.apps[ host ] = @

      // We check to see if we have a server, running on the port yet.
      // If there isn't one then we start it, and have it listen to
      // the port with the address "::". By default Node only listens
      // on IPv4 addresses, but listening on the IPv6 "all interfaces"
      // address will allow it to listen on both simultaneously.
      // http://nodejs.org/api/dgram.html
      if !weave.servers[ port ] {
        weave.servers[ port ] = server = http.createServer()
        server.listen( port, "::" )

        q("request,upgrade").forEach( function event {
          server.on( event, function i, o {
            new weave.Connection( i, o )
          })
        })
      }
    }
  }, @)

  // Return @ from all configuration methods so they can be chained.
  return @
}

weave.App::addDirectory = function directory, inherit, configuration {
  // Clear the cache so that the configuration can be modified and
  // not conflict with previously caches requests.
  @cache.parentDirectories = {}

  // If we only have two arguments then inherit is actually going to be the
  // configuration. If we have three arguments, then we set the inheritance.
  // Connection::bahavior will load inheritance from @configuration._super,
  // followed by app.configuration, followed by weave.configuration.
  configuration ?
    configuration._super = String.is( inherit ) ?
      @configuration[ inherit ] :
      inherit :
    configuration = inherit

  // The main reason this event is important is for 3rd party modules
  // that might alter the configuration, or that need to clear caches
  // for anything that is based off of a configurable property.
  @emit( "configured", directory, configuration, @configuration, @ )
  @configuration[ directory ] = configuration

  // Return @ from all configuration methods so they can be chained.
  return @
}

weave.App::addInterface = function directory, handle {
  // TODO: Should there be a wrapper between the interface
  // and the configuration? Probably an object that also
  // contains details about what HTTP standards the interface
  // supports, like Upgrades, Cookies, etc.
  @configuration[ directory ] = handle

  // Return @ from all configuration methods so they can be chained.
  return @
}

weave.App::addWebSocket = function directory, handle {
  @addInterface( directory, function connection {
    var key, accept;
    // Make sure the client is expecting a WebSocket upgrade. Take the key,
    // and generate the handshake response by taking the SHA1 hash and encode
    // it as base64. Then we write the head, tell it to switch protocols, and
    // begin the WebSocket connection. If it isn't expecting a WebSocket
    // upgrade then we totally freak out and blow up the whole world instead.
    if ( connection.get( "connection" ) === "Upgrade" && connection.get( "upgrade" ) === "websocket" ) {
      key = connection.get( "sec-websocket-key" )
      accept = weave.utilities.SHA1_64( key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" )
      connection.writeHead( 101, {
        "Connection": "Upgrade",
        "Upgrade": "websocket",
        "Sec-WebSocket-Accept": accept
      })
      handle.call( connection, connection )
    }
  })

  return @
}





// The Connection class is responsible for determining which App is
// responsible for handling the ClientRequest and ServerResponse
// as well as interfacing between them.
weave.Connection = weave.Class( events.EventEmitter, function i, o {
	var app, directory;

  // For time tracking and caching purposes, save the time that
  // the connection first began processing. Initialize the state.
  @DATE = new Date()
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
          weave.util.RNDM_RG(0x100000,       0xFFFFFF,       16)   // be split into two numbers
                                                                   // because it's longer than
  // Initialize @directory for the initial length comparisons.     // what Math.random() generates
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
      } ) }
    //@app.router( @, @app.engine )???
    @app.router( @, function error, details {
      if details.type !== "interface" {
        @end( "{{@host}} {{details.path}}\n\n{{@UUID}}\n{{util.inspect(@configuration)}}" )
      }
    })
  } else {
    @app.error( "No configured directory for requested URL " + @url.pathname )
    @error( 404, "Requested URL did matched an app but did not have a configuration." )
  }
})

weave.Connection::behavior = function name {
  var behavior,
  nests = name.split(".");

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
        // FIXME: Let's note use the querystring module anymore.
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
    @_NODE_CONNECTION.write( "{{header}}: {{value}}\r\n" )
  }
}

weave.Connection::writeLastHeader = function header, value {
  // If there's an actual header to right, then right it.
  // Then end the header and start righting the body.
  if header {
    @writeHeader( header, value )
  }
  @_NODE_CONNECTION.write( "\r\n" )
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

  console.log( buf.toString() )
  // If we aren't writing the body yet, right some final headers.
  if @state < 3 {
    if @state < 2 {
      // Write required headers and shit
      @isKeepAlive && @writeHeader( "Transfer-Encoding", "chunked" )
      @writeLastHeader( "Date", @DATE.toUTCString() )

      @state = 2
    }

    if @isKeepAlive {
      buf = Buffer.concat( [
        new Buffer( Buffer.byteLength( content, encoding ).toString( 16 ) ), n,
        new Buffer( content, encoding ), n ] )

      @_NODE_CONNECTION.write( buf )
    } else {
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
