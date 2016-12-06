<?php

use CRM_HRLeaveAndAbsences_BAO_PublicHoliday as PublicHoliday;
use CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange as LeaveBalanceChange;
use CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement as LeavePeriodEntitlement;
use CRM_HRLeaveAndAbsences_BAO_LeaveRequestDate as LeaveRequestDate;
use CRM_HRLeaveAndAbsences_BAO_ContactWorkPattern as ContactWorkPattern;
use CRM_HRLeaveAndAbsences_BAO_WorkDay as WorkDay;

class CRM_HRLeaveAndAbsences_BAO_LeaveRequest extends CRM_HRLeaveAndAbsences_DAO_LeaveRequest {

  /**
   * Create a new LeaveRequest based on array-data
   *
   * @param array $params key-value pairs
   * @return \CRM_HRLeaveAndAbsences_BAO_LeaveRequest|NULL
   *
   * @throws \Exception
   */
  public static function create($params) {
    $entityName = 'LeaveRequest';
    $hook = empty($params['id']) ? 'create' : 'edit';

    CRM_Utils_Hook::pre($hook, $entityName, CRM_Utils_Array::value('id', $params), $params);
    self::validateParams($params);
    $instance = new self();
    $instance->copyValues($params);

    $transaction = new CRM_Core_Transaction();
    try {
      $instance->save();
      $instance->saveDates();
      $transaction->commit();
    } catch(Exception $e) {
      $transaction->rollback();
      // We throw the catched Exception so forms can handle the
      // error and properly inform the user about what happened
      throw $e;
    }

    CRM_Utils_Hook::post($hook, $entityName, $instance->id, $instance);

    return $instance;
  }

  /**
   * @param array $params
   *   The params array received by the create method
   *
   * @throws \CRM_HRLeaveAndAbsences_Exception_InvalidLeaveRequestException
   */
  private static function validateParams($params) {

    if (empty($params['from_date'])) {
      throw new CRM_HRLeaveAndAbsences_Exception_InvalidLeaveRequestException(
        "Leave Requests should have a start date"
      );
    }

    if (!empty($params['to_date'])) {
      self::validateStartDateNotGreaterThanEndDate($params);
    }

    self::validateNoOverlappingLeaveRequests($params);
  }

  /**
   * This method checks that there is no overlapping leave request
   * with the status Approved, Admin Approved, Waiting Approval or More Information Requested
   * (Exception: if the other Leave Request is a Public Holiday Leave Request, then it can overlap),
   *
   * @params array $params
   *   The params array received by the create method
   *
   * @throws \CRM_HRLeaveAndAbsences_Exception_InvalidLeaveRequestException
   */
  private static function validateNoOverlappingLeaveRequests($params) {
    $leaveRequestStatuses = array_flip(self::buildOptions('status_id'));

    $leaveRequestStatusFilter = [
      $leaveRequestStatuses['Approved'],
      $leaveRequestStatuses['Admin Approved'],
      $leaveRequestStatuses['Waiting Approval'],
      $leaveRequestStatuses['More Information Requested'],
    ];

    $toDate = !empty($params['from_date']) ? $params['from_date'] : '';

    $overlappingLeaveRequests = self::findOverlappingLeaveRequests(
      $params['contact_id'],
      $params['from_date'],
      $toDate,
      $leaveRequestStatusFilter);

    if ($overlappingLeaveRequests) {
      throw new CRM_HRLeaveAndAbsences_Exception_InvalidLeaveRequestException(
        "This Leave request has dates that overlapps with an existing leave request"
      );
    }

  }
  /**
   * This method checks that the start date of a leave request should not be
   * greater than the end date provided the request is for a non single day leave request.
   * For single day leave requests, the end date is optional
   *
   * @param array $params
   *   The params array received by the create method
   *
   * @throws \CRM_HRLeaveAndAbsences_Exception_InvalidLeaveRequestException
   */
  private static function validateStartDateNotGreaterThanEndDate($params) {
      $fromDate = new DateTime($params['from_date']);
      $toDate = new DateTime($params['to_date']);

      if ($fromDate > $toDate) {
        throw new CRM_HRLeaveAndAbsences_Exception_InvalidLeaveRequestException(
          "Leave Request start date cannot be greater than the end date"
        );
      }
  }
  /**
   * Returns a LeaveRequest instance representing the Public Holiday Leave Request
   * for the given $publicHoliday and assigned to the Contact with the given
   * $contactID
   *
   * @param int $contactID
   * @param \CRM_HRLeaveAndAbsences_BAO_PublicHoliday $publicHoliday
   *
   * @return \CRM_HRLeaveAndAbsences_BAO_LeaveRequest|null
   */
  public static function findPublicHolidayLeaveRequest($contactID, PublicHoliday $publicHoliday) {
    $leaveRequestTable = self::getTableName();
    $leaveRequestDateTable = LeaveRequestDate::getTableName();
    $leaveBalanceChangeTable = LeaveBalanceChange::getTableName();

    $query = "
      SELECT lr.* FROM {$leaveRequestTable} lr
      INNER JOIN {$leaveRequestDateTable} lrd 
        ON lrd.leave_request_id = lr.id
      INNER JOIN {$leaveBalanceChangeTable} lbc
        ON lbc.source_id = lrd.id AND lbc.source_type = %1
      WHERE lr.contact_id = %2 AND 
            lrd.date = %3 AND
            lbc.type_id = %4
    ";

    $balanceChangeTypes = array_flip(LeaveBalanceChange::buildOptions('type_id'));

    $params = [
      1 => [LeaveBalanceChange::SOURCE_LEAVE_REQUEST_DAY, 'String'],
      2 => [$contactID, 'Integer'],
      3 => [CRM_Utils_Date::processDate($publicHoliday->date, null, false, 'Y-m-d'), 'String'],
      4 => [$balanceChangeTypes['Public Holiday'], 'Integer']
    ];

    $leaveRequest = CRM_Core_DAO::executeQuery($query, $params, true, self::class);

    if($leaveRequest->N == 1) {
      $leaveRequest->fetch();

      return $leaveRequest;
    }

    return null;
  }

  /**
   * Returns the leave request days already existing for the given contact
   * within the $fromDate to $todDate period and having the statuses supplied.
   *
   * @param int $contactID
   * @param string $fromDate
   * @param string $toDate
   * @param array $leaveRequestStatus
   * @param boolean $excludePublicHolidayLeaveRequests
   *   Whether to exclude public holiday leave requests from overlapping leave requests or not
   *
   * @return \CRM_HRLeaveAndAbsences_BAO_LeaveRequest[]|null
   */
  public static function findOverlappingLeaveRequests($contactID, $fromDate, $toDate, $leaveRequestStatus = [], $excludePublicHolidayLeaveRequests = true) {
    $leaveRequestTable = self::getTableName();
    $leaveRequestDateTable = LeaveRequestDate::getTableName();
    $leaveBalanceChangeTable = LeaveBalanceChange::getTableName();

    $query = "
      SELECT DISTINCT lr.* FROM {$leaveRequestTable} lr
      INNER JOIN {$leaveRequestDateTable} lrd 
        ON lrd.leave_request_id = lr.id
      INNER JOIN {$leaveBalanceChangeTable} lbc
        ON lbc.source_id = lrd.id AND lbc.source_type = %1
      WHERE lr.contact_id = %2
    ";

    if (!empty($toDate)){
      $query .= ' AND lrd.date BETWEEN %3 AND %4';
    }
    else{
      $query .= ' AND lrd.date = %3';
    }

    if (is_array($leaveRequestStatus) && !empty($leaveRequestStatus)) {
      array_walk($leaveRequestStatus, 'intval');
      $query .= ' AND lr.status_id IN('. implode(', ', $leaveRequestStatus) .')';
    }

    if ($excludePublicHolidayLeaveRequests) {
      $query .= " AND lbc.type_id != %5";
    }

    $balanceChangeTypes = array_flip(LeaveBalanceChange::buildOptions('type_id'));

    $params = [
      1 => [LeaveBalanceChange::SOURCE_LEAVE_REQUEST_DAY, 'String'],
      2 => [$contactID, 'Integer'],
      3 => [CRM_Utils_Date::processDate($fromDate, null, false, 'Y-m-d'), 'String'],
      5 => [$balanceChangeTypes['Public Holiday'], 'Integer']
    ];
    if (!empty($toDate)) {
      $params[4] = [CRM_Utils_Date::processDate($toDate, null, false, 'Y-m-d'), 'String'];
    }

    $leaveRequest = CRM_Core_DAO::executeQuery($query, $params, true, self::class);

    if($leaveRequest->N > 0) {
      $overlappingLeaveRequests = [];
      while($leaveRequest->fetch()) {
        $overlappingLeaveRequests[] = clone $leaveRequest;
      }
      return $overlappingLeaveRequests;
    }
    return null;
  }


  /**
   * Returns a list of all Absence Types, together with its total balance change.
   * That is, the sum of all the Leave Balance Changes for Leave Requests of that
   * Absence Type, for the given $contactID during the given $periodID.
   *
   * Balance Changes for Public Holiday Leave Requests won't be considered,
   * except when $publicHolidays is true. In that case, on the balance changes
   * for that type of request will be considered.
   *
   * @param int $contactID
   * @param int $periodID
   * @param array $leaveRequestStatus
   *   And array of values from the Leave Request Status OptionGroup
   * @param bool $publicHolidaysOnly
   *   When true, will get the balance change only for the Public Holiday Leave Requests
   *
   * @return array
   */
  public static function getBalanceChangeByAbsenceType(
    $contactID,
    $periodID,
    $leaveRequestStatus = [],
    $publicHolidaysOnly = false
  ) {
    $periodEntitlements = LeavePeriodEntitlement::getPeriodEntitlementsForContact($contactID, $periodID);

    $results = [];
    $excludePublicHolidays = !$publicHolidaysOnly;
    foreach($periodEntitlements as $periodEntitlement) {
      $balance = LeaveBalanceChange::getLeaveRequestBalanceForEntitlement(
        $periodEntitlement,
        $leaveRequestStatus,
        null,
        null,
        $excludePublicHolidays,
        $publicHolidaysOnly
      );
      $results[$periodEntitlement->type_id] = $balance;
    }

    return $results;
  }

  /**
   * Returns all the LeaveRequestDate instances related to this LeaveRequest.
   *
   * @return CRM_HRLeaveAndAbsences_BAO_LeaveRequestDate[]
   *  The dates in ascending order according to the date
   */
  public function getDates() {
    return LeaveRequestDate::getDatesForLeaveRequest($this->id);
  }

  /**
   * Creates and saves LeaveRequestDates for this LeaveRequest
   */
  private function saveDates() {
    $this->deleteDates();

    $startDate = new DateTime($this->from_date);

    if (!$this->to_date) {
      $endDate = new DateTime($this->from_date);
    }
    else {
      $endDate = new DateTime($this->to_date);
    }

    // We need to add 1 day to the end date to include it
    // when we loop through the DatePeriod
    $endDate->modify('+1 day');

    $interval   = new DateInterval('P1D');
    $datePeriod = new DatePeriod($startDate, $interval, $endDate);

    foreach ($datePeriod as $date) {
      LeaveRequestDate::create([
        'date' => $date->format('YmdHis'),
        'leave_request_id' => $this->id
      ]);
    }
  }

  /**
   * Deletes all the dates related to this LeaveRequest
   */
  private function deleteDates() {
    LeaveRequestDate::deleteDatesForLeaveRequest($this->id);
  }

  /**
   * Calculates the overall balance change that a Leave Request will create given a
   * start and end date and also returns the breakdown by days
   *
   * @param int $contactId
   * @param \DateTime $fromDate
   * @param string $fromType
   * @param null|\DateTime $toDate
   * @param null|string $toType
   *
   * @return array
   *   An array of formatted results
   */
  public static function calculateBalanceChange($contactId, $fromDate, $fromType, $toDate = null, $toType = null) {

    $leaveRequest = new self();
    $leaveRequest->contact_id = $contactId;

    //For single day leave requests
    if (!$toDate) {
      $toDate = $fromDate;
    }
    $startDate = new DateTime($fromDate);
    $endDate = new DateTime($toDate);
    $endDateUnmodified = new DateTime($toDate);
    // add one day to end date to include it in DatePeriod
    $endDate->modify('+1 day');
    $interval   = new DateInterval('P1D');
    $datePeriod = new DatePeriod($startDate, $interval, $endDate);

    $isHalfDay = ['half_day_am', 'half_day_pm'];
    $fromDateIsHalfDay = in_array($fromType, $isHalfDay);
    $toDateIsHalfDay = in_array($toType, $isHalfDay);
    $resultsBreakdown = [
      'amount' => 0,
      'breakdown' => []
    ];
    $leaveRequestDayTypeOptionsGroup = self::getLeaveRequestDayTypeOptionsGroup();
    $leaveRequestDayTypes = array_flip(self::buildOptions('from_date_type'));

    foreach ($datePeriod as $date) {
      //check if date is a public holiday
      if(self::publicHolidayLeaveRequestExists($contactId, $date)){
        $amount = 0.0;
        $key = $leaveRequestDayTypes['Public Holiday'];
        $leaveRequestDayTypeName = CRM_Core_Pseudoconstant::getName(self::class, 'from_date_type', $key);
      }
      else{
        $amount = LeaveBalanceChange::calculateAmountForDate($leaveRequest, $date);
        $type = ContactWorkPattern::getWorkDayType($contactId, $date);
        $key = self::getLeaveRequestDayTypeFromWorkDayType($type);
        $leaveRequestDayTypeName = CRM_Core_Pseudoconstant::getName(self::class, 'from_date_type', $key);
      }

      //since its an half day, 0.5 will be deducted irrespective of the amount returned from the work pattern
      if($fromDateIsHalfDay && $date == $startDate && $amount != 0) {
        $amount = -1 * 0.5;
        $leaveRequestDayTypeName = $fromType;
      }

      //since its an half day, 0.5 will be deducted irrespective of the amount returned from the work pattern
      if($toDateIsHalfDay && $date == $endDateUnmodified && $amount !=0) {
        $amount =  -1 * 0.5;
        $leaveRequestDayTypeName = $toType;
      }

      $result = [
        'date' => $date->format('Y-m-d'),
        'amount' => abs($amount),
        'type' => $leaveRequestDayTypeOptionsGroup[$leaveRequestDayTypeName]
      ];
      $resultsBreakdown['amount'] += $amount;
      $resultsBreakdown['breakdown'][] = $result;
    }
    return $resultsBreakdown;
  }

  /**
   * Returns the LeaveRequest Day Type ID equivalent of a WorkDay Type ID based on a mapping
   *
   * @param int|string $type
   *   The WorkDay Type ID
   *
   * @return int|null
   *   The LeaveRequest Day Type ID
   */
  private static function getLeaveRequestDayTypeFromWorkDayType($type) {
    $leaveRequestDayTypes = array_flip(self::buildOptions('from_date_type'));

    switch($type) {
      case WorkDay::WORK_DAY_OPTION_NO:
        return $leaveRequestDayTypes['Non Working Day'];

      case WorkDay::WORK_DAY_OPTION_YES:
        return $leaveRequestDayTypes['All Day'];

      case WorkDay::WORK_DAY_OPTION_WEEKEND:
        return $leaveRequestDayTypes['Weekend'];

      default:
        return '';
    }
  }

  /**
   * Returns LeaveRequest Day Type Options in a nested array format
   * with the day_type_id key as the array key and details about the day_type_id as the value
   *
   * @return array
   *   [
   *     'all_day' => [
   *     'id' => 1,
   *     'value' => '1',
   *     'label' => 'all_day'
   *     ],
   *     'half_day_am => [
   *     'id' => 2,
   *     'value' => '2',
   *     'label' => 'half_day_am'
   *     ]
   *   ]
   */
  private static function getLeaveRequestDayTypeOptionsGroup() {
    $leaveRequestDayTypeOptionsGroup = [];
    $leaveRequestDayTypeOptions = self::buildOptions('from_date_type');
    foreach($leaveRequestDayTypeOptions  as $key => $label) {
      $name = CRM_Core_Pseudoconstant::getName(self::class, 'from_date_type', $key);
      $leaveRequestDayTypeOptionsGroup[$name] = [
        'id' => $key,
        'value' => $key,
        'label' => $label
      ];
    }
    return $leaveRequestDayTypeOptionsGroup;
  }

  /**
   * Returns a LeaveRequest Object if a public holiday leave request exists for the given date
   *
   * @param int $contactID
   * @param \DateTime $date
   *
   * @return \CRM_HRLeaveAndAbsences_BAO_LeaveRequest|null
   */
  private static function publicHolidayLeaveRequestExists($contactID, DateTime $date) {
    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = $date->format('Y-m-d');
    return self::findPublicHolidayLeaveRequest($contactID, $publicHoliday);
  }
}
