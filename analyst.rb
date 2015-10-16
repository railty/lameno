$n = 1
def lookup(deps, js)
  $n = $n + 1
  return if $n > 100

  #puts deps
  #puts js
  #puts deps[js]

  next_deps = {}
  if deps[js] != nil then
    deps[js].each do |dep|
      next_deps[dep] = lookup(deps, dep)
    end
  end
  return next_deps
end

def get_deps
  `grep require lamejs/*.js > /tmp/require`
  ls = File.read('/tmp/require')
  deps = {}
  ls.split("\n").each do |l|
    #puts l
    if l =~ /lamejs\/(.*)\.js:.*require\('\.\/(.*)\.js'\)/ then
      #puts "#{$1}--->#{$2}"
      deps[$1] = [] if deps[$1] == nil
      deps[$1] << $2
    end
  end
  return deps
end

def get_bottom_js
  files = []
  Dir["lamejs/*.js"].each do |f|
    if f =~ /lamejs\/(.*)\.js$/ then
      files << $1
    end
  end

  deps = get_deps
  deps.each do |k, v|
    if v.length > 0 then
      files.delete(k)
    end
  end
  return files
end

deps = get_deps
bottom_js = get_bottom_js
deps.each do |k, v|
  bottom_js.each do |js|
    v.delete(js) if v.include?(js)
  end
end

#lamejs = lookup(deps, 'Lame')
#mod = lookup(deps, 'QuantizePVT')
#mod = lookup(deps, 'Lame')
mod = lookup(deps, 'BitStream')
puts mod
