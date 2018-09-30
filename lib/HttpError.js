// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave.HttpError' )

const { STATUS_CODES } = require( 'http' )

// A generic class to describe errors to the client.
weave.HttpError = class HttpError {
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
}
