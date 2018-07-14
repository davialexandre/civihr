/* eslint-env amd */

define([
  'common/lodash',
  'leave-absences/mocks/data/option-group.data',
  'common/mocks/data/contact.data'
], function (_, OptionGroupDataMock, ContactData) {
  var dayTypes = OptionGroupDataMock.getCollection('hrleaveandabsences_work_day_type');

  return {
    getCalendar: {
      'is_error': 0,
      'version': 3,
      'count': 2,
      'values': ContactData.all.values.map(function (contact) {
        return {
          'contact_id': contact.id,
          'calendar': [
            {
              'date': '2016-02-02',
              'type': dayTypeByName('working_day').value
            },
            {
              'date': '2016-02-03',
              'type': dayTypeByName('working_day').value
            },
            {
              'date': '2016-02-04',
              'type': dayTypeByName('working_day').value
            },
            {
              'date': '2016-02-05',
              'type': dayTypeByName('non_working_day').value
            },
            {
              'date': '2016-02-06',
              'type': dayTypeByName('weekend').value
            },
            {
              'date': '2016-02-07',
              'type': dayTypeByName('weekend').value
            },
            {
              'date': '2016-03-03',
              'type': dayTypeByName('weekend').value
            },
            {
              'date': '2016-03-04',
              'type': dayTypeByName('weekend').value
            }
          ]
        };
      })
    },
    getAllWorkPattern: {
      'is_error': 0,
      'version': 3,
      'count': 1,
      'id': 1,
      'values': [
        {
          'id': '1',
          'label': 'Default 5 day week (London)',
          'description': 'A standard 37.5 week',
          'is_default': '1',
          'is_active': '1',
          'weight': '1'
        }
      ]
    },
    workPatternsOf: {
      'is_error': 0,
      'version': 3,
      'count': 1,
      'id': 1,
      'values': [
        {
          'id': '1',
          'contact_id': '204',
          'pattern_id': '1',
          'effective_date': '2017-06-22',
          'effective_end_date': '2018-06-22',
          'change_reason': '1',
          'api.WorkPattern.get': {
            'is_error': 0,
            'version': 3,
            'count': 1,
            'id': 1,
            'values': [
              {
                'id': '1',
                'label': 'Default 5 day week (London)',
                'description': 'A standard 37.5 week',
                'is_default': '1',
                'is_active': '1',
                'weight': '1'
              }
            ]
          }
        }
      ]
    }
  };

  /**
   * Finds a day type Option Value based on its name
   *
   * @param  {string} name
   * @return {object}
   */
  function dayTypeByName (name) {
    return _.find(dayTypes, function (dayType) {
      return dayType.name === name;
    });
  }
});
