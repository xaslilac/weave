// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
weave := require( './weave' )
garden := new weave.Garden( 'weave.App::printer' )

const n = new Buffer('\r\n')
const z = new Buffer('0\r\n\r\n')



module 'fs', 'path', 'util';
DOM := require( './utilities/DOM' )

// Might be handy later
// @end(  )

weave.App::printer = function error, details, connection {
  if error {
    if weave.HTTPError.is( error ) {
      return ( details.isFile() ? printFile : printError )( error, details, connection )
    } else {
      // ::generateErrorPage will call us recursively with the correct arguments.
      printError( new weave.HTTPError( 500 ), details, connection )
      return garden.error( 'Error argument was not a weave.HTTPError or undefined!', error )
    }
  }

  if !details.path {
    connection.generateErrorPage( 500 )
    return garden.error( 'No path given!' )
  }

  //if weave.verbose { garden.log( "{{connection.host}} {{connection.url.pathname}}\n{{connection.UUID}} {{connection.app.appName}} {{connection.directory}}\nDetails {{JSON.stringify(details)}}\n\n" ) }

  if details.isFile() {
    printFile( error, details, connection )
  } else if details.isDirectory() {
    printDirectory( error, details, connection )
  } else {
    // It wasn't a file or a directory and we are confused.
    printError( new weave.HTTPError( 500 ), details, connection )
  }
}

printError := function ( error, details, connection ) {
  document = new DOM.HTMLDocument( 'html', '{{error.status}} {{weave.constants.STATUS_CODES[ error.status ]}}' )
  document.body.appendChild( new DOM.Element( 'h1' ) ).innerHTML = '{{error.status}} {{error.statusCode}}'
  if error.description {
    document.body.appendChild( new DOM.Element( 'p' ) ).innerHTML = error.description
  }
  // Generate an error page programatically.
  return connection.status( error.status ).end( document.toString() )
}

printFile := function ( error, details, connection ) {
  cacheDate := connection.get( "if-modified-since" )
  // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
  // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
  if !error && cacheDate && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( details.stats.mtime.getTime() / 1000 ) {
    return connection.status( 304 ).end()
  }

  fs.readFile( details.path, ( ferror, contents ) => {
    if ferror {
      return connection.app.printer( new weave.HTTPError( 500 ), {}, connection )
    }

    // We may be printing an error page from generateErrorPage
    // This code *works* fine but for some reason breaks syntax highlighting in Atom.
    connection.status( weave.HTTPError.is( error ) ? error.status : 200 )
      .writeHeader( "Content-Type", connection.behavior( "mimeTypes {{path.extname( details.path )}}" ) ) // " Syntax highlighting bug in Atom

    // You can't cache an error!
    if !error { connection.writeHeader( "Last-Modified", details.stats.mtime.toUTCString() ) }

    connection.end( contents )
  })
}

printDirectory := function ( error, details, connection ) {
  if connection.behavior( "disableDirectoryListings" ) {
    // Forbidden!!!
    return connection.generateErrorPage( 403 )
  }

  fs.readdir( details.path, ( error, files ) => {
    if error {
      return connection.generateErrorPage( 500 )
    }

    if connection.url.description === "directory.json" {
      connection.status( 200 )
      connection.writeHeader( "Content-Type", "application/json" )
      return connection.end(JSON.stringify(files))
    }

    // If it's not JSON, it must be HTML.
    connection.writeHeader( "Content-Type", "text/html" )

    // Basic document setup
    title := 'Contents of {{connection.url.pathname}}'
    document := new DOM.HTMLDocument( 'html', title )
    header := new DOM.Element( 'h1' )
    header.innerHTML = title
    document.body.appendChild( header )

    if ( files.length === 0 ) {
      document.body.appendChild( new DOM.Element( 'p' ) ).innerHTML = "Nothing to see here!"

      connection.end( document.toString() )
    }

    // TODO: Come up with a better way to run multiple of these at once
    files.someAsync( ( file, i, some ) => {
      li := new DOM.Element( 'li' )
      a := new DOM.Element( 'a' )

      fs.stat( path.join( details.path, file ), ( error, stats ) => {
        if error {
          return connection.generateErrorPage( 500 )
        }

        // Special formatting for directories.
        if stats.isDirectory() {
          file += "/"
          li.className = 'directory'
          a.setAttribute( 'style', 'color: #3009c9;' )
        } else {
          a.setAttribute( 'style', 'color: #11a9f4;' )
        }

        href := path.join( "/", connection.url.pathname, file )
        a.setAttribute( 'href', href ), a.innerHTML = '/{{file}}'
        document.body.appendChild( li ).appendChild( a )
        some.next()
      } )
    }, () => connection.end( document.toString() ) )
  })
}
