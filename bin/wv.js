#!/usr/bin/env node
let weave = require( '../weave' )
let path = require( 'path' )

process.on( 'beforeExit', function () {
  let garden = new weave.Garden( 'default' )
  garden.log( 'Starting default server' )
  if ( !weave._ACTIVE ) {
    let d = new weave.App( 'default' ).link( 80 )
    .configure({
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
