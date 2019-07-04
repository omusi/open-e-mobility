// Goal : Checks related to settings
// Note : These unit tests use the tenant utall. This tenant should exist prior running these tests.
//        Run npm run test:createContext to create the needed utall if not present.

import path from 'path';
import global from '../../src/types/GlobalType';
global.appRoot = path.resolve(__dirname, '../../src');
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import CentralServerService from './client/CentralServerService';
import Constants from './client/utils/Constants';
import config from '../config';
import responseHelper from '../helpers/responseHelper';

chai.use(chaiSubset);
chai.use(responseHelper);

import TestData from './client/utils/TestData';

const testData: TestData = new TestData();

describe('Setting tests', function() {
  this.timeout(30000);

  before( async function() {
    // Init values
    testData.centralService = new CentralServerService('utall', { email: config.get('admin.username'), password: config.get('admin.password') });
  });

  after( async function() {
    // Housekeeping
  });


  describe('Success cases', () => {
    it('Check that retrieving refund settings filtered by identifier returns just one result', async () => {
      // Retrieve the setting id
      let read = await testData.centralService.settingApi.readAll({ "Identifier" : "refund" },{ limit: Constants.UNLIMITED, skip: 0 });
      expect(read.status).to.equal(200);
      expect(read.data.count).to.equal(1);
    });
    it('Check that retrieving pricing settings filtered by identifier returns just one result', async () => {
      // Retrieve the setting id
      let read = await testData.centralService.settingApi.readAll({ "Identifier" : "pricing" },{ limit: Constants.UNLIMITED, skip: 0 });
      expect(read.status).to.equal(200);
      expect(read.data.count).to.equal(1);
    });
    it('Check that retrieving organization settings filtered by identifier returns just one result', async () => {
      // Retrieve the setting id
      let read = await testData.centralService.settingApi.readAll({ "Identifier" : "organization" },{ limit: Constants.UNLIMITED, skip: 0 });
      expect(read.status).to.equal(200);
      expect(read.data.count).to.equal(1);
    });
    it('Check that retrieving analytics settings filtered by identifier returns just one result', async () => {
      // Retrieve the setting id
      let read = await testData.centralService.settingApi.readAll({ "Identifier" : "analytics" },{ limit: Constants.UNLIMITED, skip: 0 });
      expect(read.status).to.equal(200);
      expect(read.data.count).to.equal(1);
    });
    it('Check that retrieving ocpi settings filtered by identifier returns just one result', async () => {
      // Retrieve the setting id
      let read = await testData.centralService.settingApi.readAll({ "Identifier" : "ocpi" },{ limit: Constants.UNLIMITED, skip: 0 });
      expect(read.status).to.equal(200);
      expect(read.data.count).to.equal(1);
    });
    it('Check that retrieving statistics settings filtered by identifier returns just one result', async () => {
      // Retrieve the setting id
      let read = await testData.centralService.settingApi.readAll({ "Identifier" : "statistics" },{ limit: Constants.UNLIMITED, skip: 0 });
      expect(read.status).to.equal(200);
      expect(read.data.count).to.equal(1);
    });
  });
});
