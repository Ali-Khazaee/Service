'use strict'

const NetService = require('net')
const EventEmitter = require('events')

const Socket = require('./Socket')
const Serializer = require('./Serializer')

class Server extends EventEmitter
{
    constructor()
    {
        super()

        this._serializer = new Serializer()
        this._server = NetService.createServer()
        this._server.on('connection', (Client) => this.emit('connection', new Socket(Client, this)))
        this._server.on('error', (Error) => this.emit('error', Error))
        this._server.on('close', () => this.emit('close'))
    }

    listen()
    {
        this._server.listen.apply(this._server, arguments)
    }
}

module.exports = Server
