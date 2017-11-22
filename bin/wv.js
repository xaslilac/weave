#!/usr/bin/env node
// let weave = require( '..' )
let readline = require( 'readline' )
let { fork } = require( 'child_process' )
let garden = require( 'gardens' ).createGarden( 'blueberry' )
let { watch } = require( 'fs' )
let { join } = require( 'path' )

let progress = 0
let width = 50
let spinner = ['/','-','\\','-']
let alive, blueing = true

function start() {
  process.stdout.write( '[' )
  process.stdout.write( ' '.repeat( width ) )
  process.stdout.write( ']' )
  readline.moveCursor( process.stdout, width * -1 - 1, 0 )

  setTimeout( tick, 500 )
}

function tick() {
  if ( progress >= width ) return complete();

  process.stdout.write( '-' )
  progress++
  setTimeout( tick, 10 )
}

function complete() {
  readline.moveCursor( process.stdout, -51, 0 )
  boot()

  watch( join( __dirname, '..' ), {
    recursive: true
  }, reboot )

  watch( process.argv[ 2 ], reboot )
}

function boot() {
  alive = fork( process.argv[ 2 ], process.argv.slice( 3 ) )
  .on( 'exit', code => {
    if ( code > 0 ) setTimeout( boot, 1000 )
  })
  blueing = false
}

function reboot() {
  if ( !blueing ) {
    alive.kill()
    blueing = true
    garden.log( 'REBLUEING' )
    boot()
  }
}

// Testing again
setTimeout( start, 200 )
