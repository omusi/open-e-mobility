import Logging from '../../../utils/Logging';
import moment from 'moment';
import Constants from '../../../utils/Constants';
import Authorizations from '../../../authorization/Authorizations';
import StatisticSecurity from './security/StatisticSecurity';
import StatisticsStorage from '../../../storage/mongodb/StatisticsStorage';

export default class StatisticService {
  static async handleUserUsageStatistics(action, req, res, next) {
    try {
      // Filter
      const filteredRequest = StatisticSecurity.filterStatisticsRequest(req.query, req.user);
      // Build filter
      const filter = StatisticService.buildFilter(filteredRequest, req.user);
      // Get Stats
      const transactions = await StatisticsStorage.getUserStats(req.user.tenantID, filter, Constants.STATS_GROUP_BY_USAGE);
      // Return
      res.json(transactions);
      next();
    } catch (error) {
      // Log
      Logging.logActionExceptionMessageAndSendResponse(action, error, req, res, next);
    }
  }

  static async handleGetUserConsumptionStatistics(action, req, res, next) {
    try {
      // Filter
      const filteredRequest = StatisticSecurity.filterStatisticsRequest(req.query, req.user);
      // Build filter
      const filter = StatisticService.buildFilter(filteredRequest, req.user);
      // Get Stats
      const transactions = await StatisticsStorage.getUserStats(req.user.tenantID, filter, Constants.STATS_GROUP_BY_CONSUMPTION);
      // Return
      res.json(transactions);
      next();
    } catch (error) {
      // Log
      Logging.logActionExceptionMessageAndSendResponse(action, error, req, res, next);
    }
  }

  static async handleGetChargingStationUsageStatistics(action, req, res, next) {
    try {
      // Filter
      const filteredRequest = StatisticSecurity.filterStatisticsRequest(req.query, req.user);
      // Build filter
      const filter = StatisticService.buildFilter(filteredRequest, req.user);
      // Get Stats
      const transactions = await StatisticsStorage.getChargingStationStats(req.user.tenantID, filter, Constants.STATS_GROUP_BY_USAGE);
      // Return
      res.json(transactions);
      next();
    } catch (error) {
      // Log
      Logging.logActionExceptionMessageAndSendResponse(action, error, req, res, next);
    }
  }

  static async handleGetCurrentMetrics(action, req, res, next) {
    try {
      // Filter
      const filteredRequest = StatisticSecurity.filterMetricsStatisticsRequest(req.query, req.user);
      // Get Data
      const metrics = await StatisticsStorage.getCurrentMetrics(req.user.tenantID, filteredRequest);
      // Return
      res.json(metrics);
      next();
    } catch (error) {
      // Log
      Logging.logActionExceptionMessageAndSendResponse(action, error, req, res, next);
    }
  }

  static async handleGetChargingStationConsumptionStatistics(action, req, res, next) {
    try {
      // Filter
      const filteredRequest = StatisticSecurity.filterStatisticsRequest(req.query, req.user);
      // Build filter
      const filter = StatisticService.buildFilter(filteredRequest, req.user);
      // Get Stats
      const transactions = await StatisticsStorage.getChargingStationStats(req.user.tenantID, filter, Constants.STATS_GROUP_BY_CONSUMPTION);
      // Return
      res.json(transactions);
      next();
    } catch (error) {
      // Log
      Logging.logActionExceptionMessageAndSendResponse(action, error, req, res, next);
    }
  }

  static buildFilter(filteredRequest, loggedUser) {
    // Only completed transactions
    const filter: any = { stop: {$exists: true} };
    // Date
    if ('Year' in filteredRequest) {
      if (filteredRequest.Year > 0) {
        filter.startDateTime = moment().year(filteredRequest.Year).startOf('year').toDate().toISOString();
        filter.endDateTime = moment().year(filteredRequest.Year).endOf('year').toDate().toISOString();
      }
    } else {
      // Current year
      filter.startDateTime = moment().startOf('year').toDate().toISOString();
      filter.endDateTime = moment().endOf('year').toDate().toISOString();
    }
    // Site
    if (filteredRequest.SiteID) {
      filter.siteID = filteredRequest.SiteID;
    }
    // Site Area
    if (filteredRequest.SiteAreaID) {
      filter.siteAreaID = filteredRequest.SiteAreaID;
    }
    // Charge Box
    if (filteredRequest.ChargeBoxID) {
      filter.chargeBoxID = filteredRequest.ChargeBoxID;
    }
    // User
    if (Authorizations.isBasic(loggedUser)) {
      // Only for current user
      filter.userID = loggedUser.id;
    } else if (!Authorizations.isBasic(loggedUser) && filteredRequest.UserID) {
      filter.userID = filteredRequest.UserID;
    }
    return filter;
  }
}
