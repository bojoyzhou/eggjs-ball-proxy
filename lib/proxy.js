const fs = require('fs')
const url = require('url')
const net = require('net')
const path = require('path')
const http = require('http')
const https = require('https')
const cert = require('./cert')

const localIp = getLocalIp()

module.exports = Proxy

function Proxy(config){
    this.name = config.name
    this.groups = config.groups || { "default": { hosts: [], rules: [] } }
    this.current = config.current || 'default'
    this.dir = config.dir
}
Proxy.prototype.save = function save(config){
    this.groups = config.groups
    this.current = config.current
}
Proxy.prototype.active = function active(env){
    this.current = env
}
Proxy.prototype.startProxy = function startProxy(){
    return new Promise(resolve => {
        const server = http.createServer().listen(() => {
            const port = server.address().port
            resolve(localIp + ':' + port)
            console.log('proxy server start at port: ' + port)
            this.port = port
        }).on('request', onRequest(this.getConfig.bind(this)))
            .on('connect', onConnect(this.getConfig.bind(this)))
            .on('error', console.error)
        this.server = server
    })
}

Proxy.prototype.getConfig = function getConfig(req, isHttps){
    let originUrl = `http${isHttps ? 's' : ''}://${req.headers.host}${req.url}`
    if(/^https?:/.test(req.url)){
        originUrl = req.url
    }
    let u = url.parse(originUrl)
    return this.filter({
        isHttps: isHttps,
        host: u.hostname,
        hostname: u.hostname,
        originUrl: originUrl,
        path: u.path,
        port: u.port || (isHttps ? 443 : 80)
    })
}

Proxy.prototype.filter = function filter({ isHttps, host, hostname, originUrl, port, path }){
    let secure = isHttps
    this.groups[this.current].rules.forEach(item => {
        let reg = null
        try{
            reg = new RegExp(item.match)
        }catch(e){}

        if(hostname === item.match || originUrl.indexOf(item.match) >= 0 || reg && reg.test(originUrl)){
            let u = url.parse(item.to)
            host = u.hostname
            port = u.port || port
            secure = u.protocol !== 'http:' && isHttps
        }
    })
    return { secure, host, hostname, port, path }
}
function onRequest(getConfig){
    return (req, res, isHttps) => {
        const { host, port, secure, path } = getConfig(req, isHttps)
        console.log('request will proxy to ' + host + ':' + port, req.url)
        const options = {
            host,
            port,
            path,
            method: req.method,
            headers: req.headers
        }
        const pReq = (secure ? https : http).request(options, r => {
            res.writeHead(r.statusCode, r.headers)
            r.pipe(res)
        })
        pReq.on('error', console.error)
        req.pipe(pReq)
    }
}
function onConnect(getConfig){
    return (req, sock, head) => {
        const { host, hostname, port, secure } = getConfig(req, 1)
        const handler = onRequest(getConfig)
        httpsServer.createserver(hostname, (req, res) => handler(req, res, 1)).then(localPort => {
            console.log('connect will proxy to ' + localIp + ':' + localPort)
            const nSock = net.connect(localPort, localIp, () => {
                console.log('connect success')
                sock.write('HTTP/1.1 200 Connection Established\r\n\r\n')
                nSock.write(head)
                nSock.pipe(sock)
                sock.pipe(nSock)
            })
            nSock.on('error', console.error)
        }).on('error', console.error)
    }
}

Proxy.prototype.genPac = function genPac(){
    let funcStr = ''
    if(this.groups[this.current].hosts.length){
        const hosts = this.groups[this.current].hosts.filter(host => {
            return host.checked
        }).map(host => {
            return host.value
        }).map(host => {
            return `host == "${host}"`
        }).join(' || \n')

        funcStr = `function FindProxyForURL(url, host) {
    if (${hosts})
        return "PROXY ${localIp}:${this.port}";
    return "DIRECT ";
}`
    }
    return this.pac = funcStr
}


const httpsServer = {
    createserver: (hostname, handler) => {
        if(httpsServer[hostname]){
            return Promise.resolve(httpsServer[hostname])
        }
        return cert.getCertificate(hostname).then(keycert => {
            return new Promise(resolve => {
                const server = https.createServer(keycert, handler).listen(() => {
                    httpsServer[hostname] = server.address().port
                    resolve(server.address().port)
                }).on('error', err => {
                    console.log('get', err)
                })
            })
        })
    }
}

function getLocalIp(){
    var interfaces = require('os').networkInterfaces()
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2]
            if (address.family === 'IPv4' && !address.internal) {
                return address.address
            }
        }
    }
}