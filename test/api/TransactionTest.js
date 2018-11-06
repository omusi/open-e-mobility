const chai = require('chai');
const {expect} = require('chai');
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const moment = require('moment');
const faker = require('faker');
const DataHelper = require('./DataHelper');
const CentralServerService = require('../api/client/CentralServerService');

describe('Transaction tests', function() {
  this.timeout(10000);
  before(async () => {
    this.dataHelper = new DataHelper('1.6');
  });

  after(async () => {
    this.dataHelper.close();
    this.dataHelper.destroyData();
  });

  describe('readById', () => {
    it('read a not existing transaction', async () => {
      const response = await CentralServerService.transactionApi.readById(faker.random.number(100000));
      expect(response.status).to.equal(550);
    });
    it('read with invalid id', async () => {
      const response = await CentralServerService.transactionApi.readById(`&é"'(§è!çà)`);
      expect(response.status).to.equal(550);
    });
    it('read without providing id', async () => {
      const response = await CentralServerService.transactionApi.readById();
      expect(response.status).to.equal(500);
    });
    it('read a started transaction', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = faker.random.number({min: 0, max: 1000});
      const startDate = moment();

      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      const response = await CentralServerService.transactionApi.readById(transactionId);
      expect(response.status).to.equal(200);
      expect(response.data).to.containSubset({
        id: transactionId,
        timestamp: startDate.toISOString(),
        connectorId: connectorId,
        tagID: tagId,
        chargeBoxID: chargingStation.id,
        currentConsumption: 0,
        totalConsumption: 0,
        totalInactivitySecs: 0,
        meterStart: meterStart,
        user: {
          id: user.id,
          firstName: user.firstName,
          name: user.name,
        }
      });
    });
    it('read a started transaction with one meter value', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 180;
      const startDate = moment();
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);

      const load = 100;
      const currentTime = startDate.clone().add(1, 'hour');
      await this.dataHelper.sendMeterValue(chargingStation, connectorId, transactionId, meterStart + load, currentTime);

      const response = await CentralServerService.transactionApi.readById(transactionId);
      expect(response.status).to.equal(200);
      expect(response.data).to.containSubset({
        id: transactionId,
        timestamp: startDate.toISOString(),
        connectorId: connectorId,
        tagID: tagId,
        chargeBoxID: chargingStation.id,
        currentConsumption: load,
        totalConsumption: load,
        totalInactivitySecs: 0,
        meterStart: meterStart,
        user: {
          id: user.id,
          firstName: user.firstName,
          name: user.name,
        }
      });
    });
    it('read a started transaction with multiple meter values', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 180;
      const startDate = moment();
      const currentTime = startDate.clone();
      let cumulated = meterStart;
      let load = 0;
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);

      load = 100;
      cumulated += load;
      currentTime.add(1, 'hour');
      await this.dataHelper.sendMeterValue(chargingStation, connectorId, transactionId, cumulated, currentTime);

      load = 50;
      cumulated += load;
      currentTime.add(1, 'hour');
      await this.dataHelper.sendMeterValue(chargingStation, connectorId, transactionId, cumulated, currentTime);

      const response = await CentralServerService.transactionApi.readById(transactionId);
      expect(response.status).to.equal(200);
      expect(response.data).to.containSubset({
        id: transactionId,
        currentConsumption: load,
        totalConsumption: cumulated - meterStart,
        totalInactivitySecs: 0,
        meterStart: meterStart,
      });
    });
    it('read a closed transaction without meter values and no meterStart', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      const meterStop = 0;
      const startDate = moment();
      const stopDate = startDate.clone().add(1, 'hour');
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      await this.dataHelper.stopTransaction(chargingStation, transactionId, tagId, meterStop, stopDate);

      const response = await CentralServerService.transactionApi.readById(transactionId);
      expect(response.status).to.equal(200);
      expect(response.data).to.containSubset({
        id: transactionId,
        currentConsumption: 0,
        totalConsumption: 0,
        totalInactivitySecs: 0,
        meterStart: meterStart,
        meterStop: meterStop,
        stop: {
          timestamp: stopDate.toISOString(),
          tagID: tagId,
        }
      });

    });
    it('read a closed transaction without meter values and a meterStart different from meterStop', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      const meterStop = 1000;
      const startDate = moment();
      const stopDate = startDate.clone().add(1, 'hour');
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      await this.dataHelper.stopTransaction(chargingStation, transactionId, tagId, meterStop, stopDate);

      const response = await CentralServerService.transactionApi.readById(transactionId);
      expect(response.status).to.equal(200);
      expect(response.data).to.containSubset({
        id: transactionId,
        currentConsumption: 0,
        totalConsumption: 1000,
        totalInactivitySecs: 0,
        meterStart: meterStart,
        meterStop: meterStop,
        stop: {
          timestamp: stopDate.toISOString(),
          tagID: tagId,
        }
      });
    });
  });


  describe('readAllCompleted', () => {
    it('no transactions completed', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      const startDate = moment();
      await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);

      const response = await CentralServerService.transactionApi.readAllCompleted({ChargeBoxID: chargingStation.id});
      expect(response.status).to.equal(200);
      expect(response.data.count).to.equal(0);
    });
    it('some transactions completed', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      const meterStop = 1000;
      const startDate = moment();
      const stopDate = startDate.clone().add(1, 'hour');
      const transactionId1 = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      await this.dataHelper.stopTransaction(chargingStation, transactionId1, tagId, meterStop, stopDate);
      const transactionId2 = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      await this.dataHelper.stopTransaction(chargingStation, transactionId2, tagId, meterStop, stopDate);

      const response = await CentralServerService.transactionApi.readAllCompleted({ChargeBoxID: chargingStation.id});
      expect(response.status).to.equal(200);
      expect(response.data.count).to.equal(2);
      expect(response.data.result).to.containSubset([{
        id: transactionId1,
        currentConsumption: 0,
        totalConsumption: 1000,
        totalInactivitySecs: 0,
        meterStart: meterStart,
        meterStop: meterStop,
        stop: {
          timestamp: stopDate.toISOString(),
          tagID: tagId,
        }
      }, {
        id: transactionId2,
        currentConsumption: 0,
        totalConsumption: 1000,
        totalInactivitySecs: 0,
        meterStart: meterStart,
        meterStop: meterStop,
        stop: {
          timestamp: stopDate.toISOString(),
          tagID: tagId,
        }
      }]);
    });
  });

  describe('readAllConsumption', () => {
    it('read consumption of a started transaction without meter values', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      const startDate = moment();
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      // await this.dataHelper.stopTransaction(chargingStation, transactionId, tagId, meterStop, stopDate);

      const response = await CentralServerService.transactionApi.readAllConsumption({TransactionId: transactionId});
      expect(response.status).to.equal(200);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: []
      });
    });
    it('read consumption of a started transaction with multiple meter values', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 180;
      const startDate = moment();
      const currentTime = startDate.clone();
      let cumulated = meterStart;
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);

      const meterValues = [
        {
          value: 100,
          instant: currentTime.add(1, 'hour').clone()
        },
        {
          value: 50,
          instant: currentTime.add(1, 'hour').clone()
        }
      ];

      for (const meterValue of meterValues) {
        cumulated += meterValue.value;
        await this.dataHelper.sendMeterValue(chargingStation, connectorId, transactionId, cumulated, meterValue.instant);
      }

      const response = await CentralServerService.transactionApi.readAllConsumption({TransactionId: transactionId});
      expect(response.status).to.equal(200);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          },
          {
            date: meterValues[1].instant.toISOString(),
            value: meterValues[1].value,
            cumulated: cumulated - meterStart
          }
        ]
      });
    });

    it('read consumption of a started transaction with multiple meter values and different date parameters', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 180;
      const startDate = moment('2018-11-06T08:00:00.000Z');
      let cumulated = meterStart;
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);

      const meterValues = [
        {
          value: 100,
          instant: startDate.clone().add(1, 'hour')
        },
        {
          value: 50,
          instant: startDate.clone().add(2, 'hour')
        }
      ];

      for (const meterValue of meterValues) {
        cumulated += meterValue.value;
        await this.dataHelper.sendMeterValue(chargingStation, connectorId, transactionId, cumulated, meterValue.instant);
      }

      let response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().subtract(1, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(2);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          },
          {
            date: meterValues[1].instant.toISOString(),
            value: meterValues[1].value,
            cumulated: cumulated - meterStart
          }
        ]
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().subtract(2, "hour").toISOString(),
        EndDateTime: startDate.clone().subtract(1, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(0);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: []
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().subtract(1, "hour").toISOString(),
        EndDateTime: startDate.clone().subtract(0, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(0);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: []
      });


      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().subtract(1, "hour").toISOString(),
        EndDateTime: startDate.clone().add(30, "minutes").toISOString()
      });
      expect(response.data.values).has.lengthOf(0);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: []
      });
      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().subtract(1, "hour").toISOString(),
        EndDateTime: startDate.clone().add(1, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(1);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          }
        ]
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().subtract(1, "hour").toISOString(),
        EndDateTime: startDate.clone().add(1.5, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(1);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          }
        ]
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().subtract(1, "hour").toISOString(),
        EndDateTime: startDate.clone().add(3, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(2);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          },
          {
            date: meterValues[1].instant.toISOString(),
            value: meterValues[1].value,
            cumulated: meterValues[1].value + meterValues[0].value
          }
        ]
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().add(1, "hour").toISOString(),
        EndDateTime: startDate.clone().add(2, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(2);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          },
          {
            date: meterValues[1].instant.toISOString(),
            value: meterValues[1].value,
            cumulated: meterValues[1].value + meterValues[0].value
          }
        ]
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().add(1.5, "hour").toISOString(),
        EndDateTime: startDate.clone().add(2, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(1);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[1].instant.toISOString(),
            value: meterValues[1].value,
            cumulated: meterValues[1].value + meterValues[0].value
          }
        ]
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().add(2, "hour").toISOString(),
        EndDateTime: startDate.clone().add(3, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(1);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[1].instant.toISOString(),
            value: meterValues[1].value,
            cumulated: meterValues[1].value + meterValues[0].value
          }
        ]
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        StartDateTime: startDate.clone().add(2.5, "hour").toISOString(),
        EndDateTime: startDate.clone().add(3, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(0);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: []
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        EndDateTime: startDate.clone().toISOString()
      });
      expect(response.data.values).has.lengthOf(0);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: []
      });

      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        EndDateTime: startDate.clone().add(1, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(1);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          }
        ]
      });
      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        EndDateTime: startDate.clone().add(2.5, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(2);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          },
          {
            date: meterValues[1].instant.toISOString(),
            value: meterValues[1].value,
            cumulated: meterValues[1].value + meterValues[0].value
          }
        ]
      });
      response = await CentralServerService.transactionApi.readAllConsumption({
        TransactionId: transactionId,
        EndDateTime: startDate.clone().add(4, "hour").toISOString()
      });
      expect(response.data.values).has.lengthOf(2);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: meterValues[0].instant.toISOString(),
            value: meterValues[0].value,
            cumulated: meterValues[0].value
          },
          {
            date: meterValues[1].instant.toISOString(),
            value: meterValues[1].value,
            cumulated: meterValues[1].value + meterValues[0].value
          }
        ]
      });
    });
    it('read consumption of a stopped transaction without meter values', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      const meterStop = 1000;
      const startDate = moment();
      const stopDate = startDate.clone().add(1, 'hour');
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      await this.dataHelper.stopTransaction(chargingStation, transactionId, tagId, meterStop, stopDate);

      const response = await CentralServerService.transactionApi.readAllConsumption({TransactionId: transactionId});
      expect(response.status).to.equal(200);
      expect(response.data).to.containSubset({
        id: transactionId,
        values: [
          {
            date: stopDate.toISOString(),
            value: meterStop - meterStart,
            cumulated: meterStop
          }
        ]
      });
    });
  });

  describe('getTransactionsActive', () => {
    it('read on a charger without active transactions', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const response = await CentralServerService.transactionApi.readAllActive({ChargeBoxID: chargingStation.id});
      expect(response.status).to.equal(200);
      expect(response.data.count).to.equal(0);
    });
    it('read on a charger with multiple active transactions', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId1 = 1;
      const connectorId2 = 2;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      const meterStop = 1000;
      const startDate = moment();
      const stopDate = startDate.clone().add(1, 'hour');
      const transactionId1 = await this.dataHelper.startTransaction(chargingStation, connectorId1, tagId, meterStart, startDate);
      await this.dataHelper.stopTransaction(chargingStation, transactionId1, tagId, meterStop, stopDate);
      const transactionId2 = await this.dataHelper.startTransaction(chargingStation, connectorId1, tagId, meterStart, startDate);
      const transactionId3 = await this.dataHelper.startTransaction(chargingStation, connectorId2, tagId, meterStart, startDate);


      const response = await CentralServerService.transactionApi.readAllActive({ChargeBoxID: chargingStation.id});
      expect(response.status).to.equal(200);
      expect(response.data.count).to.equal(2);
      expect(response.data.result).to.containSubset([
        {
          id: transactionId2
        }, {
          id: transactionId3
        }
      ]);
    });
  });
  describe('delete', () => {
    it('delete a not existing transaction', async () => {
      const response = await CentralServerService.transactionApi.delete(faker.random.number(100000));
      expect(response.status).to.equal(550);
    });
    it('delete with invalid id', async () => {
      const response = await CentralServerService.transactionApi.delete(`&é"'(§è!çà)`);
      expect(response.status).to.equal(550);
    });
    it('delete without providing id', async () => {
      const response = await CentralServerService.transactionApi.delete();
      expect(response.status).to.equal(500);
    });
    it('delete a started transaction', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      // const meterStop = 1000;
      const startDate = moment();
      // const stopDate = startDate.clone().add(1, 'hour');
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      // await this.dataHelper.stopTransaction(chargingStation, transactionId1, tagId, meterStop, stopDate);
      let response = await CentralServerService.transactionApi.delete(transactionId);
      expect(response.status).to.equal(200);
      response = await CentralServerService.transactionApi.readById(transactionId);
      expect(response.status).to.equal(550);
    });
    it('delete a closed transaction', async () => {
      const user = await this.dataHelper.createUser();
      const company = await this.dataHelper.createCompany();
      const site = await this.dataHelper.createSite(company, [user]);
      const chargingStation = await this.dataHelper.createChargingStation();
      await this.dataHelper.createSiteArea(site, [chargingStation]);
      const connectorId = 1;
      const tagId = user.tagIDs[0];
      const meterStart = 0;
      const meterStop = 1000;
      const startDate = moment();
      const stopDate = startDate.clone().add(1, 'hour');
      const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
      await this.dataHelper.stopTransaction(chargingStation, transactionId, tagId, meterStop, stopDate);
      let response = await CentralServerService.transactionApi.delete(transactionId);
      expect(response.status).to.equal(200);
      response = await CentralServerService.transactionApi.readById(transactionId);
      expect(response.status).to.equal(550);
    });
  });
  it('a mail notification should be received when starting a transaction', async () => {
    const user = await this.dataHelper.createUser();
    const company = await this.dataHelper.createCompany();
    const site = await this.dataHelper.createSite(company, [user]);
    const chargingStation = await this.dataHelper.createChargingStation();
    await this.dataHelper.createSiteArea(site, [chargingStation]);
    const connectorId = 1;
    const tagId = user.tagIDs[0];
    const meterStart = 180;
    const meterStop = 1000;
    const startDate = moment('2018-11-06T08:00:00.000Z');
    const stopDate = startDate.clone().add(1, 'hour');
    const transactionId = await this.dataHelper.startTransaction(chargingStation, connectorId, tagId, meterStart, startDate);
    const currentDate = startDate.clone();

    const meterValues = [
      {
        value: 100,
        instant: currentDate.add(1, 'hour').clone()
      },
      {
        value: 50,
        instant: currentDate.add(1, 'hour').clone()
      },
      {
        value: 0,
        instant: currentDate.add(1, 'hour').clone()
      },
      {
        value: 0,
        instant: currentDate.add(1, 'hour').clone()
      }
    ];

    let cumulated = meterStart;
    for (const meterValue of meterValues) {
      cumulated += meterValue.value;
      await this.dataHelper.sendMeterValue(chargingStation, connectorId, transactionId, cumulated, meterValue.instant);
    }

    expect(await CentralServerService.mailApi.isMailReceived(user.email, 'transaction-started')).is.equal(true,"no transaction-started mail received");
    expect(await CentralServerService.mailApi.isMailReceived(user.email, 'end-of-charge')).is.equal(true,"no end-of-charge mail received");
  });

});

