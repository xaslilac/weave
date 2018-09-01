// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave:linker' )
const router = require( './router' )

const path = require( 'path' )
const Spirit = require( 'string-spirits' )
const url = require( 'url' )

module.exports = function linkToBinding() {
  // Shortcut, because we kind of use this a lot and it's very verbose.
  const binding = weave._bindings[ this.requestUrl.port ]

  // Check for a direct host match, or a cached wildcard match.
  // If there isn't one, check against wildcards, filtering out hosts
  // that don't contain at least one wildcard since they won't match.
  if ( binding.attachments[ this.requestUrl.hostname ] ) {
    this.app = binding.attachments[ this.requestUrl.hostname ]
  } else if ( binding.cachedMatches[ this.requestUrl.hostname ] ) {
    this.app = binding.cachedMatches[ this.requestUrl.hostname ]
  } else {
    // Check the requested host against all linked hostnames that have a wildcard
    let hostname = Spirit.bestMatch(
      Object.keys( binding.attachments ).filter( hostname => /\*|\?/.test( hostname ) ), this.requestUrl.hostname
    ).toString()

    // If there isn't a linked app then just end the connection.
    if ( !hostname ) {
      // XXX: Should we really do this silently? Or should we report?
      garden.warning( 'Incoming connection rejected. No app found.' )
      return request.connection.destroy()
    }

    // Remember which wildcard best matched this host for next time
    this.app = binding.cachedMatches[ this.requestUrl.hostname ] = binding.attachments[ hostname ]
  }

  // Once we've settled on the root app, check domain requirements, and mounts.
  linkToMounts.call( this )
}

function linkToMounts() {
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

  // Check to see if we've already found the configuration for this path.
  // If not check to see if there's a directory with a configuration that
  // matches the URL we're processing and cache it. If there are multiple
  // matches we check it against the longest match to see if it's longer.
  // The longest match should always be the most specific configuration.
  if ( this.app._mountPaths[ this.relativeUrl.pathname ] ) {
    this.app = this.app._mountPaths[ this.relativeUrl.pathname ]
  } else {
    // Search to see if we need to resolve to a mount. If we do, we need to recurse
    // through the function again to check for nested mounts.
    if ( Object.keys( this.app.mounts ).some( pathname => {
      // The 2nd condition ensures that the client is requesting *this*
      // directory, and not a file or directory with a longer, overlapping
      // name. Trailing slashes are sanitized on directory names in weave.App,
      // so the forward slash will always be 1 character after the dir name.
      if ( this.relativeUrl.pathname.startsWith( pathname )
      && ( this.relativeUrl.pathname === pathname || this.relativeUrl.pathname.charAt( pathname.length ) === "/" ) ) {
        this.app = this.app._mountPaths[ this.relativeUrl.pathname ] = this.app.mounts[ pathname ]
        this.relativeUrl.pathname = '/' + path.relative( pathname, this.relativeUrl.pathname )
        return true
      }
    }) ) return linkToMounts.call( this )
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

  this.app.emit( 'exchange', this )
  router.call( this )
}
