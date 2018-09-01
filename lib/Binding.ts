// MIT License / Copyright 2015

import weave from '..'
// import createScope( 'weave.Binding' ) as garden from 'gardens'
import createScope from 'gardens'
const garden = createScope( 'weave.Binding' )

import http from 'http'
import https from 'https'

weave._bindings = {}

weave.Binding = class Binding {
  constructor( port: number, serverOptions ) {
    if ( typeof port !== 'number' ) return garden.typeerror( 'Not given a port to link to!' ) // TS
    if ( port < 1 || port > 0xFFFF ) return garden.error( `${port} is not a valid port number.` )

    if ( weave._bindings[ port ] ) return weave._bindings[ port ]

    let secure = serverOptions && serverOptions.key && serverOptions.cert

    Object.assign( this, {
      server: ( secure ? https : http ).createServer( serverOptions ),
      port, attachments: [], cachedMatches: {}
    })

    this.server.on( 'listening', () => this._active = true )

    this.server.on( 'error', error => {
      garden.catch( error, 'Unable to bind to port, likely insufficient access.\n'
        + chalk.green( 'Did you remember to ' ) + 'sudo' + chalk.green( '?' ) );
      process.exit( 1 );
    })

    void ['request', 'upgrade'].forEach( event =>
      this.server.on( event, ( ...connection ) => new weave.Exchange( secure, ...connection ) ) )

    weave._bindings[ port ] = this
    this.server.listen( port )
  }
}
