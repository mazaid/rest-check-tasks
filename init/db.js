// var Engine = require('tingodb')();
var MongoClient = require('mongodb').MongoClient;

module.exports = (config, di, db) => {

    return new Promise((resolve, reject) => {

        if (db) {
            di.setConnection('db', db);
            return resolve(db);
        }

        MongoClient.connect(config.db.dsl)
        .then((db) => {

            // var Logger = require('mongodb').Logger;
            // Logger.setLevel('debug');
            // Logger.setCurrentLogger(function(msg, context) {
            //     di.logger.debug(msg, context);
            // });

            di.setConnection('db', db);

            resolve();

        })
        .catch((error) => {
            reject(error);
        });

    });

};
