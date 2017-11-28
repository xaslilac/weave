// MIT License / Copyright 2015
'use strict';

let weave = require( '..' )
let garden = weave.createGarden( 'weave.App::printer' )

let fs = require( 'fs' )
let path = require( 'path' )
let util = require( 'util' )

let dom = require( '../utilities/DOM' )

weave.App.prototype.printer = function ( error, manifest, exchange ) {
  // Debug inspecting
  garden.debug( error, manifest )

  // Check if we are printing an error
  if ( error ) {
    if ( error instanceof weave.HTTPError ) return ( manifest.isFile() ? printFile : printError )( error, manifest, exchange )

    printError( new weave.HTTPError( 500 ), manifest, exchange )
    return garden.typeerror( 'Error argument was not a weave.HTTPError!', error )
  }

  // Ensure we have a path to print
  if ( !manifest.path ) {
    exchange.generateErrorPage( 500 )
    return garden.error( 'No path given!', manifest )
  }

  // It's either a file, directory, or we are confused (an error)
  if      ( manifest.isFile() )      printFile( error, manifest, exchange )
  else if ( manifest.isDirectory() ) printDirectory( error, manifest, exchange )
  else                               printError( new weave.HTTPError( 500 ), manifest, exchange )
}

function printError( error, manifest, exchange ) {
  let document = weave.createPageFromTemplate( `${error.statusCode} ${error.status}` )

  let description = document.body.appendChild( document.createElement( 'h1' ) )
  let status = document.body.appendChild( document.createElement( 'h2' ) )
  status.innerHTML = `${error.statusCode} ${error.status}`

  if ( typeof error.description === 'string' ) {
    description.innerHTML = error.description
  } else {
    description.innerHTML = `Something went wrong..`
  }

  if ( typeof error.stack === 'string' ) {
    let stack = document.body.appendChild( document.createElement( 'pre' ) )
    stack.children = error.stack.split( '\n' ).map( line => {
      return new dom.TextNode( line.replace( /\s/g, '&nbsp;' ).replace( weave.constants.HOME, '~' ) + '<br />' )
    })
  }

  let report = document.body.appendChild( document.createElement( 'a' ) )
  report.innerHTML = 'Report an issue'
  report.href = 'https://github.com/partheseas/weave/issues'

  return exchange.status( error.statusCode ).end( document.toString() )
}

function printFile( error, manifest, exchange ) {
  let cacheDate = exchange.detail( "if-modified-since" )
  let extname = path.extname( manifest.path )
  let engine = exchange.behavior( `engines ${extname}` )
  // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
  // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
  if ( !error && cacheDate && !engine && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( manifest.stats.mtime.getTime() / 1000 ) )
    return exchange.redirect( 304 )

  weave.cache( manifest.path, manifest.stats ).then( ({ content }) => {
    // Check if there is an engine specified for this file format
    if ( typeof engine === 'function' ) {
      try {
        Promise.resolve( engine( content, manifest, exchange ) )
          .then( output => printFileHead( error, manifest, exchange ).end( output ) )
          .catch( error => exchange.generateErrorPage(new weave.HTTPError( 500, error )) )
      } catch ( error ) {
        exchange.generateErrorPage(new weave.HTTPError( 500, error ))
      }
      return
    }

    printFileHead( error, manifest, exchange ).end( content )
  }).catch( () => {
    printError( new weave.HTTPError( 500 ), {}, exchange )
  })
}

function printFileHead( error, manifest, exchange ) {
  let extname = path.extname( manifest.path )
  exchange.status( error ? error.statusCode : 200 )
    .header( 'Content-Type', exchange.behavior( `mimeTypes ${extname}` ) )
  // Don't cache error pages
  if ( !error ) exchange.header( "Last-Modified", manifest.stats.mtime.toUTCString() )
  return exchange
}

function printDirectory( error, manifest, exchange ) {
  fs.readdir( manifest.path, ( derror, files ) => {
    if ( derror ) return exchange.generateErrorPage( 500 )

    if ( exchange.url.description === 'directory.json' ) {
      exchange.header( 'Content-Type', 'application/json' )
      return exchange.end( JSON.stringify( files ) )
    }

    // If it's not JSON, it must be HTML.
    exchange.header( 'Content-Type', 'text/html' )

    // Basic document setup
    let document = weave.createPageFromTemplate( `Contents of ${exchange.url.original}` )

    let header = document.body.appendChild( document.createElement( 'h1' ) )
    header.innerHTML = document.title

    if ( exchange.url.original !== '/' ) {
      let stepUp = document.body.appendChild( document.createElement( 'a' ) )
      stepUp.href = '../'
      stepUp.innerHTML = 'Up we go!!!'
    }

    // Don't waste our time running promises with empty directories
    if ( files.length === 0 ) {
      document.body.appendChild( document.createElement( 'p' ) ).innerHTML = "Nothing to see here!"
      return exchange.end( document.toString() )
    }

    let list = document.body.appendChild( document.createElement( 'ul' ) )

    Promise.all( files.map( file => {
      return new Promise( ( yes, no ) => {
        fs.stat( path.join( manifest.path, file ), ( error, stats ) => {
          if ( error ) return no()

          let isDir = stats.isDirectory()
          let name = isDir ? `/${file}/` : `/${file}`

          yes({
            type: isDir ? 'directory' : 'file',
            href: path.join( '/', exchange.url.original, name ),
            name: name
          })
        } )
      })
    }) ).then( dir => {
      dir.forEach( file => {
        let li = document.createElement( 'li' )
        let a = document.createElement( 'a' )
        li.className = file.type
        a.href = file.href
        a.innerHTML = file.name
        list.appendChild( li ).appendChild( a )
      })

      exchange.end( document.toString() )
    }).catch( () => {
      exchange.generateErrorPage( 500 )
    })
  })
}