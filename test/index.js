var should = require('chai').should(),
    lamejs = require('../lamejs/lamejs'),
    datapath = './test/data/',
    outputpath = './test/output/';

describe('Test Stereo 44100', function() {
  it('should work', function() {
    var fs = require('fs');
    var r1 = fs.readFileSync(datapath + "Left44100.wav");
    var r2 = fs.readFileSync(datapath + "Right44100.wav");
    var fd = fs.openSync(outputpath + "combine.mp3", "w");
    var sampleBuf1 = new Uint8Array(r1).buffer;
    var sampleBuf2 = new Uint8Array(r2).buffer;
    var w1 = lamejs.WavHeader.readHeader(new DataView(sampleBuf1));
    var w2 = lamejs.WavHeader.readHeader(new DataView(sampleBuf2));

    var samples1 = new Int16Array(sampleBuf1, w1.dataOffset, w1.dataLen / 2);
    var samples2 = new Int16Array(sampleBuf2, w2.dataOffset, w2.dataLen / 2);
    var remaining1 = samples1.length;
    var remaining2 = samples2.length;

    remaining1.should.equal(remaining2);
    w1.sampleRate.should.equal(w2.sampleRate);

    var lameEnc = new lamejs.Mp3Encoder(2, w1.sampleRate, 128);
    var maxSamples = 1152;

    var time = new Date().getTime();
    for (var i = 0; remaining1 >= maxSamples; i += maxSamples) {
        var left = samples1.subarray(i, i + maxSamples);
        var right = samples2.subarray(i, i + maxSamples);

        var mp3buf = lameEnc.encodeBuffer(left, right);
        if (mp3buf.length > 0) {
            fs.writeSync(fd, new Buffer(mp3buf), 0, mp3buf.length);
        }
        remaining1 -= maxSamples;
    }

    var mp3buf = lameEnc.flush();
    if (mp3buf.length > 0) {
        fs.writeSync(fd, new Buffer(mp3buf), 0, mp3buf.length);
    }
    fs.closeSync(fd);
    time = new Date().getTime() - time;
    console.log('done in ' + time + 'msec');

  });
});

describe('Test Full length 44100', function() {
  it('should work', function() {
    var fs = require('fs');
    var r = fs.readFileSync(datapath + "Stereo44100.wav");
    var sampleBuf = new Uint8Array(r).buffer;
    var w = lamejs.WavHeader.readHeader(new DataView(sampleBuf));
    var samples = new Int16Array(sampleBuf, w.dataOffset, w.dataLen / 2);
    var remaining = samples.length;
    var lameEnc = new lamejs.Mp3Encoder(); //w.channels, w.sampleRate, 128);
    var maxSamples = 1152;

    var fd = fs.openSync(outputpath + "stereo.mp3", "w");
    var time = new Date().getTime();
    for (var i = 0; remaining >= maxSamples; i += maxSamples) {
        var left = samples.subarray(i, i + maxSamples);
        var right = samples.subarray(i, i + maxSamples);

        var mp3buf = lameEnc.encodeBuffer(left, right);
        if (mp3buf.length > 0) {
            fs.writeSync(fd, new Buffer(mp3buf), 0, mp3buf.length);
        }
        remaining -= maxSamples;
    }
    var mp3buf = lameEnc.flush();
    if (mp3buf.length > 0) {
        fs.writeSync(fd, new Buffer(mp3buf), 0, mp3buf.length);
    }
    fs.closeSync(fd);
    time = new Date().getTime() - time;
    console.log('done in ' + time + 'msec');

  });
});
