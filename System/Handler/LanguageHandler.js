'use strict'

const LanguageScope =
{
    IR:
    [
        // NumberSignUpMessage: 0
        (Args) => `:کد تاییدیه شما در برنام کانال \n\n ${Args} \n\n + ChannelApp.IR`,

        // EmailSignUpSubject 1
        (Args) => ``,

        // EmailSignUpMessage
        (Args) => ``
    ],
    EN:
    [
        // NumberSignUpMessage: 0
        (Args) => `${Args} is your cannel registration code \n\n + ChannelApp.IR`,

        // EmailSignUpSubject 1
        (Args) => ``,

        // EmailSignUpMessage
        (Args) => ``
    ]
}

module.exports.NumberSignUpMessage = 0
module.exports.EmailSignUpSubject = 1
module.exports.EmailSignUpMessage = 2

module.exports.Lang = (Country, ID, Args) =>
{
    return LanguageScope[Country][ID](Args)
}
