import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import moment from 'moment';
import responseHelper from '../../helpers/responseHelper';
import CONTEXTS from '../contextProvider/ContextConstants';
import TenantContext from './TenantContext';
import User from '../../types/User';
import CentralServerService from '../client/CentralServerService';

chai.use(chaiSubset);
chai.use(responseHelper);

export default class StatisticsContext {

  static readonly USERS: any = [
    CONTEXTS.USER_CONTEXTS.DEFAULT_ADMIN,
    CONTEXTS.USER_CONTEXTS.BASIC_USER
  ];

  static readonly CONSTANTS: any = {
    TRANSACTION_YEARS: 2,
    CHARGING_MINUTES: 80,
    IDLE_MINUTES: 40,
    ENERGY_PER_MINUTE: 150,
    INTERVAL_METER_VALUES: 10
  };

  public transactionUser: User;
  public transactionUserService: CentralServerService;

  private tenantContext: TenantContext;
  private chargingStations: any[] = [];

  constructor(tenantContext: TenantContext) {
    this.tenantContext = tenantContext;
  }

  public async createTestData(siteName, siteAreaName) {
    let firstYear = 0;
    const siteContext = this.tenantContext.getSiteContext(siteName);
    const siteAreaContext = siteContext.getSiteAreaContext(siteAreaName);
    this.chargingStations = siteAreaContext.getChargingStations();
    const users = Array.from(StatisticsContext.USERS, (user) => this.tenantContext.getUserContext(user));

    const startYear = new Date().getFullYear();
    for (let yr = 0; yr < StatisticsContext.CONSTANTS.TRANSACTION_YEARS; yr++) {
      firstYear = startYear - yr;

      let startTime = moment().year(firstYear).startOf('year').add({ hours: 12 });
      for (const chargingStation of this.chargingStations) {
        for (const user of users) {
          this.setUser(user);
          startTime = startTime.clone().add(1, 'days');
          let response = await chargingStation.startTransaction(1, user.tagIDs[0], 0, startTime);
          expect(response).to.be.transactionValid;
          const transactionId = response.data.transactionId;

          for (let m = 1; m < StatisticsContext.CONSTANTS.CHARGING_MINUTES + StatisticsContext.CONSTANTS.IDLE_MINUTES; m++) {

            if (m % StatisticsContext.CONSTANTS.INTERVAL_METER_VALUES === 0) {
              const meterTime = startTime.clone().add(m, 'minutes');
              if (m > StatisticsContext.CONSTANTS.CHARGING_MINUTES) {
                response = await chargingStation.sendConsumptionMeterValue(1, transactionId, StatisticsContext.CONSTANTS.ENERGY_PER_MINUTE * StatisticsContext.CONSTANTS.CHARGING_MINUTES, meterTime);
              } else {
                response = await chargingStation.sendConsumptionMeterValue(1, transactionId, StatisticsContext.CONSTANTS.ENERGY_PER_MINUTE * m, meterTime);
              }
            }
          }
          const endTime = startTime.clone().add(StatisticsContext.CONSTANTS.CHARGING_MINUTES + StatisticsContext.CONSTANTS.IDLE_MINUTES, 'minutes');
          response = await chargingStation.stopTransaction(transactionId, user.tagIDs[0], StatisticsContext.CONSTANTS.ENERGY_PER_MINUTE * StatisticsContext.CONSTANTS.CHARGING_MINUTES, endTime);
          expect(response).to.be.transactionStatus('Accepted');
          response = await this.transactionUserService.transactionApi.readById(transactionId);
          expect(response.status).to.eql(200);
        }
      }
    }
    return firstYear;
  }

  public async deleteTestData() {
    if (Array.isArray(this.chargingStations)) {
      for (const chargingStation of this.chargingStations) {
        await chargingStation.cleanUpCreatedData();
      }
    }
  }

  public setUser(userContext) {
    expect(userContext).to.exist;
    this.transactionUser = userContext;
    this.transactionUserService = new CentralServerService(this.tenantContext.getTenant().subdomain, this.transactionUser);
  }

}
