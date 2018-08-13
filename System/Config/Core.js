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

    // Email Config
    EMAIL_HOST: 'smtp.gmail.com',
    EMAIL_SECURE: true,
    EMAIL_FROM: 'dev.khazaee@gmail.com',
    EMAIL_USERNAME: 'dev.khazaee@gmail.com',
    EMAIL_PASSWORD: 'Dev123mail',
    EMAIL_PORT: 465,

    // Regexp Pattern
    PATTERN_EMAIL: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/,
    PATTERN_USERNAME: /^(?![^a-zA-Z])(?!.*([_.])\1)[\w.]*[a-zA-Z]$/,
    PATTERN_IR_PHONE: /^\+989\d{9}$/
}
