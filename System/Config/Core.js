'use strict'

const FileSystem = require('fs')

module.exports =
{
    HTTP_PORT: 36000,
    SERVER_PORT: 37000,
    SERVER_STORAGE: './Storage/',
    SERVER_STORAGE_TEMP: './Storage/Temp/',

    AUTH_PRIVATE_KEY: FileSystem.readFileSync('./Storage/PrivateKey.pem'),
    AUTH_PUBLIC_KEY: FileSystem.readFileSync('./Storage/PublicKey.pem'),

    EMAIL_HOST: 'smtp.gmail.com',
    EMAIL_SECURE: false,
    EMAIL_FROM: 'no-reply@channelapp.ir',
    EMAIL_SENDER_NAME: 'Channel App',
    EMAIL_USERNAME: 'mrx44278@gmail.com',
    EMAIL_PASSWORD: 'pohdiaahxoslhbhf',
    EMAIL_PORT: 587,

    PATTERN_EMAIL: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/,
    PATTERN_USERNAME: /^(?![^a-zA-Z])(?!.*([_.])\1)[\w.]*[a-zA-Z]$/,
    PATTERN_IR_PHONE: /^\+989\d{9}$/
}
