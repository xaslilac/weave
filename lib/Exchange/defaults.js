// MIT License / Copyright 2015
"use strict";

const weave = require( '../..' )
const garden = require( 'gardens' ).createScope( 'weave.Exchange.defaults' )

const fs = require( 'fs' )
const os = require( 'os' )
const path = require( 'path' )
const { createPageFromTemplate, TextNode } = require( '../template' )
const { defaultDictionary } = require( '../../utilities/mimedictionary' )

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

Object.assign( weave.Exchange.prototype, {
  print( error, manifest ) {
    // Ensure we have a path to print
    if ( !manifest.path ) {
      this.generateErrorPage( 500 )
      throw garden.error( 'No path given in printer manifest!', manifest )
    }

    // It's either a file, directory, or we are confused (an error)
    if ( manifest.isFile() ) {
      this.printFile( error, manifest, this )
    } else if ( manifest.isDirectory() ) {
      this.printDirectory( error, manifest, this )
    } else {
      this.printError( new weave.HttpError( 500 ), manifest, this )
    }
  },

  printFile( error, manifest ) {
    let cacheDate = this.detail( "if-modified-since" )
    let extname = path.extname( manifest.path )
    let engine = this.behavior( `engines ${extname}` )
    // We have to take away some precision, because some file systems store the modify time as accurately as by the millisecond,
    // but due to the standard date format used by HTTP headers, we can only report it as accurately as by the second.
    if ( !error && cacheDate && !engine && Math.floor( cacheDate.getTime() / 1000 ) === Math.floor( manifest.stats.mtime.getTime() / 1000 ) ) {
      return this.redirect( 304 )
    }

    let rangeState = {
      start: 0,
      end: manifest.stats.size,
      highWaterMark: 0x200000 // 2 MB chunking
    }

    // If we're delivering an error page, don't check for a range header.
    let rangeMatch = !error && /^bytes=([0-9]+)\-([0-9]*)$/i.exec( this.detail( 'range' ) )

    // If there's a range header value that we support, then point to the correct
    // reading position. This must be checked before we write the status, so that
    // we can generate an error page.
    if ( rangeMatch && manifest.stats.size > 0 ) {
      rangeState.start = parseInt( rangeMatch[1] )

      // It is possible that the second range parameter is omitted,
      // which is assumed to mean that we should read until the end of the file.
      // We already initialized the end to the end of the file, so do nothing.
      // If it is specified, the standard says that the range should be inclusive,
      // but our code in exclusive, so we have to add 1 to it.
      if ( rangeMatch[2] ) {
        rangeState.end = parseInt( rangeMatch[2] )
      }

      // If the start is past the end, or the end is past the
      // end of the file, then it's an invalid range. (416 Range Not Satisfiable)
      if ( rangeState.start > rangeState.end
        || rangeState.end > manifest.stats.size ) return this.generateErrorPage( 416 )

      // Write all of the range specific header stuff.
      // Our code is end exclusive, but the standard is suppose to be range
      // inclusive, so we subtract 1 to correct for that.
      this.head( 206, {
        'Content-Length': rangeState.end - rangeState.start,
        'Content-Range': `bytes ${rangeState.start}-${rangeState.end-1}/${manifest.stats.size}`,
        'Content-Type': 'multipart/byteranges'
      })
    } else {
      this.head( error ? error.statusCode : 200, {
        'Content-Length': manifest.stats.size,
        'Content-Type': this.behavior( `mimeTypes ${extname}` ) || defaultDictionary[ extname ] || 'application/octet-stream'
      })
    }

    // Don't cache error pages.
    if ( !error ) this.header( 'Last-Modified', manifest.stats.mtime.toUTCString() )

    // Write the file body now that the head is complete.
    // this._clearHead()
    // this._NODE_RESPONSE.writeHead( this._WRITTEN_STATUS, this._WRITTEN_HEADERS )
    fs.createReadStream( manifest.path, rangeState ).pipe( this )
  },

  generateErrorPage( error, description ) {
    // Make sure we can generate a valid error page.
    if ( typeof error === 'number' ) error = new weave.HttpError( error, description )
    else if ( !( error instanceof weave.HttpError ) ) error = new weave.HttpError( 500, error )

    // If it was a server error, log it
    if ( error.statusCode >= 500 ) garden.catch( error.description )

    // Get the manifest ready for the printer, and make the printer easy to call.
    let manifest = new weave.Manifest({ url: this.url })
    let print = more => this.print( error, manifest.extend( more ) )

    // Search for a path for an error file. If there is no file name, or the file is
    // relative, but we have no cursor to search at, print the default page.
    let cursor = this.behavior( 'location' )
    let errorPageName = this.behavior( `errorPages ${error.statusCode}` )
    if ( !errorPageName || (!cursor && !path.isAbsolute( errorPageName )) ) return this.printError( error, manifest )

    // Error page paths can be relative, and will point inside the root location of the app,
    // or they can be absolute and point anywhere on the file system.
    let errorPagePath = path.isAbsolute( errorPageName )
		  ? errorPageName
		  : path.join( cursor, errorPageName )

    fs.stat( errorPagePath, ( serror, stats ) => {
      !serror && stats.isFile()
        ? this.printFile( error, manifest.extend({ path: errorPagePath, stats, type: 'file' }) )
        : this.printError( error, manifest )
    })
  },

  printError( error, manifest ) {
    let document = createPageFromTemplate( `${error.statusCode} ${error.status}` )

    let description = document.content.appendChild( document.createElement( 'h2' ) )

    description.innerHTML = typeof error.description === 'string'
      ? error.description
      : 'Something went wrong..'

    // React.createElement( 'h2', null, typeof error.description === 'string'
    //   ? error.description
    //   : 'Something went wrong..' )

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

    // let report = React.createElement( 'p', null, 'Think this is an issue with Weave?',
    //   React.createElement( 'a', { href: 'https://github.com/weave-js/weave/issues' },
    //     'Report it on GitHub'
    //   )
    // )

    return this.status( error.statusCode ).end( document.toString() )
  },

  printDirectory( manifest ) {
    fs.readdir( manifest.path, ( derror, files ) => {
      if ( derror ) return this.generateErrorPage( 500, derror )

      // See if the client is requesting a JSON object of the directory.
      if ( manifest.contentType === 'application/json' ) {
        this.header( 'Content-Type', 'application/json' )
        return this.end( JSON.stringify( files ) )
      }

      // If it's not JSON, it must be HTML.
      this.header( 'Content-Type', 'text/html' )

      // Basic document setup
      let document = createPageFromTemplate( `Contents of ${this.requestUrl.pathname}` )

      if ( this.requestUrl.pathname !== '/' ) {
        let stepUp = document.content.appendChild( document.createElement( 'a' ) )
        stepUp.href = '../'
        stepUp.innerHTML = '&nwarr; Up'
      }

      // Don't waste our time running promises with empty directories
      if ( files.length === 0 ) {
        document.content.appendChild( document.createElement( 'h2' ) ).innerHTML = "Nothing to see here!"
        return this.end( document.toString() )
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
          a.href = path.join( '/', this.requestUrl.pathname, location )
          a.innerHTML = location
          tr.appendChild( name ).appendChild( a )

          let modified = document.createElement( 'td' )
          modified.innerHTML = stats.mtime.toLocaleString()
          tr.appendChild( modified )

          if ( !isDir ) {
            let size = document.createElement( 'td' )
            size.innerHTML = HUMAN_READABLE_SIZE( stats.size )
            tr.appendChild( size )
          }

          target.appendChild( tr )
        })

        this.end( document.toString() )
      }).catch( error => {
        this.generateErrorPage( new weave.HttpError( 500, error ) )
      })
    })
  },

  redirect( location, status = 302, headers ) {
    if ( location === 304 ) return this.status( 304 ).end()
    if ( typeof location !== 'string' ) {
      this.generateErrorPage( 500 )
      throw garden.typeerror( 'Redirect location is not a string!' )
    }

    if ( typeof status !== 'number' || status < 300 || status > 399 ) {
      headers = status
      status = 302
    }

    return this.head( status, Object.assign({ 'Location': location }, headers ) ).end()
  }
})
