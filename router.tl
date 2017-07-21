// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer, u is undefined.
var weave = require( './weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n'), u;



module 'fs', 'path';

// If you add any kind of "Connection::type" please make sure that you add
// an "isType" function.
weave.constants.DETAILS = {
  isDirectory: function { return @type === "directory" },
  isFile:      function { return @type === "file" },
  isInterface: function { return @type === "interface" },
  isNA:        function { return @type === "na" } // Not applicable.
                                                  // This might not be the best name though.
  // path: resolved path,
  // result: the return value of the interface if isInterface is true,
  // stats: fs.stat,
  // type: "directory"|"file"|"interface"|"na",
  // url: connection.url
};



weave.Router = function {
  return function connection, callback {
    var cursor, details, indexes, search, reroute;

    // We give the callback (usually an instance of weave.Printer) this details
    // object as the second argument to let it know what we have found about
    // about the request so far.
    details = Object.create( weave.constants.DETAILS, {
      url: {
        value: connection.url,
        enumerable: true, writable: true, configurable: true } } )

    // If the configuration is a Function, then the request should be handle as
    // an interface type. Call the interface configuration.
    if Function.is( connection.configuration ) {
      /*return callback.call( connection, undefined, Object.extend( details, {
        type: "interface", result: connection.configuration( connection )
      }), connection )*/
      // TODO: This is messy right now. Nothing is being passed the results of the interface.
      return connection.configuration.call( connection, undefined, Object.extend( details, {
        type: "interface"
      }), connection )
    }

    // Set the initial depth to 0. Depth is used to keep track of
    // how many directories we've moved down from the original url.
    // This is mainly used for directory indexes with finite depth.
    connection.url.depth = 0

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
    // If the app location begins with ~, replace it with the users home directory.
    // weave.constants.HOME normalizes the API for Node across different platforms.
    cursor = path.join(
      connection.behavior( "location" ).replace( /^~/, weave.constants.HOME ),
      unescape( connection.url.path ) ),

    // This function makes depth adjustments, and is called rather than calling
    // search directly if a recursive search is necessary.
    reroute = function {
      // If there's room to step back and keep searching for files then we do so.
      if path.relative( "/", connection.url.path ) {
        connection.url.path = path.join( connection.url.path, ".." ), cursor = path.join( cursor, ".." );
        connection.url.description = path.relative( connection.url.path, connection.url.pathname );
        connection.url.depth++, search()
      } else {
        // TODO: Come up with a better way to handle errors.
        callback.call( connection, 404, Object.extend( details, {
          path: connection.url.pathname, stats: undefined, type: "file"
        }), connection )
      }
    }

    // Define our search function
    search = function {
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
              if connection.url.depth === 0 && !connection.url.pathname.endsWith("/") {
                connection.writeHead( 301, {
                  "Location": connection.url.pathname + "/"
                }).end()
              } else {
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
                    // If we found a directory, but there is not index file to handle
                    // it and the depth of our search is not 0, it counts as not found.
                    callback.call( connection, 404, Object.extend( details, {
                      path: cursor, stats: stats, type: "directory"
                    }), connection )
                  }
                })
              }
            }
          })
        } else {
          // Search for any files with favored extensions.
          // Favored extensions only work on a depth of 0, and if the url ends in
          // a character that would be valid in a filename.
          if connection.url.depth === 0
          && Array.isArray( connection.behavior( "favoredExtensions" ) )
          && connection.url.pathname.charAt( connection.url.pathname.length - 1 ).match( /[A-Za-z0-9\-\_]/ ) {
            connection.behavior( "favoredExtensions" ).someAsync( function extension, i, some {
              fs.exists( cursor + extension, function exists {
                if exists {
                  fs.stat( cursor + extension, function error, stats {
                    if stats.isFile() {
                      callback.call( connection, undefined, Object.extend( details, {
                        path: cursor + extension, stats: stats, type: "file"
                      }), connection )
                    } else some.next()
                  })
                } else some.next()
              })
            }, reroute)
          } else reroute()
        }
      })
    };
    search();
  }
}
