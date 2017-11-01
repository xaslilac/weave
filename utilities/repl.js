// MIT License / Copyright 2014
"use strict";

let weave = require( '..' )
let repl = require( 'repl' )

weave.connectREPL = exports.connect = function ( input = process.stdin, output = process.stdout ) {
  process.nextTick( () => {
    let $ = repl.start( {
        prompt: '$ ', input, output
    } )

    $.context.weave = weave
    $.context.garden = weave.createGarden( 'weave repl' )
    $.context.$ = ( n = 'web' ) => Number.check( n ) ? weave.apps.anonymous[ n ] : weave.apps[ n ]
    $.context.$$ = ( n, d ) => { let x = $.context.$( n ).configuration; return d ? x[d] : x }
    $.context.v = weave.verbose
  })
}
