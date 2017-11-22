"use strict";

let weave = require( '..' )
let garden = weave.createGarden( 'weave interfaces' )

let dom = require( '../utilities/dom' )
let path = require( 'path' )
let vm = require( 'vm' )

weave.interfaces = {
  engine( content, manifest, exchange ) {
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
  },

  handle( exchange ) {
    let handle = exchange.configuration[ exchange.method ] || exchange.configuration.any
    if ( typeof handle !== 'function' ) return exchange.generateErrorPage(new weave.HTTPError( 405 ))

    exchange.url.description = exchange.url.pathname
    let manifest = new weave.Manifest( { url: exchange.url, type: 'interface' } )

    exchange.app.emit( 'interface exchange', exchange )

    try {
      Promise.resolve( handle( exchange, manifest ) )
        .catch( conf => {
          if ( conf instanceof Error ) {
            garden.error( conf )
            return exchange.generateErrorPage(new weave.HTTPError( 500, conf ))
          }

          exchange.configuration = conf
          exchange.app.emit( 'exchange', exchange )
          exchange.app.route( exchange )
        })
    } catch ( error ) {
      garden.error( error )
      exchange.generateErrorPage(new weave.HTTPError( 500, error ))
    }
  }
}
