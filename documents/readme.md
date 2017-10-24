# This is a quick and dirty run down of the entire API.
It gives bare-minimum information on all functions and properties. What arguments
they expect, what values they should hold and return, etc.

- `::` will be used to symbolize .prototype for classes
- `\#` will be used to symbolize events that may be emitted
- `$`  will be used to symbolize command line features/flags
- `[]` may be used to symbolize optional arguments, or Array literals
- `|`  will be used to symbolize multiple options for an argument format

## Flags
These flags can be enabled with command line arguments or programmatically. All flags
are exposed as functions on `weave.flags` and follow camelCase naming. (e.g. ---aww-heck-yes and awwHeckYes())
```
$ myWeaveApp --aww-heck-yes                                                      Try it for yourself! :)
$ myWeaveApp --weave-verbose                                                     Equivalent to weave.Garden.enableDebug()
$ myWeaveApp --enable-weave-repl                                                 Will enable a command line repl
$ myWeaveApp --enable-weave-instruments                                          Will allow calls to weave.attachInstruments
```

## Configuration behaviors
These properties can be set on the global `weave.configuration` object, on an `app.configuration`
object, using the `app.configure` method, or using the `app.subdirectory` method.

```
'location': str pathToRootWebDirectory
'indexes': { 'indexFileName': num maximumFolderDepth.. }                         Set maximumFolderDepth to 0 for a "traditional" directory index behavior.
'favoredExtensions': [ str '.ext'.. ]
'htmlDirectoryListings': bool enabled
'jsonDirectoryListings': bool enabled
'mimeTypes': dictionary
'errorPages': { errorCode: str pathToFile.. }
'engines': { '.ext': engine( content, details, connection ) -> Promise.. }
'cache': { maxCacheSize: num megabytes, maxCachedFileSize: num megabytes }       Can only be configured via weave.configuration as caches are global and shared
'redirect': { fromUrl: str toUrl }
'headers': { 'Header-Name': str 'value' }
```

## Everything you need to know

### weave
```
weave([ appName,][ behaviors ]) -> app
weave.version: versionNumber
weave.servers: { port: server.. }
weave.apps: { appName: app, anonymous: [ anonymousApps.. ] }
weave.hosts: { hostName: app }
weave.cache: { wildcardMatches: { hostname: wildcard } }
weave.constants.WebSocketUUID: UUID
weave.constants.HOME: userHomeDir
weave.constants.STATUS_CODES: { statusCode: statusName.. }
weave.configuration: { confProp: confValue.. }
weave.util.SHA1_64( data ) -> sha1Hash
weave.util.RNDM_RG( min, min, base ) -> randomNum

weave.attachInstruments( app, instrumentsUrl ) -> undefined                      Navigate your browser to app.host/instrumentUrl/panel to access instruments
```

### weave.App
```
new weave.App([ appName,][ behaviors ]) -> app
app.link( str 'hostname:port' | num port ) -> app
app#listening()
app.configure( rootDirBehaviors ) -> app
app.subdirectory( dirName[, superDirName | superDirBehaviors], dirBehaviors ) -> app
app.interface( dirName, handle[, str method | array ['methods'..]] ) -> app                               
app#configured( dirName, dirConf, appConf )
app#connection( connection )                                                     Automatically calls app.router
app#unconfigurable connection( connection )
app.router( connection ) -> undefined                                            Automatically calls app.printer
app.printer( httpError, manifest, connection ) -> undefined                      In the futute, app.router might return [ httpError, details, connection ]
                                                                                 We would then call app.printer( ...app.router( connection ) ) in weave.Connection
```

### weave.Dictionary
Utility to help manage MIME types
```
new weave.Dictionary( apacheFilePath |
  [ apacheFilePath.. ] | { type: [ str '.ext'.. ].. } ) -> dictionary
dictionary.define( type, [ extensions ] | { type: [ str '.ext'.. ] } )
dictionary.fromApacheFile( apacheFilePath[, encoding[, callback]] )
```

### weave.WebSocket
```
new weave.WebSocket( app, webSocketUrl, connectionListener ) -> ws
ws.attach( app, socketUrl ) -> ws
ws#connection( wsConnection )
```

### weave.WebSocketConnection
```
new weave.WebSocketConnection( ws, connection ) -> wsConnection
wsConnection#message( message{ buffer decoded[, str data] } )
wsConnection#close( message{ num code, str reason } )
wsConnection.send( data ) -> bool success
wsConnection.ping() -> bool success
wsConnection.close( code[, reason ] ) -> bool success
```

## Not so important

#### weave.Manifest
```
new weave.Manifest() -> manifest
manifest.isDirectory() -> bool
manifest.isFile()      -> bool
mainfest.isInterface() -> bool
manifest.isNA()        -> bool
manifest.extend( obj ) -> manifest
manifest.path: file path as resolved by app.router
manifest.result: the return value of the interface if isInterface() is true      This one is a weird property.
manifest.stats: fs.stats if isFile() or isDirectory() is true
manifest.type: str 'directory' | 'file' | 'interface'
manifest.url: connection.url
```

#### weave.Connection
```
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
```

#### weave.Garden
```
new weave.Garden( gardenName, verbose ) -> garden
Garden.enableDebug() -> undefined                                                Sets garden.verbose to true on all gardens
Garden.disableDebug() -> undefined                                               Sets garden.verbose to false on all gardens
garden.verbose: bool
garden.debug( things.. ) -> undefined                                            Only prints when garden.verbose is true
garden.log( things.. ) -> undefined
garden.warning( things.. ) -> undefined
garden.error( things.. ) -> undefined
```

#### weave.HTTPError
```
new weave.HTTPError( statusCode[, description ] ) -> httpError
httpError.status: str statusName
httpError.statusCode: num statusCode
httpError.description: str description
```
