// MIT License / Copyright 2015
"use strict";

const { createHtmlDocument, StyleSheet } = require( '../utilities/dom' )

exports.createPageFromTemplate = title => {
  let document = createHtmlDocument( title )
  document.head.appendChild( exports.documentStyle )

  let titleElement = document.body.appendChild( document.createElement( 'h1' ) )
  titleElement.innerHTML = title

  document.content = document.body.appendChild( document.createElement( 'section' ) )

  return document
}

exports.documentStyle = new StyleSheet({
  'html, body': {
    padding: 0, margin: 0,
    width: '100%', height: '100%',
    fontFamily: 'sans-serif' },
  'h1': {
    color: 'white', backgroundColor: '#446bdf',
    textShadow: '0 0 0.1em black',
    boxShadow: '0 0 1em black',
    padding: '20px', margin: 0
  },
  'section': {
    margin: '2em 1.5em'
  },
  'pre': {
    padding: '15px', margin: '15px',
    overflow: 'auto',
    borderRadius: '4px',
    color: 'white', backgroundColor: '#242332' },
  'li': { padding: '3px' },
  '#directories a': { color: '#446bdf' },
  '#files       a': { color: '#108fcd' },
  'a': { fontWeight: 'bold', color: '#27cb81', textDecoration: 'none' },
  'a:hover': { textDecoration: 'underline' }
})
