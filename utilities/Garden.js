// MIT License / Copyright Tyler Washburn 2017

// TODO: Octal escapes aren't allowed in strict mode. Try to find a work around?
"use strict";



let events = require( 'events' )
let util = require( 'util' );

let Garden = module.exports = exports = class Garden extends events.EventEmitter {
  constructor( name, verbose ) {
    // Make it an EventEmitter
    super()
    
    this.name = name
    this.verbose = verbose
  }

  debug( message, ...extra ) {
    this.verbose && print( this.name, 'debug', format( message ), extra )
  }

  log( message, ...extra ) {
    print( this.name, 'log', format( message ), extra )
  }

  warning( message, ...extra ) {
    print( this.name, 'warning', `\u001b[33m${format( message )}\u001b[39m`, extra )
  }

  error( message, ...extra ) {
    print( this.name, 'error', `\u001b[31m${format( message )}\u001b[39m`, extra )
  }
}

let format = function ( message ) {
  return typeof message === 'string' ? message : util.inspect( message )
}

let print = function ( name, type, message, extra ) {
  process.stdout.write( `[${name}] \u001b[36m[${type}]\u001b[39m  ${message} ` )
  extra.length ? console.log( ...extra ) : process.stdout.write( '\n' )
}
