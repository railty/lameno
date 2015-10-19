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

describe('Test Aiff', function() {
  this.timeout(15000);
  it('should work', function() {
    var aiff = lamejs.Aiff.readFile(datapath + "Piano.ff.C4.aiff");
    console.log("aiff:" + aiff);
    aiff.trim(0.01);
    aiff.to_mp3(outputpath + "Piano.ff.C4.mp3", 1);
  });
});

describe.only('Convert all Aiff to mp3', function() {
  this.timeout(36000000);
  it('should work', function() {
    var fs = require('fs');
    var aiffs = fs.readdirSync(datapath);
    aiffs = aiffs.filter(function(filename){
      return filename.indexOf('.aiff', filename.length - 5) !== -1;
    });
    aiffs.forEach(function(filename){
      console.log(filename);
      var aiff = lamejs.Aiff.readFile(datapath + filename);
      console.log("aiff:" + aiff);
      aiff.trim(0.05);
      aiff.to_mp3(outputpath + filename + ".mp3", 1);
    });

  });
});

/*
//http://www.onicos.com/staff/iz/formats/ieee.c
double ConvertFromIeeeExtended(unsigned char* bytes )
{
    double    f;
    int    expon;
    unsigned long hiMant, loMant;

    expon = ((bytes[0] & 0x7F) << 8) | (bytes[1] & 0xFF);
    hiMant    =    ((unsigned long)(bytes[2] & 0xFF) << 24)
            |    ((unsigned long)(bytes[3] & 0xFF) << 16)
            |    ((unsigned long)(bytes[9] & 0xFF));

    if (expon == 0 && hiMant == 0 && loMant == 0) {
        f = 0;
    }
    else {
        if (expon == 0x7FFF) {    // Infinity or NaN
            f = HUGE_VAL;
        }
        else {
            expon -= 16383;
            f  = ldexp(UnsignedToFloat(hiMant), expon-=31);
            f += ldexp(UnsignedToFloat(loMant), expon-=32);
        }
    }

    if (bytes[0] & 0x80)
        return -f;
    else
        return f;
}
*/

function ldexp(mantissa, exponent) {
    return exponent > 1023 // avoid multiplying by infinity
        ? mantissa * Math.pow(2, 1023) * Math.pow(2, exponent - 1023)
        : exponent < -1074 // avoid multiplying by zero
        ? mantissa * Math.pow(2, -1074) * Math.pow(2, exponent + 1074)
        : mantissa * Math.pow(2, exponent);
}

function UnsignedToFloat(u) {
    return (u - 2147483647.0 - 1) + 2147483648.0;
}

describe('Test Float', function() {
  it('should work', function() {
    var f = NaN;
    var bytes=[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x44, 0xAC, 0x0E, 0x40];
    bytes.reverse();

    var expon = ((bytes[0] & 0x7F) << 8) | (bytes[1] & 0xFF);
    var hiMant = ((bytes[9] & 0xFF) << 24)
            |    ((bytes[8] & 0xFF) << 16)
            |    ((bytes[7] & 0xFF) << 8)
            |    ((bytes[6] & 0xFF));
    var loMant = ((bytes[4] & 0xFF) << 24)
            |    ((bytes[5] & 0xFF) << 16)
            |    ((bytes[2] & 0xFF) << 8)
            |    ((bytes[3] & 0xFF));

            console.log(bytes);

            console.log(expon);
            console.log(hiMant);
            console.log(loMant);

    if (expon == 0 && hiMant == 0 && loMant == 0) {
        f = 0;
    }
    else{
      if (expon == 0x7FFF) {    // Infinity or NaN
          f = NaN;
      }
      else {
          expon -= 16383 + 15;
          console.log(expon);
          f  = ldexp(UnsignedToFloat(hiMant), expon-=31);
          f += ldexp(UnsignedToFloat(loMant), expon-=32);
      }
    }

    if (bytes[0] & 0x80) f = -f;

    console.log(f);
  });
});
