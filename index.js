var fs=require('fs')
class Memory{
    constructor() {
        this.stack=[]
        this.pool=[]
        this.heap=Buffer.alloc(1024)
    }
    
}
var mem=new Memory()
var opcodes = require('./opcodes')(mem)
var opcmapping={
    ito:{},
    otcb:{},
    ota:{}
}
function bufCopy(buf,start,end){
    var buffarray=[]
    for(var i=start;i<end;i++)
      if(buf[i]!==undefined)
         buffarray.push(buf[i])
    return Buffer.from(buffarray)
  }
opcodes.opcodes.forEach(v=>{
    opcmapping.ito[v[1]]=v[0]
    opcmapping.otcb[v[0]]=v[3]
    var s=v[2].split('')
    var al=s[0]-0
    s.shift()
    opcmapping.ota[v[0]]=[al,...s.join('').split(',')]
})
function abta(abuf,opcode){
var args=[]
var ofs=0
opcmapping.ota[opcode].forEach((v,i)=>{
    if(!i)return
    var tp=opcodes.btypes[v]
    args.push(tp[1](bufCopy(abuf,ofs,ofs+tp[0])))
    ofs+=tp[0]
})
return args
}
function executeInstruction(opcode,argbuf){
    opcmapping.otcb[opcode](...abta(argbuf,opcode))
    
}
function execute_bytecode(codebuf=Buffer.from([])){
    var instructions=[]
    var ofs=0
    while(ofs<codebuf.length){
        var opcode=opcmapping.ito[codebuf[ofs++]]
        var argbuf=bufcopy(codebuf,ofs,opcmapping.ota[opcode][0]+ofs)
        instructions.push([opcode,argbuf])
        ofs+=argbuf.length
    }
    instructions.forEach(i=> executeInstruction(...i) )
}