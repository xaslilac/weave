var
fs = require( "fs" ),
MimeDictionary = function ( map ) {
  this.dictionary = {}
    
  String.is( map ) ?
    this.fromApacheFile( map ) :
    this.define.apply( this, arguments )
};

MimeDictionary.prototype.define = function ( type, extensions ) {
  // We're defining a single type
  if ( String.is( type ) ) {
    // With multiple extensions
    if ( Array.is( extensions ) ) {
      extensions.forEach( function ( extension ) {
        this.dictionary[extension] = type
      }, this)
    // With a single extension
    } else {
      this.dictionary[extension] = extensions
    }
  // We're defining a bunch of types
  } else {
    Object.keys( type ).forEach( function ( key ) {
      this.define( key, type[ key ] )
    })
  }
}

MimeDictionary.prototype.fromApacheFile = function ( path, encoding, callback ) {
  var dictionary = this;
  
  fs.readFile( path, encoding || "UTF-8", function ( error, content ) {
    var type, extensions;
    
    if ( error ) {
      callback( error )
    } else {
      // Remove all empty lines and then split the file into lines.
      content = content
        .replace( /\s*(#.+)?$/m, '' )
        .replace( /\n{2,}/g, "\n" )
        .split( "\n" )
      
      content.forEach(function ( line ) {
        // Trim off any extra whitespace
        line = line.trim()
        
        // Ignore any empty lines that made it this far
        if (line) {
          // Remove multiple spaces/tabs and make sure extensions
          // have dots, and then turn it into an array.
          line = line.replace( /\s+/g, ' .' ) 
            .split(' ')
          
          type = line.shift() // First item on the line is the mime type
          extensions = line // Everything after is an extension
          
          dictionary.define( type, extensions )
        }
      })
    }
  })
}

module.exports = MimeDictionary