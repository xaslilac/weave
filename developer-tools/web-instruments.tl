// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( '../weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n'),
$ = function n { return weave.getAppByName( n ) },
$$ = function n, d { return $(n).configuration[ d || "/" ] };



module 'util', 'path';
require( '../websocket' )
require( './repl' )



weave.attachInstruments = function app, instrumentUrl {
  var socket, logPipe;

  if !weave.App.is( app ) {
    if String.is( app ) && weave.App.is( weave.apps[ app ] ) {
      app = weave.apps[ app ]
    } else throw 'web-instruments: argument app must be an instance of weave.App or string appName'
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

  app.addInterface( path.join( instrumentUrl, '/enabled-instruments' ), function connection {
    connection.end("['repl','log']")
  })

  socket = new weave.WebSocket( function connection {
    weave.zen('Instruments connected')
    connection.on( 'message', function message {
      message.json = JSON.parse( message.data )
      if message.json.messageType === 'console-command' {
        var result;
        try {
          result = eval( message.json.data )

          connection.send( JSON.stringify({
            messageType: 'console-print',
            data: util.inspect( result )
          }) )
        } catch e {
          weave.zen( e )
          connection.send( JSON.stringify({
            messageType: 'console-error',
            error: e.name,
            message: e.message
          }) )
        }
      }
    })

    logPipe = function log {
      connection.send( JSON.stringify({
        messageType: 'console-log',
        space: log.space,
        data: util.inspect( log.data.length > 1 ? log.data : log.data[0] )
      }) )
    }

    weave.zen.on( 'log', logPipe )
    connection.on( 'close', function {
      weave.zen.events.removeListener( 'log', logPipe )
    })
  })

  socket.attach( app, path.join( instrumentUrl, '/socket' ) )
}
