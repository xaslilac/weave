/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2014 */

let DOM = module.exports = exports = {
  HTMLDocument: function ( type, title ) {
    let doc = new DOM.Document( "html", type );

    // TODO: Make this robust. Define a getter and setter that alter the title element in head.
    doc.title = title
    doc.head = doc.baseElement.appendChild( new DOM.Head( title ) )
    doc.body = doc.baseElement.appendChild( new DOM.Body() )
    return doc
  },

	Document: function ( base, type ) {
		this.docType = type
		this.baseElement = new DOM.Element( base )
		this.nodeType = 9
	},

  Head: function ( title ) {
    let head = new DOM.Element( "head" )

    if ( title ) {
      head.appendChild( new DOM.Element( "title" ) )
          .appendChild( new DOM.TextNode( title ) )
      this.title = title
    }

    return head
  },

  Body: function () {
    return new DOM.Element( "body" )
  },

	Element: function ( tag ) {
    var e = this;

    Object.defineProperties( this, {
      innerHTML: {
        get: function () {
          let contents = '';
          e.children.forEach( child => contents += child.toString() )
          return contents
        },
        set: function ( value ) {
          e.children = [ new DOM.TextNode( value ) ]
        }
      },

      className: {
        get: function () {
          return e.attributes[ 'class' ]
        },
        set: function ( value ) {
          e.attributes[ 'class' ] = value
        }
      },

      href: {
        get: function () {
          return e.attributes[ 'href' ]
        },
        set: function ( value ) {
          e.attributes[ 'href' ] = value
        }
      }
    } )

		this.tagName = tag
		this.children = []
		this.attributes = {}
		this.nodeType = 1
	},

	TextNode: function (text ){
    this.text = text
    this.nodeType = 3
	},

	Comment: function (content ){
		this.text = "<!-- "+content+" -->"
		this.nodeType = 8
	}
}

DOM.Document.prototype.toString = function (document ){
  return "<!DOCTYPE "+this.docType+">\n"+this.baseElement.toString()
}

DOM.Element.prototype.toString = function (){
	var contents = "", attributes = "";

  Object.keys( this.attributes ).forEach( function (key ){
    attributes += ' '+key+'="'+this.attributes[key]+'"'
  }, this)

  contents += "<"+this.tagName+" "+attributes+">"
  this.children.forEach( function (child ){
    contents += child.toString()
  })
  contents += "</"+this.tagName+">"

  return contents
}

DOM.TextNode.prototype.toString = DOM.Comment.prototype.toString = function (){
  return this.text
}



DOM.Element.prototype.appendChild = function (child ){
  this.children.push( child )
  return child
}

DOM.Element.prototype.setAttribute = function (attr, value ){
  return this.attributes[ attr ] = value
}
