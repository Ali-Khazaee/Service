var io = require('socket.io-client')
var ss = require('socket.io-stream')

const Fs = require('fs')

var socket = io.connect('ws://198.50.232.192:5000')
var stream = ss.createStream()
var filename = '92117_232.jpg'

console.log('1')

ss(socket).emit('SendMessage', stream, JSON.stringify({ To: 'ALI', Type: 2 }), function(Data)
{
    console.log('Result: ' + Data)
})

console.log('2')

Fs.createReadStream(filename).pipe(stream)

console.log('3')

/*
// send data
ss(socket).on('file', function(stream)
{
    Fs.createReadStream('profile.png').pipe(stream)
})

// receive data
ss(socket).emit('file', stream)
stream.pipe(Fs.createWriteStream('profile2.png'))
*/
