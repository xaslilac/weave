// MIT License / Copyright Kayla Washburn 2017

"use strict";

let events = require( 'events' )
let fs = require( 'fs' )
let util = require( 'util' )

let configuration = {}
let outputStream

let Garden = module.exports = exports = class Garden extends events.EventEmitter {
  constructor( name, verbose ) {
    // Make it an EventEmitter
    super()

    this.name = name
    this.verbose = verbose
  }

  static configure( update ) {
    return Object.assign( configuration, update )
  }

  isVerbose() {
    return this.verbose || Garden.verbose
  }

  _emit( event, ...said ) {
    this.emit( event, ...said )
    this.emit( 'print', ...said )
  }

  debug( message, ...extra ) {
    this._emit( 'debug', message, ...extra )
    this.isVerbose() && print( this.name, 'Debug', format( message ), extra )
    return this.isVerbose()
  }

  trace( message, ...extra ) {
    if ( this.isVerbose() ) {
      this._emit( 'trace', message, ...extra )
      print( this.name, 'Trace', format( message ), extra )
      console.log( new Error( message ).stack )
      return true
    }
    return false
  }

  log( message, ...extra ) {
    this._emit( 'log', message, ...extra )
    print( this.name, 'Log', format( message ), extra )
  }

  warning( message, ...extra ) {
    this._emit( 'warning', message, ...extra )
    print( this.name, 'Warning', `\u001b[33m${format( message )}\u001b[39m`, extra )
  }

  error( message, ...extra ) {
    this._emit( 'error', message, ...extra )
    print( this.name, 'Error', `\u001b[31m${format( message )}\u001b[39m`, extra )
    console.log( new Error( message ).stack )
  }

  typeerror( message, ...extra ) {
    this._emit( 'typeerror', message, ...extra )
    print( this.name, 'TypeError', `\u001b[31m${format( message )}\u001b[39m`, extra )
    console.log( new TypeError( message ).stack )
  }

  catch( error, ...extra ) {
    if ( !error.stack ) error = new Error( error )
    this._emit( 'catch', error, ...extra )
    print( this.name, 'Error', `\u001b[31m${error.name}: ${error.message}\u001b[39m`, extra )
    console.log( error.stack )
  }
}

let format = function ( message ) {
  return typeof message === 'string' ? message : util.inspect( message )
}

let print = function ( name, type, message, extra ) {
  process.stdout.write( `[${name}] \u001b[36m[${type}]\u001b[39m  ${message} ` )

  if ( configuration.outputPath ) {
    if ( !outputStream ) outputStream = fs.createWriteStream( configuration.outputPath, { 'flags': 'a' })
    outputStream.write( `[${new Date().toLocaleString()}]  [${name}] [${type}]  ${message}\n` )
  }

  extra.length ? console.log( ...extra ) : process.stdout.write( '\n' )
}
