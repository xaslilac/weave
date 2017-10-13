// MIT License / Copyright Tyler Washburn 2017

// TODO: Octal escapes aren't allowed in strict mode. Try to find a work around?
"use strict";



let events = require( 'events' )
let util = require( 'util' );

let Garden = module.exports = exports = class Garden extends events.EventEmitter {
  constructor( name ) {
    // Make it an EventEmitter
    super()
    this.name = name
  }

  log( message, ...extra ) {
    process.stdout.write( `[${this.name}] \u001b[36m[log]\u001b[39m      ${format( message )} ` )
    print( extra )
  }

  warning( message, ...extra ) {
    process.stdout.write( `[${this.name}] \u001b[36m[warning]\u001b[39m  \u001b[33m${format( message )}\u001b[39m ` )
    print( extra )
  }

  error( message, ...extra ) {
    process.stdout.write( `[${this.name}] \u001b[36m[error]\u001b[39m    \u001b[31m${format( message )}\u001b[39m ` )
    print( extra )
  }
}

let format = function ( message ) {
  return typeof message === 'string' ? message : util.inspect( message )
}

let print = function ( extra ) {
  if ( extra.length ) console.log( ...extra )
  else process.stdout.write( '\n' )
}
