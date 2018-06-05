// Set Strict
'use strict'

// Set Production Environment
process.env.NODE_ENV = 'production'

//
// Libraries
//

const Express = require('express')
const BodyParser = require('body-parser')
const FileSystem = require('fs')
const MakeDir = require('mkdirp')
const Formidable = require('formidable')
const UniqueName = require('uuid/v4')
const DiskSpace = require('fd-diskspace')
const FFmpeg = require('fluent-ffmpeg')
const Util = require('util')
const MongoDB = require('mongodb')
const Winston = require('winston')

//
// Initial Variables
//

const App = Express()
const Config = { PORT: 9000, PASSWORD: '12345', STORAGE: './Storage/' }
const DataBaseConfig = { HOST: 'ds261138.mlab.com', PORT: 61138, DATABASE: 'channel', USERNAME: 'username', PASSWORD: 'password' }

//
// Config
//

Winston.configure({ transports: [ new Winston.transports.Console(), new Winston.transports.File({ filename: './Error.log' }) ] })

App.disable('x-powered-by')

App.use(BodyParser.urlencoded({ extended: true }))
App.use(Express.static(Config.STORAGE, { maxage: 86400000000 }))
App.use(BodyParser.json())

// For Window Only
// FFmpeg.setFfmpegPath('./ffmpeg.exe')
// FFmpeg.setFfprobePath('./ffprobe.exe')

// Default Page
App.get('*', function(req, res)
{
    res.send('')
})

// Upload Image
App.post('/image', function(req, res)
{
    const Form = new Formidable.IncomingForm()
    Form.uploadDir = Config.STORAGE
    Form.encoding = 'utf-8'
    Form.parse(req, function(Error, Fields, Files)
    {
        if (Error)
        {
            Analyze('ImageOnError', { Error: Error })
            res.json({ Result: 1, Error: Error })
            return
        }

        if (Config.PASSWORD !== Fields.Password)
        {
            Analyze('ImageOnWarning', { Password: Fields.Password })
            res.json({ Result: 2 })
            return
        }

        if (typeof Files.File === 'undefined' || Files.File == null)
        {
            res.json({ Result: 3 })
            return
        }

        const CD = new Date()
        const Directory = Config.STORAGE + CD.getFullYear() + '/' + CD.getMonth() + '/' + CD.getDate() + '/'

        MakeDir(Directory, function(Error2)
        {
            if (Error2)
            {
                Analyze('ImageOnError2', { Error: Error2 })
                res.json({ Result: 4, Error: Error2 })
                return
            }

            const NewPath = Directory + UniqueName() + '.jpg'

            FileSystem.rename(Files.File.path, NewPath, function(Error3)
            {
                if (Error3)
                {
                    Analyze('ImageOnError3', { Error: Error3 })
                    res.json({ Result: 5, Error: Error3 })
                    return
                }

                Analyze('ImageOnSuccess', { })
                res.json({ Result: 0, Path: NewPath.substring(Config.STORAGE.length) })
            })
        })
    })
})

// Upload Video
App.post('/video', function(req, res)
{
    const Form = new Formidable.IncomingForm()
    Form.uploadDir = Config.STORAGE
    Form.encoding = 'utf-8'
    Form.parse(req, function(Error, Fields, Files)
    {
        if (Error)
        {
            Analyze('VideoOnError', { Error: Error })
            res.json({ Result: 1, Error: Error })
            return
        }

        if (Config.PASSWORD !== Fields.Password)
        {
            Analyze('VideoOnWarning', { Password: Fields.Password })
            res.json({ Result: 2 })
            return
        }

        if (typeof Files.File === 'undefined' || Files.File == null)
        {
            res.json({ Result: 3 })
            return
        }

        const CD = new Date()
        const Directory = Config.STORAGE + CD.getFullYear() + '/' + CD.getMonth() + '/' + CD.getDate() + '/'

        MakeDir(Directory, function(Error2)
        {
            if (Error2)
            {
                Analyze('VideoOnError2', { Error: Error2 })
                res.json({ Result: 4, Error: Error2 })
                return
            }

            const Name = UniqueName()
            const NewPath = Directory + Name + '.mp4'

            FileSystem.rename(Files.File.path, NewPath, function(Error3)
            {
                if (Error3)
                {
                    Analyze('VideoOnError3', { Error: Error3 })
                    res.json({ Result: 5, Error: Error3 })
                    return
                }

                FFmpeg(NewPath).screenshots({ count: 1, size: '300x?', filename: Name + '.jpg', folder: Directory })

                Analyze('VideoOnSuccess', { })
                res.json({ Result: 0, Path: NewPath.substring(Config.STORAGE.length) })
            })
        })
    })
})

// Upload File
App.post('/file', function(req, res)
{
    const Form = new Formidable.IncomingForm()
    Form.uploadDir = Config.STORAGE
    Form.encoding = 'utf-8'
    Form.parse(req, function(Error, Fields, Files)
    {
        if (Error)
        {
            Analyze('FileOnError', { Error: Error })
            res.json({ Result: 1, Error: Error })
            return
        }

        if (Config.PASSWORD !== Fields.Password)
        {
            Analyze('FileOnWarning', { Password: Fields.Password })
            res.json({ Result: 2 })
            return
        }

        if (typeof Files.File === 'undefined' || Files.File == null)
        {
            res.json({ Result: 3 })
            return
        }

        const CD = new Date()
        const Directory = Config.STORAGE + CD.getFullYear() + '/' + CD.getMonth() + '/' + CD.getDate() + '/'

        MakeDir(Directory, function(Error2)
        {
            if (Error2)
            {
                Analyze('FileOnError2', { Error: Error2 })
                res.json({ Result: 4, Error: Error2 })
                return
            }

            const NewPath = Directory + UniqueName()

            FileSystem.rename(Files.File.path, NewPath, function(Error3)
            {
                if (Error3)
                {
                    Analyze('FileOnError3', { Error: Error3 })
                    res.json({ Result: 5, Error: Error3 })
                    return
                }

                Analyze('FileOnSuccess', { })
                res.json({ Result: 0, Path: NewPath.substring(Config.STORAGE.length) })
            })
        })
    })
})

// Upload Voice
App.post('/voice', function(req, res)
{
    const Form = new Formidable.IncomingForm()
    Form.uploadDir = Config.STORAGE
    Form.encoding = 'utf-8'
    Form.parse(req, function(Error, Fields, Files)
    {
        if (Error)
        {
            Analyze('VoiceOnError', { Error: Error })
            res.json({ Result: 1, Error: Error })
            return
        }

        if (Config.PASSWORD !== Fields.Password)
        {
            Analyze('VoiceOnWarning', { Password: Fields.Password })
            res.json({ Result: 2 })
            return
        }

        if (typeof Files.File === 'undefined' || Files.File == null)
        {
            res.json({ Result: 3 })
            return
        }

        const CD = new Date()
        const Directory = Config.STORAGE + CD.getFullYear() + '/' + CD.getMonth() + '/' + CD.getDate() + '/'

        MakeDir(Directory, function(Error2)
        {
            if (Error2)
            {
                Analyze('VoiceOnError2', { Error: Error2 })
                res.json({ Result: 4, Error: Error2 })
                return
            }

            const NewPath = Directory + UniqueName() + '.mp3'

            FileSystem.rename(Files.File.path, NewPath, function(Error3)
            {
                if (Error3)
                {
                    Analyze('VoiceOnError3', { Error: Error3 })
                    res.json({ Result: 5, Error: Error3 })
                    return
                }

                Analyze('VoiceOnSuccess', { })
                res.json({ Result: 0, Path: NewPath.substring(Config.STORAGE.length) })
            })
        })
    })
})

// Get Server Space
App.post('/space', function(req, res)
{
    if (Config.PASSWORD !== req.body.Password)
    {
        Analyze('SpaceOnWarning', { Password: req.body.Password })
        res.json({ Result: 1 })
        return
    }

    DiskSpace.diskSpace(function(Error, Result)
    {
        if (Error)
        {
            Analyze('SpaceOnError', { Error: Error })
            res.json({ Result: 2, Error: Error })
            return
        }

        Analyze('SpaceOnSuccess', { Space: Result.total.free })
        res.json({ Result: 0, Space: Result.total.free })
    })
})

// Delete File API
App.post('/delete', function(req, res)
{
    if (Config.PASSWORD !== req.body.Password)
    {
        Analyze('DeleteOnWarning', { Password: req.body.Password })
        res.json({ Result: 1 })
        return
    }

    if (typeof req.body.Path === 'undefined' || req.body.Path === '')
    {
        res.json({ Result: 2 })
        return
    }

    FileSystem.unlink(Config.STORAGE + req.body.Path, function(Error)
    {
        if (Error)
        {
            Analyze('DeleteOnError', { Error: Error })
            res.json({ Result: 3, Error: Error })
            return
        }

        FileSystem.unlink(Config.STORAGE + req.body.Path.slice(0, -3) + 'jpg', function(Error2)
        {
            Analyze('DeleteOnError2', { Error: Error2 })
        })

        Analyze('DeleteOnSuccess', { Path: req.body.Path })
        res.json({ Result: 0 })
    })
})

// Start Service
App.listen(Config.PORT, '0.0.0.0', function()
{
    Analyze('OnStart', { Port: Config.PORT })
})

// Analyze Function
function Analyze(Tag, Data)
{
    Data.Tag = Tag
    Data.CreatedTime = Math.floor(Date.now() / 1000)

    MongoDB.MongoClient.connect('mongodb://' + DataBaseConfig.USERNAME + ':' + DataBaseConfig.PASSWORD + '@' + DataBaseConfig.HOST + ':' + DataBaseConfig.PORT + '/' + DataBaseConfig.DATABASE,
        {
            reconnectTries: Number.MAX_VALUE,
            reconnectInterval: 2000,
            useNewUrlParser: true
        },
        function(Error, DataBase)
        {
            if (Error)
            {
                Winston.warn(Data + ' - ' + Util.inspect(Error, false, null))
                return
            }

            DataBase.db(DataBaseConfig.DataBase).collection('metric').insertOne(Data)
        })
}
