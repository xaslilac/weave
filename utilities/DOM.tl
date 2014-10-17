/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2014 */

var DOM;

module.exports = exports = DOM = {
  HTMLDocument: function type, title {
    var doc = new DOM.Document( "html", type );
    doc.head = doc.baseElement.appendChild( new DOM.Head( title ) )
    doc.body = doc.baseElement.appendChild( new DOM.Body() )
    return doc
  },

	Document: function base, type {
		@docType = type
		@baseElement = new DOM.Element( base )
		@nodeType = 9
	},

  Head: function title {
    var element = new DOM.Element( "head" )

    element.appendChild(
      new DOM.Element("title")
    ).appendChild(
      new DOM.TextNode( title )
    
    )
    @title = title
    return element
  },

  Body: function {
    return new DOM.Element( "body" )
  },

	Element: function tag {
		@tagName = tag
		@children = []
		@attributes = {}
		@nodeType = 1
	},

	TextNode: function text {
    @text = text
    @nodeType = 3
	},

	Comment: function content {
		@text = "<!-- {{content}} -->"
		@nodeType = 8
	}
}

DOM.Document::toString = function document {
  return "<!DOCTYPE {{@docType}}>\n{{@baseElement.toString()}}"
}

DOM.Element::toString = function {
	var contents = "", attributes = "";

  Object.keys( @attributes ).forEach( function key {
    attributes += '{{key}}="{{@attributes[key]}}" '
  })

  contents += "<{{@tagName}} {{attributes}}>"
  @children.forEach( function child {
    contents += child.toString()
  })
  contents += "</{{@tagName}}>"

  return contents
}

DOM.TextNode::toString =
DOM.Comment::toString = function {
  return @text
}



DOM.Element::appendChild = function child {
  @children.push( child )
  return child
}