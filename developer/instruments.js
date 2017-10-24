// MIT License / Copyright Kayla Washburn 2014
"use strict";

let weave = require( '../weave' )
let garden = new weave.Garden( 'weave developer/instruments' )

let util = require( 'util' )
let path = require( 'path' )

let $ = n => weave.apps[ n ]
let $$ = ( n, d ) => weave.apps[ n ].configuration[ d || "/" ]

require( './repl' )



weave.attachInstruments = function ( app, instrumentsUrl ) {
  if ( !app instanceof weave.App ) {
    if ( typeof app === 'string' && weave.apps[ app ] instanceof weave.App ) {
      app = weave.apps[ app ]
    } else garden.typeerror( 'argument app must be an instance of weave.App or string appName' )
  }

  app.subdirectory( instrumentsUrl, {
    'location': path.join( __dirname, '../http/instruments' ),
    'favoredExtensions': [ '.html' ],
    'mimeTypes': {
      '.html': 'text/html',
      '.css':  'text/css',
      '.js':   'application/javascript'
    }
  })

  app.interface( path.join( instrumentsUrl, '/enabled-instruments' ), connection => connection.end("['repl','log']") )

  let socket = new weave.WebSocket( app, path.join( instrumentsUrl, '/socket' ), connection => {
    connection.on( 'message', function ( message ) {
      message.json = JSON.parse( message.data )
      if ( message.json.messageType === 'console-command' ) {

        // TODO: Pipe this to a repl from the native repl module.
        try {
          let result = eval( message.json.data )

          connection.send( JSON.stringify({
            messageType: 'console-print',
            data: util.inspect( result )
          }) )
        } catch ( e ) {
          garden.error( e )
          connection.send( JSON.stringify({
            messageType: 'console-error',
            error: e.name,
            message: e.message
          }) )
        }
      }
    })

    // TODO: Implement events in Garden
    // let logPipe = function ( log ) {
    //   connection.send( JSON.stringify({
    //     messageType: 'console-log',
    //     space: log.space,
    //     data: util.inspect( log.data.length > 1 ? log.data : log.data[0] )
    //   }) )
    // }

    // weave.zen.on( 'log', logPipe )
    // connection.on( 'close', function {
    //   weave.zen.events.removeListener( 'log', logPipe )
    // })
  })
}
