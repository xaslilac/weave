// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave.bind' )

const chalk = require( 'chalk' )
const http = require( 'http' )
const https = require( 'https' )

weave._bindings = {}

class Binding {
  constructor( port, serverOptions ) {
    if ( !port ) throw garden.error( 'Not given a port to link to!' )
    if ( typeof port !== 'number' ) throw garden.typeerror( 'Argument port must be a number!' )
    if ( port < 1 || port > 0xFFFF ) throw garden.error( `${port} is not a valid port number.` )

    // If a binding for this port already exists,
    if ( weave._bindings[ port ] ) throw garden.error( 'Port already has a binding!' )

    let secure = serverOptions && serverOptions.key && serverOptions.cert

    Object.assign( this, {
      server: ( secure ? https : http ).createServer( serverOptions ),
      port, attachments: [], cachedMatches: {}
    })

    this.server.on( 'error', error => {
      throw garden.catch( error, 'Unable to bind to port, likely insufficient access.\n'
        + `${chalk.green( 'Did you remember to ' )} sudo${chalk.green( '?' )}` )
    })

    // Begin listening for requests
    void [ 'request', 'upgrade' ].forEach( event =>
      this.server.on( event, ( ...connection ) => new weave.Exchange( secure, ...connection ) ) )

    // Export binding, and listen to server
    weave._bindings[ port ] = this
    this.server.listen( port )
  }
}

weave.Binding = Binding
