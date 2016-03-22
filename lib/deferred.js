//
// First check to see if the Promise class is defined:
//
if (typeof Promise == 'undefined') {
	module.Promise = function() {
		function err() {
			throw new Error('This version of the Node.js runtime does not support promises');
		}
		this.then = this.catch = err;
	};
} else {
	// use native Promise implementation
	module.Promise = Promise;
}

function deferred(cb) {
	if (typeof cb != 'function')
		cb = function noop() { };

	var yes, no;
	var promise = new module.Promise(function (_y, _n) {
		yes = _y;
		no = _n;
	});

	function newCb(err) {
		var rest = [].slice.call(arguments, 1);
		cb.apply(null, arguments);
		if (err)
			return no(err);
		yes.apply(null, rest);
	}
	newCb.promise = promise;

	return newCb;
}

deferred.variadic = function (args) {
	args = [].slice.call(args, []);
	var callback = deferred();

	// console.log(arguments.callee.caller.name, '(', args, ')')

	if (args.length == 0)
		args.push(callback);

	if (typeof args[args.length - 1] == 'function') {
		// if the last is already a callback, then wrap it:
		callback = deferred(args[args.length - 1]);
		args[args.length - 1] = callback;
	} else {
		// otherwise make sure the last arg is a callback:
		args.push(callback);
	}

	args.promise = callback.promise;
	args.callback = callback;
	return args;
};

module.exports = deferred;
