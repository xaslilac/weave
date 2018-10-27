// MIT License / Copyright Kayla Washburn 2015
"use strict";

const { STATUS_CODES } = require( 'http' )
const garden = require( 'gardens' ).createScope( 'weave' )

// Define that basic module
const weave = module.exports = Object.assign( ( ...x ) => new weave.App( ...x ), {
  version: require( './package.json' ).version,

  HttpError: class HttpError {
    constructor( code, error ) {
      if ( typeof code !== 'number' ) return garden.typeerror( 'HttpError requires argument code to be a number!' )

      let desc, stack
      if ( typeof error === 'string' ) desc = error
      else if ( error != null ) [ desc, stack ] = [ `${error.name}: ${error.message}`, error.stack ]

      Object.defineProperties( this, {
        status: { value: STATUS_CODES[ code ], enumerable: true },
        statusCode: { value: code, enumerable: true },
        description: { value: desc, enumerable: true },
        stack: { value: stack, enumberable: !!stack }
      })
    }
  },

  Manifest: class Manifest {
    constructor( details ) {
      if ( details ) this.extend( details )
    }

    extend( details ) {
      if ( details != null ) Object.keys( details ).forEach( prop => this[ prop ] = details[ prop ] );
      return this
    }

    isDirectory() { return this.type === "directory" }
    isFile() { return this.type === "file" }
    isInterface() { return this.type === "interface" }
    // XXX: What is this even for?
    isNA() { return this.type === "na" } // Not applicable.
    // This might not be the best name though.
  }
})

// Import all of our classes and libraries
void [ 'App', 'Binding', 'Exchange' ]
  .forEach( name => require( `./lib/${name}` ) )
