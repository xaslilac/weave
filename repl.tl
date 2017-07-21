// MIT License / Copyright Tyler Washburn 2015
"use strict";

// n is a CRLF buffer, z is an end packet buffer.
var weave = require( './weave' ), n = new Buffer('\r\n'), z = new Buffer('0\r\n\r\n'),
$ = function n { return weave.getAppByName( n ) },
$$ = function n, d { return $(n).configuration[ d || "/" ] };



module 'util';

weave.getAppByName = function n {
  var match;
  Object.keys( weave.apps ).some( function app {
    if weave.apps[ app ].appName === n {
      match = weave.apps[ app ]
      return true;
    }
  })
  return match;
}

weave.EnableREPL = function i, o {
  setTimeout( function {
    var input = "", prefix = "> ";
    o.write( prefix )
    i.on( "data", function data {
      var result;
      if data.length > 2 {
        try {
          input += data.toString( "utf-8" )
          console.log( eval( input ) )

          // If the input is incomplete, eval will throw an error to
          // our catch statement, where we wait for more input.
          // If we made it this far, the input was complete, so we clear it.
          input = ""
          o.write( prefix )
        } catch e {
          o.write( "... " )
        }
      } else {
        input = ""
        o.write( prefix )
      }
    })
  }, 400 )
}

// Crazy experimental!!
weave.__SelfUpdate = function {
  i.removeAllListeners('data')
  require.cache = {}
  require( './weave' )
}
