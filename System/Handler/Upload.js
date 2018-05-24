const Request = require('request')
const UploadConfig = require('../Config/Upload')
const Misc = require('../Handler/Misc')

const ServerList = [ { ID: 0, URL: UploadConfig.UPLOAD_SERVER_1 }, { ID: 1, URL: UploadConfig.UPLOAD_SERVER_2 } ]

function ServerToken (ID) {
  switch (ID) {
    case 0: return UploadConfig.UPLOAD_SERVER_1_TOKEN
    case 1: return UploadConfig.UPLOAD_SERVER_2_TOKEN
  }

  Misc.Log('Upload-ServerToken: Wrong ID ( ' + ID + ' )')

  return undefined
}

function ServerURL (ID) {
  if (ServerList[ID] === undefined || ServerList[ID] === null) {
    Misc.Log('Upload-ServerURL: Wrong ID ( ' + ID + ' )')

    return undefined
  }

  return ServerList[ID].URL
}

function BestServerID () {
  return new Promise(function (resolve) {
    let Count = 0
    let Result = []

    for (let Server of ServerList) {
      Request.post({ url: Server.URL + '/StorageSpace', form: { Password: ServerToken(Server.ID) } }, function (error, httpResponse, body) {
        try {
          Result.push({ 'ID': Server.ID, 'Space': JSON.parse(body).Space })
        } catch (e) {
          Misc.Log('Upload-BestServerID: ' + e + ' -- ' + error + ' -- ' + httpResponse + ' -- ' + body)
        }

        if (++Count >= ServerList.length) {
          const HighSpace = Math.max.apply(Math, Result.map(function (i) { return i.Space }))

          resolve(Result.find(function (i) { return i.Space === HighSpace }).ID)
        }
      })
    }
  })
}

function DeleteFile (ID, URL) {
  Request.post({ url: ServerURL(ID) + '/DeleteFile', form: { Password: ServerToken(ID), Path: URL } }, function (error, httpResponse, body) {
    try {
      return JSON.parse(body).Result
    } catch (e) {
      Misc.Log('Upload-DeleteFile: ' + e + ' -- ' + error + ' -- ' + httpResponse + ' -- ' + body)
    }

    return 1
  })
}

module.exports.ServerToken = ServerToken
module.exports.BestServerID = BestServerID
module.exports.DeleteFile = DeleteFile
module.exports.ServerURL = ServerURL
