// MIT License / Copyright 2015
"use strict";

const weave = require( '../..' )
const garden = require( 'gardens' ).createScope( 'weave.Exchange' )

const { EventEmitter } = require( 'events' )
const fs = require( 'fs' )
const os = require( 'os' )
const path = require( 'path' )
const Spirit = require( 'string-spirits' )
const url = require( 'url' )

class Exchange extends EventEmitter {
  constructor( secure, request, response ) {
    // Make it an EventEmitter
    super()

    // Make sure the Host header is valid, and strip off the port number if necessary.
    const hostMatch = /^([A-Za-z0-9\-.[\]:]+?)(:(\d{1,5}))?$/.exec( request.headers.host )

    // Normalize the path before parsing to prevent any ../ tomfoolery
    const normalizedUrl = url.parse( path.normalize( request.url ) )
    normalizedUrl.pathname = unescape( normalizedUrl.pathname )

    Object.assign( this, {
      _NODE_CONNECTION: request.connection,
      _NODE_REQUEST: request,
      _NODE_RESPONSE: response,

      date: new Date(),
      state: 0,
      secure,

      // Default encoding for reading and writing
      _encoding: 'utf-8',

      // What kind of Connection are we dealing with?
      method: request.method.toLowerCase(),
      isKeepAlive: request.headers.connection.toLowerCase().includes( 'keep-alive' ),
      isUpgrade: request.headers.connection.toLowerCase().includes( 'upgrade' )
    })

    // If we don't have a valid Host header then there's no way to figure
    // out which app is supposed to be used to handle the Connection.
    // We can't throw this earlier, because generateErrorPage needs a
    // certain level of information.
    if ( !hostMatch ) return this.generateErrorPage( new weave.HttpError( 400, 'Request must have a valid Host header.' ) )

    const urlProperties = {
      protocol: secure ? 'https:' : 'http:',
      slashes: '//',
      hostname: hostMatch[ 1 ],
      port: request.connection.localPort
    }

    // requestUrl should remain unchanged and read-only.
    this.requestUrl = Object.assign( {}, normalizedUrl, urlProperties )
    // relativeUrl is used to handle subdirectories and mounts.
    this.relativeUrl = Object.assign( { prefix: '', suffix: '', depth: 0 }, normalizedUrl, urlProperties )

    // We only support keep-alive for HTTP, but Upgrades can be handled differently.
    // TODO: Find a way to make this check robust enough to reject if it's not intercepted.
    if ( !this.isKeepAlive && !this.isUpgrade ) return request.connection.destroy()

    // This is so that we don't start forwarding data until someone is listening
    // to it, since we don't implement a Readable Stream and just forward events.
    this.on( 'newListener', event => {
      if ( event === 'data' ) {
        request.on( 'data', data => this.emit( 'data', data ) )
        request.on( 'end', () => this.emit( 'end' ) )
        this.removeAllListeners( 'newListener' )
      }
    })

    const binding = weave._bindings[ this.requestUrl.port ]

    // Check for a direct host match, or a cached wildcard match.
    // If there isn't one, check against wildcards, filtering out hosts
    // that don't contain at least one wildcard since they won't match.
    if ( binding.attachments[ this.requestUrl.hostname ] ) {
      this.app = binding.attachments[ this.requestUrl.hostname ]
    } else if ( binding.cachedMatches[ this.requestUrl.hostname ] ) {
      this.app = binding.cachedMatches[ this.requestUrl.hostname ]
    } else {
      // Check the requested host against all linked hostnames that have a wildcard
      let hostnameSpirit = Spirit.bestMatch(
        Object.keys( binding.attachments ).filter( hostname => /\*|\?/.test( hostname ) ), this.requestUrl.hostname
      )

      // If there isn't a linked app then just end the connection.
      if ( !hostnameSpirit ) return this.generateErrorPage( 503, 'The server is not configured for this host.' )

      // Remember which wildcard best matched this host for next time
      this.app = binding.cachedMatches[ this.requestUrl.hostname ] = binding.attachments[ hostnameSpirit.toString() ]
    }

    // Once we've settled on the root app, check domain requirements, and mounts.
    this.mount( this )
  }

  preventDefault() {
    this._preventDefault = true
  }

  setEncoding( encoding ) {
    this._encoding = encoding
    this._NODE_REQUEST.setEncoding( encoding )
  }
}

weave.Exchange = Exchange

require( './defaults' )
require( './mount' )
require( './request' )
require( './response' )
