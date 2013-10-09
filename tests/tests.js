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
	frame(client);
	client.connect(port, "127.0.0.1", function(){
		var cb = function(){
			client.end();
		};
		var argList = sendFunc();
		if(argList instanceof Array){
			argList.push(cb);
			client.write.apply(client, argList);
		}else{
			client.write(argList, cb);
		}
	});
};

var createServerAndClient = function(frameServer, frameClient, recvFunc, sendFunc){
	var server = net.createServer();
	server.on('connection', function(socket){
		frameServer(socket);
		socket.on("data", function(data){
			server.close();
			recvFunc.apply(recvFunc, arguments);
		});
	});
	server.listen(0, function(){
		createClient(server.address().port, frameClient, sendFunc);
	});
};

var frameFunc = function(socket){ tcpUtils.frame(socket); };
var noOp = function(){}

exports.testFramedServerRecv = function(test){
	createServerAndClient(frameFunc, noOp, createRecvFunc(true, 1, test), createSendFunc(false, 1));
};

exports.testFramedClientSend = function(test){
	createServerAndClient(noOp, frameFunc, createRecvFunc(false, 2, test), createSendFunc(true, 2));
};

exports.testFramedPair = function(test){
	createServerAndClient(frameFunc, frameFunc, createRecvFunc(true, 3, test), createSendFunc(true, 3));
};

exports.testFramedLargePacket = function(test){
	test.expect(2);
	createServerAndClient(frameFunc, frameFunc, function(data){
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

var testFrameWithFlex = function(test, flexFrameFunc){
	test.expect(2);
	createServerAndClient(flexFrameFunc, flexFrameFunc, function(data){
		test.ok(data instanceof FriendlyBuffer, "Buffer is not Friendly");
		test.equal(data.readUint32(), 0x01020304, "Incorrect payload delivered");
		test.done();
	}, function(){
		var sendBuf = new FriendlyBuffer();
		sendBuf.writeUint32(0x01020304);
		return sendBuf;
	});
};

exports.testFrameWithFlex1 = function(test){
	var flexFrameFunc = function(socket){ tcpUtils.flex(tcpUtils.frame(socket)); };
	testFrameWithFlex(test, flexFrameFunc);
};

exports.testFrameWithFlex2 = function(test){
	var flexFrameFunc = function(socket){ tcpUtils.frame(tcpUtils.flex(socket)); };
	testFrameWithFlex(test, flexFrameFunc);
};

exports.testOpcode = function(test){
	test.expect(3);
	var opcodeFrameFunc = function(socket){ tcpUtils.opcode(tcpUtils.frame(socket)); };
	createServerAndClient(opcodeFrameFunc, opcodeFrameFunc, function(opcode, data){
		test.equal(opcode, 42, "Buffer is not Friendly");
		test.equal(data.length, 4, "Buffer is incorrect length");
		test.equal(data.readUInt32LE(0), 0x01020408, "Incorrect payload delivered");
		test.done();
	}, function(){
		var sendBuf = new Buffer(4);
		sendBuf.writeUInt32LE(0x01020408, 0);
		return [42, sendBuf];
	});
};