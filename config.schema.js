var joi = require('joi');

var config = {
    host: 'localhost',
    port: 8083,
    db: {
        dsl: 'mongodb://localhost:27017/mazaid'
    },
    nprof: {
        snapshotPath: '/data/tmp/mazaid-rest-check-tasks'
    },
    api: {
        execTasks: {
            base: 'http://localhost:8084'
        },
        notifications: {
            base: 'http://localhost:8085'
        },
        checks: {
            base: 'http://localhost:8082'
        }
    }
};

module.exports = {
    host: joi.string().allow(null).default(config.host),
    port: joi.number().default(config.port),

    db: joi.object().default(config.db).keys({
        dsl: joi.string().default(config.db.dsl)
    }),

    nprof: joi.object().default(config.nprof).keys({
        snapshotPath: joi.string().default(config.nprof.snapshotPath)
    }),

    api: joi.object().default(config.api).keys({
        execTasks: joi.object().default(config.api.execTasks).keys({
            base: joi.string().default(config.api.execTasks.base)
        }),
        notifications: joi.object().default(config.api.notifications).keys({
            base: joi.string().default(config.api.notifications.base)
        }),
        checks: joi.object().default(config.api.checks).keys({
            base: joi.string().default(config.api.checks.base)
        })
    })
};
