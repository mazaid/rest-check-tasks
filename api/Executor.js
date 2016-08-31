'use strict';

var ErrorCodes = {
    NOT_FOUND: 'notFound'
};

var createError = require('mazaid-error');
var CheckTask = require('mazaid-check-task');
var ExecTask = require('mazaid-exec-task');

class Executor {

    constructor(logger, config, api) {
        this._logger = logger;
        this._config = config;
        this._api = api;
    }

    exec(id) {
        this._exec(id)
            .then((result) => {
                this._logger.info(`task id = ${id} finished success`);
            })
            .catch((error) => {
                this._logger.error(`task id = ${id} finished with error = ${error.message}`);
            });
    }


    _exec(id) {

        return new Promise((resolve, reject) => {

            var task, rawTask, execTaskId, timeout, timeouted = false, checkInterval;

            console.log(id);

            this._api.checkTasks.getById(id)
                .then((_rawTask) => {

                    if (!_rawTask) {
                        throw createError(`check task id = ${id} not found`, ErrorCodes.NOT_FOUND);
                    }

                    rawTask = this._api.checkTasks.clearSystemFields(_rawTask);;

                    task = new CheckTask(rawTask);

                    return task.validate();
                })
                .then(() => {
                    task.queued();

                    timeout = setTimeout(() => {
                        timeouted = true;

                        task.finished();

                        var data = {
                            status: 'finished',
                            finishDate: task.finishDate,
                            result: {
                                status: 'fail',
                                message: `timeout exceed ${task.timeout}s`
                            }
                        };

                        this._update(id, data)
                            .then(() => {
                                reject(createError('timeout exceed'));
                            })
                            .catch((error) => {
                                this._logger.error(error);
                                reject(createError('timeout exceed'));
                            });


                    }, task.timeout * 1000);

                    return this._update(id, {status: 'queued', queuedDate: task.queuedDate});
                })
                .then(() => {
                    return this._api.check.prepare(task);
                })
                .then((execData) => {
                    return this._api.execTasksClient.create(execData);
                })
                .then((execTask) => {

                    task.started();

                    execTaskId = execTask.id;

                    return this._update(id, {
                        status: 'started',
                        execTaskId: execTaskId,
                        startDate: task.startDate
                    });
                })
                .then(() => {
                    // wait for exec task finished
                    return new Promise((resolve, reject) => {
                        checkInterval = setInterval(() => {
                            this._api.execTasksClient.getById(execTaskId)
                                .then((execTask) => {

                                    if (execTask.status === 'finished') {
                                        clearInterval(checkInterval);
                                        resolve(execTask);
                                    }

                                })
                                .catch((error) => {
                                    this._logger.error(error);
                                });
                        }, 1000);
                    });
                })
                .then((execTaskData) => {
                    if (timeouted) {
                        throw createError('task timeout', 'timeout');
                    }

                    var execTask = new ExecTask(execTaskData);

                    return this._api.check.parse(task, execTask);
                })
                .then((parsedResult) => {
                    if (timeouted) {
                        throw createError('task timeout', 'timeout');
                    }

                    task.rawResult = parsedResult;

                    return this._update(id, {rawResult: parsedResult});
                })
                .then(() => {
                    if (timeouted) {
                        throw createError('task timeout', 'timeout');
                    }

                    return this._api.check.analyze(task);
                })
                .then((result) => {
                    clearTimeout(timeout);
                    task.result = result;
                    task.finished();

                    return this._update(id, {
                        status: 'finished',
                        result: result,
                        finishDate: task.finishDate
                    });
                })
                .then(() => {
                    resolve(task);
                })
                .catch((error) => {
                    clearTimeout(timeout);

                    if (error.code === 'timeout') {
                        return;
                    }

                    this._logger.error(error);

                    // TODO check task exists
                    task.finished();

                    var data = {
                        status: 'finished',
                        finishDate: task.finishDate,
                        result: {
                            status: 'fail',
                            message: error.message
                        }
                    };

                    this._update(id, data)
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

    _update(id, data) {
        return this._api.checkTasks.updateById(id, data);
    }
}


module.exports = Executor;
