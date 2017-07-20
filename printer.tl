// MIT License / Copyright Tyler Washburn 2015
"use strict";

// Define some global variables. n is a new line buffer, q is a QuickArray
// Function, u is simply a shortened way for us to use a value of undefined
// and z in an end packet buffer.
var weave, n, q, u, z;
weave = require( "./weave" )

// TEMPORARY!!!!!

Array::someAsync = function f,c {var a=@,i=0,v=!1,t={
  next:function {i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function {c(!0)}};t.next()}
q = function s { return s.split(",") },n = new Buffer("\r\n"),z = new Buffer("0\r\n\r\n")



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
