// MIT License / Copyright 2014
"use strict";

let weave = require( '..' )
let garden = weave.createGarden( 'weave repl' )

let repl = require( 'repl' )
let readline = require( 'readline' )

weave.connectREPL = exports.connect = function ( input = process.stdin, output = process.stdout ) {
  process.nextTick( () => {
    let $ = repl.start( {
        prompt: '', input, output
    } )

    Object.assign( $.context, {
      weave, garden,
      $( n = 0 ) { return typeof n === 'number' ? weave.apps.anonymous[ n ] : weave.apps[ n ] },
      $$( n, d ) { let x = $.context.$( n ).configuration; return d ? x[d] : x }
    })

    $.defineCommand( 'q', () => {
      garden.log( 'Goodbye!' )
      process.exit()
    })
  })
}
