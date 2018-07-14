/* eslint-env amd, jasmine */

define([
  'common/lodash',
  'leave-absences/mocks/data/absence-period.data',
  'leave-absences/shared/instances/absence-period.instance',
  'common/mocks/services/hr-settings-mock'
], function (_, mockData) {
  'use strict';

  describe('AbsencePeriodInstance', function () {
    var AbsencePeriodInstance, ModelInstance, $provide;

    beforeEach(module('leave-absences.models.instances', 'common.mocks',
      function (_$provide_) {
        $provide = _$provide_;
      }));

    beforeEach(inject(['HR_settingsMock', function (_HRSettingsMock_) {
      $provide.value('HR_settings', _HRSettingsMock_);
    }]));

    beforeEach(inject(function (_AbsencePeriodInstance_, _ModelInstance_) {
      AbsencePeriodInstance = _AbsencePeriodInstance_;
      ModelInstance = _ModelInstance_;
    }));

    afterEach(function () {
      jasmine.clock().uninstall();
    });

    it('inherits from ModelInstance', function () {
      expect(_.functions(AbsencePeriodInstance)).toEqual(jasmine.arrayContaining(_.functions(ModelInstance)));
    });

    describe('defaultCustomData()', function () {
      var instance;
      var attributes = mockData.all().values[0];

      beforeEach(function () {
        // shift current date to precede mock periods
        var pastDate = new Date(2013, 2, 2);

        jasmine.clock().mockDate(pastDate);
        instance = AbsencePeriodInstance.init(attributes, true);
      });

      it('has current attribute set', function () {
        expect(instance.defaultCustomData()).toEqual({
          current: false
        });
      });
    });

    describe('init()', function () {
      describe('basic properties', function () {
        var instance;
        var attributes = mockData.all().values[0];

        beforeEach(function () {
          // shift current date to precede mock periods
          var currentDate = new Date(2016, 6, 6);

          jasmine.clock().mockDate(currentDate);
          instance = AbsencePeriodInstance.init(attributes, true);
        });

        it('has expected data', function () {
          expect(instance.id).toBe(attributes.id);
          expect(instance.title).toEqual(attributes.title);
          expect(instance.start_date).toEqual(attributes.start_date);
          expect(instance.end_date).toEqual(attributes.end_date);
          expect(instance.weight).toEqual(attributes.weight);
        });
      });

      describe('`current` property', function () {
        describe('when the absence period is current', function () {
          var instance;
          var attributes = mockData.all().values[0];

          beforeEach(function () {
            // shift current date to precede mock periods
            var currentDate = new Date(2016, 6, 6);

            jasmine.clock().mockDate(currentDate);
            instance = AbsencePeriodInstance.init(attributes, true);
          });

          it('has `current` set to `true`', function () {
            expect(instance.current).toBe(true);
          });
        });

        describe('when the absence period is past', function () {
          var instance;
          var attributes = mockData.all().values[0];

          beforeEach(function () {
            // shift current date to precede mock periods
            var pastDate = new Date(2013, 2, 2);

            jasmine.clock().mockDate(pastDate);
            instance = AbsencePeriodInstance.init(attributes, true);
          });

          it('has `current` set to `false`', function () {
            expect(instance.current).toBe(false);
          });
        });
      });
    });

    describe('isInPeriod()', function () {
      var instance;

      beforeEach(function () {
        // attributes for one of current period in 2016
        var attributes = mockData.all().values[0];

        instance = AbsencePeriodInstance.init(attributes, true);
      });

      describe('with date in the absence period', function () {
        var mockCurrentDate = '03/04/2016';

        it('returns true ', function () {
          expect(instance.isInPeriod(mockCurrentDate)).toBe(true);
        });
      });

      describe('with date not in the absence period', function () {
        var mockPastDate = '03/04/2013';

        it('returns false', function () {
          expect(instance.isInPeriod(mockPastDate)).toBe(false);
        });
      });
    });
  });
});
