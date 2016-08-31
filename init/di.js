var path = require('path');

var Di = require('maf/Di');
var RequestDebug = require('maf/Request/Debug');

module.exports = (logger, config, originalDi) => {

    return new Promise((resolve, reject) => {

        var di = new Di();

        di.config = config;

        di.logger = logger;

        var originalDb;

        if (originalDi) {
            di.debug = new RequestDebug();
            originalDb = originalDi.db;
        }

        require(path.join(__dirname,'db'))(config, di, originalDb)
            .then(() => {
                return require(path.join(__dirname, '..', 'models'))(config, di);
            })
            .then((models) => {
                di.models = models;
                return require(path.join(__dirname, '..', 'api'))(config, models, di);
            })
            .then((api) => {
                di.api = api;
                resolve(di);
            })
            .catch((error) => {
                reject(error);
            });

    });

};
