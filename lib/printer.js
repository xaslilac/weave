// MIT License / Copyright 2015
"use strict";

let weave = require( '..' )
let garden = require( 'gardens' ).createScope( 'weave:printer' )

let fs = require( 'fs' )
let path = require( 'path' )
let util = require( 'util' )

const { createPageFromTemplate } = require( './template' )

module.exports = function printer( error, manifest ) {
  // Check if we are printing an error
  if ( error ) {
    if ( error instanceof weave.HTTPError ) return ( manifest.isFile() ? printFile : printError )( error, manifest, this )

    printError( new weave.HTTPError( 500 ), manifest, this )
    return garden.typeerror( 'Error argument was not a weave.HTTPError!', error )
  }

  // Ensure we have a path to print
  if ( !manifest.path ) {
    exchange.generateErrorPage( 500 )
    return garden.error( 'No path given!', manifest )
  }

  // It's either a file, directory, or we are confused (an error)
  if      ( manifest.isFile() )      printFile( error, manifest, this )
  else if ( manifest.isDirectory() ) printDirectory( error, manifest, this )
  else                               printError( new weave.HTTPError( 500 ), manifest, this )
}

function printError( error, manifest, exchange ) {
  let document = createPageFromTemplate( `${error.statusCode} ${error.status}` )

  let description = document.body.appendChild( document.createElement( 'h1' ) )
  let content = document.body.appendChild( document.createElement( 'section' ) )
  let status = content.appendChild( document.createElement( 'h2' ) )
  status.innerHTML = `${error.statusCode} ${error.status}`

  if ( typeof error.description === 'string' ) {
    description.innerHTML = error.description
  } else {
    description.innerHTML = `Something went wrong..`
  }

  if ( typeof error.stack === 'string' ) {
    let stack = content.appendChild( document.createElement( 'pre' ) )
    stack.children = error.stack.split( '\n' ).map( line => {
      return new dom.TextNode( line.replace( /\s/g, '&nbsp;' ).replace( weave.constants.HOME, '~' ) + '<br />' )
    })
  }

  let report = content.appendChild( document.createElement( 'p' ) )
  report.innerHTML = 'Think this is an issue with Weave?'

  let reportLink = report.appendChild( document.createElement( 'a' ) )
  reportLink.innerHTML = 'Report it on GitHub'
  reportLink.href = 'https://github.com/weave-js/weave/issues'

  return exchange.status( error.statusCode ).end( document.toString() )
}



function retrieveFile( path, stats ) {
  if ( typeof path !== 'string' ) return garden.typeerror( 'path argument must be a string!' )
  if ( !stats instanceof fs.Stats ) return garden.typeerror( 'stats argument must be a Stats object!' )

  return new Promise( ( fulfill, reject ) => {
    fs.readFile( path, ( error, content ) => {
      if ( error ) return reject( error )

      let file = { path, stats, content, size: Buffer.byteLength( content ) }

      fulfill( file )
    })
  })
}

function printFile( error, manifest, exchange ) {
  let cacheDate = exchange.detail( "if-modified-since" )
  let extname = path.extname( manifest.path )
  let engine = exchange.behavior( `engines ${extname}` )
  // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
  // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
  if ( !error && cacheDate && !engine && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( manifest.stats.mtime.getTime() / 1000 ) )
    return exchange.redirect( 304 )

  retrieveFile( manifest.path, manifest.stats ).then( ({ content }) => {
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

    // See if the client is requesting a JSON object of the directory.
    if ( exchange.relativeUrl.description === 'directory.json' ) {
      exchange.header( 'Content-Type', 'application/json' )
      return exchange.end( JSON.stringify( files ) )
    }

    // If it's not JSON, it must be HTML.
    exchange.header( 'Content-Type', 'text/html' )

    // Basic document setup
    let document = createPageFromTemplate( `Contents of ${exchange.requestUrl.pathname}` )

    let banner = document.body.appendChild( document.createElement( 'h1' ) )
    banner.id = 'banner', banner.innerHTML = document.title

    let content = document.body.appendChild( document.createElement( 'section' ) )
    content.id = 'content'

    if ( exchange.requestUrl.pathname !== '/' ) {
      let stepUp = content.appendChild( document.createElement( 'a' ) )
      stepUp.href = '../'
      stepUp.innerHTML = 'Go back up'
    }

    // Don't waste our time running promises with empty directories
    if ( files.length === 0 ) {
      document.body.appendChild( document.createElement( 'p' ) ).innerHTML = "Nothing to see here!"
      return exchange.end( document.toString() )
    }

    let list = content.appendChild( document.createElement( 'ul' ) )
    let directoryList = list.appendChild( document.createElement( 'span' ) )
    let fileList = list.appendChild( document.createElement( 'span' ) )

    directoryList.id = 'directories'
    fileList.id = 'files'

    Promise.all( files.map( file => {
      return new Promise( ( fulfill, reject ) => {
        fs.stat( path.join( manifest.path, file ), ( error, stats ) => {
          if ( error ) return reject()

          let isDir = stats.isDirectory()
          let name = isDir ? `/${file}/` : `/${file}`

          fulfill({
            type: isDir ? 'directory' : 'file',
            href: path.join( '/', exchange.requestUrl.pathname, name ),
            name: name
          })
        } )
      })
    }) ).then( listing => {
      listing.forEach( file => {
        let target = file.type === 'directory' ? directoryList : fileList
        let li = document.createElement( 'li' )
        let a = document.createElement( 'a' )
        a.href = file.href
        a.innerHTML = file.name

        target.appendChild( li ).appendChild( a )
      })

      exchange.end( document.toString() )
    }).catch( error => {
      exchange.generateErrorPage( new weave.HTTPError( 500, error ) )
    })
  })
}
