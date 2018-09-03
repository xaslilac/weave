// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave:printer' )

const fs = require( 'fs' )
const os = require( 'os' )
const path = require( 'path' )
const util = require( 'util' )

const { createPageFromTemplate } = require( './template' )

module.exports = function printer( error, manifest ) {
  // Check if we are printing an error
  if ( error ) {
    if ( error instanceof weave.HttpError ) return ( manifest.isFile() ? printFile : printError )( error, manifest, this )

    printError( new weave.HttpError( 500 ), manifest, this )
    return garden.typeerror( 'Error argument was not a weave.HttpError!', error )
  }

  // Ensure we have a path to print
  if ( !manifest.path ) {
    exchange.generateErrorPage( 500 )
    return garden.error( 'No path given in printer manifest!', manifest )
  }

  // It's either a file, directory, or we are confused (an error)
  if      ( manifest.isFile() )      printFile( error, manifest, this )
  else if ( manifest.isDirectory() ) printDirectory( error, manifest, this )
  else                               printError( new weave.HttpError( 500 ), manifest, this )
}

function printError( error, manifest, exchange ) {
  let document = createPageFromTemplate( `${error.statusCode} ${error.status}` )

  let description = document.content.appendChild( document.createElement( 'h2' ) )

  if ( typeof error.description === 'string' ) {
    description.innerHTML = error.description
  } else {
    description.innerHTML = `Something went wrong..`
  }

  if ( typeof error.stack === 'string' ) {
    let stack = content.appendChild( document.createElement( 'pre' ) )
    stack.children = error.stack.split( '\n' ).map( line => {
      return new dom.TextNode( line.replace( /\s/g, '&nbsp;' ).replace( os.homedir(), '~' ) + '<br />' )
    })
  }

  let report = document.content.appendChild( document.createElement( 'p' ) )
  report.innerHTML = 'Think this is an issue with Weave?'

  let reportLink = report.appendChild( document.createElement( 'a' ) )
  reportLink.innerHTML = 'Report it on GitHub'
  reportLink.href = 'https://github.com/weave-js/weave/issues'

  return exchange.status( error.statusCode ).end( document.toString() )
}

function printFile( error, manifest, exchange ) {
  let cacheDate = exchange.detail( "if-modified-since" )
  let extname = path.extname( manifest.path )
  let engine = exchange.behavior( `engines ${extname}` )
  // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
  // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
  if ( !error && cacheDate && !engine && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( manifest.stats.mtime.getTime() / 1000 ) )
    return exchange.redirect( 304 )

  let bufferState = {
    fd: null,
    readBuffer: null,
    readPosition: 0,
    readEnd: manifest.stats.size,
    readSize: 0x800000 // 8 MB chunking
  }

  fs.open( manifest.path, 'r', ( error, fd ) => {
    if ( error ) return exchange.generateErrorPage( new weave.HttpError( 500, error ) )

    exchange.status( error ? error.statusCode : /*(rangeMatch ? 206 :*/ 200/*)*/ )
      .header( 'Accept-Ranges', 'bytes' )
      .header( 'Content-Type', exchange.behavior( `mimeTypes ${extname}` ) )
      exchange.header( 'Content-Length', manifest.stats.size )
    bufferFile( Object.assign( bufferState, {
      fd, readBuffer: Buffer.alloc( bufferState.readSize )
    }), exchange )
  })
}

function bufferFile( bufferState, exchange ) {
  let { fd, readBuffer, readPosition, readEnd, readSize } = bufferState

  fs.read( fd, readBuffer, 0, Math.min( readEnd - readPosition, readSize ), readPosition, ( error, bytesRead ) => {
    if ( error ) return exchange.generateErrorPage( new weave.HttpError( 500, error ) )

    // If we didn't read a full chunk, then there's no need to write the whole thing.
    exchange.write( bytesRead < readSize
      ? readBuffer.slice( 0, bytesRead ) : readBuffer )

    // Update our file position.
    bufferState.readPosition += bytesRead

    // If there isn't anything left to read then we can end the exchange and
    // close the file. If there is more, we're going to wait a little bit so
    // that the network and garbage collector can keep up. We don't want to queue
    // too much data, because our memory usage can get really bad on big files.
    if ( bufferState.readEnd <= bufferState.readPosition ) {
      exchange.end()
      fs.close( fd, error => {
        if ( error ) garden.catch( error )
      })
    } else {
      exchange._NODE_CONNECTION.once( 'drain', () => {
        // We might use this later to offer throttling.
        //setTimeout( () => bufferFile( bufferState, exchange ), 100 )
        bufferFile( bufferState, exchange )
      })
    }
  })
}

function printDirectory( error, manifest, exchange ) {
  fs.readdir( manifest.path, ( derror, files ) => {
    if ( derror ) return exchange.generateErrorPage( new weave.HttpError( 500, derror ) )

    // See if the client is requesting a JSON object of the directory.
    if ( manifest.contentType === 'application/json' ) {
      exchange.header( 'Content-Type', 'application/json' )
      return exchange.end( JSON.stringify( files ) )
    }

    // If it's not JSON, it must be HTML.
    exchange.header( 'Content-Type', 'text/html' )

    // Basic document setup
    let document = createPageFromTemplate( `Contents of ${exchange.requestUrl.pathname}` )

    if ( exchange.requestUrl.pathname !== '/' ) {
      let stepUp = document.content.appendChild( document.createElement( 'a' ) )
      stepUp.href = '../'
      stepUp.innerHTML = '&nwarr; Up'
    }

    // Don't waste our time running promises with empty directories
    if ( files.length === 0 ) {
      document.content.appendChild( document.createElement( 'p' ) ).innerHTML = "Nothing to see here!"
      return exchange.end( document.toString() )
    }

    let list = document.content.appendChild( document.createElement( 'ul' ) )
    let directoryList = list.appendChild( document.createElement( 'span' ) )
    let fileList = list.appendChild( document.createElement( 'span' ) )

    directoryList.id = 'directories'
    fileList.id = 'files'

    Promise.all( files.map( file => {
      return new Promise( ( fulfill, reject ) => {
        fs.stat( path.join( manifest.path, file ), ( error, stats ) => {
          if ( error ) return reject( error )

          let isDir = stats.isDirectory()
          let name = isDir ? `/${file}/` : `/${file}`

          fulfill({
            type: isDir ? 'directory' : 'file',
            href: path.join( '/', exchange.requestUrl.pathname, name ),
            name: name
          })
        } )
      })
    }) ).then( listing => {
      listing.forEach( file => {
        let target = file.type === 'directory' ? directoryList : fileList
        let li = document.createElement( 'li' )
        let a = document.createElement( 'a' )
        a.href = file.href
        a.innerHTML = file.name

        target.appendChild( li ).appendChild( a )
      })

      exchange.end( document.toString() )
    }).catch( error => {
      exchange.generateErrorPage( new weave.HttpError( 500, error ) )
    })
  })
}
