const Misc = require('./Misc')

function RateLimit (Count, ExpireTime) {
  return function (req, res, next) {
    const IP = req.connection.remoteAddress
    const URL = req.originalUrl.substr(1)

    DB.collection('ratelimit').findOneAndUpdate({ IP: IP, URL: URL }, { $inc: { Count: 1 } }, { projection: { Count: 1, Time: 1 } }, function (error, result) {
      if (error) {
        Misc.Log(error)
        return res.json({ Message: -1 })
      }

      const Time = Misc.Time()

      if (result.value === null) {
        DB.collection('ratelimit').insertOne({ IP: IP, URL: URL, Count: 1, Time: Time + ExpireTime })
        next()
        return
      }

      if (result.value.Time < Time) {
        DB.collection('ratelimit').updateOne({ _id: result.value._id }, { $set: { Time: Time + ExpireTime, Count: 1 } })
        next()
        return
      }

      if (result.value.Count > Count) {
        Misc.Log(IP + ' Exceed Request ' + URL)
        return res.json({ Message: -2 })
      }

      next()
    })
  }
}

module.exports = RateLimit
