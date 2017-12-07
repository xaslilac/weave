// MIT License / Copyright Kayla Washburn 2015

'use strict';

const crypto = require( 'crypto' )
const http = require( 'http' )
const os = require( 'os' )

const dom = require( './utilities/dom' )
const dictionaries = require( './utilities/mimedictionary' )
const gardens = require( 'gardens' )

const weave = module.exports = ( a, b ) => new weave.App( a, b )

Object.assign( weave, {
  version: '0.3.0',

  createPageFromTemplate: title => {
    let document = dom.createHtmlDocument( title )
    document.head.appendChild( weave.configuration.documentStyle )
    return document },
  createDictionary: dictionaries.createDictionary,
  createGarden: gardens.createGarden,

  util: {
    SHA1_64: data => crypto.createHash( 'sha1' ).update( data ).digest( 'base64' ),
    RNDM_RG: ( min, max, base ) => {
      let r = Math.floor( ( Math.random() * ( ( max + 1 ) - min ) ) + min );
      return base ? r.toString( base ) : r } },

  servers: {}, apps: { anonymous: [] }, hosts: {},
  constants: { HOME: os.homedir(), STATUS_CODES: http.STATUS_CODES,
               WebSocketUUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11' },

  verbose( verbose = true ) { return gardens.configure({ verbose }) },
  silent() { return weave.verbose( false ) },

  options: {
    '--aww-heck-yes': () => console.log( 'Aww heck yes!!' ),
    '--weave-verbose': () => weave.verbose(),
    '--weave-repl': () => require( './utilities/repl' ).connect(),
    '--weave-interface-engine': () => weave.configuration.engines[ '.interface' ] = weave.interfaces.engine, // XXX: BORKEN AND DUMB
    '--weave-react-engine': () => require( './utilities/react' )
  },

  withOptionsEnabled( ...options ) {
    process.argv.push( ...options )
    options.forEach( ( name, index ) => {
      if ( typeof weave.options[ name ] === 'function' ) weave.options[ name ]( ...options.slice( index + 1 ) )
    })

    return weave
  },

  configuration: {
    'urlCleaning': true,
    'headers': { 'X-Powered-By': 'Weave' },
    'cache': { maxCacheSize: 500, maxCachedFileSize: 5 },
    set logOutputPath( outputPath ) { gardens.configure({ outputPath }) },
    documentStyle: new dom.StyleSheet({
      'html, body': {
        padding: 0, margin: 0,
        width: '100%', height: '100%' },
      'h1': {
        padding: '15px', margin: 0,
        color: 'white', backgroundColor: '#5050DD',
        fontFamily: 'sans-serif' },
      'pre': {
        padding: '15px', margin: '15px',
        overflow: 'auto',
        borderRadius: '7px',
        color: 'white', backgroundColor: '#242332' },
      '.directory a': { 'color': '#11a9f4' },
      '.file      a': { 'color': '#11f4e6' }
    }) }
})

// Import all of our classes and libraries
void function ( ...names ) {
  names.forEach( name => require( `./lib/${name}` ) )
}( 'app', 'cache', 'exchange', 'instruments', 'interfaces', 'printer', 'router', 'websocket' )

weave.withOptionsEnabled( process.argv )
