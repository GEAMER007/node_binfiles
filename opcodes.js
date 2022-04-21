module.exports=(mem)=>{
    var {pool,heap,stack}=mem
    return{
    btypes:{
        "int":[
            4,
            b=>b.readUInt32BE(0),
            i=>{var buf=Buffer.from([0,0,0,0]);buf.writeUInt32BE(num);return buf}
        ]
        
    },
    opcodes:[
    [
        "pusha",
        1,
        "1int",
        (addr)=>stack.push(pool[addr])
    ]
]
    }
}