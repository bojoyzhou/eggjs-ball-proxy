'use strict'

module.exports = app => {
    const proxys = {}
    const pid = app.messenger.pid
    app.ballProxy = {
        start(name) {
            if (!name) {
                throw Error('name is required')
            }
            if (proxys[name]) {
                return proxys[name]
            }
            return callAgent('new-proxy', {
                name
            })
        },
        config(name, config) {
            if (!name) {
                throw Error('name is required')
            }
            return callAgent('config-proxy', {
                name,
                config
            })
        },
        pac(name) {
            if (!name) {
                throw Error('name is required')
            }
            return callAgent('proxy-pac', {
                name
            })
        }
    }

    let uuid = 0
    let prefix = 'msg_' + process.pid + '_'

    function callAgent(evName, data) {
        return new Promise(resolve => {
            data.pid = pid
            data.id = prefix + (uuid++)
            app.messenger.sendToAgent(evName, data)
            const handler = ({ id, error, msg, payload }) => {
                console.log('===handler', evName + '-back')
                if (id === data.id) {
                    resolve({ payload, error, msg })
                    console.log('removeListener', evName + '-back')
                    app.messenger.removeListener(evName + '-back', handler)
                }
            }
            console.log('messenger on', evName + '-back')
            app.messenger.on(evName + '-back', handler)
        })
    }
}