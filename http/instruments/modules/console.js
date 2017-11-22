window.addEventListener( 'DOMContentLoaded', function () {
  let container = document.getElementById( 'console' )
  let input = document.getElementById( 'console-input' )
  let output = document.getElementById( 'console-output' )

  let history = JSON.parse( sessionStorage.replHistory || '[]' )
  history.position = -1

  instruments.socket.addEventListener( 'message', function ( message ) {
    let outputElement = document.createElement( 'pre' );
    let json = JSON.parse( message.data )

    if ( json.messageType === 'console-print' ) {
      outputElement.innerHTML = json.data
      outputElement.className = 'output'
    } else if ( json.messageType === 'console-error' ) {
      outputElement.innerHTML = '[' + json.error + '] ' + json.message
      outputElement.className = 'error'
    } else if ( json.messageType === 'console-log' ) {
      outputElement.innerHTML = '[' + json.space + '] ' + json.data
      outputElement.className = 'log'
    }

    output.appendChild( outputElement )
    container.scrollTop = output.scrollHeight
  })

  instruments.socket.addEventListener( 'close', function () {
    input.disabled = true
  })

  document.getElementById( 'console' ).addEventListener( 'click', function () {
    input.focus()
  })

  document.getElementById( 'console-input' ).addEventListener( 'keydown', function ( event ) {
    if ( event.shiftKey ) {
      console.log( event )
      if ( event.keyCode === 13 ) {
        console.log( "oh boy" )
        input.rows += 1
      }
    } else if ( event.keyCode === 13 ) {
      let inputElement = document.createElement( 'pre' );

      inputElement.innerHTML = input.value
      inputElement.className = 'input'
      output.appendChild( inputElement )

      // Limit to saving commands 1 time sequentially
      if ( history[0] !== input.value )
        history.unshift( input.value )

      history.position = -1
      history.current = ''

      sessionStorage.replHistory = JSON.stringify( history )

      instruments.socket.send( JSON.stringify({
        messageType: 'console-command',
        data: input.value
      }) )

      input.value = ''
      input.rows = 1

      event.preventDefault()
    } else if ( event.keyCode === 38 ) {
      if ( history.position === -1 ) history.current = input.value
      history.position = Math.min( history.position + 1, history.length - 1 )
      input.value = history[ history.position ]
    } else if ( event.keyCode === 40 ) {
      history.position = Math.max( history.position - 1, -1 )
      input.value = ~history.position ?
        history[ history.position ] : history.current
    }
  })
})
