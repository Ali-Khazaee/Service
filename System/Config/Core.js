'use strict'

const FS = require('fs')

module.exports =
{
    // Server
    SERVER_PORT: process.env.PORT || 37000,
    SERVER_STORAGE: '../Storage/',

    // Authentication
    AUTH_PRIVATE_KEY: FS.readFileSync('./Storage/PrivateKey.pem'),
    AUTH_PUBLIC_KEY: FS.readFileSync('./Storage/PublicKey.pem')
}
