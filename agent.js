'use strict'

const Proxy = require('./lib/proxy')
const cert = require('./lib/cert')
module.exports = agent => {

    let proxys = {}
    agent.messenger.on('new-proxy', ({ id, pid, name }) => {
        proxys[name] = new Proxy(name)
        proxys[name].startProxy().then((proxyURL) => {
            console.log('in agent new-proxy-back', id)
            agent.messenger.sendToApp('new-proxy-back', {
                id,
                payload: proxyURL
            })
        })
    })
    agent.messenger.on('config-proxy', ({ id, pid, name, config }) => {
        proxys[name].save(config)
        proxys[name].genPac()
        console.log('in agent config-proxy-back', id, config)
        agent.messenger.sendToApp('config-proxy-back', {
            id,
            payload: proxys[name].pac
        })
    })
    agent.messenger.on('proxy-pac', ({ id, pid, name }) => {
        console.log('in agent proxy-pac-back', id)
        agent.messenger.sendToApp('proxy-pac-back', {
            id,
            pac: proxys[name].pac
        })
    })

}