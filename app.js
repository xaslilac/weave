// MIT License / Copyright 2015
// weave.App is weaves main entry point, and it's file format should be used as
// a template for all other .js source files.
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.App' )

let events = require( 'events' )
let http = require( 'http' )
let path = require( 'path' )
let Wildcard = require( './utilities/Wildcard' )

weave.App = class App extends events.EventEmitter {
  constructor( appName ) {
    // Make it an EventEmitter
    super()

    if ( appName ) {
      if ( weave.apps[ appName ] ) return garden.error( `App names must be unique! App '${appName}' already exists!` )
      this.appName = appName
      weave.apps[ appName ] = this
    } else weave.apps.anonymous.push( this )

    this.configuration = {}
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
      else if ( typeof host !== 'string' ) return garden.error( "Host much be a string, or a port number." )

      // If the host is already taken, abandon ship.
      if ( weave.hosts[ host ] ) return garden.error( `Host ${host} already used by ${weave.hosts[host].appName}.` )

      // Check to make sure it is a valid host, with a valid port. (Inside the range 0x1-0xFFFF)
      let split = host.match( /^(.+?)(\:([0-9]{1,5}))$/ )
      if ( !split ) return garden.error( `Invalid host: ${host}` )

      let port = Number.parseInt( split[3] )
      if ( port < 1 || port > 0xFFFF ) return garden.error( `${port} is not a valid port number.` )

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
    // Clear the cache so that the configuration can be modified and
    // not conflict with previously caches requests.
    this.cache.parentDirectories = {}

    // Keep things consistent on Windows with other platforms
    directory = directory.replace( /\\/g, '/' )

    if ( !path.isAbsolute( directory ) ) return garden.error( "Directories must be absolute!" )

    // If we only have two arguments then inherit is actually going to be the
    // configuration. If we have three arguments, then we set the inheritance.
    // Connection::bahavior will load inheritance from @configuration._super,
    // followed by app.configuration, followed by weave.configuration.
    configuration
      ? configuration._super = String.is( inherit )
        ? this.configuration[ inherit ]
        : inherit
      : configuration = inherit

    configuration.type = 'directory'

    if ( this.configuration[ directory ] ) Object.assign( this.configuration[ directory ], configuration )
    else this.configuration[ directory ] = configuration

    // The main reason this event is important is for 3rd party modules
    // that might alter the configuration, or that need to clear caches
    // for anything that is based off of a configurable property.
    this.emit( 'configured', directory, configuration, this.configuration )

    // Return this from all configuration methods so they can be chained.
    return this
  }

  setBehavior( name, value ) {
    if ( typeof name !== 'string' ) return garden.error( `Behavior name '${name}' is not a string!` )
    let nests = name.split(' ')
    let prop = nests.pop()
    let cursor = this.configuration

    nests.forEach( nest => {
      if ( typeof cursor[ nest ] !== 'object' ) cursor[ nest ] = {}
    } )

    cursor[ prop ] = value

    return this
  }

  interface( directory, handle ) {
    // XXX: Should there be a wrapper between the interface
    // and the configuration? Probably an object that also
    // contains details about what HTTP standards the interface
    // supports, like Upgrades, Cookies, etc.
    this.configuration[ directory.replace( /\\/g, '/' ) ] = {
      type: 'interface',
      interface: handle
    }

    // Return this from all configuration methods so they can be chained.
    return this
  }
}
