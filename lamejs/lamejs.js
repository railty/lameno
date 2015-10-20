'use strict';

var fs = require('fs');
var common = require('./common.js');
var System = common.System;
var VbrMode = common.VbrMode;
var Float = common.Float;
var ShortBlock = common.ShortBlock;
var Util = common.Util;
var Arrays = common.Arrays;
var new_array_n = common.new_array_n;
var new_byte = common.new_byte;
var new_double = common.new_double;
var new_float = common.new_float;
var new_float_n = common.new_float_n;
var new_int = common.new_int;
var new_int_n = common.new_int_n;
var assert = common.assert;

var Lame = require('./Lame.js');
var Presets = require('./Presets.js');
var GainAnalysis = require('./GainAnalysis.js');
var QuantizePVT = require('./QuantizePVT.js');
var Quantize = require('./Quantize.js');
var Takehiro = require('./Takehiro.js');
var Reservoir = require('./Reservoir.js');
var MPEGMode = require('./MPEGMode.js');
var BitStream = require('./BitStream.js');
var Encoder = require('./Encoder.js');
var Version = require('./Version.js');
var VBRTag = require('./VBRTag.js');

function GetAudio() {
    var parse;
    var mpg;

    this.setModules = function (parse2, mpg2) {
        parse = parse2;
        mpg = mpg2;
    }
}


function Parse() {
    var ver;
    var id3;
    var pre;

    this.setModules = function (ver2, id32, pre2) {
        ver = ver2;
        id3 = id32;
        pre = pre2;
    }
}

function MPGLib() {
}

function ID3Tag() {
    var bits;
    var ver;

    this.setModules = function (_bits, _ver) {
        bits = _bits;
        ver = _ver;
    }
}

function Mp3Encoder(channels, samplerate, kbps) {
    if (arguments.length != 3) {
        console.error('WARN: Mp3Encoder(channels, samplerate, kbps) not specified, uder default 1, 44100, 128 instead');
        channels = 1;
        samplerate = 44100;
        kbps = 128;
    }
    var lame = new Lame();
    var gaud = new GetAudio();
    var ga = new GainAnalysis();
    var bs = new BitStream();
    var p = new Presets();
    var qupvt = new QuantizePVT();
    var qu = new Quantize();
    var vbr = new VBRTag();
    var ver = new Version();
    var id3 = new ID3Tag();
    var rv = new Reservoir();
    var tak = new Takehiro();
    var parse = new Parse();
    var mpg = new MPGLib();

    lame.setModules(ga, bs, p, qupvt, qu, vbr, ver, id3, mpg);
    bs.setModules(ga, mpg, ver, vbr);
    id3.setModules(bs, ver);
    p.setModules(lame);
    qu.setModules(bs, rv, qupvt, tak);
    qupvt.setModules(tak, rv, lame.enc.psy);
    rv.setModules(bs);
    tak.setModules(qupvt);
    vbr.setModules(lame, bs, ver);
    gaud.setModules(parse, mpg);
    parse.setModules(ver, id3, p);

    var gfp = lame.lame_init();

    gfp.num_channels = channels;
    gfp.in_samplerate = samplerate;
    gfp.brate = kbps;
    gfp.mode = MPEGMode.STEREO;
    gfp.quality = 3;
    gfp.bWriteVbrTag = false;
    gfp.disable_reservoir = true;
    gfp.write_id3tag_automatic = false;

    var retcode = lame.lame_init_params(gfp);
    assert(0 == retcode);
    var maxSamples = 1152;
    var mp3buf_size = 0 | (1.25 * maxSamples + 7200);
    var mp3buf = new_byte(mp3buf_size);

    this.encodeBuffer = function (left, right) {
        if (channels == 1) {
            right = left;
        }
        assert(left.length == right.length);
        if (left.length > maxSamples) {
            maxSamples = left.length;
            mp3buf_size = 0 | (1.25 * maxSamples + 7200);
            mp3buf = new_byte(mp3buf_size);
        }

        var _sz = lame.lame_encode_buffer(gfp, left, right, left.length, mp3buf, 0, mp3buf_size);
        return new Int8Array(mp3buf.subarray(0, _sz));
    };

    this.flush = function () {
        var _sz = lame.lame_encode_flush(gfp, mp3buf, 0, mp3buf_size);
        return new Int8Array(mp3buf.subarray(0, _sz));
    };
}

function fourccToInt(fourcc) {
    return fourcc.charCodeAt(0) << 24 | fourcc.charCodeAt(1) << 16 | fourcc.charCodeAt(2) << 8 | fourcc.charCodeAt(3);
}

function WavHeader() {
    this.dataOffset = 0;
    this.dataLen = 0;
    this.channels = 0;
    this.sampleRate = 0;
}

WavHeader.RIFF = fourccToInt("RIFF");
WavHeader.WAVE = fourccToInt("WAVE");
WavHeader.fmt_ = fourccToInt("fmt ");
WavHeader.data = fourccToInt("data");

WavHeader.readHeader = function (dataView) {
    var w = new WavHeader();

    var header = dataView.getUint32(0, false);
    if (WavHeader.RIFF != header) {
        return;
    }
    var fileLen = dataView.getUint32(4, true);
    if (WavHeader.WAVE != dataView.getUint32(8, false)) {
        return;
    }
    if (WavHeader.fmt_ != dataView.getUint32(12, false)) {
        return;
    }
    var fmtLen = dataView.getUint32(16, true);
    var pos = 16 + 4;
    switch (fmtLen) {
        case 16:
        case 18:
            w.channels = dataView.getUint16(pos + 2, true);
            w.sampleRate = dataView.getUint32(pos + 4, true);
            break;
        default:
            throw 'extended fmt chunk not implemented';
            break;
    }
    pos += fmtLen;
    var data = WavHeader.data;
    var len = 0;
    while (data != header) {
        header = dataView.getUint32(pos, false);
        len = dataView.getUint32(pos + 4, true);
        if (data == header) {
            break;
        }
        pos += (len + 8);
    }
    w.dataLen = len;
    w.dataOffset = pos + 8;
    return w;
};

// http://muratnkonar.com/aiff/aboutiff.html
// http://muratnkonar.com/aiff/index.html
function Aiff() {
    this.dataOffset = 0;
    this.dataLen = 0;

    this.channels = 0;
    this.sampleRate = 0;
    this.sampleFrames = 0;
    this.sampleSize = 0;

    this.kbps = 128;

    this.left = new Int16Array(0);
    this.right = new Int16Array(0);

}

Aiff.FORM = fourccToInt("FORM");
Aiff.AIFF = fourccToInt("AIFF");
Aiff.COMM = fourccToInt("COMM");
Aiff.SSND = fourccToInt("SSND");

Aiff.readFile = function(filename) {
  var fs = require('fs');
  var r = fs.readFileSync(filename);
  var sampleBuf = new Uint8Array(r).buffer;
  return Aiff.readDataView(new DataView(sampleBuf));
}

Aiff.readDataView = function(dataView) {
    var w = new Aiff();

    var header = dataView.getUint32(0, false);

    if (Aiff.FORM != header) {
        return;
    }

    var fileLen = dataView.getUint32(4, true);
    if (Aiff.AIFF != dataView.getUint32(8, false)) {
        return;
    }

    if (Aiff.COMM != dataView.getUint32(12, false)) {
        return;
    }
    var commLen = dataView.getUint32(16, false);
    var pos = 16 + 4;

    switch (commLen) {
        case 16:
        case 18:
            w.channels = dataView.getUint16(pos + 0, false);
            w.sampleFrames = dataView.getUint32(pos + 2, false);
            w.sampleSize = dataView.getUint16(pos + 6, false);
            //need to implement float 80
            //w.sampleRate = dataView.getFloat80(pos + 8, true);
            //simple but realisic way to read the float 80
            w.sampleRate = dataView.getUint16(pos + 10, false);
            break;
        default:
            throw 'extended fmt chunk not implemented';
            break;
    }
    pos += commLen;
    var data = Aiff.SSND;
    var len = 0;
    while (data != header) {
        header = dataView.getUint32(pos, false);
        len = dataView.getUint32(pos + 4, false);
        if (data == header) {
            break;
        }
        pos += (len + 8);
    }
    w.dataLen = len;
    w.dataOffset = pos + 8;

    w.left = new Int16Array(w.sampleFrames);
    w.right = new Int16Array(w.sampleFrames);
    var offset = w.dataOffset;
    for (var i=0; i<w.sampleFrames; i++){
      w.left[i] = dataView.getUint16(offset + i*4, false);
      w.right[i] = dataView.getUint16(offset + i*4 + 2, false);
    }

    return w;
};

Aiff.prototype.to_mp3 = function(filename, verbose) {
  if (verbose) console.log("start converting to mp3 ...");
  var lameEnc = new Mp3Encoder(this.channels, this.sampleRate, this.kbps); //w.channels, w.sampleRate, 128);
  var maxSamples = 1152;
  var remaining = this.left.length;
  var fd = fs.openSync(filename, "w");
  var time = new Date().getTime();
  for (var i = 0; remaining >= maxSamples; i += maxSamples) {
      var left = this.left.subarray(i, i + maxSamples);
      var right = this.right.subarray(i, i + maxSamples);

      var mp3buf = lameEnc.encodeBuffer(left, right);

      if (mp3buf.length > 0) {
          fs.writeSync(fd, new Buffer(mp3buf), 0, mp3buf.length);
      }
      remaining -= maxSamples;

      if (verbose) process.stdout.write((Math.round((this.left.length-remaining)/this.left.length*100) + "% done\r"));
  }
  fs.closeSync(fd);

  time = new Date().getTime() - time;
  if (verbose) console.log('done in ' + time + 'msec');

}

Aiff.prototype.toString = function(){
  return 'sample rate=' + this.sampleRate + ' channels=' + this.channels + ' left=' + this.left.length + ' right=' + this.right.length;
};

Aiff.prototype.trim = function(percent){
  percent = parseFloat(percent);
  if (isNaN(percent)) percent = 0;

  var leftMax = 0;
  var rightMax = 0;
  for (var i=0; i<this.left.length; i++) if (this.left[i]>leftMax) leftMax = this.left[i];
  for (var i=0; i<this.right.length; i++) if (this.right[i]>rightMax) rightMax = this.right[i];

  //console.log(leftMax);
  //console.log(rightMax);

  var leftGate = leftMax*percent;
  var rightGate = rightMax*percent;
  //console.log(leftGate);
  //console.log(rightGate);

  var iBegin = 0;
  var iEnd = this.sampleFrames-1;
  while ((this.left[iBegin]<=leftGate)&&(this.right[iBegin]<=rightGate)) {
    iBegin++;
  }
  while ((this.left[iEnd]<=leftGate)&&(this.right[iEnd]<=rightGate)) iEnd--;
  //console.log(iBegin);
  //console.log(iEnd);
  this.left = this.left.subarray(iBegin, iEnd);
  this.right = this.right.subarray(iBegin, iEnd);
};

Aiff.prototype.limit = function(ms){
  var n = ms * this.sampleRate / 1000;
  console.log(n);
  this.left = this.left.subarray(0, n);
  this.right = this.right.subarray(0, n);
};

module.exports = {
  WavHeader: WavHeader,
  Aiff: Aiff,
  Mp3Encoder: Mp3Encoder
}
