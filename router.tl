// MIT License / Copyright Tyler Washburn 2015
"use strict";

var weave, q, u, n, z;
weave = require( "./weave" )

Array::someAsync = function f,c {var a=@,i=0,v=!1,t={
  next:function {i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function {c(!0)}};t.next()}
Object.extend = function o,e {@keys(e).forEach(function p {o[p]=e[p]});return o}
q = function s { return s.split(",") },n = new Buffer("\r\n"),z = new Buffer("0\r\n\r\n")



module 'fs', 'path';

// If you add any kind of "Connection::type" please make sure that you add
// an "isType" function.
weave.constants.DETAILS = {
  isDirectory: function { return @type === "directory" },
  isFile:      function { return @type === "file" },
  isInterface: function { return @type === "interface" },
  // path: resolved path,
  // result: the result of the function if ifFunction is true,
  // stats: fs.stat,
  // type: "directory"|"file"|"interface",
  // url: connection.url
};



weave.Router = function {
  return function connection, callback {
    var cursor, details, indexes;

    // We give the callback (usually an instance of weave.Printer) this details
    // object as the second argument to let it know what we have found about
    // about the request so far.
    details = Object.create( weave.constants.DETAILS, {
      url: {
        value: connection.url,
        enumerable: true, writable: true, configurable: true } } )

    // If the configuration is a Function, then the directory is an
    // Interface, so set the type and call the callback with the results.
    if Function.is( connection.configuration ) {
      /*return callback.call( connection, undefined, Object.extend( details, {
        type: "interface", result: connection.configuration( connection )
      }), connection )*/
      return connection.configuration.call( connection, undefined, details, connection )
    }

    // Upgrades are only supported via interfaces.
    // TODO: Let's emit an upgrade event here as one last attempt
    // at saving the connection before we destroy it.
    if connection.isUpgrade {
      connection.destroy()
      return callback.call( connection, "501 not implemented / could not upgrade" )
    }

    // If the request type isn't GET, HEAD, or POST, then we don't know how to
    // handle it. But should we really disconnect? Code 405 let's them know that
    // we can't handle the request, instead of just confusing the client as to
    // why they didn't ever recieve anything in return to the request.
    if connection.method !== "GET" && connection.method !== "HEAD" && connection.method !== "POST" {
      connection.destroy()
      return callback.call( connection, "405 method not supported", undefined, connection  )
    }

    // These both do the exact same thing, just different ways. Which is better?
    //["GET","HEAD","POST"].some( function method { return connection.method === method } )
    //connection.method === "GET" || connection.method === "HEAD" || connection.method === "POST"

    // cursor points to where ever we're searching for files.
    // If process.env.HOME is defined (which it won't be on Windows) and
    // the path begins with ~, replace the ~ with the users home directory.
    cursor = path.join(
      connection.configuration.location.replace( /^~/, weave.constants.HOME ),
      connection.url.pathname )

    // Set the initial depth to 0. Depth is used to keep track of
    // how many directories we've moved down from the original url.
    // This is mainly used for directory indexes with finite depth.
    if !connection.url.hasOwnProperty( "depth" ) {
      connection.url.depth = 0
    }

    // Check to see if it exists, and if it's a file or a directory.
    // If it doesn't exist, then step up a directory and try again.
    fs.exists( cursor, function exists {
      if exists {
        fs.stat( cursor, function error, stats {
          // If it's a file, then we're done, and we just call the callback.
          // If it's a directory, then check for an index, making sure that
          // is has a fitting depth, that it exists, and is a file. We use a
          // customized Array::some function that you can use with asynchronous
          // functions, since you tell it when to go to the next item. The
          // callback is run when .next() is called but there is not another
          // item to process, so it will only be called if there isn't a match.
          if stats.isFile() {
            callback.call( connection, undefined, Object.extend( details, {
              path: cursor, stats: stats, type: "file"
            }), connection )
          } else if stats.isDirectory() {
            indexes = connection.behavior( "indexes" )
            Object.keys( indexes ).someAsync( function index, n, some {
              if connection.url.depth <= indexes[ index ] {
                index = path.join( cursor, index )
                fs.exists( index, function exists {
                  if exists {
                    fs.stat( index, function error, stats {
                      if stats.isFile() {
                        callback.call( connection, undefined, Object.extend( details, {
                          path: index, stats: stats, type: "file"
                        }), connection )
                      } else some.next()
                    })
                  } else some.next()
                })
              } else some.next()
            }, function {
              if connection.url.depth === 0 {
                callback.call( connection, undefined, Object.extend( details, {
                  path: cursor, stats: stats, type: "directory"
                }), connection )
              } else {
                // TODO: Should change this to something about "directory
                // found but contained no indexes"
                // Isn't really an error unless you want it to be. Most people would
                // just display the directory contents.
                callback.call( connection, undefined, Object.extend( details, {
                  path: cursor, stats: stats, type: "directory"
                }), connection )
              }
            })
          }
        })
      } else {
        // If there's room to step back and keep searching for files then we do so.
        if path.relative( connection.configuration.location, connection.url.pathname ) {
          connection.url.pathname = path.join( connection.url.pathname, ".." )
          connection.url.depth++
          connection.app.router( connection, callback )
        } else {
          // TODO: Come up with a better way to handle errors.
          callback.call( connection, 404, Object.extend( details, {
            path: cursor, stats: stats, type: "file"
          }), connection )
        }
      }
    })
  }
}
