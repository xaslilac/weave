// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer, u is undefined.
var weave = require( './weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n'), u;



module 'fs', 'path', 'util';

weave.Printer = function {
  return function error, details, connection {
    if !error {
      if details.isFile() {
        fs.readFile( details.path, function error, contents {
          connection.writeHeader( "Content-Type",
            connection.behavior( "mimeTypes {{path.extname( details.path )}}" ) )
          connection.end( contents )
        })
      } else if details.isDirectory() && !connection.behavior( "disableIndexListings" ) {
        fs.readdir( details.path, function error, files {
          connection.status( error ? 500 : 200 )
          connection.writeHeader( "Content-Type", "text/html" )
          files.forEach( function file {
            var href = path.join( "/", connection.url.path, file )
            connection.write("<li><a href='{{href}}'>{{file}}</a></li>")
          })
          connection.end()
        })
      } else {
        @end( "{{@host}} {{details.path}}\n\n\n{{@UUID}}\nDetails {{util.inspect(details)}}\n\nConfiguration {{util.inspect(@configuration)}}" )
      }
    } else {
      if error === 404 && details.isDirectory()
      && connection.url.depth === 1 && connection.url.description === "directory.json"
      && connection.behavior( "enableJSONIndexListings" ) {
        fs.readdir( details.path, function error, files {
          connection.status( error ? 500 : 200 )
          connection.writeHeader( "Content-Type", "application/json" )
          connection.end(JSON.stringify(files))
        })
      } else {
        connection.status( 500 )
        @end( "oh fuck" )
      }
    }
  }
}
