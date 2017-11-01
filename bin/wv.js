#!/usr/bin/env node
let weave = require( '..' )
let readline = require( 'readline' )

let progress = 0
let width = 50
let spinner = ['/','-','\\','-']

console.log( 'here we go' )

function start() {
  process.stdout.write( '[' )
  process.stdout.write( '-'.repeat( width ) )
  process.stdout.write( ']' )
  readline.moveCursor( process.stdout, width * -1 - 1, 0 )

  setTimeout( tick, 1000 )
}

function tick() {
  if ( progress >= width ) return;

  process.stdout.write( '+' )
  progress++
  setTimeout( tick, 100 )
}

start()
