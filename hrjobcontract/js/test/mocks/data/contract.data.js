/* eslint-env amd */

define(function () {
  return {
    contract: {
      'is_error': 0,
      'undefined_fields': [
        'jobcontract_revision_id'
      ],
      'version': 3,
      'count': 1,
      'id': 100,
      'values': [
        {
          'id': '100',
          'position': 'PEASON-RED-Test',
          'title': 'PEASON-RED-Test',
          'contract_type': 'Contractor',
          'period_start_date': '2017-01-27',
          'period_end_date': '2017-02-28',
          'end_reason': '2',
          'notice_amount': '0',
          'notice_amount_employee': '0',
          'location': 'Home',
          'jobcontract_revision_id': '100'
        }
      ]
    },
    contractHour: {
      'is_error': 0,
      'undefined_fields': [
        'jobcontract_revision_id'
      ],
      'version': 3,
      'count': 1,
      'id': 59,
      'values': [
        {
          'id': '59',
          'location_standard_hours': '1',
          'hours_fte': '0',
          'fte_num': '0',
          'fte_denom': '0',
          'jobcontract_revision_id': '68'
        }
      ]
    },
    contractLeaves: {
      'is_error': 0,
      'undefined_fields': [
        'jobcontract_revision_id'
      ],
      'version': 3,
      'count': 8,
      'values': [
        {
          'id': '375',
          'leave_type': '1',
          'leave_amount': '11',
          'add_public_holidays': '0',
          'jobcontract_revision_id': '99',
          'default_entitlement': '1',
          'add_public_holiday_to_entitlement': '0'
        },
        {
          'id': '376',
          'leave_type': '2',
          'leave_amount': '22',
          'add_public_holidays': '0',
          'jobcontract_revision_id': '99',
          'default_entitlement': '2',
          'add_public_holiday_to_entitlement': '1'
        },
        {
          'id': '377',
          'leave_type': '3',
          'leave_amount': '33',
          'add_public_holidays': '0',
          'jobcontract_revision_id': '99',
          'default_entitlement': '3',
          'add_public_holiday_to_entitlement': '0'
        },
        {
          'id': '378',
          'leave_type': '4',
          'leave_amount': '44',
          'add_public_holidays': '0',
          'jobcontract_revision_id': '99',
          'default_entitlement': '4',
          'add_public_holiday_to_entitlement': '1'
        },
        {
          'id': '379',
          'leave_type': '5',
          'leave_amount': '55',
          'add_public_holidays': '0',
          'jobcontract_revision_id': '99',
          'default_entitlement': '5',
          'add_public_holiday_to_entitlement': '0'
        },
        {
          'id': '380',
          'leave_type': '6',
          'leave_amount': '66',
          'add_public_holidays': '0',
          'jobcontract_revision_id': '99',
          'default_entitlement': '6',
          'add_public_holiday_to_entitlement': '1'
        },
        {
          'id': '381',
          'leave_type': '7',
          'leave_amount': '77',
          'add_public_holidays': '0',
          'jobcontract_revision_id': '99',
          'default_entitlement': '7',
          'add_public_holiday_to_entitlement': '0'
        },
        {
          'id': '382',
          'leave_type': '8',
          'leave_amount': '88',
          'add_public_holidays': '0',
          'jobcontract_revision_id': '99',
          'default_entitlement': '8',
          'add_public_holiday_to_entitlement': '1'
        }
      ]
    },
    contractPayment: {
      'is_error': 0,
      'undefined_fields': [
        'jobcontract_revision_id'
      ],
      'version': 3,
      'count': 1,
      'id': 54,
      'values': [
        {
          'id': '54',
          'pay_scale': '4',
          'is_paid': '1',
          'pay_amount': '22000.00',
          'pay_unit': 'Year',
          'pay_currency': 'GBP',
          'pay_annualized_est': '22000.00',
          'pay_is_auto_est': '0',
          'annual_benefits': [

          ],
          'annual_deductions': [

          ],
          'pay_cycle': '2',
          'pay_per_cycle_gross': '1833.33',
          'pay_per_cycle_net': '1833.33',
          'jobcontract_revision_id': '100'
        }
      ]
    },
    contractPension: {
      'is_error': 0,
      'undefined_fields': [
        'jobcontract_revision_id'
      ],
      'version': 3,
      'count': 1,
      'id': 46,
      'values': [
        {
          'id': '46',
          'jobcontract_revision_id': '68'
        }
      ]
    },
    contractRevisionData: {
      'is_error': 0,
      'version': 3,
      'count': 1,
      'id': 159,
      'values': [
        {
          'id': '159',
          'jobcontract_id': '94',
          'editor_uid': '1',
          'created_date': '2017-02-14 04:30:29',
          'effective_date': '2017-02-13',
          'modified_date': '2017-02-14 04:30:31',
          'details_revision_id': '159',
          'health_revision_id': '159',
          'hour_revision_id': '159',
          'leave_revision_id': '159',
          'pay_revision_id': '159',
          'pension_revision_id': '159',
          'role_revision_id': '159',
          'deleted': '0',
          'editor_name': 'admin@example.com'
        }
      ]
    },
    contractEntity: {
      contract: {
        id: '1',
        contact_id: '04',
        deleted: '0',
        is_current: '1',
        is_primary: '1'
      },
      details: {
        id: '60',
        position: 'Test-added',
        title: 'Test-added',
        funding_notes: null,
        contract_type: 'Apprentice',
        period_start_date: '2017-03-28',
        period_end_date: null,
        end_reason: '1',
        notice_amount: null,
        notice_unit: null,
        notice_amount_employee: null,
        notice_unit_employee: null,
        location: 'Headquarters',
        jobcontract_revision_id: '60'
      },
      hour: {},
      pay: {},
      leave: [],
      health: {},
      pension: {}
    }
  };
});
