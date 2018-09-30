// MIT License / Copyright 2014
"use strict";

const fs = require( 'fs' )
const garden = require( 'gardens' ).createScope( 'weave/MimeDictionary' )

module.exports = class MimeDictionary {
  constructor( ...files ) {
    files.forEach( file => {
      if ( typeof file === 'string' ) this.importApacheFile( file )
    })
  }

  static createDictionary( ...options ) {
    return new MimeDictionary( ...options )
  }

  define( type, extensions ) {
    // We're defining a single type
    if ( typeof type === 'string' ) {
      // With multiple extensions
      if ( Array.isArray( extensions ) ) {
        extensions.forEach( extension => {
          this[ extension ] = type
        }, this)
      // With a single extension
      } else this[ extensions ] = type
    // We're defining a bunch of types
    } else {
      Object.keys( type ).forEach( key => {
        this.define( key, type[ key ] )
      })
    }

    return this
  }

  importApacheFile( path, encoding = 'utf-8' ) {
    fs.readFile( path, encoding, ( error, content ) => {
      if ( error ) return garden.error( error )

      // Remove all empty lines and comments and then split the file into lines.
      content = content
        .replace( /(#.+)$/gm, '' )
        .replace( /\n{2,}/g, "\n" )
        .split( "\n" )

      content.forEach( line => {
        // Trim off any whitespace on either end of the line
        line = line.trim()

        // Ignore any empty lines that made it this far
        if ( line ) {
          // Remove multiple spaces/tabs and make sure extensions
          // have dots, and then turn it into an array.
          // First item on the line is the mime type
          // Everything after is an extension
          let [ type, ...extensions ] = line.replace( /\s+/g, ' .' ).split(' ')

          this.define( type, extensions )
        }
      })
    })
  }
}
