// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.Cache' )

weave.cache = {
  wildcardMatches: {},

  fileEntries: {
    // "C:\\cached.html": {
    //   stats: fs.stat(),
    //   content: fs.readFile()
    // },
    'size': 0,
    'mostRecent': []
  },

  addEntry: function ( path, stats, content ) {
    this.fileEntries[ path ] = { stats, content }
  },

  retrieveEntry: function ( path, stats ) {
    // Maybe this should be our main API to retrieve things from the file system to print
    // Do we really need an addEntry API to be public? Maybe we should just add things in here
    // if we don't already have them and uses a Promise to tell printer when we have the content
  }
}
