var DETAILS = {
  isDirectory: function { return @type === "directory" },
  isFile:      function { return @type === "file" },
  isInterface: function { return @type === "interface" },
  // path: resolved path,
  // result: the result of the function if ifFunction is true,
  // stats: fs.stat,
  // type: "directory"|"file"|"interface",
  // url: connection.url
};

module 'fs', 'path';

module.exports = function {
  return function connection, callback {
    var cursor, details;

    // Details is what we will give the callback as a result.
    details = Object.create( DETAILS, {
      url: {
        value: connection.url,
        enumerable: true, writable: true, configurable: true } } )

    // If the configuration is a Function, then the directory is an
    // Interface, so set the type and call the callback with the results.
    if Function.is( connection.configuration ) {
      return callback.call( connection, undefined, Object.extend( details, {
        type: "interface", result: connection.configuration( connection )
      }))
    }

    // Upgrades are only supported via interfaces.
    // TODO: Let's emit an upgrade event here as one last attempt
    // at saving the connection before we destroy it.
    if connection.isUpgrade {
      connection.destroy()
      return callback.call( connection, "501 not implemented / could not upgrade" )
    }

    // These both do the exact same thing, just different ways. Which is better?
    //["GET","HEAD","POST"].some( function method { return connection.method === method } )
    //connection.method === "GET" || connection.method === "HEAD" || connection.method === "POST"

    if connection.method !== "GET" && connection.method !== "HEAD" && connection.method !== "POST" {
      connection.destroy()
      return callback.call( connection, "405 method not supported" )
    }

    // cursor points to where ever we're searching for files.
    cursor = path.join( connection.configuration.location
      .replace( /^~/, process.env.HOME ), connection.url.pathname )

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
            }))
          } else if stats.isDirectory() {
            Object.keys( connection.configuration.indexes ).someAsync( function index, n, some {
              if connection.url.depth <= connection.configuration.indexes[ index ] {
                index = path.join( cursor, index )
                fs.exists( index, function exists {
                  if exists {
                    fs.stat( index, function error, stats {
                      if stats.isFile() {
                        callback.call( connection, undefined, Object.extend( details, {
                          path: index, stats: stats, type: "file"
                        }))
                      } else some.next()
                    })
                  } else some.next()
                })
              } else some.next()
            }, function {
              if connection.url.depth === 0 {
                callback.call( connection, undefined, Object.extend( details, {
                  path: cursor, stats: stats, type: "directory"
                }))
              } else {
                // TODO: Should change this to something about "directory
                // found but contained no indexes"
                callback.call( connection, 404 )
              }
            })
          }
        })
      } else {
        // If there's room to step back and keep searching for files then we do so.
        if path.relative( connection.configuration.location, connection.url.pathname ) {
          connection.url.pathname = path.join( connection.url.pathname, ".." )
          connection.url.depth++
          @resolve( callback )
        } else {
          callback.call( connection, 404 )
        }
      }
    })
  }
}