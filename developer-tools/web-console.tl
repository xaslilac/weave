// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( '../weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n');



require( '../websocket' )
// Web Console stuff!

weave.consoleSocket = new weave.WebSocket( function connection {
  var stack = [ weave ], i;
  connection.on( 'message', function message {
    if message.data === '<--' {
      if stack.length > 1 {
        stack.pop()
      }
    } else if ~(i = message.data.indexOf( '=' )) {
      stack[ stack.length - 2 ][ message.data.slice(0,i) ] = eval( message.data.substr( i+1 ) )
    } else {
      if stack[ stack.length - 1 ][ message.data ] {
        stack.push( stack[ stack.length - 1 ][ message.data ] )
      }
    }

    connection.send( JSON.stringify( Object.keys( stack[ stack.length - 1 ] ) ) )
  })

  connection.send( JSON.stringify( Object.keys( weave ) ) )
})
