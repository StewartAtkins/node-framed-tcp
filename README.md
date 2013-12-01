framed-tcp
===============

This library provides some simple utilities to aid working with TCP/IP sockets. The module utilises the [event-hook](https://npmjs.org/package/event-hook) module to provide in-place modifications to the behaviour of the socket. This approach allows the user to retain full access to the socket object while still providing a processing layer between raw socket and user. These utilities can be applied to both client and server sockets.

##Utilities
The module provides three hook utilities that can be applied to socket objects. These can be applied individually or chained together on the same socket.

###Framing
The most important of these hooks is the framing layer. This is designed to emulate atomic transfer over a net.Socket (i.e. if you socket.write() a 2MiB Buffer, you'll get one 2MiB Buffer out at the other end instead of 70 or so Buffers at a few KiB each).

###Flexible Buffer
The [flexible-buffer](https://npmjs.org/package/flexible-buffer) module is written by the same author as this framed-tcp module, and provides a wrapper around Buffer which can automatically resize if you need to write past the end, and retains it's own internal write and read position cursors rather than requiring the user to do it.

##Usage
To apply a hook simply use in the following style:
```js
...
var framedTcp = require('framed-tcp');
var socket = new net.Socket();
var socketShim = framedTcp.frame(socket);
framedTcp.flex(socketShim);
OR
var socketShim = framedTcp.flex(framedTcp.frame(socket));
```
See the unit tests for some examples.

##Notes
The socketShim object is what will be emitting events, and has a special implementation of .write and .end that will apply the appropriate changes to data passed through.
Other methods will need to be called on the original socket object, which can be obtained by calling socketShim.getObject() if necessary.