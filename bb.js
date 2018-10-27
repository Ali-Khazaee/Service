const tls = require('tls')

const socket = tls.connect(37000, 'localhost', { rejectUnauthorized: false }, () =>
{
    console.log('client connected', socket.authorized ? 'authorized' : 'unauthorized')
})

socket.setEncoding('utf8')

socket.on('data', (data) =>
{
    console.log(data)
})

socket.on('error', (e) =>
{
    console.log(e)
})

socket.on('end', () =>
{
    console.log('End')
})
