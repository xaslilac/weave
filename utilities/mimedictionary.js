// MIT License / Copyright 2014
"use strict";

const fs = require( 'fs' )
const garden = require( 'gardens' ).createScope( 'weave/MimeDictionary' )

class MimeDictionary {
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
          this[ `.${extension}` ] = type
        })
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
          let [ type, ...extensions ] = line.replace( /\s+/g, ' ' ).split(' ')

          this.define( type, extensions )
        }
      })
    })
  }
}

module.exports = MimeDictionary
module.exports.defaultDictionary = new MimeDictionary().define({
  'application/ecmascript': [ 'ecma' ],
  'application/epub+zip': [ 'epub' ],
  'application/java-archive': [ 'jar' ],
  'application/javascript; charset=utf-8': [ 'js' ],
  'application/json; charset=utf-8': [ 'json' ],
  'application/msword': [ 'doc', 'dot' ],
  'application/octet-stream': [ 'bin', 'iso', 'dmg', 'pkg' ],
  'application/pdf': [ 'pdf' ],
  'application/rtf': [ 'rtf' ],
  'application/wasm': [ 'wasm' ],
  'application/x-bittorrent': [ 'torrent' ],
  'application/x-bzip': [ 'bz' ],
  'application/z-bzip2': [ 'bz2' ],
  'application/x-font-otf': [ 'otf' ],
  'application/x-font-woff': [ 'woff' ],
  'application/x-msdownload': [ 'exe', 'dll', 'msi' ],
  'application/x-rar-compressed': [ 'rar' ],
  'application/x-sh': [ 'sh' ],
  'application/xhtml+xml': [ 'xht', 'xhtml' ],
  'application/xml': [ 'xml' ],
  'application/xml-dtd': [ 'dtd' ],
  'application/zip': [ 'zip' ],
  'audio/mp4': [ 'mp4a' ],
  'audio/mpeg': [ 'mp2', 'mp2a', 'mp3' ],
  'audio/ogg': [ 'ogg' ],
  'audio/webm': [ 'weba' ],
  'audio/x-aac': [ 'aac' ],
  'image/bmp': [ 'bmp' ],
  'image/gif': [ 'gif' ],
  'image/jpeg': [ 'jpg', 'jpeg' ],
  'image/png': [ 'png' ],
  'image/tiff': [ 'tif', 'tiff' ],
  'image/vnd.adobe.photoshop': [ 'psd' ],
  'image/webp': [ 'webp' ],
  'image/x-icon': [ 'ico' ],
  'text/css; charset=utf-8': [ 'css' ],
  'text/csv': [ 'csv' ],
  'text/html; charset=utf-8': [ 'htm', 'html' ],
  'text/markdown; charset=utf-8': [ '.md' ],
  'text/plain': [ 'txt', 'log' ],
  'video/h264': [ 'h264' ],
  'video/jpeg': [ 'jpgv' ],
  'video/mp4': [ 'mp4', 'mp4v', 'mpg4' ],
  'video/ogg': [ 'ogv' ],
  'video/quicktime': [ 'mov' ],
  'video/webm': [ 'webm' ]
})
