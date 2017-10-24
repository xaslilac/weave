// MIT License / Copyright Kayla Washburn 2014
"use strict";

let weave = require( '../weave' )
let repl = require( 'repl' )

weave.connectREPL = exports.connect = function ( input = process.stdin, output = process.stdout ) {
  process.nextTick( () => {
    let $ = repl.start( {
        prompt: '$ ', input, output
    } )

    $.context.weave = weave
    $.context.$ = ( n = 'web' ) => Number.check( n ) ? weave.apps.anonymous[ n ] : weave.apps[ n ]
    $.context.$$ = ( n, d ) => { let x = $.context.$( n ).configuration; return d ? x[d] : x }
  })
}
