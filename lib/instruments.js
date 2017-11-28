// MIT License / Copyright 2015

let weave = require( '..' )
let garden = weave.createGarden( 'weave instruments' )

let path = require( 'path' )
let util = require( 'util' )

weave.App.prototype.attachInstruments = function ( instrumentsUrl ) {
  this.subdirectory( instrumentsUrl, {
      'location': path.join( __dirname, '../http/instruments' ),
      'indexes': { 'index.interface': 0 },
      // 'extensions': [ '.interface', '.html' ],
      'mimeTypes': weave.createDictionary( path.join( __dirname, '../http/shared/basics.mimes' ) ),
      'engines': { '.interface': weave.interfaces.engine }
    })
    .subdirectory( path.join( instrumentsUrl, 'resources' ), {
      'location': path.join( __dirname, '../http/shared' )
    })

    let socket = new weave.WebSocket( connection => {

      connection.on( 'message', function ( raw ) {
        let message = JSON.parse( raw.data )

        if ( message.messageType === 'console-command' ) {
          // TODO: Pipe this to a repl from the native repl module.
          try {
            let result = eval( message.data )

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
    }).attach( this, path.join( instrumentsUrl, '/socket' ) )
}

weave.App.prototype.profile = function () {

}

process.nextTick( () => {
  let app = weave.apps.anonymous[ 0 ]
  app.attachInstruments( '/instruments' )
})