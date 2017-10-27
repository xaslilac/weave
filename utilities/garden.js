// MIT License / Copyright Kayla Washburn 2017

"use strict";

let events = require( 'events' )
let util = require( 'util' )

let Garden = module.exports = exports = class Garden extends events.EventEmitter {
  constructor( name, verbose ) {
    // Make it an EventEmitter
    super()

    this.name = name
    this.verbose = verbose
  }

  isVerbose() {
    return this.verbose || Garden.verbose
  }

  debug( message, ...extra ) {
    this.isVerbose() && print( this.name, 'Debug', format( message ), extra )
    return this.isVerbose()
  }

  trace( message, ...extra ) {
    if ( this.isVerbose() ) {
      print( this.name, 'Trace', format( message ), extra )
      console.log( new Error( message ).stack )
    }
  }

  log( message, ...extra ) {
    print( this.name, 'Log', format( message ), extra )
  }

  warning( message, ...extra ) {
    print( this.name, 'Warning', `\u001b[33m${format( message )}\u001b[39m`, extra )
  }

  error( message, ...extra ) {
    print( this.name, 'Error', `\u001b[31m${format( message )}\u001b[39m`, extra )
    console.log( new Error( message ).stack )
  }

  typeerror( message, ...extra ) {
    print( this.name, 'TypeError', `\u001b[31m${format( message )}\u001b[39m`, extra )
    console.log( new TypeError( message ).stack )
  }

  catch( error, ...extra ) {
    if ( !error.stack ) error = new Error( error )
    print( this.name, 'Error', `\u001b[31m${error.name}: ${error.message}\u001b[39m`, extra )
    console.log( error.stack )
  }
}

let format = function ( message ) {
  return typeof message === 'string' ? message : util.inspect( message )
}

let print = function ( name, type, message, extra ) {
  process.stdout.write( `[${name}] \u001b[36m[${type}]\u001b[39m  ${message} ` )
  extra.length ? console.log( ...extra ) : process.stdout.write( '\n' )
}
