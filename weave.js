// MIT License / Copyright Kayla Washburn 2015

'use strict';

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

  _bindings: {},

  configuration: {
    'urlCleaning': true,
    'headers': { 'X-Powered-By': 'Weave' },
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
