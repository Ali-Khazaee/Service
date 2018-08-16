'use strict'

const FileSystem = require('fs')
const Request = require('request')

const Misc = require('../Handler/MiscHandler')
const UploadConfig = require('../Config/Upload')

const ServerList =
[
    { ID: 0, URL: UploadConfig.UPLOAD_SERVER_1 },
    { ID: 1, URL: UploadConfig.UPLOAD_SERVER_2 }
]

function ServerToken(ID)
{
    switch (ID)
    {
        case 0: return UploadConfig.UPLOAD_SERVER_1_TOKEN
        case 1: return UploadConfig.UPLOAD_SERVER_2_TOKEN
    }

    Misc.Analyze('OnServerTokenWarning', { ID: ID })
}

function ServerURL(ID)
{
    if (Misc.IsUndefined(ServerList[ID]))
    {
        Misc.Analyze('OnServerURLWarning', { ID: ID })
        return
    }

    return ServerList[ID].URL
}

function BestServerID()
{
    return new Promise(function(resolve)
    {
        let Count = 0
        let Failed = true
        let ServerResult = []

        for (let Server of ServerList)
        {
            Request.post({ url: `${Server.URL}/space`, form: { Password: ServerToken(Server.ID) } }, function(Error, Response, Body)
            {
                try
                {
                    ServerResult.push({ 'ID': Server.ID, 'Space': JSON.parse(Body).Space })
                    Failed = false
                }
                catch (Execption)
                {
                    Misc.Analyze('OnBestServerIDWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                }

                if (++Count >= ServerList.length)
                {
                    if (Failed)
                    {
                        resolve({ Result: 1 })
                        return
                    }

                    const HighSpace = Math.max.apply(Math, ServerResult.map(function(i)
                    {
                        return i.Space
                    }))

                    const ID = ServerResult.find(function(i)
                    {
                        return i.Space === HighSpace
                    }).ID

                    resolve({ Result: 0, ID: ID })
                }
            })
        }
    })
}

function UploadFile(Path)
{
    return new Promise(async function(resolve)
    {
        const ServerResult = await BestServerID()

        if (ServerResult.Result !== 0)
        {
            resolve({ Result: 1 })
            return
        }

        const File = FileSystem.createReadStream(Path)

        Request.post({ url: `${ServerURL(ServerResult.ID)}/file`, formData: { Password: ServerToken(ServerResult.ID), File: File } }, function(Error, Response, Body)
        {
            try
            {
                const Data = JSON.parse(Body)
                resolve({ Result: Data.Result, ID: ServerResult.ID, Path: Data.Path })
            }
            catch (Execption)
            {
                Misc.Analyze('OnUploadFileWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                resolve({ Result: 2 })
            }
        })
    })
}

function UploadVideo(Path)
{
    return new Promise(async function(resolve)
    {
        const ServerResult = await BestServerID()

        if (ServerResult.Result !== 0)
        {
            resolve({ Result: 1 })
            return
        }

        const File = FileSystem.createReadStream(Path)

        Request.post({ url: `${ServerURL(ServerResult.ID)}/video`, formData: { Password: ServerToken(ServerResult.ID), File: File } }, function(Error, Response, Body)
        {
            try
            {
                const Data = JSON.parse(Body)
                resolve({ Result: Data.Result, ID: ServerResult.ID, Path: Data.Path })
            }
            catch (Execption)
            {
                Misc.Analyze('OnUploadVideoWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                resolve({ Result: 2 })
            }
        })
    })
}

function UploadImage(Path)
{
    return new Promise(async function(resolve)
    {
        const ServerResult = await BestServerID()

        if (ServerResult.Result !== 0)
        {
            resolve({ Result: 1 })
            return
        }

        const File = FileSystem.createReadStream(Path)

        Request.post({ url: `${ServerURL(ServerResult.ID)}/image`, formData: { Password: ServerToken(ServerResult.ID), File: File } }, function(Error, Response, Body)
        {
            try
            {
                const Data = JSON.parse(Body)
                resolve({ Result: Data.Result, ID: ServerResult.ID, Path: Data.Path })
            }
            catch (Execption)
            {
                Misc.Analyze('OnUploadImageWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                resolve({ Result: 2 })
            }
        })
    })
}

function UploadVoice(Path)
{
    return new Promise(async function(resolve)
    {
        const ServerResult = await BestServerID()

        if (ServerResult.Result !== 0)
        {
            resolve({ Result: 1 })
            return
        }

        const File = FileSystem.createReadStream(Path)

        Request.post({ url: `${ServerURL(ServerResult.ID)}/voice`, formData: { Password: ServerToken(ServerResult.ID), File: File } }, function(Error, Response, Body)
        {
            try
            {
                const Data = JSON.parse(Body)
                resolve({ Result: Data.Result, ID: ServerResult.ID, Path: Data.Path })
            }
            catch (Execption)
            {
                Misc.Analyze('OnUploadVoiceWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                resolve({ Result: 2 })
            }
        })
    })
}

module.exports.ServerToken = ServerToken
module.exports.BestServerID = BestServerID
module.exports.ServerURL = ServerURL
module.exports.UploadFile = UploadFile
module.exports.UploadVideo = UploadVideo
module.exports.UploadImage = UploadImage
module.exports.UploadVoice = UploadVoice
