var Mocha = require('mocha'),
    fs = require('fs'),
    path = require('path');

var mocha = new Mocha({
	reporter: 'spec',
	timeout: 10000
});

if (process.argv.length < 3) {
	// if no test was specified, get them all
	fs.readdirSync('test').filter(function (file) {
		return file.substr(-3) === '.js';
	}).forEach(function (file) {
		mocha.addFile(
			path.join('test', file)
			);
	});
} else {
	// else, add only the specified one.
	mocha.addFile(process.argv[2]);
}

mocha.run(function (failures) {
  process.on('exit', function () {
    process.exit(failures);
  });
});