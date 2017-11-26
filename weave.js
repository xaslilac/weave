// MIT License / Copyright Kayla Washburn 2015

'use strict';

const crypto = require( 'crypto' )
const http = require( 'http' )
const os = require( 'os' )

const dom = require( './utilities/dom' )
const dictionaries = require( './utilities/mimedictionary' )
const gardens = require( 'gardens' )

const weave = module.exports = exports = ( a, b ) =>
  Array.isArray( a ) ? weave.flags( a ) : new weave.App( a, b )

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

// Read flag options
function flags( list, names ) {
  names.forEach( ( name, index ) => {
    if ( typeof list[ name ] === 'function' ) list[ name ]( ...names.slice( index + 1 ) )
  })
}

weave.flags = function ( ...names ) {
  if ( Array.isArray( names[ 0 ] ) ) return weave.flags( ...names[ 0 ] )
  flags({
    '--aww-heck-yes': () => console.log( 'Aww heck yes!!' ),
    '--weave-verbose': () => weave.verbose(),
    '--enable-weave-repl': () => require( './utilities/repl' ).connect(),
    '--enable-interface-engine': () => weave.engine( '.interface', weave.interfaces.engine ),
    '--enable-react-engine': () => require( './utilities/react' )
  }, names )
}

weave.flags( process.argv )

weave.engine = weave.App.prototype.engine
