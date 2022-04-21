var fs=require('fs')
var opcodes=require('./opcodes')
var opcmapping={
    ito:{},
    otcb:{},
    ota:{}
}
opcodes.opcodes.forEach(v=>{
    opcmapping.ito[v[1]]=v[0]
    opcmapping.otcb[v[0]]=v[3]
    var s=v[2].split('')
    var al=s[0]-0
    s.shift()
    opcmapping.ota[v[0]]=[al,...s.join('').split(',')]
})
var source=process.argv[2]
var target=process.argv[3]
var inp=fs.readFileSync(source)
var lines=inp.split('\n')
lines.forEach(l=>{
    var args=l.split(' ')
    var mn=args[0]
    args.shift()

    
})