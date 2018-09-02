# This is a quick and dirty run down of the entire API for pros.
It gives bare-minimum information on all functions and properties. What arguments
they expect, what values they should hold and return, etc.

If you would like a more gentle introduction [read this](/documents/intro.md).

- `::` will be used to symbolize .prototype for classes
- `#` will be used to symbolize events that may be emitted
- `$`  will be used to symbolize command line features/flags
- `[]` may be used to symbolize optional arguments, or Array literals
- `|`  will be used to symbolize multiple options for an argument format
- `->` will be used to symbolize a return values
- `?:` will be used to symbolize fulfill and reject values of a Promise

## App options
These properties are all stored on `app.options`

```JavaScript
'location': string
// Set maximumFolderDepth to 0 for a "traditional" directory index behavior.
'indexes': { 'indexFileName': int maximumFolderDepth.. }
'extensions': string[  '.ext'.. ]
'htmlDirectoryListings': boolean
'jsonDirectoryListings': boolean
'mimeTypes': dictionary
'errorPages': { errorCode: pathToFile.. }
'redirect': { fromUrl: toUrl }
'headers': { 'Header-Name': 'Value' }
'forbidden': string[ 'path' ]
'forceDomain': string
'forceSecure': boolean
```

## Everything you need to know

### weave
```JavaScript
const weave = require( 'weave' )
weave( [behaviors] ) -> app
weave.version: versionNumber
```

### weave.App
```JavaScript
new weave.App( [behaviors] ) -> app
app.link( binding, hostname ) -> app
app#listening()
app.configure( rootDirBehaviors ) -> app
app.subdirectory( dirName[, superDirName | superDirBehaviors], dirBehaviors ) -> app
app.intercept( dirName: string, handle( exchange, manifest ) ) -> app
app.engine( extension: string, handle( fileBuffer, manifest, exchange ) -> promise)
app#exchange( exchange )               
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

### weave/utilities/mimedictionary
Utility to help manage MIME types
```JavaScript
let mime = require( 'weave/utilities/mimedictionary' )
mime.createDictionary( apacheFilePath | [ apacheFilePath.. ] | { type: [ str '.ext'.. ].. } ) -> dictionary
dictionary.define( type, [ extensions ] | { type: [ str '.ext'.. ] } )
dictionary.fromApacheFile( apacheFilePath[, encoding[, callback]] )
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
exchange.header( headerName, headerValue ) -> exchange
exchange.head([ status,] objOfHeaders ) -> exchange
exchange.hasBody() -> bool
exchange.write( content[, encoding] ) -> exchange
exchange.end( content[, encoding] ) -> exchange
exchange.redirect( location[, status] ) -> exchange
exchange.generateErrorPage( httpError ) -> undefined
```

#### weave.HTTPError
```JavaScript
new weave.HTTPError( statusCode[, description: str | error ] ) -> httpError
httpError.status: str statusName
httpError.statusCode: num statusCode
httpError.description: str description
// If description is an error object the stack will also be available
httpError.stack: str callstack
```
