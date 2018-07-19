'use strict'

const FS = require('fs')

module.exports =
{
    // Server
    SERVER_PORT: 37001,
    SERVER_STORAGE: './Storage/',
    SERVER_STORAGE_TEMP: './Storage/Temp/',

    // Authentication
    AUTH_PRIVATE_KEY: FS.readFileSync('./Storage/PrivateKey.pem'),
    AUTH_PUBLIC_KEY: FS.readFileSync('./Storage/PublicKey.pem'),

    // Misc
    PATTERN_USERNAME: /^(?![^a-z])(?!.*([_.])\1)[\w.]*[a-z]$/,
    PATTERN_ALL_PHONE: /[^+0-9]/g,
    PATTERN_IR_PHONE: /^\+989\d{9}$/
}
