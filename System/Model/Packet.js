'use strict'

module.exports =
{
    PhoneSignUp: 1, // Implemented
    PhoneSignUpVerify: 2, // Implemented

    PhoneSignIn: 3, // Implemented
    PhoneSignInVerify: 4, // Implemented

    EmailSignUp: 5, // Implemented
    EmailSignUpVerify: 6, // Implemented

    EmailSignIn: 7, // Implemented
    EmailSignInVerify: 8, // Implemented

    EmailRecovery: 9, // Implemented
    EmailRecoveryVerify: 10, //

    GoogleSignIn: 11, //
    GoogleSignInVerify: 12, //

    UsernameSignIn: 13, //

    Password: 14, //

    GroupList: 100, // Implemented
    GroupCreate: 101, // Implemented
    GroupDelete: 102, // Implemented
    GroupRename: 103, // Implemented
    GroupPicture: 104, // Don't Implement
    GroupMemberAdd: 105, // Implemented
    GroupMemberRemove: 106, // Implemented
    GroupMessageSend: 107,
    GroupMessageList: 108,
    GroupMessageInfo: 109,
    GroupMessageDelete: 110,
    GroupMessageDelivery: 111,
    GroupMessageDocument: 112, // Don't Implement

    PersonList: 200, //
    PersonMessageSend: 201, // Implemented
    PersonMessageList: 202, // Implemented
    PersonMessageInfo: 203, //
    PersonMessageClear: 204, //
    PersonMessageDelete: 205, //
    PersonMessageDelivery: 206, //
    PersonMessageDocument: 207, // Don't Implement

    Username: 400, // Implemented
    Authentication: 401 // Implemented
}
