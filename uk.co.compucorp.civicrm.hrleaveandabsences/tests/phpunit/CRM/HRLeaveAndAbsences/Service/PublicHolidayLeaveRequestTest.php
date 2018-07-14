<?php

use CRM_HRCore_Test_Fabricator_Contact as ContactFabricator;
use CRM_Hrjobcontract_Test_Fabricator_HRJobContract as HRJobContractFabricator;
use CRM_HRLeaveAndAbsences_BAO_AbsenceType as AbsenceType;
use CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange as LeaveBalanceChange;
use CRM_HRLeaveAndAbsences_BAO_LeaveRequest as LeaveRequest;
use CRM_HRLeaveAndAbsences_BAO_PublicHoliday as PublicHoliday;
use CRM_HRLeaveAndAbsences_Test_Fabricator_AbsenceType as AbsenceTypeFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_PublicHoliday as PublicHolidayFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_WorkPattern as WorkPatternFabricator;
use CRM_HRLeaveAndAbsences_Service_PublicHolidayLeaveRequest as PublicHolidayLeaveRequestService;
use CRM_HRLeaveAndAbsences_Service_PublicHolidayLeaveRequestCreation as PublicHolidayLeaveRequestCreation;
use CRM_HRLeaveAndAbsences_Service_PublicHolidayLeaveRequestDeletion as PublicHolidayLeaveRequestDeletion;
use CRM_HRLeaveAndAbsences_Test_Fabricator_AbsencePeriod as AbsencePeriodFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_LeavePeriodEntitlement as LeavePeriodEntitlementFabricator;

/**
* Class CRM_HRLeaveAndAbsences_Service_PublicHolidayLeaveRequestTest
*
* @group headless
*/
class CRM_HRLeaveAndAbsences_Service_PublicHolidayLeaveRequestTest extends BaseHeadlessTest {

  use CRM_HRLeaveAndAbsences_LeaveBalanceChangeHelpersTrait;

  /**
   * @var CRM_HRLeaveAndAbsences_BAO_AbsenceType
   */
  private $absenceType;

  public function setUp() {
    // We delete everything two avoid problems with the default absence types
    // created during the extension installation
    $tableName = AbsenceType::getTableName();
    CRM_Core_DAO::executeQuery("DELETE FROM {$tableName}");

    $this->absenceType = AbsenceTypeFabricator::fabricate([
      'must_take_public_holiday_as_leave' => 1
    ]);
  }

  public function testUpdateAllLeaveRequestsInTheFuture() {
    $deletionLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestDeletion::class)
                              ->disableOriginalConstructor()
                              ->setMethods(['deleteAllInTheFuture'])
                              ->getMock();

    $deletionLogicMock->expects($this->once())
                      ->method('deleteAllInTheFuture');

    $creationLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestCreation::class)
                              ->disableOriginalConstructor()
                              ->setMethods(['createAllInTheFuture'])
                              ->getMock();

    $creationLogicMock->expects($this->once())
                      ->method('createAllInTheFuture');

    $service = new PublicHolidayLeaveRequestService($creationLogicMock, $deletionLogicMock);
    $service->updateAllInTheFuture();
  }

  public function testUpdateAllPublicHolidayLeaveRequestsInAbsencePeriod() {
    $deletionLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestDeletion::class)
      ->disableOriginalConstructor()
      ->setMethods(['deleteAllForAbsencePeriod'])
      ->getMock();

    $deletionLogicMock->expects($this->once())
      ->method('deleteAllForAbsencePeriod');

    $creationLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestCreation::class)
      ->disableOriginalConstructor()
      ->setMethods(['createAllForAbsencePeriod'])
      ->getMock();

    $creationLogicMock->expects($this->once())
      ->method('createAllForAbsencePeriod');

    $service = new PublicHolidayLeaveRequestService($creationLogicMock, $deletionLogicMock);
    $absencePeriod = AbsencePeriodFabricator::fabricate();
    $service->updateAllForAbsencePeriod($absencePeriod->id);
  }

  public function testUpdateAllPublicHolidayLeaveRequests() {
    $deletionLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestDeletion::class)
      ->disableOriginalConstructor()
      ->setMethods(['deleteAllInTheFuture'])
      ->getMock();

    $deletionLogicMock->expects($this->once())
      ->method('deleteAllInTheFuture');

    $creationLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestCreation::class)
      ->disableOriginalConstructor()
      ->setMethods(['createAll'])
      ->getMock();

    $creationLogicMock->expects($this->once())
      ->method('createAll');

    $service = new PublicHolidayLeaveRequestService($creationLogicMock, $deletionLogicMock);
    $service->updateAll();
  }

  public function testUpdateAllLeaveRequestsInTheFutureForWorkPatternContacts() {
    $workPatternID = 5;
    $deletionLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestDeletion::class)
                              ->disableOriginalConstructor()
                              ->setMethods(['deleteAllInTheFutureForWorkPatternContacts'])
                              ->getMock();

    $deletionLogicMock->expects($this->once())
                      ->method('deleteAllInTheFutureForWorkPatternContacts')
                      ->with($this->identicalTo($workPatternID));

    $creationLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestCreation::class)
                              ->disableOriginalConstructor()
                              ->setMethods(['createAllInFutureForWorkPatternContacts'])
                              ->getMock();

    $creationLogicMock->expects($this->once())
                      ->method('createAllInFutureForWorkPatternContacts')
                      ->with($this->identicalTo($workPatternID));

    $service = new PublicHolidayLeaveRequestService($creationLogicMock, $deletionLogicMock);
    $service->updateAllInTheFutureForWorkPatternContacts($workPatternID);
  }

  public function testUpdateAllForContract() {
    $contactID = 10;

    $deletionLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestDeletion::class)
                              ->disableOriginalConstructor()
                              ->setMethods(['deleteAllForContract'])
                              ->getMock();

    $deletionLogicMock->expects($this->once())
                      ->method('deleteAllForContract')
                      ->with($this->identicalTo($contactID));

    $creationLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestCreation::class)
                              ->disableOriginalConstructor()
                              ->setMethods(['createAllForContract'])
                              ->getMock();

    $creationLogicMock->expects($this->once())
                      ->method('createAllForContract')
                      ->with($this->identicalTo($contactID));

    $service = new PublicHolidayLeaveRequestService($creationLogicMock, $deletionLogicMock);
    $service->updateAllForContract($contactID);
  }

  /**
   * This is an integration test to check that the PublicHolidayLeaveRequest
   * service is used to update Public Holiday Leave Requests after a contract
   * (with details) is created.
   *
   * We use a hook to do this update, and there isn't really a way to check if
   * a hook gets called, so what we do here is check that there are no leave
   * requests before creating the contract and then checking that they were
   * created after the contract gets saved.
   */
  public function testItUpdateAllWhenTheContractDetailsAreCreated() {
    $period = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2017-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2017-08-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => 1]);
    //All the days selected for the public holidays are working days for the 40hr work week
    $datePublicHoliday1 = new DateTime('2017-06-12');
    $datePublicHoliday2 = new DateTime('2017-07-25');
    $datePublicHoliday3 = new DateTime('2017-08-18');

    PublicHolidayFabricator::fabricateWithoutValidation(['date' => $datePublicHoliday1->format('YmdHis')]);
    PublicHolidayFabricator::fabricateWithoutValidation(['date' => $datePublicHoliday2->format('YmdHis')]);
    PublicHolidayFabricator::fabricateWithoutValidation(['date' => $datePublicHoliday3->format('YmdHis')]);

    $contact = ContactFabricator::fabricate();

    $periodEntitlement = LeavePeriodEntitlementFabricator::fabricate([
      'type_id' => $this->absenceType->id,
      'contact_id' => $contact['id'],
      'period_id' => $period->id
    ]);

    $this->createLeaveBalanceChange($periodEntitlement->id, 1);

    $leaveRequest = new LeaveRequest();
    $leaveRequest->contact_id = $contact['id'];
    $leaveRequest->type_id = $this->absenceType->id;

    $this->assertNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday1));
    $this->assertNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday2));
    $this->assertNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday3));

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ],
    [
      'period_start_date' =>  CRM_Utils_Date::processDate('2017-07-01'),
    ]);

    // Nothing should be created for the first public holiday as its date is
    // before the contract start date
    $this->assertNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday1));
    $this->assertNotNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday2));
    $this->assertNotNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday3));
  }

  /**
   * This is an integration test to check that the PublicHolidayLeaveRequest
   * service is used to update Public Holiday Leave Requests after a contract
   * (with details) is updated.
   *
   * We use a hook to do this update, and there isn't really a way to check if
   * a hook gets called, so what we do here is check that there are no leave
   * requests before creating the contract and then checking that they were
   * created after the contract gets saved.
   */
  public function testItUpdateAllInTheFutureWhenTheContractDetailsAreUpdated() {
    $period = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2025-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2025-03-31'),
    ]);

    WorkPatternFabricator::fabricateWithA40HourWorkWeek(['is_default' => 1]);
    //All the days selected for the public holidays are working days for the 40hr work week
    $datePublicHoliday1 = new DateTime('2025-01-20');
    $datePublicHoliday2 = new DateTime('2025-02-27');

    PublicHolidayFabricator::fabricateWithoutValidation(['date' => $datePublicHoliday1->format('YmdHis')]);
    PublicHolidayFabricator::fabricateWithoutValidation(['date' => $datePublicHoliday2->format('YmdHis')]);

    $contact = ContactFabricator::fabricate();

    $periodEntitlement = LeavePeriodEntitlementFabricator::fabricate([
      'type_id' => $this->absenceType->id,
      'contact_id' => $contact['id'],
      'period_id' => $period->id
    ]);

    $this->createLeaveBalanceChange($periodEntitlement->id, 1);

    $leaveRequest = new LeaveRequest();
    $leaveRequest->contact_id = $contact['id'];
    $leaveRequest->type_id = $this->absenceType->id;

    $contract = HRJobContractFabricator::fabricate(
      [ 'contact_id' => $contact['id'] ],
      [ 'period_start_date' => CRM_Utils_Date::processDate('2025-01-10') ]
    );

    $this->assertNotNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday1));
    $this->assertNotNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday2));

    // Add a new Public holiday
    $datePublicHoliday3 = new DateTime('2025-03-18');
    PublicHolidayFabricator::fabricateWithoutValidation(['date' => $datePublicHoliday3->format('YmdHis')]);

    // Update the contract with an end date which will still overlap the
    // new public holiday
    civicrm_api3('HRJobDetails', 'create', [
      'jobcontract_id' => $contract['id'],
      'period_end_date' => CRM_Utils_Date::processDate('2025-03-28')
    ]);

    $this->assertNotNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday1));
    $this->assertNotNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday2));
    $this->assertNotNull(LeaveBalanceChange::getExistingBalanceChangeForALeaveRequestDate($leaveRequest, $datePublicHoliday3));
  }

  public function testCreateForAllContacts() {
    $publicHoliday = new PublicHoliday();
    $publicHoliday->id = 1;

    $deletionLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestDeletion::class)
                              ->disableOriginalConstructor()
                              ->getMock();

    $creationLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestCreation::class)
                              ->disableOriginalConstructor()
                              ->setMethods(['createForAllContacts'])
                              ->getMock();

    $creationLogicMock->expects($this->once())
                      ->method('createForAllContacts')
                      ->with($this->identicalTo($publicHoliday));

    $service = new PublicHolidayLeaveRequestService($creationLogicMock, $deletionLogicMock);
    $service->createForAllContacts($publicHoliday);
  }

  public function testDeleteForAllContacts() {
    $publicHoliday = new PublicHoliday();
    $publicHoliday->id = 1;

    $creationLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestCreation::class)
                              ->disableOriginalConstructor()
                              ->getMock();

    $deletionLogicMock = $this->getMockBuilder(PublicHolidayLeaveRequestDeletion::class)
                              ->disableOriginalConstructor()
                              ->setMethods(['deleteForAllContacts'])
                              ->getMock();

    $deletionLogicMock->expects($this->once())
                      ->method('deleteForAllContacts')
                      ->with($this->identicalTo($publicHoliday));

    $service = new PublicHolidayLeaveRequestService($creationLogicMock, $deletionLogicMock);
    $service->deleteForAllContacts($publicHoliday);
  }
}
