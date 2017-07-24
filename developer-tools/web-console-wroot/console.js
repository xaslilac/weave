var consoleSocket = new WebSocket( 'ws://localhost/web-console/socket');
consoleSocket.onmessage = function ( message ) {
  if ( document.readyState !== "loading" ) {
    list( JSON.parse( message.data ) )
  } else document.onreadystatechange = function () {
    list( JSON.parse( message.data ) )
  }
}

function list( l ) {
  var x = document.createElement( 'li' ),
  c = document.getElementById( 'container' );
  x.innerHTML = "<--"
  x.onclick = function () {
    consoleSocket.send('<--')
  }
  c.appendChild( x )

  l.forEach( function ( thing ) {
    var t = document.createElement('li');
    t.innerHTML = thing
    t.onclick = function ( event ) {
      clicked( event, thing )
    }
    c.appendChild( t )
  })
}

function clicked( event, name ) {
  if ( event.altKey ) {
    var value = prompt('New value for ' + name);
    consoleSocket.send( name + "=" + value )
  } else {
    consoleSocket.send( name )
  }
}
