let weave = require(  '..' )

let assert = require( 'assert' )
let http = require( 'http' )
let path = require( 'path' )
let { URL } = require( 'url' )

function test( testPath, method, headers ) {
  let options = Object.assign( new URL( testPath, 'http://localhost:8378/' ), {
    method, headers
  })

  return new Promise( ( fulfill, reject ) => {
    http.request( options, ( error, reponse ) => {
      if ( error ) return reject( error )
      let total = ''
      response.setEncoding( 'utf-8' )
      response.on( 'data', data => total += data )
      response.on( 'end', () => fulfill( total ) )
    }).end()
  })
}

function lf( localFilePath ) {
  return path.join( __dirname, localFilePath )
}

let garden = weave.createGarden( 'weave tests' )
weave.configuration.logOutputPath = lf( 'tests.log' )
// weave.verbose()

context( 'weave', function () {
  let httpRoot, weaveApp, newApp, anonymous, conf

  before( function () {
    httpRoot = lf( '../http/mocha' )

    conf = {
      'location': httpRoot,
      'mimeTypes': weave.createDictionary( lf( 'mocha.mimes' ) ),
      'errorPages': {
        404: 'test.d'
      },
      'indexes': {
        'test.a': 0,
        'test.b': 1,
        'test.c': 2
      }
    }

    weaveApp = weave( 'test', conf )
    newApp = new weave.App({ appName: 'test2' })
    anonymous = weave()

    weaveApp.link( 'localhost:8378' )
  })

  describe( 'constructing a new app', function () {
    it( 'should return an instance of weave.App', function () {
      assert( weaveApp instanceof weave.App )
    })

    it( 'should properly name the app', function () {
      assert( weaveApp.appName === 'test' )
      assert( newApp.appName === 'test2' )
      assert( anonymous.appName === undefined )
    })

    it( 'should properly configure apps', function () {
      assert( weaveApp.configuration.location === httpRoot )
    })
  })

  // describe( 'resolve index depths', function () {
  //   [ 'Test A', 'Test B', 'Test C', 'Test D' ].forEach( ( name, depth ) => {
  //     it( `should resolve to the correct index based on depth ${depth}`, function ( done ) {
  //       test( '/depth'.repeat( depth ) )
  //         .then( text => garden.log( text ) )
  //         .then( () => done() )
  //     })
  //   })
  // })
})



context( 'dictionary', function () {

})

context( 'gardens', function () {

})
