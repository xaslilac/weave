var crypto, events, fs, http, path, url, util;/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2014
   Weave - Make webs [-0.3] (pre-release) */

// Strict mode is actually great for use in debugging, and catching
// problems in code that wouldn't usually be found. You should try it.
"use strict";

// Some basic utilities, like an asynchronous implemenation of Array::some,
// basic type detection (Constructor.is(possibleInstance)), an object extender,
// and a way to quickly write Arrays of strings. u is just short for undefined.
var q, u;

Array.prototype.someAsync = function (f,c ){var a=this,i=0,v=!1,t={
  next:function (){i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function (){c(!0)}};t.next()}
Function.prototype.is = function (a ){return a!=null&&(a.constructor===this.prototype.constructor)}
Object.extend = function (o,e ){this.keys(o).forEach(function (p ){if (!e.hasOwnProperty(p)){e[p]=o[p]}});return e}
q = function (s ){ return s.split(",") }





// TODO: So here are all the things I still need to bring over from Trailer.

// MimeDictionary, GZip, URL Redirects, URL Cleaning (maybe? but different?),
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
var weave, DOM, MIME, Wildcard;
crypto=require('crypto');events=require('events');fs=require('fs');http=require('http');path=require('path');url=require('url');util=require('util');;
DOM = require( "./utilities/DOM.js" )
MIME = require( "./utilities/MIME.js" )
Wildcard = require( "./utilities/Wildcard.js" )

module.exports = exports = weave = {
  version: 0.3,

  servers: {}, apps: {},
  cache: { wildcardMatches: {} },
  // constants: {}, ???????????????????????????????????????

  util: {
    SHA1_64: function (data ){
      return crypto.createHash( "sha1" ).update( data ).digest( "base64" ) },
    RNDM_RG: function (min, max, base ){
      return Math.floor( ( Math.random() * ( ( max + 1 ) - min ) ) + min ).toString( base ) } },

  Class: function (inherit, constructor ){
    constructor.prototype = Object.create( inherit.prototype, {
      constructor: {
        value: constructor,
        enumerable: false, writable: true, configurable: true },
      _super: {
        value: inherit,
        enumerable: false, writable: true, configurable: true } } )

    return constructor
  },

  Dictionary: MIME
}





weave.App = weave.Class( events.EventEmitter, function (){
  // Create the initial configuration storage object and use
  // resetCache() to create the initial empty cache.
  this.configuration = {}
  this.resetCache()

  // Do I want to import modules here? Or somewhere else?
  // What are we supposed to do to with the arguments?
  // I really want to do something important here :(

  // TODO: This is where we need to create an error log for
  // the app and other app wide configuration stuff.
})

weave.App.prototype.resetCache = function (){
  this.cache = {
    resolvedPaths: {},
    parentDirectories: {}
  }
}

weave.App.prototype.listen =
weave.App.prototype.linkHost = function (){
  var app = this;
  Array.prototype.forEach.call( arguments, function (host ){
    var wildcard, cachedhost, split, hostname, port, server;

    // If the argument is just the port, default the host to *
    if (Number.is( host ) ){
      host = "*:"+host
    }

    // If the host is a wildcard then clear all wildcardMatches that match
    // it. If it's a literal, clear wildcardMatches for that literal.
    if (/\*/.test( host ) ){
      wildcard = new Wildcard( host )
      for (cachedhost in weave.cache.wildcardMatches ){
        if (weave.cache.wildcardMatches.hasOwnProperty( cachedhost ) ){
          if (wildcard.match( weave.cache.wildcardMatches[ cachedhost ] ) ){
            weave.cache.wildcardMatches[ cachedhost ] = false
          }
        }
      }
    } else if (weave.cache.wildcardMatches[ host ] ){
      weave.cache.wildcardMatches[ host ] = false
    }

    // Check for a valid hostname and port. (Inside the range 0x1-0xFFFF)
    if (split = host.match( /^(.+?)(\:([0-9]{1,5}))$/ ) ){
      port = Number( split[3] )
      if (port < 1 || port > 65535 ){
        // TODO: Something about errors and telling people that this
        // isn't going to work because the port number is invalid
        // Probably return something more informative than return 0;
        return 0;
      }

      // We save the app to the host so that we can
      // quickly relate the Host header to the app.
      weave.apps[ host ] = app

      // We check to see if we have a server, running on the port yet.
      // If there isn't one then we start it, and have it listen to
      // the port with the address "::". By default Node only listens
      // on IPv4 addresses, but listening on the IPv6 "all interfaces"
      // address will allow it to listen on both simultaneously.
      // http://nodejs.org/api/dgram.html
      if (!weave.servers[ port ] ){
        weave.servers[ port ] = server = http.createServer()
        server.listen( port, "::" )

        q("request,upgrade").forEach( function (event ){
          server.on( event, function (i, o ){
            new weave.Connection( i, o )
          })
        })
      }
    }
  })

  // Return @ from all configuration methods so they can be chained.
  return this
}

weave.App.prototype.addDirectory = function (directory, inherit, configuration ){
  // Clear the cache so that the configuration can be modified and
  // not conflict with previously caches requests.
  this.resetCache()

  // If we only have two arguments then inherit is actually going to be the
  // configuration. If we have three arguments, then we set the inheritance.
  // Connection::bahavior will load inheritance from @configuration._super.
  configuration ?
    configuration._super = this.configuration[ inherit ] :
    configuration = inherit

  this.configuration[ directory ] = configuration

  return this
}

weave.App.prototype.addInterface = function (directory, handle ){
  // TODO: There should be a wrapper between the interface
  // and the configuration. Probably an object that also
  // contains details about what HTTP standards the interface
  // supports, like Upgrades, Cookies, etc.
  this.configuration[ directory ] = handle

  return this
}

weave.App.prototype.addWebSocket = function (directory, handle ){
  this.addInterface( directory, function (connection ){
    var key, accept;
    // Make sure the client is expecting a WebSocket upgrade. Take the key,
    // and generate the handshake response by taking the SHA1 hash and encode
    // it as base64. Then we write the head, tell it to switch protocols, and
    // begin the WebSocket connection. If it isn't expecting a WebSocket
    // upgrade then we totally freak out and blow up the whole world instead.
    if ( connection.get( "connection" ) === "Upgrade" && connection.get( "upgrade" ) === "websocket" ) {
      key = connection.get( "sec-websocket-key" )
      accept = weave.utilities.SHA1_64( key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" )
      connection._NODE_RESPONSE.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Connection: Upgrade\r\n" +
        "Upgrade: websocket\r\n" +
        "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
      )
      handle.call( connection, connection )
    }
  })

  return this
}





// The Connection class is responsible for determining which App is
// responsible for handling the ClientRequest and ServerResponse
// as well as interfacing between them.
weave.Connection = weave.Class( events.EventEmitter, function (i, o ){
	var app, directory;

  // For time tracking and caching purposes, save the time that
  // the connection first began processing. Initialize the state.
  this.DATE = new Date()
  this.state = this.PROCESSING

  // Currently, we only support HTTP version 1.1 requests.
  if (i.httpVersion !== "1.1" ){
    // TODO: In the future respond with a 505.
    console.log( "kill it with fire!", i.httpVersion )
    return i.connection.destroy()
  }

  // Save these here, mainly for internal use with the classes methods.
  // Ideally these wouldn't be used outside of Weave. All interactions
  // with them should be through using methods of the Connection class.
  this._NODE_REQUEST = i
  this._NODE_CONNECTION = i.connection

  // XXX: THIS IS TEMPORARY THIS IS TEMPORARY THIS IS TEMPORARY
  // Or is it, I kind of don't want it to be. Writing your own HTTP printer
  // is kind of hard and kind of unnecessary except when it is. (Upgrades)
  this._NODE_RESPONSE = o

  // Give each connection a UUID for a little bit of tracing.
  this.UUID = weave.util.RNDM_RG(0x10000000,     0xFFFFFFFF,     16) + "-" +
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
  this.directory = ""
	this.host = i.headers.host.match( /^(.+?)(\:([0-9]{1,5}))?$/ )[1] + ":" + i.connection.localPort
	this.url = url.parse( path.normalize( i.url ) )

  // Check for a direct host match, or a cached wildcard match.
  // If there isn't one, check against wildcards, filtering out hosts
  // that don't contain at least one wildcard since they won't match.
  if (weave.apps[ this.host ] ){
    this.app = weave.apps[ this.host ].app
  } else if (weave.cache.wildcardMatches[ this.host ] ){
    this.app = weave.cache.wildcardMatches[ this.host ]
  } else {
		app = Wildcard.bestMatch(
      Object.keys( weave.apps ).filter( function (host ){
        return /\*/.test( host )
      }),
    this.host )

    // Remember which wildcard best matched this host for next time
    // If there isn't a linked app then just end the connection
    // and exit out of the function.
		if (app ){
			this.app = weave.cache.wildcardMatches[ this.host ] = weave.apps[ app ]
		} else {
      // XXX: ????????????????????????????????????????????????
      if (!this.changeState( this.NO_APP ) ){
  			return i.connection.destroy()
      }
		}
	}

  // Check to see if we've already found the configuration for this path
  // If not check to see if there's a directory with a configuration that matches
  // the URL that we're processing and cache it. If there are multiple matches we
  // check it against the last match to see if it's longer. The longest match
  // should always be the most specific configuration.
  if (this.app.cache.parentDirectories[ this.url.pathname ] ){
    this.directory = this.app.cache.parentDirectories[ this.url.pathname ]
  } else {
    for (directory in this.app.configuration ){
      if (this.app.configuration.hasOwnProperty( directory ) ){
        if (~this.url.pathname.indexOf( directory ) && directory.length > this.directory.length ){
          this.directory = this.app.cache.parentDirectories[ this.url.pathname ] = directory
        }
      }
    }
  }

  // If we found a matching directory, then we save which configuration
  // is handling the connection, and shorten the URL relative to the
  // directory. If we didn't find a match then report a 501 (Not Implemented).
  if (this.directory ){
    this.changeState( this.ACCEPTED )
    this.configuration = this.app.configuration[ this.directory ]
    this.url.pathname = path.relative( this.directory, this.url.pathname )
    this.resolve( function (error, details ){
      // TODO: Should this be able to say WebSocket?
      if (details.type !== "interface" ){
        this.end( this.host+" "+details.path+"\n\n"+this.UUID+"\n"+util.inspect(this.configuration) )
      }
    })
  } else {
    this.changeState( this.NO_CONFIGURATION )
  }
})

// XXX: There's a lot that I like about this API, and there's also
// a lot to dislike. Having one universal event, and having all
// listeners be called everytime anything happens is a slow down.
// However, it's very convient for checking progress on a request,
// as all the variables are numbers, allowing you to use <, <=, etc.
// I feel that event names need to be make more specific, and that
// these progress variables should only be used internally.
Object.extend( {          // These are the possible values for Connection::state
                          // Always reference these variables and not the numbers
                          // themselves, as they are not final and may change.
  PROCESSING: 0,          // The request has been received and is being processed.
  HTTP_UNSUPPORTED: 1,    // Currently, all connections must be HTTP/1.1.
  NO_APP: 4,              // There is not an app to handle the request.
  NO_CONFIGURATION: 5,    // There is not a configuration for the requested url.
  PROCESSING_UPGRADE: 10, // The request is for an upgrade and is being processed.
  UPGRADED: 11,           // The request has been successfully upgraded.
  UNABLE_TO_UPGRADE: 19,  // We were not able to upgrade the request.
  ACCEPTED: 20,           // The request has been match to an app and configuration.
  WRITING_HEAD: 24,       // Response status has been written and we are writing headers.
  WRITING_BODY: 27,       // Headers have been written and we are writting the body.
  SUCCESSFUL: 22,         // Response has been written and the connection is closed.
  REDIRECTED: 30,         // Connection was redirected. Do not use for cached responses.
}, weave.Connection.prototype )

// I also don't really like this API, and I don't like
// having to do essentially the same thing multiple times.
// How do I teach this function the names of more specific
// events so that it can emit them as well? I suppose you
// could listen to each specific event and have it call
// changeState, but that's a lot of boilerplate, too many
// extra function calls, and would prevent being able to
// tell if anyone else is actually listening to events,
// since we would be listening to all of them.
weave.Connection.prototype.changeState = function (state ){
  if (this.state < state ){
    this.state = state
    return this.emit( "statechange", state, this )
  }
}

weave.Connection.prototype.behavior = function (name ){
  var behavior, property, _super;

  property = this.configuration[ name ]
  if (this.configuration._super ){ _super = this.configuration._super[ name ] }

  // TODO: In the future we might do extra processing on
  // behavior before returning it Or will we? I think maybe
  // we should just keep leaving it alone.
  behavior = property || _super

  return behavior
}

weave.Connection.prototype.get =
weave.Connection.prototype.getHeader = function (name, asString ){
  // Make sure the header name is lowercase, so that it
  // can be case insensitive.
  name = name.toLowerCase()

  // If asString is true then the header must be returned as a 
  // plain string. If it's not, then we can do some processing
  // to make it more useful than a string.
  if (!asString ){
    switch (name ){
      // TODO: When this gets implemented in Teal 0.4,
      // make sure this gets updated.
      // case "if-modified-since" {
      // }
      case "if-modified-since":
        // FIXME: If the header is undefined it will just
        // return whatever the date is right now.
        return new Date( this._NODE_REQUEST.headers[ name ] )
        break;
      case "cookies":
        // FIXME: Let's note use the querystring module anymore.
        return querystring.parse( this._NODE_REQUEST.headers.cookie, "; " )
        break;
    }
  }

  // If something else hasn't already been returned, or if asString
  // is true then just return the header as a normal string.
  return this._NODE_REQUEST.headers[ name ]
}

weave.Connection.prototype.isUpgrade = function (){
  return this.get( "connection" ) === "Upgrade"
}

q("destroy,pause,resume").forEach( function (name ){
  weave.Connection.prototype[name] = function (){
    this._NODE_CONNECTION[name]()
  }
})

weave.Connection.prototype.resolve = function (callback ){
  var cursor, connection, details;

  // We need to save the connection, since we have to deal
  // with so many asynchronous functions and callbacks, and
  // details is what we will give the callback as a result.
  // XXX: I think we need to define details as a constant
  // and create a copy for each connection using Object.create
  connection = this
  details = {
    isDirectory: function (){ return this.type === "directory" },
    isFile:      function (){ return this.type === "file" },
    isInterface: function (){ return this.type === "interface" },
    // path: resolved path,
    // result: the result of the function if ifFunction is true,
    // stats: fs.stat,
    // type: "directory"|"file"|"interface",
    url: connection.url
  }

  // If the configuration is a Function, then the directory is an
  // Interface, so set the type and call the callback with the results.
  if (Function.is( connection.configuration ) ){
    return callback.call( connection, undefined, Object.extend( details, {
      type: "interface", result: connection.configuration( connection )
    }))
  }

  // Upgrades are only supported via interfaces.
  // TODO: Let's emit an upgrade event here as one last attempt
  // at saving the connection before we destroy it.
  if (connection.isUpgrade() ){
    connection._NODE_CONNECTION.destroy()
    return callback.call( connection, "could not upgrade" )
  }

  // cursor points to where ever we're searching for files.
  cursor = path.join( connection.configuration.location
    .replace( /^~/, process.env.HOME ), connection.url.pathname )

  // Set the initial depth to 0. Depth is used to keep track of
  // how many directories we've moved down from the original url.
  // This is mainly used for directory indexes with finite depth.
  if (!connection.url.hasOwnProperty( "depth" ) ){
    connection.url.depth = 0
  }

  // Check to see if it exists, and if it's a file or a directory.
  // If it doesn't exist, then step up a directory and try again.
  fs.exists( cursor, function (exists ){
    if (exists ){
      fs.stat( cursor, function (error, stats ){
        // If it's a file, then we're done, and we just call the callback.
        // If it's a directory, then check for an index, making sure that
        // is has a fitting depth, that it exists, and is a file. We use a
        // customized Array::some function that you can use with asynchronous
        // functions, since you tell it when to go to the next item. The
        // callback is run when .next() is called but there is not another
        // item to process, so it will only be called if there isn't a match.
        if (stats.isFile() ){
          callback.call( connection, undefined, Object.extend( details, {
            path: cursor, stats: stats, type: "file"
          }))
        } else if (stats.isDirectory() ){
          Object.keys( connection.configuration.indexes ).someAsync( function (index, n, some ){
            if (connection.url.depth <= connection.configuration.indexes[ index ] ){
              index = path.join( cursor, index )
              fs.exists( index, function (exists ){
                if (exists ){
                  fs.stat( index, function (error, stats ){
                    if (stats.isFile() ){
                      callback.call( connection, undefined, Object.extend( details, {
                        path: index, stats: stats, type: "file"
                      }))
                    } else some.next()
                  })
                } else some.next()
              })
            } else some.next()
          }, function (){
            if (connection.url.depth === 0 ){
              callback.call( connection, undefined, Object.extend( details, {
                path: cursor, stats: stats, type: "directory"
              }))
            } else {
              // TODO: Should change this to something about "directory
              // found but contained no indexes"
              callback.call( connection, 404 )
            }
          })
        }
      })
    } else {
      // If there's room to step back and keep searching for files then we do so.
      if (path.relative( connection.configuration.location, connection.url.pathname ) ){
        connection.url.pathname = path.join( connection.url.pathname, ".." )
        connection.url.depth++
        this.resolve( callback )
      } else {
        callback.call( connection, 404 )
      }
    }
  })
}

// TODO: weave.Connection::writeHead but with a different name
// Possibly weave.Connection::set
// set( "status", 200 )
// set( 200 )
// set( "Date", new Date something something)
// set({ Date: new Date something } )

// TODO: weave.Connection::write
weave.Connection.prototype.write = function (first, second ){
  if (arguments.length === 1 ){
    if (Number.is( first ) ){
      this._NODE_CONNECTION.write( "HTTP/1.1 "+first+" "+http.STATUS_CODES[first]+"\r\n" )
      this.state = this.WRITING_HEAD
    } else {
      // Finish the head before writing the body
      if (this.state === this.WRITING_HEAD ){
        this._NODE_CONNECTION.write( "\r\n" )
      }
      this._NODE_CONNECTION.write( first )
    }
  } else if (arguments.length === 2 ){
    if (Number.is( first ) && Object.is( second ) ){
      this._NODE_CONNECTION.write( "HTTP/1.1 "+first+" "+http.STATUS_CODES[first]+"\r\n" )
      Object.keys( second ).forEach( function (key ){
        this._NODE_CONNECTION.write( key+": "+second[key]+"\r\n" )
      })
      this.state = this.WRITING_HEAD
    } else if (String.is( first ) && String.is( second ) ){
      // Make sure the status is already written, before writing a header
      if (this.state === this.WRITING_HEAD ){
        this._NODE_CONNECTION.write( first+": "+second )
      } else {
        // Write it later or something
      }
    }
  } else {
    // TODO: Too many arguments, error out
    return 0;
  }
}

// TODO: weave.Connection::end
weave.Connection.prototype.end = function (){
  //@write.apply( @, arguments )

  this._NODE_RESPONSE.end.apply( this._NODE_RESPONSE, arguments )

  // Something about \r\n0\r\n
}
