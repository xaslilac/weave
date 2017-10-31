// MIT License / Copyright Kayla Washburn 2014
"use strict";

let weave = require( '..' )
let garden = new weave.Garden( 'weave developer/instruments' )

let util = require( 'util' )
let path = require( 'path' )
let repl = require( 'repl' )
let { Readable, Writable } = require( 'stream' )



weave.attachInstruments = function ( app, instrumentsUrl ) {
  if ( !app instanceof weave.App ) {
    if ( typeof app === 'string' && weave.apps[ app ] instanceof weave.App ) {
      app = weave.apps[ app ]
    } else garden.typeerror( 'argument app must be an instance of weave.App or string appName' )
  }

  app.subdirectory( instrumentsUrl, {
      'location': path.join( __dirname, '../http/instruments' ),
      'favoredExtensions': [ '.html' ],
      'mimeTypes': {
        '.html': 'text/html',
        '.css':  'text/css',
        '.js':   'application/javascript'
      }
    })
    .subdirectory( path.join( instrumentsUrl, 'resources' ), {
      'location': path.join( __dirname, '../http/shared' )
    })
    .interface( path.join( instrumentsUrl, 'enabled-instruments' ), exchange => exchange.end("['repl','log']") )




  let socket = new weave.WebSocket( app, path.join( instrumentsUrl, '/socket' ), connection => {
    // let input = new Readable({ read() { return } })
    // let output = new Writable({ write( result ) { connection.send( JSON.stringify({ messageType: 'console-print', data: util.inspect( result ) }) ) } })
    //
    // let $ = repl.start({ prompt: '', input, output })
    //
    // $.context.weave = weave
    // $.context.$ = ( n = 'web' ) => Number.check( n ) ? weave.apps.anonymous[ n ] : weave.apps[ n ]
    // $.context.$$ = ( n, d ) => { let x = $.context.$( n ).configuration; return d ? x[d] : x }

    connection.on( 'message', function ( message ) {
      message.json = JSON.parse( message.data )
      if ( message.json.messageType === 'console-command' ) {
        // TODO: Pipe this to a repl from the native repl module.
        try {
          let result = eval( message.json.data )

          connection.send( JSON.stringify({
            messageType: 'console-print',
            data: util.inspect( result )
          }) )
        } catch ( e ) {
          garden.catch( e )
          connection.send( JSON.stringify({
            messageType: 'console-error',
            error: e.name,
            message: e.message,
            stack: e.stack
          }) )
        }
      }
    })

    // TODO: Implement events in Garden
    // let logPipe = function ( log ) {
    //   connection.send( JSON.stringify({
    //     messageType: 'console-log',
    //     space: log.space,
    //     data: util.inspect( log.data.length > 1 ? log.data : log.data[0] )
    //   }) )
    // }
    //
    // weave.zen.on( 'log', logPipe )
    // connection.on( 'close', function {
    //   weave.zen.events.removeListener( 'log', logPipe )
    // })
  })
}
