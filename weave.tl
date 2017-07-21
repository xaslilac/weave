/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2015
   Weave - Make webs */

// Strict mode is cool
"use strict";

var weave;
// Some basic utilities, like an asynchronous implemenation of Array::some,
// basic type detection (Constructor.is(possibleInstance)), an object extender,
// and a way to quickly write Arrays of strings. u is just short for undefined.
// n is short for a carriage return line feed buffer, and z is the last chunk
// of a message with Transfer-Encoding: chunked for Keep-Alive connections.
Array::someAsync = function f,c {var a=@,i=0,v=!1,t={
  next:function {i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function {c(!0)}};t.next()}
Object.extend = function o,e {@keys(e).forEach(function p {o[p]=e[p]});return o}
Function::is = function a {return a!=null&&(a.constructor===@::constructor)}





// TODO: So here are all the things I still need to bring over from Trailer.

// GZip, URL Redirects, URL Cleaning (maybe? but different? configurable?),
// request:data -> Connection piping, ReadFile with Content-Length***, caching,
// Last-Modified, and Content-Type. directory.html, directory.json, and
// directory listings in general? Remember the whole depth === 1 thing.
// Auto-generate error pages. There's still no way to write to the response
// without accessing Connection::_NODE_RESPONSE. Should we allow Constant
// HTTP Headers? Do they need to be written directly to each individual
// request? How will they be written?
// ***So I've since learned that the Content-Length header is not supposed to be
// used if the Transfer-Encoding is Chunked. So that's not really something
// that we need to do, because we always use Transfer-Encoding Chunked. ***






// TODO: All the things that are going to be new features in Weave that have
// not yet found a spot for implementation or are still being discussed.

// # Error page generation - scheduled for v0.2

// # Console/file logging - scheduled for v0.3
// Build a robust error and warning backend system with the ability to log to files

// # Remote debugging / Admin panel - scheduled for v0.4
// Add the ability to have an online debug console/admin panel that you would
// activate with App.addInterface( "/net-internals", new weave.AdminPanel(App) )
// or something similar. You'd be able to monitor an incoming request queue,
// interface directly with the App collection from a secure, remote, REPL with
// syntax highlighting, pretty printing, and more.

// # Command Line Interface - scheduled for v0.5
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

// # Partial downloads, uploads, streaming - scheduled for v0.6
// Enable the ability to stream a video file from a certain time stamp, to
// resume a disrupted download at a later time, and to accept user uploads. Read
// large files in chunks rather than entirely at once to avoid eating memory.

// # Stability & fine tuned error/warning reporting - scheduled for v0.7
// As we approach feature completeness and having a production ready product,
// fine tune the stability of the Weave to ensure that one request being mishandled
// or any third party code is never able to completely break the process. try, catch
// pairs on any calls to external resources, argument checking on all built in methods,
// and ensuring that any and all errors are incredibly tracable to make debugging
// quick and painless.

// # SPDY Protocol / GZip / HTTP 2.0 / HTTPS support - scheduled for v1.0
// Add support for Google's SPDY protocol and for HTTP 2.0. HTTPS support is
// hard for me to implement without access to any sort of secure certificate
// of my own to work with, and is a requirement for SPDY.
// So it seems that HTTPS support is simply creating an extra server, using
// certificates supplied, and doing some extra stuff to hook up the server
// to the app. Not sure how supporting multiple certificates would work.





// Import all of the modules that we need before we do anything crazy.
module 'crypto';

module.exports = exports = weave = {
  version: "0.1.8",

  servers: {}, apps: {}, cache: { wildcardMatches: {} },
  constants: { WebSocketUUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
               Separator: process.env.OS === "Windows_NT" ? "\\" : "/",
               HOME: process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH || "/" },
               // Should the failsafe possibly be "/usr/"? The only downside is it might not exist.

  util: {
    SHA1_64: function data {
      return crypto.createHash( "sha1" ).update( data ).digest( "base64" ) },
    RNDM_RG: function min, max, base {
      return Math.floor( ( Math.random() * ( ( max + 1 ) - min ) ) + min ).toString( base ) } },

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

  Dictionary: require( './utilities/MIME' ),

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
      description: {
        value: description,
        enumerable: true, writable: false, configurable: true }
    })
  },

  configuration: {
    //adminEmail: "foo@bar.com"
  }
}

require( './app' )
require( './connection' )
require( './router' )
require( './printer' )

process.argv.forEach( function arg {
  switch arg {
    case "--aww-hell-yes":
      console.log( "aww hell yes" )
      break;
  }
}, @ )
