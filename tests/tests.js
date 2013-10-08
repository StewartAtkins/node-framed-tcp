var net = require('net');
var tcpUtils = require('../');
var FriendlyBuffer = require('flexible-buffer');

var createSendFunc = function(frame, magicNo){
	return function(){
		var sendBuf = new Buffer(frame ? 4 : 8);
		if(!frame)
			sendBuf.writeUInt32LE(8, 0);
		sendBuf.writeUInt32LE(0xFFFEFD00 + magicNo, frame ? 0 : 4);
		return sendBuf;
	};
};

var createRecvFunc = function(frameServer, magicNo, test){
	test.expect(2);
	return function(data){
		if(frameServer)
			test.equal(data.length, 4, "Incorrect buffer size");
		else
			test.equal(data.readUInt32LE(0), 8, "Incorrect buffer size");
		test.equal(data.readUInt32LE(frameServer ? 0 : 4), 0xFFFEFD00 + magicNo, "Incorrect payload delivered");
		
		test.done();
	};
};

var createClient = function(port, frame, sendFunc){
	var client = new net.Socket();
	if(frame)
		tcpUtils.frame(client);
	client.connect(port, "127.0.0.1", function(){
		client.write(sendFunc(), function(){
			client.end();
		});
	});
};

var createServerAndClient = function(frameServer, frameClient, recvFunc, sendFunc){
	var server = net.createServer();
	server.on('connection', function(socket){
		if(frameServer)
			tcpUtils.frame(socket);
		socket.on("data", function(data){
			server.close();
			recvFunc(data);
		});
	});
	server.listen(0, function(){
		createClient(server.address().port, frameClient, sendFunc);
	});
};

exports.testFramedServerRecv = function(test){
	createServerAndClient(true, false, createRecvFunc(true, 1, test), createSendFunc(false, 1));
};

exports.testFramedClientSend = function(test){
	createServerAndClient(false, true, createRecvFunc(false, 2, test), createSendFunc(true, 2));
};

exports.testFramedPair = function(test){
	createServerAndClient(true, true, createRecvFunc(true, 3, test), createSendFunc(true, 3));
};

exports.testFramedLargePacket = function(test){
	test.expect(2);
	createServerAndClient(true, true, function(data){
		test.equal(data.length, 2 * 1024 * 1024, "Incorrect buffer size");
		var dataCorrect = true;
		for(var i=0;i<data.length;i++){
			if(data.readUInt8(i) != (i % 256)){
				dataCorrect = false;
				break;
			}
		}
		test.ok(dataCorrect, "Incorrect payload delivered");
		test.done();
	}, function(){
		var sendBuf = new Buffer(2 * 1024 * 1024);
		for(var i=0; i < sendBuf.length;i++){
			sendBuf.writeUInt8(i % 256, i);
		}
		return sendBuf;
	});
};

exports.testFrameWithFlex1 = function(test){
	var server = net.createServer();
	server.on('connection', function(socket){
		tcpUtils.flex(tcpUtils.frame(socket));
		socket.on("data", function(data){
			server.close();
			test.ok(data instanceof FriendlyBuffer, "Buffer is not Friendly");
			test.equal(data.readUint32(), 0x01020304, "Incorrect payload delivered");
			test.done();
		});
	});
	server.listen(0, function(){
		var client = new net.Socket();
		tcpUtils.flex(tcpUtils.frame(client));
		client.connect(server.address().port, "127.0.0.1", function(){
			var buf = new FriendlyBuffer();
			buf.writeUint32(0x01020304);
			client.write(buf, function(){
				client.end();
			});
		});
	});
};

exports.testFrameWithFlex2 = function(test){
	var server = net.createServer();
	server.on('connection', function(socket){
		tcpUtils.frame(tcpUtils.flex(socket));
		socket.on("data", function(data){
			server.close();
			test.ok(data instanceof FriendlyBuffer, "Buffer is not Friendly");
			test.equal(data.readUint32(), 0x01020304, "Incorrect payload delivered");
			test.done();
		});
	});
	server.listen(0, function(){
		var client = new net.Socket();
		tcpUtils.frame(tcpUtils.flex(client));
		client.connect(server.address().port, "127.0.0.1", function(){
			var buf = new FriendlyBuffer();
			buf.writeUint32(0x01020304);
			client.write(buf, function(){
				client.end();
			});
		});
	});
};
