'use strict'

const LanguageScope =
{
    IR:
    [
        // PhoneSignUpMessage: 0
        (Args) => `کد تاییدیه شما در برنامه کانال ${Args} می باشد \n\n ChannelApp.IR`,

        // PhoneSignInMessage: 1
        (Args) => `کد ورود شما در برنامه کانال ${Args} می باشد \n\n ChannelApp.IR`,

        // EmailSignUpSubject: 2
        () => `برنامه کانال - تایید حساب کاربری`,

        // EmailSignUpMessage: 3
        (Args) => `<span style="font-size: 14px"> کد تاییدیه شما در برنامه کانال <b>${Args}</b> می باشد </span> <br><br> <a href="https://channelapp.ir">ChannelApp.IR</a>`,

        // EmailSignUpSubject: 4
        () => `برنامه کانال - کد ورود به حساب کاربری`,

        // EmailSignUpMessage: 5
        (Args) => `<span style="font-size: 14px"> کد ورود شما به برنامه کانال <b>${Args}</b> می باشد </span> <br><br> <a href="https://channelapp.ir">ChannelApp.IR</a>`,

        // EmailRecoverySubject: 6
        () => `برنامه کانال - بازیابی حساب کاربری`,

        // EmailRecoveryMessage: 7
        (Args) => `<span style="font-size: 14px"> کد بازیابی حساب کاربری شما در برنامه کانال <b>${Args}</b> می باشد </span> <br><br> <a href="https://channelapp.ir">ChannelApp.IR</a>`
    ],
    EN:
    [
        // PhoneSignUpMessage: 0
        (Args) => `${Args} is your Channel registration code \n\n ChannelApp.IR`,

        // PhoneSignInMessage: 1
        (Args) => `${Args} is your Channel login code \n\n ChannelApp.IR`,

        // EmailSignUpSubject: 2
        () => `ChannelApp - Registration Code`,

        // EmailSignUpMessage: 3
        (Args) => `<span style="font-size: 14px"><b>${Args}</b> is your Channel registration code</span> <br><br> <a href="https://channelapp.ir">ChannelApp.IR</a>`,

        // EmailSignUpSubject: 4
        () => `ChannelApp - Login Code`,

        // EmailSignUpMessage: 5
        (Args) => `<span style="font-size: 14px"><b>${Args}</b> is your Channel login code</span> <br><br> <a href="https://channelapp.ir">ChannelApp.IR</a>`,

        // EmailRecoverySubject: 6
        () => `ChannelApp - Account Recovery`,

        // EmailRecoveryMessage: 7
        (Args) => `<span style="font-size: 14px"><b>${Args}</b> is your Channel recovery code</span> <br><br> <a href="https://channelapp.ir">ChannelApp.IR</a>`
    ]
}

module.exports.Lang = (Country, ID, Args = '') =>
{
    return LanguageScope[Country][ID](Args)
}

module.exports =
{
    PhoneSignUpMessage: 0,

    PhoneSignInMessage: 1,

    EmailSignUpSubject: 2,
    EmailSignUpMessage: 3,

    EmailSignInSubject: 4,
    EmailSignInMessage: 5,

    EmailRecoverySubject: 6,
    EmailRecoveryMessage: 7
}
