# Weave

![Weave Version 0.2.0](https://img.shields.io/badge/weave-v0.2.0-5050DD.svg?style=flat)
![Stability: Alpha](http://img.shields.io/badge/stability-alpha-f04c5e.svg?style=flat)

## Disclosure

### MIT License

Copyright Kayla Washburn 2015

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Overview

Weave is a very unique server made for Node.js. It takes a different approach to resolving
file locations and gives you great control over the behavior of the server.

Weave runs in Node along side your own code that configures and controls it.

## Installation

Just download a tarball or zip and throw it into a node_modules folder somewhere. You should be good to go.

**I will be publishing weave in the NPM directory eventually. I just want to get a fully functioning product ready first.**

## Features
- Extensive and powerful customization
- Unique and versatile path resolving
- Easy access to server side scripting in any language
- Quick and easy to setup WebSocket implementation


### Coming soon...
- An easy to use and robust command line interface
- Uses Promises API
- A simple web interface to control remotely or locally monitor internal data
- SPDY & HTTP 2.0 support eventually maybe

## Roadmap

##### Completed milestones
##### Groundwork - v0.1 (WebSocks) ✔
Get the basics in, along with a couple of goodies. Be generally reliable,
strong routing features, a base WebSocket implementation, document generation
through a server-side DOM tree for error pages, etc., basic caching ground work.

### Upcoming
## Console/file logging - v0.2 (Sun Screen)
Build a robust error and warning backend system with the ability to log to files

### Remote debugging / Admin panel - v0.3 (Gooey)
Add the ability to have an online debug console/admin panel that you would
activate with App.addInterface( "/net-internals", new weave.AdminPanel(App) )
or something similar. You'd be able to monitor an incoming request queue,
interface directly with the App collection from a secure, remote, GUI/REPL with
syntax highlighting, pretty printing, and more.

### Command Line Interface - v0.4 (Quiet Librarian)
Could be helpful for things like clearing a cache or updating a setting.
The main reason this would be important, is it would provide a simple way
to actively maintain your server while it is running, without needing to
close a process, and open a new one. You could essentially "hot-swap" your
configuration of the directory by using the command line. This could also
also provide a simple way to start a server from the command line without
directly handling a node process instance. This would allow you to close
your terminal window when it's unneeded instead of leaving it open all the
time. This is something that I've wanted to be able to do for a while, but
is incredibly hard to implement, and would need to be outlined in detail.

### File system caching, chunking - v0.5 (Snacks)
Read large files in chunks rather than entirely at once to avoid eating memory.
Cache smaller files in memory for quick access, with easily set parameters for
how much we can store.

### Partial downloads, uploads, streaming - v0.6 (Ice-Stream)
Enable the ability to stream a video file from a certain time stamp, to
resume a disrupted download at a later time, and to accept user uploads.

### Standalone operation - v0.7
Polish the CLI enough to be able to run entirely from the command line.

### SPDY Protocol / GZip / HTTP 2.0 / HTTPS support - v0.8
Add support for Google's SPDY protocol and for HTTP 2.0. HTTPS support is
hard for me to implement without access to any sort of secure certificate
of my own to work with, and is a requirement for SPDY.
So it seems that HTTPS support is simply creating an extra server, using
certificates supplied, and doing some extra stuff to hook up the server
to the app. Not sure how supporting multiple certificates would work.

### Stability & fine tuned error/warning reporting - v0.9
As we approach feature completeness and having a production ready product,
fine tune the stability of the Weave to ensure that one request being mishandled
or any third party code is never able to completely break the process. try, catch
pairs on any calls to external resources, argument checking on all built in methods,
and ensuring that any and all errors are incredibly tracable to make debugging
quick and painless.

### Release - v1.0
All desired features polished and in place for the world to see!
