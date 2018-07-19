const Scope =
{
    IR:
    [
        // RegisterNumber: 0
        (Args) => `:کد تاییدیه شما در برنام کانال \n\n ${Args} \n\n + ChannelApp.IR`
    ]
}

module.exports.RegisterNumber = 0

module.exports = (Country, ID, Args) => Scope[Country][ID](Args)
