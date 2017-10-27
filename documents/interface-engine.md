# This one's a wild one broh.

Using the interface engine is similar to how regular interfaces work, with a few differences.

`app.interface` | Interface engine
--------------- | ----------------
Must be hard coded into the main process | Can be updated on the fly, code lives on a live file system
More flexibility in setting an API path | Easily generate response pages with a built in DOM

To use the interface engine, you just set the `--enable-interface-engine` flag,
and create a file somewhere in your web directory with the '.interface' extension.

**The contents of the .interface file are currently parsed by the server as pure JavaScript
at the moment, but that will update as the feature develops.**

Interface files are processed as a mixture of JavaScript and HTML. The JavaScript
must come first, and is terminated when it sees either `<!DOCTYPE` or `<html`.
The HTML portion of the file is processed by the server (if the document variable
is referenced) and made available through a DOM to the JavaScript portion.

The JavaScript portion of the file has a few APIs available to it, the main one
is a function named `weave` that can work one of two ways and exposes the exchange.

```JavaScript
weave( exchange => {
  // your code here
})

// or

let exchange = weave()
```

`document` is also made available to expose the DOM, as well as `garden` and `console`.
