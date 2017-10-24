// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.App' )

let events = require( 'events' )
let http = require( 'http' )
let path = require( 'path' )
let Wildcard = require( './utilities/Wildcard' )

weave.App = class App extends events.EventEmitter {
  constructor( appName, configuration ) {
    // Make it an EventEmitter
    super()

    if ( typeof appName === 'string' ) {
      if ( weave.apps[ appName ] ) return garden.error( `App names must be unique! App '${appName}' already exists!` )
      this.appName = appName
      weave.apps[ appName ] = this
    } else {
      weave.apps.anonymous.push( this )
      configuration = appName
    }

    this.configuration = configuration || {}
    this.cache = {
      parentDirectories: {},
      resolvedPaths: {}
    }
  }

  link( ...hosts ) {
    hosts.forEach( host => {
      // If host is a port number, it will handle the entire port.
      // If it is not a port number or a string, it is invalid.
      if ( typeof host === 'number' ) host = `*:${host}`
      else if ( typeof host !== 'string' ) return garden.typeerror( "Host much be a string, or a port number." )

      // If the host is already taken, abandon ship.
      if ( weave.hosts[ host ] ) return garden.error( `Host ${host} already used by ${weave.hosts[host].appName}.` )

      // Check to make sure it is a valid host, with a valid port. (Inside the range 0x1-0xFFFF)
      let [ split, hostname, port ] = host.match( /^(.+?\:)?([0-9]{1,5})$/ )
      if ( !split ) return garden.error( `Invalid host: ${host}` )
      if ( port < 1 || port > 0xFFFF ) return garden.error( `${port} is not a valid port number.` )
      if ( !hostname ) host = `*:${port}`

      // If the host is a wildcard then clear all wildcardMatches that match
      // it. If it's a literal, clear wildcardMatches for that literal.
      if ( /\*/.test( host ) ) {
        let wildcard = new Wildcard( host )
        Object.keys( weave.cache.wildcardMatches ).forEach( cachedhost => {
          if ( weave.cache.wildcardMatches.hasOwnProperty( cachedhost ) )
            if ( wildcard.match( weave.cache.wildcardMatches[ cachedhost ] ) )
              weave.cache.wildcardMatches[ cachedhost ] = false })
      } else if ( weave.cache.wildcardMatches[ host ] )
        weave.cache.wildcardMatches[ host ] = false

      // Link the app to it's hostname
      weave.hosts[ host ] = this

      // If there isn't a server on this port yet, then create one. Assign it
      // to listen on all interfaces ('::') for IPv4 and IPv6.
      // TODO: Maybe we should make this configurable?
      if ( weave.servers[ port ] ) {
        return this.emit( 'listening' )
      }

      let server = weave.servers[ port ] = http.createServer();
      // Accept incoming requests on the server
      ['request', 'upgrade'].forEach(e => server.on( e, (i, o) => new weave.Connection( i, o ) ))
      // Used to determine if any servers are active yet when an error is encountered.
      server.on( 'listening', () => { weave._ACTIVE = true; this.emit( 'listening' ) } )
      server.listen( port, '::' )
    })

    // Return this from all configuration methods so they can be chained.
    return this
  }

  configure( configuration ) {
    Object.assign( this.configuration, configuration )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  subdirectory( directory, inherit, configuration ) {
    if ( typeof directory !== 'string' ) return garden.typeerror( 'Argument directory must be a string!')
    if ( !path.isAbsolute( directory ) ) return garden.error( 'Argument directory must be absolute!' )
    if ( directory.length < 2 ) return garden.error( 'Argument directory cannot be root!')
    // Clear the cache so that the configuration can be modified and
    // not conflict with previously caches requests.
    this.cache.parentDirectories = {}

    // Keep things consistent on Windows with other platforms
    directory = directory.replace( /\\/g, '/' )

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

    // The main reason this event is important is for 3rd party modules
    // that might alter the configuration, or that need to clear caches
    // for anything that is based off of a configurable property.
    // XXX: Is this event even useful?
    this.emit( 'configured', directory, configuration, this.configuration )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  setBehavior( name, value ) {
    if ( typeof name !== 'string' ) return garden.typeerror( `Behavior name '${name}' is not a string!` )
    let nests = name.split(' ')
    let prop = nests.pop()
    let cursor = this.configuration

    nests.forEach( nest => {
      if ( typeof cursor[ nest ] !== 'object' ) cursor[ nest ] = {}
    } )

    cursor[ prop ] = value

    return this
  }

  interface( path, handle, methods = ['any'] ) {
    // Keep things consistent on Windows with other platforms
    path = path.replace( /\\/g, '/' )

    // If there is already an interface at this path, we might be able to
    // attach to a different request method. If not, create a new wrapper.
    if ( !this.configuration[ path ] ) this.configuration[ path ] = { type: 'interface' }
    let wrap = this.configuration[ path ]

    if ( typeof methods === 'string' ) methods = [ methods ]
    else if ( !Array.isArray( methods ) ) garden.typeerror( 'Interface method must be a string or an array of strings' )

    methods.forEach( method => {
      if wrap[ method ] return garden.error( `Interface ${method}: ${path} already exists!` )
      wrap[ method ] = handle
    })

    // Return this from all configuration methods so they can be chained.
    return this
  }

  engine( extension, engine ) {
    if ( this.configuration.engines ) this.configuration.engines[ extension ] = engine
    else this.configuration.engines = { [ extension ]: engine }

    // Return this from all configuration methods so they can be chained.
    return this
  }

  redirect( from, to ) {
    if ( this.configuration.redirect ) this.configuration.redirect[ from ] = to
    else this.configuration.redirect = { [ from ]: to }
  }

  header( name, value ) {
    // XXX: Should we incorporate template string tags into this some how?
    if ( this.configuration.headers ) this.configuration.headers[ name ] = value
    else this.configuration.headers = { [ name ]: value }
  }
}
