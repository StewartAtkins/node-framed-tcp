var events = require('events');
var net = require('net');
var bufferUtils = require("./friendly-buffer");

//TODO: Error handling

module.exports = exports = function(conn){
	var expectedSize = -1;
	var receivedSize = 0;
	var incomingPacket = [];
	
	var socketOpen = true;

	
	var handleData = function(buff){
		var recurse = false;
		if(expectedSize < 0){
			expectedSize = buff.readUInt32LE(0);
		}
		var expectedRemaining = expectedSize - receivedSize;
		if(buff.length > expectedRemaining){
			var newBuff = buff.slice(0, expectedRemaining);
			buff = buff.slice(expectedRemaining);
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
			
			var payloadBuffer = new bufferUtils.FriendlyBuffer(payload);
			try {
				socket.emit('message', payloadBuffer);
			}catch(e){
				console.log("Error in message handling");
				console.log(e);
			}
			expectedSize = -1;
			receivedSize = 0;
			incomingPacket = [];
		}
		
		if(recurse)
			handleData(buff);
	};
	
	var socketDisconnect = function(hadError){
		if(!socketOpen)
			return;
		socketOpen = false;
		socket.emit("disconnect", false);
	};

	var socket = new events.EventEmitter();
	
	socket.send = function(payload){
		if(!socketOpen)
			return;
		
		if(payload instanceof bufferUtils.FriendlyBuffer)
			payload = payload.getBuffer(true);
		var buf = new Buffer(payload.length + 6);
		buf.writeUInt32LE(buf.length, 0);
		payload.copy(buf, 4);
		conn.write(buf);
	};
	
	socket.disconnect = function(){
		if(!socketOpen)
			return;
		conn.end();
		conn.destroy();
		socketDisconnect(false);
	};
	
	conn.on('data', handleData);
	conn.on('error', function(error){});
	conn.on('close', socketDisconnect);
};

