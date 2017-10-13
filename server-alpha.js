var events, net, path;// MIT License / Copyright 2015
"use strict";

var weave = require( './weave' )
var garden = new weave.Garden( 'weave.App' )

// n is a CRLF buffer, z is an end packet buffer.
var n = new Buffer('\r\n')
var z = new Buffer('0\r\n\r\n')

events=require('events');net=require('net');path=require('path');;
var Wildcard = require( './utilities/Wildcard' )

var alpha = net.createServer()

alpha.on( 'connection', function ( connection  ) {
  connection.on( 'data', function ( data  ) {
    console.log( data.toString( 'utf-8' ) )
  })

  console.log( 'connected' )
})

alpha.listen( 80, '::' )
