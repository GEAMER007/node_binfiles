var fs=require('fs')
global.require=require
var input=process.argv[2]
if(process.argv.length<3){
    //breakpoint goes here for debugging
    5+5
}
var in_debug=typeof v8debug === 'object';
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
    itcb:{},
    ita:{},
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
    opcmapping.itcb[v[1]]=v[3]
    opcmapping.otcb[v[0]]=v[3]
    var s=v[2].split('')
    var al=s[0]-0
    s.shift()
    var a=[al,...s.join('').split(',')]
    opcmapping.ota[v[0]]=a
    opcmapping.ita[v[1]]=a
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
mem
 function executeInstruction(opcode,...args){
     opcmapping.otcb[opcode](...args)
    
}
function execute_bytecode(codebuf=new Buffer()){
    var ofs=0
    if(in_debug){
    var instructions=[]
    while(ofs<codebuf.length){
        var opcode=opcmapping.ito[codebuf[ofs++]]
        var argbuf=bufCopy(codebuf,ofs,opcmapping.ota[opcode][0]+ofs)
        instructions.push([opcode,...abta(argbuf,opcode)])
        ofs+=argbuf.length
    }
    console.time('execution complete! time taken:')
    for(;mem.instptr<instructions.length;mem.instptr++){
        mem.curinstruction=instructions[mem.instptr].join(' ')
        executeInstruction(...instructions[mem.instptr])
    }
    console.timeEnd('execution complete! time taken:')
    }
    else{
        while(ofs<codebuf.length){
            const opar=opcodes.opcodes[codebuf[ofs++]]
            if(opar[2]!='0'){
                const argbuf=Buffer.alloc(opar[2][0]-0)
                codebuf.copy(argbuf,0,ofs,ofs+argbuf.length)
                ofs+=argbuf.length
                const arg=opcodes.btypes[opar[2].slice(1,opar[2].length)][1](argbuf)
                opar[3](arg)
                
            }
            else opar[3]()

        }
    }
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
            //metadata key-value pairs
            case 3:{
                while(lofs<sectionbody.length){
                    var strlen=sectionbody.readUint16BE(lofs)
                    lofs+=2
                    var key=bufCopy(sectionbody,lofs,lofs+strlen).toString('utf-8')
                    lofs+=strlen
                    strlen=sectionbody.readUint16BE(lofs)
                    lofs+=2
                    var value=bufCopy(sectionbody,lofs,lofs+strlen).toString('utf-8')
                    lofs+=strlen
                    mem.metadata[key]=value
                 }
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