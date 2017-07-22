# Weave

[![Written in Teal](http://img.shields.io/badge/teal-v0.3.1-62eaaa.svg?style=flat)](https://github.com/partheseas/teal)
![Weave Version 0.1.9](https://img.shields.io/badge/weave-v0.1.9-5050DD.svg?style=flat)
![Stability: Alpha](http://img.shields.io/badge/stability-alpha-f04c5e.svg?style=flat)

## Disclosure

### MIT License

Copyright Tyler Washburn 2015

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

Weave is an HTTPD App Server made for Node.js. It takes a unique approach to resolving
file locations and gives you great control over the behavior of the server.

Weave is written in Teal, compiled into JavaScript, and run in Node along side
your own code to configure and control it.

## Installation

So installing is really weird right now. Eventually we'll get on npm and make everything
easier but for now this script should work pretty well on UNIX systems.

The basic idea is..
1. Download Teal from GitHub and install it with NPM as global to access the CLI
2. Download Weave and compile it to JavaScript using the `take` command
3. Install Weave with NPM in your usual directory to include in your code.

```Shell
sudo npm install -g https://github.com/partheseas/teal/tarball/master
mkdir .tmp

curl -o .tmp/weave.tar.gz -L https://github.com/partheseas/weave/tarball/master
tar -zxvf .tmp/weave.tar.gz
DIR="$(ls -d .tmp/*/)"
take $DIR && npm install $DIR

rm .tmp -r
```

You're good to go! Just use `require()` to load in the newly generated weave.js file.

**I will be publishing weave in the NPM directory eventually. I just want to get a fully functioning product ready first.**

## Features
- Extensive and powerful customization
- Unique and versatile path resolving
- Easy access to server side scripting in any language
- Quick and easy to setup WebSocket implementation


### Coming soon...
- An easy to use and robust command line interface
- A simple web interface to control remotely or locally monitor internal data
- SPDY & HTTP 2.0 support eventually maybe
