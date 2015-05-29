/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2015
   Weave - Make webs */

// Strict mode is actually great for use in debugging, and catching
// problems in code that wouldn't usually be found. You should try it.
"use strict";

// Some basic utilities, like an asynchronous implemenation of Array::some,
// basic type detection (Constructor.is(possibleInstance)), an object extender,
// and a way to quickly write Arrays of strings. u is just short for undefined.
// n is short for a carriage return line feed buffer, and z is the last chunk
// of a message with Transfer-Encoding: chunked for Keep-Alive connections.
var weave, q;

Array::someAsync = function f,c {var a=@,i=0,v=!1,t={
  next:function {i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function {c(!0)}};t.next()}
Function::is = function a {return a!=null&&(a.constructor===@::constructor)}
Object.extend = function o,e {@keys(o).forEach(function p {if !e.hasOwnProperty(p){e[p]=o[p]}});return e}
q = function s { return s.split(",") }





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
// used if the Transfer-Encoding is Chunked. So I'm not sure if we actually need
// to implement that or not. We could probably get away with live measuring as
// we send data out.***






// TODO: All the things that are going to be new features in Weave that have
// not yet found a spot for implementation or are still being discussed.

// # Console logging - scheduled for v0.4
// We needs to add some sort of unified error reporting system.

// # Remote debugging / Admin panel - scheduled for v0.6
// Add the ability to have an online debug console/admin panel that you would
// active with App.addInterface( "/net-internals", new weave.AdminPanel(App) )
// or something similar. You'd be able to monitor an incoming request queue,
// interface directly with the App collection from a secure, remote, REPL with
// syntax highlighting, pretty printing, and more.

// # Command Line Interface - scheduled for v0.8
// The main reason this would be important, is it would provide a simple way
// to actively maintain your server while it is running, without needing to
// close a process, and open a new one. You could essentially "hot-swap" your
// configuration of the directory by using the command line. This could also
// also provide a simple way to start a server from the command line without
// directly handling a node process instance. This would allow you to close
// your terminal window when it's unneeded instead of leaving it open all the
// time. This is something that I've wanted to be able to do for a while, but
// is incredibly hard to implement, and would need to be outlined in detail.

// # SPDY Protocol / GZip / HTTP 2.0 / HTTPS support - scheduled for v1.0
// Add support for Google's SPDY protocol and for HTTP 2.0. HTTPS support is
// hard for me to implement without access to any sort of secure certificate
// of my own to work with, and is a requirement for SPDY.
// So it seems that HTTPS support is simply creating an extra server, using
// certificates supplied, and doing some extra stuff to hook up the server
// to the app.





// Import all of the modules that we need before we do anything crazy.
module 'crypto';

module.exports = exports = weave = {
  version: -0.4,

  servers: {}, apps: {}, cache: { wildcardMatches: {} },
  constants: { WebSocketUUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" },

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

  _pieces: function l {
    q(l).forEach(function (m) {
      require( "./{{m}}" )
    })
  },

  Dictionary: require( "./utilities/MIME" ),

  configuration: {
    //adminEmail: "foo@bar.com"
  }
}

weave._pieces( "app,connection,router,printer" )
