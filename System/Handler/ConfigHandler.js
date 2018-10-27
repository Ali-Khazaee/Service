'use strict'

const Path = require('path')

const Root = Path.join(__dirname, '..', Path.sep)

module.exports =
{
    ROOT: Root,
    SERVER_STORAGE: `${Root}Storage`,
    SERVER_STORAGE_TEMP: `${Root}Storage${Path.sep}Temp`,

    PATTERN_EMAIL: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/,
    PATTERN_USERNAME: /^(?![^a-z])(?!.*([_.])\1)[\w.]*[a-z]$/,
    PATTERN_IR_PHONE: /^\+989\d{9}$/
}
