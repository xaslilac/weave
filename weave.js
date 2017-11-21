// MIT License / Copyright Kayla Washburn 2015

"use strict";

let crypto = require( 'crypto' )
let http = require( 'http' )
let os = require( 'os' )

let gardens = require( 'gardens' )
let dictionaries = require( './utilities/mimedictionary' )

const weave = module.exports = exports = ( ...conf ) => new weave.App( ...conf )

Object.assign( weave, {
  createDictionary: dictionaries.createDictionary,
  createGarden: gardens.createGarden,

  util: {
    SHA1_64: data => crypto.createHash( 'sha1' ).update( data ).digest( 'base64' ),
    RNDM_RG: ( min, max, base ) => {
      let r = Math.floor( ( Math.random() * ( ( max + 1 ) - min ) ) + min );
      return base ? r.toString( base ) : r } }
})

require( './app' )
require( './core' )
require( './websocket' )

let garden = weave.createGarden( 'weave' )

Object.assign( weave, {
  version: '0.3.0',

  cluster: [], // For using multiple threads to process requests, WIP

  servers: {}, apps: { anonymous: [] }, hosts: {},
  constants: { WebSocketUUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
               HOME: os.homedir(), STATUS_CODES: http.STATUS_CODES },

  verbose( verbose = true ) { return gardens.configure({ verbose }) },
  silent() { return weave.verbose( false ) },

  configuration: {
    'urlCleaning': true,
    'headers': { 'X-Powered-By': 'Weave' },
    'cache': { maxCacheSize: 500, maxCachedFileSize: 5 },
    set logOutputPath( outputPath ) { gardens.configure({ outputPath }) } },

  configure: weave.App.prototype.configure,
  engine: weave.App.prototype.engine,

  HTTPError: class HTTPError {
    constructor( code, error ) {
      if ( typeof code !== 'number' ) return garden.typeerror( 'HTTPError requires argument code to be a number!' )

      let desc, stack
      if ( typeof error === 'string' ) desc = error
      else if ( error != null ) [desc, stack] = [ `${error.name}: ${error.message}`, error.stack ]

      Object.defineProperties( this, {
        status: { value: weave.constants.STATUS_CODES[ code ], enumerable: true },
        statusCode: { value: code, enumerable: true },
        description: { value: desc, enumerable: true },
        stack: { value: stack, enumberable: !!stack }
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
  if ( arg.startsWith( '--' ) ) {
    let narg = weave.flags[ arg.substring( 2 ).toLowerCase()
      .replace( /\-([a-z])/g, ( whole, letter ) => letter.toUpperCase() ) ]

    if ( typeof narg === 'function' ) narg( ...process.argv.slice( index + 1 ) )
  }
})
