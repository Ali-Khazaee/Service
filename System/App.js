'use strict'

// Set Production Environment
process.env.NODE_ENV = 'production'

//
// Libraries
//

const Server = require('./Library/Server')
const Socket = require('./Library/Socket')

const Misc = require('./Handler/Misc')
const Config = require('./Config/Core')

const App = new Server()

App.on('connection', function(Client)
{
    Client.on('auth', function(username)
    {
        console.log(username)
    })
})

App.on('error', function(Error)
{
    Misc.Analyze('Server', { Error: Error })
})

App.on('close', function()
{
    Misc.Analyze('Server', { })
})

App.on('listening', function()
{
    Misc.Analyze('listening', { })
})

App.listen(Config.SERVER_PORT, function()
{
    Misc.Analyze('Server', { })
})

new Socket({ host: 'localhost', port: Config.SERVER_PORT }).emit('login', 'alejandrowww')
