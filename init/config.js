var path = require('path');

module.exports = function () {
    return require('maf/Service/Config')(path.join(__dirname, '..', 'config.json'));
};
