// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( './weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n');



module 'events';

weave.WebSocket = weave.Class( events.EventEmitter, function {
  var socket = @;
  @interface = function httpConnection {
    return new weave.WebSocketConnection( socket, httpConnection )
  }
})

weave.WebSocketConnection = weave.Class( events.EventEmitter, function socket, httpConnection {
  @_WEAVE_CONNECTION = httpConnection
  @_NODE_CONNECTION = httpConnection._NODE_CONNECTION
  socket.handshake( httpConnection, @ )
})

weave.WebSocket::handshake = function httpConnection, socketConnection {
  var key, accept, socket = @;
  // Make sure the client is expecting a WebSocket upgrade. Take the key,
  // and generate the handshake response by taking the SHA1 hash and encode
  // it as base64. Then we write the head, tell it to switch protocols, and
  // begin the WebSocket connection. If it isn't expecting a WebSocket
  // upgrade then we totally freak out and blow up the whole world instead.
  // As in we don't do anything at all and just ignore the connection.
  // TODO: Should we just end it here or is there something weird I did?
  if ( httpConnection.get( "connection" ) === "Upgrade" && httpConnection.get( "upgrade" ) === "websocket" ) {
    key = httpConnection.get( "sec-websocket-key" )
    accept = weave.util.SHA1_64( key + weave.constants.WebSocketUUID )
    httpConnection.writeHead( 101, {
      "Connection": "Upgrade",
      "Upgrade": "websocket",
      "Sec-WebSocket-Accept": accept
    }).endHead()

    socket.emit( 'connection', socketConnection )

    httpConnection.on( 'data', function data {
      var message = socket.decode( data );
      if message.opcode <= 0x2 {
        socketConnection.emit( 'message', message, socketConnection )
      } else if message.opcode === 0x9 {
        console.log( "pong ping" ) // TEMPORARY
        socketConnection.emit( 'ping', message, socketConnection )
        socketConnection.send( message.buffer, 0xA )
      } else if message.opcode === 0xA {
        socketConnection.emit( 'pong', message, socketConnection )
      }
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
    details.length = Number.parseInt( data[2].toString(16) + data[3].toString(16), 16 )
    offset = 2
  } else if payloadLength === 127 {
    details.length = ""
    data.slice( 2, 10 ).forEach( function l { details.length += l.toString(16) })
    details.length = Number.parseInt( details.length, 16 )
    offset = 8
  } else details.length = payloadLength

  if details.masked {
    details.maskingKey = data.slice( 2 + offset, 6 + offset )

    // Unmask all the data
    data.slice( 6 + offset, details.length + 6 + offset ).forEach( function byte, index {
      decoded[ index ] = byte ^ details.maskingKey[ index % 4 ] })
    details.buffer = Buffer.from( decoded )

    // If the data is identified as text, then convert it to a string
    if details.opcode === 1 {
      details.data = details.buffer.toString( 'utf-8' )
    }
  } else {
    // Incoming data is required to be masked, so ignore it if it isn't.
    // TODO: Should we do something here?
  }

  return details
}

weave.WebSocketConnection::send = function data, opcode {
  if !Buffer.isBuffer( data ) {
    if String.is( data ) {
      data = Buffer.from( data )
    } else console.error( "WebSocket data should be a string or a buffer!" )
  }

  var _ = weave.util,
  prefix = [ Number.is( opcode ) ? 128 + opcode : 129, 0 ], length,
  maskingKey = [ weave.util.RNDM_RG( 0, 0xFF ), weave.util.RNDM_RG( 0, 0xFF ),
                 weave.util.RNDM_RG( 0, 0xFF ), weave.util.RNDM_RG( 0, 0xFF ) ];

  // Determine if we need an extendedPayloadLength, and if we do, how long.
  // We must add the correct number of spacing 0's to our length string to
  // get a buffer of the exact length that we need. When we have the length
  // figured out, complete the prefix and make it a Buffer.
  if data.length > 125 {
    if data.length > 65536 {
      output[1] += 127,
      length = data.length.toString( 16 )
      _times( 16 - length.length, function () { length = "0" + length } )
    } else {
      output[1] += 126,
      length = data.length.toString( 16 )
      _times( 4 - length.length, function () { length = "0" + length } )
    }
    prefix = Buffer.concat([ Buffer.from( prefix, 'hex'), Buffer.from( length, 'hex' ) ])
  } else {
    prefix[1] += data.length
    prefix = Buffer.from( prefix, 'hex' )
  }

  // Send everything to the client.
  @_NODE_CONNECTION.write( Buffer.concat([ prefix, data ]) )
  return true
}

weave.WebSocketConnection::ping = function callback {
  var pingBuffer, socketConnection = @;

  // Avoid pinging multiple times at once
  if !@pinging {
    @pinging = true;
    pingBuffer = Buffer.from( weave.util.RNDM_RG( 0, 0xFFFFFFFF, 16 ), 'hex' )
    @send( pingBuffer, 0x9 )

    // Verify that the message is correct.
    @once( 'pong', function message, socketConnection {
      socketConnection.pinging = false
      if message.buffer.equals( pingBuffer ) {
        Function.is( callback ) && callback.call( socketConnection, true )
      } else {
        socketConnection._NODE_CONNECTION.destroy()
        Function.is( callback ) && callback.call( socketConnection, false )
      }
    })

    return true
  } return false
}
