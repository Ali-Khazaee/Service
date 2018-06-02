const FS = require('fs')

module.exports =
{
    ADMIN_SESSION: '12345',

    PRIVATE_KEY: FS.readFileSync('./System/Storage/PrivateKey.pem'),
    PUBLIC_KEY: FS.readFileSync('./System/Storage/PublicKey.pem'),

    PORT: 5000,
    TEMP: './Temp/',
    USERNAME_PATTERN: /^(?![^a-z])(?!.*([_.])\1)[\w.]*[a-z]$/
}
