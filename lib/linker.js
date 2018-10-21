// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave:linker' )
const router = require( './router' )

const path = require( 'path' )
const Spirit = require( 'string-spirits' )
const url = require( 'url' )

function linkToMounts( exchange ) {
  // Enforce default domains and secure connections
  let forceDomain = exchange.behavior( 'forceDomain' )
  let forceSecure = exchange.behavior( 'forceSecure' )

  let redirectDomain = typeof forceDomain === 'string' && forceDomain !== exchange.requestUrl.hostname
  let redirectSecure = forceSecure && !exchange.secure
  if ( redirectDomain || redirectSecure ) {
    return exchange.redirect( url.format( Object.assign( exchange.requestUrl, {
      protocol: redirectSecure ? 'https:' : exchange.requestUrl.protocol,
      hostname: redirectDomain ? forceDomain : exchange.requestUrl.hostname,
      port: redirectSecure
        ? ( typeof forceSecure === 'number' ? force : 443 )
        : exchange.requestUrl.port
    }) ) )
  }

  // Check to see if we've already found the mount for this path.
  // If not check to see if there's a mount that matches the URL we're
  // processing and cache it. There should only be one match, because
  // mounts cannot overlap. They should be nested.
  let mountPath = null
  let mount = null
  if ( exchange.app._mountPaths[ exchange.relativeUrl.pathname ] ) {
    mountPath = exchange.app._mountPaths[ exchange.relativeUrl.pathname ]
    mount = exchange.app.mounts[ mountPath ]
  } else {
    // Search to see if we need to resolve to a mount. If we do, we need to recurse
    // through the function again to check for nested mounts.
    Object.keys( exchange.app.mounts ).some( pathname => {
      // The 2nd condition ensures that the client is requesting *this*
      // directory, and not a file or directory with a longer, overlapping
      // name. Trailing slashes are sanitized on directory names in weave.App,
      // so the forward slash will always be 1 character after the dir name.
      if ( exchange.relativeUrl.pathname === pathname
      || ( exchange.relativeUrl.pathname.startsWith( pathname )
        && exchange.relativeUrl.pathname.charAt( pathname.length ) === "/" ) ) {
        exchange.app._mountPaths[ exchange.relativeUrl.pathname ] = pathname
        mountPath = pathname
        mount = exchange.app.mounts[ pathname ]
        return true
      }
    })
  }

  if ( mount ) {
    if ( mount instanceof weave.App ) {
      exchange.relativeUrl.pathname = `/${path.relative( mountPath, exchange.relativeUrl.pathname )}`
      exchange.app = mount
      linkToMounts( exchange )
      return
    } else if ( mount.type === 'intercept' ) {
      exchange.app.emit( 'exchange', exchange )
      exchange.relativeUrl.pathname = `/${path.relative( mountPath, exchange.relativeUrl.pathname )}`

      let intercept = mount[ exchange.method ] || mount.default
      if ( intercept ) {
        // This code is the same as what we do before we call router. Maybe it
        // it can be factored out at some point to simplify code flow.
        exchange.app.emit( 'intercept', exchange )
        if ( !exchange._preventDefault ) {
          try {
            intercept.call( exchange.app, exchange )
          } catch ( error ) {
            exchange.generateErrorPage( 500, error )
          }
        }
        return
      }
    }

    // If there's a mount, but we don't know what to do with it then just
    // send the client a "Not Implemented" error page.
    return exchange.generateErrorPage( 501, `The URL requested does not support ${exchange.method.toUpperCase()} requests.` )
  }

  // Refuse access if specified to do so
  if ( Array.isArray( exchange.app.options.forbidden ) ) {
    if ( exchange.app.options.forbidden.some( pathname => {
      // XXX: This is the same code as used above, but relative.. Should we factor this out somewhere?
      if ( exchange.relativeUrl.pathname.startsWith( pathname )
      && ( exchange.relativeUrl.pathname === pathname || exchange.relativeUrl.pathname.charAt( pathname.length ) === "/" ) ) {
        exchange.generateErrorPage( new weave.HttpError( 403, 'Access to this URL has been blocked.' ) )
        return true
      }
    }) ) exchange.preventDefault()
  }

  let redirectPath = exchange.app.options.redirect && exchange.app.options.redirect[ exchange.relativeUrl.pathname ]
  if ( redirectPath ) {
    return typeof redirectPath === 'string'
      ? exchange.redirect( redirectPath )
      : exchange.redirect( redirectPath.location, redirectPath.status )
  }

  exchange.app.emit( 'exchange', exchange )
  if ( !exchange._preventDefault ) router.call( exchange )
}

module.exports = linkToMounts
