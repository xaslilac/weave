// MIT License / Copyright 2015

import weave from '..'

// A generic class to describe errors to the client.
weave.HTTPError = class HTTPError {
  constructor( code, error ) {
    if ( typeof code !== 'number' ) return garden.typeerror( 'HTTPError requires argument code to be a number!' )

    let desc, stack
    if ( typeof error === 'string' ) desc = error
    else if ( error != null ) [desc, stack] = [ `${error.name}: ${error.message}`, error.stack ]

    Object.defineProperties( this, {
      status: { value: http.STATUS_CODES[ code ], enumerable: true },
      statusCode: { value: code, enumerable: true },
      description: { value: desc, enumerable: true },
      stack: { value: stack, enumberable: !!stack }
    })
  }
}
