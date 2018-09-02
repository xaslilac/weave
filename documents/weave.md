# weave

## Overview
Contains many private properties, but a few useful public ones as well. This
document only talks about the behavior and function of things defined in weave.js.  
For information on the greater overall concept of Weave, see the main documents readme.  
For details on a specific class, see the document for that classes definition file.  
For a brief overview of the entire API, see documents/readme.md.

## Properties
### version
The current version of Weave being used.

### _bindings
When creating a new instance of weave.Binding to link apps to, they will be
stored here in order to enable Weave to correctly delegate requests. Peeking
inside the structure of this hierarchy can be very useful when debugging Weave.
It looks more or less like this.

```JavaScript
{
    80: {
      server: normalServer,
      attachments: {
        '*': releaseApp,
        'localhost': debugApp
      }
    },
    443: {
      server: secureServer,
      attachments: {
        '*': releaseApp,
        'localhost': debugApp
      }
    }
}
```
