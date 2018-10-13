# Weave
[![Weave v0.4.0](https://img.shields.io/badge/weave-v0.4.0-446bdf.svg)](https://www.npmjs.com/package/weave)
![Stability: Beta](https://img.shields.io/badge/stability-beta-69b0ba.svg)
<!--[![Travis](https://img.shields.io/travis/partheseas/weave.svg?label=linux)](https://travis-ci.org/weave-js/weave)
[![AppVeyor](https://img.shields.io/appveyor/ci/partheseas/weave.svg?label=windows)](https://ci.appveyor.com/project/partheseas/weave)-->

## Overview
Weave is designed to give you great flexibility in resolving file locations, and
handling live server-side transpiling of all your source files.
It's really just a fun side project for me, and I will change the API *a lot*,
but it's kind of fun and is generally pretty stable. Though when I say beta, I do
mean it. I'm not a massive company with the resources to release polished beta-ware.
It won't crash constantly, but it will crash.

### Usage
For usage information, see [the comprehensive API overview](/documents/readme.md).
I'm lying. It's not comprehensive. It's not up to date either.

## Installation
```Shell
npm install weave will eventually be a thing
```
or just download a .zip and throw it into a node_modules folder somewhere. You should be good to go.

## Features
# React, Sass and TypeScript + Weave
Weave is designed to make quick iteration of source code as painless as possible.
These types of libraries go hand in hand with Weave's ability to [set up such an environment easily](/documents/react.md).

### Other cool things
- Extensive and powerful customization
- Unique and versatile path resolving
- Quick and easy to setup WebSocket implementation

### Coming soon...
- Help decide! Get involved and keep me from ruining it by myself
- An easy to use and robust command line interface
- A simple web interface to control remotely or locally monitor internal data
- Pre-caching/compilation of resources for production ready apps
- Cluster support for fast performance
- HTTP/2 support

## Roadmap

#### Completed milestones
##### Groundwork - v0.1 (WebSocks) ✔
Get the basics in, along with a couple of goodies.
- Be generally reliable, strong routing features
- A base [WebSocket](https://github.com/weave-js/weave-plugin-websocket) implementation, document generation
- Server-side DOM tree for error pages, etc.

##### Logging and testing - v0.2 (Sun Screen) ✔
Improve the debugging and testing experience, protect from crashes and unexpected
bad things.
- Build a robust [error and warning backend](https://github.com/partheseas/gardens).
- Begin implementing a test suite.
- Control HTTP and HTTPS requests with the same code

##### Robustness - v0.3 (Wrinkles) ✔
Fixing design decisions, keep the core code focused and offer additional packages
to provide functionality, rather than having it all built in.
- Force HTTPS on apps
- Break out React plugin, WebSocket, demo site, etc.
- Read large files in chunks rather than entirely at once to avoid eating memory.
- Simplify and modularize code where possible to reduce opportunity for bugs.

### Upcoming
#### Usability - v0.4 (Snacks)
Stream larger files and enable partial downloads
- Lay the groundwork for a remote debugging plugin
- Accept user uploads in a reasonable way
- Enable the ability to stream a video file from a certain time stamp, to resume
a disrupted download at a later time, etc. (Range HTTP header)

#### 100% test coverage/passing - v0.5 (Sweat Pants)
All features should be 100% tested and passing
- Run the tests on a local machine in a virtual environment
- Test in a real world scenario by setting up a browser based testing environment
- Ensure that everything behaves properly in browsers across the board

#### HTTP/2, compression, production pre-caching and precompiling - v0.6 (Bee)
- HTTP/2 implementation
  - Compression is necessary for HTTP/2
  - Node HTTP/2 implementation needs to be reviewed
- Read files from web directories into memory for fast response times
  - Run files through engines and compress them in advance

#### Clusters - v0.7 (Orion)
- Finalized cluster implementation
- Stability against crashes, multiple respawning threads provides safety and performace
