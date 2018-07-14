'use strict';

var page = require('../../../page-objects/ssp-leave-absences-my-leave-calendar');

module.exports = function (casper) {
  page.init(casper)
    .clearCurrentlySelectedMonth()
    .showMonth('February')
    .showYear(2016)
    .showTooltip();
};
