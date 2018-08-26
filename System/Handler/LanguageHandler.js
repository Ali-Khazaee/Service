'use strict'

const LanguageScope =
{
    IR:
    [
        // NumberSignUpMessage: 0
        (Args) => `کد تاییدیه شما در برنامه کانال ${Args} می باشد \n\n ChannelApp.IR`,

        // EmailSignUpSubject 1
        () => `کانال - تایید حساب کاربری`,

        // EmailSignUpMessage
        (Args) => `<span style="font-size: 14px"> کد تاییدیه شما در برنامه کانال <b>${Args}</b> می باشد </span> <br><br> <a href="https://channelapp.ir">ChannelApp.IR</a>`
    ],
    EN:
    [
        // NumberSignUpMessage: 0
        (Args) => `${Args} is your channel registration code \n\n ChannelApp.IR`,

        // EmailSignUpSubject 1
        () => `Channel - Register Confirmation`,

        // EmailSignUpMessage
        (Args) => `<span style="font-size: 14px"><b>${Args}</b> is your channel registration code</span> <br><br> <a href="https://channelapp.ir">ChannelApp.IR</a>`
    ]
}

module.exports.NumberSignUpMessage = 0
module.exports.EmailSignUpSubject = 1
module.exports.EmailSignUpMessage = 2

module.exports.Lang = (Country, ID, Args = '') =>
{
    return LanguageScope[Country][ID](Args)
}
