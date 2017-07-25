var consoleSocket = new WebSocket( 'ws://192.168.0.12/web-console/socket'), replInput, replOutput, replHistory = [];

if ( sessionStorage.replHistory ) replHistory = JSON.parse( sessionStorage.replHistory )

replHistory.position = -1

consoleSocket.addEventListener( 'message', function ( message ) {
  var outputElement = document.createElement( 'pre' );
  message.json = JSON.parse( message.data )

  if ( message.json.replyType === 'repl-print' ) {
    outputElement.innerHTML = message.json.data
    outputElement.className = 'output'
  } else if ( message.json.replyType === 'error' ) {
    outputElement.innerHTML = '[' + message.json.error + '] ' + message.json.message
    outputElement.className = 'error'
  }

  replOutput.appendChild( outputElement )
  replOutput.scrollTop = replOutput.scrollHeight
})

window.addEventListener( 'DOMContentLoaded', function () {
  replInput = document.getElementById( 'repl-input' )
  replOutput = document.getElementById( 'repl-output' )

  document.getElementById( 'repl' ).addEventListener( 'click', function () {
    replInput.focus()
  })

  document.getElementById( 'repl-input' ).addEventListener( 'keydown', function ( event ) {
    if ( event.shiftKey ) {
      console.log( event )
      if ( event.keyCode === 13 ) {
        console.log( "oh boy" )
        replInput.rows += 1
      }
    } else if ( event.keyCode === 13 ) {
      var inputElement = document.createElement( 'pre' );

      inputElement.innerHTML = replInput.value
      inputElement.className = 'input'
      replOutput.appendChild( inputElement )

      if ( replHistory[0] !== replInput.value )
        replHistory.unshift( replInput.value )
      replHistory.position = -1
      replHistory.current = ''

      sessionStorage.replHistory = JSON.stringify( replHistory )

      consoleSocket.send( JSON.stringify({
        actionType: 'repl-command',
        data: replInput.value
      }) )

      replInput.value = ''
      replInput.rows = 1

      event.preventDefault()
    } else if ( event.keyCode === 38 ) {
      if ( replHistory.position === -1 ) replHistory.current = replInput.value
      replHistory.position = Math.min( replHistory.position + 1, replHistory.length - 1 )
      replInput.value = replHistory[ replHistory.position ]
    } else if ( event.keyCode === 40 ) {
      replHistory.position = Math.max( replHistory.position - 1, -1 )
      replInput.value = ~replHistory.position ?
        replHistory[ replHistory.position ] : replHistory.current
    }
  })
})
