"use strict";

var EventEmitter = require("events").EventEmitter;
var fs = require('fs');
var cv = require("opencv/lib/opencv.js");
var ev = new EventEmitter;
var haarcascade = __dirname + "/node_modules/opencv/data/haarcascade_frontalface_alt.xml";
var recognizer = cv.FaceRecognizer.createLBPHFaceRecognizer();

var setting = {
	positiveDir: __dirname + "/data/positive/",
	negativeDir: __dirname + "/data/negative/"
	}

var trainInput = {
	images: [],
	labels: []
}

ev.on("loadImagesAndLabels", function (root) {
	// load list subdirectories
	var subdirs = fs.readdirSync(root);
	// reading subdir
	subdirs.forEach (function(dir) {
		var name = dir;
		dir = root + dir; 
		if (fs.statSync(dir).isDirectory()) {
			// reading images
			var files = fs.readdirSync(dir);
			files.forEach(function(file) {
				file = dir + "/" + file;
				//trainInput.images.push(file);
				cv.readImage(file, function(err, im) {
					trainInput.images.push(im);
					trainInput.labels.push(name);
				});
			});
		}
	});
});

ev.on("train", function () {
	// store image and labels
	recognizer.trainSync(trainInput.images, trainInput.labels);
	recognizer.saveSync("traindata.dat");
});

ev.on("save", function() {
	// save trained model
});

ev.on("test", function() {
	// test model
});

console.log("Creating file and label list..");
ev.emit("loadImagesAndLabels", setting.positiveDir);
ev.emit("loadImagesAndLabels", setting.negativeDir);
console.log(trainInput);
console.log("Trainnig...");
ev.emit("train");
ev.emit("save");
ev.emit("test");
