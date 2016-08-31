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
                    offset: joi.number().default(0).min(0).max(100)
                }
            },

            callback: function (req, res) {
                var logger = req.di.logger;
                var api = req.di.api;

                api.checkTasks.find()
                    .limit(req.query.limit)
                    .skip(req.query.offset)
                    .sort({creationDate: -1})
                    .exec()
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