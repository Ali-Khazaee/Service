const FS = require('fs')

module.exports =
{
    // Authentication
    AUTH_PRIVATE_KEY: FS.readFileSync('./System/Storage/PrivateKey.pem'),
    AUTH_PUBLIC_KEY: FS.readFileSync('./System/Storage/PublicKey.pem'),

    // Application
    APP_PORT: 5000,
    APP_STORAGE_TEMP: './Temp/',
    APP_USERNAME_PATTERN: /^(?![^a-z])(?!.*([_.])\1)[\w.]*[a-z]$/
}
