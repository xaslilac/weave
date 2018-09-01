// MIT License / Copyright 2015

'use strict';

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave.App' )

const chalk = require( 'chalk' )
const events = require( 'events' )
const path = require( 'path' )
const Spirit = require( 'string-spirits' )

weave.App = class App extends events.EventEmitter {
  constructor( options ) {
    // Make it an EventEmitter
    super()

    this.options = Object.assign( {
      urlCleaning: 'true',
      headers: { 'X-Powered-By': 'Weave' },
      indexes: {},
      extensions: [],
      mimeTypes: {},
      errorPages: {}
    }, options )

    this.mounts = {}
    this._mountPaths = {}
    this._resolvedPaths = {}
  }

  link( binding, hostname = '*' ) {
    // If host is a port number, it will handle the entire port.
    // If it is not a port number or a string, it is invalid.
    if ( typeof hostname !== 'string' ) return garden.typeerror( "Hostname must be a string." )

    // If the host is already taken, abandon ship.
    if ( binding.attachments[ hostname ] ) return garden.error( `${hostname}:${binding.port} already in use!` )

    // If the host is a wildcard then clear all wildcardMatches that match
    // it. If it's a literal, clear wildcardMatches for that literal.
    if ( /\*/.test( hostname ) ) {
      let wildcard = new Spirit( hostname )
      Object.keys( binding.cachedMatches ).forEach( cachedhost => {
        if ( wildcard.match( binding.cachedMatches[ cachedhost ] ) )
          binding.cachedMatches[ cachedhost ] = null })
    } else if ( binding.cachedMatches[ hostname ] )
      binding.cachedMatches[ hostname ] = null

    binding.attachments[ hostname ] = this

    if ( binding._active ) this.emit( 'ready', { binding, hostname } )
    else binding.server.on( 'listening', () => this.emit( 'ready', { binding, hostname } ))

    // Return this from all configuration methods so they can be chained.
    return this
  }

  configure( options ) {
    Object.assign( this.options, options )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  mount( directory, app ) {
    if ( typeof directory !== 'string' ) return this.garden.typeerror( 'Argument directory must be a string!' )
    if ( !path.isAbsolute( directory ) ) return this.garden.error( 'Argument directory must be absolute!' )
    if ( directory.length < 2 ) return this.garden.error( 'Root is not a subdirectory! Use configure instead!' )

    if ( !(app instanceof weave.App) ) return this.garden.typeerror( 'You can only mount apps!' )

    // Clear the cache so that the configuration can be modified and
    // not conflict with previously caches requests.
    this._mountsPaths = {}

    // Keep things consistent on Windows with other platforms.
    // Make sure that we don't store an ending slash on directories.
    // If /abc/ is configured, and /abc is requested, we should round up.
    directory = directory.replace( /\\/g, '/' ).replace( /\/$/, '' )

    // TODO: We inherit from the parent app. We should check to make sure that
    // the given directory is not inside any current mounts. If it is, we should
    // ask the user to nest the mounts, rather than overlapping.
    app.options._super = this.options

    // mount.type = 'directory'
    this.mounts[ directory ] = app

    // Return this from all configuration methods so they can be chained.
    return this
  }

  // setBehavior( name, value ) {
  //   if ( typeof name !== 'string' ) return this.garden.typeerror( `Behavior name '${name}' is not a string!` )
  //   let nests = name.split(' ')
  //   let prop = nests.pop()
  //   let cursor = this.configuration
  //
  //   nests.forEach( nest => {
  //     if ( typeof cursor[ nest ] !== 'object' ) cursor[ nest ] = {}
  //   } )
  //
  //   cursor[ prop ] = value
  //
  //   // Return this from all configuration methods so they can be chained.
  //   return this
  // }

  // index( name, depth = 0 ) {
  //   if ( this.configuration.indexes ) this.configuration.indexes[ name ] = depth
  //   else this.configuration.indexes = { [ name ]: depth }
  //
  //   // Return this from all configuration methods so they can be chained.
  //   return this
  // }

  // interface( path, handle, methods = ['default'] ) {
  //   // Keep things consistent on Windows with other platforms.
  //   path = path.replace( /\\/g, '/' )
  //
  //   // If there is already an interface at this path, we might be able to
  //   // attach to a different request method. If not, create a new wrapper.
  //   if ( !this.configuration[ path ] ) this.configuration[ path ] = { type: 'interface' }
  //   let wrap = this.configuration[ path ]
  //
  //   if ( typeof methods === 'string' ) methods = [ methods ]
  //   else if ( !Array.isArray( methods ) ) return this.garden.typeerror( 'Interface method must be a string or an array of strings' )
  //
  //   methods.forEach( method => {
  //     if ( typeof method !== 'string' ) return this.garden.typeerror( 'Interface method must a string!' )
  //     if ( wrap[ method ] ) return garden.error( `Interface ${method}: ${path} already exists!` )
  //     wrap[ method ] = handle
  //   })
  //
  //   // Return this from all configuration methods so they can be chained.
  //   return this
  // }
}

// void function ( ...methods ) {
//   methods.forEach( method => {
//     weave.App.prototype[ method ] = ( path, handle ) => {
//       this.interface( path, handle, [ method ] )
//     }
//   })
// }( 'get', 'post', 'head', 'put', 'delete' )
