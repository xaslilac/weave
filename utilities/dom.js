// MIT License / Copyright Kayla Washburn 2014

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
}

class StyleSheet {
  constructor( styles ) {
    this.selectors = {}
    this.setStyles( styles )
  }

  toString() {
    return `<style type='text/css'>\n${
      Object.keys( this.selectors ).map( selector => {
        return `${selector} {\n${
        Object.keys( this.selectors[ selector ] ).map( prop => {
          return `  ${prop}: ${this.selectors[ selector ][ prop ]}`
        }).join(';\n')}\n}`
      }).join('\n\n')}\n</style>\n`
  }

  setStyles( styles ) {
    Object.keys( styles ).forEach( selector => {
      if ( this.selectors[ selector ] ) return Object.assign( this.selectors[ selector ], styles[ selector ] )
      this.selectors[ selector ] = styles[ selector ]
    })

    return this
  }
}


class	Element {
  constructor( tag ) {
		this.tagName = tag
		this.children = []
		this.attributes = {}
		this.nodeType = 1
	}

  toString() {
  	return `\n<${this.tagName} ${
      Object.keys( this.attributes ).map( key => `${key}='${this.attributes[ key ]}'` ).join( ' ' )
    }>` + this.children.map( child => child.toString() ).join( '' ) + `</${this.tagName}>\n`
  }

  appendChild( element ) {
    this.children.push( element )
    return element
  }

  setAttribute( attr, value ) {
    return this.attributes[ attr ] = value
  }

  get innerHTML() { return this.children.map( child => child.toString() ).join( '' ) }
  set innerHTML( value ) { this.children = [ new TextNode( value ) ] }

  get className() { return this.attributes[ 'class' ] }
  set className( value ) { this.attributes[ 'class' ] = value }

  get href() { return this.attributes[ 'href' ] }
  set href( value ) { this.attributes[ 'href' ] = value }
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
        get: function () {
          let title
          document.head.children.some( child => {
            if ( child.tagName !== 'title' ) return false

            title = child.innerHTML
            return true
          })
          return title
        },
        set: function ( title ) {
          document.head.children.some( child => {
            if ( child.tagName === 'title' ) child.innerHTML = title
          }) || ( document.head.appendChild( document.createElement( 'title' ) ).innerHTML = title )
        }
      }
    })

    if ( typeof title === 'string' ) document.title = title

    return document
  },

  Document, StyleSheet, Element, TextNode, Comment
}
