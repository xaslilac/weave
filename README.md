# Weave

[![Written in Teal](http://img.shields.io/badge/teal-v0.3.1-62eaaa.svg?style=flat)](https://github.com/partheseas/teal)
![Current Stability: Alpha](http://img.shields.io/badge/stability-alpha-f04c5e.svg?style=flat)

## Disclosure

### License

Copyright Tyler Washburn 2014

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

Weave is a combination of an HTTPD server, and an application server (think [Express](http://expressjs.com/)) made for Node.js.

Weave is written in Teal, (essentially lazy JavaScript, everything translates directly) and translated into Javascript.
Since all translations are literal the generated code should be completely safe.

## Installation

1. Download and install [Node and NPM](http://nodejs.org/)
2. [Download](https://github.com/partheseas/weave/tarball/master) and extract Weave
3. Run the following two commands in your shell

```Shell
npm install -g https://github.com/partheseas/teal/tarball/master
take /wherever/you/extracted/Weave
```

You're good to go! Just use `require()` to load in the newly generated weave.js file.

**I will be publishing weave in the NPM directory eventually. I want to get a fully functioning product ready first though.**

## Features

- An easy to use, convenient and reliable CLI
  - Can be controlled entirely from the command-line
  - Update your server without ever taking your sites offline
- Fast and accurate HTTP parsing
- Reliable, super customizable HTTPD server
- While mixing in the convience of a dedicated app server
- Support for media uploads
- Error messages with helpful tracing
- Nothing should ever crash the entire process
- Partial download support (resuming)
- Low memory cost
  - Split large files into chunks when handling to avoid large chunk holding.
- Simplify the more confusing aspects of servers
  - Databases (hopefully)
  - Other gross stuff
- Open and customizable API
- Easily plug in your own code for complete control over the handleing of requests.
- Incredibly scalable
- Client and server side caching support
  - Includes CLI to clear server-side cache
- Serverside scripting support
 - PHP, Ruby, Python, and other scripting languages
 - Teal, CoffeeScript, and other Javascript dialect support
- Whatever else you can come up with!