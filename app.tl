// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( './weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n');
var Wildcard;



module "events", "http";
Wildcard = require( "./utilities/Wildcard" )

// The App class contains configuration data and handles delegation,
// tracking, and caching of requests.
weave.App = weave.Class( events.EventEmitter, function appName {
  // Create the initial configuration storage object and use
  // resetCache() to create the initial empty cache.
  @appName = appName,
  @configuration = {}
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
        console.log( "aww hell yes" )
        break;
    }
  }, @ )

  // The router processes the request, decides what should be done with it,
  // and then passes those details on to the printer for it to generate the
  // actual response.
  @router = new weave.Router()
  @printer = new weave.Printer()

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
        server.listen( port, '::' );
        
        ['request', 'upgrade'].forEach( function event {
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
    // As in we don't do anything at all and just ignore the connection.
    // TODO: Should we just end it here or is there something weird I did?
    if ( connection.get( "connection" ) === "Upgrade" && connection.get( "upgrade" ) === "websocket" ) {
      key = connection.get( "sec-websocket-key" )
      accept = weave.utilities.SHA1_64( key + weave.constants.WebSocketUUID )
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
