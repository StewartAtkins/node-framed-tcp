var evtHook = require('event-hook');
var FlexibleBuffer = require('flexible-buffer');
var net = require('net');

module.exports = exports = function(conn){

	if(!evtHook.IsHooked(conn))
		evtHook.EventHook(conn);

	var shim = evtHook.GetShim(conn);

	var expectedSize = -1;
	var receivedSize = 0;
	var incomingPacket = [];

	var handleData = function(callback, buff){
		var recurse = false;
		var wrap = false;
		if(buff instanceof FlexibleBuffer){
			wrap = true;
			buff = buff.getBuffer();
		}
		if(expectedSize < 0){
			expectedSize = buff.readUInt32LE(0);
		}
		var expectedRemaining = expectedSize - receivedSize;
		if(buff.length > expectedRemaining){
			var newBuff = buff.slice(0, expectedRemaining);
			buff = buff.slice(expectedRemaining);
			if(wrap)
				buff = new FriendlyBuffer(buff);
			recurse = true;
			incomingPacket.push(newBuff);
			receivedSize = expectedSize;
		}else{
			incomingPacket.push(buff);
			receivedSize += buff.length;
		}
		
		if(receivedSize == expectedSize){
			
			var masterBuffer = Buffer.concat(incomingPacket);
			
			//var size = masterBuffer.readUInt32LE(0);
			var payload = masterBuffer.slice(4);
			if(wrap)
				payload = new FriendlyBuffer(payload);
			callback(payload);

			expectedSize = -1;
			receivedSize = 0;
			incomingPacket = [];
		}
		
		if(recurse)
			handleData(callback, buff);
	};
	
	shim.addEventProcessor("data", handleData);

	var prefixAndExecute = function(arglist, func){
		for(var i=0;i<arglist.length;i++){
			if(arglist[i] instanceof FlexibleBuffer)
				arglist[i] = arglist[i].getBuffer(true);
			if(arglist[i] instanceof Buffer){
				var buf = new Buffer(arglist[i].length + 4);
				buf.writeUInt32LE(buf.length, 0);
				arglist[i].copy(buf, 4);
				arglist[i] = buf;
			}
		}
		func.apply(conn, arglist);
	}

	var oldEnd = conn.end;
	conn.end = function(){
		prefixAndExecute(arguments, oldEnd);
	};

	var oldSend = conn.write;
	conn.write = function(){
		prefixAndExecute(arguments, oldSend);
	};
	conn.write.__funcFrameHooked = true;
	if(conn instanceof net.Socket){
		conn.connect = function(){
			var ret = net.Socket.prototype.connect.apply(conn, arguments);
			if(Object.keys(conn.write).indexOf("__funcFrameHooked") < 0){
				conn.write = function(){
					prefixAndExecute(arguments, oldSend);
				};
			}
			return ret;
		};
	}


};