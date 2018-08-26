'use strict'

const Core = require('./Core')
const DataBase = require('./DataBase')
const Upload = require('./Upload')

module.exports =
{
    Core,
    DataBase,
    Upload,
    ServerID: process.env.SERVER_ID
}
