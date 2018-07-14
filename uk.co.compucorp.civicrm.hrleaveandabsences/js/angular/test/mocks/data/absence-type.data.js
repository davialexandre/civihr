/* eslint-env amd */

define([
  'common/lodash',
  'leave-absences/mocks/data/option-group.data'
], function (_, OptionGroupData) {
  var allData = {
    'is_error': 0,
    'version': 3,
    'count': 3,
    'values': [{
      'id': '1',
      'title': 'Holiday / Vacation',
      'weight': '1',
      'color': '#151D2C',
      'is_default': '1',
      'is_reserved': '1',
      'allow_request_cancelation': '3',
      'allow_overuse': '0',
      'must_take_public_holiday_as_leave': '1',
      'default_entitlement': '20',
      'add_public_holiday_to_entitlement': '1',
      'is_active': '1',
      'allow_accruals_request': '0',
      'allow_accrue_in_the_past': '0',
      'allow_carry_forward': '1',
      'max_number_of_days_to_carry_forward': '5',
      'carry_forward_expiration_duration': '12',
      'carry_forward_expiration_unit': '2',
      'calculation_unit': '1',
      'is_sick': '0'
    }, {
      'id': '2',
      'title': 'TOIL',
      'weight': '2',
      'color': '#056780',
      'is_default': '0',
      'is_reserved': '1',
      'allow_request_cancelation': '3',
      'allow_overuse': '0',
      'must_take_public_holiday_as_leave': '0',
      'default_entitlement': '0',
      'add_public_holiday_to_entitlement': '0',
      'is_active': '1',
      'allow_accruals_request': '1',
      'max_leave_accrual': '5',
      'allow_accrue_in_the_past': '0',
      'accrual_expiration_duration': '3',
      'accrual_expiration_unit': '2',
      'allow_carry_forward': '0',
      'calculation_unit': '1',
      'is_sick': '0'
    }, {
      'id': '3',
      'title': 'Sick',
      'weight': '3',
      'color': '#B32E2E',
      'is_default': '0',
      'is_reserved': '1',
      'allow_request_cancelation': '1',
      'allow_overuse': '1',
      'must_take_public_holiday_as_leave': '0',
      'default_entitlement': '0',
      'add_public_holiday_to_entitlement': '0',
      'is_active': '1',
      'allow_accruals_request': '0',
      'allow_accrue_in_the_past': '0',
      'allow_carry_forward': '0',
      'calculation_unit': '1',
      'is_sick': '1'
    }, {
      'id': '4',
      'title': 'Weekend',
      'weight': '4',
      'color': '#B32E2E',
      'is_default': '0',
      'is_reserved': '1',
      'allow_request_cancelation': '1',
      'allow_overuse': '1',
      'must_take_public_holiday_as_leave': '0',
      'default_entitlement': '0',
      'add_public_holiday_to_entitlement': '0',
      'is_active': '1',
      'allow_accruals_request': '0',
      'allow_accrue_in_the_past': '0',
      'allow_carry_forward': '0',
      'calculation_unit': '1',
      'is_sick': '0'
    }, {
      'id': '5',
      'title': 'Custom',
      'weight': '5',
      'color': 'null',
      'is_default': '0',
      'is_reserved': '0',
      'allow_request_cancelation': '3',
      'must_take_public_holiday_as_leave': '0',
      'default_entitlement': '10',
      'add_public_holiday_to_entitlement': '0',
      'is_active': '0',
      'allow_accruals_request': '0',
      'allow_carry_forward': '0',
      'is_sick': '0',
      'calculation_unit': '1'
    }]
  };

  var calculateToilExpiryDate = {
    values: {
      'expiry_date': '2016-07-08'
    }
  };

  return {
    all: function () {
      return allData;
    },
    getRandomAbsenceType: function (key) {
      return _.sample(allData.values)[key];
    },
    getAllAbsenceTypesByKey: function (key) {
      return allData.values.map(function (item) {
        return item[key];
      });
    },
    getAllAbsenceTypesTitles: function () {
      return this.getAllAbsenceTypesByKey('title');
    },
    getAllAbsenceTypesIds: function () {
      return this.getAllAbsenceTypesByKey('id');
    },
    calculateToilExpiryDate: function () {
      return calculateToilExpiryDate;
    },
    getDisabledAbsenceTypes: function () {
      return allData.values.filter(function (absenceType) {
        return absenceType.is_active === '0';
      });
    },
    findByKeyValue: function (key, value) {
      return _.find(allData.values, function (absenceType) {
        return absenceType[key] === value;
      });
    },
    /**
     * Returns a list of absence types mocks and their calculation unit names
     * and labels.
     *
     * @return {Array}
     */
    getAllAndTheirCalculationUnits: function () {
      var calculationUnits, unit;

      calculationUnits = OptionGroupData.getCollection('hrleaveandabsences_absence_type_calculation_unit');
      calculationUnits = _.indexBy(calculationUnits, 'value');

      return this.all().values.map(function (absenceType) {
        unit = calculationUnits[absenceType.calculation_unit];

        return _.extend({
          calculation_unit_name: unit.name,
          calculation_unit_label: unit.label
        }, absenceType);
      });
    }
  };
});
