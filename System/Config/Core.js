const FS = require('fs')

module.exports =
{
    // Application
    APP_PORT: 5000,
    APP_STORAGE_TEMP: './Temp/',
    APP_USERNAME_PATTERN: /^(?![^a-z])(?!.*([_.])\1)[\w.]*[a-z]$/,

    // Upload Handler
    UPLOAD_SIZE: 1024 * 1024 * 1024,
    UPLOAD_CHUNK: 1024 * 10,

    // Authentication
    AUTH_PRIVATE_KEY: FS.readFileSync('./System/Storage/PrivateKey.pem'),
    AUTH_PUBLIC_KEY: FS.readFileSync('./System/Storage/PublicKey.pem')
}
