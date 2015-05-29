// MIT License / Copyright Tyler Washburn 2015
"use strict";

var weave, q, u, n, z;
weave = require( "./weave" )

Array::someAsync = function f,c {var a=@,i=0,v=!1,t={
  next:function {i<a.length?f.call(t,a[i],i++,t)&&(v=!0):c(v)},done:function {c(!0)}};t.next()}
Function::is = function a {return a!=null&&(a.constructor===@::constructor)}
Object.extend = function o,e {@keys(o).forEach(function p {if !e.hasOwnProperty(p){e[p]=o[p]}});return e}
q = function s { return s.split(",") },n = new Buffer("\r\n"),z = new Buffer("0\r\n\r\n")



module 'fs', 'path';

// WE NEED TO CONVERT THIS TO MATCH OUR NEW MODULES.
weave.Printer = function {
  return function error, details, connection {
  console.log( details.isFile )
    if !error {
      if details.isFile() {
        fs.readFile( function error, contents {
          connection.writeHeader( "Content-Type",
            connection.behavior( "mimes " + path.extname( details.path ) ) )
          connection.end( contents )
        })
      }
    }
  }
}
