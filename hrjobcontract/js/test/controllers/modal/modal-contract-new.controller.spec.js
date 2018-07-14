/* eslint-env amd, jasmine */

define([
  'mocks/data/insurance-plan-types.data',
  'job-contract/modules/job-contract.module'
], function (InsurancePlanTypesMock) {
  'use strict';

  describe('ModalContractNewController', function () {
    var $rootScope, $controller, $scope, $q, $httpBackend, $uibModalInstanceMock, contractHealthService;

    beforeEach(module('job-contract'));

    beforeEach(module(function ($provide) {
      $provide.factory('contractHealthService', function () {
        return {
          getOptions: function () {}
        };
      });
    }));

    beforeEach(inject(function (_$controller_, _$rootScope_, _$httpBackend_, _$q_,
      _contractDetailsService_, _contractHealthService_) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      contractHealthService = _contractHealthService_;
      $q = _$q_;
    }));

    beforeEach(function () {
      $httpBackend.whenGET(/action=get&entity=HRJobContract/).respond({});
      $httpBackend.whenGET(/action=get&entity=HRHoursLocation/).respond({});
      $httpBackend.whenGET(/action=get&entity=HRPayScale/).respond({});
      $httpBackend.whenGET(/action=getfields&entity=HRJobDetails/).respond({});
      $httpBackend.whenGET(/action=getfields&entity=HRJobHour/).respond({});
      $httpBackend.whenGET(/action=getfields&entity=HRJobPay/).respond({});
      $httpBackend.whenGET(/action=getfields&entity=HRJobLeave/).respond({});
      $httpBackend.whenGET(/action=getfields&entity=HRJobHealth/).respond({});
      $httpBackend.whenGET(/action=getfields&entity=HRJobPension/).respond({});
      $httpBackend.whenGET(/action=getoptions&entity=HRJobHealth/).respond({});
      $httpBackend.whenGET(/views.*/).respond({});
    });

    beforeEach(function () {
      var health = {};

      $rootScope.$digest();
      health.plan_type = {};
      health.plan_type_life_insurance = {};
      $rootScope.options = {
        health: health
      };
    });

    beforeEach(function () {
      mockUIBModalInstance();
      contractHealthServiceSpy();
      makeController();
    });

    describe('init()', function () {
      beforeEach(function () {
        $rootScope.$digest();
      });

      var result = {
        Family: 'Family',
        Individual: 'Individual'
      };

      it('sets the contract property as not primary', function () {
        expect($scope.entity.contract).toEqual({ is_primary: 0 });
      });

      it('calls getOptions() form contractHealthService', function () {
        expect(contractHealthService.getOptions).toHaveBeenCalled();
      });

      it('fetches health insurance plan types', function () {
        expect($rootScope.options.health.plan_type).toEqual(result);
      });

      it('fetches life insurance plan types', function () {
        expect($rootScope.options.health.plan_type_life_insurance).toEqual(result);
      });
    });

    function makeController () {
      $scope = $rootScope.$new();
      $controller('ModalContractNewController', {
        $scope: $scope,
        $rootScope: $rootScope,
        model: {},
        $uibModalInstance: $uibModalInstanceMock,
        utils: {
          contractListLen: 1
        }
      });
    }

    function mockUIBModalInstance () {
      $uibModalInstanceMock = {
        opened: {
          then: jasmine.createSpy()
        }
      };
    }

    function contractHealthServiceSpy () {
      spyOn(contractHealthService, 'getOptions').and.callFake(function () {
        return $q.resolve(InsurancePlanTypesMock.values);
      });
    }
  });
});
