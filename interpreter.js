var fs=require('fs')
global.require=require
var input=process.argv[2]
if(process.argv.length<3){
    //breakpoint goes here for debugging
    5+5
}
var in_debug=
typeof v8debug === 'object';
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


// var opcmapping={
//     ito:{},
//     itcb:{},
//     ita:{},
//     otcb:{},
//     ota:{}
// }
function bufCopy(buf,start,end){
    var buffarray=[]
    for(var i=start;i<end;i++)
      if(buf[i]!==undefined)
         buffarray.push(buf[i])
    return Buffer.from(buffarray)
  }


global. execute_bytecode=(mem=new Memory(),opcodes,from=0,exitAt=65535)=>{
    mem.instptr=from
    
    while(mem.instptr<mem.bytecode.length&&mem.instptr<exitAt){
        const [,,,f,a]=opcodes.opcodes[mem.bytecode[mem.instptr++]]
        f(a?.call())
        
    }

    return mem  
}
const nbcsign=0x4e424631
global. parse_nbf=(nbcbuf)=>{
    var ofs=0
    if(nbcbuf.readUInt32BE(ofs)!=nbcsign)
        throw new Error("Invalid NBF file: signature not found")
    ofs+=4
    var mem=new Memory()
    var opcodes = require('./assets/opcodes')
    opcodes=opcodes(mem)
    mem.opcodes=opcodes
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
    return mem
}
global. readAndParseNBF=(filepath)=>parse_nbf(fs.readFileSync(filepath))
global. compileFunction=(oldmem,address)=>{
    var mem=new Memory()
    mem.strpool=oldmem.strpool
    mem.bytecode=oldmem.bytecode
    mem.metadata=oldmem.metadata
    mem.vartab=oldmem.vartab
    mem.opcodes=oldmem.opcodes
    var endAdress=mem.bytecode.readUint16BE(address-3)
    return (...a)=>{
        mem.stack.splice(0)
        mem.stack.push(...a)
        return execute_bytecode(mem,mem.opcodes,address,endAdress).stack[0]
    }
}
global. runNBF=(filepath)=>{var mem=readAndParseNBF(filepath);execute_bytecode(mem,mem.opcodes)}
global. importFunction=(finame,funame)=>{
    var mem=readAndParseNBF(finame)
    var exports=JSON.parse(mem.metadata["_exports"])
    if(!exports[funame])throw new Error(`File ${finame} does not export function ${funame}`)
    var endAdress=mem.bytecode.readUint16BE(exports[funame]-3)
    //var s=()=>stack.shift(),m=s(),f=s()+3,t=s()-6;(...a)=>{m.stack.push(...a);return execute_bytecode(m,m.opcodes,f,t).stack[0]}
    return (...a)=>{
        mem.stack.splice(0)
        mem.stack.push(...a)
        return execute_bytecode(mem,mem.opcodes,exports[funame],endAdress).stack[0]
    }
}

runNBF(input)