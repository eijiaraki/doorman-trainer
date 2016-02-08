"use strict";

var cv = require("opencv/lib/opencv.js");
var haarcascade = __dirname + "/node_modules/opencv/data/haarcascade_frontalface_alt.xml";
var fs = require('fs');

var setting = {
	trainingCount: 100,
	saveTo: __dirname + "/data/positive/",
	name: false
}
var status = {
	trained: 0,
	capturing: false
}

var Trainer = function() {
};

Trainer.prototype.capture = function () {
	if (!setting.name) return;
	try {
		var camera = new cv.VideoCapture(0);
		var window = new cv.NamedWindow('Video', 0);
		camera.read(function(err, im) {
		  if (err) throw err;
		  if (im.size()[0] > 0 && im.size()[1] > 0){
			im.detectObject(haarcascade, {"scale":1.4, "min":[250,250]}, function(err, faces) {
				if (err) throw err;
				if (faces.length > 0 ) {
					console.log("face detected");
				}
				for (var i = 0; i < faces.length; i++) {
					var face = faces[i];
					if (status.trained >= setting.trainingCount) {
						console.log("Capture finished. Proceed to training");
						clearInterval(status.capturing);
					}
					// save positive data
					var im2 = im.crop(face.x, face.y, face.width, face.height);
					im2.convertGrayscale();
					im2.save(setting.saveTo + status.trained + ".jpg");
					status.trained ++;
					console.log("saved " + status.trained);

					// display
					/*
					im.rectangle(
						[face.x, face.y],
						[face.width, face.height], 
						[0, 255, 0],
						2);
					*/
				}
			}); 
			window.show(im, 100);
		  }
		window.blockingWaitKey(0, 50);
		});
	} catch (e){
		clearInterval(status.capturing);
		console.log("Couldn't start camera:" + e);
	}
};

Trainer.prototype.getName = function() {
	var readline=  require('readline');
	var rl = readline.createInterface(process.stdin, process.stdout, null);
	rl.question("Input name of the person to recognize: ", function(answer) {
		setting.saveTo += answer + "/";
		fs.mkdirSync(setting.saveTo, '0755');
		setting.name = answer;
		rl.close();
		console.log("Start capturing " + setting.name + "'s face..");
	});
};

Trainer.prototype.run = function() {
	this.getName();
	// capturing
	status.capturing = setInterval(this.capture, 30);
};

var tr = new Trainer();
tr.run();
