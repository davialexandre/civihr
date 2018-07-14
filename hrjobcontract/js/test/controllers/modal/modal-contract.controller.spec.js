/* eslint-env amd, jasmine */

define([
  'mocks/data/contract.data',
  'mocks/data/insurance-plan-types.data',
  'job-contract/modules/job-contract.module'
], function (MockContract, InsurancePlanTypesMock) {
  'use strict';

  describe('ModalContractController', function () {
    var $rootScope, $controller, $scope, $q, $httpBackend, $uibModalInstanceMock,
      $uibModalMock, contractDetailsService, contractHealthService;

    beforeEach(module('job-contract'));

    beforeEach(module(function ($provide) {
      $provide.factory('contractHealthService', function () {
        return {
          getOptions: function () {},
          getFields: jasmine.createSpy(),
          save: jasmine.createSpy()
        };
      });
    }));

    beforeEach(inject(function (_$controller_, _$rootScope_, _$httpBackend_, _$q_,
      _contractDetailsService_, _contractHealthService_) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      contractDetailsService = _contractDetailsService_;
      contractHealthService = _contractHealthService_;
      $q = _$q_;
    }));

    beforeEach(function () {
      $httpBackend.whenGET(/action=validatedates&entity=HRJobDetails/).respond({
        success: true
      });
      $httpBackend.whenGET(/action=get&entity=HRJobContract/).respond({});
      $httpBackend.whenPOST(/action=create&entity/).respond({});
      $httpBackend.whenPOST(/action=replace&entity/).respond({});
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
      mockUIBModal('edit');
      contractHealthServiceSpy();
      makeController();
      createContractDetailsServiceSpy(true);
      createUIBModalSpy();
    });

    describe('init()', function () {
      beforeEach(function () {
        $rootScope.$digest();
      });

      var result = {
        Family: 'Family',
        Individual: 'Individual'
      };

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

    describe('save()', function () {
      describe('makes call to appropriate service and function', function () {
        beforeEach(function () {
          $scope.save();
          $rootScope.$digest();
        });

        it('calls to validate the dates form contractDetailsService', function () {
          expect(contractDetailsService.validateDates).toHaveBeenCalled();
        });

        it('gets confirmation fron user to save contract data', function () {
          expect($uibModalMock.open).toHaveBeenCalled();

          $uibModalMock.open().result.then(function (data) {
            expect(data).toBe('edit');
          });
        });
      });

      describe('When period_end_date is null', function () {
        beforeEach(function () {
          $scope.entity.details.period_end_date = null;
          $scope.save();
          $rootScope.$digest();
        });

        it("sets contract period_end_date to '' ", function () {
          expect($scope.entity.details.period_end_date).toBe('');
        });
      });

      describe('When period_end_date is not falsy', function () {
        var mockDate = '02-03-2017';

        beforeEach(function () {
          $scope.entity.details.period_end_date = mockDate;
          $scope.save();
          $rootScope.$digest();
        });

        it("sets contract period_end_date to '' ", function () {
          expect($scope.entity.details.period_end_date).toBe(mockDate);
        });
      });
    });

    function makeController () {
      $scope = $rootScope.$new();
      $controller('ModalContractController', {
        $scope: $scope,
        $rootScope: $rootScope,
        $uibModal: $uibModalMock,
        $uibModalInstance: $uibModalInstanceMock,
        contractDetailsService: contractDetailsService,
        action: 'edit',
        entity: MockContract.contractEntity,
        content: {
          allowSave: true
        },
        files: {},
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

    function mockUIBModal (mode) {
      $uibModalMock = {
        open: function () {
          return {
            result: {
              then: function (callback) {
                callback(mode);
              }
            }
          };
        }
      };
    }

    function createContractDetailsServiceSpy (status) {
      spyOn(contractDetailsService, 'validateDates').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve({
          success: status
        });

        return deferred.promise;
      });
    }

    function createUIBModalSpy () {
      spyOn($uibModalMock, 'open').and.callThrough();
    }

    function contractHealthServiceSpy () {
      spyOn(contractHealthService, 'getOptions').and.callFake(function () {
        return $q.resolve(InsurancePlanTypesMock.values);
      });
    }
  });
});
