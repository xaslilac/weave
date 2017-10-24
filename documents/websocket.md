# weave.WebSocket

## Overview
Weave already includes everything you need to use WebSockets as a communication
channel between the browser and your server.

## Usage

```JavaScript
let webSocket = new weave.WebSocket( appName || app, url )

webSocket.on( 'connection', connection => {
  connection.on( 'message', message => {
    console.log( message.data )
  })

  connection.send( 'Welcome!' )
})
```
