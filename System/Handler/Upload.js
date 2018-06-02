// Set Strict
'use strict'

//
// Libraries
//

const Request = require('request')

const UploadConfig = require('../Config/Upload')
const Misc = require('../Handler/Misc')

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
    return undefined
}

function ServerURL(ID)
{
    if (Misc.IsUndefined(ServerList[ID]))
    {
        Misc.Analyze('OnServerURLWarning', { ID: ID })
        return undefined
    }

    return ServerList[ID].URL
}

function BestServerID()
{
    return new Promise(function(resolve)
    {
        let Count = 0
        let Result = []

        for (let Server of ServerList)
        {
            Request.post({ url: Server.URL + '/space', form: { Password: ServerToken(Server.ID) } }, function(Error, Response, Body)
            {
                try
                {
                    Result.push({ 'ID': Server.ID, 'Space': JSON.parse(Body).Space })
                }
                catch (Execption)
                {
                    Misc.Analyze('OnBestServerIDWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                }

                if (++Count >= ServerList.length)
                {
                    const HighSpace = Math.max.apply(Math, Result.map(function(i)
                    {
                        return i.Space
                    }))

                    resolve(Result.find(function(i)
                    {
                        return i.Space === HighSpace
                    }).ID)
                }
            })
        }
    })
}

function DeleteFile(ID, URL)
{
    Request.post({ url: ServerURL(ID) + '/delete', form: { Password: ServerToken(ID), Path: URL } }, function(Error, Response, Body)
    {
        try
        {
            return JSON.parse(Body).Result
        }
        catch (Execption)
        {
            Misc.Analyze('OnBestServerIDWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
        }

        return 1
    })
}

function UploadFile(URL, Password, Stream)
{
    return new Promise(function(resolve)
    {
        Request.post({ url: URL + '/file', formData: { Password: Password, File: Stream } }, function(Error, Response, Body)
        {
            try
            {
                const Data = JSON.parse(Body)
                resolve({ Result: Data.Result, Path: Data.Path })
            }
            catch (Execption)
            {
                Misc.Analyze('OnUploadFileWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                resolve({ Result: -1 })
            }
        })
    })
}

function UploadVideo(URL, Password, Stream)
{
    return new Promise(function(resolve)
    {
        Request.post({ url: URL + '/video', formData: { Password: Password, File: Stream } }, function(Error, Response, Body)
        {
            try
            {
                const Data = JSON.parse(Body)
                resolve({ Result: Data.Result, Path: Data.Path })
            }
            catch (Execption)
            {
                Misc.Analyze('OnUploadVideoWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                resolve({ Result: -1 })
            }
        })
    })
}

function UploadImage(URL, Password, Stream)
{
    return new Promise(function(resolve)
    {
        Request.post({ url: URL + '/image', formData: { Password: Password, File: Stream } }, function(Error, Response, Body)
        {
            try
            {
                const Data = JSON.parse(Body)
                resolve({ Result: Data.Result, Path: Data.Path })
            }
            catch (Execption)
            {
                Misc.Analyze('OnUploadImageWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                resolve({ Result: -1 })
            }
        })
    })
}

function UploadVoice(URL, Password, Stream)
{
    return new Promise(function(resolve)
    {
        Request.post({ url: URL + '/voice', formData: { Password: Password, File: Stream } }, function(Error, Response, Body)
        {
            try
            {
                const Data = JSON.parse(Body)
                resolve({ Result: Data.Result, Path: Data.Path })
            }
            catch (Execption)
            {
                Misc.Analyze('OnUploadVoiceWarning', { Execption: Execption, Error: Error, Body: Body, Response: Response })
                resolve({ Result: -1 })
            }
        })
    })
}

module.exports.ServerToken = ServerToken
module.exports.BestServerID = BestServerID
module.exports.DeleteFile = DeleteFile
module.exports.ServerURL = ServerURL
module.exports.UploadFile = UploadFile
module.exports.UploadVideo = UploadVideo
module.exports.UploadImage = UploadImage
module.exports.UploadVoice = UploadVoice
