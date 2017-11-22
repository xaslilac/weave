var instruments = {
  // XXX: Fix this, it needs to conform to the url specified by the user
  socket: new WebSocket( `wss://${location.host}/instruments/socket` )
}
