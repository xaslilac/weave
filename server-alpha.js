// MIT License / Copyright 2015
"use strict";

let weave = require( './weave' )
let garden = new weave.Garden( 'weave.Server--ALPHA' )

let events = require('events')
let net = require('net')
let path = require('path')
let Wildcard = require( './utilities/Wildcard' )

// n is a CRLF buffer, z is an end packet buffer.
const n = new Buffer('\r\n')
const z = new Buffer('0\r\n\r\n')

var alpha = net.createServer()

alpha.on( 'connection', function ( connection ) {
  connection.on( 'data', function ( data ) {
    console.log( data.toString( 'utf-8' ) )
  })

  console.log( 'connected' )
})

alpha.listen( 80, '::' )
