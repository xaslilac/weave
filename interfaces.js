"use strict";

let vm = require( 'vm' )
let dom = require( './utilities/dom' )
let weave = require( './weave' )
let garden = new weave.Garden( 'abyss' )

weave.interfaces = {
  engine( content, manifest, exchange ) {
    manifest.type = 'interface'

    return new Promise( ( fulfill, reject ) => {
      vm.runInNewContext( content.toString( 'utf-8' ), {
        dom, garden, console: garden,
        document: dom.createHtmlDocument(),
        weave: handle => {
          if ( typeof handle === 'function' ) handle( exchange, manifest )
          else return { app: exchange.app, exchange, manifest }
        }
      }, { filename: manifest.path, displayErrors: true })
    })
  },

  handle( exchange ) {
    let handle = exchange.configuration[ exchange.method ] || exchange.configuration.any
    if ( typeof handle !== 'function' ) return exchange.generateErrorPage(new weave.HTTPError( 405 ))

    exchange.url.description = path.relative( exchange.directory, exchange.url.pathname )
    let manifest = new weave.Manifest( { url: exchange.url, type: 'interface' } )

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
