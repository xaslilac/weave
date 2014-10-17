/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2014 */

var DOM;

module.exports = exports = DOM = {
	Document: function base, type {
		@docType = type
		@baseElement = new DOM.Element( base )
		@nodeType = 9
	},

  Head: function title {
    @appendChild(
      new DOM.Element("title").appendChild(
        new DOM.TextNode( title )
      )
    )
    @title = title
  },

  Body: function {

  },

	Element: function tag {
		@tagName = tag.toUpperCase()
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
}

DOM.TextNode::toString =
DOM.Comment::toString = function {
  return @text
}



DOM.Element::appendChild = function child {
  @children.push( child )
}