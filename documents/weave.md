# module.exports (weave)

## Overview
Contains many private properties, but a few useful public ones as well. This
document only talks about the behavior and function of things defined in weave.js.  
For information on the greater overall concept of Weave, see the main documents readme.  
For details on a specific class, see the document for that classes definition file.  
For a brief overview of the entire API, see documents/readme.md.

## Command Line flags
### --weave-verbose
Weave will print certain internal values to the command line for help with debugging.

### --enable-weave-repl
Enables a command line repl to allow tinkering with your app while the server is running.

### --enable-weave-instruments [appName instrumentsUrl]
Enables Weave built in web interface to control, monitor, and debug your apps.  
`appName` is the name used when calling `new weave.App( appName )` or `weave( appName )`  
`instrumentsUrl` is the URL prefix that will be used to access

### --aww-heck-yes
Weave will share your enthusiasm! :)

## Properties
### version
The current version of Weave being used.

### servers
An object containing all instances of http.Server controlled by Weave. A given
server can be accessed by using it's attached port as the property name. For example,
a server listening to port 80 can be accessed by using `weave.servers[80]`.

### apps
An object holding all instances of weave.App, stored as `appName: app` pairs.
If an app was created without a name, it will be `push`d to the array `weave.apps.anonymous`
in the order it was created.

### hosts
An object linking host names to the Weave apps that handle them. They are stored as
`hostname: app` pairs relevant hostname, and are allowed to have wildcards (\*) in their
hostnames. For example, an app for a developer/admin version of your website might listen
to "localhost" on port 8080 rather than to any host on port 80. This app could be found
under `weave.apps["localhost:8080"]`, and the app for your public website could be found
under `weave.apps["*:80"]`
