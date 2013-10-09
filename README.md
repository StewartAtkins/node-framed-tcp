framed-tcp
===============

This library provides some simple utilities to aid working with TCP/IP sockets. The module utilises the [event-hook](https://npmjs.org/package/event-hook) module to provide in-place modifications to the behaviour of the socket. This approach allows the user to retain full access to the socket object while still providing a processing layer between raw socket and user. These utilities can be applied to both client and server sockets.

##Utilities
The module provides three hook utilities that can be applied to socket objects. These can be applied individually or chained together on the same socket.

###Framing
The most important of these hooks is the framing layer. This is designed to emulate atomic transfer over a net.Socket (i.e. if you socket.write() a 2MiB Buffer, you'll get one 2MiB Buffer out at the other end instead of 70 or so Buffers at a few KiB each).

###Flexible Buffer
The [flexible-buffer](https://npmjs.org/package/flexible-buffer) module is written by the same author as this framed-tcp module, and provides a wrapper around Buffer which can automatically resize if you need to write past the end, and retains it's own internal write and read position cursors rather than requiring the user to do it.

###Opcode
This is aimed more at scratching a personal itch than anything else but everybody is of course welcome to use it. It attaches an opcode or message type identifier to packets. The socket send method is modified to accept an integer argument before the buffer (or flexible-buffer) argument and will dispatch in a similar manner on the other end.

*Note: This hook must be applied LAST or the opcode will be prefixed on after the size has been added*

##Usage
To apply a hook simply use in the following style:
```js
...
var framedTcp = require('framed-tcp');
var socket = new net.Socket();
framedTcp.frame(socket);
framedTcp.flex(socket);
OR
framedTcp.flex(framedTcp.frame(socket));
```
See the unit tests for some examples.

##Notes
The net.Socket object can sometimes modify it's write method implementation. To attempt to compensate for this the module will hook the socket connection function in order to re-apply it's hooks if necessary, but if you are experiencing problems you may wish to delay the hooking until after the connection event.