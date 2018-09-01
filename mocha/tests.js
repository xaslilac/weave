let weave = require(  '..' )

let assert = require( 'assert' ) // ???

let garden = require( 'gardens' ).createScope( 'mocha' )

context( 'weave', function () {
  let weaveApp

  describe( 'constructing a new app', function () {
    it( 'should return an instance of weave.App', function () {
      assert( weaveApp instanceof weave.App )
    })
  })
})
