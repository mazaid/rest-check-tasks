var joi = require('joi');
var _ = require('lodash');

module.exports = {

    resource: '/checkTasks',

    title: 'find and create check tasks',

    methods: {
        GET: {
            title: 'find check tasks',

            schema: {
                query: {
                    limit: joi.number().default(10).min(0).max(100),
                    offset: joi.number().default(0).min(0).max(100),
                    fields:  joi.alternatives().try(joi.array().items(joi.string()), joi.string()),
                    checkId: joi.alternatives().try(joi.string(), joi.array().items(joi.string())),
                    latest: joi.boolean()
                }
            },

            callback: function (req, res) {
                var logger = req.di.logger;
                var api = req.di.api;

                var filters = {}, fields = null;

                if (req.query.checkId) {

                    var checkId = [];

                    if (typeof req.query.checkId === 'string') {
                        filters.checkId = _.map(req.query.checkId.split(','), v => _.trim(v));
                    } else if (Array.isArray(req.query.checkId)) {
                        filters.checkId = _.map(req.query.checkId, v => _.trim(v));
                    }

                }

                if (typeof req.query.fields === 'string') {
                    fields = _.map(req.query.fields.split(','), v => _.trim(v));
                } else if (Array.isArray(req.query.fields)) {
                    fields = req.query.fields;
                }

                var latest = new Promise((resolve, reject) => {

                    if (req.query.latest !== true) {
                        return resolve();
                    }

                    var checkIds = [];

                    if (filters.checkId) {
                        checkIds = filters.checkId;
                    }

                    delete filters.checkId;

                    api.checkTasks.findLatestByCheckId(checkIds)
                        .then((checkTaskIds) => {
                            filters.id = checkTaskIds;

                            resolve();
                        })
                        .catch((error) => {
                            reject(error);
                        });

                });

                latest
                    .then(() => {
                        var request = api.checkTasks.find(filters, fields);

                        request.limit(req.query.limit).skip(req.query.offset);

                        request.sort({creationDate: -1});

                        return request.exec();
                    })
                    .then((result) => {
                        var docs = [];

                        for (var doc of result.docs) {
                            docs.push(api.checkTasks.clearSystemFields(doc));
                        }

                        res.result(docs, {
                            resultset: {
                                count: result.docs.length,
                                total: result.total,
                                limit: req.query.limit,
                                offset: req.query.offset
                            }
                        });
                    })
                    .catch((error) => {
                        var ec = {
                            checkTasks: api.checkTasks.ErrorCodes
                        };

                        if (!error.checkable) {
                            return res.logServerError(error);
                        }

                        error.checkChain(res.logServerError)
                           .check();
                    });
            }
        },

        POST: {
            title: 'create',

            schema: {
                body: {}
            },

            preHook: function (method, di) {
                method.schema.body = di.api.checkTasks.getCreationSchemaForRestApi();
            },

            callback: function (req, res) {
                var logger = req.di.logger;
                var api = req.di.api;


                api.checkTasks.create(req.body)
                    .then((checkTask) => {
                        res.result(api.checkTasks.clearSystemFields(checkTask));
                        return checkTask;
                    })
                    .then((checkTask) => {
                        api.checkTaskExecutor.exec(checkTask.id);
                    })
                    .catch((error) => {
                        var ec = {
                            checkTasks: api.checkTasks.ErrorCodes
                        };

                        if (!error.checkable) {
                            return res.logServerError(error);
                        }

                        error.checkChain(res.logServerError)
                           .ifEntity(api.checkTasks.entityName)
                           .ifCode(ec.checkTasks.INVALID_DATA, res.badRequest)
                           .ifCode(ec.checkTasks.ALREADY_EXISTS, res.badRequest)
                           .end()
                           .check();
                    });
            }
        }
    }
};
