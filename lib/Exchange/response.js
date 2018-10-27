// MIT License / Copyright 2015
"use strict";

const weave = require( '../..' )
const garden = require( 'gardens' ).createScope( 'weave.Exchange.response' )

const { STATUS_CODES } = require( 'http' )

// Declare our exchange states as constants, for verbosity
const [ NEW, HEAD, BODY, COMPLETE ] = [ 0, 1, 2, 3 ]

// End packet buffer for connection: keep-alive
const n = Buffer.from( '\r\n' )
const z = Buffer.from( '0\r\n\r\n' )

Object.assign( weave.Exchange.prototype, {
  status( status ) {
    // Check to make sure the status is valid, and has not yet been written.
    if ( this.state > HEAD ) throw garden.error( `Cannot write status ${status} to HTTP stream, already wrote ${this._WRITTEN_STATUS}!` )
    if ( typeof status !== 'number' ) throw garden.typeerror( `Status ${status} is not a number!` )

    this._WRITTEN_STATUS = status
    this._WRITTEN_HEADERS = {}
    this.state = HEAD

    return this
  },

  header( header, value ) {
    // To write headers we must have a status, no body, and a valid header name.
    if ( this.state > HEAD ) throw garden.error( `Headers already sent for ${ this.requestUrl.pathname }!` )
    if ( typeof header !== 'string' ) throw garden.typeerror( 'Header arugment must be a string' )

    if ( this.state === NEW ) this.status( 200 )

    // You can't cache an error!
    if ( header.toLowerCase() === "last-modified" && this._STATUS >= 300 ) {
      garden.warning( "You can't cache an error!" )
    }

    this._WRITTEN_HEADERS[ header ] = value

    return this
  },

  head( status, headers ) {
    if ( typeof status !== 'number' ) {
      headers = status
      status = 200
    }

    if ( !headers ) throw garden.error( 'No headers given to weave.Exchange::head!' )

    if ( !this._WRITTEN_STATUS ) this.status( status )
    Object.keys( headers ).forEach( name => this.header( name, headers[ name ] ) )

    return this
  },

  hasBody() {
    return this.method !== 'HEAD' && this._STATUS !== 304
  },

  _clearHead() {
    if ( this.state < BODY ) {
      if ( this.state < HEAD ) this.status( 200 )

      let status = this._WRITTEN_STATUS
      let headers = Object.assign(
        {
          'Date': this.date.toUTCString(),
          'Accept-Ranges': 'bytes',
          'Transfer-Encoding': 'chunked'
        },
        this.behavior( 'headers' ),
        this._WRITTEN_HEADERS
      )

      this._NODE_CONNECTION.write( `HTTP/1.1 ${status} ${STATUS_CODES[ status ]}\r\n` )
      Object.keys( headers ).forEach( header => {
        this._NODE_CONNECTION.write( `${header}: ${headers[ header ]}\r\n` )
      })
      this._NODE_CONNECTION.write( n )

      this.state = BODY
    }

    return this
  },

  write( content, encoding = this._encoding ) {
    if ( this.state === COMPLETE ) throw garden.error( 'Cannot write data, response has already been completed.' )
    if ( typeof content !== 'string' && !Buffer.isBuffer( content ) ) throw garden.typeerror( 'Content must be a string or buffer' )

    if ( this.state < BODY ) this._clearHead()

    if ( this.hasBody() ) {
      if ( this.isKeepAlive ) {
        let buf = Buffer.concat( [
          Buffer.from( Buffer.byteLength( content, encoding ).toString( 16 ) ), n,
          Buffer.from( content, encoding ), n
        ] )

        this._NODE_CONNECTION.write( buf )
      } else {
        // this.writeHeader( 'Content-Length', content.length )
        // XXX: I don't know if this is 100%, but I think it is.
        this._NODE_CONNECTION.write( content, encoding )
        // This is such a mess, we really need to clean this up.
      }
    }

    return this
  },

  end( ...args ) {
    // Write any data given, and then send the "last chunk"
    // Firefox will hang on requests if there is no body present,
    // such as 3xx redirects, so write a blank one if we haven't.
    if ( args.length > 0 ) this.write( ...args )
    if ( this.state < BODY ) this.write( '' )

    // Send the end of file buffer
    this._NODE_CONNECTION.write( z )

    // garden.timeEnd( this.requestUrl.pathname )

    this.state = COMPLETE
    return this
  }
})
