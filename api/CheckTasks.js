'use strict';

var Abstract = require('./Abstract');
var joi = require('joi');
var moment = require('moment');
var _ = require('lodash');
var md5 = require('md5');

var ErrorCodes = require('maf/Api/ErrorCodes');

var apiError = require('mazaid-error/create')(ErrorCodes);

var CheckTask = require('mazaid-check-task');

var Chain = require('maf/Chain');

class CheckTasks extends Abstract {

    constructor(config, models, api) {
        super(models, api);

        this._config = config;

        this.entityName = 'checkTask';

        this.ErrorCodes = ErrorCodes;

        this._creationSchema = function() {
            return {
                checkId: joi.string().guid().default(null).allow(null),
                execTaskId: joi.string().guid().default(null).allow(null),
                checker: joi.string().required(),
                timeout: joi.number().min(1).default(60).description('task execution timeout in seconds'),
                data: joi.object().unknown(true).required(),
                status: joi.string().valid(['created', 'queued', 'started', 'finished']),
                rawResult: joi.any().description('parsed exec result').default(null).allow(null),
                result: joi.object().unknown(true).keys({
                    status: joi.string().valid(['pass', 'fail', 'warn']).required(),
                    message: joi.string(),
                }).default(null).allow(null),
                creationDate: joi.number().integer().min(0).required(),
                timeoutDate: joi.number().integer().min(0).required(),
                queuedDate: joi.number().integer().min(0).default(null).allow(null),
                startDate: joi.number().integer().min(0).default(null).allow(null),
                finishDate: joi.number().integer().min(0).default(null).allow(null)
            };
        };

        this._modificationSchema = function() {
            return {
                execTaskId: joi.string().guid(),

                status: joi.string().valid(['queued', 'started', 'finished']),

                rawResult: joi.any().description('parsed exec result'),

                result: joi.object().unknown(true).keys({
                    status: joi.string().valid(['pass', 'fail', 'warn']).required(),
                    message: joi.string(),
                }),

                queuedDate: joi.number().integer().min(0),
                startDate: joi.number().integer().min(0),
                finishDate: joi.number().integer().min(0)
            };
        };

        this._systemFields = [
            '_id'
        ];
    }

    getCreationSchemaForRestApi() {
        var schema = this._creationSchema();
        var fields = ['checkId', 'checker', 'timeout', 'data'];
        var s = _.pick(schema, fields);
        return s;
    }


    getById(id) {

        return new Promise((resolve, reject) => {
            this._model().findOne({_id: id})
                .then((doc) => {
                    resolve(doc);
                })
                .catch((error) => {
                    reject(error);
                });
        });

    }

    findLatestByCheckId(checkIds) {

        return new Promise((resolve, reject) => {
            this._models.latestByCheckId.find({_id: {'$in': checkIds}}).exec()
                .then((data) => {
                    var result = [];

                    for (var doc of data.docs) {
                        result.push(doc.checkTaskId);
                    }

                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });

    }

    find(filters, fields) {

        var chain = new Chain({
            steps: {
                limit: 10,
                skip: 0,
                sort: null
            }
        });

        if (Array.isArray(fields)) {
            fields = this._prepareFields(fields);
        }

        chain.onExec((data) => {

            return new Promise((resolve, reject) => {

                // TODO check array
                if (filters.checkId) {
                    filters.checkId = {'$in': filters.checkId};
                }

                if (filters.id && Array.isArray(filters.id)) {
                    filters.id = {'$in': filters.id};
                }

                this._model().find(filters, fields)
                    .mapToChain(data)
                    .exec()
                        .then((result) => {
                            resolve(result);
                        })
                        .catch((error) => {
                            reject(error);
                        });
            });

        });

        return chain;

    }

    create(data) {

        return new Promise((resolve, reject) => {

            if (!data) {
                return reject(this.Error('empty data', this.ErrorCodes.INVALID_DATA));
            }

            // TODO
            if (!data.timeout) {
                data.timeout = 60;
            }

            data.status = 'created';
            data.creationDate = this._time();
            data.timeoutDate = data.creationDate + data.timeout;

            this._validateCreation(data)
                .then((data) => {
                    return this._create(data);
                })
                .then((doc) => {
                    resolve(doc);
                })
                .catch((error) => {
                    if (error.name == 'ApiError' && error.code === ErrorCodes.INVALID_DATA) {
                        reject(
                            this.Error(error.message, error.code)
                                .setList(error.list)
                        );
                    } else {
                        reject(error);
                    }
                });
        });

    }

    createTest() {
        var data = {
            name: 'test',
            title: 'test',
            checker: 'test',
            data: {
                test: 'test'
            }
        };

        return this.create(data);
    }

    updateById(id, data) {

        return new Promise((resolve, reject) => {
            if (this._isEmptyObject(data)) {
                return reject(this.Error('empty data', this.errorCodes.INVALID_DATA));
            }

            this.getById(id)
                .then((task) => {
                    if (!task) {
                        throw this.Error(
                            `${this.entityName} not found: id = ${id}`,
                            this.errorCodes.NOT_FOUND
                        );
                    }

                    return this._validateModification(data);
                })
                .then((valid) => {

                    if (this._isEmptyObject(data)) {
                        throw this.Error('empty data', this.errorCodes.INVALID_DATA);
                    }

                    valid.modificationDate = this._time();

                    return this._model().findOneAndUpdate({_id: id}, {$set: valid});
                })
                .then((updated) => {
                    resolve(updated);
                })
                .catch((error) => {
                    reject(error);
                });
        });

    }

    deleteById(id) {

        return new Promise((resolve, reject) => {

            this.getById(id)
                .then((doc) => {

                    if (!doc) {
                        throw this.Error(
                            `${this.entityName} not found: id = ${id}`,
                            this.errorCodes.NOT_FOUND
                        );
                    }

                    return this._model().findOneAndUpdate(
                        {
                            _id: id
                        },
                        {
                            $set: {
                                deleted: true,
                                modificationDate: this._time()
                            }
                        }
                    );
                })
                .then((result) => {
                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });

    }

    _create (data, options) {

        return new Promise((resolve, reject) => {

            if (!data.id) {
                data.id = this._generateUuid();
            }

            // TODO
            var checkTask = new CheckTask(data);

            var valid = checkTask.toObject();

            valid.timeoutDate = valid.creationDate + valid.timeout;

            var doc;

            this._model().insertOne(valid)
                .then((_doc) => {
                    doc = _doc;

                    if (data.checkId) {
                        return this._models.latestByCheckId.findOneAndUpdate(
                            {
                                _id: data.checkId
                            },
                            {
                                id: data.checkId,
                                checkTaskId: data.id
                            },
                            {
                                upsert: true
                            }
                        );
                    } else {
                        return;
                    }

                })
                .then(function () {
                    resolve(doc);
                })
                .catch((error) => {
                    if (error.code && error.code === 'already_exists') {
                        reject(this.Error(`${this.entityName} already exists`, ErrorCodes.INVALID_DATA));
                    } else {
                        reject(error);
                    }
                });
        });

    }

    /**
     * @param {String} id
     *
     * @return {Error}
     */
    NotFoundError(id) {
        var message = this.entityName + ' not found';

        if (id) {
            message = `${this.entityName} with id = "${id}" not found`;
        }

        return this.Error(message, this.ErrorCodes.NOT_FOUND);
    }

    /**
     * base model of api
     *
     * @return {model}
     */
    _model() {
        return this._models.checkTasks;
    }
}

module.exports = CheckTasks;
