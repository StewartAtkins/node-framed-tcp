var evtHook = require('event-hook');
var FlexibleBuffer = require('flexible-buffer');
var tcpUtils = require('./tcputils.js');

module.exports = exports = function(conn){

	if(!evtHook.IsHooked(conn))
		evtHook.EventHook(conn);

	var shim = evtHook.GetShim(conn);

	var handleData = function(callback){
		var arglist = [];
		for(var i=1;i<arguments.length;i++){
			if(arguments[i] instanceof Buffer)
				arguments[i] = new FlexibleBuffer(arguments[i]);
			arglist.push(arguments[i]);
		}
		callback.apply(callback, arglist);
	};
	
	shim.addEventProcessor("data", handleData);

	var unwrapAndExecute = function(arglist, func){
		for(var i=0;i<arglist.length;i++){
			if(arglist[i] instanceof FlexibleBuffer){
				arglist[i] = arglist[i].getBuffer(true);
			}
		}
		func.apply(conn, arglist);
	}

	tcpUtils.hookSendFuncs(conn, unwrapAndExecute);

	return conn;
};