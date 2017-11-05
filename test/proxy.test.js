'use strict';

const request = require('supertest');
const mm = require('egg-mock');

describe('test/proxy.test.js', () => {
  let app;
  before(() => {
    app = mm.app({
      baseDir: 'apps/proxy-test',
    });
    return app.ready(() => {
      app.config.keys =  '123'
    });
  });

  after(() => app.close());
  afterEach(mm.restore);

  it('should GET /', () => {
    return request(app.callback())
      .get('/')
      .expect('hi, proxy')
      .expect(200);
  });

  it('test new Proxy', () => {
    app.ballProxy.start('name').then(data => console.log('======',data.payload))
  });

  it('test config Proxy', () => {
      app.ballProxy.config('name', {
        groups: {
          'dev': {
            hosts: [],
            rules: []
          }
        },
        current: 'dev'
      }).then(data => {
        console.log('test config', data)
      })
    // app.ballProxy.start('name').then(() => {
    //   app.ballProxy.config('name', {
    //     groups: {
    //       'dev': {
    //         hosts: [],
    //         rules: []
    //       }
    //     },
    //     current: 'dev'
    //   }).then(data => {
    //     console.log('test config', data)
    //   })
    // })
  });
});
