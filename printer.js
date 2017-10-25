// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.App::printer' )

let fs = require( 'fs' )
let path = require( 'path' )
let util = require( 'util' )
let DOM = require( './utilities/dom' )

weave.App.prototype.printer = function ( error, manifest, connection ) {
  // Debug inspecting
  garden.debug( error, manifest )

  if ( error ) {
    if ( error instanceof weave.HTTPError ) return ( manifest.isFile() ? printFile : printError )( error, manifest, connection )
    else {
      printError( new weave.HTTPError( 500 ), manifest, connection )
      return garden.typeerror( 'Error argument was not a weave.HTTPError!', error )
    }
  }

  if ( !manifest.path ) {
    connection.generateErrorPage( 500 )
    return garden.error( 'No path given!', manifest )
  }

  // It's either a file, directory, or we are confused (an error)
  if      ( manifest.isFile() )      printFile( error, manifest, connection )
  else if ( manifest.isDirectory() ) printDirectory( error, manifest, connection )
  else                              printError( new weave.HTTPError( 500 ), manifest, connection )
}

function printError( error, manifest, connection ) {
  let document = new DOM.HTMLDocument( `${error.statusCode} ${error.status}` )
  document.body.appendChild( new DOM.Element( 'h1' ) ).innerHTML = `${error.statusCode} ${error.status}`
  if ( error.description ) {
    let desc = document.body.appendChild( new DOM.Element( 'p' ) )
    desc.children = error.description.split( '\n' ).map( line => {
      return new DOM.TextNode( line.replace( /\s/g, '&nbsp;' ).replace( weave.constants.HOME, '~' ) + '<br />' )
    })
  }

  return connection.status( error.statusCode ).end( document.toString() )
}

function printFile( error, manifest, connection ) {
  let cacheDate = connection.detail( "if-modified-since" )
  let extname = path.extname( manifest.path )
  let engine = connection.behavior( `engines ${extname}` )
  // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
  // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
  if ( !error && cacheDate && !engine && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( manifest.stats.mtime.getTime() / 1000 ) )
    return connection.redirect( 304 )

  weave.cache( manifest.path, manifest.stats ).then( ({ content }) => {
    // Check if there is an engine specified for this file format
    if ( typeof engine === 'function' ) {
      try {
        Promise.resolve( engine( content, manifest, connection ) )
          .then( output => printFileHead( error, manifest, connection ).end( output ) )
          .catch( error => connection.generateErrorPage(new weave.HTTPError( 500, error )) )
      } catch ( error ) {
        connection.generateErrorPage(new weave.HTTPError( 500, error ))
      }
      return
    }

    printFileHead( error, manifest, connection ).end( content )
  }).catch( () => {
    printError( new weave.HTTPError( 500 ), {}, connection )
  })
}

function printFileHead( error, manifest, connection ) {
  let extname = path.extname( manifest.path )
  connection.status( error ? error.statusCode : 200 )
    .writeHeader( 'Content-Type', connection.behavior( `mimeTypes ${extname}` ) )
  // Don't cache error pages
  console.log( manifest.stats.mti)
  if ( !error ) connection.writeHeader( "Last-Modified", manifest.stats.mtime.toUTCString() )
  return connection
}

function printDirectory( error, manifest, connection ) {
  fs.readdir( manifest.path, ( derror, files ) => {
    if ( derror ) return connection.generateErrorPage( 500 )

    if ( connection.url.description === 'directory.json' ) {
      connection.writeHeader( 'Content-Type', 'application/json' )
      return connection.end( JSON.stringify( files ) )
    }

    // If it's not JSON, it must be HTML.
    connection.writeHeader( 'Content-Type', 'text/html' )

    // Basic document setup
    let document = new DOM.HTMLDocument( `Contents of ${connection.url.pathname}` )
    let header = new DOM.Element( 'h1' )
    let list = new DOM.Element( 'ul' )
    header.innerHTML = document.title
    document.body.appendChild( header )
    document.body.appendChild( list )

    // Style stuff
    let style = new DOM.StyleElement()
    style.setStyles( '.directory a', { 'color': '#11a9f4' } )
         .setStyles( '.file      a', { 'color': '#11f4e6' } )
    document.head.appendChild( style )

    // Don't waste our time with empty directories
    if ( files.length === 0 ) {
      document.body.appendChild( new DOM.Element( 'p' ) ).innerHTML = "Nothing to see here!"
      connection.end( document.toString() )
    }

    Promise.all( files.map( file => {
      return new Promise( ( yes, no ) => {
        fs.stat( path.join( manifest.path, file ), ( error, stats ) => {
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
