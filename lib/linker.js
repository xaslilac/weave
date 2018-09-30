// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave:linker' )
const router = require( './router' )

const path = require( 'path' )
const Spirit = require( 'string-spirits' )
const url = require( 'url' )

module.exports = function linkToMounts() {
  // Enforce default domains and secure connections
  let forceDomain = this.behavior( 'forceDomain' )
  let forceSecure = this.behavior( 'forceSecure' )

  let redirectDomain = typeof forceDomain === 'string' && forceDomain !== this.requestUrl.hostname
  let redirectSecure = forceSecure && !this.secure
  if ( redirectDomain || redirectSecure ) {
    return this.redirect( url.format( Object.assign( this.requestUrl, {
      protocol: redirectSecure ? 'https:' : this.requestUrl.protocol,
      hostname: redirectDomain ? forceDomain : this.requestUrl.hostname,
      port: redirectSecure
        ? ( typeof forceSecure === 'number' ? force : 443 )
        : this.requestUrl.port
    }) ) )
  }

  // Check to see if we've already found the mount for this path.
  // If not check to see if there's a mount that matches the URL we're
  // processing and cache it. There should only be one match, because
  // mounts cannot overlap. They should be nested.
  let mountPath = null
  let mount = null
  if ( this.app._mountPaths[ this.relativeUrl.pathname ] ) {
    mountPath = this.app._mountPaths[ this.relativeUrl.pathname ]
    mount = this.app.mounts[ mountPath ]
  } else {
    // Search to see if we need to resolve to a mount. If we do, we need to recurse
    // through the function again to check for nested mounts.
    Object.keys( this.app.mounts ).some( pathname => {
      // The 2nd condition ensures that the client is requesting *this*
      // directory, and not a file or directory with a longer, overlapping
      // name. Trailing slashes are sanitized on directory names in weave.App,
      // so the forward slash will always be 1 character after the dir name.
      if ( this.relativeUrl.pathname.startsWith( pathname )
      && ( this.relativeUrl.pathname === pathname || this.relativeUrl.pathname.charAt( pathname.length ) === "/" ) ) {
        this.app._mountPaths[ this.relativeUrl.pathname ] = pathname
        mountPath = pathname
        mount = this.app.mounts[ pathname ]
        return true
      }
    })
  }

  if ( mount ) {
    if ( mount instanceof weave.App ) {
      this.relativeUrl.pathname = `/${path.relative( mountPath, this.relativeUrl.pathname )}`
      this.app = mount
      linkToMounts.call( this )
    } else if ( mount.type === 'intercept' ) {
      if ( mount[ this.method ] ) mount[ this.method ].call( this.app, this )
      else if ( mount.default ) mount.default.call( this.app, this )
    }
    return
  }

  // Refuse access if specified to do so
  if ( Array.isArray( this.app.options.forbidden ) ) {
    if ( this.app.options.forbidden.some( pathname => {
      // XXX: This is the same code as used above, but relative.. Should we factor this out somewhere?
      if ( this.relativeUrl.pathname.startsWith( pathname )
      && ( this.relativeUrl.pathname === pathname || this.relativeUrl.pathname.charAt( pathname.length ) === "/" ) ) {
        this.generateErrorPage( new weave.HttpError( 403, 'Access to this URL has been blocked.' ) )
        return true
      }
    }) ) return
  }

  let redirectPath = this.app.options.redirect && this.app.options.redirect[ this.relativeUrl.pathname ]
  if ( redirectPath ) {
    return typeof redirectPath === 'string'
      ? this.redirect( redirectPath )
      : this.redirect( redirectPath.location, redirectPath.status )
  }

  this.app.emit( 'exchange', this )
  router.call( this )
}
