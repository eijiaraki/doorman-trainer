"use strict";

var fs = require('fs');
var csv = require('csv');
var cv = require("opencv/lib/opencv.js");
var async = require('async');
var haarcascade = __dirname + "/node_modules/opencv/data/haarcascade_frontalface_alt.xml";

var setting = {
	trainingCount: 100,
	nameCsv: __dirname + "/namedb.csv",
	saveTo: __dirname + "/data/positive/",
	name: false
}
var status = {
	trained: 0,
	capturing: false
}

//
// NameDb
//
var NameDb = function() {
	this.db = {};
	this.maxId = false;
};
NameDb.prototype.init = function(callback) {
	// init for name DB csv parser
	var parser = csv.parse();
	var record;
	var handler = function(parent) {
		return function () {
			while(record = parser.read()) {
				parent.db[record[0]]= record[1].trim();
				if (parent.maxId < record[0]) parent.maxId = parseInt(record[0]);
			}
		}
	};
	parser.on("readable", handler(this));
	parser.on("end", function() {callback();});
	try{
		fs.createReadStream(setting.nameCsv).pipe(parser);
	} catch (e) {
		console.log("Could not read name CSV file: " + setting.nameCsv);
		throw e;
	}
};
NameDb.prototype.save = function(callback) {
	var stringifier = csv.stringify;
	var data = "";
	var row = ""
	var db = this.db;
	// convert object to array
	var arr = [];
	Object.keys(db).forEach(function (v) {
		arr.push([parseInt(v), db[v]]);
	});
	console.log("saving nameDB...");
	stringifier(arr, function(err, output) {
		var stream = fs.createWriteStream(setting.nameCsv);
		stream.write(output);
		stream.end();
		callback();
	});
};
NameDb.prototype.getId = function(name) {
	var db = this.db;
	var id = false;
	// check if the name already exist and determine name ID
	Object.keys(db).forEach(function(v) {if (db[v] == name) { id = v; return}});
	return id;
};
NameDb.prototype.getNewId = function(name) {
	this.maxId += 1;
	this.db[this.maxId] = name;
	return this.maxId;
}
//
// Trainer
//
var camera;
var window;
var Trainer = function() {
	this.nameDb = null;
	camera = new cv.VideoCapture(0);
	window = new cv.NamedWindow('Video', 0);
};
Trainer.prototype.capture = function () {
	if (!setting.name) return;

	var face = null;
	try {
		camera.read(function(err, im) {
		  if (err) throw err;
		  if (im.size()[0] > 0 && im.size()[1] > 0){
			im.detectObject(haarcascade, {"scale":1.4, "min":[250,250]}, function(err, faces) {
				if (err) throw err;
				if (faces.length > 1 ) {
					console.log("More than 1 face detected. Please do this alone");
					return;
				}
				for (var i = 0; i < faces.length; i++) {
					face = faces[i];
					if (status.trained >= setting.trainingCount) {
						console.log("\nCapture finished.");
						clearInterval(status.capturing);
					}
					// save positive data
					var im2 = im.crop(face.x, face.y, face.width, face.height);
					im2.convertGrayscale();
					im2.save(setting.saveTo + status.trained + ".jpg");
					status.trained ++;
					process.stdout.write(".");
					im2 = null;
					// show rectangle
					im.rectangle(
						[face.x, face.y],
						[face.width, face.height],
						[0, 255, 0],
						2
					);
				}
				window.show(im, 100);
			}); 
		  }
		window.blockingWaitKey(0, 50);
		});
	} catch (e){
		clearInterval(status.capturing);
		console.log("Couldn't start camera:" + e);
	}
};

Trainer.prototype.getName = function(callback) {
	// read input
	var readline=  require('readline');
	var rl = readline.createInterface(process.stdin, process.stdout, null);
	var parent = this;
	rl.question("Input name of the person to recognize: ", function(answer) {
		if (answer.trim().length < 1) {
			throw new Error("input name!");
		}
		parent.setName(answer);
		rl.close();
		callback();
	});
};

Trainer.prototype.setName = function(name) {
	var nameDb = this.nameDb;
	var nameId = nameDb.getId(name); 
	if (!nameId) {
		nameId = nameDb.getNewId(name);
	}

	// prepare dir for capture images
	setting.saveTo += nameId + "/";
	try {
		fs.statSync(setting.saveTo);
		console.log(setting.saveTo + " already exists.");
	} catch (err) {
		if(err.code == "ENOENT") {
			console.log("Mkdir: " + setting.saveTo);
			fs.mkdirSync(setting.saveTo, '0755');
		} else {
			throw err;
		}
	}
	setting.name = name;
	console.log("Start capturing " + setting.name + "'s face..");
}

Trainer.prototype.run = function(name) {
	this.nameDb = new NameDb();
	var nameDb = this.nameDb;
	var trainer = this;

	async.series([
		function(cb) {
			nameDb.init(cb);
		},
		function(cb){
			if(name) trainer.setName(name);
			cb();
		},
		function(cb) {
			if (!name) {
				trainer.getName(cb) 
			} else {
				cb();
			}
		},
		function(cb) {
			nameDb.save(cb);
		}
		], 
		function (err, values){
		}
	);
	// capturing
	status.capturing = setInterval(trainer.capture, 100);
};

var tr = new Trainer();
tr.run(process.argv[2]);


