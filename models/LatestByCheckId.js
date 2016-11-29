'use strict';

var Abstract = require('./Abstract');

class CheckTasks extends Abstract {

    constructor (db) {
        super(db);

        this._collectionName = 'latestByCheckId';

        this._indexes = [
            // {
            //     fields: {
            //         creationDate: -1
            //     },
            //     options: {
            //         name: 'creationDate',
            //         unique: false,
            //         background: true
            //     }
            // }
        ];
    }

}

module.exports = CheckTasks;
