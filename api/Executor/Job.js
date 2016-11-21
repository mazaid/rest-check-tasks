'use strict';

var ErrorCodes = {
    NOT_FOUND: 'notFound'
};

var createError = require('mazaid-error');
var CheckTask = require('mazaid-check-task');
var ExecTask = require('mazaid-exec-task');

class ExecutorJob {

    constructor(logger, api, checkTaskId) {
        this._logger = logger;
        this._api = api;
        this._checkTaskId = checkTaskId;

        this._checkTask = null;
        this._execTask = null;

        this._timeout = null;
        this._timeouted = false;

        this._checkInterval = null;
    }

    run() {

        return new Promise((resolve, reject) => {

            this._api.checkTasks.getById(this._checkTaskId)
                .then(this._validate.bind(this))
                .then(this._queued.bind(this))
                .then(this._prepare.bind(this))
                .then(this._createExecTask.bind(this))
                .then(this._started.bind(this))
                .then(this._waitForComplete.bind(this))
                .then(this._parse.bind(this))
                .then(this._updateRawResult.bind(this))
                .then(this._analyze.bind(this))
                .then(this._saveResult.bind(this))
                .then(() => {
                    resolve(this._checkTask);
                })
                .catch((error) => {
                    clearTimeout(this._timeout);

                    if (error.code === 'timeout') {
                        return;
                    }

                    this._logger.error(error);

                    // TODO check task exists
                    this._checkTask.finished();

                    var data = {
                        status: 'finished',
                        finishDate: this._checkTask.finishDate,
                        result: {
                            status: 'fail',
                            message: (error.message) ? error.message : 'unknown error'
                        }
                    };

                    this._update(this._checkTask.id, data)
                        .then(() => {
                            reject(error);
                        })
                        .catch((updateError) => {
                            this._logger.error(updateError);
                            reject(error);
                        });
                });
        });

    }

    _validate(rawTask) {

        if (!rawTask) {
            throw createError(`check task id = ${id} not found`, ErrorCodes.NOT_FOUND);
        }

        rawTask = this._api.checkTasks.clearSystemFields(rawTask);

        this._checkTask = new CheckTask(rawTask);

        this._logger.debug('validate');

        return this._checkTask.validate();

    }

    _queued() {
        this._logger.debug('queued');

        this._checkTask.queued();

        this._timeout = setTimeout(() => {
            this._timeouted = true;

            this._checkTask.finished();

            var data = {
                status: 'finished',
                finishDate: this._checkTask.finishDate,
                result: {
                    status: 'fail',
                    message: `[rest-check-tasks] timeout exceed ${this._checkTask.timeout}s`
                }
            };

            this._update(this._checkTask.id, data)
                .then(() => {
                    throw createError(`[rest-check-tasks] timeout exceed ${this._checkTask.timeout}s`);
                })
                .catch((error) => {
                    this._logger.error(error);
                    throw createError(`[rest-check-tasks] timeout exceed ${this._checkTask.timeout}s`);
                });


        }, this._checkTask.timeout * 1000);

        return this._update(this._checkTask.id, {status: 'queued', queuedDate: this._checkTask.queuedDate});
    }

    _prepare() {
        this._logger.debug('prepare');
        return this._api.check.prepare(this._checkTask);
    }

    _createExecTask(execData) {
        this._logger.debug('createExecTask');
        return this._api.execTasksClient.create(execData);
    }

    _started(execTask) {
        this._logger.debug('started');

        this._execTask = execTask;

        this._checkTask.started();

        return this._update(this._checkTask.id, {
            status: 'started',
            execTaskId: this._execTask.id,
            startDate: this._checkTask.startDate
        });
    }

    _waitForComplete() {

        this._logger.debug('waitForComplete');

        return new Promise((resolve, reject) => {

            this._checkInterval = setInterval(() => {
                this._api.execTasksClient.getById(this._execTask.id)
                    .then((execTask) => {

                        if (execTask.status === 'finished') {
                            clearInterval(this._checkInterval);
                            resolve(execTask);
                        }

                    })
                    .catch((error) => {
                        this._logger.error(error);
                    });
            }, 1000);

        });

    }

    _parse(execTaskData) {
        this._logger.debug('parse');

        if (this._timeouted) {
            throw createError('task timeout', 'timeout');
        }

        // TODO
        var execTask = new ExecTask(execTaskData);

        return this._api.check.parse(this._checkTask, execTask);
    }

    _updateRawResult(parsedResult) {

        this._logger.debug('updateRawResult');

        if (this._timeouted) {
            throw createError('task timeout', 'timeout');
        }

        this._checkTask.rawResult = parsedResult;

        return this._update(this._checkTask.id, {rawResult: parsedResult});
    }

    _analyze() {
        this._logger.debug('analyze');

        if (this._timeouted) {
            throw createError('task timeout', 'timeout');
        }

        return this._api.check.analyze(this._checkTask);
    }

    _saveResult(result) {
        this._logger.debug('saveResult');

        clearTimeout(this._timeout);

        this._checkTask.result = result;
        this._checkTask.finished();

        this._logger.debug('save result', this._checkTask.id, result);

        return this._update(this._checkTask.id, {
            status: 'finished',
            result: result,
            finishDate: this._checkTask.finishDate
        });
    }


    _update(id, data) {
        return this._api.checkTasks.updateById(id, data);
    }

}

module.exports = ExecutorJob;
