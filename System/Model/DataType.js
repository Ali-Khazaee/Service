'use strict'

module.exports =
{
    Authentication:
    {
        PhoneSignUp: 0,
        PhoneSignIn: 1,
        EmailSignUp: 2,
        EmailSignIn: 3
    },

    EventHandler:
    {
        ID: 0,
        Client: 3,
        Packet: 2
    },

    Message:
    {
        TEXT: 0, // Implemented
        IMAGE: 1,
        VIDEO: 2,
        VOICE: 3,
        FILE: 4,
        GIF: 5,
        STICKER: 6
    }
}
