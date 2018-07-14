'use strict';

var page = require('../../../page-objects/ssp-leave-absences-my-leave-report');

// precondition: need to have the absence type in *hours* with a label "Holiday in Hours"
module.exports = function (casper) {
  var myReport = page.init(casper)
    .newRequest('leave')
    .selectRequestAbsenceType('Holiday in Hours');
};
