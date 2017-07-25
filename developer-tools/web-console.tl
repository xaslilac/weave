// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( '../weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n')
$ = function n { return weave.getAppByName( n ) },
$$ = function n, d { return $(n).configuration[ d || "/" ] };;



module 'util';
require( '../websocket' )
require( './repl' )

weave.consoleSocket = new weave.WebSocket( function connection {
  connection.on( 'message', function message {
    message.json = JSON.parse( message.data )
    if message.json.actionType === 'repl-command' {
      var result;
      try {
        result = eval( message.json.data )

        connection.send( JSON.stringify({
          replyType: 'repl-print',
          data: util.inspect( result )
        }) )
      } catch e {
        console.log( e )
        connection.send( JSON.stringify({
          replyType: 'error',
          error: e.name,
          message: e.message
        }) )
      }
    }
  })
})
