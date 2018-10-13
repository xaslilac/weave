// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave:printer' )
const { defaultDictionary } = require( '../utilities/mimedictionary' )

const fs = require( 'fs' )
const os = require( 'os' )
const path = require( 'path' )

const { createPageFromTemplate, TextNode } = require( './template' )

const HUMAN_READABLE_SUFFIXES = [ 'bytes', 'KB', 'MB', 'GB', 'TB', 'PB' ]
const HUMAN_READABLE_SIZE = function ( size ) {
  let power = 0
  let sizeString
  while ( power + 1 < HUMAN_READABLE_SUFFIXES.length && size > 1000 ) {
    size /= 1024
    power += 1
  }

  sizeString = Math.trunc( size ) === size
    ? size.toString()
    : size.toPrecision( 3 )

  return `${sizeString} ${HUMAN_READABLE_SUFFIXES[ power ]}`;
}

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
  if ( manifest.isFile() ) {
    printFile( error, manifest, this )
  } else if ( manifest.isDirectory() ) {
    printDirectory( error, manifest, this )
  } else {
    printError( new weave.HttpError( 500 ), manifest, this )
  }
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
    let stack = document.content.appendChild( document.createElement( 'pre' ) )
    error.stack.split( '\n' ).map( line =>
      stack.innerHTML += `${line.replace( /\s/g, '&nbsp;' ).replace( os.homedir(), '~' )}<br />` )
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
  if ( !error && cacheDate && !engine && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( manifest.stats.mtime.getTime() / 1000 ) ) {
    return exchange.redirect( 304 )
  }

  let bufferState = {
    fd: null,
    readBuffer: null,
    readPosition: 0,
    readEnd: manifest.stats.size,
    readSize: 0x800000 // 8 MB chunking
  }

  fs.open( manifest.path, 'r', ( ferror, fd ) => {
    if ( ferror ) return exchange.generateErrorPage( new weave.HttpError( 500, ferror ) )

    // If we're delivering an error page, don't check for a range header.
    let rangeMatch = !error && /^bytes=([0-9]+)\-([0-9]*)$/i.exec( exchange.detail( 'range' ) )

    // If there's a range header value that we support, then point to the correct
    // reading position. This must be checked before we write the status, so that
    // we can generate an error page.
    if ( rangeMatch ) {
      bufferState.readPosition = parseInt( rangeMatch[1] )

      // It is possible that the second range parameter is omitted,
      // which is assumed to mean that we should read until the end of the file.
      // We already initialized the readEnd to the end of the file, so do nothing.
      if ( rangeMatch[2] ) {
        bufferState.readEnd = parseInt( rangeMatch[2] )
      }

      // If the readPosition is past the readEnd, or the readEnd is past the
      // end of the file, then it's an invalid range. (416 Range Not Satisfiable)
      if ( bufferState.readPosition > bufferState.readEnd
        || bufferState.readEnd > manifest.stats.size ) return exchange.generateErrorPage( 416 )

      // Write all of the range specific header stuff.
      exchange.head( 206, {
        'Accept-Ranges': 'bytes',
        'Content-Length': bufferState.readEnd - bufferState.readPosition,
        'Content-Range': `bytes ${bufferState.readPosition}-${bufferState.readEnd-1}/${manifest.stats.size}`,
        'Content-Type': 'multipart/byteranges'
      })
    } else {
      exchange.head( error ? error.statusCode : 200, {
        'Accept-Ranges': 'bytes',
        'Content-Length': manifest.stats.size,
        'Content-Type': exchange.behavior( `mimeTypes ${extname}` ) || defaultDictionary[ extname ]
      })
    }

    garden.log( 'Loaded from', exchange.detail( 'user-agent' ) )

    // Don't cache error pages.
    if ( !error ) exchange.header( "Last-Modified", manifest.stats.mtime.toUTCString() )

    // Write the file body now that the head is complete.
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
        // setTimeout( () => bufferFile( bufferState, exchange ), 100 )
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
      document.content.appendChild( document.createElement( 'h2' ) ).innerHTML = "Nothing to see here!"
      return exchange.end( document.toString() )
    }

    // let list = document.content.appendChild( document.createElement( 'ul' ) )
    // let directoryList = list.appendChild( document.createElement( 'span' ) )
    // let fileList = list.appendChild( document.createElement( 'span' ) )

    let table = document.content.appendChild( document.createElement( 'table' ) )
    let thead = table.appendChild( document.createElement( 'thead' ) )
    let header = thead.appendChild( document.createElement( 'tr' ) )
    header.appendChild( document.createElement( 'th' ) ).innerHTML = 'Name'
    header.appendChild( document.createElement( 'th' ) ).innerHTML = 'Modified'
    header.appendChild( document.createElement( 'th' ) ).innerHTML = 'Size'

    let tbodyDirectories = table.appendChild( document.createElement( 'tbody' ) )
    let tbodyFiles = table.appendChild( document.createElement( 'tbody' ) )

    Promise.all( files.map( file => new Promise( ( fulfill, reject ) => {
      fs.stat( path.join( manifest.path, file ), ( error, stats ) => {
        if ( error ) return reject( error )

        fulfill({ file, stats })
      })
    })) ).then( listing => {
      listing.forEach( ({ file, stats }) => {
        let isDir = stats.isDirectory()
        let target = isDir ? tbodyDirectories : tbodyFiles
        let location = isDir ? `/${file}/` : `/${file}`
        let tr = document.createElement( 'tr' )
        let name = document.createElement( 'td' )
        let a = document.createElement( 'a' )
        a.href = path.join( '/', exchange.requestUrl.pathname, location )
        a.innerHTML = location

        let modified = document.createElement( 'td' )
        modified.innerHTML = stats.mtime.toLocaleString()

        tr.appendChild( name ).appendChild( a )
        tr.appendChild( modified )

        if ( !isDir ) {
          let size = document.createElement( 'td' )
          size.innerHTML = HUMAN_READABLE_SIZE( stats.size )
          tr.appendChild( size )
        }

        target.appendChild( tr )
      })

      exchange.end( document.toString() )
    }).catch( error => {
      exchange.generateErrorPage( new weave.HttpError( 500, error ) )
    })
  })
}
