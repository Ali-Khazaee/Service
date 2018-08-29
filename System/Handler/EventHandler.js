'use strict'

const EventEmitter = require('events')

module.exports = class EventHandler extends EventEmitter
{
    /*
    constructor()
    {
        super()
    }
    */

    /**
     * Add event listener.
     *
     * @param {string} type event method type to call on super ('on' or 'once').
     * @param {array} chain array of middleware functions.
     *
     * @memberOf MiddlewareEmitter
     */

    add(type, chain)
    {
        const req = {}
        const res = {}

        req.ctx = {}
        res.ctx = {}

        req.event = {}
        req.event.name = chain.shift()

        let error = chain.find((fn) => fn.length > 3)

        /**
         * Next function.
         *
         * @param {any} err
         * @returns
         */

        const next = (err) =>
        {
            if (err instanceof Error)
            {
                error = chain.find((fn) => fn.length > 3) || error

                if (error)
                    return error.call(this, req, res, next, err)

                throw err
            }

            const fn = chain.shift()

            if (fn instanceof Function)
            {
                if (fn.length > 3) return next.call(this, req, res, next)
                fn.call(this, req, res, next)
            }
            else if (fn instanceof Object)
            {
                req.ctx = merge(req.ctx, fn)
                return next.call(this, req, res, next)
            }

            return this
        }

        super[type](req.event.name, (data) =>
        {
            req.ctx = merge(req.ctx, data)
            next.call(this)
        })

        return this
    }

    /**
     * On event.
     *
     * @param {any} arguments0 event name / array of event names.
     * @param {function} arguments middleware functions.
     *
     * @memberOf MiddlewareEmitter
     */

    on(...args)
    {
        let events = args.shift()

        events = Array.isArray(events) ? events : [events]

        events.forEach((event) =>
        {
            this.add('on', [event].concat(...args))
        })

        return this
    }

    /**
     * Fire events.
     *
     * @param {any} arguments0 event name or array of event names.
     * @param {function} arguments middleware functions.
     *
     * @memberOf MiddlewareEmitter
     */

    emit(...args)
    {
        let events = args.shift()

        events = Array.isArray(events) ? events : [events]

        events.forEach((event) =>
        {
            super.emit.apply(this, [event].concat(...args))
        })

        return this
    }
}
