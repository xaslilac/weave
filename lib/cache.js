// MIT License / Copyright 2015
"use strict";

let weave = require( '..' )
let garden = weave.createGarden( 'weave.cache' )

let fs = require( 'fs' )

weave.cache = ( path, stats ) => weave.cache.retrieveFile( path, stats )
let mostRecent = []

Object.assign( weave.cache, {
  // For use in matching requests to apps
  hostMatches: {},

  fileEntries: { 'size': 0 },

  retrieveFile: function ( path, stats ) {
    if ( typeof path !== 'string' ) return garden.typeerror( 'path argument must be a string!' )
    if ( !stats instanceof fs.Stats ) return garden.typeerror( 'stats argument must be a Stats object!' )

    return new Promise( ( fulfill, reject ) => {
      let cachedFile = this.fileEntries[ path ]

      if ( cachedFile && cachedFile.stats.mtime.getTime() === stats.mtime.getTime() ) {
        cachedFile.fromCache = true
        fulfill( cachedFile )
        // TODO: Keep track of what files are being pulled from the cache the most
        // so that they don't get cleared from memory when the cache fills
      } else fs.readFile( path, ( error, content ) => {
        if ( error ) return reject( error )

        let file = { path, stats, content, size: Buffer.byteLength( content ) }

        fulfill( file )

        if ( weave.configuration.cache )
          if ( file.size <= weave.configuration.cache.maxCachedFileSize * 1024 ** 2 ) {
            this.fileEntries[ path ] = file
            this.fileEntries.size += file.size
          }

          while ( this.fileEntries.size > weave.configuration.cache.maxCacheSize * 1024 ** 2 ) {
            // XXX: This array doesn't even get filled with values *shakes head*
            let path = mostRecent.shift()
            this.fileEntries.size -= weave.cache.fileEntries[ path ].size
            weave.cache.fileEntries[ path ] = null
          }
      })
    })
  }
})
