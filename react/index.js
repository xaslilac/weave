// MIT License / Copyright 2015
"use strict";

let weave = require( '..' )
let garden = weave.createGarden( 'weave + react' )

let babel = require( 'babel-core' )
let reactPreset = require( 'babel-preset-react' )

weave.engine( '.jsx', ( content, manifest, exchange ) => {
  return new Promise( ( fulfill, reject ) => {
    let cacheDate = exchange.detail( 'if-modified-since' )
    if ( cacheDate ) {
      cacheDate = Math.floor( cacheDate.getTime() / 1000 )
      let statDate = Math.floor( manifest.stats.mtime.getTime() / 1000 )
      if ( cacheDate === statDate ) return exchange.redirect( 304 )
    }

    let babeled = babel.transform( content.toString( 'utf-8' ), reactPreset )

    fulfill( babeled.code )
  })
})
