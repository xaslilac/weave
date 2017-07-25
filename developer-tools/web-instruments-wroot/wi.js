var wi = {
  socket: new WebSocket( 'ws://192.168.0.12/web-instruments/socket'),
  repl: { history: [], toggle: function () {
    var container = document.getElementById( 'repl' ),
    showing = getComputedStyle( container ).getPropertyValue( 'display' ) === 'block'

    if ( showing ) {
      container.style.setProperty( 'display', 'none' )
    } else {
      document.getElementById( 'log' ).style.setProperty( 'display', 'none' )
      container.style.setProperty( 'display', 'block' )
    }
  } },
  log: { toggle: function () {
    var container = document.getElementById( 'log' ),
    showing = getComputedStyle( container ).getPropertyValue( 'display' ) === 'block'

    if ( showing ) {
      container.style.setProperty( 'display', 'none' )
    } else {
      document.getElementById( 'repl' ).style.setProperty( 'display', 'none' )
      container.style.setProperty( 'display', 'block' )
    }
  } },
};

if ( sessionStorage.replHistory ) wi.repl.history = JSON.parse( sessionStorage.replHistory )

wi.repl.history.position = -1

wi.socket.addEventListener( 'message', function ( message ) {
  var outputElement = document.createElement( 'pre' );
  message.json = JSON.parse( message.data )

  if ( message.json.messageType === 'repl-print' ) {
    outputElement.innerHTML = message.json.data
    outputElement.className = 'output'

    wi.repl.output.appendChild( outputElement )
    wi.repl.output.scrollTop = wi.repl.output.scrollHeight
  } else if ( message.json.messageType === 'repl-error' ) {
    outputElement.innerHTML = '[' + message.json.error + '] ' + message.json.message
    outputElement.className = 'error'

    wi.repl.output.appendChild( outputElement )
    wi.repl.output.scrollTop = wi.repl.output.scrollHeight
  } else if ( message.json.messageType === 'log' ) {
    outputElement.innerHTML = '[' + message.json.space + '] ' + message.json.data
    outputElement.className = 'log'

    wi.log.output.appendChild( outputElement )
    wi.repl.output.scrollTop = wi.repl.output.scrollHeight
  }
})

window.addEventListener( 'DOMContentLoaded', function () {
  wi.repl.input = document.getElementById( 'repl-input' )
  wi.repl.output = document.getElementById( 'repl-output' )
  wi.log.output = document.getElementById( 'log-output' )

  document.getElementById( 'repl' ).addEventListener( 'click', function () {
    wi.repl.input.focus()
  })

  document.getElementById( 'repl-toggle' ).addEventListener( 'click', function () {
    wi.repl.toggle()
  })

  document.getElementById( 'log-toggle' ).addEventListener( 'click', function () {
    wi.log.toggle()
  })

  document.getElementById( 'repl-input' ).addEventListener( 'keydown', function ( event ) {
    if ( event.shiftKey ) {
      console.log( event )
      if ( event.keyCode === 13 ) {
        console.log( "oh boy" )
        wi.repl.input.rows += 1
      }
    } else if ( event.keyCode === 13 ) {
      var inputElement = document.createElement( 'pre' );

      inputElement.innerHTML = wi.repl.input.value
      inputElement.className = 'input'
      wi.repl.output.appendChild( inputElement )

      if ( wi.repl.history[0] !== wi.repl.input.value )
        wi.repl.history.unshift( wi.repl.input.value )
      wi.repl.history.position = -1
      wi.repl.history.current = ''

      sessionStorage.replHistory = JSON.stringify( wi.repl.history )

      wi.socket.send( JSON.stringify({
        messageType: 'repl-command',
        data: wi.repl.input.value
      }) )

      wi.repl.input.value = ''
      wi.repl.input.rows = 1

      event.preventDefault()
    } else if ( event.keyCode === 38 ) {
      if ( wi.repl.history.position === -1 ) wi.repl.history.current = wi.repl.input.value
      wi.repl.history.position = Math.min( wi.repl.history.position + 1, wi.repl.history.length - 1 )
      wi.repl.input.value = wi.repl.history[ wi.repl.history.position ]
    } else if ( event.keyCode === 40 ) {
      wi.repl.history.position = Math.max( wi.repl.history.position - 1, -1 )
      wi.repl.input.value = ~wi.repl.history.position ?
        wi.repl.history[ wi.repl.history.position ] : wi.repl.history.current
    }
  })
})
