// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.App::router' )



let fs = require( 'fs' )
let path = require( 'path' )

// If you add any kind of "Connection::type" please make sure that you add
// an "isType" function.
weave.constants.DETAILS = {
  isDirectory: function (  ) { return this.type === "directory" },
  isFile:      function (  ) { return this.type === "file" },
  isInterface: function (  ) { return this.type === "interface" },
  isNA:        function (  ) { return this.type === "na" } // Not applicable.
                                                  // This might not be the best name though.
  // path: resolved path,
  // result: the return value of the interface if isInterface is true,
  // stats: fs.stat,
  // type: "directory"|"file"|"interface"|"na",
  // url: connection.url
}



weave.App.prototype.router = function ( connection ) {
  var cursor;

  // We give the printer this details object to let it know what we
  // have found about about the request so far.
	var details = Object.create( weave.constants.DETAILS, {
		url: {
			value: this.url,
			enumerable: true, writable: true, configurable: true } } )

  // Make the printer easier to call in different contexts.
  var print = more => this.printer( undefined, Object.extend( details, more ), connection )

  // If the configuration is a Function, then the request should be handle as
  // an interface type. Call the interface configuration.
  if ( Function.is( connection.configuration )  ) {
    var shouldContinue = false

    details.shouldContinue = function ( configuration ) {
      if ( configuration  ) {
        connection.configuration = configuration
        return shouldContinue = true
      } else {
        // TODO: Not sure what to do here exactly. Need to complain about not
        // getting a configuration argument.
      }
    }

    // TODO: This is messy right now. Nothing is being passed the results of the interface.
    Object.extend( details, {
      result: connection.configuration.call( connection.app, connection, details ),
      type: "interface"
    })

    if ( !shouldContinue  ) { return }
  }

  // Set the initial depth to 0. Depth is used to keep track of
  // how many directories we've moved down from the original url.
  // This is mainly used for directory indexes with finite depth.
  connection.url.depth = 0

  // Upgrades are only supported via interfaces.
  // TODO: Let's emit an upgrade event here as one last attempt
  // at saving the connection before we destroy it.
  if ( connection.isUpgrade  ) {
    connection.destroy()
    return connection.generateErrorPage( new weave.HTTPError( 501, "Cannot Upgrade" ) )
  }

  // If the request type isn't GET, HEAD, or POST, then we don't know how to
  // handle it. But should we really disconnect? Code 405 let's them know that
  // we can't handle the request, instead of just confusing the client as to
  // why they didn't ever recieve anything in return to the request.
  if ( connection.method !== "GET" && connection.method !== "HEAD" && connection.method !== "POST"  ) {
    return connection.generateErrorPage( new weave.HTTPError( 405, "Only GET, HEAD, and POST methods are supported." ) )
  }
  // These both do the exact same thing, just different ways. Which is better?
  //["GET","HEAD","POST"].some( function method { return connection.method === method } )
  //connection.method === "GET" || connection.method === "HEAD" || connection.method === "POST"

  // cursor points to where ever we're searching for files.
  var location = connection.behavior( 'location' )
  if ( !location  ) { return garden.error( 'No location set for '+connection.url.pathname+'! Cannot route!') }
  cursor = path.join( location, unescape( connection.url.path ) )

  // This function makes depth adjustments, and is called rather than calling
  // search directly if a recursive search is necessary.
  var reroute = function (  ) {
    // If there's room to step back and keep searching for files then we do so.
    if ( path.relative( "/", connection.url.path )  ) {
      connection.url.path = path.join( connection.url.path, ".." ), cursor = path.join( cursor, ".." );
      connection.url.description = path.relative( connection.url.path, connection.url.pathname );
      connection.url.depth++, search()
    } else {
      // TODO: Come up with a better way to handle errors.
      connection.generateErrorPage( new weave.HTTPError( 404 ) )
    }
  }

  var indexes = connection.behavior( 'indexes' )

  // Define our search function
  var search = function (  ) {
    // Check to see if it exists, and if it's a file or a directory.
    // If it doesn't exist, then step up a directory and try again.
    fs.exists( cursor, function ( exists  ) {
      if ( exists  ) {
        fs.stat( cursor, function ( error, stats  ) {
          if ( error  ) {
            return console.error( error )
          }

          // If it's a file, then we're done, and we just call the printer.
          // If it's a directory, then check for an index, making sure that
          // is has a fitting depth, that it exists, and is a file. We use a
          // customized Array::some function that you can use with asynchronous
          // functions, since you tell it when to go to the next item. The
          // callback is run when .next() is called but there is not another
          // item to process, so it will only be called if there isn't a match.
          if ( stats.isFile()  ) {
            print({ path: cursor, stats: stats, type: "file" })
          } else if ( stats.isDirectory()  ) {
            if ( connection.url.depth === 0 && !connection.behavior( 'disableURLCleaning' )
            && !connection.url.pathname.endsWith("/")  ) {
              connection.redirect( connection.url.pathname + "/" )
            } else if ( indexes  ) {
              Object.keys( indexes ).someAsync( function ( index, n, some  ) {
                if ( connection.url.depth <= indexes[ index ]  ) {
                  // TODO: Add code here so that if multiple indexes are
                  // found, the one with the lowest depth gets served.
                  index = path.join( cursor, index )
                  fs.exists( index, function ( exists  ) {
                    if ( exists  ) {
                      fs.stat( index, function ( error, stats  ) {
                        if ( stats.isFile()  ) {
                          print({ path: index, stats: stats, type: "file" })
                        } else some.next()
                      })
                    } else some.next()
                  })
                } else some.next()
              }, function (  ) {
                if ( connection.url.depth === 0  ) {
                  print({ path: cursor, stats: stats, type: "directory" })
                } else {
                  if ( connection.behavior( "enableJSONDirectoryListings" )
                  && connection.url.depth === 1 && connection.url.description === "directory.json"  ) {
                    print({ path: cursor, stats: stats, type: "directory" })
                  } else {
                    connection.generateErrorPage( new weave.HTTPError( 404, "Found directory but no index file.") )
                  }
                }
              })
            } else {
              reroute()
            }
          }
        })
      } else {
        // Search for any files with favored extensions.
        // Favored extensions only work on a depth of 0, and if the url ends in
        // a character that would be valid in a filename.
        if ( connection.url.depth === 0
        && Array.isArray( connection.behavior( "favoredExtensions" ) )
        && connection.url.pathname.charAt( connection.url.pathname.length - 1 ).match( /[A-Za-z0-9\-\_]/ )  ) {
          connection.behavior( "favoredExtensions" ).someAsync( function ( extension, i, some  ) {
            fs.exists( cursor + extension, function ( exists  ) {
              if ( exists  ) {
                fs.stat( cursor + extension, function ( error, stats  ) {
                  if ( stats.isFile()  ) {
                    print({ path: cursor + extension, stats: stats, type: "file" })
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