// MIT License / Copyright 2014
"use strict";

class Window {
  constructor() {
    Object.assign( this, {
      setTimeout, setInterval, clearTimeout, clearInterval,
      document: dom.createHtmlDocument()
    })
  }
}

class Document {
  constructor( base, docType ) {
    this.docType = docType
    this.baseElement = new Element( base )
    this.nodeType = 9
  }

  toString() {
    return `<!DOCTYPE ${this.docType}>\n${this.baseElement.toString()}`
  }

  createElement( type ) {
    return new Element( type )
  }

  createStyleSheet( styles ) {
    return this.head.appendChild( new StyleSheet( styles ) )
  }

  getElementById( id ) {
    let found
    let recurse = children =>
      children.some( child => {
        if ( child.id === id ) {
          found = child
          return true
        } else if ( child instanceof Element ) return recurse( child.children )
      })

    recurse( this.baseElement.children )

    return found
  }
}

class StyleSheet {
  constructor( styles ) {
    this.selectors = {}
    this.setStyles( styles )
  }

  toString() {
    return `<style type='text/css'>\n${
      Object.keys( this.selectors ).map( selector => `${selector} {\n${
        Object.keys( this.selectors[ selector ] ).map( prop =>
          `  ${prop.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)}: ${this.selectors[ selector ][ prop ]}`).join(';\n')}\n}`).join('\n\n')}\n</style>\n`
  }

  setStyles( styles ) {
    Object.keys( styles ).forEach( selector => {
      if ( this.selectors[ selector ] ) return Object.assign( this.selectors[ selector ], styles[ selector ] )
      this.selectors[ selector ] = styles[ selector ]
    })

    return this
  }
}

class Element {
  constructor( tag ) {
    this.tagName = tag
    this.children = []
    this.attributes = {}
    this.nodeType = 1
  }

  toString() {
  	return `\n<${this.tagName}${
      Object.keys( this.attributes ).map( key => ` ${key}='${this.attributes[ key ]}'` ).join( '' )
    }>${this.children.map( child => child.toString() ).join( '' )}</${this.tagName}>\n`
  }

  insertBefore( element, before ) {
    let foundAt = this.children.indexOf( before )

    if ( foundAt < 0 ) throw new Error( `Element ${ before.toString() } is not a child of ${ this.toString() }` )

    this.children.splice( foundAt, 0, [ element ] )
  }

  appendChild( element ) {
    this.children.push( element )
    return element
  }

  setAttribute( attr, value ) {
    this.attributes[ attr ] = value
  }

  get id() { return this.attributes.id }
  set id( value ) { this.attributes.id = value }

  get innerHTML() { return this.children.map( child => child.toString() ).join( '' ) }
  set innerHTML( value ) { this.children = [ new TextNode( value ) ] }

  get className() { return this.attributes.class }
  set className( value ) { this.attributes.class = value }

  get href() { return this.attributes.href }
  set href( value ) { this.attributes.href = value }
}

class TextNode {
  constructor( text ) {
    this.text = text
    this.nodeType = 3
  }

  toString() {
    return this.text
  }
}

class Comment {
  constructor( text ) {
    this.text = text
    this.nodeType = 8
  }

  toString() {
    return `<!-- ${this.text} -->`
  }
}

let dom = module.exports = exports = {
  createDocument( base, docType ) { return new Document( base, docType ) },

  createHtmlDocument( title, docType = 'html' ) {
    let document = dom.createDocument( 'html', docType );

    Object.defineProperties( document, {
      head: {
        value: document.baseElement.appendChild( document.createElement( 'head' ) ),
        enumerable: true },
      body: {
        value: document.baseElement.appendChild( document.createElement( 'body' ) ),
        enumerable: true },
      title: {
        get() {
          let value
          document.head.children.some( child => {
            if ( child.tagName !== 'title' ) return false

            title = child.innerHTML
            return true
          })
          return value
        },
        set( value ) {
          document.head.children.some( child => {
            if ( child.tagName === 'title' ) child.innerHTML = value
          }) || ( document.head.appendChild( document.createElement( 'title' ) ).innerHTML = value )
        }
      }
    })

    if ( typeof title === 'string' ) document.title = title

    return document
  },

  parseHtml( string ) {
    let document = dom.createHtmlDocument()
    document.body.appendChild( document.createElement( 'p' ) ).innerHTML = 'im trying!!!!'
    document.body.appendChild( document.createElement( 'pre' ) ).innerHTML = string.replace( /</g, '&lt;' )
    return document
  },

  Document, StyleSheet, Element, TextNode, Comment
}
