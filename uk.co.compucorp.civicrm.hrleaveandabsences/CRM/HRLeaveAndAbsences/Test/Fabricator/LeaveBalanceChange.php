<?php

use CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange as LeaveBalanceChange;
use CRM_HRLeaveAndAbsences_BAO_LeaveRequest as LeaveRequest;
use CRM_HRLeaveAndAbsences_BAO_LeaveRequestDate as LeaveRequestDate;

class CRM_HRLeaveAndAbsences_Test_Fabricator_LeaveBalanceChange {

  private static $balanceChangeTypes;

  public static function fabricate($params) {
    $params = array_merge(self::getDefaultParams(), $params);

    return LeaveBalanceChange::create($params);
  }

  public static function fabricateForLeaveRequest(LeaveRequest $leaveRequest) {
    if($leaveRequest->request_type == LeaveRequest::REQUEST_TYPE_TOIL) {
      self::fabricateForTOILRequest($leaveRequest);
    } else {
      self::fabricateForLeaveRequestDates($leaveRequest);
    }
  }

  private static function fabricateForTOILRequest(LeaveRequest $leaveRequest) {
    LeaveBalanceChange::deleteAllForLeaveRequest($leaveRequest);
    $dates = $leaveRequest->getDates();
    $firstDate = array_shift($dates);

    self::fabricate([
      'source_id' => $firstDate->id,
      'source_type' => LeaveBalanceChange::SOURCE_LEAVE_REQUEST_DAY,
      'amount' => $leaveRequest->toil_to_accrue,
      'expiry_date' => $leaveRequest->toil_expiry_date,
      'type_id' => self::getTypeId('credit'),
    ]);

    foreach($dates as $date) {
      self::fabricate([
        'source_id' => $date->id,
        'source_type' => LeaveBalanceChange::SOURCE_LEAVE_REQUEST_DAY,
        'amount' => 0,
        'expiry_date' => null,
        'type_id' => self::getTypeId('credit'),
      ]);
    }
  }

  private static function fabricateForLeaveRequestDates(LeaveRequest $leaveRequest) {
    $leaveRequestDayTypes = array_flip(LeaveRequestDate::buildOptions('type', 'validate'));

    LeaveBalanceChange::deleteAllForLeaveRequest($leaveRequest);
    $dates = $leaveRequest->getDates();
    foreach($dates as $date) {
      self::fabricateForLeaveRequestDate($date);

      $date->type = $leaveRequestDayTypes['all_day'];
      $date->save();
    }
  }

  public static function fabricateForLeaveRequestDate(LeaveRequestDate $leaveRequestDate) {
    return self::fabricate([
      'source_id' => $leaveRequestDate->id,
      'source_type' => LeaveBalanceChange::SOURCE_LEAVE_REQUEST_DAY,
    ]);
  }

  private static function getTypeId($typeName) {
    if(is_null(self::$balanceChangeTypes)) {
      self::$balanceChangeTypes = array_flip(LeaveBalanceChange::buildOptions('type_id', 'validate'));
    }

    return self::$balanceChangeTypes[$typeName];
  }

  private static function getDefaultParams() {
    return [
      'amount' => -1,
      'type_id' => self::getTypeId('leave')
    ];
  }
}
