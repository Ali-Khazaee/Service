'use strict'

var tls = require('tls')
var fs = require('fs')

const PORT = 37000

// Pass the certs to the server and let it know to process even unauthorized certs.
var options =
{
    ca: [ fs.readFileSync('./Storage/ServerPublicKey.pem') ]
}

var client = tls.connect(PORT, 'localhost', options, function()
{
// Check if the authorization worked
    if (client.authorized)
        console.log('Connection authorized by a Certificate Authority.')
    else
        console.log('Connection not authorized: ' + client.authorizationError)

    // Send a friendly message
    client.write('I am the client sending you a message.')
})

client.on('data', function(data)
{
    console.log('Received: %s [it is %d bytes long]', data.toString().replace(/(\n)/gm, ''), data.length)
})

client.on('close', function()
{
    console.log('Connection closed')
})

// When an error ocoures, show it.
client.on('error', function(error)
{
    console.error(error)
    // Close the connection after the error occurred.
    client.destroy()
})

setTimeout(() =>
{
    client.write('I am the client sending you a message.')
    console.log('Closed')
    // client.end()
    client.destroy()
}, 15000)
