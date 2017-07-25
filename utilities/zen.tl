// MIT License / Copyright Tyler Washburn 2017
"use strict";

// Logging is cool!
var Zen;



module 'events';

module.exports = exports = Zen = function space {
  var zen = function {
    zen.events.emit( 'log', { space: space, data: arguments } )
    return console.log.apply( console, [ '[{{space}}]' ].concat( Array.from( arguments ) ) )
  }

  zen.space = space
  zen.events = new events.EventEmitter()

  zen.log = zen
  zen.on = function { return zen.events.on.apply( zen.events, arguments ) }

  return zen
}
