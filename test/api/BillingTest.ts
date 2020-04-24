import chai, { assert, expect } from 'chai';
import chaiSubset from 'chai-subset';
import moment from 'moment';
import { ObjectID } from 'mongodb';
import Billing from '../../src/integration/billing/Billing';
import StripeBilling from '../../src/integration/billing/stripe/StripeBilling';
import { BillingInvoiceStatus } from '../../src/types/Billing';
import { HTTPAuthError } from '../../src/types/HTTPError';
import { UserInErrorType } from '../../src/types/InError';
import { BillingSetting, BillingSettingsType, SettingDB, StripeBillingSetting } from '../../src/types/Setting';
import User from '../../src/types/User';
import Constants from '../../src/utils/Constants';
import Cypher from '../../src/utils/Cypher';
import config from '../config';
import Factory from '../factories/Factory';
import responseHelper from '../helpers/responseHelper';
import CentralServerService from './client/CentralServerService';
import { default as ClientConstants } from './client/utils/Constants';
import ChargingStationContext from './contextProvider/ChargingStationContext';
import CONTEXTS from './contextProvider/ContextConstants';
import ContextProvider from './contextProvider/ContextProvider';
import SiteContext from './contextProvider/SiteContext';
import TenantContext from './contextProvider/TenantContext';

chai.use(chaiSubset);
chai.use(responseHelper);


let billingImpl: Billing<BillingSetting>;

class TestData {
  public tenantContext: TenantContext;
  public centralUserContext: any;
  public centralUserService: CentralServerService;
  public userContext: User;
  public userService: CentralServerService;
  public siteContext: SiteContext;
  public siteAreaContext: any;
  public chargingStationContext: ChargingStationContext;
  public createdUsers: User[] = [];
  public isForcedSynchro: boolean;
  public pending = false;

  public static async setBillingSystemValidCredentials(testData) {
    const stripeSettings = TestData.getStripeSettings();
    await TestData.saveBillingSettings(testData, stripeSettings);
    stripeSettings.secretKey = Cypher.encrypt(stripeSettings.secretKey);
    billingImpl = new StripeBilling(testData.tenantContext.getTenant().id, stripeSettings);
    expect(billingImpl).to.not.be.null;
  }

  public static async setBillingSystemInvalidCredentials(testData) {
    const stripeSettings = TestData.getStripeSettings();
    stripeSettings.secretKey = Cypher.encrypt('sk_test_invalid_credentials');
    await TestData.saveBillingSettings(testData, stripeSettings);
    billingImpl = new StripeBilling(testData.tenantContext.getTenant().id, stripeSettings);
    expect(billingImpl).to.not.be.null;
  }

  public static getStripeSettings(): StripeBillingSetting {
    return {
      url: config.get('billing.url'),
      publicKey: config.get('billing.publicKey'),
      secretKey: config.get('billing.secretKey'),
      noCardAllowed: config.get('billing.noCardAllowed'),
      advanceBillingAllowed: config.get('billing.advanceBillingAllowed'),
      currency: config.get('billing.currency'),
      immediateBillingAllowed: config.get('billing.immediateBillingAllowed'),
      periodicBillingAllowed: config.get('billing.periodicBillingAllowed')
    } as StripeBillingSetting;
  }

  private static async saveBillingSettings(testData, stripeSettings) {
    const tenantBillingSettings = await testData.userService.settingApi.readAll({ 'Identifier': 'billing' });
    expect(tenantBillingSettings.data.count).to.be.eq(1);
    const componentSetting: SettingDB = tenantBillingSettings.data.result[0];
    componentSetting.content.type = BillingSettingsType.STRIPE;
    componentSetting.content.stripe = stripeSettings;
    componentSetting.sensitiveData = ['content.stripe.secretKey'];
    await testData.userService.settingApi.update(componentSetting);
  }
}


async function generateTransaction(user: User, chargingStationContext) {
  const connectorId = 1;
  const tagId = user.tags[0].id;
  const meterStart = 0;
  const meterStop = 1000;
  const startDate = moment().toDate();
  const stopDate = moment(startDate).add(1, 'hour');
  let response = await chargingStationContext.startTransaction(connectorId, tagId, meterStart, startDate);
  expect(response).to.be.transactionValid;
  const transactionId1 = response.data.transactionId;
  response = await chargingStationContext.stopTransaction(transactionId1, tagId, meterStop, stopDate);
  expect(response).to.be.transactionStatus('Accepted');
}

const testData: TestData = new TestData();
const billingSettings = TestData.getStripeSettings();
for (const key of Object.keys(billingSettings)) {
  if (!billingSettings[key] || billingSettings[key] === '') {
    testData.pending = true;
  }
}

describe('Billing Service', function() {
  this.timeout(1000000);
  describe('With component Billing (tenant ut-billing)', () => {
    before(async () => {
      testData.tenantContext = await ContextProvider.DefaultInstance.getTenantContext(CONTEXTS.TENANT_CONTEXTS.TENANT_BILLING);
      testData.centralUserContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
      testData.userContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
      expect(testData.userContext).to.not.be.null;
      testData.centralUserService = new CentralServerService(
        testData.tenantContext.getTenant().subdomain,
        testData.centralUserContext
      );
      testData.isForcedSynchro = false;
    });

    describe('Where admin user', () => {
      before(async () => {
        testData.userContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
        assert(testData.userContext, 'User context cannot be null');
        if (testData.userContext === testData.centralUserContext) {
          // Reuse the central user service (to avoid double login)
          testData.userService = testData.centralUserService;
        } else {
          testData.userService = new CentralServerService(
            testData.tenantContext.getTenant().subdomain,
            testData.userContext
          );
        }
        assert(!!testData.userService, 'User service cannot be null');
        const tenant = testData.tenantContext.getTenant();
        if (tenant.id) {
          await TestData.setBillingSystemValidCredentials(testData);
        } else {
          throw new Error(`Unable to get Tenant ID for tenant : ${CONTEXTS.TENANT_CONTEXTS.TENANT_BILLING}`);
        }
      });

      it('Should connect to Billing Provider', async () => {
        const response = await testData.userService.billingApi.testConnection({}, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING);
        expect(response.data.connectionIsValid).to.be.true;
        expect(response.data).containSubset(Constants.REST_RESPONSE_SUCCESS);
      });

      it('Should create a user', async () => {
        const fakeUser = {
          ...Factory.user.build(),
        } as User;
        fakeUser.issuer = true;
        await testData.userService.createEntity(
          testData.userService.userApi,
          fakeUser
        );
        testData.createdUsers.push(fakeUser);

        const exists = await billingImpl.userExists(fakeUser);
        expect(exists).to.be.true;
      });

      it('Should update a user', async () => {
        const fakeUser = {
          ...Factory.user.build(),
        } as User;
        fakeUser.issuer = true;
        await testData.userService.createEntity(
          testData.userService.userApi,
          fakeUser
        );
        fakeUser.firstName = 'Test';
        fakeUser.name = 'Name';
        await testData.userService.updateEntity(
          testData.userService.userApi,
          fakeUser,
          false
        );
        testData.createdUsers.push(fakeUser);
        const billingUser = await billingImpl.getUserByEmail(fakeUser.email);
        expect(billingUser.name).to.be.eq(fakeUser.firstName + ' ' + fakeUser.name);
      });

      it('Should delete a user', async () => {
        await testData.userService.deleteEntity(
          testData.userService.userApi,
          { id: testData.createdUsers[0].id }
        );

        const exists = await billingImpl.userExists(testData.createdUsers[0]);
        expect(exists).to.be.false;
        testData.createdUsers.shift();
      });

      it('Should synchronize a new user', async () => {
        const fakeUser = {
          ...Factory.user.build(),
        } as User;
        fakeUser.issuer = true;
        await TestData.setBillingSystemInvalidCredentials(testData);
        await testData.userService.createEntity(
          testData.userService.userApi,
          fakeUser
        );
        testData.createdUsers.push(fakeUser);
        await TestData.setBillingSystemValidCredentials(testData);
        await testData.userService.billingApi.synchronizeUser({ id: fakeUser.id });
        const userExists = await billingImpl.userExists(fakeUser);
        expect(userExists).to.be.true;
      });

      it('Should set in error users without Billing data', async () => {
        const fakeUser = {
          ...Factory.user.build()
        } as User;
        fakeUser.issuer = true;
        await TestData.setBillingSystemInvalidCredentials(testData);
        // Creates user without billing data
        await testData.userService.createEntity(
          testData.userService.userApi,
          fakeUser
        );
        testData.createdUsers.push(fakeUser);
        // Check if user is in Users In Error
        const response = await testData.userService.userApi.readAllInError({ ErrorType: UserInErrorType.NO_BILLING_DATA }, {
          limit: 100,
          skip: 0
        });
        let userFound = false;
        for (const user of response.data.result) {
          if (user.id === fakeUser.id) {
            userFound = true;
            break;
          }
        }
        assert(userFound, 'User with no billing data not found in Users In Error');
      });

      it('Should force a user synchronization', async () => {
        const fakeUser = {
          ...Factory.user.build(),
        } as User;
        fakeUser.issuer = true;
        await TestData.setBillingSystemValidCredentials(testData);
        await testData.userService.createEntity(
          testData.userService.userApi,
          fakeUser
        );
        testData.createdUsers.push(fakeUser);
        const response = await testData.userService.userApi.getByEmail(fakeUser.email);
        const billingUserBefore = response.data.result[0];
        await testData.userService.billingApi.forceSynchronizeUser({ id: fakeUser.id });
        const billingUserAfter = await billingImpl.getUserByEmail(fakeUser.email);
        expect(billingUserBefore.billingData.customerID).to.not.be.eq(billingUserAfter.billingData.customerID);
      });

      // It('Should create an invoice', async () => {
      //   if (!testData.isForcedSynchro) {
      //     await testData.userService.billingApi.forceSynchronizeUser({ id: testData.userContext.id });
      //     testData.isForcedSynchro = true;
      //   }
      //   const billingUser = await billingImpl.getUserByEmail(testData.userContext.email);
      //   // const invoice = await billingImpl.createInvoice(testData.tenantContext.getTenant().id, billingUser, { description: 'Test invoice', amount: 5000 });
      //   expect(invoice).to.not.be.undefined;
      //   expect(invoice.invoice).to.not.be.undefined;
      //   expect(invoice.invoiceItem).to.not.be.undefined;
      //   expect(invoice.invoiceItem).to.containSubset({ description: 'Test invoice', amount: 5000 });
      //   // const createdInvoiceId = await BillingStorage.saveInvoice(testData.tenantContext.getTenant().id, invoice.invoice);
      //   // Const billingInvoice = await billingImpl.getUserInvoice(billingUser, invoice.invoice.invoiceID);
      //   const createdInvoice = await BillingStorage.getInvoice(testData.tenantContext.getTenant().id, invoice.invoice.id);
      //   expect(createdInvoice).to.not.be.undefined;
      // });

      // it('Should create an invoice with multiple invoice items', async () => {
      //   if (!testData.isForcedSynchro) {
      //     await testData.userService.billingApi.forceSynchronizeUser({ id: testData.userContext.id });
      //     testData.isForcedSynchro = true;
      //   }
      //   const billingUser = await billingImpl.getUserByEmail(testData.userContext.email);
      //   const invoice = await billingImpl.createInvoice(testData.tenantContext.getTenant().id, billingUser, { description: 'Test invoice', amount: 5000 });
      //   expect(invoice).to.not.be.undefined;
      //   expect(invoice.invoice).to.not.be.undefined;
      //   expect(invoice.invoiceItem).to.not.be.undefined;
      //   expect(invoice.invoiceItem).to.containSubset({ description: 'Test invoice', amount: 5000 });
      //   // Const openedInvoice = await billingImpl.getOpenedInvoice(billingUser);
      //   const openedInvoices = await BillingStorage.getInvoices(testData.tenantContext.getTenant().id, { invoiceStatus: BillingInvoiceStatus.OPEN }, Constants.DB_PARAMS_MAX_LIMIT);
      //   expect(openedInvoices.result).to.include(invoice.invoice);
      //
      //   await billingImpl.createInvoiceItem(billingUser, openedInvoices.result[0], { description: 'Test invoice multiple items', amount: 1000 });
      //   // const updatedInvoiceId = await BillingStorage.saveInvoice(testData.tenantContext.getTenant().id, openedInvoices.result[0]);
      //   const updatedInvoice = await BillingStorage.getInvoice(testData.tenantContext.getTenant().id, invoice.invoice.id);
      //   expect(updatedInvoice).to.not.be.undefined;
      //   // expect(updatedInvoice.nbrOfItems).to.be.eq(2);
      // });

      // it('Should finalize and send an invoice', async () => {
      //   if (!testData.isForcedSynchro) {
      //     await testData.userService.billingApi.forceSynchronizeUser({ id: testData.userContext.id });
      //     testData.isForcedSynchro = true;
      //   }
      //   const billingUser = await billingImpl.getUserByEmail(testData.userContext.email);
      //   const invoice = await billingImpl.createInvoice(testData.tenantContext.getTenant().id, billingUser, { description: 'Test invoice', amount: 5000 });
      //   expect(invoice).to.not.be.undefined;
      //   expect(invoice.invoice).to.not.be.undefined;
      //   expect(invoice.invoiceItem).to.not.be.undefined;
      //   expect(invoice.invoiceItem).to.containSubset({ description: 'Test invoice', amount: 5000 });
      //   const billingInvoice = await billingImpl.sendInvoiceToUser(invoice.invoice.invoiceID);
      //   expect(billingInvoice).to.not.be.undefined;
      //   expect(billingInvoice.status).to.be.eq(BillingInvoiceStatus.OPEN);
      // });

      it('Should list invoices', async () => {
        const response = await testData.userService.billingApi.readAll({}, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING, '/client/api/BillingUserInvoices');
        expect(response.data.result.length).to.be.eq(3);
        for (let i = 0; i < response.data.result.length - 1; i++) {
          expect(response.data.result[i].userID).to.be.eq(testData.userContext.id);
          expect(response.data.result[i].amount).to.be.eq(100);
          expect(response.data.result[i].status).to.be.eq(BillingInvoiceStatus.DRAFT);
        }
      });

      it('Should list filtered invoices', async () => {
        const response = await testData.userService.billingApi.readAll({ Status: BillingInvoiceStatus.OPEN }, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING, '/client/api/BillingUserInvoices');
        for (const invoice of response.data.result) {
          expect(invoice.status).to.be.eq(BillingInvoiceStatus.OPEN);
        }
      });

      after(async () => {
        await TestData.setBillingSystemValidCredentials(testData);
        for (const user of testData.createdUsers) {
          await testData.userService.deleteEntity(
            testData.userService.userApi,
            user
          );
        }
      });
    });

    describe('Where basic user', () => {
      before(async () => {
        testData.tenantContext = await ContextProvider.DefaultInstance.getTenantContext(CONTEXTS.TENANT_CONTEXTS.TENANT_BILLING);
        testData.centralUserContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.BASIC_USER);
        testData.userContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.BASIC_USER);
        expect(testData.userContext).to.not.be.null;
        testData.centralUserService = new CentralServerService(
          testData.tenantContext.getTenant().subdomain,
          testData.centralUserContext
        );
        if (testData.userContext === testData.centralUserContext) {
          // Reuse the central user service (to avoid double login)
          testData.userService = testData.centralUserService;
        } else {
          testData.userService = new CentralServerService(
            testData.tenantContext.getTenant().subdomain,
            testData.userContext
          );
        }
        expect(testData.userService).to.not.be.null;
        const tenant = testData.tenantContext.getTenant();
        if (tenant.id) {
          await TestData.setBillingSystemValidCredentials(testData);
        } else {
          throw new Error(`Unable to get Tenant ID for tenant : ${CONTEXTS.TENANT_CONTEXTS.TENANT_BILLING}`);
        }
      });

      it('Should not be able to test connection to Billing Provider', async () => {
        const response = await testData.userService.billingApi.testConnection({}, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING);
        expect(response.status).to.be.eq(HTTPAuthError.ERROR);
      });

      it('Should not create a user', async () => {
        const fakeUser = {
          ...Factory.user.build(),
        } as User;

        const response = await testData.userService.createEntity(
          testData.userService.userApi,
          fakeUser,
          false
        );
        testData.createdUsers.push(fakeUser);
        expect(response.status).to.be.eq(HTTPAuthError.ERROR);
      });

      it('Should not update a user', async () => {
        const fakeUser = {
          id: new ObjectID(),
          ...Factory.user.build(),
        } as User;
        fakeUser.firstName = 'Test';
        fakeUser.name = 'Name';
        const response = await testData.userService.updateEntity(
          testData.userService.userApi,
          fakeUser,
          false
        );
        expect(response.status).to.be.eq(HTTPAuthError.ERROR);
      });

      it('Should not delete a user', async () => {
        const response = await testData.userService.deleteEntity(
          testData.userService.userApi,
          { id: 0 },
          false
        );
        expect(response.status).to.be.eq(HTTPAuthError.ERROR);
      });

      it('Should not synchronize a user', async () => {
        const fakeUser = {
          ...Factory.user.build(),
        } as User;
        const response = await testData.userService.billingApi.synchronizeUser({ id: fakeUser.id });
        expect(response.status).to.be.eq(HTTPAuthError.ERROR);
      });

      it('Should not force synchronization of a user', async () => {
        const fakeUser = {
          ...Factory.user.build(),
        } as User;
        const response = await testData.userService.billingApi.forceSynchronizeUser({ id: fakeUser.id });
        expect(response.status).to.be.eq(HTTPAuthError.ERROR);
      });

      it('Should list invoices', async () => {
        const basicUser: User = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.BASIC_USER);

        // Set back userContext to BASIC to consult invoices
        testData.userService = new CentralServerService(
          testData.tenantContext.getTenant().subdomain,
          basicUser
        );
        const response = await testData.userService.billingApi.readAll({}, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING, '/client/api/BillingUserInvoices');
        expect(response.data.result.length).to.be.eq(3);
        for (let i = 0; i < response.data.result.length - 1; i++) {
          expect(response.data.result[i].userID).to.be.eq(basicUser.id);
          expect(response.data.result[i].amount).to.be.eq(100);
        }
      });

      it('Should list filtered invoices', async () => {
        const response = await testData.userService.billingApi.readAll({ Status: BillingInvoiceStatus.OPEN }, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING, '/client/api/BillingUserInvoices');
        for (const invoice of response.data.result) {
          expect(invoice.status).to.be.eq(BillingInvoiceStatus.OPEN);
        }
      });
    });
  });

  describe('With component Billing (tenant ut-all)', () => {
    before(async () => {
      testData.tenantContext = await ContextProvider.DefaultInstance.getTenantContext(CONTEXTS.TENANT_CONTEXTS.TENANT_WITH_ALL_COMPONENTS);
      testData.centralUserContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
      testData.userContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
      expect(testData.userContext).to.not.be.null;
      testData.centralUserService = new CentralServerService(
        testData.tenantContext.getTenant().subdomain,
        testData.centralUserContext
      );
      testData.isForcedSynchro = false;
      testData.siteContext = testData.tenantContext.getSiteContext(CONTEXTS.SITE_CONTEXTS.SITE_WITH_OTHER_USER_STOP_AUTHORIZATION);
      testData.siteAreaContext = testData.siteContext.getSiteAreaContext(CONTEXTS.SITE_AREA_CONTEXTS.WITH_ACL);
      testData.chargingStationContext = testData.siteAreaContext.getChargingStationContext(CONTEXTS.CHARGING_STATION_CONTEXTS.ASSIGNED_OCPP16);
    });

    describe('Where admin user', () => {
      before(async () => {
        testData.userContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
        assert(testData.userContext, 'User context cannot be null');
        if (testData.userContext === testData.centralUserContext) {
          // Reuse the central user service (to avoid double login)
          testData.userService = testData.centralUserService;
        } else {
          testData.userService = new CentralServerService(
            testData.tenantContext.getTenant().subdomain,
            testData.userContext
          );
        }
        await TestData.setBillingSystemValidCredentials(testData);
      });

      it('should create an invoice after a transaction', async () => {
        let response = await testData.userService.billingApi.readAll({}, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING, '/client/api/BillingUserInvoices');
        const invoicesBefore = response.data.result;
        await testData.userService.billingApi.forceSynchronizeUser({ id: testData.userContext.id });
        await generateTransaction(testData.userContext, testData.chargingStationContext);
        response = await testData.userService.billingApi.readAll({}, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING, '/client/api/BillingUserInvoices');
        const invoicesAfter = response.data.result;
        expect(invoicesAfter.length).to.be.eq(invoicesBefore.length + 1);
        expect(invoicesAfter[invoicesAfter.length - 1].status).to.be.eq(BillingInvoiceStatus.OPEN);
      });
    });

    describe('Where basic user', () => {
      before(async () => {
        testData.userContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.BASIC_USER);
        assert(testData.userContext, 'User context cannot be null');
        if (testData.userContext === testData.centralUserContext) {
          // Reuse the central user service (to avoid double login)
          testData.userService = testData.centralUserService;
        } else {
          testData.userService = new CentralServerService(
            testData.tenantContext.getTenant().subdomain,
            testData.userContext
          );
        }
        await TestData.setBillingSystemValidCredentials(testData);
      });

      it('should create an invoice after a transaction', async () => {
        let response = await testData.userService.billingApi.readAll({}, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING, '/client/api/BillingUserInvoices');
        const invoicesBefore = response.data.result;
        const adminUser = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
        const basicUser = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.BASIC_USER);
        // Connect as Admin to Force synchronize basic user
        testData.userContext = adminUser;
        testData.userService = new CentralServerService(
          testData.tenantContext.getTenant().subdomain,
          testData.userContext
        );
        await testData.userService.billingApi.forceSynchronizeUser({ id: basicUser.id });
        // Reconnect as Basic user
        testData.userContext = basicUser;
        testData.userService = new CentralServerService(
          testData.tenantContext.getTenant().subdomain,
          testData.userContext
        );
        await generateTransaction(testData.userContext, testData.chargingStationContext);
        response = await testData.userService.billingApi.readAll({}, ClientConstants.DEFAULT_PAGING, ClientConstants.DEFAULT_ORDERING, '/client/api/BillingUserInvoices');
        const invoicesAfter = response.data.result;
        expect(invoicesAfter.length).to.be.eq(invoicesBefore.length + 1);
      });
    });
  });
});
