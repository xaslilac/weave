// MIT License / Copyright Kayla Washburn 2017

// TODO: Octal escapes aren't allowed in strict mode. Try to find a work around?
"use strict";



let events = require( 'events' )
let util = require( 'util' )

let Garden = module.exports = exports = class Garden extends events.EventEmitter {
  constructor( name, verbose ) {
    // Make it an EventEmitter
    super()

    this.name = name
    this.verbose = verbose

    Garden.list.push( this )
  }

  debug( message, ...extra ) {
    this.verbose && print( this.name, 'Debug', format( message ), extra )
    return this.verbose
  }

  trace( message, ...extra ) {
    if ( this.verbose ) {
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

  static enableDebug() {
    this.list.forEach( garden => garden.verbose = true )
  }

  static disableDebug() {
    this.list.forEach( garden => garden.verbose = false )
  }
}

Garden.list = []

let format = function ( message ) {
  return typeof message === 'string' ? message : util.inspect( message )
}

let print = function ( name, type, message, extra ) {
  process.stdout.write( `[${name}] \u001b[36m[${type}]\u001b[39m  ${message} ` )
  extra.length ? console.log( ...extra ) : process.stdout.write( '\n' )
}
