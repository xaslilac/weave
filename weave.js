// MIT License / Copyright Kayla Washburn 2015

"use strict";

let crypto = require( 'crypto' )
let http = require( 'http' )
let gardens = require( '../utilities/gardens' )

const weave = module.exports = exports = ( ...conf ) => new weave.App( ...conf )

Object.assign( weave, {
  Dictionary: require( './utilities/mimedictionary' ),
  createGarden: gardens.createGarden
})

gardens.configure( weave.configuration )

require( './app' )
require( './core' )
require( './websocket' )

let garden = weave.createGarden( 'weave' )

Object.assign( weave, {
  version: '0.2.3',

  servers: {}, apps: { anonymous: [] }, hosts: {},
  constants: { WebSocketUUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
               HOME: process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH,
               STATUS_CODES: http.STATUS_CODES },

  verbose( verbose = true ) { gardens.verbose = verbose },
  silent() { this.verbose( false ) },

  configuration: {
    'urlCleaning': true,
    'headers': { 'X-Powered-By': 'Weave' },
    'cache': { maxCacheSize: 500, maxCachedFileSize: 5 } },

  configure: weave.App.prototype.configure,
  engine: weave.App.prototype.engine,

  util: {
    SHA1_64: data => crypto.createHash( 'sha1' ).update( data ).digest( 'base64' ),
    RNDM_RG: ( min, max, base ) => {
      let r = Math.floor( ( Math.random() * ( ( max + 1 ) - min ) ) + min );
      return base ? r.toString( base ) : r } },

  HTTPError: class HTTPError {
    constructor( code, desc ) {
      if ( typeof code !== 'number' ) garden.typeerror( 'HTTPError requires argument code to be a number!' )

      if ( desc instanceof Error ) desc = `${desc.name}: ${desc.message}\n${desc.stack}`

      Object.defineProperties( this, {
        status: { value: weave.constants.STATUS_CODES[ code ], enumerable: true },
        statusCode: { value: code, enumerable: true },
        description: { value: desc, enumerable: true }
      })
    }
  },

  flags: {
    awwHeckYes() { console.log( 'Aww heck yes!!' ) },
    weaveVerbose() { weave.verbose() },
    enableWeaveRepl() { require( './utilities/repl' ).connect() },
    enableWeaveInstruments() { require( './utilities/instruments' ) },
    enableInterfaceEngine() { weave.engine( '.interface', weave.interfaces.engine ) },
    enableReactEngine() { require( './react' ) }
  }
})

// Read command line configuration options
process.argv.forEach( ( arg, index ) => {
  if ( arg.indexOf( '--' ) === 0 ) {
    let narg = weave.flags[ arg.substring( 2 ).toLowerCase()
      .replace( /\-([a-z])/g, ( whole, letter ) => letter.toUpperCase() ) ]

    if ( typeof narg === 'function' ) narg( ...process.argv.slice( index + 1 ) )
  }
})
