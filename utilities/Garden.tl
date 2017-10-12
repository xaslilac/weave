// MIT License / Copyright Tyler Washburn 2017
"use strict";



module 'events', 'util';

// Zen := module.exports = exports = function space {
//   zen := function {
//     zen.events.emit( 'log', { space: space, data: arguments } )
//     return console.log.apply( console, [ '[{{space}}]' ].concat( Array.from( arguments ) ) )
//   }
//
//   zen.space = space
//   zen.events = new events.EventEmitter()
//
//   zen.log = zen
//   zen.on = function { return zen.events.on.apply( zen.events, arguments ) }
//
//   return zen
// }

Garden := module.exports = exports = function ( name ) {
  if ( !this instanceof Garden ) {
    return new Garden()
  }

  this.name = name
}

Garden::log = function ( message, ...extra ) {
  process.stdout.write( "[{{this.name}}] \033[36m[log]\033[39m      " + util.inspect( message ) + "\n" )
  if extra.length { console.log( ...extra ) }
}

Garden::warning = function ( message, ...extra ) {
  process.stdout.write( "[{{this.name}}] \033[36m[warning]\033[39m  \033[33m" + util.inspect( message ) + "\033[39m\n" )
  if extra.length { console.log( ...extra ) }
}

Garden::error = function ( message, ...extra ) {
  process.stdout.write( "[{{this.name}}] \033[36m[error]\033[39m    \033[31m" + util.inspect( message ) + "\033[39m\n" )
  if extra.length { console.log( ...extra ) }
}
