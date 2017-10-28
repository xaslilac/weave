let assert = require( 'assert' )
let weave = require(  '../' )

context( 'weave', function () {
  describe( 'constructing a new app', function () {
    it( 'should return an instance of weave.App', function () {
      assert( weave() instanceof weave.App )
    })

    it( 'should allow naming of apps', function () {
      assert( weave( 'tester' ).appName === 'tester' )
      assert( new weave.App( 'tester2' ).appName === 'tester2' )
    })

    it( 'should allow configuring of apps', function () {
      assert( weave({ 'location': 'behavior' }).configuration.location === 'behavior' )
    })
  })
})
