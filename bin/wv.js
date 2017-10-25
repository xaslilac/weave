#!/usr/bin/env node
let weave = require( '../weave' )
let path = require( 'path' )

process.on( 'beforeExit', function () {
  let garden = new weave.Garden( 'default' )
  garden.log( 'Starting default server' )
  if ( !weave._ACTIVE ) {
    let d = new weave.App( 'default' ).link( process.env.PORT || 80 )
    .configure({
      'location': path.join( __dirname, '../http/default' ),

      'indexes': {
        'default.html': Infinity
      },
      'mimeTypes': {
        '.html': 'text/html',
        '.css':  'text/css',
        '.js':   'application/javascript'
      }
    })
  }
})
