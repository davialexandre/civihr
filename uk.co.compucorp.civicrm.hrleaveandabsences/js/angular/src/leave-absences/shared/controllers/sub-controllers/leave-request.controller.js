/* eslint-env amd */

define([
  'leave-absences/shared/modules/controllers'
], function (controllers) {
  controllers.controller('LeaveRequestCtrl', LeaveRequestCtrl);

  LeaveRequestCtrl.$inject = ['$controller', '$log', '$q', 'parentCtrl'];

  function LeaveRequestCtrl ($controller, $log, $q, parentCtrl) {
    $log.debug('LeaveRequestCtrl');

    var vm = parentCtrl;

    vm.checkSubmitConditions = checkSubmitConditions;
    vm.initChildController = initChildController;

    /**
     * Checks if submit button can be enabled for user and returns true if successful
     *
     * @return {Boolean}
     */
    function checkSubmitConditions () {
      return vm.canCalculateChange();
    }

    /**
     * Initialize the controller
     *
     * @return {Promise}
     */
    function initChildController () {
      return $q.resolve();
    }
  }
});
