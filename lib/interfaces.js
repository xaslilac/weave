"use strict";

let weave = require( '..' )
let garden = weave.createGarden( 'weave interfaces' )

let dom = require( '../utilities/dom' )
let path = require( 'path' )
let vm = require( 'vm' )

module.exports = ( content, manifest, exchange ) {
    manifest.type = 'interface'

    return new Promise( ( fulfill, reject ) => {
      let script = content.toString( 'utf-8' )
      let split = /\<\!DOCTYPE|\<html/i.exec( script )
      let garden = weave.createGarden( `weave.Engine(${exchange.url.pathname})` )
      let document = dom.createHtmlDocument()

      vm.runInNewContext( script, {
        // XXX: Enabling require this way seems unsafe, see if there is a better way
        document, garden, console: garden, require: require,
        setTimeout, clearTimeout, setInterval, clearInterval,
        __dirname: path.dirname( manifest.path ), __filename: path.basename( manifest.path ),
        weave: handle => {
          if ( typeof handle === 'function' ) handle( exchange, manifest )
          else return { exchange, manifest }
        }
      }, { filename: manifest.path, displayErrors: true })
    })
  }
}
