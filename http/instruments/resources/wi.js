var wi = {
  // XXX: Fix this, it needs to conform to the url specified by the user
  socket: new WebSocket( `ws://${location.host}/instruments/socket` ),
  console: { history: [], toggle: function () {
    var container = document.getElementById( 'console' ),
    showing = getComputedStyle( container ).getPropertyValue( 'display' ) === 'block'

    if ( showing ) {
      container.style.setProperty( 'display', 'none' )
    } else {
      container.style.setProperty( 'display', 'block' )
    }
  } },
};

if ( sessionStorage.replHistory ) wi.console.history = JSON.parse( sessionStorage.replHistory )

wi.console.history.position = -1

wi.socket.addEventListener( 'message', function ( message ) {
  var outputElement = document.createElement( 'pre' );
  message.json = JSON.parse( message.data )

  if ( message.json.messageType === 'console-print' ) {
    outputElement.innerHTML = message.json.data
    outputElement.className = 'output'
  } else if ( message.json.messageType === 'console-error' ) {
    outputElement.innerHTML = '[' + message.json.error + '] ' + message.json.message
    outputElement.className = 'error'
  } else if ( message.json.messageType === 'console-log' ) {
    outputElement.innerHTML = '[' + message.json.space + '] ' + message.json.data
    outputElement.className = 'log'
  }

  wi.console.output.appendChild( outputElement )
  wi.console.container.scrollTop = wi.console.output.scrollHeight
})

wi.socket.addEventListener( 'close', function () {
  wi.console.input.disabled = true
})

window.addEventListener( 'DOMContentLoaded', function () {
  wi.console.container = document.getElementById( 'console' )
  wi.console.input = document.getElementById( 'console-input' )
  wi.console.output = document.getElementById( 'console-output' )

  document.getElementById( 'console' ).addEventListener( 'click', function () {
    wi.console.input.focus()
  })

  document.getElementById( 'console-toggle' ).addEventListener( 'click', function () {
    wi.console.toggle()
  })

  document.getElementById( 'console-input' ).addEventListener( 'keydown', function ( event ) {
    if ( event.shiftKey ) {
      console.log( event )
      if ( event.keyCode === 13 ) {
        console.log( "oh boy" )
        wi.console.input.rows += 1
      }
    } else if ( event.keyCode === 13 ) {
      var inputElement = document.createElement( 'pre' );

      inputElement.innerHTML = wi.console.input.value
      inputElement.className = 'input'
      wi.console.output.appendChild( inputElement )

      if ( wi.console.history[0] !== wi.console.input.value )
        wi.console.history.unshift( wi.console.input.value )
      wi.console.history.position = -1
      wi.console.history.current = ''

      sessionStorage.replHistory = JSON.stringify( wi.console.history )

      wi.socket.send( JSON.stringify({
        messageType: 'console-command',
        data: wi.console.input.value
      }) )

      wi.console.input.value = ''
      wi.console.input.rows = 1

      event.preventDefault()
    } else if ( event.keyCode === 38 ) {
      if ( wi.console.history.position === -1 ) wi.console.history.current = wi.console.input.value
      wi.console.history.position = Math.min( wi.console.history.position + 1, wi.console.history.length - 1 )
      wi.console.input.value = wi.console.history[ wi.console.history.position ]
    } else if ( event.keyCode === 40 ) {
      wi.console.history.position = Math.max( wi.console.history.position - 1, -1 )
      wi.console.input.value = ~wi.console.history.position ?
        wi.console.history[ wi.console.history.position ] : wi.console.history.current
    }
  })
})
