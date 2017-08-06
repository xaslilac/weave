// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
weave := require( './weave' )



module 'events';
Zen := require( './utilities/Zen')

weave.WebSocket = weave.Class( events.EventEmitter, function app, path, listener {
  socket := @

  if app && !weave.App.is( app ) {
    if String.is( app ) && weave.App.is( weave.apps[ app ] ) {
      app = weave.apps[ app ]
    } else if Function.is( app ) && path == undefined && listener == undefined {
      listener = app
    } else throw 'WebSocket: argument app must be an instance of weave.App or string appName'
  }

  if app && path { @attach( app, path ) }
  if Function.is( listener ) { @on( 'connection', listener ) }
})

// XXX: Currently, it is possible to attach the same WebSocket instance to
// multiple apps and paths. This might be useful if we can give the event
// listeners good data on where specifically the message is coming from, but
// could also be bad and complicate things unnecessarily.
weave.WebSocket::attach = function app, socketUrl {
  socket := @

  if !weave.App.is( app ) {
    if String.is( app ) && weave.App.is( weave.apps[ app ] ) {
      app = weave.apps[ app ]
    } else throw 'WebSocket: argument app must be an instance of weave.App or string appName'
  }

  app.addInterface( socketUrl, function httpConnection {
    return new weave.WebSocketConnection( socket, httpConnection )
  })
}

weave.WebSocketConnection = weave.Class( events.EventEmitter, function socket, httpConnection {
  socketConnection := @
  @_WEAVE_CONNECTION = httpConnection
  @_NODE_CONNECTION = httpConnection._NODE_CONNECTION
  @readyState = 0

  socketConnection.handshake( httpConnection, @ )

  // We're connected!
  socketConnection.readyState = 1
  socket.emit( 'connection', socketConnection )

  httpConnection.on( 'data', function data {
    var message = socketConnection.decode( data );
    if socketConnection.readyState === 1 {
      if message.opcode <= 0x2 {
        socketConnection.emit( 'message', message, socketConnection )
      } else if message.opcode === 0x8 {
        socketConnection.close( null, null, message )
        console.log( 'received close frame')
      } else if message.opcode === 0x9 {
        console.log( "pong ping" ) // TEMPORARY
        socketConnection.emit( 'ping', message, socketConnection )
        socketConnection.send( message.buffer, 0xA )
      } else if message.opcode === 0xA {
        socketConnection.emit( 'pong', message, socketConnection )
      }
    }
  })
})

weave.WebSocketConnection::handshake = function httpConnection, socketConnection {
  socket := @
  // Make sure the client is expecting a WebSocket upgrade, and that it gave us a key.
  if ( httpConnection.get( "connection" ) === "Upgrade" && httpConnection.get( "upgrade" ) === "websocket" ) {
    key := httpConnection.get( "sec-websocket-key" )
    if key {
      // Compute the sec-websocket-accept header value to complete the handshake.
      accept := weave.util.SHA1_64( key + weave.constants.WebSocketUUID )
      httpConnection.writeHead( 101, {
        "Connection": "Upgrade",
        "Upgrade": "websocket",
        "Sec-WebSocket-Accept": accept
      }).endHead()
    } else httpConnection.generateErrorPage( new weave.HTTPError( 400, "Client expected a websocket"
                                                  + " but did not include a sec-websocket-key header."))
  } else {
    httpConnection.generateErrorPage( new weave.HTTPError( 426, "Client was not expecting a WebSocket." ) )
  }
}

weave.WebSocketConnection::decode = function data {
  // Set up our scope with all the necessary variables.
  b0 := weave.util.READ_BITS( data[0] )
  b1 := weave.util.READ_BITS( data[1] )
  offset := 0
  decoded := []
  details := {
    masked: b1[0], // 0 if false, 1 if true
    FIN: b0[0], // 0 if partial, 1 if final frame
    opcode: weave.util.BINARY_UINT( b0.slice( 4, 8 ) ) }
  payloadLength := weave.util.BINARY_UINT( b1.slice( 1, 8 ) );

  // Check if the frame has an extended payload length,
  // and if it is 16 bit or 64 bit.
  if payloadLength === 126 {
    details.length = Number.parseInt( data[2].toString(16) + data[3].toString(16), 16 )
    offset = 2
  } else if payloadLength === 127 && data[2] < 128 {
    // For 64 bit lengths, the most significant bit must be 0
    if data[2] < 128 {
      details.length = ""
      data.slice( 2, 10 ).forEach( function l { details.length += l.toString(16) })
      details.length = Number.parseInt( details.length, 16 )
      offset = 8
    } else {
      console.error( "Received a websocket with an invalid length." )
    }
  } else details.length = payloadLength

  if details.masked {
    details.maskingKey = data.slice( 2 + offset, 6 + offset )

    // Unmask all the data
    data.slice( 6 + offset, details.length + 6 + offset ).forEach( function byte, index {
      decoded[ index ] = byte ^ details.maskingKey[ index % 4 ] })
    details.buffer = Buffer.from( decoded )

    // If the data is identified as text, then convert it to a string
    if details.opcode === 0x1 {
      details.data = details.buffer.toString( 'utf-8' )
    } else if details.opcode === 0x8 {
      details.code = Number.parseInt( details.buffer.slice( 0, 2 ).toString( 'hex' ), 16 )
      details.reason = details.buffer.slice( 2 ).toString( 'utf-8' )
    }
  } else {
    // Incoming data is required to be masked, so ignore it if it isn't.
    @close( 1002, "Data was not masked." )
  }

  return details
}

weave.WebSocketConnection::send = function data, opcode {
  if !Buffer.isBuffer( data ) {
    if String.is( data ) {
      data = Buffer.from( data )
    } else console.error( "WebSocket data should be a string or a buffer!" )
  }

  prefix := [ Number.is( opcode ) ? 128 + opcode : 129, 0 ]

  // Determine if we need an extendedPayloadLength, and if we do, how long.
  // We must add the correct number of spacing 0's to our length string to
  // get a buffer of the exact length that we need. When we have the length
  // figured out, complete the prefix and make it a Buffer.
  if data.length > 125 {
    if data.length > 65536 {
      prefix[1] += 127,
      length := data.length.toString( 16 )
      weave.util.times( 16 - length.length, function () { length = "0" + length } )
    } else {
      prefix[1] += 126,
      length := data.length.toString( 16 )
      weave.util.times( 4 - length.length, function () { length = "0" + length } )
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
  socketConnection := @

  // Avoid pinging multiple times at once
  if !@pinging {
    @pinging = true;
    pingBuffer := Buffer.from( weave.util.RNDM_RG( 0, 0xFFFFFFFF, 16 ), 'hex' )
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

weave.WebSocketConnection::close = function code, reason, message {
  // This defaults the code to 1000
  codeBuffer := [ 0x3, 0xe8 ]
  console.log( @readyState, code, reason, message )

  // If the connection is already being closed, this will just be the
  // client returning a close frame, so we finish closing the connection.
  if @readyState === 2 {
    console.log( 'closing connection', @ )
    @readyState = 3
    //@_NODE_CONNECTION.close()
    @emit( 'close', message )
  } else if @readyState < 2 {
    // If we have processed a message, then the client is requesting we close
    // the connection. If there is no message, then it is us closing it.
    if message {
      console.log( 'closing connection..' )
      @readyState = 3
      @send( message.buffer, 0x8 )
      //@_NODE_CONNECTION.close()
      @emit( 'close', message )
    } else {
      @readyState = 2
      if Number.is( code ) && code < 65535 {
        codeBuffer[1] = code % 256
        codeBuffer[0] = ( code - codeBuffer[1] ) / 256
      }

      codeBuffer = Buffer.from( codeBuffer, 'hex' )

      if reason != null && !Buffer.isBuffer( reason ) {
        if String.is( reason ) {
          reason = Buffer.from( reason )
        } else console.error( "WebSocket data should be a string or a buffer!" )
      }

      @send( reason != null ? Buffer.concat([ codeBuffer, reason ]) : codeBuffer, 0x8 )
    }
  } else {
    return false
  }

  return true
}
