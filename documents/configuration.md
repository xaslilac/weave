# This is a quick and dirty run down of the configuration API.
It gives bare-minimum information on configurable properties, and what values
they are expected to hold. These properties can be set on the global weave.configuration
object, on an app.configuration object, using the app.configure method, or using the
app.subdirectory method.

```
'location': pathToRootWebDirectory
'indexes': { 'indexFileName': maximumFolderDepth.. }
'favoredExtensions': [ '.ext'.. ]
'htmlDirectoryListings': bool enabled
'jsonDirectoryListings': bool enabled
'mimeTypes': dictionary
'errorPages': { errorCode: pathToFile.. }
'engines': { '.ext': engine( content, details, connection ) -> Promise.. }
```
