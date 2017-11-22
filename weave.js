// MIT License / Copyright Kayla Washburn 2015

'use strict';

let crypto = require( 'crypto' )
let http = require( 'http' )
let os = require( 'os' )

let dom = require( './utilities/dom' )
const dictionaries = require( './utilities/mimedictionary' )
const gardens = require( 'gardens' )
const commander = require( 'commander' )

const weave = module.exports = exports = ( a, b ) =>
  Array.isArray( a ) ? commander.parse( a ) : new weave.App( a, b )

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
void (function (...names) {
  names.forEach( name => require( `./lib/${name}` ) )
})( 'app', 'cache', 'exchange', 'instruments', 'interfaces', 'printer', 'router', 'websocket' )



weave.engine = weave.App.prototype.engine

commander.option(
  '--aww-heck-yes',
  'Share your enthusiasm',
  () => console.log( 'Aww heck yes!!' )
).option(
  '-wv, --weave-verbose',
  'Log useful debugging internal information',
  () => weave.verbose()
).option(
  '--enable-weave-repl',
  `Enable a REPL form within Weave's context`,
  () => require( './utilities/repl' ).connect()
).option(
  '--enable-interface-engine',
  'Enable the engine for .interface files',
  () => weave.engine( '.interface', weave.interfaces.engine )
).option(
  '--enable-react-engine',
  'Transpile files with .jsx extensions for React',
  () => require( './utilities/react' )
)
