<?php

use CRM_HRLeaveAndAbsences_BAO_AbsenceType as AbsenceType;
use CRM_HRLeaveAndAbsences_BAO_PublicHoliday as PublicHoliday;
use CRM_HRLeaveAndAbsences_BAO_LeaveBalanceChange as LeaveBalanceChange;
use CRM_HRLeaveAndAbsences_BAO_LeaveRequest as LeaveRequest;
use CRM_HRLeaveAndAbsences_Service_JobContract as JobContractService;
use CRM_HRLeaveAndAbsences_Service_LeavePeriodEntitlement as LeavePeriodEntitlementService;
use CRM_HRLeaveAndAbsences_Service_PublicHolidayLeaveRequestCreation as PublicHolidayLeaveRequestCreation;
use CRM_HRCore_Test_Fabricator_Contact as ContactFabricator;
use CRM_Hrjobcontract_Test_Fabricator_HRJobContract as HRJobContractFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_AbsenceType as AbsenceTypeFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_LeaveRequest as LeaveRequestFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_PublicHoliday as PublicHolidayFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_ContactWorkPattern as ContactWorkPatternFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_WorkPattern as WorkPatternFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_AbsencePeriod as AbsencePeriodFabricator;
use CRM_HRLeaveAndAbsences_Test_Fabricator_LeavePeriodEntitlement as LeavePeriodEntitlementFabricator;

/**
 * Class CRM_HRLeaveAndAbsences_Service_PublicHolidayLeaveRequestCreationTest
 *
 * @group headless
 */
class CRM_HRLeaveAndAbsences_Service_PublicHolidayLeaveRequestCreationTest extends BaseHeadlessTest {

  use CRM_HRLeaveAndAbsences_LeavePeriodEntitlementHelpersTrait;
  use CRM_HRLeaveAndAbsences_LeaveBalanceChangeHelpersTrait;

  /**
   * @var CRM_HRLeaveAndAbsences_BAO_AbsenceType
   */
  private $absenceType;

  private $creationLogic;

  public function setUp() {
    // We delete everything two avoid problems with the default absence types
    // created during the extension installation
    $tableName = CRM_HRLeaveAndAbsences_BAO_AbsenceType::getTableName();
    CRM_Core_DAO::executeQuery("DELETE FROM {$tableName}");

    $this->absenceType = AbsenceTypeFabricator::fabricate([
      'must_take_public_holiday_as_leave' => 1
    ]);
  }

  public function testCanCreateAPublicHolidayLeaveRequestForASingleContact() {
    $absencePeriod = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('first day of this year'),
      'end_date' => CRM_Utils_Date::processDate('last day of this year')
    ]);

    $periodEntitlement = $this->createLeavePeriodEntitlementMockForBalanceTests();
    $periodEntitlement->contact_id = 2;
    $periodEntitlement->type_id = $this->absenceType->id;

    HRJobContractFabricator::fabricate(
      ['contact_id' => $periodEntitlement->contact_id],
      ['period_start_date' => $absencePeriod->start_date]
    );

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = CRM_Utils_Date::processDate('first monday of this year');

    $this->getCreationLogic()->createForContact($periodEntitlement->contact_id, $publicHoliday);

    $this->assertEquals(-1, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));
  }

  public function testItDoesNotCreateALeaveRequestIfTheresIsAlreadyALeaveRequestForTheGivenPublicHolidayAndContact() {
    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('first day of this year'),
      'end_date' => CRM_Utils_Date::processDate('last day of this year')
    ]);

    $periodEntitlement = $this->createLeavePeriodEntitlementMockForBalanceTests();
    $periodEntitlement->contact_id = 2;
    $periodEntitlement->type_id = $this->absenceType->id;

    $date = new DateTime('first monday of this year');
    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = $date->format('YmdHis');

    $this->getCreationLogic()->createForContact($periodEntitlement->contact_id, $publicHoliday);

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($periodEntitlement->contact_id, $date->format('Ymd')));

    $this->getCreationLogic()->createForContact($periodEntitlement->contact_id, $publicHoliday);

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($periodEntitlement->contact_id, $date->format('Ymd')));
  }

  public function testItUpdatesTheBalanceChangeForOverlappingLeaveRequestDayToZero() {
    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date' => CRM_Utils_Date::processDate('2016-12-31')
    ]);
    $contactID = 2;

    $leaveRequest = LeaveRequestFabricator::fabricateWithoutValidation([
      'contact_id' => $contactID,
      'type_id' => $this->absenceType->id,
      'from_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'to_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'to_date_type' => 1,
      'from_date_type' => 1,
      'status_id' => 1
    ], true);

    $this->assertEquals(-1, LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest));

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = CRM_Utils_Date::processDate('2016-01-01');

    $this->getCreationLogic()->createForContact($contactID, $publicHoliday);

    $this->assertEquals(0, LeaveBalanceChange::getTotalBalanceChangeForLeaveRequest($leaveRequest));
  }

  public function testCanCreatePublicHolidayLeaveRequestsForAllPublicHolidaysInTheFuture() {
    $contact = ContactFabricator::fabricate();

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    $periodEntitlement = $this->createLeavePeriodEntitlementMockForBalanceTests(
      new DateTime('2016-01-01'),
      new DateTime('+10 days')
    );
    $periodEntitlement->contact_id = $contact['id'];
    $periodEntitlement->type_id = $this->absenceType->id;

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ], [
      'period_start_date' => '2016-01-01',
    ]);

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-01-01')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('tomorrow')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+5 days')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contact['id']])->createAllInTheFuture();

    // It's -2 instead of -3 because the first public holiday is in the past
    // and we should not create a leave request for it
    $this->assertEquals(-2, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));
  }

  public function testItDoesNotDuplicateLeaveRequestsWhenCreatingLeaveRequestsForAllPublicHolidaysInTheFuture() {
    $contact = ContactFabricator::fabricate();

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ], [
      'period_start_date' => '2016-01-01',
    ]);

    $date = new DateTime('+5 days');
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' => $date->format('Ymd')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contact['id']])->createAllInTheFuture();

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact['id'], $date->format('Ymd')));

    $this->getCreationLogicWithEntitlementsMock([$contact['id']])->createAllInTheFuture();

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact['id'], $date->format('Ymd')));
  }

  public function testItDoesntCreateLeaveRequestsForAllPublicHolidaysInTheFutureIfThereIsNoMTPHLAbsenceTypes() {
    AbsenceType::del($this->absenceType->id);

    $contact = ContactFabricator::fabricate();

    $periodEntitlement = $this->createLeavePeriodEntitlementMockForBalanceTests(
      new DateTime()
    );
    $periodEntitlement->contact_id = $contact['id'];
    $periodEntitlement->type_id = $this->absenceType->id;

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('tomorrow')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contact['id']])->createAllInTheFuture();

    // The Balance is still 0 because no Leave Request was created
    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));
  }

  public function testItCreatesLeaveRequestsForAllPublicHolidaysOverlappingTheContractDates() {
    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('yesterday'),
      'end_date' => CRM_Utils_Date::processDate('+300 days')
    ]);

    $contact = ContactFabricator::fabricate(['first_name' => 'Contact 1']);

    $contract = HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ], [
      'period_start_date' =>  CRM_Utils_Date::processDate('yesterday'),
      'period_end_date' =>   CRM_Utils_Date::processDate('+100 days'),
    ]);

    $periodEntitlement = $this->createLeavePeriodEntitlementMockForBalanceTests(
      new DateTime('-10 days'),
      new DateTime('+200 days')
    );
    $periodEntitlement->contact_id = $contact['id'];
    $periodEntitlement->type_id = $this->absenceType->id;

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('yesterday')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+5 days')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+47 days')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+101 days')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contract['contact_id']])->createAllForContract($contract['id']);

    // The balance should be -3 because three leave requests were created:
    // The one for +5 days, one for + 47 days and the one for yesterday
    // The holiday for "+101 days" is in the future, but it doesn't overlap the contract dates and
    // and no leave request will be created for it as well
    $this->assertEquals(-3, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));
  }

  public function testItCreatesLeaveRequestsForAllPublicHolidaysInTheFutureOverlappingAContractWithNoEndDate() {
    $contact = ContactFabricator::fabricate(['first_name' => 'Contact 1']);

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('yesterday'),
      'end_date'   => CRM_Utils_Date::processDate('+332 days'),
    ]);

    $contract = HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ], [
      'period_start_date' =>  CRM_Utils_Date::processDate('yesterday'),
    ]);

    $periodEntitlement = $this->createLeavePeriodEntitlementMockForBalanceTests(
      new DateTime('-10 days'),
      new DateTime('+400 days')
    );
    $periodEntitlement->contact_id = $contact['id'];
    $periodEntitlement->type_id = $this->absenceType->id;

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+5 days')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+47 days')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+332 days')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contract['contact_id']])->createAllForContract($contract['id']);

    // Since there's no end date for the contract,
    // leave request will be created for all the public holidays in the
    // future
    $this->assertEquals(-3, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));
  }

  public function testItDoesntDuplicateLeaveRequestsWhenCreatingRequestsForAllPublicHolidaysOverlappingAContract() {
    $contact = ContactFabricator::fabricate(['first_name' => 'Contact 1']);

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('yesterday'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    $contract = HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ], [
      'period_start_date' =>  CRM_Utils_Date::processDate('yesterday'),
    ]);

    $date = new DateTime('+5 days');
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' => $date->format('Ymd')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contract['contact_id']])->createAllForContract($contract['id']);

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact['id'], $date->format('Ymd')));

    $this->getCreationLogicWithEntitlementsMock([$contract['contact_id']])->createAllForContract($contract['id']);

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact['id'], $date->format('Ymd')));
  }

  public function testItDoesntCreateAnythingIfTheContractIDDoesntExist() {
    $this->getCreationLogicWithEntitlementsMock([9998398298])->createAllForContract(9998398298);

    $this->assertEquals(0, $this->countNumberOfPublicHolidayBalanceChanges());
  }

  public function testItCreatesLeaveRequestsForAllContactsWithContractsOverlappingTheGivenPublicHoliday() {
    $contact1 = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('5 days ago'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact1['id']
    ], [
      'period_start_date' => CRM_Utils_Date::processDate('5 days ago'),
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact2['id']
    ], [
      'period_start_date' => CRM_Utils_Date::processDate('tomorrow'),
    ]);

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = date('Y-m-d', strtotime('+5 days'));

    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday));

    $this->getCreationLogicWithEntitlementsMock([$contact1['id'], $contact2['id']])->createForAllContacts($publicHoliday);

    $leaveRequestContact1 = LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday);
    $leaveRequestContact2 = LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday);

    $leaveRequestContact1FromDate = new DateTime($leaveRequestContact1->from_date);
    $leaveRequestContact2FromDate = new DateTime($leaveRequestContact2->from_date);

    $this->assertInstanceOf(LeaveRequest::class, $leaveRequestContact1);
    $this->assertEquals($publicHoliday->date, $leaveRequestContact1FromDate->format('Y-m-d'));
    $this->assertInstanceOf(LeaveRequest::class, $leaveRequestContact2);
    $this->assertEquals($publicHoliday->date, $leaveRequestContact2FromDate->format('Y-m-d'));
  }

  public function testItDoesntCreatesLeaveRequestsForAllContactsWithoutContractsOverlappingTheGivenPublicHoliday() {
    $contact1 = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact1['id']
    ], [
      'period_start_date' => CRM_Utils_Date::processDate('5 days ago'),
      'period_end_date' => CRM_Utils_Date::processDate('+5 days')
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact2['id']
    ], [
      'period_start_date' => CRM_Utils_Date::processDate('+7 days'),
    ]);

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = date('Y-m-d', strtotime('+6 days'));

    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday));

    $this->getCreationLogicWithEntitlementsMock([$contact1['id'], $contact2['id']])->createForAllContacts($publicHoliday);

    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday));
  }

  public function testItDoesntDuplicateLeaveRequestsWhenCreatingRequestsForAllContactsWithContractsOverlappingAPublicHoliday() {
    $contact1 = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('5 days ago'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact1['id']
    ], [
      'period_start_date' => CRM_Utils_Date::processDate('5 days ago'),
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact2['id']
    ], [
      'period_start_date' => CRM_Utils_Date::processDate('today'),
    ]);

    $date = new DateTime('+5 days');
    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = $date->format('Y-m-d');

    $this->getCreationLogicWithEntitlementsMock([$contact1['id'], $contact2['id']])->createForAllContacts($publicHoliday);

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact1['id'], $date->format('Ymd')));
    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact2['id'], $date->format('Ymd')));

    $this->getCreationLogicWithEntitlementsMock([$contact1['id'], $contact2['id']])->createForAllContacts($publicHoliday);

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact1['id'], $date->format('Ymd')));
    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact2['id'], $date->format('Ymd')));
  }

  public function testCreateForContactDoesNotCreatePublicHolidayLeaveRequestsWhenNoAbsenceTypeWithMustTakePublicHolidayAsLeaveRequestExist() {
    //We need to delete any absence type already created
    $tableName = AbsenceType::getTableName();
    CRM_Core_DAO::executeQuery("DELETE FROM {$tableName}");

    AbsenceTypeFabricator::fabricate(['must_take_public_holiday_as_leave' => 0]);
    $contactID = 2;
    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = CRM_Utils_Date::processDate('first monday of this year');

    $this->getCreationLogic()->createForContact($contactID, $publicHoliday);
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contactID, $publicHoliday));
  }

  private function countNumberOfPublicHolidayBalanceChanges() {
    $balanceChangeTypes = array_flip(LeaveBalanceChange::buildOptions('type_id', 'validate'));

    $bao = new LeaveBalanceChange();
    $bao->type_id = $balanceChangeTypes['public_holiday'];
    $bao->source_type = LeaveBalanceChange::SOURCE_LEAVE_REQUEST_DAY;

    return $bao->count();
  }

  private function countNumberOfLeaveRequests($contactID, $date) {
    $bao = new LeaveRequest();
    $bao->contact_id = $contactID;
    $bao->from_date = $date;

    return $bao->count();
  }

  public function testCreateLeaveRequestsForAllPublicHolidaysInTheFutureForSelectedContacts() {
    $contact = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ],
    [
      'period_start_date' => '2016-01-01',
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact2['id']
    ],
    [
      'period_start_date' => '2016-01-01',
    ]);

    $date = new DateTime('+5 days');
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' => $date->format('Ymd')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contact['id']])->createAllInTheFuture();

    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact['id'], $date->format('Ymd')));
    $this->assertEquals(0, $this->countNumberOfLeaveRequests($contact2['id'], $date->format('Ymd')));
  }

  public function testCreateLeaveRequestsForAllPublicHolidaysInTheFutureForWorkPatternContacts() {
    $contact = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ],
    [
      'period_start_date' => '2016-01-01',
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact2['id']
    ],
    [
      'period_start_date' => '2016-01-01',
    ]);

    $workPattern1 = WorkPatternFabricator::fabricate();
    $workPattern2 = WorkPatternFabricator::fabricate();

    ContactWorkPatternFabricator::fabricate([
      'contact_id' => $contact['id'],
      'pattern_id' => $workPattern1->id,
      'effective_date' => CRM_Utils_Date::processDate('2015-01-10'),
    ]);

    ContactWorkPatternFabricator::fabricate([
      'contact_id' => $contact2['id'],
      'pattern_id' => $workPattern2->id,
      'effective_date' => CRM_Utils_Date::processDate('2015-01-15'),
    ]);

    $date = new DateTime('+5 days');
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' => $date->format('Ymd')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contact['id'], $contact2['id']])->createAllInFutureForWorkPatternContacts($workPattern1->id);
    //Public Holiday Leave Requests will not be created for contact2 because contact2 is using
    //work pattern2
    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact['id'], $date->format('Ymd')));
    $this->assertEquals(0, $this->countNumberOfLeaveRequests($contact2['id'], $date->format('Ymd')));
  }

  public function testCreateLeaveRequestsForAllPublicHolidaysInTheFutureForDefaultWorkPattern() {
    $contact = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']
    ],
    [
      'period_start_date' => '2016-01-01',
    ]);

    HRJobContractFabricator::fabricate([
      'contact_id' => $contact2['id']
    ],
    [
      'period_start_date' => '2016-01-01',
    ]);

    $workPattern1 = WorkPatternFabricator::fabricate(['is_default' => 1]);
    $workPattern2 = WorkPatternFabricator::fabricate();

    ContactWorkPatternFabricator::fabricate([
      'contact_id' => $contact['id'],
      'pattern_id' => $workPattern2->id,
      'effective_date' => CRM_Utils_Date::processDate('2015-01-10'),
    ]);

    $date = new DateTime('+5 days');
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' => $date->format('Ymd')
    ]);

    $this->getCreationLogicWithEntitlementsMock([$contact['id'], $contact2['id']])->createAllInFutureForWorkPatternContacts($workPattern1->id);

    //Public Holiday Leave Requests are created for both contacts
    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact['id'], $date->format('Ymd')));
    $this->assertEquals(1, $this->countNumberOfLeaveRequests($contact2['id'], $date->format('Ymd')));
  }

  public function testExpiredBalanceChangeIsRecalculatedWhenCreatingPublicHolidayWithPastDatesForSingleContact() {
    $absencePeriod = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-06-01'),
      'end_date' => CRM_Utils_Date::processDate('+10 days')
    ]);

    $periodEntitlement = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => 1,
      'period_id' => $absencePeriod->id,
      'type_id' => $this->absenceType->id,
    ]);

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = CRM_Utils_Date::processDate('2016-11-03');

    $publicHoliday2 = new PublicHoliday();
    $publicHoliday2->date = CRM_Utils_Date::processDate('2016-11-06');

    $publicHoliday3 = new PublicHoliday();
    $publicHoliday3->date = CRM_Utils_Date::processDate('next monday');

    $expiryDate = new DateTime('2016-11-04');
    $balanceChange = $this->createExpiredBroughtForwardBalanceChange(
      $periodEntitlement->id,
      5,
      5,
     $expiryDate
    );

    $this->getCreationLogic()->createForContact($periodEntitlement->contact_id, $publicHoliday);
    $this->getCreationLogic()->createForContact($periodEntitlement->contact_id, $publicHoliday2);
    $this->getCreationLogic()->createForContact($periodEntitlement->contact_id, $publicHoliday3);

    $expiredBalanceChange = LeaveBalanceChange::findById($balanceChange->id);

    //The public holiday date (2016-11-03) is before the date the balance change expired so one will be deducted
    //from $balanceChange remaining 4 left after recalculation.
    //Public Holiday2 is in past but the date is not before an already expired balance change
    //Public Holiday3 is in the future, so it does not affect the recalculation
    $this->assertEquals(-4, $expiredBalanceChange->amount);
  }

  public function testExpiredBalanceChangeIsRecalculatedForAllContactsWhenCreatingPublicHolidayWithPastDates() {
    $absencePeriod = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-06-01'),
      'end_date' => CRM_Utils_Date::processDate('next monday')
    ]);

    $contact1 = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    $periodEntitlement1 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact1['id'],
      'period_id' => $absencePeriod->id,
      'type_id' => $this->absenceType->id,
    ]);

    $periodEntitlement2 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact2['id'],
      'period_id' => $absencePeriod->id,
      'type_id' => $this->absenceType->id,
    ]);

    $this->createLeaveBalanceChange($periodEntitlement1->id, 1);
    $this->createLeaveBalanceChange($periodEntitlement2->id, 1);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact1['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('2016-06-01')]
    );

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact2['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('2016-06-01')]
    );

    $expiryDate = new DateTime('2016-11-04');
    $balanceChange1 = $this->createExpiredBroughtForwardBalanceChange(
      $periodEntitlement1->id,
      3,
      3,
      $expiryDate
    );

    $balanceChange2 = $this->createExpiredBroughtForwardBalanceChange(
      $periodEntitlement2->id,
      5,
      5,
      $expiryDate
    );

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = CRM_Utils_Date::processDate('2016-11-03');

    $publicHoliday2 = new PublicHoliday();
    $publicHoliday2->date = CRM_Utils_Date::processDate('2016-11-06');

    $publicHoliday3 = new PublicHoliday();
    $publicHoliday3->date = CRM_Utils_Date::processDate('next monday');

    $this->getCreationLogic()->createForAllContacts($publicHoliday);
    $this->getCreationLogic()->createForAllContacts($publicHoliday2);
    $this->getCreationLogic()->createForAllContacts($publicHoliday3);

    $expiredBalanceChange1 = LeaveBalanceChange::findById($balanceChange1->id);
    $expiredBalanceChange2 = LeaveBalanceChange::findById($balanceChange2->id);

    //The public holiday date (2016-11-03) is before the date the balance change expired so one will be deducted
    //from $balanceChange1 and also from $balanceChange2
    //Public Holiday2 is in past but the date is not before an already expired balance change
    //Public Holiday3 is in the future, so it does not affect the recalculation
    $this->assertEquals(-2, $expiredBalanceChange1->amount);
    $this->assertEquals(-4, $expiredBalanceChange2->amount);
  }

  public function testExpiredBalanceChangeIsRecalculatedWhenCreatingPublicHolidayWithPastDatesForAContract() {
    $absencePeriod = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-06-01'),
      'end_date' => CRM_Utils_Date::processDate('+10 days')
    ]);

    $contact1 = ContactFabricator::fabricate();

    $periodEntitlement1 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact1['id'],
      'period_id' => $absencePeriod->id,
      'type_id' => $this->absenceType->id,
    ]);

    $this->createLeaveBalanceChange($periodEntitlement1->id, 1);

    $contract1 = HRJobContractFabricator::fabricate([
      'contact_id' => $contact1['id']
    ],
    [
      'period_start_date' => CRM_Utils_Date::processDate('2016-06-01'),
    ]);

    $expiryDate = new DateTime('2016-11-04');
    $balanceChange1 = $this->createExpiredBroughtForwardBalanceChange(
      $periodEntitlement1->id,
      3,
      3,
      $expiryDate
    );

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-11-03')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-11-06')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('next monday')
    ]);

    $this->getCreationLogic()->createAllForContract($contract1['id']);

    $expiredBalanceChange1 = LeaveBalanceChange::findById($balanceChange1->id);
    //The public holiday date (2016-11-03) is before the date the balance change expired so one will be deducted
    //from $balanceChange1
    //Public Holiday2 is in past but the date is not before an already expired balance change
    //Public Holiday3 is in the future, so it does not affect the recalculation
    $this->assertEquals(-2, $expiredBalanceChange1->amount);
  }

  public function testCreateForAllContactsDoesNotCreatePublicHolidayLeaveRequestsWhenNoAbsenceTypeWithMustTakePublicHolidayAsLeaveRequestExist() {
    //We need to delete any absence type already created
    $tableName = AbsenceType::getTableName();
    CRM_Core_DAO::executeQuery("DELETE FROM {$tableName}");

    AbsenceTypeFabricator::fabricate(['must_take_public_holiday_as_leave' => 0]);

    $contact1 = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact1['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('5 days ago')]
    );

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact2['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('tomorrow')]
    );

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = date('Y-m-d', strtotime('+5 days'));

    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday));

    $this->getCreationLogicWithEntitlementsMock([$contact1['id'], $contact2['id']])->createForAllContacts($publicHoliday);

    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday));
  }

  public function testCanCreatePublicHolidayLeaveRequestsForAllPublicHolidaysInAbsencePeriod() {
    $contact = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    $period = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date' => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    $periodEntitlement = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period->id,
      'type_id' => $this->absenceType->id,
    ]);

    $periodEntitlement2 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact2['id'],
      'period_id' => $period->id,
      'type_id' => $this->absenceType->id,
    ]);

    //Add entitlements for the contacts
    $this->createLeaveBalanceChange($periodEntitlement->id, 1);
    $this->createLeaveBalanceChange($periodEntitlement2->id, 1);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact['id']],
      ['period_start_date' => '2016-01-01']
    );

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact2['id']],
      ['period_start_date' => '2016-01-01']
    );

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2015-12-31')
    ]);

    $publicHoliday2 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-01-01')
    ]);

    $publicHoliday3 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-09-01')
    ]);

    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2017-02-01')
    ]);

    $this->getCreationLogic()->createAllForAbsencePeriod($period);

    //The first public holiday is before the absence period and the last public holiday is
    //after the absence period. So the balance will be -2 for both contacts
    $this->assertEquals(-2, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday2));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday3));

    $this->assertEquals(-2, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement2));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday2));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday3));
  }

  public function testCanCreatePublicHolidayLeaveRequestsForAllPublicHolidaysInAbsencePeriodForSpecificContact() {
    $contact = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    $period = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date' => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    $periodEntitlement = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period->id,
      'type_id' => $this->absenceType->id,
    ]);

    $periodEntitlement2 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact2['id'],
      'period_id' => $period->id,
      'type_id' => $this->absenceType->id,
    ]);

    //Add entitlements for the contacts
    $this->createLeaveBalanceChange($periodEntitlement->id, 1);
    $this->createLeaveBalanceChange($periodEntitlement2->id, 1);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact['id']],
      ['period_start_date' => '2016-01-01']
    );

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact2['id']],
      ['period_start_date' => '2016-01-01']
    );

    $publicHoliday1 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-01-01')
    ]);

    $publicHoliday2 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-09-01')
    ]);

    $this->getCreationLogic()->createAllForAbsencePeriod($period, [$contact['id']]);

    //Public holiday leave requests will only be created for the first contact.
    $this->assertEquals(-2, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday1));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday2));

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement2));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday1));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday2));
  }

  public function testPublicHolidayLeaveRequestsAreNotCreatedWhenContactHasZeroEntitlementForPeriod() {
    $contact = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    $period = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date' => CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    $periodEntitlement = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period->id,
      'type_id' => $this->absenceType->id,
    ]);

    $periodEntitlement2 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact2['id'],
      'period_id' => $period->id,
      'type_id' => $this->absenceType->id,
    ]);

    //Add entitlements for the contacts
    $this->createLeaveBalanceChange($periodEntitlement->id, 1);
    $this->createLeaveBalanceChange($periodEntitlement2->id, 0);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact['id']],
      ['period_start_date' => '2016-03-01']
    );

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact2['id']],
      ['period_start_date' => '2016-01-01']
    );

    //This public holiday is within the absence  period but
    //the first contact does not have a contract during this
    //public holiday date, so it will not be included.
    $publicHoliday1 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-01-01')
    ]);

    $publicHoliday2 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-03-01')
    ]);

    $publicHoliday3 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-09-01')
    ]);

    $publicHoliday4 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-10-01')
    ]);

    $this->getCreationLogic()->createAllForAbsencePeriod($period);

    //So the balance will be -3 for the first contact
    //the second contact has no entitlement for the period so no public holiday
    //leave request will be created.
    $this->assertEquals(-3, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday2));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday3));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday4));

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement2));
  }

  public function testCreateAllForContractDoesNotCreateForPeriodWhereContactHasNoEntitlement() {
    $contact = ContactFabricator::fabricate();

    $contract = HRJobContractFabricator::fabricate([
      'contact_id' => $contact['id']], [
      'period_start_date' =>  CRM_Utils_Date::processDate('2016-01-10'),
      'period_end_date' =>   CRM_Utils_Date::processDate('2016-12-31'),
    ]);

    $period1 = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date' => CRM_Utils_Date::processDate('2016-04-30')
    ]);

    $period2 = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-07-01'),
      'end_date' => CRM_Utils_Date::processDate('2016-12-30')
    ]);

    $periodEntitlement1 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period1->id,
      'type_id' => $this->absenceType->id,
    ]);

    $periodEntitlement2 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period2->id,
      'type_id' => $this->absenceType->id,
    ]);

    $this->createLeaveBalanceChange($periodEntitlement1->id, 1);
    $this->createLeaveBalanceChange($periodEntitlement2->id, 0);

    //Public holiday is within the first absence period where contact has entitlement
    //but does not overlap the contract date.
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-01-01')
    ]);

    //Public holiday is within the first absence period
    //and contact has entitlement for this period
    $publicHoliday2 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-03-30')
    ]);

    //Public holiday is within the lapse between absence period 1 and 2
    //i.e its not within any absence period
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-06-06')
    ]);

    //Public holiday is within the second absence period but contact
    //has no entitlement for this period.
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-07-06')
    ]);

    $this->getCreationLogic()->createAllForContract($contract['id']);

    //Only Public holiday leave request for '2016-03-30' is created within period 1. none for period 2
    //for which contact has no entitlement.
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday2));
    $this->assertEquals(-1, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement1));

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement2));
  }

  public function testCreateForAllContactsDoesNotCreateForPeriodWhereContactHasNoEntitlement() {
    $contact1 = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();
    $contact3 = ContactFabricator::fabricate();

    $period = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2016-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2016-02-01'),
    ]);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact1['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('2016-01-01')]
    );

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact2['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('2016-01-01')]
    );

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact3['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('2016-01-01')]
    );

    $periodEntitlement1 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact1['id'],
      'period_id' => $period->id,
      'type_id' => $this->absenceType->id,
    ]);

    $periodEntitlement2 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact2['id'],
      'period_id' => $period->id,
      'type_id' => $this->absenceType->id,
    ]);

    $this->createLeaveBalanceChange($periodEntitlement1->id, 1);
    $this->createLeaveBalanceChange($periodEntitlement2->id, 0);

    $publicHoliday = new PublicHoliday();
    $publicHoliday->date = '2016-01-20';

    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday));

    $this->getCreationLogic()->createForAllContacts($publicHoliday);

    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday));

    //Contact2 has zero entitlement for the period therefore the public holiday leave request will not be
    //created fot it.
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday));

    //Contact3 has no entitlement for the period therefore the public holiday leave request will not be
    //created fot it.
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact3['id'], $publicHoliday));
  }

  public function testWillNotCreatePublicHolidayLeaveRequestsInTheFutureForWhereContactHasNoEntitlement() {
    $contact = ContactFabricator::fabricate();

    $period1 = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('today'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    $period2 = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('+9 days'),
      'end_date'   => CRM_Utils_Date::processDate('+15 days'),
    ]);

    $periodEntitlement1 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period1->id,
      'type_id' => $this->absenceType->id,
    ]);

    $periodEntitlement2 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period2->id,
      'type_id' => $this->absenceType->id,
    ]);

    $this->createLeaveBalanceChange($periodEntitlement1->id, 1);
    $this->createLeaveBalanceChange($periodEntitlement2->id, 0);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact['id']],
      ['period_start_date' => '2016-01-01']
    );

    //This public holiday is in the past
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-01-01')
    ]);

    //This public holiday is within the first absence period and contact
    //has entitlement for this period.
    $publicHoliday2 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('tomorrow')
    ]);

    //This public holiday is between the lapse between the two periods
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+6 days')
    ]);

    //This public holiday is in the second absence period for
    //which the contact has no entitlement
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+9 days')
    ]);

    $this->getCreationLogic([$contact['id']])->createAllInTheFuture();

    //Only Public holiday leave request for the second public holiday is created because it falls
    //within the date where the contact has entitlement.
    $this->assertEquals(-1, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement1));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday2));

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement2));
  }

  public function testWillNotCreatePublicHolidayLeaveRequestsInTheFutureForWorkPatternContactHavingNoEntitlementForThePeriod() {
    $contact = ContactFabricator::fabricate();

    $period1 = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('today'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    $period2 = AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('+9 days'),
      'end_date'   => CRM_Utils_Date::processDate('+15 days'),
    ]);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact['id']],
      ['period_start_date' => '2016-01-01']
    );

    $periodEntitlement1 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period1->id,
      'type_id' => $this->absenceType->id,
    ]);

    $periodEntitlement2 = LeavePeriodEntitlementFabricator::fabricate([
      'contact_id' => $contact['id'],
      'period_id' => $period2->id,
      'type_id' => $this->absenceType->id,
    ]);

    $this->createLeaveBalanceChange($periodEntitlement1->id, 1);
    $this->createLeaveBalanceChange($periodEntitlement2->id, 0);

    $workPattern = WorkPatternFabricator::fabricate(['is_default' => 1]);

    //This public holiday is in the past
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2016-01-01')
    ]);

    //This public holiday is within the first absence period
    $publicHoliday2 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('tomorrow')
    ]);

    //This public holiday is between the lapse between the two periods
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+6 days')
    ]);

    //This public holiday is in the second absence period for
    PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+9 days')
    ]);

    $this->getCreationLogic()->createAllInFutureForWorkPatternContacts($workPattern->id);

    //Only Public holiday leave request for the second public holiday is created because it falls
    //within the date where the contact has entitlement.
    $this->assertEquals(-1, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement1));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact['id'], $publicHoliday2));

    $this->assertEquals(0, LeaveBalanceChange::getLeaveRequestBalanceForEntitlement($periodEntitlement2));
  }

  public function testCreateAllWillCreatePublicHolidayLeaveRequestsForAllPublicHolidaysInAllPeriodsForAllContacts() {
    $contact1 = ContactFabricator::fabricate();
    $contact2 = ContactFabricator::fabricate();

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2017-01-01'),
      'end_date'   => CRM_Utils_Date::processDate('2017-06-30'),
    ]);

    AbsencePeriodFabricator::fabricate([
      'start_date' => CRM_Utils_Date::processDate('2017-07-01'),
      'end_date'   => CRM_Utils_Date::processDate('+5 days'),
    ]);

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact1['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('2017-01-01')]
    );

    HRJobContractFabricator::fabricate(
      ['contact_id' => $contact2['id']],
      ['period_start_date' => CRM_Utils_Date::processDate('2017-01-01')]
    );

    $publicHoliday1 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2017-01-01')
    ]);

    $publicHoliday2 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('2017-05-05')
    ]);

    $publicHoliday3 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('tomorrow')
    ]);

    $publicHoliday4 = PublicHolidayFabricator::fabricateWithoutValidation([
      'date' =>  CRM_Utils_Date::processDate('+7 days')
    ]);

    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday1));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday2));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday3));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday1));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday2));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday3));

    //Create public holiday requests for all contacts for all periods.
    $this->getCreationLogicWithEntitlementsMock([$contact1['id'], $contact2['id']])->createAll();

    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday1));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday2));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday3));

    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday1));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday2));
    $this->assertNotNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday3));

    //The public holiday4 des not exist in any absence period, so will not be created for either contact
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact1['id'], $publicHoliday4));
    $this->assertNull(LeaveRequest::findPublicHolidayLeaveRequest($contact2['id'], $publicHoliday4));
  }

  private function getCreationLogicWithEntitlementsMock($contactIDs) {
    return $this->getCreationLogic($contactIDs, true);
  }

  private function getCreationLogic($contactIDs = [], $mockEntitlement = false) {
    $leaveBalanceChangeService = $this->createLeaveBalanceChangeServiceForPublicHolidayLeaveRequestMock();

    if($mockEntitlement) {
      $entitlements = [];
      foreach($contactIDs as $contactID) {
        $entitlements[$contactID] = [$this->absenceType->id => 1];
      }
      $leavePeriodEntitlementService = $this->createLeavePeriodEntitlementServiceForPublicHolidayLeaveRequestMock($entitlements);
    }
    else{
      $leavePeriodEntitlementService = new LeavePeriodEntitlementService();
    }

    return new PublicHolidayLeaveRequestCreation(
      new JobContractService(),
      $leaveBalanceChangeService,
      $leavePeriodEntitlementService
    );
  }
}
