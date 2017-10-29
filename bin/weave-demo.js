#!/usr/bin/env node
let weave = require( '../weave' )
let path = require( 'path' )
let marked = require( 'marked' )
let { highlight } = require( 'highlight.js' )
let { stat } = require( 'fs' )
let mdWrapperPath = path.join( __dirname, '../http/default/default.html' )

marked.setOptions({ highlight: code => highlight( 'js', code ).value })

let garden = new weave.Garden( 'demo' )

weave( 'default', {
  'location': path.join( __dirname, '../http/default' ),

  'indexes': { 'home.md': 0 },
  'favoredExtensions': [ '.md' ],
  'mimeTypes': {
    '.md': 'text/html',
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.ttf': 'application/octet-stream'
  },
  'errorPages': {
    '404': '404.md'
  },
  'engines': {
    '.md': ( buffer, manifest, connection ) => {
      return new Promise( ( fulfill, reject ) => {
        stat( mdWrapperPath, ( error, stats ) => {
          if ( error ) return reject( error )

          let cacheDate = connection.detail( 'if-modified-since' )
          if ( cacheDate ) {
            cacheDate = Math.floor( cacheDate.getTime() / 1000 )
            let mdDate = Math.floor( manifest.stats.mtime.getTime() / 1000 )
            let wrDate = Math.floor( stats.mtime.getTime() / 1000 )
            if ( cacheDate === mdDate || cacheDate === wrDate ) return connection.redirect( 304 )
          }

          let content = marked( buffer.toString() )
          let title = `weave - ${path.relative( connection.behavior( 'location' ), manifest.path )}`

          // In the future the content could be cached by us directly, without the stat call.
          // It will be useful while working on the website though for quick changes.
          weave.cache( mdWrapperPath, stats )
            .then( file => {
              fulfill( file.content.toString( 'utf-8' ).replace( '{{TITLE}}', title ).replace( '{{CONTENT}}', content ) )
            })
            .catch( reject )
        })
      })
    }
  }
})
.subdirectory( '/docs', {
  'location': path.join( __dirname, '../documents' ),
  'indexes': { 'readme.md': 0 }
})
.link( process.env.PORT || 80 )
