// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( './weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n');



module 'fs', 'path', 'util';

weave.Printer = function {
  return function error, details, connection {
    var cacheDate;
    if details.path {
      if details.isFile() {
        cacheDate = connection.get( "if-modified-since" )
        // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
        // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
        if cacheDate && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( details.stats.mtime.getTime() / 1000 ) {
          connection.status( 304 ).end()
        } else {
          fs.readFile( details.path, function error, contents {
            // We may be printing an error page from generateErrorPage
            connection.status( weave.HTTPError.is( error ) ? error.status : 200 )
            connection.writeHeader( "Content-Type",
              connection.behavior( "mimeTypes {{path.extname( details.path )}}" ) )
              .writeHeader( "Last-Modified", details.stats.mtime.toUTCString() )
              .end( contents )
          })
        }
      } else if details.isDirectory() && !connection.behavior( "disableIndexListings" ) {
        if connection.url.description === "directory.json" {
          fs.readdir( details.path, function error, files {
            connection.status( error ? 500 : 200 )
            connection.writeHeader( "Content-Type", "application/json" )
            connection.end(JSON.stringify(files))
          })
        } else {
          fs.readdir( details.path, function error, files {
            connection.status( error ? 500 : 200 )
            connection.writeHeader( "Content-Type", "text/html" )
            files.forEach( function file {
              var href = path.join( "/", connection.url.path, file )
              connection.write("<li><a href='{{href}}'>{{file}}</a></li>")
            })
            connection.end()
          })
        }
      } else {
        @end( "{{@host}} {{details.path}}\n\n\n{{@UUID}}\nDetails {{util.inspect(details)}}\n\nConfiguration {{util.inspect(@configuration)}}" )
      }
    } else if weave.HTTPError.is( error ) {
      // Generate an error page programatically.
      connection.status( error.status ).end( "oh heck its a {{error.status}}" )
    } else {
      // XXX: Do something more productive here later, placeholder code
      // Probably either a 404 or 500 error
      console.log( 'Invalid error! Please use weave.HTTPError to report errors.' )
      connection.destroy()
    }
  }
}
