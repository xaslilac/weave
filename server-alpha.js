// MIT License / Copyright 2015
"use strict";

var weave = require( './weave' )
var garden = new weave.Garden( 'weave.App' )

events=require('events');net=require('net');path=require('path');;
let Wildcard = require( './utilities/Wildcard' )

// n is a CRLF buffer, z is an end packet buffer.
const n = new Buffer('\r\n')
const z = new Buffer('0\r\n\r\n')

var alpha = net.createServer()

alpha.on( 'connection', function ( connection ) {
  connection.on( 'data', function ( data  ) {
    console.log( data.toString( 'utf-8' ) )
  })

  console.log( 'connected' )
})

alpha.listen( 80, '::' )
