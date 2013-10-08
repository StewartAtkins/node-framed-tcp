var net = require('net');
var uuid = require('uuid');

module.exports = exports = self = {};

var funcHookName = "__funcHooked_";

var copyHooks = function(old, newobj, hookId){
	newobj[funcHookName+hookId] = true;
	Object.keys(old).forEach(function(obj, idx){
		idx = idx + "";
		if(idx.substr(0, funcHookName.length) == funcHookName)
			newobj[idx] = true;
	});
}

self.hookSendFuncs = function(conn, hook){
	var hookId = uuid.v4();
	var oldEnd = conn.end;
	conn.end = function(){
		hook(arguments, oldEnd);
	};
	copyHooks(oldEnd, conn.end, hookId);

	var oldSend = conn.write;
	conn.write = function(){
		hook(arguments, oldSend);
	};
	copyHooks(oldSend, conn.write, hookId);

	if(conn instanceof net.Socket){
		conn.connect = function(){
			var ret = net.Socket.prototype.connect.apply(conn, arguments);
			if(Object.keys(conn.write).indexOf(funcHookName+hookId) < 0){
				conn.write = function(){
					hook(arguments, oldSend);
				};
				copyHooks(oldSend, conn.write, hookId);
			}
			return ret;
		};
	}
}