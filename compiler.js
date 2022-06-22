var source=process.argv[2]
var target=process.argv[3]
var path=require("path")
if(process.argv<3){
    //breakpoint goes here for debugging
    5+2
}
if(!target&&process.argv.length>2){
    target= `${path.dirname(source)}/${path.basename(source,'.njsbcs')}.njsbc`
}
console.log(`compiling ${source} => ${target}...`)
console.time(`Compilation of ${source} into ${target} completed. time taken`)
var fs=require('fs')
const nbcsign=Buffer.from("NBF1")
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

var lines=inp.split('\r\n').join("\n").split("\n")
var cursec=''
var codebufs=[]
var poolbuf=[]
var strpool=[]
var metajson=''
var areas={}
var expectedAreas=[]
var currentIP=0
var return_addresses=[]
var expected_returns=[]
var function_ends=[]
function fetchOrCreateString(c){
    var l=eval(`"${c}"`)
    return strpool.indexOf(strpool.includes(l)?l:strpool.push(l)&&poolbuf.push(...GetUInt16BE(l.length),...Buffer.from(l))&&l)
}
var sectioncompilers={
    '#comment':()=>{},
    '#strpool':l=>{
        l=eval(`"${l}"`)
        strpool.push(l);
        poolbuf.push(...GetUInt16BE(l.length),...Buffer.from(l))
    },
    '#code':(l,li)=>{
        
        var args=l.split(' ')
        var mn=args[0]
        if(mn.startsWith('$')){
            var $=mn.substring(1)
            if(!args[1]&&args[0]!='$ret')throw new Error(`$ instructions require 1 argument: ${mn} at ${source}:${li+1}`)
            switch($){
                case"importFunction":{
                    // var _readf=fetchOrCreateString('readAndParseNBF(stack.pop())')
                    // var _pack=fetchOrCreateString('var s=()=>stack.shift(),m=s(),f=s()+3,t=s()-6;(...a)=>{m.stack.push(...a);return execute_bytecode(m,m.opcodes,f,t).stack[0]}')
                    // var _bytec=fetchOrCreateString('bytecode')
                    // var _meta=fetchOrCreateString('metadata')
                    // var _readuint=fetchOrCreateString('readUInt16BE')
                    // var _exports=fetchOrCreateString('_exports')
                    // var _json=fetchOrCreateString('JSON.parse(stack.pop())')
                    var _ifunc=fetchOrCreateString('importFunction')
                    var _finame=fetchOrCreateString(args[1])
                    var _funame=fetchOrCreateString(args[2])
                    if(!args[2])throw new Error(`Please provide the function name: ${l} at ${source}:${li+1}`)
                    //
                    var jb=Buffer.from([
                        0x19,...GetUInt16BE(_ifunc),0x04,0x03,
                        0x19,...GetUInt16BE(_finame),0x04,
                        0x19,...GetUInt16BE(_funame),0x04,
                        0x02
                        
                        
                    ])
                    codebufs.push(...jb)
                    currentIP+=jb.length
                    
                    break
                }
                case'exportFunction':{
                    expectedAreas.push([args[1],null,null,(fn,fa)=>{!metajson.hasOwnProperty("_exports")?metajson._exports={}:0;return metajson._exports.hasOwnProperty(fn)?new Error(`this $function was already exported: $exportFunction ${fn} at ${source}:${li+1}`):metajson._exports[fn]=fa}])
                    break
                }
                case'if':{
                    var [,variable,fn1,fn2]=args
                    var _var=fetchOrCreateString(variable)
                    var jb=Buffer.from([0x19,0x00,0x00,0x19,0x00,0x00,0x19,...GetUInt16BE(_var),0x04,0x05,0x1f])
                        codebufs.push(...jb)
                        expectedAreas.push([fn1,codebufs.length-11,li+1],[fn2,codebufs.length-8,li+1])
                        currentIP+=12
                        break
                }
                case'function':
                if(areas.hasOwnProperty(args[1]))throw new Error(`this $function was previously defined: ${l} at ${source}:${li+1}`)
                var jb=Buffer.from([0x1e,0x00,0x00,0x08])
                codebufs.push(...jb)
                currentIP+=4
                areas[args[1]]=currentIP
                var lptr=li
                var found
                while(lptr++<lines.length-1&&!found)
                    if(lines[lptr].startsWith('$'))
                    if(!!lines[lptr].match(/\$function/))throw new Error(`$function definition can not be housed within another $function definition: ${lines[lptr]} at ${source}:${lptr+1}
    Container function: ${l} at ${source}:${li+1}`)
                    else if(!!lines[lptr].match(/\$ret/))
                    {found=true;break}
                if(!found)throw new Error(`$function does not have $ret. Please add $ret at the end of the function: ${mn} at ${source}:${li+1}`)  
                expected_returns.push(lptr,`ret_${args[1]}`,currentIP-3)
                
                break
                case'ret':
                var container =expected_returns.indexOf(li)+1
                function_ends.push([currentIP+=6,expected_returns[container+1]])
                if(!container)throw new Error(`Unexpected $ret: ${mn} at ${source}:${li+1}`)
                container=expected_returns[container]
                var ret_address=fetchOrCreateString(container)//strpool.indexOf(strpool.includes(container)?container:sectioncompilers['#strpool'](container)||container)
                var jb=Buffer.from([0x19,0x00,0x00,0x04,0x05,0x1d])
                jb.writeUInt16BE(ret_address,1)
                codebufs.push(...jb)
                
                break
                case'pushfunction':
                var c=fetchOrCreateString( "()=>mem.instptr=")
                var jb=Buffer.from([0x1a,0x01,0x19,0x00,0x00,0x0f,    0x19,0x00,0x00,0x04,    0x0e,0x0d])
                jb.writeUInt16BE(c,7)
                // jb.writeUInt16BE(x,11)
                codebufs.push(...jb)
                expectedAreas.push([args[1],codebufs.length-9,li+1])
                currentIP+=12
                break
                case'call':
                
                var ret_address=fetchOrCreateString('ret_'+args[1])//strpool.indexOf(strpool.includes(ret_var)?ret_var:sectioncompilers['#strpool'](ret_var)||ret_var)
                //1:return address
                //2:stores
                //3:jumps
                //4:returns to
                var jb=Buffer.from([0x19,0x00,0x00,    0x19,0x00,0x00,0x04,0x06,    0x1e,0x00,0x00,    0x19,0x00,0x00,0x04,0x07])
                jb.writeUInt16BE(ret_address,4)
                jb.writeUInt16BE(ret_address,12)
                codebufs.push(...jb)
                expectedAreas.push([args[1],codebufs.length-7,li+1])
                return_addresses.unshift([codebufs.length-5,codebufs.length-15,li+1])
                currentIP+=16
                break
                default:
                    throw new Error(`supplied $ instruction not found: ${mn} at ${source}:${li+1}`)
                    
            }
            
            
        }
        else{
        if(!opcmapping.oti.hasOwnProperty(mn))throw new Error(`Unexisting instruction detected: ${mn} at ${source}:${li+1}`)
        var opc=opcmapping.ota[mn]
        var arbuf=[Buffer.from([opcmapping.oti[mn]])]
        opc.forEach((t,i)=>{
            if(i==0||t=='')return
            var tp=opcodes.btypes[t]
            arbuf.push(tp[2](args[i]))
        })
        var b=Buffer.concat(arbuf)
        codebufs.push(...b)
        currentIP+=b.length
    }},
'#metadata':(l,li)=>metajson+=l+'\n'
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
var realcodebuf=Buffer.from(codebufs)
var metajson=metajson==''?{}:JSON.parse(metajson)
if(metajson.hasOwnProperty("_exports"))throw new Error(`"_exports" key is not alowed to use in top level of metadata section`)
expectedAreas.forEach(ea=>{
    if(!areas.hasOwnProperty(ea[0]))throw new Error(`reference of an undefined function detected: ${ea[0]} at ${source}:${ea[2]}`)
    var phe=ea.length>3?ea[3](ea[0],areas[ea[0]]):realcodebuf.writeUInt16BE(areas[ea[0]],ea[1])
    if(phe instanceof Error)throw phe
})
function_ends.forEach(fe=>realcodebuf.writeUInt16BE(...fe))
return_addresses.forEach(ra=>realcodebuf.writeUInt16BE(...ra))

var sections=[[1,Buffer.from(poolbuf)],[2,realcodebuf]]
var metabuf=[]
for(var k in metajson){
    var keyb=Buffer.from(k.toString())
    var keylenb=GetUInt16BE(keyb.length)
    if(typeof metajson[k] == "object") metajson[k]=JSON.stringify(metajson[k])
    var valb=Buffer.from(metajson[k].toString())
    var vallenb=GetUInt16BE(valb.length)
    metabuf.push(...keylenb,...keyb,...vallenb,...valb)
}
sections.push([3,Buffer.from(metabuf)])
var nbcbufar=[...nbcsign]//1,...GetUInt16BE(poolbuf.length),...poolbuf,2,...GetUInt16BE(codebuf.length),...codebuf]
sections.forEach(s=>nbcbufar.push(s[0],...GetUInt16BE(s[1].length),...s[1]))
fs.writeFileSync(target,Buffer.from(nbcbufar))
console.timeEnd(`Compilation of ${source} into ${target} completed. time taken`)