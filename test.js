var net = require('net')
var fs = require('fs')

var client = new net.Socket()

client.connect(37001, '157.119.190.112', function()
{
    console.log('Connected')

    client.write(Send(100, 'Salam'))
    client.write(Send(4294967295, 'QQ Bang Bang')) // 4294967295
    client.write(Send(0, 'HojjAt Kojany'))
    client.write(Send(100, 'Salam QQ'))

    fs.readFile('10.jpg', function(Error, Data)
    {
        if (Error)
            console.log(Error)
        console.log(Data)
        console.log(Data.length)
        console.log(Data.toString().length)

        client.write(Send(44, Data))
    })

    setTimeout(() =>
    {
        client.end()
    }, 200000)
})

function Send(PacketID, Data, File)
{
    let FileLength = File.length || 0
    let DataBuffer = Buffer.alloc(2 + 4 + 4 + Data.length + FileLength)
    DataBuffer.writeUInt16LE(PacketID, 0) // Packet
    DataBuffer.writeUInt32LE(DataBuffer.length, 2) // Length Buffer
    DataBuffer.writeUInt32LE(Data.length, 6) // Length Data
    DataBuffer.write(Data, 10)

    return DataBuffer
}
