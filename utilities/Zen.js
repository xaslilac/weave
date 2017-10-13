var events;// MIT License / Copyright Tyler Washburn 2017
"use strict";



events=require('events');;

var Zen = module.exports = exports = function ( space  ) {
  var zen = function (  ) {
    zen.events.emit( 'log', { space: space, data: arguments } )
    return console.log.apply( console, [ '['+space+']' ].concat( Array.from( arguments ) ) )
  }

  zen.space = space
  zen.events = new events.EventEmitter()

  zen.log = zen
  zen.on = function (  ) { return zen.events.on.apply( zen.events, arguments ) }

  return zen
}

// Zen := module.exports = exports = {
//   Garden: function ( name ) {
//     if ( !this instanceof Zen.Garden ) {
//       return new Zen.Garden()
//     }
//   }
// }
//
// Zen.Garden::log = function () {
//   console.log.apply( console, arguments )
// }
