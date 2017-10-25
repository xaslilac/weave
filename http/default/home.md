## Weave is a super good Node.js server.
It was created with unique and powerful routing features in mind to allow you
to more easily create intricate and amazing websites with less work.

Weave is so simple, you can run a full HTTPD server with less than 10 lines of code.

```JavaScript
let weave = require( 'weave' )
weave({
  'location': '~/http/',
  'indexes': { 'index.html': 0 },
  'mimeTypes': new weave.Dictionary( 'SameFileYouAlreadyUse.mimes' ),
  // We still have 3 lines left!!
  // And we have a full server!
  // Plus this code is clean and easy to read!
})
.link( 80 )
```

This website is run by Weave. All pages are written in Markdown, and are parsed
and served by Weave.
