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

Garden::log = function ( message ) {
  process.stdout.write( "[{{this.name}}] \033[36m[log]\033[39m      " + util.inspect( message ) + "\n" )
}

Garden::warning = function ( message ) {
  process.stdout.write( "[{{this.name}}] \033[36m[warning]\033[39m  \033[33m" + util.inspect( message ) + "\033[39m\n" )
}

Garden::error = function ( message ) {
  process.stdout.write( "[{{this.name}}] \033[36m[error]\033[39m    \033[31m" + util.inspect( message ) + "\033[39m\n" )
}

Garden::kill = function () {

}

    // sandbox.colors = [
    //   "36", "33", "35", "34", "31" ]
    //
    // out.write( "\033[" + this.colors[ Math.min( 4, level ) ] + "m" +
    //   name + "\033[39m  " )
    //
    // title && out.write( "\033[4m\033[37m" + title + "\033[39m\033[24m\n" )
    // out.write( description + "\n" )
    // point && out.write( "\n" + this.trace( point ) + "\n" )
