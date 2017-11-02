// MIT License / Copyright 2015
"use strict";

let weave = require( '..' )
let garden = weave.createGarden( 'weave.App::router' )

let fs = require( 'fs' )
let path = require( 'path' )

weave.App.prototype.route = function ( exchange ) {
  // Debug inspecting
  garden.debug( this.appName, exchange.url )

  // Get the manifest ready for the printer, and make the printer easy to call.
	let manifest = new weave.Manifest( { url: exchange.url } )
  let print = more => this.printer( undefined, manifest.extend( more ), exchange )

  // Set the initial depth to 0. Depth is used to keep track of
  // how many directories we've moved up from the original url.
  // This is used for directory indexes with finite depth.
  exchange.url.depth = 0

  // Upgrades are only supported via interfaces.
  // TODO: Let's emit an upgrade event here as one last attempt
  // at saving the connection before we destroy it.
  if ( exchange.isUpgrade ) {
    exchange.destroy()
    return exchange.generateErrorPage( new weave.HTTPError( 501, "Cannot Upgrade" ) )
  }

  // If the request type isn't GET, HEAD, or POST, then we don't know how to
  // handle it. But should we really disconnect? Code 405 let's them know that
  // we can't handle the request, instead of just confusing the client as to
  // why they didn't ever recieve anything in return to the request.
  if ( !'GET HEAD POST'.includes( exchange.method ) )
    return exchange.generateErrorPage( new weave.HTTPError( 405, `Only GET, HEAD, and POST methods are supported.` ) )

  let redirect = exchange.behavior( `redirect ${exchange.url.path}`)
  if ( redirect ) return exchange.redirect( redirect )

  // cursor points to where ever we're searching for files.
  let location = exchange.behavior( 'location' )
  if ( typeof location !== 'string' ) return garden.error( `No location set for ${exchange.url.pathname}! Cannot route!` )
  let cursor = path.join( location, unescape( exchange.url.path ) )

  // This function makes depth adjustments, and is called rather than calling
  // search directly if a recursive search is necessary.
  let reroute = function () {
    // If there's room to step back and keep searching for files then we do so.
    if ( !path.relative( '/', exchange.url.path ) )
      return exchange.generateErrorPage( new weave.HTTPError( 404 ) )

    cursor = path.join( cursor, '..' )
    exchange.url.path = path.join( exchange.url.path, '..' )
    exchange.url.description = path.relative( path.join( exchange.directory, exchange.url.path ), exchange.url.pathname )
    exchange.url.depth++
    search()
  }

  let indexes = exchange.behavior( 'indexes' )

  // Define our search function
  const search = () => {
    // Check to see if it exists, and if it's a file or a directory.
    // If it doesn't exist, then step up a directory and try again.
    fs.stat( cursor, function ( error, stats ) {
      if ( error ) {
        // Search for any files with favored extensions.
        // Favored extensions only work on a depth of 0, and if the url ends in
        // a character that would be valid in a filename.
        let extensions = exchange.behavior( 'extensions' )

        if ( exchange.url.depth === 0 && Array.isArray( extensions )
        && exchange.url.pathname.charAt( exchange.url.pathname.length - 1 ).match( /[A-Za-z0-9\-\_]/ ) ) {
          Promise.all( extensions.map( extension => {
            return new Promise( ( next, print ) => {
              fs.stat( cursor + extension, ( error, stats ) => {
                if ( error || !stats.isFile() ) return next()
                print({ path: cursor + extension, stats: stats, type: 'file' })
              })
            })
          }) ).then( reroute ).catch( print )
        } else reroute()
      } else {
        // If it's a file, then we're done, and we just call the printer.
        // If it's a directory, then check for an index, making sure that
        // is has a fitting depth.
        if ( stats.isFile() ) {
          print({ path: cursor, stats: stats, type: "file" })
        } else if ( stats.isDirectory() ) {
          if ( exchange.url.depth === 0 && exchange.behavior( 'urlCleaning' )
          && !exchange.url.pathname.endsWith('/') ) {
            exchange.redirect( exchange.url.pathname + '/' )
          } else if ( indexes ) {
            Promise.all( Object.keys( indexes ).map( index => {
              return new Promise( ( next, print ) => {
                if ( exchange.url.depth <= indexes[ index ] ) {
                  index = path.join( cursor, index )

                  fs.stat( index, function ( error, stats ) {
                    if ( error || !stats.isFile() ) return next()
                    print({ path: index, stats: stats, type: 'file' })
                  })
                } else next()
              })
            }) ).then( () => {
              if ( exchange.url.depth === 0 && exchange.behavior( 'htmlDirectoryListings' ) ) {
                print({ path: cursor, stats: stats, type: 'directory' })
              } else if ( exchange.behavior( 'jsonDirectoryListings' )
              && exchange.url.depth === 1 && exchange.url.description === 'directory.json' ) {
                  print({ path: cursor, stats: stats, type: 'directory' })
              } else {
                exchange.generateErrorPage( new weave.HTTPError( 404, 'The file you requested does not exist.' ) )
              }
            }).catch( print )
          } else {
            print({ path: cursor, stats: stats, type: 'directory' })
          }
        }
      }
    })
  }

  search()
}
