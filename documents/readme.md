# This is a quick and dirty run down of the entire API.
It gives bare-minimum information on all functions and properties. What arguments
they expect, what values they should hold and return, etc.

- `::` will be used to symbolize .prototype for classes
- `#` will be used to symbolize events that may be emitted
- `$`  will be used to symbolize command line features/flags
- `[]` may be used to symbolize optional arguments, or Array literals
- `|`  will be used to symbolize multiple options for an argument format
- `->` will be used to symbolize a return values
- `?:` will be used to symbolize fulfill and reject values of a Promise

### Command Line
When installed using the npm `-g` flag, you will be given the command `weave-demo`
which, as the name implies, runs a demo server which will host a website on port 80.
All flags are exposed as functions on `weave.flags` and follow camelCase naming.
(e.g. `---aww-heck-yes` and `weave.flags.awwHeckYes()`)
```Shell
$ weave-demo # Starts a server that will present a demo website on port 80
$ myWeaveApp --aww-heck-yes # Try it for yourself! :)
$ myWeaveApp --weave-verbose
$ myWeaveApp --enable-weave-repl # Will enable a command line repl
$ myWeaveApp --enable-weave-instruments # Will allow calls to weave.attachInstruments
$ myWeaveApp --enable-interface-engine # Enables experimental implementation
$ myWeaveApp --enable-react-engine # Enables transpiling of `.jsx` files
```

## Configuration behaviors
These properties can be set on the global `weave.configuration` object, on an
`app.configuration` object, using the `app.configure` method, or using the `app.subdirectory` method.

```JavaScript
'location': str pathToRootWebDirectory
// Set maximumFolderDepth to 0 for a "traditional" directory index behavior.
'indexes': { 'indexFileName': num maximumFolderDepth.. }
'extensions': [ str '.ext'.. ]
'htmlDirectoryListings': bool enabled
'jsonDirectoryListings': bool enabled
'mimeTypes': dictionary
'errorPages': { errorCode: str pathToFile.. }
'engines': { '.ext': engine( content, details, exchange ) -> Promise.. }
// Can only be configured via weave.configuration
'cache': { maxCacheSize: num megabytes, maxCachedFileSize: num megabytes }
'redirect': { fromUrl: str toUrl }
'headers': { 'Header-Name': str 'value' }
// Can only be configured via weave.logOutputPath
'logOutputPath': str 'path.log'
'access': bool | obj { 'path': bool }
'domain': str 'forceddomain.com'
'secure': bool
```

## Everything you need to know

### weave
```JavaScript
const weave = require( 'weave' )
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
// Requires --enable-weave-instruments
// Navigate your browser to app.host/instrumentUrl/panel to access instruments
weave.attachInstruments( app, instrumentsUrl ) -> undefined
```

### weave.App
```JavaScript
new weave.App([ appName,][ behaviors ]) -> app
app.garden: garden
app.link( str 'hostname:port' | num port ) -> app
app#listening()
app.configure( rootDirBehaviors ) -> app
app.subdirectory( dirName[, superDirName | superDirBehaviors], dirBehaviors ) -> app
app.interface( dirName, handle( exchange, manifest ) -> promise[, str method | array ['methods'..]] ) -> app
app.engine( str extension, handle( fileBuffer, manifest, exchange ) -> promise)
app.redirect( str from, str to )
app.header( str name, str value )
// settings takes the same values as node's https.createServer. host is optional.
// If not included, Weave will automatically forward all connections on port 443
// to this app. It should be noted that all calls to app.link after this will be
// linked as secure servers using the provided settings. Any unsecured hosts that
// you wish to use must be linked before securing the app.
app.secure( obj settings[, host ] )
app#exchange( exchange )
app.router( exchange ) -> undefined
app.printer( httpError, manifest, exchange ) -> undefined                   
```

#### Promises
Though not required, interface handles and engine handles are both expected
to return Promises. However, returning a value is equivalent to fulfilling the
Promise with a value, and throwing a value is equivalent to rejecting it.
Both methods are acceptable, though Promises allow for you to work asynchronously.

#### app.interface Promises
If the interface can satisfy the request with a response, it should fulfill
the promise. If not, it should reject it with either an error object, or a
configuration object specifying the behaviors for Weave to continue with.

#### app.engine Promises
If the engine can successfully transform the fileBuffer, it should fulfill the
promise with a new fileBuffer to write to the client. If there is an error, it
should reject the promise with that error information.

### weave.Dictionary
Utility to help manage MIME types
```JavaScript
new weave.Dictionary( apacheFilePath | [ apacheFilePath.. ] | { type: [ str '.ext'.. ].. } ) -> dictionary
dictionary.define( type, [ extensions ] | { type: [ str '.ext'.. ] } )
dictionary.fromApacheFile( apacheFilePath[, encoding[, callback]] )
```

### weave.WebSocket
```JavaScript
new weave.WebSocket( app, webSocketUrl, connectionListener ) -> ws
ws.attach( app, socketUrl ) -> ws
ws#connection( wsConnection )
```

### weave.WebSocketConnection
```JavaScript
new weave.WebSocketConnection( ws, exchange ) -> wsConnection
wsConnection#message( message{ buffer decoded[, str data] } )
wsConnection#close( message{ num code, str reason } )
wsConnection.send( data ) -> bool success
wsConnection.ping() -> bool success
wsConnection.close( code[, reason ] ) -> bool success
```

## Not so important (Private APIs)

#### weave.Manifest
```JavaScript
new weave.Manifest() -> manifest
manifest.isDirectory() -> bool
manifest.isFile()      -> bool
mainfest.isInterface() -> bool
manifest.isNA()        -> bool
manifest.extend( obj ) -> manifest
manifest.path: file path as resolved by app.router
manifest.stats: fs.stats if isFile() or isDirectory() is true
manifest.type: str 'directory' | 'file' | 'interface'
manifest.url: connection.url
```

#### weave.Exchange
```JavaScript
new weave.Exchange( clientRequest, serverResponse ) -> exchange
exchange.behavior( behaviorName ) -> behaviorValue
exchange.detail( headerName[, untampered ] ) -> headerValue
exchange.status( statusCode ) -> exchange
exchange.writeHeader( headerName, headerValue ) -> exchange
exchange.writeHead([ status,] objOfHeaders ) -> exchange
exchange.endHead( headerName, headerValue ) -> exchange
exchange.hasBody() -> bool
exchange.write( content[, encoding] ) -> exchange
exchange.end( content[, encoding] ) -> exchange
exchange.redirect( location[, status] ) -> exchange
exchange.generateErrorPage( httpError ) -> undefined
```

#### weave.cache
```JavaScript
weave.cache( filePath, stats ) -> Promise ? contents : error
```

#### Gardens
**IMPORTANT NOTE:** Each piece of Weave (each file) and each instance of `weave.App`
has it's own unique garden that it logs to in order to help debugging and tracing
where things are happening. For things that might be *our* fault, we should use the garden
instance in the context of where we made as error. Anything that we want to log
that is *directly* due to receiving invalid input from a user should be logged to
the `app.garden` on the corresponding app.
```JavaScript
weave.createGarden( gardenName, verbose ) -> garden
garden.isVerbose() -> bool garden.verbose | Garden.verbose
// Only prints when garden.verbose is true
garden.debug( things.. ) -> undefined
// Only prints when garden.verbose is true
garden.trace( things.. ) -> undefined
garden.log( things.. ) -> undefined
garden.warning( things.. ) -> undefined
garden.error( things.. ) -> undefined
garden.typeerror( things.. ) -> undefined
```

#### weave.HTTPError
```JavaScript
new weave.HTTPError( statusCode[, description ] ) -> httpError
httpError.status: str statusName
httpError.statusCode: num statusCode
httpError.description: str description
```
