/* eslint-env amd */

define([
  'common/angular'
], function (angular) {
  'use strict';

  ModalRevisionController.__name = 'ModalRevisionController';
  ModalRevisionController.$inject = [
    '$filter', '$log', '$q', '$rootScope', '$scope', '$uibModalInstance', 'settings',
    'revisionDataList', 'revisionList', 'entity', 'fields', 'model', 'modalContract',
    'utils', 'contactService'
  ];

  function ModalRevisionController ($filter, $log, $q, $rootScope, $scope, $modalInstance,
    settings, revisionDataList, revisionList, entity, fields, model, modalContract,
    utils, contactService) {
    $log.debug('Controller: ModalRevisionController');

    $scope.$broadcast('hrjc-loader-show');
    $scope.currentPage = 1;
    $scope.entity = entity;
    $scope.fields = angular.copy(fields);
    $scope.itemsPerPage = 5;
    $scope.revisionDataList = [];
    $scope.revisionList = [];
    $scope.sortCol = 'effective_date';
    $scope.subFields = {};
    $scope.maxSize = 5;
    $scope.modalContract = modalContract;
    $scope.sortReverse = true;
    $scope.urlCSV = urlCSVBuild();

    $scope.cancel = cancel;
    $scope.createPage = createPage;
    $scope.sortBy = sortBy;
    $scope.toggleFieldsSelected = toggleFieldsSelected;

    (function init () {
      initA();
      initB();
      initC();
      initWatchers();

      $scope.sortBy();
      $modalInstance.opened.then(function () {
        $rootScope.$broadcast('hrjc-loader-hide');
      });
    }());

    function cancel () {
      $modalInstance.dismiss('cancel');
    }

    function createPage () {
      var start = (($scope.currentPage - 1) * $scope.itemsPerPage);
      var end = start + $scope.itemsPerPage;

      $scope.revisionDataListPage = $scope.revisionDataList.slice(start, end);
    }

    function initA () {
      var i = 0;
      var len = $scope.fields.length;
      var field;

      for (i; i < len; i++) {
        field = $scope.fields[i];
        field.selected = true;
        field.isArray = field.name === 'leave_type' || field.name === 'leave_amount';

        if (field.name === 'id' || field.name === 'jobcontract_revision_id') {
          field.display = false;
          continue;
        }

        field.display = true;
      }

      $scope.fields.unshift({
        name: 'effective_date',
        title: 'Effective Date',
        display: true,
        selected: true,
        isArray: false,
        extends: true
      });

      $scope.fields.push({
        name: 'editor_name',
        title: 'Change Recorded By',
        display: true,
        selected: true,
        isArray: false,
        extends: true
      }, {
        name: 'change_reason',
        title: 'Reason For Change',
        display: true,
        selected: true,
        isArray: false,
        extends: true
      });
    }

    function initB () {
      var i = 0;
      var iNext;
      var isLast;
      var len = revisionDataList.length;

      for (i; i < len; i++) {
        iNext = i + 1;
        isLast = iNext === len;

        if (!revisionDataList[i]) {
          revisionDataList[i] = model;
        }

        if (!isLast && !revisionDataList[iNext]) {
          revisionDataList[iNext] = model;
        }

        if (angular.isArray(revisionDataList[i])) {
          revisionDataList[i] = {
            jobcontract_revision_id: revisionDataList[i][0].jobcontract_revision_id,
            data: revisionDataList[i]
          };
        }

        angular.extend(revisionDataList[i], {
          effective_date: $filter('date')(revisionList[i].effective_date, 'yyyy/MM/dd') || '',
          editor_name: revisionList[i].editor_name || '',
          change_reason: $rootScope.options.contract.change_reason[revisionList[i].change_reason] || '',
          details_revision_id: revisionList[i].details_revision_id,
          health_revision_id: revisionList[i].health_revision_id,
          hour_revision_id: revisionList[i].hour_revision_id,
          leave_revision_id: revisionList[i].leave_revision_id,
          pay_revision_id: revisionList[i].pay_revision_id,
          pension_revision_id: revisionList[i].pension_revision_id,
          role_revision_id: revisionList[i].role_revision_id
        });
        $scope.revisionDataList.push(revisionDataList[i]);
      }
    }

    function initC () {
      switch (entity) {
        case 'hour':
          (function () {
            var hoursLocation;
            angular.forEach($scope.revisionDataList, function (revisionData) {
              if (revisionData.location_standard_hours) {
                hoursLocation = $filter('filter')(utils.hoursLocation, {id: revisionData.location_standard_hours})[0];
                revisionData.location_standard_hours = hoursLocation.location + ': ' +
                                hoursLocation.standard_hours + 'h per ' +
                                hoursLocation.periodicity;
              }
            });
          })();
          break;
        case 'health':
          angular.forEach($scope.revisionDataList, function (revisionData) {
            if (revisionData.provider) {
              contactService.getOne(revisionData.provider).then(function (contact) {
                revisionData.provider = contact.label;
              });
            }

            if (revisionData.provider_life_insurance) {
              contactService.getOne(revisionData.provider_life_insurance).then(function (contact) {
                revisionData.provider_life_insurance = contact.label;
              });
            }
          });
          break;
        case 'pay':
          (function () {
            var payScaleGrade;
            angular.forEach($scope.revisionDataList, function (revisionData) {
              if (revisionData.pay_scale) {
                payScaleGrade = $filter('filter')(utils.payScaleGrade, {id: revisionData.pay_scale})[0] || $filter('filter')(utils.payScaleGrade, {pay_scale: revisionData.pay_scale})[0];
                revisionData.pay_scale = payScaleGrade.pay_scale +
                                (payScaleGrade.currency ? ' - ' + $rootScope.options.pay.pay_currency[payScaleGrade.currency] : '') +
                                (payScaleGrade.amount ? ' ' + payScaleGrade.amount : '') +
                                (payScaleGrade.pay_frequency ? ' per ' + payScaleGrade.pay_frequency : '');
              }
            });
          })();

          $filter('filter')($scope.fields, {name: 'pay_is_auto_est'})[0].pseudoconstant = true;

          $scope.subFields = {
            annual_benefits: [{
              name: 'name',
              title: 'Benefit',
              pseudoconstant: 'benefit_name'
            }, {
              name: 'type',
              title: 'Type',
              pseudoconstant: 'benefit_type'
            }, {
              name: 'amount_pct',
              title: '% amount',
              pseudoconstant: false
            }, {
              name: 'amount_abs',
              title: 'Absolute amount',
              pseudoconstant: false
            }],
            annual_deductions: [{
              name: 'name',
              title: 'Deduction',
              pseudoconstant: 'deduction_name'
            }, {
              name: 'type',
              title: 'Type',
              pseudoconstant: 'deduction_type'
            }, {
              name: 'amount_pct',
              title: '% amount',
              pseudoconstant: false
            }, {
              name: 'amount_abs',
              title: 'Absolute amount',
              pseudoconstant: false
            }]
          };
          break;
        case 'pension':
          $filter('filter')($scope.fields, {name: 'is_enrolled'})[0].pseudoconstant = true;
          break;
      }
    }

    function initWatchers () {
      $scope.$watch('currentPage', function () {
        $scope.createPage();
      });
    }

    function sortBy (sortCol, sortReverse) {
      if (typeof sortCol !== 'undefined') {
        if ($scope.sortCol === sortCol) {
          $scope.sortReverse = !$scope.sortReverse;
        } else {
          $scope.sortCol = sortCol;
        }
      }

      if (typeof sortReverse !== 'undefined') {
        $scope.sortReverse = sortReverse;
      }

      $scope.revisionDataList = $filter('orderBy')($scope.revisionDataList, $scope.sortCol, $scope.sortReverse);
    }

    function toggleFieldsSelected (field) {
      field.selected = !field.selected;
      $scope.urlCSV = urlCSVBuild();
    }

    function urlCSVBuild () {
      var url = settings.pathReport + (settings.pathReport.indexOf('?') > -1 ? '&' : '?');
      var entityName = $scope.entity;
      var fieldName;
      var prefix;

      angular.forEach($scope.fields, function (field) {
        fieldName = field.name !== 'editor_name' ? field.name : 'editor_uid';
        prefix = !field.extends ? (entityName + '_') : '';

        if (field.selected) {
          url += 'fields[' + prefix + fieldName + ']=1&';
        }
      });

      url += 'fields[sort_name]=1' +
                      '&fields[first_name]=1' +
                      '&fields[last_name]=1' +
                      '&fields[external_identifier]=1' +
                      '&fields[email]=1' +
                      '&fields[street_address]=1' +
                      '&fields[city]=1' +
                      '&fields[name]=1' +
                      '&fields[contract_contact_id]=1' +
                      '&fields[contract_contract_id]=1' +
                      '&fields[jobcontract_revision_id]=1' +
                      '&fields[change_reason]=1' +
                      '&fields[created_date]=1' +
                      '&fields[effective_date]=1' +
                      '&fields[modified_date]=1' +
                      '&order_bys[1][column]=id&order_bys[1][order]=ASC' +
                      '&order_bys[2][column]=civicrm_hrjobcontract_revision_revision_id&order_bys[2][order]=ASC' +
                      '&order_bys[3][column]=-&order_bys[3][order]=ASC' +
                      '&order_bys[4][column]=-&order_bys[4][order]=ASC' +
                      '&order_bys[5][column]=-&order_bys[5][order]=ASC' +
                      '&contract_id_op=eq&permission=access+CiviReport' +
                      '&row_count=' +
                      '&_qf_Summary_submit_csv=Preview+CSV' +
                      '&groups=' +
                      '&contract_id_value=' + revisionList[0].jobcontract_id +
                      '&group_bys[civicrm_hrjobcontract_revision_revision_id]=1';

      return url;
    }
  }

  return ModalRevisionController;
});
