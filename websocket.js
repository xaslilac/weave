// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.WebSocket' )

let events = require( 'events' )

weave.WebSocket = class WebSocket extends events.EventEmitter {
  constructor( app, url, listener ) {
    // Make it an EventEmitter
    super()

    if ( app && typeof app === 'function' && url == null && listener == null ) listener = app
    if ( app && url ) this.attach( app, url )
    if ( typeof listener === 'function' ) this.on( 'connection', listener )
  }

  // XXX: Currently, it is possible to attach the same WebSocket instance to
  // multiple apps and paths. This might be useful if we can give the event
  // listeners good data on where specifically the message is coming from, but
  // could also be bad and complicate things unnecessarily.
  attach( app, socketUrl ) {
    if ( !app instanceof weave.App ) {
      if ( typeof app === 'string' && weave.apps[ app ] instanceof weave.App ) app = weave.apps[ app ]
      else return garden.typeerror( 'argument app must be an instance of weave.App or string appName' )
    }

    app.interface( socketUrl, httpConnection => new weave.WebSocketConnection( this, httpConnection ) )

    return this
  }
}

weave.WebSocketConnection = class WebSocketConnection extends events.EventEmitter {
  constructor( socket, httpConnection ) {
    // Make it an EventEmitter
    super()

    this._WEAVE_CONNECTION = httpConnection
    this._NODE_CONNECTION = httpConnection._NODE_CONNECTION
    this.readyState = 0

    // Make sure the client is expecting a WebSocket upgrade, and that it gave us a key.
    // TIL: The Connection header can have more than just an upgrade request in it
    if ( httpConnection.detail( "connection" ).includes( "Upgrade" ) && httpConnection.detail( "upgrade" ) === "websocket" ) {
      let key = httpConnection.detail( "sec-websocket-key" )
      if ( key ) {
        // Compute the sec-websocket-accept header value to complete the handshake.
        let accept = weave.util.SHA1_64( key + weave.constants.WebSocketUUID )
        httpConnection.writeHead( 101, {
          "Connection": "Upgrade",
          "Upgrade": "websocket",
          "Sec-WebSocket-Accept": accept
        }).endHead()
      } else return httpConnection.generateErrorPage( new weave.HTTPError( 400, 'Client did not include a Sec-WebSocket-Key header.' ) )
    } else return httpConnection.generateErrorPage( new weave.HTTPError( 426, 'Client was not expecting a WebSocket.' ) )

    // We're connected!
    this.readyState = 1
    socket.emit( 'connection', this )

    httpConnection.on( 'data', data => {
      let frame = this.decode( data )
      let { opcode, decoded } = frame

      if ( this.readyState === 1 ) {
        if ( opcode === 0x0 ) {
          // ????
          // XXX: What is this opcode for?
          // TODO: Find out
        } else if ( opcode === 0x1 ) {
          // Plain text
          frame.data = decoded.toString( 'utf-8' )
          this.emit( 'message', frame )
        } else if ( opcode === 0x2 ) {
          // Binary
          // TODO: Finish this
        } else if ( opcode === 0x8 ) {
          // Close
          garden.debug( 'received close frame' )
          frame.code = ( decoded[0] << 8 ) + decoded[1]
          frame.reason = decoded.slice( 2 ).toString( 'utf-8' )
          this.close( null, null, frame )
        } else if ( message.opcode === 0x9 ) {
          // Ping
          garden.debug( 'received ping frame' )
          this.emit( 'ping', frame )
          this.send( decoded, 0xA )
        } else if ( opcode === 0xA ) {
          // Pong
          garden.debug( 'received pong frame' )
          this.emit( 'pong', frame )
        }
      }
    })
  }

  decode( frame ) {
    // Set up our scope with all the necessary variables.
    // These variables are declared in the order they appear in the binary!

    //  https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
    //  +-+-+-+-+-------+-+-------------+-------------------------------+
    //  |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
    //  |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
    //  |N|V|V|V|       |S|             |   (if payload len==126/127)   |
    //  | |1|2|3|       |K|             |                               |
    //  +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
    //  |    Extended payload length continued, if payload len == 127   |
    //  + - - - - - - - - - - - - - - - +-------------------------------+
    //  |                               | Masking-key, if MASK set to 1 |
    //  +-------------------------------+-------------------------------+
    //  |    Masking-key (continued)    |          Payload Data         |
    //  +-------------------------------- - - - - - - - - - - - - - - - +
    //  :                     Payload Data continued ...                :
    //  + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
    //  |                     Payload Data continued ...                |
    //  +---------------------------------------------------------------+

    let lengthOffset = 0
    let final = frame[0] >> 7 & 1 // 0 if partial, 1 if final frame
    let opcode = frame[0] & 15
    let masked = frame[1] >> 7 & 1 // 0 if false, 1 if true
    let payloadLength = frame[1] & 127
    let maskingKey = frame.slice( 2 + lengthOffset, 6 + lengthOffset )

    // Don't accept unmasked data from clients.
    if ( !masked ) return this.close( 1002, "Data was not masked." )

    // Check if the frame has an extended payload length,
    // and if it is 16 bit or 64 bit.
    if ( payloadLength === 126 ) {
      payloadLength = ( frame[2] << 8 ) + frame[3]
      lengthOffset = 2
    } else if ( payloadLength === 127 ) {
      // For 64 bit lengths, the most significant bit must be 0
      // JavaScript is very limited on 64 bit numbers and bitwise operators, so
      // unless the first 4 leading bytes are all 0 + 1 additional bit, we can't
      // compute the size properly.
      if ( frame[2] + frame[3] + frame[4] + frame[5] === 0 ) {
        payloadLength = 0
       frame.slice( 6, 10 ).forEach( ( b, i ) => payloadLength += b << 8 * (3-i) )
        lengthOffset = 8
      } else {
        garden.error( "Received a websocket with an invalid or too large length." )
      }
    }

    // Unmask all the data
    let decoded = Buffer.from(
     frame.slice( 6 + lengthOffset, payloadLength + 6 + lengthOffset )
        .map( ( byte, index ) => byte ^ maskingKey[ index % 4 ] ) )

    // let data, code, reason;
    //
    // // If the data is identified as text, then convert it to a string
    // if ( details.opcode === 1 ) {
    //   data = decoded.toString( 'utf-8' )
    // } else if ( details.opcode === 8 ) {
    // }

    return { final, opcode, masked, payloadLength, decoded }
  }

  send( data, opcode = 1 ) {
    if ( !Buffer.isBuffer( data ) ) {
      if ( typeof data === 'string' ) data = Buffer.from( data )
      else garden.typeerror( "WebSocket data should be a string or a buffer!" )
    }

    let frame = [ 128 + opcode ]
    let length = Buffer.byteLength( data )

    // Determine if we need an extendedPayloadLength, and if we do, how long.
    // We must add the correct number of spacing 0's to our length string to
    // get a buffer of the exact length that we need. When we have the length
    // figured out, complete the prefix and make it a Buffer.
    if ( length > 65536 )
      // Again, when using the 64-bit length mode we must deal with the limitations
      // of JavaScipt. The first four bytes must all be 0, because bitwise operators
      // will start to make things negative/completely wrong after 32 bits.
      frame.push( 127, 0, 0, 0, 0, length >> 24 & 255, length >> 16 & 255,
                                   length >> 8  & 255, length       & 255 )

    else if ( length > 125 ) frame.push( 126, length >> 8 & 255, length & 255 )
    else frame.push( length )

    frame = Buffer.concat([ Buffer.from( frame ), data ])

    // Send everything to the client.
    this._NODE_CONNECTION.write( frame )
    return true
  }

  ping( callback ) {
    // Avoid pinging multiple times at once
    if ( this.pinging ) return false

    this.pinging = true;
    let pingBuffer = Buffer.from( weave.util.RNDM_RG( 0, 0xFFFFFFFF, 16 ), 'hex' )
    this.send( pingBuffer, 0x9 )

    // Verify that the message is correct.
    this.once( 'pong', frame => {
      this.pinging = false
      typeof callback === 'function' && callback.call( this, frame.decoded.equals( pingBuffer ) )
    })

    return true
  }

  close( code, reason, frame ) {
    // This defaults the code to 1000
    let codeBuffer = [ 0x3, 0xe8 ]
    garden.debug( this.readyState, code, reason, frame )

    // If the connection is already being closed, this will just be the
    // client returning a close frame, so we finish closing the connection.
    if ( this.readyState === 2 ) {
      garden.debug( 'closing connection', this )
      this.readyState = 3
      //@_NODE_CONNECTION.close()
      this.emit( 'close', frame )
    } else if ( this.readyState < 2 ) {
      // If we have processed a frame, then the client is requesting we close
      // the connection. If there is no frame, then it is us closing it.
      if ( frame ) {
        garden.debug( 'client is closing websocket..', frame.code, frame.reason )
        this.readyState = 3
        this.send( frame.decoded, 0x8 )
        //@_NODE_CONNECTION.close()
        this.emit( 'close', frame )
      } else {
        this.readyState = 2
        if ( typeof code === 'number' && code < 65535 ) {
          codeBuffer[1] = code % 256
          codeBuffer[0] = ( code - codeBuffer[1] ) / 256
        }

        codeBuffer = Buffer.from( codeBuffer, 'hex' )

        if ( reason != null && !Buffer.isBuffer( reason ) ) {
          if ( typeof reason === 'string' ) {
            reason = Buffer.from( reason )
          } else garden.error( "WebSocket data should be a string or a buffer!" )
        }

        this.send( reason != null ? Buffer.concat([ codeBuffer, reason ]) : codeBuffer, 0x8 )
      }
    } else {
      return false
    }

    return true
  }
}
