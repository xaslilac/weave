// MIT License / Copyright 2014

module.exports = class Wildcard {
  constructor( string ) {
    if ( typeof string !== 'string' ) throw new TypeError( 'Wildcards are made out of strings!')
    if ( !/^[A-Za-z0-9\*\[\]\.\_\-\:]+$/.test( string ) ) throw new Error( 'Invalid character in wildcard!' )

  	this.expression = new RegExp( `^${
  		string
  		  .replace( /([\.\[\]])/g, '\\$1' ) // Make sure that special charaters are escaped before creating the expression
  		  .replace( /\*/g, '.+' ) // Turn * wildcards into . wildcards
  	}$` )
  	this.string = string
  }

  match( string ) {
    return this.expression.exec( string )
  }

  static match( wildcard, string ) {
    return new Wildcard( wildcard ).match( string )
  }

  static bestMatch( string, wildcards ) {
    let match = ""

    wildcards.forEach( wildcard => {
      if ( ( new Wildcard( wildcard ) ).match( string )
      && wildcard.length > match.length ) match = wildcard
    } )

    return match
  }
}
