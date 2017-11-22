# Weave
[![Weave v0.3.0](https://img.shields.io/badge/weave-v0.3.0-5050DD.svg)](https://www.npmjs.com/package/weave)
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
on server-side transpiling goes hand in hand with Weave's ability to [set up such an environment easily](/documents/react.md).
### Other cool things
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

###### Logging and testing - v0.2 (Sun Screen) ✔
Improve the debugging and testing experience, protect from crashes and unexpected
bad things.
- Build a robust error and warning backend system with the ability to log to files.
- Begin implementing a test suite.

### Upcoming
### Remote debugging, monitoring instruments - v0.3 (Gooey)
Improve the instruments greatly, to where they may actually be useful
- Allow creation of an admin app with limited accessability to control your public production app
- Encryption and login credentials
- Request inspecting, performance metrics
- REPL output syntax highlighting
- Control caching behavior and server configurations on the fly

### File system chunking - v0.4 (Snacks)
Stream larger files and enable partial downloads
- Read large files in chunks rather than entirely at once to avoid eating memory.
- Enable the ability to stream a video file from a certain time stamp, to
resume a disrupted download at a later time, and to accept user uploads.

### 100% test coverage/passing - v0.5 (Comfy)
All features should be 100% tested and passing
- Run the tests on a local machine in a virtual environment
- Test in a real world scenario by setting up a browser based testing environment
- Ensure that everything behaves properly in browsers across the board

### HTTPS, HTTP/2, compression, production pre-caching and precompiling - v0.6 (Cozy)
- Control HTTP and HTTPS requests with the same code ✔
- Force HTTPS on apps ✔
- HTTP/2 implementation
  - Compression is necessary for HTTP/2
- Read files from web directories into memory for fast response times
  - Run files through engines and compress them in advance

### Clusters - v0.7 (Orion)
- Finalized cluster implementation
- Stability against crashes, multiple respawning threads provides safety and performace
