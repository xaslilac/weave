/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2014 */

var DOM;

module.exports = exports = DOM = {
  HTMLDocument: function (type, title ){
    var doc = new DOM.Document( "html", type );
    doc.head = doc.baseElement.appendChild( new DOM.Head( title ) )
    doc.body = doc.baseElement.appendChild( new DOM.Body() )
    return doc
  },

	Document: function (base, type ){
		this.docType = type
		this.baseElement = new DOM.Element( base )
		this.nodeType = 9
	},

  Head: function (title ){
    var element = new DOM.Element( "head" )
    
    element.appendChild(
      new DOM.Element("title")
    ).appendChild(
      new DOM.TextNode( title )
    
    )
    this.title = title
    return element
  },

  Body: function (){
    return new DOM.Element( "body" )
  },

	Element: function (tag ){
		this.tagName = tag.toUpperCase()
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
    attributes += key+'="'+this.attributes[key]+'" '
  })

  contents += "<"+this.tagName+" "+attributes+">"
  this.children.forEach( function (child ){
    contents += child.toString()
  })
  contents += "</"+this.tagName+">"

  return contents
}

DOM.TextNode.prototype.toString =
DOM.Comment.prototype.toString = function (){
  return this.text
}



DOM.Element.prototype.appendChild = function (child ){
  this.children.push( child )
  return child
}