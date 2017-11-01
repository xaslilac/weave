# Weave
[![Weave Version 0.2.3](https://img.shields.io/badge/weave-v0.2.3-5050DD.svg)](https://www.npmjs.com/package/weave)
![Stability: Alpha](https://img.shields.io/badge/stability-alpha-f04c5e.svg)
[![Travis](https://img.shields.io/travis/partheseas/weave.svg?label=linux)](https://travis-ci.org/partheseas/weave)
[![AppVeyor](https://img.shields.io/appveyor/ci/partheseas/weave.svg?label=windows)](https://ci.appveyor.com/project/partheseas/weave)

## Overview
Weave is a very unique server made for Node.js. It takes a different approach to resolving
file locations and gives you great control over what files to serve for each request.
Weave runs in Node along side your own code that configures and controls it, with plenty of
API points for server side processing of your static files and request inputs.

## Installation
```Shell
npm install weave
```
or just download a .zip and throw it into a node_modules folder somewhere. You should be good to go.

## Features
# React + Weave
[React](https://reactjs.org/) and Weave compliment each other perfectly. React's dependence
on server-side transpiling goes hand in hand with Weave's ability to set up such an environment [easily](/documents/react.md).
- Extensive and powerful customization
- Unique and versatile path resolving
- Quick and easy to setup WebSocket implementation

### Coming soon...
- An easy to use and robust command line interface
- A simple web interface to control remotely or locally monitor internal data
- Pre-caching/compilation of resources for production ready apps
- Cluster support for fast performance
- HTTP/2 support

## Roadmap

##### Completed milestones
##### Groundwork - v0.1 (WebSocks) ✔
Get the basics in, along with a couple of goodies.
- Be generally reliable, strong routing features
- A base WebSocket implementation, document generation
- Server-side DOM tree for error pages, etc.
- Basic caching ground work.

### Upcoming
## Logging and testing - v0.2 (Sun Screen)
Improve the debugging and testing experience, protect from crashes and unexpected
bad things.
- Build a robust error and warning backend system with the ability to log to files.
- Implement a (mostly) full test suite.

### Remote debugging, monitoring instruments - v0.3 (Gooey)
Improve the instruments greatly, to where they may actually be useful
- Allow cross-app monitoring for control over access
- Encryption and login credentials
- Ability to monitor an incoming request queue, measure performance
- REPL output syntax highlighting
- Caching controls, configuration tweaks

### Command Line Interface - v0.4 (Quiet Librarian)
Use all the hooks from our web instruments to enable the same control locally, as
well as the ability to have a 'headless' process. Continue using your console for
running other commands without your server blocking the console process.
- Finalized cluster implementation
- Self updating
  - Ability to quickly iterate on new features with incomplete code without needing
  to constantly restart the process or deal with crashes.

### File system chunking - v0.5 (Snacks)
Stream larger files and enable partial downloads
- Read large files in chunks rather than entirely at once to avoid eating memory.
- Enable the ability to stream a video file from a certain time stamp, to
resume a disrupted download at a later time, and to accept user uploads.

### 100% test coverage - v0.7
All features should be 100% tested and passing
- Run the tests on a local machine in a virtual environment
- Test in a real world scenario by setting up a browser testing environment
  - Ensure that everything behaves properly in browsers across the board

### HTTPS, HTTP/2, compression support - v0.8
- Control HTTP and HTTPS from one app
  - Force HTTPS on certain subdirectories or the entire app
- HTTP/2 implementation
  - Compression is necessary for this

### Stability & fine tuned error/warning reporting - v0.9
As we approach feature completeness and having a production ready product,
fine tune the stability of the Weave to ensure that one request being mishandled
or any third party code is never able to completely break the process. try, catch
pairs on any calls to external resources, argument checking on all built in methods,
and ensuring that any and all errors are incredibly tracable to make debugging
quick and painless.

### Release - v1.0
All desired features polished and in place for the world to see!
