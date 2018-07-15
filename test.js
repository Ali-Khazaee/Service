var net = require('net')

var client = new net.Socket()

client.connect(37001, '157.119.190.112', function()
{
    console.log('Connected')

    let Message = 'Salam'

    let buffer = Buffer.alloc(2 + 2 + Message.length + 9000)
    buffer.writeUInt16LE(99, 0) // Packet
    buffer.writeUInt16LE(buffer.length, 2) // Length
    buffer.write(Message, 4, Message.length)

    client.write(buffer)
    client.write(buffer)
    client.write(buffer)
    client.write(buffer)
    client.end()
})
