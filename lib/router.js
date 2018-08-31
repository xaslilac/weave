// MIT License / Copyright 2015
'use strict';

let weave = require( '..' )
let garden = require( 'gardens' ).createScope( 'weave.App::router' )

let fs = require( 'fs' )
let path = require( 'path' )


Object.assign( weave.Exchange.prototype, {
  route() {
    // Debug inspecting
    garden.debug( this.app.appName, this.requestUrl )

    // Get the manifest ready for the printer, and make the printer easy to call.
  	let manifest = new weave.Manifest( { url: this.relativeUrl } )

    let print = more => {
      this.app.cache.resolvedPaths[ this.requestUrl.pathname ] = more
      this.printer( undefined, manifest.extend( more ) )
    }

    // Upgrades are only supported via interfaces.
    // TODO: Let's emit an upgrade event here as one last attempt
    // at saving the connection before we destroy it.
    if ( this.isUpgrade ) {
      this.destroy()
      return this.generateErrorPage( new weave.HTTPError( 501, 'Cannot Upgrade' ) )
    }

    // If the request type isn't GET, HEAD, or POST, then we don't know how to
    // handle it. But should we really disconnect? Code 405 let's them know that
    // we can't handle the request, instead of just confusing the client as to
    // why they didn't ever recieve anything in return to the request.
    if ( !'GET HEAD POST'.includes( this.method ) )
      return this.generateErrorPage( new weave.HTTPError( 405, `Only GET, HEAD, and POST methods are supported.` ) )

    // TODO: This code looks bad
    // let redirect = this.behavior( `redirect ${this.url.pathname}`)
    // if ( redirect ) return this.redirect( redirect )

    // cursor points to where ever we're searching for files.
    let location = this.behavior( 'location' )
    if ( typeof location !== 'string' ) return garden.error( `No location set for ${this.relativeUrl.pathname}! Cannot route!` )
    let cursor = path.join( location, unescape( this.relativeUrl.pathname ) )

    if ( this.app.cache.resolvedPaths[ this.relativeUrl.pathname ] ) {
      return print( this.app.cache.resolvedPaths[ this.relativeUrl.pathname ] )
    }

    let indexes = this.behavior( 'indexes' )
    let extensions = this.behavior( 'extensions' )

    // This function makes depth adjustments, and is called rather than calling
    // search directly if a recursive search is necessary.
    const reroute = () => {
      // If there's room to step back and keep searching for files then we do so.
      if ( !path.relative( '/', this.relativeUrl.pathname ) )
        return this.generateErrorPage( new weave.HTTPError( 404 ) )

      cursor = path.join( cursor, '..' )
      this.relativeUrl.pathname = path.join( this.relativeUrl.pathname, '..' )
      this.relativeUrl.description = path.relative( path.join( this.directory, this.relativeUrl.pathname ), this.requestUrl.pathname )
      this.relativeUrl.depth++
      search()
    }

    // Define our search function
    const search = () => {
      // Check to see if it exists, and if it's a file or a directory.
      // If it doesn't exist, then step up a directory and try again.
      fs.stat( cursor, ( error, stats ) => {
        if ( error ) {
          // We didn't find a directory or a file, but maybe if we append some
          // extensions we could land on a file. Favored extensions only work
          // on a depth of 0, and if the url ends in a character that would be
          // valid in a filename.
          if ( this.relativeUrl.depth === 0 && Array.isArray( extensions ) && this.relativeUrl.pathname.match( /[A-Za-z0-9\-\_]$/ ) ) {
            Promise.all( extensions.map( extension => {
              return new Promise( ( missing, print ) => {
                fs.stat( cursor + extension, ( error, stats ) => {
                  if ( error || !stats.isFile() ) return missing()
                  print({ path: cursor + extension, stats: stats, type: 'file' })
                })
              })
            }) ).then( reroute, print )
          } else reroute()
        } else if ( this.relativeUrl.depth === 0 && stats.isFile() ) {
          // If this is the exact url requested and it is a file, serve it.
          print({ path: cursor, stats: stats, type: "file" })
        } else if ( stats.isDirectory() ) {
          if ( this.behavior( 'urlCleaning' ) && this.relativeUrl.depth === 0 && !this.requestUrl.pathname.endsWith('/') ) {
            // Clean the url (maybe).
            this.redirect( this.requestUrl.pathname + '/' )
          } else {
            // We use Promise.all very...backwardly here. It fulfills if we don't find an index
            // or if indexes is not configured, and rejects if we do find an index.
            Promise.all( indexes ? Object.keys( indexes ).map( index => {
              return new Promise( ( missing, print ) => {
                if ( this.relativeUrl.depth <= indexes[ index ] ) {
                  index = path.join( cursor, index )
                  fs.stat( index, function ( error, stats ) {
                    if ( error || !stats.isFile() ) return missing()
                    print({ path: index, stats: stats, type: 'file' })
                  })
                } else missing()
              })
            // If indexes is not configured then we create an Array with a single
            // promise that fulfills so that Promise.all will call our backup logic.
            }) : [ Promise.resolve( true ) ] ).then( () => {
              // No index of suitable depth was found.
              if ( this.relativeUrl.depth === 0 && this.behavior( 'htmlDirectoryListings' ) ) {
                print({ path: cursor, stats: stats, type: 'directory' })
              } else if ( this.behavior( 'jsonDirectoryListings' )
              && this.relativeUrl.depth === 1 && this.relativeUrl.description === 'directory.json' ) {
                  print({ path: cursor, stats: stats, type: 'directory' })
              } else {
                this.generateErrorPage( new weave.HTTPError( 404, 'The resource you requested does not exist.' ) )
              }
            }, print )
          }
        } else this.generateErrorPage( new weave.HTTPError( 404, 'The resource you requested does not exist.' ) )
      })
    }

    search()
  }
})
