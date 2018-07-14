/* eslint-env amd */

define(function () {
  'use strict';

  hrjcNumber.__name = 'hrjcNumber';
  hrjcNumber.$inject = ['$log'];

  function hrjcNumber ($log) {
    $log.debug('Directive: hrjcNumber');

    return {
      require: 'ngModel',
      link: function ($scope, el, attrs, modelCtrl) {
        var toFixedVal = 2;
        var notToFixed = attrs.hrjcNumberFloat || false;
        // in Leave in Hours we break hours to 15 minutes intervals (0.25 of an hour)
        var toHoursRound = 0.25;
        var toHours = attrs.hrjcToHours || false;
        var notNegative = attrs.hrjcNotNegative || false;

        if (attrs.hrjcNumber && typeof +attrs.hrjcNumber === 'number') {
          toFixedVal = attrs.hrjcNumber;
        }

        el.bind('blur', function () {
          var viewVal = parseFloat(modelCtrl.$viewValue) || 0;

          if (notNegative && viewVal < 0) {
            viewVal = 0;
          }

          if (toHours) {
            viewVal = Math.ceil(viewVal / toHoursRound) * toHoursRound;
          }

          modelCtrl.$setViewValue(!notToFixed ? viewVal.toFixed(toFixedVal) : Math.round(viewVal * 100) / 100);
          modelCtrl.$render();
        });
      }
    };
  }

  return hrjcNumber;
});
