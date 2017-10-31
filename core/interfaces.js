"use strict";

let weave = require( '..' )
let garden = new weave.Garden( 'abyss' )

let dom = require( '../utilities/dom' )
let path = require( 'path' )
let vm = require( 'vm' )

weave.interfaces = {
  engine( content, manifest, exchange ) {
    manifest.type = 'interface'

    return new Promise( ( fulfill, reject ) => {
      let script = content.toString( 'utf-8' )
      let split = /\<\!DOCTYPE|\<html/i.exec( script )
      let html, document;

      if ( split ) {
        html = script.substr( split.index )
        script = script.substr( 0, split.index )
        document = dom.parseHtml( html )
      } else {
        document = dom.createHtmlDocument()
      }

      vm.runInNewContext( script, {
        document, garden, console: garden,
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

    exchange.url.description = path.relative( exchange.directory, exchange.url.pathname )
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
