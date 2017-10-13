// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
let weave = require( '../weave' )
let garden = new weave.Garden( 'weave --enable-web-instruments' )

let util=require('util')
let path=require('path')

let $ = function ( n  ) { return weave.apps[ n ] }
let $$ = function ( n, d  ) { return $(n).configuration[ d || "/" ] }

require( '../websocket' )
require( './repl' )



weave.attachInstruments = function ( app, instrumentUrl ) {
  if ( !weave.App.is( app )  ) {
    if ( String.is( app ) && weave.App.is( weave.apps[ app ] )  ) {
      app = weave.apps[ app ]
    } else garden.error( 'argument app must be an instance of weave.App or string appName' )
  }

  app.addDirectory( instrumentUrl, {
    'location': '~/OneDrive/Source/weave/developer-tools/web-instruments-wroot',
    'favoredExtensions': [ '.html' ],
    'mimeTypes': {
      '.html': 'text/html',
      '.css':  'text/css',
      '.js':   'application/javascript'
    }
  })

  app.addInterface( path.join( instrumentUrl, '/enabled-instruments' ), function ( connection  ) {
    connection.end("['repl','log']")
  })

  let socket = new weave.WebSocket( function ( connection  ) {
    garden.log('Instruments connected')
    connection.on( 'message', function ( message  ) {
      garden.log( message )
      message.json = JSON.parse( message.data )
      if ( message.json.messageType === 'console-command'  ) {

        // TODO: Pipe this to a repl from the native repl module.
        var result;
        try {
          result = eval( message.json.data )

          connection.send( JSON.stringify({
            messageType: 'console-print',
            data: util.inspect( result )
          }) )
        } catch ( e  ) {
          garden.console.error();( e )
          connection.send( JSON.stringify({
            messageType: 'console-error',
            error: e.name,
            message: e.message
          }) )
        }
      }
    })

    let logPipe = function ( log  ) {
      connection.send( JSON.stringify({
        messageType: 'console-log',
        space: log.space,
        data: util.inspect( log.data.length > 1 ? log.data : log.data[0] )
      }) )
    }

    // weave.zen.on( 'log', logPipe )
    // connection.on( 'close', function {
    //   weave.zen.events.removeListener( 'log', logPipe )
    // })
  })

  socket.attach( app, path.join( instrumentUrl, '/socket' ) )
}
