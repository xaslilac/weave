# module.exports (weave)

## Overview

Contains many private properties, but a few useful public ones as well. This
document only talks about the behavior and function of things defined in weave.tl.
For information on the greater overall concept of Weave, see the main documents readme.
For information on a specific class, see the document for that classes definition file.

## Command Line flags

### --weave-debug

Enables certain debugging features. To be updated.

### --aww-heck-yes

Weave will share your enthusiasm.


## Properties

### version
The current version of Weave being used.

### servers
An object containing all instances of http.Server controlled by Weave. A given
server can be accessed by using it's attached port as the property name. For example,
a server listening to port 80 can be accessed by using `weave.servers[80]`.

### hosts
An object linking host names to the Weave apps that handle them. They are stored as
`hostname: app` pairs relevant hostname, and are allowed to have wildcards (\*) in their
hostnames. For example, an app for a developer/admin version of your website might listen
to "localhost" on port 8080 rather than to any host on port 80. This app could be found
under `weave.apps["localhost:8080"]`, and the app for your public website could be found
under `weave.apps["*:80"]`
