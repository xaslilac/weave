// MIT License / Copyright 2015

'use strict';

const weave = require( '..' )
const garden = weave.createGarden( 'weave.App' )

const events = require( 'events' )
const http = require( 'http' )
const https = require( 'https' )
const path = require( 'path' )
const Spirit = require( 'string-spirits' )

function appEvent( app, event, details ) {
  return function ( error ) {
    app.emit( event, error, details )
  }
}

function attachServer( info, security, app ) {
  let handler = appEvent( app, 'listening', info )
  if ( weave.servers[ info.port ] ) return handler()

  const server = security
    ? https.createServer( security )
    : http.createServer()

  void ['request', 'upgrade'].forEach( event =>
    server.on( event, ( req, res ) => new weave.Exchange( req, res, !!security ) ) )

  server.on( 'listening', handler )
  server.listen( info.port, '::' )

  weave.servers[ info.port ] = server

  // Used to determine if any servers are active yet when an error is encountered.
  weave._ACTIVE = true

  return server
}

function mountApp( host, app ) {
  // If host is a port number, it will handle the entire port.
  // If it is not a port number or a string, it is invalid.
  if ( typeof host === 'number' ) host = `*:${host}`
  else if ( typeof host !== 'string' ) return app.garden.typeerror( "Host much be a string or a port number." )

  // If the host is already taken, abandon ship.
  if ( weave.hosts[ host ] ) return app.garden.error( `Host ${host} already used by ${weave.hosts[host].appName}.` )

  // Check to make sure it is a valid host, with a valid port. (Inside the range 0x1-0xFFFF)
  let [ split, hostname, port ] = host.match( /^(.+?\:)([0-9]{1,5})$/ )
  if ( !split ) return this.garden.error( `${host} is not a valid host name.` )
  if ( port < 1 || port > 0xFFFF ) return app.garden.error( `${port} is not a valid port number.` )

  // If the host is a wildcard then clear all wildcardMatches that match
  // it. If it's a literal, clear wildcardMatches for that literal.
  if ( /\*/.test( host ) ) {
    let wildcard = new Spirit( host )
    Object.keys( weave.cache.hostMatches ).forEach( cachedhost => {
      if ( wildcard.match( weave.cache.hostMatches[ cachedhost ] ) )
        weave.cache.hostMatches[ cachedhost ] = false })
  } else if ( weave.cache.hostMatches[ host ] )
    weave.cache.hostMatches[ host ] = false

  weave.hosts[ host ] = app

  return { host, hostname, port }
}

weave.App = class App extends events.EventEmitter {
  constructor( appName, configuration ) {
    // Make it an EventEmitter
    super()

    if ( typeof appName === 'object' ) {
      configuration = appName
      appName = appName.appName
    }

    if ( appName ) {
      if ( weave.apps[ appName ] )
        return garden.error( `Names must be unique! A '${appName}' app already exists!` )
      weave.apps[ appName ] = this
    } else appName = 'anonymous', weave.apps.anonymous.push( this )

    this.garden = weave.createGarden( `weave.App(${appName})` )
    this.configuration = Object.assign( {
      set logOutputPath( outputPath ) { this.garden.configure({ outputPath }) }
    }, configuration )
    this.cache = {
      parentDirectories: {},
      resolvedPaths: {}
    }
  }

  link( host = 80 ) {
    attachServer( mountApp( host, this ), null, this )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  secure( security, host = 443 ) {
    attachServer( mountApp( host, this ), security, this )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  auto( security ) {
    this.link()
    if ( security ) this.secure( security )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  configure( configuration ) {
    Object.assign( this.configuration, configuration )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  subdirectory( directory, inherit, configuration ) {
    if ( typeof directory !== 'string' ) return this.garden.typeerror( 'Argument directory must be a string!')
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

Object.assign( App.prototype, {
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
