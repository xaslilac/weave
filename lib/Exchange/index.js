// MIT License / Copyright 2015
"use strict";

const weave = require( '../..' )
const garden = require( 'gardens' ).createScope( 'weave.Exchange' )
const linkToMounts = require( '../linker' )

const { EventEmitter } = require( 'events' )
const fs = require( 'fs' )
const os = require( 'os' )
const path = require( 'path' )
const url = require( 'url' )

// The Exchange class determines which App is responsible
// for handling the ClientRequest and ServerResponse
// as well as interfacing between them.
class Exchange extends EventEmitter {
  constructor( secure, request, response ) {
    // Make it an EventEmitter
    super()

    // Make sure the Host header is valid, and strip off the port number if necessary.
    const hostMatch = /^([A-Za-z0-9\-.[\]:]+?)(:(\d{1,5}))?$/.exec( request.headers.host )

    // Normalize the path before parsing to prevent any ../ tomfoolery
    const normalizedUrl = url.parse( path.normalize( request.url ) )
    normalizedUrl.pathname = unescape( normalizedUrl.pathname )

    const urlProperties = {
      protocol: secure ? 'https:' : 'http:',
      slashes: '//',
      hostname: hostMatch[ 1 ],
      port: request.connection.localPort
    }

    Object.assign( this, {
      // Save these here, mainly for internal use with the classes methods.
      // Ideally these wouldn't be used outside of Weave. All interactions
      // with them should be through using methods of the Connection class.
      _NODE_CONNECTION: request.connection,
      _NODE_REQUEST: request,
      _NODE_RESPONSE: response,

      // Set directory to an empty string for length comparisons.
      date: new Date(),
      state: 0,

      // requestUrl should remain unchanged and read-only. relativeUrl is used
      // to handle subdirectories and mounts.
      requestUrl: Object.assign( {}, normalizedUrl, urlProperties ),
      relativeUrl: Object.assign( { prefix: '', suffix: '', depth: 0 }, normalizedUrl, urlProperties ),

      // What kind of Connection are we dealing with?
      method: request.method.toLowerCase(),
      isKeepAlive: /keep-alive/i.test( request.headers.connection ),
      isUpgrade: /upgrade/i.test( request.headers.connection ),
      secure
    })

    // If we don't have a valid Host header then there's no way to figure
    // out which app is supposed to be used to handle the Connection.
    // We can't throw this earlier, because generateErrorPage needs a
    // certain level of information.

    // TODO: This line of code would break the websocket plugin.
    // We only support keep-alive for HTTP, but Upgrades can be handled differently.
    // Find a way to make this check robust enough to reject if it's not intercepted.
    // if ( !this.isKeepAlive ) return request.connection.destroy()
    if ( !hostMatch ) return this.generateErrorPage( new weave.HttpError( 400, 'Request must have a valid Host header.' ) )

    // This is so that we don't start forwarding data until someone is listening
    // to it, since we don't implement a Readable Stream, we just forward events.
    this.on( 'newListener', event => {
      if ( event === 'data' ) {
        request.on( 'data', data => this.emit( 'data', data ) )
        this.removeAllListeners( 'newListener' )
      }
    })

    request.on( 'end', () => {
      this.emit( 'end' )
    })

    // Send our freshly configured exchange to the proper places
    weave._bindings[ this.requestUrl.port ].linkToExchange( this )

    // Once we've settled on the root app, check domain requirements, and mounts.
    linkToMounts( this )
  }

  preventDefault() {
    this._preventDefault = true
  }

  preventPrinting() {
    this._preventPrinting = true
  }

  // Methods for getting information about the request

  behavior( name ) {
    if ( typeof name !== 'string' ) throw garden.typeerror( 'Configuration behavior must be a string' )
    if ( !this.app || !this.app.options ) return undefined

    let behavior
    let nests = name.split(" ")
    let scopes = [ this.app.options ]

    let level = this.app.options
    while ( level._super ) {
      level = level._super
      scopes.push( level )
    }

    // Load in order of priority. Check the most relevant configurations first.
    scopes.some( ( cursor, x ) => {
      // garden.log( 'Checking scope', x )
      // Make sure the cursor actually exists, in case
      // this.configuration._super isn't defined.
      if ( cursor ) {
        // If the cursor follows all the way to the requested property
        // then set the behavior. If it's every undefined then it stops.
        if ( nests.every( nest => cursor = cursor[ nest ] ) ) {
          behavior = cursor
          // Crazy bug fix for inherited error pages
          // XXX: This is gross and not robust
          if ( nests[ 0 ] === 'errorPages'
					&& this.options && this.options.location
					&& x > 0 && scopes[ x ].location ) {
            behavior = path.join( path.relative( scopes[ x ].location, scopes[ 0 ].location ), behavior )
          }

          return true;
        }
      }
    } )

    // If the location begins with ~/, replace it with the users home directory.
    if ( name === 'location' && typeof behavior === 'string' && behavior.slice( 0, 2 ) === '~/' ) {
      behavior = path.join( os.homedir(), behavior.substr( 2 ) )
    }

    // Return the matching behavior. If we didn't find one this should
    // still just be undefined.
    return behavior
  }

  detail( name, untampered ) {
    // Make sure the header name is lowercase, so that it
    // can be case insensitive.
    name = name.toLowerCase()
    let header = this._NODE_REQUEST.headers[ name ]

    // If untampered is true then the header must be returned as a
    // plain string. If it's not, then we can do some processing
    // to make it more useful than a string.
    if ( !untampered ) {
      switch ( name ) {
      case "if-modified-since":
        if ( header ) return new Date( header )
        break;
      case "cookie":
        // I think this is how we parse cookies but I suck at them???
        if ( typeof header === 'string' ) {
          let data = {}
          let value
          header.split( ';' ).forEach( cookie => {
            [ cookie, ...value ] = cookie.trim().split( '=' )
            data[ cookie ] = value || true
          })
          return data
        }
        break;
      }
    }

    // If something else hasn't already been returned, or if untampered
    // is true then just return the header as a normal string.
    return header
  }

  setEncoding( encoding ) {
    this._NODE_REQUEST.setEncoding( encoding )
  }

  read( encoding = 'utf-8', timeout = 3000 ) {
    return new Promise( ( fulfill, reject ) => {
      let temper = setTimeout( () => {
        reject( this.garden.warn( 'No data to read!' ) )
      }, timeout )

      this.once( 'data', data => {
        clearTimeout( temper )
        fulfill( data.toString( encoding ) )
      })
    })
  }

  // Methods for sending a response for the client.



  // Utilities for quickly finishing responses

  redirect( location, status = 302, headers ) {
    if ( location === 304 ) return this.status( 304 ).end()
    if ( typeof location !== 'string' ) {
      this.generateErrorPage( 500 )
      throw garden.typeerror( 'Redirect location is not a string!' )
    }

    if ( typeof status !== 'number' || status < 300 || status > 399 ) {
      headers = status
      status = 302
    }

    return this.head( status, Object.assign({ 'Location': location }, headers ) ).end()
  }
}

weave.Exchange = Exchange

require( './response' )
require( './defaults' )
