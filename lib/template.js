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
  'table': { textAlign: 'left', width: '100%', whiteSpace: 'nowrap' },
  'th': { padding: '1.5em 2em 0.5em 0' },
  'td': { padding: '3px 2em 3px 0' },
  'th:first-child, td:first-child': { width: '100%' },
  'a': { fontWeight: 'bold', color: '#108fcd', textDecoration: 'none' },
  'a:hover': { textDecoration: 'underline' }
})
