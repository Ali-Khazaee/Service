'use strict'

const FileSystem = require('fs')

module.exports =
{
    HTTP_PORT: process.env.HTTP_PORT,
    SERVER_PORT: process.env.SERVER_PORT,
    SERVER_STORAGE: './Storage/',
    SERVER_STORAGE_TEMP: './Storage/Temp/',

    AUTH_PRIVATE_KEY: FileSystem.readFileSync('./Storage/PrivateKey.pem'),
    AUTH_PUBLIC_KEY: FileSystem.readFileSync('./Storage/PublicKey.pem'),

    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_SENDER: process.env.EMAIL_SENDER,
    EMAIL_USERNAME: process.env.EMAIL_USERNAME,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    EMAIL_PORT: process.env.EMAIL_PORT,

    PATTERN_EMAIL: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/,
    PATTERN_USERNAME: /^(?![^a-zA-Z])(?!.*([_.])\1)[\w.]*[a-zA-Z]$/,
    PATTERN_IR_PHONE: /^\+989\d{9}$/
}
