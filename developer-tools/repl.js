var repl, util;// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( '../weave' )



repl=require('repl');util=require('util');;

weave.connectREPL = function ( input, output  ) {
  setTimeout( function (  ) {
    // var input = "", prefix = "> ";
    // o.write( prefix )
    // i.on( "data", function data {
    //   var result;
    //   if data.length > 2 {
    //     try {
    //       input += data.toString( "utf-8" )
    //       console.log( eval( input ) )
    //
    //       // If the input is incomplete, eval will throw an error to
    //       // our catch statement, where we wait for more input.
    //       // If we made it this far, the input was complete, so we clear it.
    //       input = ""
    //       o.write( prefix )
    //     } catch e {
    //       weave.debug && console.log( global.e = e )
    //       o.write( "... " )
    //     }
    //   } else {
    //     input = ""
    //     o.write( prefix )
    //   }
    // })

    var $ = repl.start( {
        prompt: '$ ',
        input,
        output
    } )

    $.context.weave = weave
    $.context.$ = n => weave.apps[n]
    $.context.$$ = ( n, d ) => weave.apps[n].configuration[ d || "/" ]
  }, 400 )
}
