// MIT License / Copyright 2015
"use strict";

import { createHtmlDocument } from '../utilities/dom'

export const createPageFromTemplate = title => {
  let document = createHtmlDocument( title )
  document.head.appendChild( documentStyle )
  return document }

export const documentStyle = new dom.StyleSheet({
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
    borderRadius: '7px',
    color: 'white', backgroundColor: '#242332' },
  'li': { padding: '2px' },
  '#directories a': { color: '#446bdf' },
  '#files       a': { color: '#108fcd' },
  'a': { fontWeight: 'bold', color: '#27cb81' }
})
