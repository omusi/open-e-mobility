import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import CentralServerService from './client/CentralServerService';
import CONTEXTS from './contextProvider/ContextConstants';
import ContextProvider from './contextProvider/ContextProvider';
import Factory from '../factories/Factory';
import TenantContext from './contextProvider/TenantContext';

chai.use(chaiSubset);

class TestData {
  public tenantContext: TenantContext;
  public centralUserContext: any;
  public centralUserService: CentralServerService;
  public userContext: any;
  public userService: CentralServerService;
  public newCompany: any;
  public newSite: any;
  public newSiteArea: any;
  public createdCompanies: any[] = [];
  public createdSites: any[] = [];
  public createdSiteAreas: any[] = [];
  public createdUsers: any[] = [];
}

const testData = new TestData();

describe('Company, Site, Site Area tests', function() {
  this.timeout(1000000); // Will automatically stop the unit test after that period of time

  before(async () => {
    chai.config.includeStack = true;
    await ContextProvider.DefaultInstance.prepareContexts();
  });

  afterEach(() => {
    // Can be called after each UT to clean up created data
  });

  after(async () => {
    // Final clean up at the end
    await ContextProvider.DefaultInstance.cleanUpCreatedContent();
  });

  describe('With component Organization (tenant utorg)', () => {

    before(async () => {
      testData.tenantContext = await ContextProvider.DefaultInstance.getTenantContext(CONTEXTS.TENANT_CONTEXTS.TENANT_ORGANIZATION);
      testData.centralUserContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
      testData.centralUserService = new CentralServerService(
        testData.tenantContext.getTenant().subdomain,
        testData.centralUserContext
      );
    });

    after(async () => {
      // Delete any created company
      testData.createdCompanies.forEach(async (company) => {
        await testData.centralUserService.deleteEntity(
          testData.centralUserService.companyApi,
          company,
          false
        );
      });
      testData.createdCompanies = [];
      // Delete any created site
      testData.createdSites.forEach(async (site) => {
        await testData.centralUserService.deleteEntity(
          testData.centralUserService.siteApi,
          site,
          false
        );
      });
      testData.createdSites = [];
      // Delete any created site area
      testData.createdSiteAreas.forEach(async (siteArea) => {
        await testData.centralUserService.deleteEntity(
          testData.centralUserService.siteAreaApi,
          siteArea,
          false
        );
      });
      testData.createdSiteAreas = [];
      // Delete any created user
      testData.createdUsers.forEach(async (user) => {
        await testData.centralUserService.deleteEntity(
          testData.centralUserService.userApi,
          user,
          false
        );
      });
      testData.createdUsers = [];
    });

    describe('Where admin user', () => {

      before(async () => {
        testData.userContext = testData.tenantContext.getUserContext(CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN);
        if (testData.userContext === testData.centralUserContext) {
          // Reuse the central user service (to avoid double login)
          testData.userService = testData.centralUserService;
        } else {
          testData.userService = new CentralServerService(
            testData.tenantContext.getTenant().subdomain,
            testData.userContext
          );
        }
      });

      beforeEach(async () => {
        // Create a new Company
        testData.newCompany = await testData.userService.createEntity(
          testData.userService.companyApi,
          Factory.company.build()
        );
        testData.createdCompanies.push(testData.newCompany);
        // Check
        expect(testData.newCompany).to.not.be.null;
        // Create a new Site
        testData.newSite = await testData.userService.createEntity(
          testData.userService.siteApi,
          Factory.site.build({
            companyID: testData.newCompany.id
          })
        );
        testData.createdSites.push(testData.newSite);
        // Check
        expect(testData.newSite).to.not.be.null;
        // Create a new Site Area
        testData.newSiteArea = await testData.userService.createEntity(
          testData.userService.siteAreaApi,
          Factory.siteArea.build({
            siteID: testData.newSite.id
          })
        );
        testData.createdSiteAreas.push(testData.newSiteArea);
        expect(testData.newSiteArea).to.not.be.null;
      });

      afterEach(async () => {
        // Delete the new Company
        await testData.centralUserService.deleteEntity(
          testData.centralUserService.companyApi,
          testData.newCompany,
          false
        );
        // Delete the new site
        await testData.centralUserService.deleteEntity(
          testData.centralUserService.siteApi,
          testData.newSite,
          false
        );
        // Delete the new site area
        await testData.centralUserService.deleteEntity(
          testData.centralUserService.siteAreaApi,
          testData.newSiteArea,
          false
        );
      });

      it('Should be able to delete a site which will automatically delete the site area', async () => {
        // Delete the Site
        await testData.userService.deleteEntity(
          testData.userService.siteApi,
          testData.newSite
        );
        // Check Site does not exist
        await testData.userService.checkDeletedEntityById(
          testData.userService.siteApi,
          testData.newSite
        );
        // Check Site Area does not exist
        await testData.userService.checkDeletedEntityById(
          testData.userService.siteAreaApi,
          testData.newSiteArea
        );
      });

      it('Should be able to delete a company which will automatically delete the site and the site area', async () => {
        // Delete the Site
        await testData.userService.deleteEntity(
          testData.userService.companyApi,
          testData.newCompany
        );
        // Check Company does not exist
        await testData.userService.checkDeletedEntityById(
          testData.userService.companyApi,
          testData.newCompany
        );
        // Check Site does not exist
        await testData.userService.checkDeletedEntityById(
          testData.userService.siteApi,
          testData.newSite
        );
        // Check Site Area does not exist
        await testData.userService.checkDeletedEntityById(
          testData.userService.siteAreaApi,
          testData.newSiteArea
        );
      });

    });

  });

});
