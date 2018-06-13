'use strict'

module.exports =
{
    // Socket Type
    Socket:
    {
        DATA_TYPE_STRING: 1,
        DATA_TYPE_BINARY: 2,
        DATA_TYPE_INTEGER: 3,
        DATA_TYPE_DECIMAL: 4,
        DATA_TYPE_OBJECT: 5,
        DATA_TYPE_BOOLEAN: 6,
        DATA_TYPE_EMPTY: 7,

        MESSAGE_TYPE_ACK: 7,
        MESSAGE_TYPE_DATA: 2,
        MESSAGE_TYPE_DATA_WITH_ACK: 6,
        MESSAGE_TYPE_DATA_STREAM_CLOSE: 13,
        MESSAGE_TYPE_DATA_STREAM_OPEN_WITH_ACK: 14
    },

    // Message Type
    Message:
    {
        TEXT: 0,
        IMAGE: 1,
        VIDEO: 2,
        VOICE: 3,
        FILE: 4,
        GIF: 5,
        STICKER: 6,
        VOTE: 7,
        QUERY: 8
    }
}
