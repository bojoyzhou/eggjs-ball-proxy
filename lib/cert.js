const CertManager = require('./node-easy-cert')

const options = {
  rootDirPath: './.keys/',
  defaultCertAttrs: [
    { name: 'countryName', value: 'CN' },
    { name: 'organizationName', value: 'CertManager' },
    { shortName: 'ST', value: 'SH' },
    { shortName: 'OU', value: 'CertManager SSL' }
  ]
}

const crtMgr = new CertManager(options);
const rootOptions = {
  commonName: 'node Proxy'
};

exports.generateRootCA = function generateRootCA(){
    return new Promise(resolve => {
        crtMgr.generateRootCA(rootOptions, (error, keyPath, crtPath) => {
            if(error){
                throw error
            }
            resolve({keyPath, crtPath})
        });
    })
}


exports.getCertificate = function getCertificate(hostname){
    if(getCertificate[hostname]){
        return Promise.resolve(getCertificate[hostname])
    }
    return new Promise(resolve => {
        crtMgr.getCertificate(hostname, (error, key, cert) => {
            getCertificate[hostname] = {key, cert}
            resolve({key, cert})
        })
    })
}