'use strict'

const TLS = require('tls')
const FileSystem = require('fs')

const Misc = require('./System/Handler/MiscHandler')

process.on('uncaughtException', (Error) => Misc.Analyze('AppUncaughtException', { Error: Error }))
process.on('unhandledRejection', (Error) => Misc.Analyze('AppUnhandledRejection', { Error: Error }))

const ServerSocketOption =
{
    key: FileSystem.readFileSync('./Storage/SocketPrivateKey.pem'),
    cert: FileSystem.readFileSync('./Storage/SocketPublicKey.pem'),
    dhparam: FileSystem.readFileSync('./Storage/SocketDHKey.pem'),
    ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256',
    honorCipherOrder: true
}

const ServerSocket = TLS.createServer(ServerSocketOption, (Sock) =>
{
    Misc.Analyze('SocketConnected', { IP: Sock.remoteAddress })
})

ServerSocket.on('tlsClientError', (A, B) => Misc.Analyze('tlsClientError', { A: A }))

ServerSocket.on('close', () => Misc.Analyze('ServerSocketClose'))

ServerSocket.on('error', (Error) => Misc.Analyze('ServerSocketError', { Error: Error }))

ServerSocket.listen(37000, 'localhost', () => Misc.Analyze('ServerSocketListen'))
