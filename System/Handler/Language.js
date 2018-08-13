const Scope =
{
    IR:
    [
        // RegisterNumber: 0
        (Args) => `:کد تاییدیه شما در برنام کانال \n\n ${Args} \n\n + ChannelApp.IR`,

        // RegisterEmailSubject 1
        (Args) => `:کد تاییدیه شما در برنام کانال \n\n ${Args} \n\n + ChannelApp.IR`,

        // RegisterEmailContent
        (Args) => `:کد تاییدیه شما در برنام کانال \n\n ${Args} \n\n + ChannelApp.IR`
    ],
    EN:
    [
        // RegisterNumber: 0
        (Args) => `:کد تاییدیه شما در برنام کانال \n\n ${Args} \n\n + ChannelApp.IR`,

        // RegisterEmailSubject 1
        (Args) => `:کد تاییدیه شما در برنام کانال \n\n ${Args} \n\n + ChannelApp.IR`,

        // RegisterEmailContent
        (Args) => `:کد تاییدیه شما در برنام کانال \n\n ${Args} \n\n + ChannelApp.IR`
    ]
}

module.exports.RegisterNumber = 0
module.exports.RegisterEmailSubject = 1
module.exports.RegisterEmailContent = 2

module.exports = (Country, ID, Args) => Scope[Country][ID](Args)
