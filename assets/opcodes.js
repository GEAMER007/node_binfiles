class Memory{
    constructor() {
        this.stack=[]
        this.strpool=[]
        this.vartab={}
        this.bytecode=Buffer.from([])
    }
    
}
module.exports=(mem=new Memory())=>{
    var {strpool,vartab,stack}=mem
    return{
    btypes:{
        "int":[
            4,
            b=>b.readUInt32BE(0),
            str=>{var buf=Buffer.from([0,0,0,0]);buf.writeUInt32BE(str-0);return buf}
        ],
        "short":[
            2,
            b=>b.readUInt16BE(0),
            str=>{var buf=Buffer.from([0,0]);buf.writeUInt16BE(str-0);return buf}
        ]
        
    },
    opcodes:[
    [
        "pushi",
        1,
        "4int",
        i=>stack.push(i)
    ],
    [
        "calls",
        2,
        "0",
        ()=>{
            var func=stack.shift();
            var args=stack.splice(0,stack.length)
            var ret=func(...args)
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
        ()=>delete vartab[stack.pop()]
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
            var pname=stack.pop();
            var container=stack.pop();
            stack.push(container[pname])
        }
    ],
    [
        'setp',
        10,
        '0',
        ()=>{
            var newval=stack.pop()
            var pname=stack.pop();
            var container=stack.pop();
            container[pname]=newval
            stack.push(container)
        }
    ],
    [
        'exit',
        11,
        '4int',
        process.exit
    ],
    [
        'new',
        12,
        '0',
        ()=>{
            var clss=stack.shift()
            var args=stack.splice(0,stack.length)
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
        'sqrt',
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

    
]
    }
}