# Getting started!
Here, we will quickly go over how to get your first Weave app up and running. If
you already have an existing static HTTPD server then transitioning will be easy,
and give you access to quite a few interesting, unique, and helpful features.

If you would like a more detailed overview [read this](/documents/readme.md).

## Installation
To begin using Weave, just download a zip or tarball from [my GitHub](https://github.com/partheseas/weave)
and extract the contents into the node_modules folder of your choosing, or use `npm`.

To make sure you have everything put properly in place, use `require` to include Weave
into a .js file and execute that file with node on the command line using the `--aww-heck-yes`
flag. If Weave was loaded succesfully, you should see a cooresponding message logged
to your console.

```JavaScript
const weave = require( 'weave' )
```

```Shell
~/$ node example.js --aww-heck-yes
Aww heck yes!!
~/$
```

## Creating and configuring an app
Now that you know Weave is loading properly, there are a few ways to create and
configure your app depending on your needs and preferences.

```JavaScript
weave({ 'location': '~/http/' })
weave( 'name', { 'location': '~/http/' })
new weave.App({ 'location': '~/http/' })
new weave.App( 'name', { 'location': '~/http/' })
new weave.App( 'name' ).configure({ 'location': '~/http/' })
```

Pick which ever way you like. When you decide, you'll just need to link your
app to a host and a port. If no host is specified, it will listen to all hosts
on the specified port.

```JavaScript
let app = weave({ 'location': '~/http/' })
app.link( 80 )
app.link( '80' )
app.link( 'localhost:80' )
app.link( '*.example.com:80' )
app.link( 'blog.*.com:80' )
```

You can set specific behaviors for subdirectories in your app as well.
```JavaScript
app.subdirectory( '/secretfolder', { 'location': '~/somewhere/secret/' })
```
In the above example, for a request to `/index.html` we would look for that file
at `~/http/index.html`, but for a request to `/secretfolder/index.html` we would
look for a file at `~/somewhere/secret/index.html`.

## Index files and an introduction to depth
If we wanted to be automatically directed to those index files, we would configure
our app like so:
```JavaScript
app.configure({
  'indexes': {
    'index.html': Infinity
  }
})

app.subdirectory( '/secretfolder', {
  'indexes': {
    'index.html': 0
  }
})
```

The Infinity and 0 values assigned to the properties `'index.html'` specify the
number of child folders the index file can respond for. Note that the folders do
not need to actually exist, they just need to be requested by the client.

In this example, `~/http/index.html` would be used as the response to any url requested
without an exact file match, since it is set to be an index for infinite folders.
However, our secret file at `~/somewhere/secret/index.html` would remain secret, as it
would not be used for any child directories. It would only be used when `/secretfolder/` has
been requested.

It is important to note that if we had not defined an `'indexes'` behavior for `/secretfolder`
that the behavior would've been inherited from the app configuration, and
`~/somewhere/secret/index.html` would be used as an index folder for all requests
under `/secretfolder` on our server.
