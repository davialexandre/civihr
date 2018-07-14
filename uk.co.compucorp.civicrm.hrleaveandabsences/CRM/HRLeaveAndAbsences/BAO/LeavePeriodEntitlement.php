<?php
use CRM_HRLeaveAndAbsences_Service_EntitlementCalculation as EntitlementCalculation;
use CRM_HRLeaveAndAbsences_BAO_AbsencePeriod as AbsencePeriod;
use CRM_HRLeaveAndAbsences_BAO_LeaveRequest as LeaveRequest;
use CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange as LeaveBalanceChange;
use CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement as LeavePeriodEntitlement;
use CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlementLog as LeavePeriodEntitlementLog;
use CRM_HRLeaveAndAbsences_Queue_PublicHolidayLeaveRequestUpdates as PublicHolidayLeaveRequestUpdatesQueue;

/**
 * Class CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement
 */
class CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement extends CRM_HRLeaveAndAbsences_DAO_LeavePeriodEntitlement {

  use CRM_HRLeaveAndAbsences_ACL_LeaveInformationTrait;

  /**
   * Create a new LeavePeriodEntitlement based on array-data
   *
   * @param array $params key-value pairs
   * @return CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement|NULL
   **/
  public static function create($params) {
    $entityName = 'LeavePeriodEntitlement';
    $hook = empty($params['id']) ? 'create' : 'edit';

    $params['editor_id']  = CRM_Core_Session::getLoggedInContactID();

    CRM_Utils_Hook::pre($hook, $entityName, CRM_Utils_Array::value('id', $params), $params);
    $instance = new self();
    $instance->copyValues($params);
    $instance->save();
    CRM_Utils_Hook::post($hook, $entityName, $instance->id, $instance);

    return $instance;
  }

  /**
   * Returns the calculated entitlement for a Contact,
   * AbsencePeriod and AbsenceType with the given IDs
   *
   * @param int $contactId The ID of the Contact
   * @param int $periodId The ID of the Absence Period
   * @param int $absenceTypeId The ID of the AbsenceType
   *
   * @return \CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement|null
   *    If there's no entitlement for the given arguments, null will be returned
   *
   * @throws \InvalidArgumentException
   */
  public static function getPeriodEntitlementForContact($contactId, $periodId, $absenceTypeId) {
    if(!$contactId) {
      throw new InvalidArgumentException("You must inform the Contact ID");
    }
    if(!$periodId) {
      throw new InvalidArgumentException("You must inform the AbsencePeriod ID");
    }
    if(!$absenceTypeId) {
      throw new InvalidArgumentException("You must inform the AbsenceType ID");
    }

    $entitlement = new self();
    $entitlement->contact_id = (int)$contactId;
    $entitlement->period_id = (int)$periodId;
    $entitlement->type_id = (int)$absenceTypeId;
    $entitlement->find(true);
    if($entitlement->id) {
      return $entitlement;
    }

    return null;
  }

  /**
   * Returns an array of LeavePeriodEntitlements for a contact for a specific Absence Period ID
   * If the Absence Type ID parameter is also supplied, it returns the LeavePeriodEntitlement for the absence type
   *
   * @param int $contactId
   * @param int $periodId
   * @param int|null $absenceTypeId
   *
   * @return CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement[]
   *   If there are no entitlements, an empty array will be returned
   */
  public static function getPeriodEntitlementsForContact($contactId, $periodId, $absenceTypeId = null) {

    if(!$contactId) {
      throw new InvalidArgumentException("You must inform the Contact ID");
    }
    if(!$periodId) {
      throw new InvalidArgumentException("You must inform the AbsencePeriod ID");
    }
    $entitlement = new self();
    $entitlement->contact_id = (int)$contactId;
    $entitlement->period_id = (int)$periodId;

    if ($absenceTypeId) {
      $entitlement->type_id = $absenceTypeId;
    }
    $entitlement->find();
    $leaveEntitlements = [];

    while($entitlement->fetch()) {
      $leaveEntitlements[] = clone $entitlement;
    }
    return $leaveEntitlements;
  }

  /**
   * This method saves a new LeavePeriodEntitlement and the respective
   * LeaveBalanceChanges based on the given EntitlementCalculation.
   *
   * If there's already an LeavePeriodEntitlement for the calculation's Absence
   * Period, Absence Type, and Contact, it will be replaced by a new one.
   *
   * If an overridden entitlement is given, the created Entitlement will be marked
   * as overridden.
   *
   * If a calculation comment is given, the current logged in user will be stored
   * as the comment's author.
   *
   * @param \CRM_HRLeaveAndAbsences_Service_EntitlementCalculation $calculation
   * @param DateTime $createdDate
   *   The date the entitlement was created/updated
   * @param float|null $overriddenEntitlement
   *  A value to override the calculation's proposed entitlement
   * @param string|null $calculationComment
   *  A comment describing the calculation
   */
  public static function saveFromCalculation(
    EntitlementCalculation $calculation,
    DateTime $createdDate,
    $overriddenEntitlement = null,
    $calculationComment = null
  ) {
    $transaction = new CRM_Core_Transaction();
    try {
      $absencePeriodID = $calculation->getAbsencePeriod()->id;
      $absenceTypeID = $calculation->getAbsenceType()->id;
      $contactID = $calculation->getContact()['id'];
      $params = [];
      $oldEntitlement = null;

      $leavePeriodEntitlement = self::getPeriodEntitlementForContact(
        $contactID,
        $absencePeriodID,
        $absenceTypeID
      );

      if ($leavePeriodEntitlement) {
        self::logChanges($leavePeriodEntitlement);
        $oldEntitlement = $leavePeriodEntitlement->getEntitlement();
        $params['id'] = $leavePeriodEntitlement->id;
      }

      self::deleteBalanceChangesForLeavePeriodEntitlement($absencePeriodID, $absenceTypeID, $contactID);

      $leaveEntitlementParams = array_merge(self::buildLeavePeriodParamsFromCalculation(
        $calculation,
        $createdDate,
        $overriddenEntitlement,
        $calculationComment
      ), $params);

      $periodEntitlement = self::create($leaveEntitlementParams);
      self::saveBroughtForwardBalanceChange($calculation, $periodEntitlement);
      self::savePublicHolidaysBalanceChanges($calculation, $periodEntitlement);
      self::saveLeaveBalanceChange($calculation, $periodEntitlement, $overriddenEntitlement);

      $transaction->commit();

      $newEntitlement = $periodEntitlement->getEntitlement();
      self::enqueuePublicHolidayLeaveRequestUpdateTask(
        $oldEntitlement,
        $newEntitlement,
        $contactID,
        $absencePeriodID
      );

    } catch(\Exception $ex) {
      $transaction->rollback();
    }
  }

  /**
   * @param \CRM_HRLeaveAndAbsences_Service_EntitlementCalculation $calculation
   * @param DateTime $createdDate
   * @param boolean $overriddenEntitlement
   * @param string $calculationComment
   *
   * @return array
   */
  private static function buildLeavePeriodParamsFromCalculation(
    EntitlementCalculation $calculation,
    DateTime $createdDate,
    $overriddenEntitlement,
    $calculationComment
  ) {
    $absenceTypeID = $calculation->getAbsenceType()->id;
    $contactID = $calculation->getContact()['id'];
    $absencePeriodID = $calculation->getAbsencePeriod()->id;

    $params = [
      'type_id' => $absenceTypeID,
      'contact_id' => $contactID,
      'period_id' => $absencePeriodID,
      'overridden' => (boolean)$overriddenEntitlement,
      'created_date' => $createdDate->format('YmdHis'),
      'comment' => $calculationComment ?: ''
    ];

    return $params;
  }

  /**
   * Saves the Entitlement Calculation Pro Rata as a Balance Change of the "Leave
   * Type".
   *
   * @param \CRM_HRLeaveAndAbsences_Service_EntitlementCalculation $calculation
   * @param \CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement $periodEntitlement
   * @param int $overriddenEntitlement
   */
  private static function saveLeaveBalanceChange(
    EntitlementCalculation $calculation,
    LeavePeriodEntitlement $periodEntitlement,
    $overriddenEntitlement = null
  ) {
    $balanceChangeTypes = array_flip(LeaveBalanceChange::buildOptions('type_id', 'validate'));

    //The original pro-rata calculation already factors in public holidays
    //since public holiday balance changes are saved differently, we need to deduct it from the pro rata
    LeaveBalanceChange::create([
      'type_id' => $balanceChangeTypes['leave'],
      'source_id' => $periodEntitlement->id,
      'source_type' => LeaveBalanceChange::SOURCE_ENTITLEMENT,
      'amount' => $calculation->getProRata() - $calculation->getNumberOfPublicHolidaysInEntitlement()
    ]);


    if($periodEntitlement->overridden && !is_null($overriddenEntitlement)) {
      $overriddenEntitlement = (float)$overriddenEntitlement;

      $proposedEntitlement = $calculation->getProposedEntitlement();
      LeaveBalanceChange::create([
        'type_id' => $balanceChangeTypes['overridden'],
        'source_id' => $periodEntitlement->id,
        'source_type' => LeaveBalanceChange::SOURCE_ENTITLEMENT,
        'amount' => $overriddenEntitlement - $proposedEntitlement
      ]);
    }
  }

  /**
   * Saves the Entitlement Calculation Brought Forward as a Balance Change of the
   * "Brought Forward" type.
   *
   * @param \CRM_HRLeaveAndAbsences_Service_EntitlementCalculation $calculation
   * @param \CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement $periodEntitlement
   */
  private static function saveBroughtForwardBalanceChange(
    EntitlementCalculation $calculation,
    LeavePeriodEntitlement $periodEntitlement
  ) {
    $balanceChangeTypes = array_flip(LeaveBalanceChange::buildOptions('type_id', 'validate'));

    $broughtForward = $calculation->getBroughtForward();

    if ($broughtForward) {
      $broughtForwardExpirationDate = $calculation->getBroughtForwardExpirationDate();

      LeaveBalanceChange::create([
        'type_id' => $balanceChangeTypes['brought_forward'],
        'source_id' => $periodEntitlement->id,
        'source_type' => LeaveBalanceChange::SOURCE_ENTITLEMENT,
        'amount' => $broughtForward,
        'expiry_date' => CRM_Utils_Date::processDate($broughtForwardExpirationDate)
      ]);
    }
  }

  /**
   * Saves the Entitlement Calculation Public Holiday as Balance Changes
   *
   * Leave Balance Change of type "Public Holiday" will be created with the amount
   * equals to the number of Public Holidays in the entitlement.
   *
   * @param \CRM_HRLeaveAndAbsences_Service_EntitlementCalculation $calculation
   * @param \CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement $periodEntitlement
   */
  private static function savePublicHolidaysBalanceChanges(
    EntitlementCalculation $calculation,
    LeavePeriodEntitlement $periodEntitlement
  ) {
    $balanceChangeTypes = array_flip(LeaveBalanceChange::buildOptions('type_id', 'validate'));

    $numberOfPublicHolidays = $calculation->getNumberOfPublicHolidaysInEntitlement();

    if (!empty($numberOfPublicHolidays)) {
      LeaveBalanceChange::create([
        'type_id' => $balanceChangeTypes['public_holiday'],
        'source_id' => $periodEntitlement->id,
        'source_type' => LeaveBalanceChange::SOURCE_ENTITLEMENT,
        'amount' => $numberOfPublicHolidays
      ]);
    }
  }

  /**
   * Deletes the LeaveBalanceChanges for a LeavePeriodEntitlement
   *
   * @param int $absencePeriodID
   * @param int $absenceTypeID
   * @param int $contactID
   */
  private static function deleteBalanceChangesForLeavePeriodEntitlement($absencePeriodID, $absenceTypeID, $contactID) {
    $leavePeriodEntitlement = new self();
    $leavePeriodEntitlement->period_id = $absencePeriodID;
    $leavePeriodEntitlement->type_id = $absenceTypeID;
    $leavePeriodEntitlement->contact_id = $contactID;
    $leavePeriodEntitlement->find(true);

    if ($leavePeriodEntitlement->id) {
      LeaveBalanceChange::deleteForLeavePeriodEntitlement($leavePeriodEntitlement);
    }
  }

  /**
   * Returns the current balance for this LeavePeriodEntitlement.
   *
   * The balance only includes:
   * - Brought Forward
   * - Public Holidays
   * - Expired Balance Changes
   * - Approved Leave Requests
   *
   * @param array $excludeLeaveIds
   *   An array of Leave request ID's to be excluded from
   *   the entitlement balance calculation.
   *
   * @return float
   */
  public function getBalance($excludeLeaveIds = []) {
    $filterStatuses = LeaveRequest::getApprovedStatuses();

    return LeaveBalanceChange::getBalanceForEntitlement($this, $filterStatuses, false, $excludeLeaveIds);
  }

  /**
   * Returns the future balance for this LeavePeriodEntitlement.
   *
   * Future Balance is the Balance/Remainder for an entitlement when Leave Requests with Awaiting Approval
   * and More Information Required statuses are accounted for in the calculation apart from the usual
   * Approved and Admin Approved Statuses.
   *
   * @return float
   */
  public function getFutureBalance() {
    $filterStatuses = array_merge(
      LeaveRequest::getApprovedStatuses(),
      LeaveRequest::getOpenStatuses()
    );
    return LeaveBalanceChange::getBalanceForEntitlement($this, $filterStatuses);
  }

  /**
   * Loops through the list of LeaveBalanceChanges and groups them by the type_id.
   *
   * Balance Changes of type "Overridden" will be grouped together with those of
   * type "Leave". The reason is that "Overridden" is just a special type of
   * "Leave" which was overridden by the manager during the entitlement
   * calculation.
   *
   * @param CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange[] $balanceChanges
   *
   * @return array
   *   The returned array has the following format:
   *   [
   *      TYPE_ID_1 => [
   *        // list of LeaveBalanceChange instances with TYPE_ID_1
   *      ],
   *      TYPE_ID_2 => [
   *        // list of LeaveBalanceChange instances with TYPE_ID_2
   *      ]
   *   ]
   */
  private static function groupBalanceChangesByType($balanceChanges) {
    $leaveBalanceChangeTypes = array_flip(LeaveBalanceChange::buildOptions('type_id', 'validate'));

    $balanceChangesByType = [];
    foreach ($balanceChanges as $balanceChange) {
      $typeID = $balanceChange->type_id;

      if ($typeID == $leaveBalanceChangeTypes['overridden']) {
        $typeID = $leaveBalanceChangeTypes['leave'];
      }

      if (empty($balanceChangesByType[$typeID])) {
        $balanceChangesByType[$typeID] = [];
      }

      $balanceChangesByType[$typeID][] = $balanceChange;
    }

    return $balanceChangesByType;
  }

  /**
   * Returns the LeavePeriodEntitlement for the given LeaveRequest. That is,
   * the LeavePeriodEntitlement with the same contact and absence type as of
   * the given LeaveRequest and for the Absence Period which contains the
   * LeaveRequest dates.
   *
   * @param \CRM_HRLeaveAndAbsences_BAO_LeaveRequest $leaveRequest
   *
   * @return \CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement|null
   *
   * @throws \RuntimeException
   */
  public static function getForLeaveRequest(LeaveRequest $leaveRequest) {
    $absencePeriod = AbsencePeriod::getPeriodContainingDates(
      new DateTime($leaveRequest->from_date),
      new DateTime($leaveRequest->to_date)
    );

    if($absencePeriod === null) {
      throw new RuntimeException('It was not possible to find an AbsencePeriod containing the given LeaveRequest');
    }

    return self::getPeriodEntitlementForContact(
      $leaveRequest->contact_id,
      $absencePeriod->id,
      $leaveRequest->type_id
    );
  }

  /**
   * Returns a list of entitlements for the given Contacts during the given
   * Absence Period. Optionally, it can return the entitlements for a specific
   * Absence Type.
   *
   * Important: This method DOES NOT return LeavePeriodEntitlement instances.
   *
   * @param array $contactIDs
   * @param int $absencePeriodID
   * @param int|null $absenceTypeID
   *
   * @return array
   *  An array with this format:
   *  [
   *     contact_id_1 => [
   *        absence_type1_id => entitlement,
   *        absence_type2_id => entitlement,
   *        ...
   *     ],
   *     contact_id_2 => [
   *      absence_type1_id => entitlement,
   *      ...
   *     ]
   *     ...
   *  ]
   */
  public static function getEntitlementsForContacts($contactIDs, $absencePeriodID, $absenceTypeID = null) {
    $entitlements = [];

    array_walk($contactIDs, 'intval');

    $whereAbsenceType = '';
    if($absenceTypeID) {
      $absenceTypeID = (int)$absenceTypeID;
      $whereAbsenceType = "lpe.type_id = {$absenceTypeID} AND";
    }

    $periodEntitlementTable = self::getTableName();
    $balanceChangeTable = LeaveBalanceChange::getTableName();

    $query = "
      SELECT lpe.contact_id,
             lpe.type_id,
             SUM(lbc.amount) AS entitlement
      FROM {$periodEntitlementTable} lpe
      INNER JOIN {$balanceChangeTable} lbc
              ON lbc.source_type = 'entitlement' AND lbc.source_id = lpe.id
      WHERE {$whereAbsenceType} lpe.period_id = %1 AND 
            lpe.contact_id IN (" . implode(',', $contactIDs) . ")
      GROUP BY lpe.id";

    $params = [
      1 => [$absencePeriodID, 'Positive'],
    ];

    $result = CRM_Core_DAO::executeQuery($query, $params);

    while($result->fetch()) {
      $entitlements[$result->contact_id][$result->type_id] = $result->entitlement;
    }

    return $entitlements;
  }

  /**
   * Returns the entitlement (number of days) for this LeavePeriodEntitlement.
   *
   * This is basic the sum of the amounts of the LeaveBalanceChanges that are
   * part of the entitlement Breakdown. That is balance changes of the Leave,
   * Brought Forward and Public Holidays types, without a source_id.
   *
   * @see CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange::getBreakdownBalanceChangesForEntitlement()
   *
   * @return float
   */
  public function getEntitlement() {
    return LeaveBalanceChange::getBreakdownBalanceForEntitlement($this->id);
  }

  /**
   * Returns the balance changes for this LeavePeriodEntitlement
   *
   * @param boolean $returnExpiredOnly
   *
   * @return \CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange[]
   */
  public function getBreakdownBalanceChanges($returnExpiredOnly) {
    return LeaveBalanceChange::getBreakdownBalanceChangesForEntitlement($this->id, $returnExpiredOnly);
  }

  /**
   * Returns the current LeaveRequest balance for this LeavePeriodEntitlement. That
   * is, a balance that sums up only the balance changes caused by Leave Requests.
   *
   * Since LeaveRequests generates negative balance changes, the returned number
   * will be negative as well.
   *
   * This method only accounts for Approved LeaveRequests.
   *
   * @return float
   */
  public function getLeaveRequestBalance() {
    $filterStatuses = LeaveRequest::getApprovedStatuses();
    $excludeToilRequests = true;
    $excludePublicHolidays = $includePublicHolidaysOnly = false;

    return LeaveBalanceChange::getLeaveRequestBalanceForEntitlement(
      $this,
      $filterStatuses,
      $excludePublicHolidays,
      $includePublicHolidaysOnly,
      $excludeToilRequests
    );
  }

  /**
   * This method returns a set of start and end dates for this LeavePeriodEntitlement.
   * These dates are the start and end dates of all contracts for this
   * LeavePeriodEntitlement's contact which overlap the LeavePeriodEntitlement's
   * AbsencePeriod.
   *
   * The dates are adjusted to be inside the Absence Period start and end date.
   * That is, if the start date of one of the contracts is less than the Absence
   * Period start date, then the latter date will be returned. Otherwise,
   * the former will be used. As for the end date, if the contract one is empty
   * or is greather than Absence Period end date, then the latter will be returned.
   * Otherwise, the former will be used.
   *
   * @return array
   *   An array of arrays with the start date and end date for each contract:
   *   [
   *    ['2016-01-01', '2016-04-10'],
   *    ['2016-05-01', '2016-12-31'],
   *   ]
   */
  public function getStartAndEndDates() {
    $absencePeriod = AbsencePeriod::findById($this->period_id);
    $contractDates = $this->getContractDatesForContactInPeriod($absencePeriod);

    foreach($contractDates as $i => $dates) {
      if(is_null($dates['end_date'])) {
        $dates['end_date'] = $absencePeriod->end_date;
      }

      list($adjustedStartDate, $adjustedEndDate) = $absencePeriod->adjustDatesToMatchPeriodDates(
        $dates['start_date'],
        $dates['end_date']
      );

      $contractDates[$i]['start_date'] = $adjustedStartDate;
      $contractDates[$i]['end_date'] = $adjustedEndDate;
    }


    return $contractDates;
  }

  /**
   * Returns an array containing the Contract's start and end dates.
   *
   * @param \CRM_HRLeaveAndAbsences_BAO_AbsencePeriod $absencePeriod
   *
   * @return array The array with the dates
   */
  private function getContractDatesForContactInPeriod(AbsencePeriod $absencePeriod) {
    $result = civicrm_api3('HRJobContract', 'getcontractswithdetailsinperiod', [
      'contact_id' => $this->contact_id,
      'start_date' => $absencePeriod->start_date,
      'end_date'   => $absencePeriod->end_date
    ]);

    if(empty($result['values'])) {
      return [];
    }

    $contractsDates = [];
    foreach($result['values'] as $contract) {
      $contractsDates[] = [
        'start_date' => $contract['period_start_date'],
        'end_date' => !empty($contract['period_end_date']) ? $contract['period_end_date'] : null
      ];
    }

    return $contractsDates;
  }

  /**
   * Returns formatted result for getting the balance for an entitlement period given an
   * Entitlement Id or (Contact ID + Absence Period ID).
   * When params contains the include_future parameter and its true,
   * It returns also future balance for an entitlement taking the Awaiting Approval
   * and More Information Required leave statuses into consideration
   *
   * @param array $params
   * Sample param: $params = ['entitlement_id' => 1, 'contact_id' => 9, 'include_future' => false]
   *
   * @return array
   * an array of formatted results
   * [
   *   [
   *     'id' => 1,
   *     'remainder' => [
   *       'current => 30,
   *       'future' => 20
   *     ]
   *   ]
   * [
   *
   */
  public static function getRemainder($params){

    $leavePeriodEntitlements = [];

    if(!empty($params['entitlement_id'])) {
      $leavePeriodEntitlements[] = self::findById($params['entitlement_id']);
    }

    if(!empty($params['contact_id']) && !empty($params['period_id'])){
      $leavePeriodEntitlements = self::getPeriodEntitlementsForContact($params['contact_id'], $params['period_id']);
    }
    $results = [];
    foreach($leavePeriodEntitlements as $leavePeriodEntitlement){
      $remainder = ['current' => $leavePeriodEntitlement->getBalance()];
      if(!empty($params['include_future'])){
         $remainder['future'] = $leavePeriodEntitlement->getFutureBalance();
      }

      $results[] = [
        'id' => $leavePeriodEntitlement->id,
        'remainder' => $remainder
      ];

    }
    return $results;
  }

  /**
   * Returns formatted results for getting the breakdown for a period entitlement
   * i.e all of the leave balance changes given a leavePeriodEntitlement ID or
   * (ContactID + periodId).
   *
   * It also returns either valid or expired leave balance changes based on
   * whether the expired parameter is true or false.
   *
   * Balance Changes of the same type will be grouped together. The amount will
   * be the sum of the grouped items. Balance Changes of type "Overridden" will
   * be grouped together with those of type "Leave". The reason is that
   * "Overridden" is just a special type of "Leave" which was overridden by the
   * manager during the entitlement calculation.
   *
   * @param array $params
   *   The param array passed to the LeavePeriodEntitlement.getBreakdown API Endpoint
   *   The supported values are:
   *   - entitlement_id: The id for a LeavePeriodEntitlement
   *   - contact_id: The id for a Contact
   *   - period_id: The id for a AbsencePeriod
   *   - expired: A boolean flag. When it's true, only expired records will be returned. Otherwise, only non-expired
   *
   * @return array
   *   an array of formatted results
   *   [
   *    'id' => 1,
   *     'breakdown => [
   *       'amount' => '5.00',
   *       'expiry_date' => null,
   *       'type' => [
   *         'id' => 2,
   *         'value' => 'brought_forward'
   *         'label' => 'Brought Forward'
   *         ]
   *     ]
   *   ]
   */
  public static function getBreakdown($params) {

    $leavePeriodEntitlements = [];

    if(!empty($params['entitlement_id'])) {
      $leavePeriodEntitlements[] = self::findById($params['entitlement_id']);
    }

    if(!empty($params['contact_id']) && !empty($params['period_id'])) {
      $leavePeriodEntitlements = self::getPeriodEntitlementsForContact($params['contact_id'], $params['period_id']);
    }

    $leaveBalanceTypeIdOptionsGroup = self::getLeaveBalanceChangeTypeIdOptionsGroup();

    $results = [];
    $returnExpired = !empty($params['expired']);
    foreach($leavePeriodEntitlements as $leavePeriodEntitlement) {
      $periodEntitlementInfo = [
        'id' => $leavePeriodEntitlement->id,
        'breakdown' => []
      ];

      $balanceChanges = $leavePeriodEntitlement->getBreakdownBalanceChanges($returnExpired);
      $balanceChangesByType = self::groupBalanceChangesByType($balanceChanges);

      foreach($balanceChangesByType as $typeID => $balanceChangeGroup) {
        $amount = array_reduce($balanceChangeGroup, function($totalAmount, $balanceChange) {
          return $totalAmount + (float)$balanceChange->amount;
        }, 0);

        $periodEntitlementInfo['breakdown'][] = [
          'amount' => $amount,
          'expiry_date' => $balanceChangeGroup[0]->expiry_date,
          'type' => $leaveBalanceTypeIdOptionsGroup[$typeID],
        ];
      }

      $results[] = $periodEntitlementInfo;
    }

    return $results;
  }

  /**
   * Returns LeaveBalanceChange Options for Type ID in a nested array format
   * with the Type ID key as the array key and details about the Type ID as the value
   *
   * @return array
   *   [
   *     1 => [
   *     'id' => 1,
   *     'value' => 'leave',
   *     'label' => 'Leave'
   *     ],
   *     2 => [
   *     'id' => 2,
   *     'value' => 'brought_forward',
   *     'label' => 'Brought Forward'
   *     ]
   *   ]
   */
  private static function getLeaveBalanceChangeTypeIdOptionsGroup() {
    $leaveBalanceTypeIdOptionsGroup = [];
    $leaveBalanceChangeTypeIdOptions = LeaveBalanceChange::buildOptions('type_id');
    foreach($leaveBalanceChangeTypeIdOptions as $key => $label) {
      $leaveBalanceTypeIdOptionsGroup[$key] = [
        'id' => $key,
        'value' => CRM_Core_Pseudoconstant::getName(LeaveBalanceChange::class, 'type_id', $key),
        'label' => $label
      ];
    }
    return $leaveBalanceTypeIdOptionsGroup;
  }

  /**
   * {@inheritdoc}
   */
  public function addSelectWhereClause() {
    if (CRM_Core_Permission::check([['view all contacts', 'edit all contacts']])) {
      return;
    }

    $clauses['contact_id'] = $this->getLeaveInformationACLClauses();

    CRM_Utils_Hook::selectWhereClause($this, $clauses);
    return $clauses;
  }

  /**
   * Log changes to the LeavePeriod Entitlement using the Entitlement
   * Log Entity.
   *
   * @param CRM_HRLeaveAndAbsences_BAO_LeavePeriodEntitlement $leavePeriodEntitlement
   */
  private static function logChanges(LeavePeriodEntitlement $leavePeriodEntitlement) {
    $editorId = $leavePeriodEntitlement->editor_id ?: CRM_Core_Session::getLoggedInContactID();
    $createdDate = $leavePeriodEntitlement->created_date ?: date('YmdHis');

    LeavePeriodEntitlementLog::create([
      'entitlement_id' => $leavePeriodEntitlement->id,
      'entitlement_amount' => $leavePeriodEntitlement->getEntitlement(),
      'editor_id' => $editorId,
      'comment' => $leavePeriodEntitlement->comment,
      'created_date' => $createdDate
    ]);
  }

  /**
   * Enqueue a new task to update Public Holiday Leave Requests
   * for the Absence Period if there is a change in entitlements
   * for the contact. i.e If the contact has no entitlement before
   * and now has entitlement or If the contact has entitlement before
   * and now the entitlement has been removed(zero entitlement).
   *
   * @param float|null $oldEntitlement
   * @param float $newEntitlement
   * @param int $contactID
   * @param int $absencePeriodID
   */
  private static function enqueuePublicHolidayLeaveRequestUpdateTask($oldEntitlement, $newEntitlement, $contactID, $absencePeriodID) {
    if(!$oldEntitlement || !$newEntitlement) {
      $task = new CRM_Queue_Task(
        ['CRM_HRLeaveAndAbsences_Queue_Task_UpdatePublicHolidayLeaveRequestsForAbsencePeriod', 'run'],
        [$absencePeriodID, [$contactID]]
      );

      PublicHolidayLeaveRequestUpdatesQueue::createItem($task);
    }
  }
}
