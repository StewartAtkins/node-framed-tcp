var net = require('net');

module.exports = exports = self = {};

var hookList = ["write", "end"];

self.hookSendFuncs = function(shim, hook){
	hookList.forEach(function(funcname){
		var obj = shim.getObject();
		if(!shim[funcname]){
			shim[funcname] = function(){obj[funcname].apply(obj, arguments);}
		}
		var oldFunc = shim[funcname];
		shim[funcname] = function(){
			var newArguments = hook(arguments);
			oldFunc.apply(shim, newArguments);
		};
	});
}