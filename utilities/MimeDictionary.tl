var fs = require( "fs" ), MimeDictionary;

MimeDictionary = function map {
  @dictionary = {}

  if ( String.is( map ) ) {
    @fromApacheFile( map )
  } else if ( Array.is( map ) ) {
    map.forEach( function ( ind ) {
      @fromApacheFile( ind )
    }, this )
  } else {
    @define.apply( this, arguments )
  }
}

MimeDictionary::define = function type, extensions {
  // We're defining a single type
  if ( String.is( type ) ) {
    // With multiple extensions
    if ( Array.is( extensions ) ) {
      extensions.forEach( function ( extension ) {
        @dictionary[extension] = type
      }, @)
    // With a single extension
    } else {
      @dictionary[extension] = extensions
    }
  // We're defining a bunch of types
  } else {
    Object.keys( type ).forEach( function ( key ) {
      @define( key, type[ key ] )
    })
  }
}

MimeDictionary::fromApacheFile = function path, encoding, callback {
  var dictionary = this;

  fs.readFile( path, encoding || "UTF-8", function error, content {
    var type, extensions;

    if error {
      if callback { callback( error ) }
      else throw error
    } else {
      // Remove all empty lines and comments and then split the file into lines.
      content = content
        .replace( /(#.+)$/gm, '' )
        .replace( /\n{2,}/g, "\n" )
        .split( "\n" )

      content.forEach( function line {
        // Trim off any whitespace on either end of the line
        line = line.trim()

        // Ignore any empty lines that made it this far
        if line {
          // Remove multiple spaces/tabs and make sure extensions
          // have dots, and then turn it into an array.
          line = line.replace( /\s+/g, ' .' ).split(' ')

          type = line.shift() // First item on the line is the mime type
          extensions = line // Everything after is an extension

          dictionary.define( type, extensions )
        }
      })
    }
  })
}

module.exports = MimeDictionary
