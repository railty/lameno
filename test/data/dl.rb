#the data is comming from
#http://theremin.music.uiowa.edu/MISpiano.html#
ls = File.read('data.txt')
ls.scan(/href="(.*)" /).each do |l|
  url = l[0]
  if url =~/\.ff\./ then
    url.gsub!(' ', '%20')
    puts "curl -O http://theremin.music.uiowa.edu/#{url}"
    `curl -O http://theremin.music.uiowa.edu/#{url}`
  end
end
