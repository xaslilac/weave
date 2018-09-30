// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave.bind' )

const chalk = require( 'chalk' )
const http = require( 'http' )
const https = require( 'https' )
const Spirit = require( 'string-spirits' )

weave._bindings = {}

weave.Binding = class Binding {
  constructor( port, serverOptions ) {
    if ( typeof port !== 'number' ) garden.error( 'Not given a port to link to!' )
    if ( port < 1 || port > 0xFFFF ) return garden.error( `${port} is not a valid port number.` )

    if ( weave._bindings[ port ] ) return weave._bindings[ port ]

    let secure = serverOptions && serverOptions.key && serverOptions.cert

    Object.assign( this, {
      server: ( secure ? https : http ).createServer( serverOptions ),
      port, attachments: [], cachedMatches: {}
    })

    this.server.on( 'listening', () => this._active = true )

    this.server.on( 'error', error => {
      throw garden.catch( error, 'Unable to bind to port, likely insufficient access.\n'
        + `${chalk.green( 'Did you remember to ' )} sudo${chalk.green( '?' )}` )
    })

    void [ 'request', 'upgrade' ].forEach( event =>
      this.server.on( event, ( ...connection ) => new weave.Exchange( secure, ...connection ) ) )

    weave._bindings[ port ] = this
    this.server.listen( port )
  }

  linkToExchange( exchange ) {
    // Check for a direct host match, or a cached wildcard match.
    // If there isn't one, check against wildcards, filtering out hosts
    // that don't contain at least one wildcard since they won't match.
    if ( this.attachments[ exchange.requestUrl.hostname ] ) {
      exchange.app = this.attachments[ exchange.requestUrl.hostname ]
    } else if ( this.cachedMatches[ exchange.requestUrl.hostname ] ) {
      exchange.app = this.cachedMatches[ exchange.requestUrl.hostname ]
    } else {
      // Check the requested host against all linked hostnames that have a wildcard
      let hostnameSpirit = Spirit.bestMatch(
        Object.keys( this.attachments ).filter( hostname => /\*|\?/.test( hostname ) ), exchange.requestUrl.hostname
      )

      // If there isn't a linked app then just end the connection.
      if ( !hostnameSpirit ) {
        // XXX: Should we really do this silently? Or should we report?
        return exchange.generateErrorPage( new weave.HttpError( 503, 'This app is not currently active.' ) )
      }

      // Remember which wildcard best matched this host for next time
      exchange.app = this.cachedMatches[ exchange.requestUrl.hostname ] = this.attachments[ hostnameSpirit.toString() ]
    }
  }
}
