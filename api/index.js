module.exports = (config, models, di) => {

    return new Promise((resolve, reject) => {

        var A = {
            CheckTasks: require('./CheckTasks')
        };

        var api = {};

        api.checkTasks = new A.CheckTasks({}, models, api);

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

        resolve(api);
    });

};
