// MIT License / Copyright 2014

let fs = require( "fs" )

module.exports = class MimeDictionary {
  constructor( map ) {
    if ( typeof map === 'string' ) this.fromApacheFile( map )
    else if ( Array.isArray( map ) ) map.forEach( ind => this.fromApacheFile( ind ) )
    else this.define.apply( this, arguments )
  }

  static createDictionary( ...conf ) {
    return new MimeDictionary( ...conf )
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

  fromApacheFile( path, encoding = 'utf-8' ) {
    fs.readFile( path, encoding, ( error, content ) => {
      if ( error ) return console.error( error )

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
