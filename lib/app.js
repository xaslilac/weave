// MIT License / Copyright 2015

'use strict';

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave.App' )

const chalk = require( 'chalk' )
const events = require( 'events' )
const path = require( 'path' )
const Spirit = require( 'string-spirits' )

function appEvent( app, event, details ) {
  return function ( error ) {
    app.emit( event, error, details )
  }
}

weave.App = class App extends events.EventEmitter {
  constructor( options ) {
    // Make it an EventEmitter
    super()

    this.configuration = options
    this.cache = {
      parentDirectories: {},
      resolvedPaths: {}
    }
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
      Object.keys( binding.hostMatches ).forEach( cachedhost => {
        if ( wildcard.match( binding.hostMatches[ cachedhost ] ) )
          binding.hostMatches[ cachedhost ] = null })
    } else if ( binding.hostMatches[ hostname ] )
      binding.hostMatches[ hostname ] = null

    binding.attachments[ hostname ] = this

    if ( binding._active ) this.emit( 'ready', { binding, hostname } )
    else binding.server.on( 'listening', () => this.emit( 'ready', { binding, hostname } ))

    // Return this from all configuration methods so they can be chained.
    return this
  }

  configure( configuration ) {
    Object.assign( this.configuration, configuration )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  subdirectory( directory, inherit, configuration ) {
    if ( typeof directory !== 'string' ) return this.garden.typeerror( 'Argument directory must be a string!' )
    if ( !path.isAbsolute( directory ) ) return this.garden.error( 'Argument directory must be absolute!' )
    if ( directory.length < 2 ) return this.garden.error( 'Root is not a subdirectory! Use configure instead!' )
    // Clear the cache so that the configuration can be modified and
    // not conflict with previously caches requests.
    this.cache.parentDirectories = {}

    // Keep things consistent on Windows with other platforms.
    // Make sure that we don't store an ending slash on directories.
    // If /abc/ is configured, and /abc is requested, we should round up.
    directory = directory.replace( /\\/g, '/' ).replace( /\/$/, '' )

    // If we only have two arguments then inherit is actually going to be the
    // configuration. If we have three arguments, then we set the inheritance.
    configuration
      ? configuration._super = typeof inherit === 'string'
        ? this.configuration[ inherit ]
        : inherit
      : configuration = inherit

    configuration.type = 'directory'

    if ( this.configuration[ directory ] ) Object.assign( this.configuration[ directory ], configuration )
    else this.configuration[ directory ] = configuration

    // Return this from all configuration methods so they can be chained.
    return this
  }

  setBehavior( name, value ) {
    if ( typeof name !== 'string' ) return this.garden.typeerror( `Behavior name '${name}' is not a string!` )
    let nests = name.split(' ')
    let prop = nests.pop()
    let cursor = this.configuration

    nests.forEach( nest => {
      if ( typeof cursor[ nest ] !== 'object' ) cursor[ nest ] = {}
    } )

    cursor[ prop ] = value

    // Return this from all configuration methods so they can be chained.
    return this
  }

  index( name, depth = 0 ) {
    if ( this.configuration.indexes ) this.configuration.indexes[ name ] = depth
    else this.configuration.indexes = { [ name ]: depth }

    // Return this from all configuration methods so they can be chained.
    return this
  }

  interface( path, handle, methods = ['default'] ) {
    // Keep things consistent on Windows with other platforms.
    path = path.replace( /\\/g, '/' )

    // If there is already an interface at this path, we might be able to
    // attach to a different request method. If not, create a new wrapper.
    if ( !this.configuration[ path ] ) this.configuration[ path ] = { type: 'interface' }
    let wrap = this.configuration[ path ]

    if ( typeof methods === 'string' ) methods = [ methods ]
    else if ( !Array.isArray( methods ) ) return this.garden.typeerror( 'Interface method must be a string or an array of strings' )

    methods.forEach( method => {
      if ( typeof method !== 'string' ) return this.garden.typeerror( 'Interface method must a string!' )
      if ( wrap[ method ] ) return garden.error( `Interface ${method}: ${path} already exists!` )
      wrap[ method ] = handle
    })

    // Return this from all configuration methods so they can be chained.
    return this
  }
}

Object.assign( weave.App.prototype, {
  filter: weave.filter,
  redirect: weave.redirect,
  header: weave.header
})

void function ( ...methods ) {
  methods.forEach( method => {
    weave.App.prototype[ method ] = ( path, handle ) => {
      this.interface( path, handle, [ method ] )
    }
  })
}( 'get', 'post', 'head', 'put', 'delete' )
