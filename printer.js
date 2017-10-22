// MIT License / Copyright Tyler Washburn 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.App::printer' )

let fs = require( 'fs' )
let path = require( 'path' )
let util = require( 'util' )
let DOM = require( './utilities/DOM' )

weave.App.prototype.printer = function ( error, details, connection ) {
  garden.debug( error, details )
  if ( error ) {
    if ( weave.HTTPError.is( error ) ) {
      return ( details.isFile() ? printFile : printError )( error, details, connection )
    } else {
      // ::generateErrorPage will call us recursively with the correct arguments.
      printError( new weave.HTTPError( 500 ), details, connection )
      return garden.error( 'Error argument was not a weave.HTTPError or undefined!', error )
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
  // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
  // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
  if ( !error && cacheDate && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( details.stats.mtime.getTime() / 1000 ) )
    return connection.status( 304 ).end()

  fs.readFile( details.path, ( ferror, contents ) => {
    if ( ferror ) return connection.app.printer( new weave.HTTPError( 500 ), {}, connection )

    // We may be printing an error page from generateErrorPage
    connection.status( error ? error.statusCode : 200 )
      .writeHeader( "Content-Type", connection.behavior( `mimeTypes ${path.extname( details.path )}` ) )

    // garden.log( connection.behavior( `mimeTypes ${path.extname( details.path )}` ) )

    // You can't cache an error!
    if ( !error ) connection.writeHeader( "Last-Modified", details.stats.mtime.toUTCString() )

    connection.end( contents )
  })
}

function printDirectory( error, details, connection ) {
  fs.readdir( details.path, ( error, files ) => {
    if ( error ) { return connection.generateErrorPage( 500 ) }

    if ( connection.url.description === 'directory.json' ) {
      connection.status( 200 )
      connection.writeHeader( "Content-Type", "application/json" )
      return connection.end( JSON.stringify( files ) )
    }

    // If it's not JSON, it must be HTML.
    connection.writeHeader( "Content-Type", "text/html" )

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
