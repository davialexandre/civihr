/* eslint-env amd, jasmine */

define([
  'mocks/data/contract-revision.data',
  'mocks/data/insurance-plan-types.data',
  'job-contract/modules/job-contract.module'
], function (ContractMock, InsuranceMock) {
  'use strict';

  describe('contractHealthService', function () {
    var $httpBackend, $rootScope, promise, contractHealthService;

    beforeEach(module('job-contract'));
    beforeEach(inject(function (_contractHealthService_, _$httpBackend_,
    _$rootScope_) {
      contractHealthService = _contractHealthService_;
      $httpBackend = _$httpBackend_;
      $rootScope = _$rootScope_;
    }));

    beforeEach(function () {
      $httpBackend.whenGET(/action=get&entity=HRJobHealth/).respond(ContractMock.contractRevision);
      $httpBackend.whenGET(/action=getoptions&entity=HRJobHealth/).respond(InsuranceMock);
      $httpBackend.whenGET(/views.*/).respond({});
    });

    describe('getOne()', function () {
      it('returns job contract revision id', function () {
        contractHealthService.getOne({
          jobcontract_revision_id: 68
        }).then(function (result) {
          expect(result).toEqual(ContractMock.contractRevision.values[0]);
        });

        $httpBackend.flush();
      });
    });

    describe('getOptions()', function () {
      describe('when calling the api with paramater "hrjobcontract_health_health_plan_type"', function () {
        beforeEach(function () {
          promise = contractHealthService.getOptions('hrjobcontract_health_health_plan_type', true);
        });

        it('returns insurance plan types list', function () {
          promise.then(function (healthInsurancePlanTypes) {
            expect(healthInsurancePlanTypes).toEqual(InsuranceMock.values);
          });

          $httpBackend.flush();
        });
      });

      describe('when calling the api with paramater "hrjobcontract_health_life_insurance_plan_type"', function () {
        beforeEach(function () {
          promise = contractHealthService.getOptions('hrjobcontract_health_life_insurance_plan_type', true);
        });

        it('returns life insurance plan types list', function () {
          promise.then(function (lifeInsurancePlanTypes) {
            expect(lifeInsurancePlanTypes).toEqual(InsuranceMock.values);
          });

          $httpBackend.flush();
        });
      });

      describe('when called api with empty insurance type', function () {
        beforeEach(function () {
          promise = contractHealthService.getOptions('', false);
        });

        it('returns empty list insurance plan types', function () {
          promise.then(function (result) {
            expect(result).toEqual({});
          });

          $rootScope.$digest();
        });
      });
    });
  });
});
