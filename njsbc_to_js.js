var fs=require('fs')
global.require=require
var input=process.argv[2]
var output=process.argv[3]
if(process.argv.length<3){
    //breakpoint goes here for debugging
    5+5
}
class Memory{
    constructor() {
        this.stack=[]
        this.strpool=[]
        this.vartab={}
        this.bytecode=Buffer.from([])
        this.instptr=0
        this.codepoints={}
        this.curinstruction=''
        this.metadata={}
    }
    
}
GetUInt16BE=function (num){
    var buf=Buffer.from([0,0])
    buf.writeUInt16BE(num)
    return buf
}
GetUInt32BE=function (num){
    var buf=Buffer.from([0,0,0,0])
    buf.writeUInt32BE(num)
    return buf
}
var mem=new Memory()
var opcodes = require('./assets/opcodes')
opcodes=opcodes(mem)
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
    if(v[0]=='pushfalse'){
       var x=5+5
    }
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
    if(i==0||v=='')return
    var tp=opcodes.btypes[v]
    args.push(tp[1](bufCopy(abuf,ofs,ofs+tp[0])))
    ofs+=tp[0]
})
return args
}

function execute_bytecode(codebuf=Buffer.from([])){
    var instructions=[]
    var ofs=0
    while(ofs<codebuf.length){
        var opcode=opcmapping.ito[codebuf[ofs++]]
        var argbuf=bufCopy(codebuf,ofs,opcmapping.ota[opcode][0]+ofs)
        instructions.push([opcode,...abta(argbuf,opcode)])
        ofs+=argbuf.length
    }
    var contents=`global.require=require
    class Memory{
        constructor() {
            this.stack=[]
            this.strpool=[]
            this.codepoints={}
            this.vartab={}
            this.bytecode=Buffer.from([])
            this.instptr=0
            this.curinstruction=''
            this.metadata={}
        }
        
    }
    function executeInstruction(func,...args){
        func(...args)
    }
    var mem=new Memory()
    mem.strpool=[
        "${mem.strpool.join('",\n\t"')}"
    ]
    var {strpool,vartab,stack}=mem
    var instructions=[

`
    instructions.forEach(i=>{
        
        contents+=`\t[${opcmapping.otcb[i[0]].toString()},`
        i.shift()
        i.forEach(a=>{
            if(a instanceof String)contents+=`\`${a}\`,`
            else contents+=`${a},`
        })
        contents+='],\n'
    })
    contents+=` ]
    for(;mem.instptr<instructions.length;mem.instptr++){
        mem.curinstruction=instructions[mem.instptr].join(' ')
        executeInstruction(...instructions[mem.instptr])
    }`
    fs.writeFileSync(output,contents)
}
const nbcsign=0x4e424631
function runNBF(filepath){

    var nbcbuf=fs.readFileSync(filepath)
    var ofs=0
    if(nbcbuf.readUInt32BE(ofs)!=nbcsign)
        throw new Error("Invalid NBF file: signature not found")
    ofs+=4
    
    while(ofs<nbcbuf.length){
        var sectiontype=nbcbuf.readUint8(ofs++)
        var sectionlen=nbcbuf.readUint16BE(ofs)
        ofs+=2
        var sectionbody=bufCopy(nbcbuf,ofs,ofs+sectionlen)
        ofs+=sectionlen
        var lofs=0
        switch(sectiontype){
            //strpool
            case 1:{
               while(lofs<sectionbody.length){
                   var strlen=sectionbody.readUint16BE(lofs)
                   lofs+=2
                   mem.strpool.push(bufCopy(sectionbody,lofs,lofs+strlen).toString('utf-8'))
                   lofs+=strlen
                }
                break
            }
            //bytecode
            case 2:{
                mem.bytecode=sectionbody
                break
            }
            default:
                console.warn("Unknown section found. section descriptor: "+sectiontype)
                break
        }
    }
    execute_bytecode(mem.bytecode)
    // setTimeout(process.exit,500)
}

runNBF(input)