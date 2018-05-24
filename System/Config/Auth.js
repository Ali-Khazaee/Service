const FS = require('fs')

module.exports =
{
  ADMIN_SESSION: 'Ali123',
  PRIVATE_KEY: FS.readFileSync('./System/Storage/PrivateKey.pem'),
  PUBLIC_KEY: FS.readFileSync('./System/Storage/PublicKey.pem')
}
