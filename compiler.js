var source=process.argv[2]
var target=process.argv[3]
var path=require("path")
if(process.argv<3){
    //breakpoint goes here for debugging
    5+2
}
if(!target&&process.argv.length>2){
    target= `${path.dirname(source)}/${path.basename(source,'.nbcs')}.nbc`
}
console.log(`compiling ${source} => ${target}...`)
console.time(`Compilation of ${source} into ${target} completed. time taken`)
var fs=require('fs')
const nbcsign=Buffer.from("NBC1")
class Memory{
    constructor() {
        this.stack=[]
        this.strpool=[]
        this.vartab={}
        this.bytecode=Buffer.from([])
        this.instptr=0
        this.codepoints={}
        this.curinstruction=''
    }
    
}
var mem=new Memory();
var opcodes=require('./assets/opcodes')(mem)
var opcmapping={
    ito:{},
    oti:{},
    ota:{},
    otcb:{},
}
opcodes.opcodes.forEach(v=>{
    opcmapping.ito[v[1]]=v[0]
    opcmapping.oti[v[0]]=v[1]
    opcmapping.otcb[v[0]]=v[3]
    var s=v[2].split('')
    var al=s[0]-0
    s.shift()
    opcmapping.ota[v[0]]=[al,...s.join('').split(',')]
})
var inp=fs.readFileSync(source).toString('utf-8')
if(!inp.startsWith('#'))throw new Error("source file must start with a section declaration (#)")
var lines=inp.split('\r\n')
var cursec=''
var codebufs=[]
var poolbuf=[]
var sectioncompilers={
    '#comment':()=>{},
    '#strpool':l=>poolbuf.push(...GetUInt16BE(l.length),...Buffer.from(l)),
    '#code':(l,li)=>{
        
        var args=l.split(' ')
                var mn=args[0]
                if(!opcmapping.oti.hasOwnProperty(mn))throw new Error(`Unexisting instruction detected: ${mn} at ${source}:${li+1}`)
                var opc=opcmapping.ota[mn]
                var arbuf=[Buffer.from([opcmapping.oti[mn]])]
                opc.forEach((t,i)=>{
                    if(i==0||t=='')return
                    var tp=opcodes.btypes[t]
                    arbuf.push(tp[2](args[i]))
                })
                codebufs.push(Buffer.concat(arbuf))
    }
}

lines.forEach((l,li)=>{
    if(l==''||l.startsWith('//'))return
    if(l.startsWith('#')||l.startsWith('*#')){cursec=l.startsWith('*#')?'#comment':l}
    else{
        
        sectioncompilers[cursec]?sectioncompilers[cursec](l,li):console.warn("Unexpected section detected")
    }
    })
function GetUInt16BE(num){
    var buf=Buffer.from([0,0])
    buf.writeUInt16BE(num)
    return buf
}

var poolbuf=Buffer.from(poolbuf)
var codebuf=Buffer.concat(codebufs)
var nbcbufar=[...nbcsign,1,...GetUInt16BE(poolbuf.length),...poolbuf,2,...GetUInt16BE(codebuf.length),...codebuf]
fs.writeFileSync(target,Buffer.from(nbcbufar))
console.timeEnd(`Compilation of ${source} into ${target} completed. time taken`)