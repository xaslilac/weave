// MIT License / Copyright 2015

let weave = require( '..' )
let garden = weave.createGarden( 'weave instruments' )

let path = require( 'path' )

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
}

weave.App.prototype.profile = function () {

}

process.nextTick( () => {
  let app = weave.apps.anonymous[ 0 ]
  app.attachInstruments( '/instruments' )
})
