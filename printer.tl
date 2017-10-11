// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
weave := require( './weave' )
n := new Buffer('\r\n')
z := new Buffer('0\r\n\r\n')



module 'fs', 'path', 'util';
DOM := require( './utilities/DOM' )
Zen := require( './utilities/Zen' )

// Might be handy later
// @end( "{{@host}} {{details.path}}\n\n\n{{@UUID}}\nDetails {{util.inspect(details)}}\n\nConfiguration {{util.inspect(@configuration)}}" )

weave.Printer = function {
  return function error, details, connection {
    if details.path {
      if details.isFile() {
        cacheDate := connection.get( "if-modified-since" )
        // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
        // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
        if !error && cacheDate && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( details.stats.mtime.getTime() / 1000 ) {
          return connection.status( 304 ).end()
        }

        fs.readFile( details.path, function ferror, contents {
          // We may be printing an error page from generateErrorPage
          // This code *works* fine but for some reason breaks syntax highlighting in Atom.
          connection.status( weave.HTTPError.is( error ) ? error.status : 200 )
            .writeHeader( "Content-Type", connection.behavior( "mimeTypes {{path.extname( details.path )}}" ) )

          // You can't cache an error!
          if !error { connection.writeHeader( "Last-Modified", details.stats.mtime.toUTCString() ) }

          connection.end( contents )
        })
      } else if details.isDirectory() && !connection.behavior( "disableDirectoryListings" ) {

        fs.readdir( details.path, function error, files {
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
          files.someAsync( function file, i, some {
            li := new DOM.Element( 'li' )
            a := new DOM.Element( 'a' )

            fs.stat( path.join( details.path, file ), function error, stats {
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


          }, function { connection.end( document.toString() ) })
        })
      } else {
        // This needs to be moved somewhere else.
      }
    } else {
      if weave.HTTPError.is( error ) {
        document = new DOM.HTMLDocument( 'html', '{{error.status}} {{weave.constants.STATUS_CODES[ error.status ]}}' )
        document.body.appendChild( new DOM.Element( 'h1' ) ).innerHTML = '{{error.status}} {{error.statusCode}}'
        if error.description {
          document.body.appendChild( new DOM.Element( 'p' ) ).innerHTML = error.description
        }
        // Generate an error page programatically.
        connection.status( error.status ).end( document.toString() )
      } else {
        console.error( 'Invalid error! Please use weave.HTTPError to report errors.' )
        document = new DOM.HTMLDocument( 'html', '500 Internal Server Error' )
        document.body.appendChild( new Element( 'h1' ) ).innerHTML = '500 Internal Server Error'
          + ' to report error to printer.'
        // Generate an error page programatically.
        connection.status( error.status ).end( document.toString() )
      }
    }
  }
}
