var path = require('path');

var _ = require('lodash');
var joi = require('joi');

var Rest = require('maf/Rest');

module.exports = function(logger, app, di) {

    return new Promise((resolve, reject) => {

        var restConfig = {
            baseUrl: '/',
            title: 'mazaid check tasks REST API',
            description: ''
        };

        if (di.config.private) {
            restConfig.title = `[private] ${restConfig.title}`;
        }

        var rest = new Rest(logger, app, restConfig);

        var restModules = require(path.join(__dirname, '..', 'rest'));

        var promises = [];

        _.each(restModules, (restModule) => {
            promises.push(rest.addMany(restModule, di));
        });

        Promise.all(promises)
            .then(() => {
                resolve(rest.init());
            })
            .catch((error) => {
                reject(error);
            });

    });

};
