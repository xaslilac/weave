/* MIT License
   Copyright 2015
   Created by partheseas
   Weave - Make webs */

"use strict";

let crypto = require( 'crypto' )
let http = require( 'http' )
let path = require( 'path' )

let weave = module.exports = exports =
  ( appName, ...conf ) => new weave.App( appName, ...conf )

Object.assign( weave, {
  version: '0.1.11',

  servers: {}, apps: { anonymous: [] }, hosts: {},
  constants: { WebSocketUUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
               HOME: process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH || '/',
               STATUS_CODES: http.STATUS_CODES },

  sources: 'app, cache, connection, manifest, printer, router, websocket',

  configuration: {
    'urlCleaning': true,
    'headers': { 'X-Powered-By': 'Weave' },
    'cache': { maxCacheSize: 500, maxCachedFileSize: 5 } },

  util: {
    SHA1_64: data => crypto.createHash( 'sha1' ).update( data ).digest( 'base64' ),
    RNDM_RG: ( min, max, base ) => {
      let r = Math.floor( ( Math.random() * ( ( max + 1 ) - min ) ) + min );
      return base ? r.toString( base ) : r } },

  Dictionary: require( './utilities/MimeDictionary' ),
  Garden: require( './utilities/Garden'),

  HTTPError: class HTTPError {
    constructor( code, description ) {
      if ( typeof code !== 'number' ) console.error( 'HTTPError requires argument code to be a number!' )

      Object.defineProperties( this, {
        status: { value: weave.constants.STATUS_CODES[ code ], enumerable: true },
        statusCode: { value: code, enumerable: true },
        description: { value: description, enumerable: true }
      })
    }
  },

  flags: {
    awwHeckYes() { console.log( 'aww heck yes' ) },
    weaveVerbose() { weave.Garden.enableDebug() },
    enableWeaveRepl() { require( './developer/repl' ).connect() },
    enableWeaveInstruments() { require( './developer/instruments' ) } }
});

weave.sources.split(', ').forEach( module => require( `./${module}` ) )

process.argv.forEach( ( arg, index ) => {
  if ( arg.indexOf( '--' ) === 0 ) {
    let narg = weave.flags[ arg.substring( 2 ).toLowerCase()
      .replace( /\-([a-z])/g, ( whole, letter ) => letter.toUpperCase() ) ]

    if ( typeof narg === 'function' ) narg( ...process.argv.slice( index + 1 ) )
  }
})
