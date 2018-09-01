// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )

// Manifest is a small class to describe the *response* to the exchange.
weave.Manifest = class Manifest {
  constructor( details ) {
    if ( details ) this.extend( details )
  }

  extend( details ) {
    if ( details != null ) Object.keys( details ).forEach( prop => this[ prop ] = details[ prop ] );
    return this
  }

  isDirectory() { return this.type === "directory" }
  isFile()      { return this.type === "file" }
  isInterface() { return this.type === "interface" }
  // XXX: What is this even for?
  isNA() { return this.type === "na" } // Not applicable.
                                       // This might not be the best name though.
}
