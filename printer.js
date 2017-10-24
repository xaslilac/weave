// MIT License / Copyright Tyler Washburn 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.App::printer' )

let fs = require( 'fs' )
let path = require( 'path' )
let util = require( 'util' )
let DOM = require( './utilities/DOM' )

weave.App.prototype.printer = function ( error, details, connection ) {
  // Debug inspecting
  garden.debug( error, details )

  if ( error ) {
    if ( error instanceof weave.HTTPError ) return ( details.isFile() ? printFile : printError )( error, details, connection )
    else {
      printError( new weave.HTTPError( 500 ), details, connection )
      return garden.typeerror( 'Error argument was not a weave.HTTPError!', error )
    }
  }

  if ( !details.path ) {
    connection.generateErrorPage( 500 )
    return garden.error( 'No path given!' )
  }

  // It's either a file, directory, or we are confused (an error)
  if ( details.isFile() )           printFile( error, details, connection )
  else if ( details.isDirectory() ) printDirectory( error, details, connection )
  else                              printError( new weave.HTTPError( 500 ), details, connection )
}

function printError( error, details, connection ) {
  let document = new DOM.HTMLDocument( 'html', `${error.status} ${weave.constants.STATUS_CODES[ error.statusCode ]}` )
  document.body.appendChild( new DOM.Element( 'h1' ) ).innerHTML = `${error.statusCode} ${error.status}`
  if ( error.description ) document.body.appendChild( new DOM.Element( 'p' ) ).innerHTML = error.description

  return connection.status( error.statusCode ).end( document.toString() )
}

function printFile( error, details, connection ) {
  let cacheDate = connection.detail( "if-modified-since" )
  let extname = path.extname( details.path )
  let engine = connection.behavior( `engines ${extname}` )
  // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
  // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
  if ( !error && cacheDate && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( details.stats.mtime.getTime() / 1000 ) )
    return connection.status( 304 ).end()

  weave.cache( details.path, details.stats ).then( ({ content }) => {
    connection.status( error ? error.statusCode : 200 )
      .writeHeader( 'Content-Type', connection.behavior( `mimeTypes ${extname}` ) )

    // Don't cache error pages
    if ( !error ) connection.writeHeader( "Last-Modified", details.stats.mtime.toUTCString() )

    // Check if there is an engine specified for this file format
    if ( typeof engine === 'function' ) {
      engine( content, details, connection )
        .then( output => connection.end( output ) )
        .catch( () => connection.generateErrorPage( 500 ) )
    } else connection.end( content )
  }).catch( () => {
    printError( new weave.HTTPError( 500 ), {}, connection )
  })
}

function printDirectory( error, details, connection ) {
  fs.readdir( details.path, ( derror, files ) => {
    if ( derror ) return connection.generateErrorPage( 500 )

    if ( connection.url.description === 'directory.json' ) {
      connection.writeHeader( 'Content-Type', 'application/json' )
      return connection.end( JSON.stringify( files ) )
    }

    // If it's not JSON, it must be HTML.
    connection.writeHeader( 'Content-Type', 'text/html' )

    // Basic document setup
    let document = new DOM.HTMLDocument( 'html', `Contents of ${connection.url.pathname}` )
    let header = new DOM.Element( 'h1' )
    let list = new DOM.Element( 'ul' )
    header.innerHTML = document.title
    document.body.appendChild( header )
    document.body.appendChild( list )

    // Style stuff
    let style = new DOM.Element( 'style' )
    style.innerHTML = `.directory a { color: #3009c9 }
                       .file a { color: #11a9f4 }`
    document.head.appendChild( style )

    // Don't waste out time with empty directories
    if ( files.length === 0 ) {
      document.body.appendChild( new DOM.Element( 'p' ) ).innerHTML = "Nothing to see here!"
      connection.end( document.toString() )
    }

    Promise.all( files.map( file => {
      return new Promise( ( yes, no ) => {
        fs.stat( path.join( details.path, file ), ( error, stats ) => {
          if ( error ) return no()

          let isDir = stats.isDirectory()
          let name = isDir ? `/${file}/` : `/${file}`

          yes({
            type: isDir ? 'directory' : 'file',
            href: path.join( '/', connection.url.pathname, name ),
            name: name
          })
        } )
      })
    }) ).then( dir => {
      dir.forEach( file => {
        let li = new DOM.Element( 'li' )
        let a = new DOM.Element( 'a' )
        li.className = file.type
        a.href = file.href
        a.innerHTML = file.name
        list.appendChild( li ).appendChild( a )
      })

      connection.end( document.toString() )
    }).catch( () => {
      connection.generateErrorPage( 500 )
    })
  })
}
