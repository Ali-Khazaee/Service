'use strict'

module.exports =
{
    PhoneSignUp: 1, // Implemented
    PhoneVerifySignUp: 2, // Implemented

    PhoneSignIn: 3, // Implemented
    PhoneVerifySignIn: 4, // Implemented

    EmailSignUp: 5,
    EmailVerifySignUp: 6,
    EmailRecovery: 7,
    EmailSignIn: 8,

    GoogleSignIn: 9,

    UsernameSignIn: 10,

    PasswordChange: 11,

    PersonMessageSend: 200, // Implemented
    PersonMessageList: 201, // Implemented
    PersonMessageDelivery: 202,
    PersonMessageSticker: 203, // Don't Implement
    PersonMessageDelete: 204,
    PersonMessageDocument: 205, // Don't Implement
    PersonMessageUpdate: 206,

    GroupCreate: 100, // Implemented
    GroupDelete: 101, // Implemented
    GroupRename: 103, // Implemented
    GroupPicture: 104,
    GroupMemberAdd: 105, // Implemented
    GroupMemberRemove: 106,
    GroupMessageSend: 107,
    GroupMessageList: 108,
    GroupMessageDelivery: 109,
    GroupMessageDelete: 110,
    GroupMessageSticker: 111, // Don't Implement
    GroupMessageDocument: 112, // Don't Implement
    GroupMessageUpdate: 113,
    GroupList: 114, // Implemented

    Username: 300, // Implemented
    Authentication: 301 // Implemented
}
