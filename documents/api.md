# This is a quick and dirty run down of the entire API.
It gives bare-minimum information on all functions and properties. What arguments
they expect, what values they should hold and return, etc.

- :: will be used to symbolize .prototype for classes
- \# will be used to symbolize events that may be emitted
- $  will be used to symbolize command line features/flags

```
$ myWeaveApp --aww-heck-yes: logs 'aww heck yes' if weave is loaded fully
$ myWeaveApp --weave-verbose: weave will log all the things
$ myWeaveApp --enable-weave-repl: will enable a command line repl
$ myWeaveApp --enable-weave-instruments: will allow calls to weave.attachInstruments

weave([ appName, behaviors ]) -> app
weave.version: versionNumber
weave.servers: { port: server.. }
weave.apps: { appName: app, anonymous: [ anonymousApps.. ] }
weave.hosts: { hostName: app }
weave.cache: { wildcardMatches: { hostname: wildcard } }
weave.constants.WebSocketUUID: UUID
weave.constants.HOME: userHomeDir
weave.constants.STATUS_CODES: { statusCode: statusName.. }
weave.constants.STATUS_DESCRIPTIONS: { statusCode: longStatusDescription.. }
weave.configuration: { confProp: confValue.. }
weave.util.SHA1_64( data ) -> sha1Hash
weave.util.RNDM_RG( min, min, base ) -> randomNum
weave.util.READ_BITS( byte ) [ bool.. ]
weave.util.BINARY_UINT( [ bool.. ] ) -> num
weave.util.times( i, task ) -> undefined

weave.attachInstruments( app, instrumentsUrl ) -> undefined                      Navigate your browser to app.host/instrumentUrl/panel to access instruments

new weave.Dictionary( apacheFilePath |
  [ apacheFilePath.. ] | { type: [ str '.ext'.. ].. } ) -> dictionary
dictionary.define( type, [ extensions ] | { type: [ str '.ext'.. ] } )
dictionary.fromApacheFile( apacheFilePath[, encoding[, callback]] )

new weave.Garden( gardenName, verbose ) -> garden
Garden.enableDebug()                                                             Sets garden.verbose to true on all gardens
garden.verbose: bool
garden.debug( things.. ) -> undefined                                            Only prints when garden.verbose is true
garden.log( things.. ) -> undefined
garden.warning( things.. ) -> undefined
garden.error( things.. ) -> undefined

new weave.HTTPError( statusCode[, description ] ) -> httpError
httpError.status: statusName
httpError.statusCode: statusCode
httpError.description: description | longStatusDescription

new weave.App([ appName, behaviors ]) -> app
app.link( str 'hostname:port' | num port ) -> app
app#listening()
app.configure( rootDirBehaviors ) -> app
app.subdirectory( dirName[, superDirName | superDirBehaviors], dirBehaviors ) -> app
app.interface( dirName, func ) -> app
app#configured( dirName, dirConf, appConf )
app#connection( connection )                                                     Automatically calls app.router
app#unconfigurable connection( connection )
app.router( connection ) -> undefined                                            Automatically calls app.printer
app.printer( httpError, manifest, connection ) -> undefined                      In the futute, app.router might return [ httpError, details, connection ]
                                                                                 We would then call app.printer( ...app.router( connection ) ) in weave.Connection
new weave.Manifest() -> manifest
manifest.isDirectory() -> bool
manifest.isFile()      -> bool
mainfest.isInterface() -> bool
manifest.isNA()        -> bool
manifest.extend( obj ) -> manifest
manifest.path: file path as resolved by app.router
manifest.result: the return value of the interface if isInterface() is true
manifest.stats: fs.stats if isFile() or isDirectory() is true
manifest.type: str
manifest.url: connection.url

new weave.Connection( clientRequest, serverResponse ) -> connection
connection.behavior( behaviorName ) -> behaviorValue
connection.detail( headerName[, untampered ] ) -> headerValue
connection.status( statusCode ) -> connection
connection.writeHeader( headerName, headerValue ) -> connection
connection.writeHead([ status,] objOfHeaders ) -> connection
connection.endHead( headerName, headerValue ) -> connection
connection.hasBody() -> bool
connection.write( content[, encoding] ) -> connection
connection.end( content[, encoding] ) -> connection
connection.redirect( location[, status] ) -> connection
connection.generateErrorPage( httpError ) -> undefined

new weave.WebSocketConnection( ws, connection ) -> wsConnection
wsConnection.handshake() -> undefined                                            Called automatically on connection, mostly a private api
wsConnection.decode( data ) -> wsFrame                                           This type needs to be better defined
wsConnection.send( data ) -> bool success
wsConnection.ping() -> bool success
wsConnection.close( code[, reason[, message]] ) -> bool success

new weave.WebSocket( app, webSocketUrl, connectionListener ) -> ws
ws.attach( app, socketUrl ) -> ws
ws#connection( wsConnection )
```
