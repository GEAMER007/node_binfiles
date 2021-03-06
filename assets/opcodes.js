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
function sleepSync(s){
    return new Promise(r=>setTimeout(r,s))
}
module.exports=(mem=new Memory())=>{
    var {strpool,vartab,stack}=mem
    return{
    btypes:{
        "byte":[
            1,
            b=>b[0],
            str=>Buffer.from([str-0])
        ],
        "char":[
            2,
            b=>String.fromCharCode(b.readUInt16BE(0)),
            (str='')=>{const buf=Buffer.alloc(2);buf.writeUInt16BE(str.charCodeAt(0));return buf}
        ],
        "int":[
            4,
            b=>b.readUInt32BE(0),
            str=>{const buf=Buffer.alloc(4);buf.writeUInt32BE(str-0);return buf}
        ],
        "short":[
            2,
            b=>b.readUInt16BE(0),
            str=>{const buf=Buffer.alloc(2);buf.writeUInt16BE(str-0);return buf}
        ]
        
    },
    replacers:{
        
        'pushstring':
            (str='')=>{
                var nv=''
                for(var i in str)nv+=`pushc ${str[i]}\n`
                return `${nv}buildstr ${str.length}`
            }
        
        },
    opcodes:[
    [
        'pushnull',
        0,
        '0',
        ()=>stack.push(null)
    ],
    [
        "pushi",
        1,
        "4int",
        i=>stack.push(i),
        ()=>mem.bytecode.readUint32BE((mem.instptr+=4)-4)
    ],
    [
        "calls",
        2,
        "0",
        ()=>{
            const func=stack.shift();
            const args=stack.splice(0,stack.length)
            const ret=func(...args)
            stack.push(ret)
        }
        

    ],
    [
        "pushgl",
        3,
        '0',
        ()=>stack.push(global[stack.pop()])
    ],
    [
        "pushp",
        4,
        '0',
        ()=>stack.push(strpool[stack.pop()])
    ],
    [
        "pushvar",
        5,
        '0',
        ()=>stack.push(vartab[stack.pop()])
    ],
    [
        "store",
        6,
        '0',
        ()=>vartab[stack.pop()]=stack.pop()
    ],
    [
        "delv",
        7,
        '0',
        ()=>{delete vartab[stack.pop()]}
    ],
    [
        'pops',
        8,
        '0',
        ()=>stack.pop()
    ],
    [
        'getp',
        9,
        '0',
        ()=>{
            const pname=stack.pop();
            const container=stack.pop();
            stack.push(container[pname])
        }
    ],
    [
        'setp',
        10,
        '0',
        ()=>{
            const newval=stack.pop()
            const pname=stack.pop();
            const container=stack.pop();
            container[pname]=newval
            stack.push(container)
        }
    ],
    [
        'exit',
        11,
        '4int',
        i=>process.exit(i),
        ()=>mem.bytecode.readUint32BE((mem.instptr+=4)-4)
    ],
    [
        'new',
        12,
        '0',
        ()=>{
            const clss=stack.shift()
            const args=stack.splice(0,stack.length)
            inst=new clss(...args)
            stack.push(inst)
        }
    ],
    [
        'invokeJS',
        13,
        '0',
        ()=>stack.push(eval(stack.pop()))
    ],
    [
        'add',
        14,
        '0',
        ()=>stack.push(stack.pop()+stack.pop())
    ],
    [
        'sub',
        15,
        '0',
        ()=>stack.push(stack.pop()-stack.pop())
    ],
    [
        'mul',
        16,
        '0',
        ()=>stack.push(stack.pop()*stack.pop())
    ],
    [
        'div',
        17,
        '0',
        ()=>stack.push(stack.pop()/stack.pop())
    ],
    [
        'pow',
        18,
        '0',
        ()=>stack.push(stack.pop()**stack.pop())

    ],
    [
        'dup',
        19,
        '0',
        ()=>stack.push(stack[stack.length-1])
    ],
    [
        'printdebug',
        20,
        '0',
        ()=>console.log("\n============DEBUG============\n",{stack,vartab,strpool},"\n============DEBUG============\n")
    ],
    [
        'shift',
        21,
        '0',
        ()=>stack.shift()
    ],
    [
        'srev',
        22,
        '0',
        ()=>stack.reverse()
    ],
    [
        'buildstr',
        23,
        '2short',
        si=>stack.push(stack.splice(stack.length-si,stack.length).join('')),
        ()=>mem.bytecode.readUint16BE((mem.instptr+=2)-2)
    ],
    [
        'pushc',
        24,
        '2char',
        c=>stack.push(c),
        ()=>String.fromCharCode(mem.bytecode.readUint16BE((mem.instptr+=2)-2))
    ],
    [
        'pushs',
        25,
        '2short',
        s=>stack.push(s),
        ()=>mem.bytecode.readUint16BE((mem.instptr+=2)-2)
    ],
    [
        'pushb',
        26,
        '1byte',
        b=>stack.push(b),
        ()=>mem.bytecode[mem.instptr++]
    ],
    [
        'stackl',
        27,
        '0',
        ()=>stack.push(stack.length)
    ],
    [
        'getip',
        28,
        '0',
        ()=>stack.push(mem.instptr)
    ],
    [
        'setip',
        29,
        '0',
        ()=>mem.instptr=stack.pop()
    ],
    [
        'jmp',
        30,
        '2short',
        i=>mem.instptr=i,
        ()=>mem.bytecode.readUint16BE((mem.instptr+=2)-2)
    ],
    [
        'ifej',
        31,
        '0',
        ()=>{
            const w=stack.pop()
            const t=stack.pop()-1
            const f=stack.pop()-1
            mem.instptr=w?t:f
        }
    ],
    [
        'pushtrue',
        32,
        '0',
        ()=>stack.push(true)
    ],
    [
        'pushfalse',
        33,
        '0',
        ()=>stack.push(false)
    ],
    [
        'bxor',
        34,
        '0',
        ()=>stack.push(stack.pop()^stack.pop())
    ],
    [
        'and',
        35,
        '0',
        ()=>stack.push(stack.pop()&&stack.pop())
    ],
    [
        'or',
        36,
        '0',
        ()=>stack.push(stack.pop()||stack.pop())
    ],
    [
        'not',
        37,
        '0',
        ()=>stack.push(!stack.pop())
    ],
    [
        'eq',
        38,
        '0',
        ()=>stack.push(stack.pop()==stack.pop())
    ],
    [
        'neq',
        39,
        '0',
        ()=>stack.push(stack.pop()!=stack.pop())
    ],
    [
        'band',
        40,
        '0',
        ()=>stack.push(stack.pop()&stack.pop())
    ],
    [
        'mod',
        41,
        '0',
        ()=>stack.push(stack.pop()%stack.pop())
    ],
    [
        'xor',
        42,
        '0',
        ()=>{
            const v1=stack.pop();
            const v2=stack.pop();
            stack.push(v1&&!v2||!v1&&v2)
        }
    ],
    [
        'inc',
        43,
        '0',
        ()=>stack[stack.length-1]++
    ],
    [
        'dec',
        44,
        '0',
        ()=>stack[stack.length-1]--
    ],
    [
        'codepoint',
        45,
        '0',
        ()=>mem.codepoints[stack.pop()]=mem.instptr+1
    ],
    [
        'gotocp',
        46,
        '0',
        ()=>mem.instptr=mem.codepoints[stack.pop()]
    ],
    [
        'getcp',
        47,
        '0',
        ()=>stack.push(mem.codepoints[stack.pop()])
    ],
    [
        'remcp',
        48,
        '0',
        ()=>delete mem.codepoints[stack.pop()]
    ],
    [
        'jmpo',
        49,
        '0',
        ()=>mem.instptr+=stack.pop()-0
    ],
    [
        'jmpa',
        50,
        '0',
        ()=>mem.instptr-=stack.pop()-0
    ],
    [
        'gr',
        51,
        '0',
        ()=>stack.push(stack.pop()>stack.pop())
    ],
    [
        'le',
        52,
        '0',
        ()=>stack.push(stack.pop()<stack.pop())
    ],
    [
        'gre',
        53,
        '0',
        ()=>stack.push(stack.pop()>=stack.pop())
    ],
    [
        'lee',
        54,
        '0',
        ()=>stack.push(stack.pop()<=stack.pop())
    ],
    [
        'getmeta',
        55,
        '0',
        ()=>stack.push(mem.metadata[stack.pop()])
    ],
    [
        'pcalls',
        56,
        '0',
        ()=>{
            const obj=stack.shift()
            const func=stack.shift();
            const args=stack.splice(0,stack.length)
            const ret=obj[func](...args)
            stack.push(ret)
        }
    ],
    [
        'ltf',
        57,
        '0',
        ()=>stack.push(stack.shift())
    ],
    [
        'ftl',
        58,
        '0',
        ()=>stack.unshift(stack.pop())
    ],
    [
        'fts',
        59,
        '0',
        ()=>stack.push(stack.pop(),stack.pop())
    ],
    [
        'sleep',
        60,
        '0',
        async()=>await sleepSync(stack.pop())
    ],
    [
        'iters',
        61,
        '0',
        ()=>stack.push(...stack.pop())
    ],
    [
        'nop',
        62,
        '0',
        ()=>{}
    ],
    [
        'pushundefined',
        63,
        '0',
        ()=>stack.push(undefined)
    ],
    [
        'pushnan',
        62,
        '0',
        ()=>stack.push(NaN)
    ]
    

    
]
    }
}