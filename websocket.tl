// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( './weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n');



module 'events';

weave.WebSocket = weave.Class( events.EventEmitter, function {
  var socket = @;
  @interface = function connection {
    socket.handshake( connection )
  }
} )

weave.WebSocket::handshake = function connection {
  var key, accept, socket = @;
  // Make sure the client is expecting a WebSocket upgrade. Take the key,
  // and generate the handshake response by taking the SHA1 hash and encode
  // it as base64. Then we write the head, tell it to switch protocols, and
  // begin the WebSocket connection. If it isn't expecting a WebSocket
  // upgrade then we totally freak out and blow up the whole world instead.
  // As in we don't do anything at all and just ignore the connection.
  // TODO: Should we just end it here or is there something weird I did?
  if ( connection.get( "connection" ) === "Upgrade" && connection.get( "upgrade" ) === "websocket" ) {
    key = connection.get( "sec-websocket-key" )
    accept = weave.util.SHA1_64( key + weave.constants.WebSocketUUID )
    connection.writeHead( 101, {
      "Connection": "Upgrade",
      "Upgrade": "websocket",
      "Sec-WebSocket-Accept": accept
    }).endHead()

    socket.emit( 'connection', connection )

    connection.on( 'data', function data {
      connection.emit( 'frame', socket.decode( data ) )
    })
  } else {
    connection.generateErrorPage( new weave.HTTPError( 426, "Client was not expecting a WebSocket." ) )
  }
}

weave.WebSocket::decode = function data {
  // Set up our scope with all the necessary variables.
  var _ = weave.util,
  b0 = _.READ_BITS( data[0] ),
  b1 = _.READ_BITS( data[1] ),
  offset = 0, decoded = [],
  details = {
    masked: b1[0], // 0 if false, 1 if true
    FIN: b0[0], // 0 if partial, 1 if final frame
    opcode: _.BINARY_UINT( b0.slice( 4, 8 ) ) },
  payloadLength = _.BINARY_UINT( b1.slice( 1, 8 ) );

  // Check if the frame has an extended payload length,
  // and if it is 16 bit or 64 bit.
  if payloadLength === 126 {
    details.length = data[2] + data[3]
    offset = 2
  } else if payloadLength === 127 {
    data.slice( 2, 10 ).forEach( function l { details.length += l })
    offset = 8
  } else details.length = payloadLength

  if details.masked {
    details.maskingKey = data.slice( 2 + offset, 6 + offset )

    data.slice( 6 + offset, details.length + 6 + offset ).forEach( function byte, index {
      decoded[ index ] = byte ^ details.maskingKey[ index % 4 ] })
    details.buffer = Buffer.from( decoded )

    if details.opcode === 1 {
      details.text = details.buffer.toString( 'utf-8' )
    }
  } else {
    // Incoming data is required to be masked, so ignore it if it isn't.
  }

  return details
}
