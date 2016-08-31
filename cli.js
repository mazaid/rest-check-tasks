const repl = require('repl-extra');

var logger = require('maf/Service/Logger')('rest-check-tasks-cli');

process.on('unhandledRejection', function (err) {
    logger.fatal(err);
});

require('./init/config')()
    .then((config) => {
        return require('./init/di')(logger, config);
    })
    .then((di) => {
        var server = repl.startExtra({prompt: '# '});

        server.context.i = function(data, depth) {
            if (typeof depth === 'undefined') {
                depth = 1;
            }

            console.log(require('util').inspect(data, {
                showHidden: false,
                colors: false,
                depth: depth
            }));

            return '';
        };

        server.context.di = di;

        server.context.a = di.api;
        server.context.m = di.models;

        server.context.methods = function (obj) {
            return Object.getOwnPropertyNames(obj).filter(function (p) {
                return typeof obj[p] === 'function';
            });
        };

        server.context.ensureIndexes = function () {
            return server.context.m.ensureIndexes();
        };

        server.context.createTestData = function () {

            return new Promise((resolve, reject) => {
                var api = server.context.a;

                api.createTest()
                .then(() => {
                    resolve('done');
                })
                .catch((error) => {
                    reject(error);
                });
            });

        };

    })
    .catch((error) => {
        logger.fatal(error);
    });
