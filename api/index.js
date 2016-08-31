module.exports = (config, models, di) => {

    return new Promise((resolve, reject) => {

        var A = {
            CheckTasks: require('./CheckTasks'),
            Check: require('mazaid-check').Check,
            Executor: require('./Executor'),

            RestApiClient: require('maf/Rest/Client'),
            ExecTasks: require('mazaid-rest-api-clients/ExecTasks')
        };

        var api = {};

        api.checkTasks = new A.CheckTasks({}, models, api);
        api.check = new A.Check(di.logger, {});
        api.executor = new A.Executor(di.logger, {}, api);
        api.rest = new A.RestApiClient();
        api.execTasksClient = new A.ExecTasks(di.config.api.execTasks, api.rest);

        for (var name in api) {
            if (di.debug && api[name].setDebugger) {
                api[name].setDebugger(di.debug);
            }
        }

        api.createTest = () => {

            return new Promise((resolve, reject) => {
                api.checkTasks.createTest()
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });

        };

        api.check.add(require('mazaid-checker-ping'))
            .then(() => {
                api.check.init();
                resolve(api);
            })
            .catch((error) => {
                reject(error);
            });

    });

};
