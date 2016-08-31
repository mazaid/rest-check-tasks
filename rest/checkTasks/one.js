var joi = require('joi');
var _ = require('lodash');

module.exports = {

    resource: '/checkTasks/:id',

    title: 'get check task by id',

    methods: {

        GET: {
            title: 'get check task by id',

            schema: {
                path: {
                    ':id': joi.string().required()
                }
            },

            onlyPrivate: false,

            callback: function(req, res) {
                var logger = req.di.logger;
                var api = req.di.api;

                api.checkTasks.getById(req.params.id)
                    .then((task) => {
                        if (!task) {
                            throw api.checkTasks.NotFoundError();
                        }

                        res.result(api.checkTasks.clearSystemFields(task));
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
                            .ifCode(ec.checkTasks.NOT_FOUND, res.notFound)
                            .end()
                            .check();

                    });
            }
        }

    }
};
