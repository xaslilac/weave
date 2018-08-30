// MIT License / Copyright Kayla Washburn 2015

'use strict';

const crypto = require( 'crypto' )
const http = require( 'http' )
const os = require( 'os' )

const dom = require( './utilities/dom' )
const dictionaries = require( './utilities/mimedictionary' )
const gardens = require( 'gardens' )

const weave = module.exports = ( ...x ) => new weave.App( ...x )

Object.assign( weave, {
  version: require( './package.json' ).version,

  createPageFromTemplate: title => {
    let document = dom.createHtmlDocument( title )
    document.head.appendChild( weave.configuration.documentStyle )
    return document },
  createDictionary: dictionaries.createDictionary,
  createGarden: scope => new gardens.constructor( scope ),

  servers: {}, apps: { anonymous: [] }, hosts: {},
  constants: { HOME: os.homedir(), STATUS_CODES: http.STATUS_CODES,
               WebSocketUUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11' },

  cache: { hostMatches: {} },

  verbose( verbose = true ) { return gardens.configure({ verbose }) },
  silent() { return weave.verbose( false ) },

  mount( component ) {
    if ( typeof component.mount === 'function' ) component.mount( weave )
    if ( component.filters ) Object.keys( component.filters ).forEach( filter => {
      weave.filter( filter, component.filters[ filter ] )
    })

    return weave
  },

  options: {
    '--aww-heck-yes': () => console.log( 'Aww heck yes!!' ),
    '--weave-verbose': () => weave.verbose(),
    '--weave-repl': () => require( './utilities/repl' ).connect(),
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
      'body > *': {
        padding: '20px', margin: 0
      },
      'h1': {
        color: 'white', backgroundColor: '#5050DD',
        fontFamily: 'sans-serif' },
      'pre': {
        padding: '15px', margin: '15px',
        overflow: 'auto',
        borderRadius: '7px',
        color: 'white', backgroundColor: '#242332' },
      '.directory a': { 'color': '#11a9f4' },
      '.file      a': { 'color': '#11f4e6' },
      'a': { 'font-weight': 'bold' }
    }) }
})

// Import all of our classes and libraries
void function ( ...names ) {
  names.forEach( name => require( `./lib/${name}` ) )
}( 'app', 'exchange', 'printer', 'router' )
