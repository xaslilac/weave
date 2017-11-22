# React + Weave = 💙

Since the early days of version 0.2.2, it was clear that Weave and React were a
match meant to be. Weave has been built to allow for it to be as easy as possible
to set up an app file structure that is simple to configure, yet powerful enough
to displace the need to hard code URL handling by yourself into a server configuration,
making iteration quick and easy during the development period.

React is heavily focused on modularity of code, high performance, and rending layouts
and updating content dynamically so that the developer doesn't need to worry about
those things so much. It gives you the tools to create complex user interfaces in
an elegant, expandable, and readable way.

Combine these two together, and it provides for a environment that is amazing for
quick iteration, encouraging productivity, reducing stress, and building great things.

`.jsx` file parsing is handled by Babel and the Babel React preset. To enable live,
high-performance transpiling of `.jsx` files on your server, just include the
`--enable-react-engine` flag in your command, or add the following to your code.
```
weave([ '--enable-react-engine' ])
```
