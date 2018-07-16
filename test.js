var net = require('net')
var fs = require('fs')

var client = new net.Socket()

client.connect(37001, '157.119.190.112', function()
{
    console.log('Connected')

    client.write(Send(100, 'Salam'))
    client.write(Send(60000, 'QQ Bang Bang'))
    client.write(Send(0, 'HojjAt Kojany'))
    client.write(Send(100, 'Salam QQ'))

    fs.readFile('10.jpg', function(Error, Data)
    {
        if (Error)
            console.log(Error)

        client.write(Send(44, 'Data e Stream Hastam :D', Data))
        client.write(Send(0, 'Wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww'))
        client.write(Send(100, 'Salam QQsssssssssssssssssssssssssss'))
        client.end()
    })
})

function Send(PacketID, Data, File)
{
    let FileLength = File ? File.length : 0
    let DataBuffer = Buffer.alloc(2 + 4 + 4 + Data.length + FileLength)
    DataBuffer.writeUInt16LE(PacketID, 0) // Packet
    DataBuffer.writeUInt32LE(DataBuffer.length, 2) // Length Buffer
    DataBuffer.writeUInt32LE(FileLength, 6) // Length Data
    DataBuffer.write(Data, 10)

    return DataBuffer
}
