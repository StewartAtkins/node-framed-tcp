var evtHook = require('event-hook');
var FlexibleBuffer = null;
try {
	FlexibleBuffer = require('flexible-buffer');
} catch(e){}
var tcpUtils = require('./tcputils.js');

module.exports = exports = function(conn){

	evtHook.EventHook(conn);

	var shim = evtHook.GetShim(conn);

	var handleData = function(callback){
		var arglist = [];
		for(var i=1;i<arguments.length;i++){
			var wrap = false;
			if(FlexibleBuffer && arguments[i] instanceof FlexibleBuffer){
				wrap = true;
				arguments[i] = arguments[i].getBuffer();
			}
			if(arguments[i] instanceof Buffer){
				arglist.push(arguments[i].readUInt16LE(0));
				arguments[i] = arguments[i].slice(2);
			}
			if(wrap)
				arguments[i] = new FlexibleBuffer(arguments[i]);
			arglist.push(arguments[i]);
		}
		callback.apply(callback, arglist);
	};
	
	shim.addEventProcessor("data", handleData);

	var prefixAndExecute = function(arglist, func){
		var newArgList = [];
		for(var i=0;i<arglist.length;i++){
			if(arglist[i] instanceof Buffer || (FlexibleBuffer && arglist[i] instanceof FlexibleBuffer)){
				if(i > 0 && typeof(arglist[i-1]) == "number"){
					var opcode = newArgList.pop();
					var buf = arglist[i];
					var wrap = false;
					if(FlexibleBuffer && buf instanceof FlexibleBuffer){
						wrap = true;
						buf = buf.getBuffer(true);
					}
					var buf2 = new Buffer(buf.length + 2);
					buf2.writeUInt16LE(opcode, 0);
					buf.copy(buf2, 2);
					if(wrap)
						buf2 = new FlexibleBuffer(buf2);
					arglist[i] = buf2;
				}
			}
			newArgList.push(arglist[i]);
		}
		func.apply(conn, newArgList);
	}

	tcpUtils.hookSendFuncs(conn, prefixAndExecute);

	return conn;
};