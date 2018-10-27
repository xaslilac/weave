// MIT License / Copyright 2015
"use strict";

const weave = require( '../..' )
const garden = require( 'gardens' ).createScope( 'weave.Exchange.request' )

const os = require( 'os' )
const path = require( 'path' )

Object.assign( weave.Exchange.prototype, {
  behavior( name ) {
    if ( typeof name !== 'string' ) throw garden.typeerror( 'Configuration behavior must be a string' )
    if ( !this.app || !this.app.options ) return undefined

    let behavior
    let nests = name.split(" ")
    let scopes = [ this.app.options ]

    let level = this.app.options
    while ( level._super ) {
      level = level._super
      scopes.push( level )
    }

    // Load in order of priority. Check the most relevant configurations first.
    scopes.some( ( cursor, x ) => {
      // garden.log( 'Checking scope', x )
      // Make sure the cursor actually exists, in case
      // this.configuration._super isn't defined.
      if ( cursor ) {
        // If the cursor follows all the way to the requested property
        // then set the behavior. If it's every undefined then it stops.
        if ( nests.every( nest => cursor = cursor[ nest ] ) ) {
          behavior = cursor
          // Crazy bug fix for inherited error pages
          // XXX: This is gross and not robust
          if ( nests[ 0 ] === 'errorPages'
					&& this.options && this.options.location
					&& x > 0 && scopes[ x ].location ) {
            behavior = path.join( path.relative( scopes[ x ].location, scopes[ 0 ].location ), behavior )
          }

          return true;
        }
      }
    } )

    // If the location begins with ~/, replace it with the users home directory.
    if ( name === 'location' && typeof behavior === 'string' && behavior.slice( 0, 2 ) === '~/' ) {
      behavior = path.join( os.homedir(), behavior.substr( 2 ) )
    }

    // Return the matching behavior. If we didn't find one this should
    // still just be undefined.
    return behavior
  },

  detail( name ) {
    // Make sure the header name is lowercase, so that it
    // can be case insensitive.
    name = name.toLowerCase()
    let value = this._NODE_REQUEST.headers[ name ]

    // If it's the cache date, make it a Date object
    return name === "if-modified-since"
      ? new Date( value )
      : value
  },

  readChunk( encoding = this._encoding, timeout = 3000 ) {
    return new Promise( ( fulfill, reject ) => {
      let temper = setTimeout( () => {
        reject( garden.warn( 'No data to read!' ) )
      }, timeout )

      this.once( 'data', data => {
        clearTimeout( temper )
        fulfill( data.toString( encoding ) )
      })
    })
  },

  readBody( encoding = this._encoding, timeout = 3000 ) {
    return new Promise( ( fulfill, reject ) => {
      let temper = setTimeout( () => {
        reject( garden.warn( 'No data to read!' ) )
      }, timeout )

      let data = null

      // DON'T COMMIT NO COMMIT THIS IS BAD AND NOT DONE
      this.once( 'data', chunk => {
        data = chunk
      })

      this.on( 'end', data => {
        clearTimeout( temper )
        fulfill( data.toString( encoding ) )
      })
    })
  }
})
