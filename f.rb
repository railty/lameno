require 'rubygems'
require 'float-formats'
require 'byebug'
include Flt

n = 44100
bytes = IEEE_binary80_BE(n).to_bytes

f = IEEE_binary80_BE.from_bytes(bytes)
puts f.to_hex(true)
