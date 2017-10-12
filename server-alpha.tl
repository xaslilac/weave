// MIT License / Copyright 2015
"use strict";

weave := require( './weave' )
garden := new weave.Garden( 'weave.App' )

// n is a CRLF buffer, z is an end packet buffer.
n := new Buffer('\r\n')
z := new Buffer('0\r\n\r\n')

module 'events', 'net', 'path';
Wildcard := require( './utilities/Wildcard' )

alpha := net.createServer()

alpha.on( 'connection', function connection {
  connection.on( 'data', function data {
    console.log( data.toString( 'utf-8' ) )
  })

  console.log( 'connected' )
})

alpha.on( 'listening', function {
  console.log('serving')
})

alpha.listen( 80, '::' )
