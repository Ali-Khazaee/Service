const Request = require('request')
const FS = require('fs')
const FFMPEG = require('fluent-ffmpeg')
const UniqueName = require('uuid/v4')
const Misc = require('./Misc')

// For Windows
// FFMPEG.setFfmpegPath('./System/FFmpeg/ffmpeg.exe');
// FFMPEG.setFfprobePath('./System/FFmpeg/ffprobe.exe');

function UploadImage (URL, Pass, File) {
  return new Promise(function (resolve) {
    Request.post({ url: URL + '/UploadImage', formData: { Password: Pass, FileImage: FS.createReadStream(File.path) } }, function (error, httpResponse, body) {
      try {
        FS.unlink(File.path, function () { })
        resolve(JSON.parse(body).Path)
      } catch (e) {
        Misc.Log('[UploadImage]: ' + e)
        resolve()
      }
    })
  })
}

function UploadVideo (URL, Pass, File) {
  return new Promise(function (resolve) {
    if (File.name.split('.').pop().toLowerCase() === '.mp4') {
      FFMPEG.ffprobe(File.path, function (error, data) {
        let Size = data.format.size * 1000
        let Duration = data.format.duration * 1000

        Request.post({ url: URL + '/UploadVideo', formData: { Password: Pass, FileVideo: FS.createReadStream(File.path) } }, function (error, httpResponse, body) {
          try {
            FS.unlink(File.path, function () { })
            resolve({ Size: Size, Duration: Duration, URL: JSON.parse(body).Path })
          } catch (e) {
            Misc.Log('[UploadVideo]: ' + e)
            resolve()
          }
        })
      })
    } else {
      const Video = './System/Storage/Temp/' + UniqueName() + '.mp4'

      FFMPEG(File.path).output(Video).renice(-10).on('end', function () {
        FS.unlink(File.path, function () { })

        FFMPEG.ffprobe(Video, function (error, data) {
          let Size = data.format.size * 1000
          let Duration = data.format.duration * 1000

          Request.post({ url: URL + '/UploadVideo', formData: { Password: Pass, FileVideo: FS.createReadStream(Video) } }, function (error, httpResponse, body) {
            try {
              FS.unlink(Video, function () { })
              resolve({ Size: Size, Duration: Duration, URL: JSON.parse(body).Path })
            } catch (e) {
              Misc.Log('[UploadVideo]: ' + e)
              resolve()
            }
          })
        })
      }).run()
    }
  })
}

function UploadFile (URL, Pass, File) {
  return new Promise(function (resolve) {
    Request.post({ url: URL + '/UploadFile', formData: { Password: Pass, File: FS.createReadStream(File.path) } }, function (error, httpResponse, body) {
      try {
        FS.unlink(File.path, function () { })
        resolve({ Size: File.size, URL: JSON.parse(body).Path, Name: File.name, Ext: '.' + File.name.split('.').pop().toLowerCase() })
      } catch (e) {
        Misc.Log('[UploadFile]: ' + e)
        resolve()
      }
    })
  })
}

module.exports.UploadImage = UploadImage
module.exports.UploadVideo = UploadVideo
module.exports.UploadFile = UploadFile
