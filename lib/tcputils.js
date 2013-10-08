var net = require('net');
var uuid = require('uuid');

module.exports = exports = self = {};

self.hookSendFuncs = function(conn, hook){
	var hookId = uuid.v4();
	var oldEnd = conn.end;
	conn.end = function(){
		hook(arguments, oldEnd);
	};

	var oldSend = conn.write;
	conn.write = function(){
		hook(arguments, oldSend);
	};
	conn.write["__funcHooked_"+hookId] = true;
	if(conn instanceof net.Socket){
		conn.connect = function(){
			var ret = net.Socket.prototype.connect.apply(conn, arguments);
			if(Object.keys(conn.write).indexOf("__funcHooked_"+hookId) < 0){
				conn.write = function(){
					hook(arguments, oldSend);
				};
			}
			return ret;
		};
	}
}