/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2015
   Weave - Make webs */

// Strict mode is cool
"use strict";

// Some basic utilities, like an asynchronous implemenation of Array::some,
// an object property setter, and basic universal type detection.
Array::someAsync = function f,c {var a=@,i=0,v=!1,t={
  next:function {i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function {c(!0)}};t.next()}
Object.extend = function o,e {o!=null&&e!=null&&@keys(e).forEach(function p {o[p]=e[p]});return o}
Function::is = function a {return a!=null&&(a.constructor===@::constructor)}





// TODO: Here are all the things I still need to bring over from Trailer.
// URL Redirects, ReadFile with Content-Length***,
// Should we allow Constant HTTP Headers? Do they need to be written directly to each individual
// request? How will they be written?

// ***So I've since learned that the Content-Length header is not supposed to be
// used if the Transfer-Encoding is Chunked. So that's not really something
// that we need to do, because we always use Transfer-Encoding Chunked. ***






// TODO: All the things that are going to be new features in Weave that have
// not yet found a spot for implementation or are still being discussed.

// # Groundwork - v0.1 (WebSocks)
// Get the basics in, along with a couple of goodies. Be generally reliable,
// strong routing features, a base WebSocket implementation, document generation
// through a server-side DOM tree for error pages, etc., basic caching ground work.

// # Console/file logging - v0.2
// Build a robust error and warning backend system with the ability to log to files

// # Remote debugging / Admin panel - v0.3
// Add the ability to have an online debug console/admin panel that you would
// activate with App.addInterface( "/net-internals", new weave.AdminPanel(App) )
// or something similar. You'd be able to monitor an incoming request queue,
// interface directly with the App collection from a secure, remote, REPL with
// syntax highlighting, pretty printing, and more.

// # Command Line Interface - v0.4 (Librarian (Sh))
// Could be helpful for things like clearing a cache or updating a setting.
// The main reason this would be important, is it would provide a simple way
// to actively maintain your server while it is running, without needing to
// close a process, and open a new one. You could essentially "hot-swap" your
// configuration of the directory by using the command line. This could also
// also provide a simple way to start a server from the command line without
// directly handling a node process instance. This would allow you to close
// your terminal window when it's unneeded instead of leaving it open all the
// time. This is something that I've wanted to be able to do for a while, but
// is incredibly hard to implement, and would need to be outlined in detail.

// # File system caching, chunking - v0.5 (Snacks)
// Read large files in chunks rather than entirely at once to avoid eating memory.
// Cache smaller files in memory for quick access, with easily set parameters for
// how much we can store.

// # Partial downloads, uploads, streaming - v0.6 (Sherbet Ice-Stream)
// Enable the ability to stream a video file from a certain time stamp, to
// resume a disrupted download at a later time, and to accept user uploads.

// # Standalone operation - v0.7 (Independant Black Spider)
// Polish the CLI enough to be able to run entirely from the command line.

// # SPDY Protocol / GZip / HTTP 2.0 / HTTPS support - v0.8
// Add support for Google's SPDY protocol and for HTTP 2.0. HTTPS support is
// hard for me to implement without access to any sort of secure certificate
// of my own to work with, and is a requirement for SPDY.
// So it seems that HTTPS support is simply creating an extra server, using
// certificates supplied, and doing some extra stuff to hook up the server
// to the app. Not sure how supporting multiple certificates would work.

// # Stability & fine tuned error/warning reporting - v0.9
// As we approach feature completeness and having a production ready product,
// fine tune the stability of the Weave to ensure that one request being mishandled
// or any third party code is never able to completely break the process. try, catch
// pairs on any calls to external resources, argument checking on all built in methods,
// and ensuring that any and all errors are incredibly tracable to make debugging
// quick and painless.

// # Release - v1.0 (Free from the Web)
// All desired features polished and in place for the world to see!





// Import all of the modules that we need before we do anything crazy.
module 'crypto', 'http';
Zen := require( './utilities/Zen' )

weave := module.exports = exports = {
  version: "0.1.10",

  servers: {}, apps: {}, hosts: {}, cache: { wildcardMatches: {} },
  constants: { WebSocketUUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
               Separator: process.env.OS === "Windows_NT" ? "\\" : "/",
               HOME: process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH || "/",
               STATUS_CODES: http.STATUS_CODES,
               STATUS_DESCRIPTIONS: {
                 404: "The file you requested may have been moved or no longer exists."
               } },

  zen: new Zen( 'weave' ),

  configuration: {
   adminEmail: "foo@bar.com" },

  util: {
    SHA1_64: function data {
      return crypto.createHash( "sha1" ).update( data ).digest( "base64" ) },
    RNDM_RG: function min, max, base {
      var r = Math.floor( ( Math.random() * ( ( max + 1 ) - min ) ) + min );
      return base ? r.toString( base ) : r },
    READ_BITS: function byte {
      return [ byte >= 128 ? 1 : 0,
      (byte %= 128) >= 64  ? 1 : 0,
      (byte %= 64)  >= 32  ? 1 : 0,
      (byte %= 32)  >= 16  ? 1 : 0,
      (byte %= 16)  >= 8   ? 1 : 0,
      (byte %= 8)   >= 4   ? 1 : 0,
      (byte %= 4)   >= 2   ? 1 : 0,
      (byte %= 2)   == 1   ? 1 : 0 ] },
    BINARY_UINT: function binary {
      return Number.parseInt( binary.join(""), 2 ) },
    times: function times, task {
      var t = 0; while t++ < times { task() } } },

  Class: function inherit, constructor {
    constructor:: = Object.create( inherit::, {
      constructor: {
        value: constructor,
        enumerable: false, writable: false, configurable: true },
      _super: {
        value: inherit,
        enumerable: false, writable: true, configurable: true } } )

    return constructor
  },

  Dictionary: require( './utilities/MimeDictionary' ),

  HTTPError: function code, description {
    if !Number.is( code ) {
      console.error( 'HTTPError requires argument code to be a number!' )
    }

    return Object.create( weave.HTTPError::, {
      constructor: {
        value: weave.HTTPError,
        enumerable: false, writable: false, configurable: true },
      status: {
        value: code,
        enumerable: true, writable: false, configurable: true },
      statusCode: {
        value: weave.constants.STATUS_CODES[ code ],
        enumerable: true, writable: false, configurable: true },
      description: {
        value: description || weave.constants.STATUS_DESCRIPTIONS[ code ],
        enumerable: true, writable: false, configurable: true }
    })
  }
}

require( './app' )
require( './connection' )
require( './router' )
require( './printer' )

process.argv.forEach( function arg {
  switch arg {
    case "--aww-heck-yes":
      console.log( "aww heck yes" )
      break;
    case "--weave-debug":
      weave.debug = true
      //require( './debug' )
      break;
    case "--enable-repl":
      require( './developer-tools/repl' )
      weave.connectREPL( process.stdin, process.stdout )
      break;
    case "--enable-web-instruments":
      require( './developer-tools/web-instruments' )
      break;
    case "--enable-web-socket":
      require( './websocket' )
      break;
  }
})

//require( weave.debug ? './' )
