<?php

use CRM_Hrjobcontract_Test_Fabricator_HRJobContract as HRJobContractFabricator;
use CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange as LeaveBalanceChange;
use CRM_HRLeaveAndAbsences_BAO_LeaveRequest as LeaveRequest;
use CRM_HRLeaveAndAbsences_BAO_PublicHoliday as PublicHoliday;
use CRM_HRLeaveAndAbsences_Service_LeaveBalanceChange as LeaveBalanceChangeService;
use CRM_HRLeaveAndAbsences_Service_LeaveRequest as LeaveRequestService;
use CRM_HRLeaveAndAbsences_Service_LeaveRequestRights as LeaveRequestRightsService;
use CRM_HRLeaveAndAbsences_Test_Fabricator_WorkPattern as WorkPatternFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_LeaveRequest as LeaveRequestFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_AbsencePeriod as AbsencePeriodFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_ContactWorkPattern as ContactWorkPatternFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_AbsenceType as AbsenceTypeFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_PublicHolidayLeaveRequest as PublicHolidayLeaveRequestFabricator;


/**
 * Class CRM_HRLeaveAndAbsences_Service_LeaveRequestTest
 *
 * @group headless
 */
class CRM_HRLeaveAndAbsences_Service_LeaveRequestTest extends BaseHeadlessTest {

  use CRM_HRLeaveAndAbsences_LeaveRequestHelpersTrait;
  use CRM_HRLeaveAndAbsences_SessionHelpersTrait;
  use CRM_HRLeaveAndAbsences_LeaveManagerHelpersTrait;
  use CRM_HRLeaveAndAbsences_LeaveRequestStatusMatrixHelpersTrait;
  use CRM_HRLeaveAndAbsences_LeaveBalanceChangeHelpersTrait;
  use CRM_HRLeaveAndAbsences_PublicHolidayHelpersTrait;


  private $leaveBalanceChangeService;

  private $leaveContact;

  public function setUp() {
    CRM_Core_DAO::executeQuery("SET foreign_key_checks = 0;");
    $this->leaveBalanceChangeService = new LeaveBalanceChangeService();

    $this->leaveContact = 1;
    $this->registerCurrentLoggedInContactInSession($this->leaveContact);
    CRM_Core_Config::singleton()->userPermissionClass->permissions = [];
  }

  public function testCreateAlsoCreateTheLeaveRequestBalanceChanges() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    // a 7 days leave request, from monday to sunday
    $leaveRequest = $this->getleaveRequestService()->create([
      'type_id' => 1,
      'contact_id' => $this->leaveContact,
      'status_id' => 3,
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'from_date_type' => $this->getLeaveRequestDayTypes()['all_day']['value'],
      'to_date' => CRM_Utils_Date::processDate('2016-01-10'),
      'to_date_type' => $this->getLeaveRequestDayTypes()['all_day']['value'],
      'request_type' => LeaveRequest::REQUEST_TYPE_LEAVE
    ], false);

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    // Since the 40 hours work pattern was used, and it this is a week long
    // leave request, the balance will be -5 (for the 5 working days)
    $this->assertEquals(-5, $balance);

    $balanceChanges = LeaveBalanceChange::getBreakdownForLeaveRequest($leaveRequest);
    // Even though the balance is 5, we must have 7 balance changes, one for
    // each date
    $this->assertCount(7, $balanceChanges);
  }

  public function testCreateAlsoCreateTheLeaveRequestBalanceChangesForLeaveInHours() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    // a 5 days leave request, from monday to sunday
    $absenceType = AbsenceTypeFabricator::fabricate(['calculation_unit' => 2]);
    $leaveRequest = $this->getleaveRequestService()->create([
      'type_id' => $absenceType->id,
      'contact_id' => $this->leaveContact,
      'status_id' => 3,
      'from_date' => CRM_Utils_Date::processDate('2016-01-04 15:00'),
      'from_date_amount' => 1.5,
      'to_date' => CRM_Utils_Date::processDate('2016-01-08 16:45'),
      'to_date_amount' => 2.4,
      'request_type' => LeaveRequest::REQUEST_TYPE_LEAVE
    ], false);

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    // Since the 40 hours work pattern was used, and it this is a week long
    //i.e 5 working days. 1.5 + 2.4  = 3.9 hours for the first and end dates.
    //8x3 = 24hrs for the dates in between.
    //Total 24 + 3.9 = 27.9 hours
    $this->assertEquals(-27.9, $balance);

    $balanceChanges = LeaveBalanceChange::getBreakdownForLeaveRequest($leaveRequest);
    $this->assertCount(5, $balanceChanges);
  }

  public function testCreateAlsoCreatesTheBalanceChangesForTheLeaveDatesCorrectlyForLeaveInHours() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    // a 5 days leave request, from monday to friday
    $absenceType = AbsenceTypeFabricator::fabricate(['calculation_unit' => 2]);
    $leaveRequest = $this->getleaveRequestService()->create([
      'type_id' => $absenceType->id,
      'contact_id' => $this->leaveContact,
      'status_id' => 3,
      'from_date' => CRM_Utils_Date::processDate('2016-01-04 15:00'),
      'from_date_amount' => 1.5,
      'to_date' => CRM_Utils_Date::processDate('2016-01-08 16:45'),
      'to_date_amount' => 2.4,
      'request_type' => LeaveRequest::REQUEST_TYPE_LEAVE
    ], false);

    $amountInHours = 8.0;
    $expectedBreakdown = $this->getExpectedBreakdownForLeaveRequest($leaveRequest, $amountInHours);
    $expectedBreakdown[0]['amount'] = -1.5; //amount deducted for first date
    $expectedBreakdown[4]['amount'] = -2.4; //amount deducted for last date
    $breakdown = $this->getLeaveRequestService()->getBreakdown($leaveRequest->id);

    $this->assertEquals($expectedBreakdown, $breakdown);
  }

  public function testCreateAlsoCreateTheLeaveRequestBalanceChangesProperlyForLeaveInHoursWhenWhenEndDateIsNotWorkingDate() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    // a 6 days leave request, from monday to saturday
    $absenceType = AbsenceTypeFabricator::fabricate(['calculation_unit' => 2]);
    $leaveRequest = $this->getleaveRequestService()->create([
      'type_id' => $absenceType->id,
      'contact_id' => $this->leaveContact,
      'status_id' => 3,
      'from_date' => CRM_Utils_Date::processDate('2016-01-04 15:00'),
      'from_date_amount' => 1.5,
      'to_date' => CRM_Utils_Date::processDate('2016-01-09 16:45'),
      'to_date_amount' => 2.4,
      'request_type' => LeaveRequest::REQUEST_TYPE_LEAVE
    ], false);

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    // Since the 40 hours work pattern was used, and it this is a week long
    //i.e 5 working days. 1.4 + 0  = 1.4 hours for the first and end dates(weekend).
    //8x4 = 32hrs for the dates in between.
    //Total 1.4 + 32 = 33.5 hours
    $this->assertEquals(-33.5, $balance);

    $balanceChanges = LeaveBalanceChange::getBreakdownForLeaveRequest($leaveRequest);
    //6 days leave request
    $this->assertCount(6, $balanceChanges);
  }

  public function testCreateDoesNotDuplicateLeaveBalanceChangesOnUpdate() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    // a 7 days leave request, from friday to thursday
    $params = [
      'type_id' => 1,
      'contact_id' => $this->leaveContact,
      'status_id' => 3,
      'from_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'from_date_type' => $this->getLeaveRequestDayTypes()['all_day']['value'],
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'to_date_type' => $this->getLeaveRequestDayTypes()['all_day']['value'],
      'request_type' => LeaveRequest::REQUEST_TYPE_LEAVE
    ];

    $leaveRequest = $this->getleaveRequestService()->create($params, false);

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    // Since the 40 hours work pattern was used, and it this is a week long
    // leave request, the balance will be 5 (for the 5 working days)
    $this->assertEquals(-5, $balance);

    $balanceChanges = LeaveBalanceChange::getBreakdownForLeaveRequest($leaveRequest);
    // Even though the balance is 5, we must have 7 balance changes, one for
    // each date
    $this->assertCount(7, $balanceChanges);

    // Increase the Leave Request period by 4 days (2 weekend + 2 working days)
    $params['id'] = $leaveRequest->id;
    $params['to_date'] = CRM_Utils_Date::processDate('2016-01-11');
    $this->getleaveRequestService()->create($params, false);

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    // 5 from before + 2 (from the 2 new working days)
    $this->assertEquals(-7, $balance);

    $balanceChanges = LeaveBalanceChange::getBreakdownForLeaveRequest($leaveRequest);
    // 7 from before + 4 from the new period
    $this->assertCount(11, $balanceChanges);
  }

  public function testDeleteSoftDeletesTheLeaveRequest() {
    $leaveRequestDateTypes = array_flip(LeaveRequest::buildOptions('from_date_type', 'validate'));

    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation([
      'type_id' => 1,
      'contact_id' => 1,
      'status_id' => 1,
      'from_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'from_date_type' => $leaveRequestDateTypes['all_day'],
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'to_date_type' => $leaveRequestDateTypes['all_day'],
    ], TRUE);

    $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->delete($leaveRequest->id);

    $leaveRequestRecord = new LeaveRequest();
    $leaveRequestRecord->id = $leaveRequest->id;
    $leaveRequestRecord->find(true);
    $this->assertEquals(1, $leaveRequestRecord->is_deleted);
  }

  public function testDeleteSoftDeletesAPublicHolidayLeaveRequest() {
    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2017-01-01'),
      'end_date' => CRM_Utils_Date::processDate('2017-12-31')
    ]);

    $publicHoliday = $this->instantiatePublicHoliday('2017-10-10');
    $publicHolidayLeaveRequest = PublicHolidayLeaveRequestFabricator::fabricate($this->leaveContact, $publicHoliday);
    $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->delete($publicHolidayLeaveRequest->id);

    $publicHolidayLeaveRequestRecord = new LeaveRequest();
    $publicHolidayLeaveRequestRecord->id = $publicHolidayLeaveRequest->id;
    $publicHolidayLeaveRequestRecord->find(true);
    $this->assertEquals(1, $publicHolidayLeaveRequestRecord->is_deleted);
  }

  public function testPublicHolidayLeaveRequestIsDeletedAndBalanceRecalculatedForOverlappingLeaveRequestDate() {
    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date' => CRM_Utils_Date::processDate('2016-12-31')
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => 1]);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = CRM_Utils_Date::processDate('2016-10-10');

    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation([
      'from_date' => CRM_Utils_Date::processDate($publicHoliday->date),
      'to_date' => CRM_Utils_Date::processDate($publicHoliday->date),
      'contact_id' => $this->leaveContact,
      'type_id' => 1,
      'status_id' => 1
    ], TRUE);

    $this->assertEquals(-1, LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest));

    PublicHolidayLeaveRequestFabricator::fabricate($this->leaveContact, $publicHoliday);
    $publicHolidayLeaveRequest = LeaveRequest::findPublicHolidayLeaveRequest($this->leaveContact, $publicHoliday);

    //Balance change for Leave request will be zero since a public holiday leave request is created
    //for same date.
    $this->assertEquals(0, LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest));

    $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->delete($publicHolidayLeaveRequest->id);

    //After deletion the public holiday leave request is no longer present and the leave request balance
    //change is back to what it was before the public holiday leave request was created.
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($this->leaveContact, $publicHoliday));
    $this->assertEquals(-1, LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest));
  }

  /**
   * @expectedException RuntimeException
   * @expectedExceptionMessage You are not allowed to create or update a leave request for this employee
   */
  public function testCreateThrowsAnExceptionWhenCurrentUserDoesNotHaveCreateAndUpdateLeaveRequestPermission() {
    //logged in user has no permissions, also a contactID different from that of the logged in user is passed
    $contactID = 2;
    $params  = $this->getDefaultParams(['contact_id' => $contactID]);
    $this->getleaveRequestService()->create($params, false);
  }

  /**
   * @expectedException RuntimeException
   * @expectedExceptionMessage You can't create a Leave Request with this status
   */
  public function testCreateThrowsAnExceptionWhenTransitionStatusIsNotValidForNewLeaveRequest() {
    $this->getLeaveRequestServiceWhenStatusTransitionIsNotAllowed()->create($this->getDefaultParams(), false);
  }

  public function testCreateThrowsAnExceptionWhenTransitionStatusIsNotValidWhenUpdatingLeaveRequestStatus() {
    $params = $this->getDefaultParams();
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);
    $leaveRequestStatuses = LeaveRequest::getStatuses();

    $this->setExpectedException(
      'RuntimeException',
      'You can\'t change the Leave Request status from "Approved" to "Awaiting Approval"'
    );

    $params['id'] = $leaveRequest->id;
    $params['status_id'] = $leaveRequestStatuses['awaiting_approval'];

    $this->getLeaveRequestServiceWhenStatusTransitionIsNotAllowed()->create($params, false);
  }

  public function testCreateThrowsAnExceptionWhenAttemptingToApproveOwnLeaveRequest() {
    $params = $this->getDefaultParams();
    $leaveRequestStatuses = LeaveRequest::getStatuses();

    $params['status_id'] = $leaveRequestStatuses['awaiting_approval'];

    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    $this->setExpectedException(
      'RuntimeException', "You can't approve your own leave requests");

    $params['id'] = $leaveRequest->id;
    $params['status_id'] = $leaveRequestStatuses['approved'];

    $this->getLeaveRequestServiceWhenStatusTransitionIsNotAllowed()->create($params, false);
  }

  /**
   * @expectedException RuntimeException
   * @expectedExceptionMessage You are not allowed to change the request dates
   */
  public function testCreateThrowsAnExceptionWhenLeaveApproverUpdatesDatesForLeaveRequest() {
    $contactID = 5;
    $params = $this->getDefaultParams(['contact_id' => $contactID]);
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    $params['from_date'] = CRM_Utils_Date::processDate('2016-01-10');
    $params['to_date'] = CRM_Utils_Date::processDate('2016-01-15');
    $params['id'] = $leaveRequest->id;

    $this->getLeaveRequestServiceWhenCurrentUserIsLeaveManager()->create($params, false);
  }

  public function testCreateDoesNotThrowAnExceptionWhenAdminUpdatesDatesForLeaveRequest() {
    $params = $this->getDefaultParams(['status_id' => 2]);

    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    $toDate = new DateTime($params['to_date']);
    $params['to_date'] = $toDate->modify('+10 days')->format('YmdHis');
    $params['id'] = $leaveRequest->id;

    $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create($params, false);
    $this->assertNotNull($leaveRequest->id);
  }

  /**
   * @dataProvider openLeaveRequestStatusesDataProvider
   */
  public function testCreateDoesNotThrowAnExceptionWhenLeaveManagerUpdatesDatesForAnOpenSicknessRequest($status) {
    $params = $this->getDefaultParams([
      'contact_id' => 5,
      'status_id' => $status,
      'request_type' => LeaveRequest::REQUEST_TYPE_SICKNESS
    ]);

    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    $toDate = new DateTime($params['to_date']);
    $params['to_date'] = $toDate->modify('+10 days')->format('YmdHis');
    $params['id'] = $leaveRequest->id;

    $this->getLeaveRequestServiceWhenCurrentUserIsLeaveManager()->create($params, false);
  }

  /**
   * @dataProvider openLeaveRequestStatusesDataProvider
   */
  public function testCreateDoesNotThrowAnExceptionWhenAdminUpdatesDatesForAnOpenSicknessRequest($status) {
    $params = $this->getDefaultParams([
      'contact_id' => 5,
      'status_id' => $status,
      'request_type' => LeaveRequest::REQUEST_TYPE_SICKNESS
    ]);

    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    $toDate = new DateTime($params['to_date']);
    $params['to_date'] = $toDate->modify('+10 days')->format('YmdHis');
    $params['id'] = $leaveRequest->id;

    $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create($params, false);
  }

  /**
   * @dataProvider closedLeaveRequestStatusesDataProvider
   *
   * @expectedException RuntimeException
   * @expectedExceptionMessage You are not allowed to change the request dates
   */
  public function testCreateThrowsAnExceptionWhenLeaveContactUpdatesDatesForAClosedSicknessRequest($status) {
    $params = $this->getDefaultParams([
      'status_id' => $status,
      'request_type' => LeaveRequest::REQUEST_TYPE_SICKNESS
    ]);

    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    $toDate = new DateTime($params['to_date']);
    $params['to_date'] = $toDate->modify('+10 days')->format('YmdHis');
    $params['id'] = $leaveRequest->id;

    $this->getLeaveRequestService()->create($params, false);
  }

  /**
   * @expectedException RuntimeException
   * @expectedExceptionMessage You are not allowed to change the type of a request
   */
  public function testCreateThrowsAnExceptionWhenLeaveApproverUpdatesAbsenceTypeForLeaveRequest() {
    $contactID = 5;
    $params = $this->getDefaultParams(['contact_id' => $contactID]);
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    $params['id'] = $leaveRequest->id;
    $params['type_id'] = 2;

    $this->getLeaveRequestServiceWhenCurrentUserIsLeaveManager()->create($params, false);
  }

  /**
   * @expectedException RuntimeException
   * @expectedExceptionMessage You are not allowed to change the type of a request
   */
  public function testCreateThrowsAnExceptionWhenAdminUpdatesAbsenceTypeForLeaveRequest() {
    $contactID = 5;
    $params = $this->getDefaultParams(['contact_id' => $contactID]);
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    $params['id'] = $leaveRequest->id;
    $params['type_id'] = 2;

    $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create($params, false);
  }

  /**
   * @expectedException RuntimeException
   * @expectedExceptionMessage You are not allowed to delete a leave request for this employee
   */
  public function testDeleteThrowsAnExceptionWhenLeaveApproverTriesToDeleteALeaveRequest() {
    $contactID = 5;
    $params = $this->getDefaultParams(['contact_id' => $contactID]);
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);
    $this->getLeaveRequestServiceWhenCurrentUserIsLeaveManager()->delete($leaveRequest->id);
  }

  /**
   * @expectedException RuntimeException
   * @expectedExceptionMessage You are not allowed to delete a leave request for this employee
   */
  public function testDeleteThrowsAnExceptionWhenLeaveContactTriesToDeleteALeaveRequest() {
    $params = $this->getDefaultParams();
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);
    $this->getLeaveRequestService()->delete($leaveRequest->id);
  }

  private function getLeaveRequestService($isAdmin = false, $isManager = false, $allowStatusTransition = true, $mockBalanceChangeService = false) {
    $leaveManagerService = $this->createLeaveManagerServiceMock($isAdmin, $isManager);
    $leaveRequestStatusMatrixService = $this->createLeaveRequestStatusMatrixServiceMock($allowStatusTransition);
    $leaveRequestRightsService = new LeaveRequestRightsService($leaveManagerService);
    $leaveBalanceChangeService = $this->leaveBalanceChangeService;

    if($mockBalanceChangeService) {
      $leaveBalanceChangeService = $this->createLeaveBalanceChangeServiceMock();
    }

    return new LeaveRequestService(
      $leaveBalanceChangeService,
      $leaveRequestStatusMatrixService,
      $leaveRequestRightsService
    );
  }

  public function testLeaveRequestServiceCallsRecalculateExpiredBalanceChangesForLeaveRequestPastDatesMethodWhenALeaveRequestHasPastDates() {
    $params = $this->getDefaultParams([
      'from_date' => CRM_Utils_Date::processDate('-2 days'),
      'to_date' => CRM_Utils_Date::processDate('+1 day'),
      'status' => 1
    ]);

    $this->getLeaveRequestServiceWhenCurrentUserIsAdminWithBalanceChangeServiceMock()->create($params, false);
  }

  private function getLeaveRequestServiceWhenStatusTransitionIsNotAllowed() {
    return $this->getLeaveRequestService(false, false, false);
  }

  private function getLeaveRequestServiceWhenCurrentUserIsAdmin() {
    return $this->getLeaveRequestService(true, false);
  }

  private function getLeaveRequestServiceWhenCurrentUserIsLeaveManager() {
    return $this->getLeaveRequestService(false, true);
  }

  private function getLeaveRequestServiceWhenCurrentUserIsAdminWithBalanceChangeServiceMock() {
    return $this->getLeaveRequestService(true, false, true, true);
  }
  private function getDefaultParams($params = []) {
    $absenceType = AbsenceTypeFabricator::fabricate();
    $defaultParams =  [
      'type_id' => $absenceType->id,
      'contact_id' => $this->leaveContact,
      'status_id' => 1,
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'from_date_type' => $this->getLeaveRequestDayTypes()['all_day']['value'],
      'to_date' => CRM_Utils_Date::processDate('2016-01-10'),
      'to_date_type' => $this->getLeaveRequestDayTypes()['all_day']['value'],
      'request_type' => LeaveRequest::REQUEST_TYPE_LEAVE
    ];
    return array_merge($defaultParams, $params);
  }

  public function testBalanceChangeIsUpdatedForAnExistingLeaveRequestWhenChangeBalanceParameterIsTrueAndDatesDidNotChange() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    //Leave dates on Monday to Friday, all working days
    $leaveDates = [
      'from_date' => CRM_Utils_Date::processDate('2016-02-08'),
      'to_date' => CRM_Utils_Date::processDate('2016-02-12')
    ];

    $params = $this->getDefaultParams($leaveDates);
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the leave request
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    $this->assertEquals(-5, $previousBalance);

    //Add a work pattern for the contact with effective date before the leave dates
    $workPattern1 = WorkPatternFabricator::fabricateWithTwoWeeksAnd31AndHalfHours();
    ContactWorkPatternFabricator::fabricate([
      'contact_id' => $this->leaveContact,
      'pattern_id' => $workPattern1->id,
      'effective_date' => CRM_Utils_Date::processDate('2016-02-01')
    ]);

    //If the leave request is to be updated with new balance change, the balance would have changed.
    $result = LeaveRequest::calculateBalanceChange($this->leaveContact,
      new DateTime($params['from_date']),
      new DateTime($params['to_date']),
      $params['type_id'],
      $params['from_date_type'],
      $params['to_date_type']
    );

    $newBalance = $result['amount'];

    //The balance for leave request has changed since the contact work pattern has
    //been changed for the date range that the leave was initially requested.
    $this->assertNotEquals($previousBalance, $newBalance);

    //update leave request and request a change in balance to the new balance
    $params['id'] = $leaveRequest->id;
    $params['change_balance'] = 1;

    $leaveRequest = $this->getleaveRequestService()->create(
      $params,
      false
    );

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    $this->assertEquals($newBalance, $balance);
  }

  public function testBalanceChangeIsNotUpdatedForAnExistingLeaveRequestWhenChangeBalanceParameterIsFalseAndDatesDidNotChange() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    //Leave dates on Monday to Friday, all working days
    $leaveDates = [
      'from_date' => CRM_Utils_Date::processDate('2016-02-08'),
      'to_date' => CRM_Utils_Date::processDate('2016-02-12')
    ];

    $params = $this->getDefaultParams($leaveDates);
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the leave request
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    $this->assertEquals(-5, $previousBalance);

    //Add a work pattern for the contact with effective date before the leave dates
    $workPattern1 = WorkPatternFabricator::fabricateWithTwoWeeksAnd31AndHalfHours();
    ContactWorkPatternFabricator::fabricate([
      'contact_id' => $this->leaveContact,
      'pattern_id' => $workPattern1->id,
      'effective_date' => CRM_Utils_Date::processDate('2016-02-01')
    ]);

    //If the leave request is to be updated with new balance change, the balance would have changed.
    $result = LeaveRequest::calculateBalanceChange($this->leaveContact,
      new DateTime($params['from_date']),
      new DateTime($params['to_date']),
      $params['type_id'],
      $params['from_date_type'],
      $params['to_date_type']
    );
    $newBalance = $result['amount'];

    //The balance for leave request has changed since the contact work pattern has
    //been changed for the date range that the leave was initially requested.
    $this->assertNotEquals($previousBalance, $newBalance);

    //update leave request and request that the previous balance be retained
    //even though the balance has changed
    $params['id'] = $leaveRequest->id;
    $params['change_balance'] = 0;

    $leaveRequest = $this->getleaveRequestService()->create(
      $params,
      false
    );

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    $this->assertEquals($previousBalance, $balance);
  }

  public function testBalanceChangeIsUpdatedForAnExistingLeaveRequestWhenChangeBalanceParameterIsTrueAndDatesChanged() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    //Leave dates on Monday to Friday, all working days
    $leaveDates = [
      'from_date' => CRM_Utils_Date::processDate('2016-02-08'),
      'to_date' => CRM_Utils_Date::processDate('2016-02-12')
    ];

    $params = $this->getDefaultParams($leaveDates);
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the leave request
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    $this->assertEquals(-5, $previousBalance);

    //Add a work pattern for the contact with effective date before the leave dates
    $workPattern1 = WorkPatternFabricator::fabricateWithTwoWeeksAnd31AndHalfHours();
    ContactWorkPatternFabricator::fabricate([
      'contact_id' => $this->leaveContact,
      'pattern_id' => $workPattern1->id,
      'effective_date' => CRM_Utils_Date::processDate('2016-02-01')
    ]);

    //If the leave request is to be updated with new balance change, the balance would have changed.
    $result = LeaveRequest::calculateBalanceChange($this->leaveContact,
      new DateTime($params['from_date']),
      new DateTime($params['to_date']),
      $params['type_id'],
      $params['from_date_type'],
      $params['to_date_type']
    );

    $newBalance = $result['amount'];

    //The balance for leave request has changed since the contact work pattern has
    //been changed for the date range that the leave was initially requested.
    $this->assertNotEquals($previousBalance, $newBalance);

    //update leave request date and request a change in balance to the new balance
    $params['id'] = $leaveRequest->id;
    $params['change_balance'] = 1;
    $params['to_date'] = CRM_Utils_Date::processDate('2016-02-15');

    //The expected balance change after changing the dates.
    $result = LeaveRequest::calculateBalanceChange($this->leaveContact,
      new DateTime($params['from_date']),
      new DateTime($params['to_date']),
      $params['type_id'],
      $params['from_date_type'],
      $params['to_date_type']
    );
    $balanceAfterDateChange = $result['amount'];

    $leaveRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create(
      $params,
      false
    );

    //The leave request balance has been updated to pick from the current work pattern
    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    $this->assertEquals($balanceAfterDateChange, $balance);
  }

  public function testBalanceChangeIsUpdatedForAnExistingLeaveRequestWhenChangeBalanceParameterIsFalseAndDatesChanged() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    //Leave dates on Monday to Friday, all working days
    $leaveDates = [
      'from_date' => CRM_Utils_Date::processDate('2016-02-08'),
      'to_date' => CRM_Utils_Date::processDate('2016-02-12')
    ];

    $params = $this->getDefaultParams($leaveDates);
    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the leave request
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    $this->assertEquals(-5, $previousBalance);

    //Add a work pattern for the contact with effective date before the leave dates
    $workPattern1 = WorkPatternFabricator::fabricateWithTwoWeeksAnd31AndHalfHours();
    ContactWorkPatternFabricator::fabricate([
      'contact_id' => $this->leaveContact,
      'pattern_id' => $workPattern1->id,
      'effective_date' => CRM_Utils_Date::processDate('2016-02-01')
    ]);

    //If the leave request is to be updated with new balance change, the balance would have changed.
    $result = LeaveRequest::calculateBalanceChange($this->leaveContact,
      new DateTime($params['from_date']),
      new DateTime($params['to_date']),
      $params['type_id'],
      $params['from_date_type'],
      $params['to_date_type']
    );

    $newBalance = $result['amount'];

    //The balance for leave request has changed since the contact work pattern has
    //been changed for the date range that the leave was initially requested.
    $this->assertNotEquals($previousBalance, $newBalance);

    //update leave request date and request the old balance to be retained
    $params['id'] = $leaveRequest->id;
    $params['change_balance'] = 0;
    $params['to_date'] = CRM_Utils_Date::processDate('2016-02-15');

    //The expected balance change after changing the dates.
    $result = LeaveRequest::calculateBalanceChange($this->leaveContact,
      new DateTime($params['from_date']),
      new DateTime($params['to_date']),
      $params['type_id'],
      $params['from_date_type'],
      $params['to_date_type']
    );
    $balanceAfterDateChange = $result['amount'];

    $leaveRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create(
      $params,
      false
    );

    //The leave request balance has been updated to pick from the current work pattern
    //even though the old balance was asked to be retained.
    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest);
    $this->assertEquals($balanceAfterDateChange, $balance);
  }

  public function testBalanceIsUpdatedForExistingToilWhenChangeBalanceIsFalseAndToilToAccrueChangedAndDatesDidNotChange() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    $toilToAccrue1 = 1;
    $toilParams = [
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => $toilToAccrue1
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the toil
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $previousBalance);

    //update toil request and change the toil_to_accrue
    $toilToAccrue2 = 2;
    $params['id'] = $toilRequest->id;
    $params['change_balance'] = 0;
    $params['toil_to_accrue'] = $toilToAccrue2;

    $toilRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create(
      $params,
      false
    );

    //Balance change is updated for the TOIL
    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue2, $balance);
  }

  public function testBalanceIsUpdatedForExistingToilWhenChangeBalanceIsTrueAndToilToAccrueChangedAndDatesDidNotChange() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    $toilToAccrue1 = 1;
    $toilParams = [
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => $toilToAccrue1
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the toil
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $previousBalance);

    //update toil request and change the toil_to_accrue
    $toilToAccrue2 = 2;
    $params['id'] = $toilRequest->id;
    $params['change_balance'] = 1;
    $params['toil_to_accrue'] = $toilToAccrue2;

    $toilRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create(
      $params,
      false
    );

    //Balance change is updated for the TOIL
    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue2, $balance);
  }

  public function testBalanceRemainsSameButDatesAreUpdatedForToilWhenChangeBalanceIsTrueAndToilToAccrueNotChangedAndDatesChanged() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    $toilToAccrue1 = 1;
    $toilParams = [
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => $toilToAccrue1
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the toil
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $previousBalance);
    //4 days 2016-01-04 to 2016-01-07
    $this->assertCount(4, $toilRequest->getDates());

    //Update toil request and change the dates.
    //Balance will not change since TOIl balance is determined by
    //The toil_to_accrue parameter and not the dates of the request
    //Although the dates will change.
    $params['id'] = $toilRequest->id;
    $params['change_balance'] = 1;
    $params['from_date'] = CRM_Utils_Date::processDate('2016-01-04');
    $params['to_date'] = CRM_Utils_Date::processDate('2016-01-10');

    $toilRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create(
      $params,
      false
    );

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $balance);

    //7 days 2016-01-04 to 2016-01-10
    $this->assertCount(7, $toilRequest->getDates());
  }

  public function testBalanceRemainsSameButDatesAreUpdatedForToilWhenChangeBalanceIsFalseAndToilToAccrueNotChangedAndDatesChanged() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    $toilToAccrue1 = 1;
    $toilParams = [
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => $toilToAccrue1
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the toil
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $previousBalance);
    //4 days 2016-01-04 to 2016-01-07
    $this->assertCount(4, $toilRequest->getDates());

    //Update toil request and change the dates.
    //Balance will not change since TOIl balance is determined by
    //The toil_to_accrue parameter and not the dates of the request
    //Although the dates will change.
    $params['id'] = $toilRequest->id;
    $params['change_balance'] = 0;
    $params['from_date'] = CRM_Utils_Date::processDate('2016-01-04');
    $params['to_date'] = CRM_Utils_Date::processDate('2016-01-10');

    $toilRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create(
      $params,
      false
    );

    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $balance);

    //7 days 2016-01-04 to 2016-01-10
    $this->assertCount(7, $toilRequest->getDates());
  }

  public function testBalanceAndDatesNotUpdatedForExistingToilWhenChangeBalanceIsFalseAndToilToAccrueAndDatesDidNotChange() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    $toilToAccrue1 = 1;
    $toilParams = [
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => $toilToAccrue1
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the toil
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $previousBalance);
    $dates1 = CRM_Utils_Array::collect('id', $toilRequest->getDates());

    $params['id'] = $toilRequest->id;
    $params['change_balance'] = 0;

    $toilRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create(
      $params,
      false
    );

    //Both the dates and balance changes remain the same.
    $dates2 = CRM_Utils_Array::collect('id', $toilRequest->getDates());
    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $balance);

    $this->assertEquals($dates1, $dates2);
  }

  public function testBalanceAndDatesRemainsSameForExistingToilWhenChangeBalanceIsTrueAndToilToAccrueAndDatesDidNotChange() {
    HRJobContractFabricator::fabricate(
      ['contact_id' => $this->leaveContact],
      ['period_start_date' => '2016-01-01']
    );

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => true]);

    $toilToAccrue1 = 1;
    $toilParams = [
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => $toilToAccrue1
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params, true);

    //Just to make sure that we have the expected balance change for the toil
    $previousBalance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $previousBalance);
    $dates1 = CRM_Utils_Array::collect('id', $toilRequest->getDates());

    $params['id'] = $toilRequest->id;
    $params['change_balance'] = 1;

    $toilRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create(
      $params,
      false
    );

    //Both the dates and balance changes remain the same.
    //The balance change is also same amount
    $dates2 = CRM_Utils_Array::collect('id', $toilRequest->getDates());
    $balance = LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($toilRequest);
    $this->assertEquals($toilToAccrue1, $balance);

    $this->assertEquals($dates1, $dates2);
  }

  public function testGetBreakdownIncludeOnlyTheLeaveBalanceChangesOfTheLeaveRequestDates() {
    $leaveRequest1 = LeaveRequestFabricator::fabricateWithoutValidation([
      'contact_id' => 1,
      'type_id' => 1,
      'from_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'to_date' =>  CRM_Utils_Date::processDate('2016-01-02'),
    ], true);

    $leaveRequest2 = LeaveRequestFabricator::fabricateWithoutValidation([
      'contact_id' => 1,
      'type_id' => 1,
      'from_date' => CRM_Utils_Date::processDate('2016-01-03'),
      'to_date' =>  CRM_Utils_Date::processDate('2016-01-03'),
    ], true);

    $expectedBreakdown = $this->getExpectedBreakdownForLeaveRequest($leaveRequest1);
    $breakdown = $this->getLeaveRequestService()->getBreakdown($leaveRequest1->id);
    $this->assertEquals($expectedBreakdown, $breakdown);

    $expectedBreakdown = $this->getExpectedBreakdownForLeaveRequest($leaveRequest2);
    $breakdown = $this->getLeaveRequestService()->getBreakdown($leaveRequest2->id);
    $this->assertEquals($expectedBreakdown, $breakdown);
  }

  public function testToilRequestWithPastDatesCanNotBeCancelledWhenUserIsLeaveContactAndAbsenceTypeDoesNotAllowPastAccrual() {
    $absenceType = AbsenceTypeFabricator::fabricate([
      'allow_accruals_request' => true,
      'allow_accrue_in_the_past' => false
    ]);

    $leaveStatuses = LeaveRequest::getStatuses();
    $toilParams = [
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => 1,
      'type_id' => $absenceType->id,
      'status_id' => $leaveStatuses['approved']
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    //Update the toil status to cancelled.
    $params['status_id'] = $leaveStatuses['cancelled'];
    $params['id'] = $toilRequest->id;

    $this->setExpectedException('RuntimeException', 'You may only cancel TOIL with dates in the future.');
    $this->getLeaveRequestService()->create($params, false);
  }

  public function testToilRequestWithPastDatesCanBeCancelledWhenUserIsAdminAndAbsenceTypeDoesNotAllowPastAccrual() {
    $absenceType = AbsenceTypeFabricator::fabricate([
      'allow_accruals_request' => true,
      'allow_accrue_in_the_past' => false
    ]);

    $leaveStatuses = LeaveRequest::getStatuses();
    $toilParams = [
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => 1,
      'type_id' => $absenceType->id,
      'status_id' => $leaveStatuses['approved']
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    //Update the toil status to cancelled.
    $params['status_id'] = $leaveStatuses['cancelled'];
    $params['id'] = $toilRequest->id;

    $toilRequest = $this->getLeaveRequestServiceWhenCurrentUserIsAdmin()->create($params, false);

    $this->assertNotNull($toilRequest->id);
    $this->assertEquals($toilRequest->status_id, $leaveStatuses['cancelled']);
  }

  public function testToilRequestWithPastDatesCanBeCancelledWhenUserIsManagerAndAbsenceTypeDoesNotAllowPastAccrual() {
    $absenceType = AbsenceTypeFabricator::fabricate([
      'allow_accruals_request' => true,
      'allow_accrue_in_the_past' => false
    ]);

    $leaveStatuses = LeaveRequest::getStatuses();
    $toilParams = [
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => 1,
      'type_id' => $absenceType->id,
      'status_id' => $leaveStatuses['approved']
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    //Update the toil status to cancelled.
    $params['status_id'] = $leaveStatuses['cancelled'];
    $params['id'] = $toilRequest->id;

    $toilRequest = $this->getLeaveRequestServiceWhenCurrentUserIsLeaveManager()->create(
      $params,
      false
    );

    $this->assertNotNull($toilRequest->id);
    $this->assertEquals($toilRequest->status_id, $leaveStatuses['cancelled']);
  }

  public function testToilRequestWithPastDatesCanBeCancelledWhenAbsenceTypeAllowsPastAccrual() {
    $absenceType = AbsenceTypeFabricator::fabricate([
      'allow_accruals_request' => true,
      'allow_accrue_in_the_past' => true
    ]);

    $leaveStatuses = LeaveRequest::getStatuses();
    $toilParams = [
      'from_date' => CRM_Utils_Date::processDate('2016-01-04'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-07'),
      'request_type' => LeaveRequest::REQUEST_TYPE_TOIL,
      'toil_to_accrue' => 1,
      'type_id' => $absenceType->id,
      'status_id' => $leaveStatuses['approved']
    ];

    $params = $this->getDefaultParams($toilParams);
    $toilRequest = LeaveRequestFabricator::fabricateWithoutValidation($params);

    //Update the toil status to cancelled.
    $params['status_id'] = $leaveStatuses['cancelled'];
    $params['id'] = $toilRequest->id;

    $toilRequest = $this->getLeaveRequestService()->create(
      $params,
      false
    );

    $this->assertNotNull($toilRequest->id);
    $this->assertEquals($toilRequest->status_id, $leaveStatuses['cancelled']);
  }

  private function getExpectedBreakdownForLeaveRequest(LeaveRequest $leaveRequest, $amount = false) {
    $leaveRequestDayTypes = LeaveRequest::buildOptions('from_date_type');

    $dates = $leaveRequest->getDates();
    $expectedBreakdown = [];
    foreach($dates as $date) {
      $expectedBreakdown[] = [
        'id' => $date->id,
        'date' => date('Y-m-d', strtotime($date->date)),
        'type' => $date->type,
        'label' => $leaveRequestDayTypes[$date->type],
        'amount' => $amount ? $amount * -1 : -1
      ];
    }

    return $expectedBreakdown;
  }
}
