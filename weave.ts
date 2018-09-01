// MIT License / Copyright Kayla Washburn 2015

// Define that basic module
// Object.assign( ( ...x ) => new weave.App( ...x ), {})
export default {
  version: require( './package.json' ).version
}

// Import all of our classes and libraries
void function ( ...names: string[] ) {
  names.forEach( name => require( `./lib/${name}` ) )
}( 'app', 'binding', 'exchange' )
