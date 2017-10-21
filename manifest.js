// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.Manifest' )

weave.Manifest = class Manifest {
  isDirectory() { return this.type === "directory" }
  isFile()      { return this.type === "file" }
  isInterface() { return this.type === "interface" }
  // XXX: What is this even for?
  isNA() { return this.type === "na" } // Not applicable.
                                       // This might not be the best name though.

  extend( more ) {
    if ( more != null ) Object.keys( more ).forEach( prop => this[ prop ] = more[ prop ] );
    return this
  }

  constructor( more ) {
    if ( more ) this.extend( more )
  }
  // path: resolved path,
  // result: the return value of the interface if isInterface is true,
  // stats: fs.stat,
  // type: "directory"|"file"|"interface"|"na",
  // url: connection.url
}
