// MIT License / Copyright Kayla Washburn 2015

'use strict';

const dom = require( './utilities/dom' )
const dictionaries = require( './utilities/mimedictionary' )
const gardens = require( 'gardens' )

const http = require( 'http' )
const https = require( 'https' )

const weave = module.exports = ( ...x ) => new weave.App( ...x )

Object.assign( weave, {
  version: require( './package.json' ).version,
  createDictionary: dictionaries.createDictionary,

  _bindings: {},

  bind: ( port, serverOptions ) => {
    if ( typeof port !== 'number' ) garden.error( 'Not given a port to link to!' )
    if ( port < 1 || port > 0xFFFF ) return garden.error( `${port} is not a valid port number.` )

    if ( weave._bindings[ port ] ) return weave._bindings[ port ]

    let secure = serverOptions && serverOptions.key && serverOptions.cert

    let binding = {
      server: ( secure ? https : http ).createServer( serverOptions ),
      port, attachments: [], cachedMatches: {}
    }

    binding.server.on( 'listening', () => binding._active = true )

    binding.server.on( 'error', error => {
      garden.catch( error, 'Unable to bind to port, likely insufficient access.\n'
        + chalk.green( 'Did you remember to ' ) + 'sudo' + chalk.green( '?' ) );
      process.exit( 1 );
    })

    void ['request', 'upgrade'].forEach( event =>
      binding.server.on( event, ( ...connection ) => new weave.Exchange( secure, ...connection ) ) )

    weave._bindings[ port ] = binding
    binding.server.listen( port )

    return binding
  }
})

// Import all of our classes and libraries
void function ( ...names ) {
  names.forEach( name => require( `./lib/${name}` ) )
}( 'app', 'exchange', 'printer', 'router' )
