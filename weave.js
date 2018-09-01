// MIT License / Copyright Kayla Washburn 2015
"use strict";

// Define that basic module
const weave = module.exports = Object.assign( ( ...x ) => new weave.App( ...x ), {
  version: require( './package.json' ).version
})

// Import all of our classes and libraries
void function ( ...names ) {
  names.forEach( name => require( `./lib/${name}` ) )
}( 'App', 'Binding', 'Exchange', 'HttpError', 'Manifest' )
