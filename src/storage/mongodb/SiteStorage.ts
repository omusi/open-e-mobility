import Site, { SiteUser } from '../../types/Site';
import User, { UserSite } from '../../types/User';
import global, { Image } from '../../types/GlobalType';

import ChargingStationStorage from './ChargingStationStorage';
import Constants from '../../utils/Constants';
import Cypher from '../../utils/Cypher';
import { DataResult } from '../../types/DataResult';
import DatabaseUtils from './DatabaseUtils';
import DbParams from '../../types/database/DbParams';
import Logging from '../../utils/Logging';
import { ObjectID } from 'mongodb';
import SiteAreaStorage from './SiteAreaStorage';
import Utils from '../../utils/Utils';

const MODULE_NAME = 'SiteStorage';

export default class SiteStorage {
  public static async getSite(tenantID: string, id: string,
    params: { withCompany?: boolean } = {}): Promise<Site> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'getSite');
    // Query single Site
    const sitesMDB = await SiteStorage.getSites(tenantID,
      { siteID: id, withCompany: params.withCompany },
      Constants.DB_PARAMS_SINGLE_RECORD);
    // Debug
    Logging.traceEnd(MODULE_NAME, 'getSite', uniqueTimerID, { id });
    return sitesMDB.count > 0 ? sitesMDB.result[0] : null;
  }

  public static async getSiteImage(tenantID: string, id: string): Promise<Image> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'getSiteImage');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Read DB
    const siteImageMDB = await global.database.getCollection<{ _id: ObjectID; image: string }>(tenantID, 'siteimages')
      .findOne({ _id: Utils.convertToObjectID(id) });
    // Debug
    Logging.traceEnd(MODULE_NAME, 'getSiteImage', uniqueTimerID, { id });
    return {
      id: id,
      image: siteImageMDB ? siteImageMDB.image : null
    };
  }

  public static async removeUsersFromSite(tenantID: string, siteID: string, userIDs: string[]): Promise<void> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'removeUsersFromSite');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Site provided?
    if (siteID) {
      // At least one User
      if (userIDs && userIDs.length > 0) {
        // Execute
        await global.database.getCollection<any>(tenantID, 'siteusers').deleteMany({
          'userID': { $in: userIDs.map((userID) => Utils.convertToObjectID(userID)) },
          'siteID': Utils.convertToObjectID(siteID)
        });
      }
    }
    // Debug
    Logging.traceEnd(MODULE_NAME, 'removeUsersFromSite', uniqueTimerID, { siteID, userIDs });
  }

  public static async addUsersToSite(tenantID: string, siteID: string, userIDs: string[]): Promise<void> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'addUsersToSite');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Site provided?
    if (siteID) {
      // At least one User
      if (userIDs && userIDs.length > 0) {
        const siteUsers = [];
        // Create the list
        for (const userID of userIDs) {
          // Add
          siteUsers.push({
            '_id': Cypher.hash(`${siteID}~${userID}`),
            'userID': Utils.convertToObjectID(userID),
            'siteID': Utils.convertToObjectID(siteID),
            'siteAdmin': false
          });
        }
        // Execute
        await global.database.getCollection<any>(tenantID, 'siteusers').insertMany(siteUsers);
      }
    }
    // Debug
    Logging.traceEnd(MODULE_NAME, 'addUsersToSite', uniqueTimerID, { siteID, userIDs });
  }

  public static async getUsers(tenantID: string,
    params: { search?: string; siteID: string; siteOwnerOnly?: boolean },
    dbParams: DbParams, projectFields?: string[]): Promise<DataResult<UserSite>> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'getUsers');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Check Limit
    const limit = Utils.checkRecordLimit(dbParams.limit);
    // Check Skip
    const skip = Utils.checkRecordSkip(dbParams.skip);
    // Create Aggregation
    const aggregation: any[] = [];
    // Filter
    aggregation.push({
      $match: {
        siteID: Utils.convertToObjectID(params.siteID)
      }
    });
    if (params.siteOwnerOnly) {
      aggregation.push({
        $match: {
          siteOwner: true
        }
      });
    }
    // Get users
    DatabaseUtils.pushUserLookupInAggregation({
      tenantID, aggregation, localField: 'userID', foreignField: '_id',
      asField: 'user', oneToOneCardinality: true, oneToOneCardinalityNotNull: true
    });
    // Filter deleted users
    aggregation.push({
      $match: {
        '$or': DatabaseUtils.getNotDeletedFilter('user')
      }
    });
    // Another match for searching on Users
    if (params.search) {
      aggregation.push({
        $match: {
          $or: [
            { 'user.name': { $regex: params.search, $options: 'i' } },
            { 'user.firstName': { $regex: params.search, $options: 'i' } },
            { 'user.email': { $regex: params.search, $options: 'i' } }
          ]
        }
      });
    }
    // Convert IDs to String
    DatabaseUtils.pushConvertObjectIDToString(aggregation, 'userID');
    DatabaseUtils.pushConvertObjectIDToString(aggregation, 'siteID');
    // Limit records?
    if (!dbParams.onlyRecordCount) {
      // Always limit the nbr of record to avoid perfs issues
      aggregation.push({ $limit: Constants.DB_RECORD_COUNT_CEIL });
    }
    // Count Records
    const usersCountMDB = await global.database.getCollection<DataResult<SiteUser>>(tenantID, 'siteusers')
      .aggregate([...aggregation, { $count: 'count' }], { allowDiskUse: true })
      .toArray();
    // Check if only the total count is requested
    if (dbParams.onlyRecordCount) {
      return {
        count: (usersCountMDB.length > 0 ? usersCountMDB[0].count : 0),
        result: []
      };
    }
    // Remove the limit
    aggregation.pop();
    // Sort
    if (dbParams.sort) {
      aggregation.push({
        $sort: dbParams.sort
      });
    } else {
      aggregation.push({
        $sort: { 'user.name': 1, 'user.firstName': 1 }
      });
    }
    // Skip
    aggregation.push({
      $skip: skip
    });
    // Limit
    aggregation.push({
      $limit: limit
    });
    // Project
    DatabaseUtils.projectFields(aggregation, projectFields);
    // Read DB
    const siteUsersMDB = await global.database.getCollection<{ user: User; siteID: string; siteAdmin: boolean; siteOwner: boolean }>(tenantID, 'siteusers')
      .aggregate(aggregation, {
        collation: { locale: Constants.DEFAULT_LOCALE, strength: 2 },
        allowDiskUse: true
      })
      .toArray();
    const users: UserSite[] = [];
    // Convert to typed object
    for (const siteUserMDB of siteUsersMDB) {
      if (siteUserMDB.user) {
        users.push({
          user: siteUserMDB.user, siteID: params.siteID,
          siteAdmin: !siteUserMDB.siteAdmin ? false : siteUserMDB.siteAdmin,
          siteOwner: !siteUserMDB.siteOwner ? false : siteUserMDB.siteOwner
        });
      }
    }
    // Debug
    Logging.traceEnd(MODULE_NAME, 'getUsers', uniqueTimerID, { siteID: params.siteID });
    // Ok
    return {
      count: (usersCountMDB.length > 0 ?
        (usersCountMDB[0].count === Constants.DB_RECORD_COUNT_CEIL ? -1 : usersCountMDB[0].count) : 0),
      result: users
    };
  }

  public static async updateSiteOwner(tenantID: string, siteID: string, userID: string, siteOwner: boolean): Promise<void> {
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'updateSiteOwner');
    await Utils.checkTenant(tenantID);

    await global.database.getCollection<any>(tenantID, 'siteusers').updateMany(
      {
        siteID: Utils.convertToObjectID(siteID),
        siteOwner: true
      },
      {
        $set: { siteOwner: false }
      });
    await global.database.getCollection<any>(tenantID, 'siteusers').updateOne(
      {
        siteID: Utils.convertToObjectID(siteID),
        userID: Utils.convertToObjectID(userID)
      },
      {
        $set: { siteOwner: siteOwner }
      });
    Logging.traceEnd(MODULE_NAME, 'updateSiteOwner', uniqueTimerID, { siteID, userID });
  }

  public static async updateSiteUserAdmin(tenantID: string, siteID: string, userID: string, siteAdmin: boolean): Promise<void> {
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'updateSiteUserAdmin');
    await Utils.checkTenant(tenantID);

    await global.database.getCollection<any>(tenantID, 'siteusers').updateOne(
      {
        siteID: Utils.convertToObjectID(siteID),
        userID: Utils.convertToObjectID(userID)
      },
      {
        $set: { siteAdmin }
      });
    Logging.traceEnd(MODULE_NAME, 'updateSiteUserAdmin', uniqueTimerID, {
      siteID,
      userID,
      siteAdmin
    });
  }

  public static async saveSite(tenantID: string, siteToSave: Site, saveImage = true): Promise<string> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'saveSite');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    const siteFilter: any = {};
    // Build Request
    if (siteToSave.id) {
      siteFilter._id = Utils.convertToObjectID(siteToSave.id);
    } else {
      siteFilter._id = new ObjectID();
    }
    // Properties to save
    const siteMDB: any = {
      _id: siteFilter._id,
      address: siteToSave.address,
      issuer: Utils.convertToBoolean(siteToSave.issuer),
      companyID: Utils.convertToObjectID(siteToSave.companyID),
      autoUserSiteAssignment: Utils.convertToBoolean(siteToSave.autoUserSiteAssignment),
      name: siteToSave.name,
    };
    // Add Last Changed/Created props
    DatabaseUtils.addLastChangedCreatedProps(siteMDB, siteToSave);
    // Modify and return the modified document
    await global.database.getCollection<any>(tenantID, 'sites').findOneAndUpdate(
      siteFilter,
      { $set: siteMDB },
      { upsert: true }
    );
    if (saveImage) {
      await SiteStorage.saveSiteImage(tenantID, siteFilter._id.toHexString(), siteToSave.image);
    }
    // Debug
    Logging.traceEnd(MODULE_NAME, 'saveSite', uniqueTimerID, { siteToSave });
    return siteFilter._id.toHexString();
  }

  public static async saveSiteImage(tenantID: string, siteID: string, siteImageToSave: string): Promise<void> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'saveSiteImage');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Modify
    await global.database.getCollection(tenantID, 'siteimages').findOneAndUpdate(
      { _id: Utils.convertToObjectID(siteID) },
      { $set: { image: siteImageToSave } },
      { upsert: true, returnOriginal: false }
    );
    // Debug
    Logging.traceEnd(MODULE_NAME, 'saveSiteImage', uniqueTimerID);
  }

  public static async getSites(tenantID: string,
    params: {
      search?: string; companyIDs?: string[]; withAutoUserAssignment?: boolean; siteIDs?: string[];
      userID?: string; excludeSitesOfUserID?: boolean; siteID?: string; issuer?: boolean;
      withAvailableChargers?: boolean; withCompany?: boolean;
    } = {},
    dbParams: DbParams, projectFields?: string[]): Promise<DataResult<Site>> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'getSites');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Check Limit
    const limit = Utils.checkRecordLimit(dbParams.limit);
    // Check Skip
    const skip = Utils.checkRecordSkip(dbParams.skip);
    // Create Aggregation
    const aggregation = [];
    // Search filters
    const filters: any = {};
    if (params.siteID) {
      filters._id = Utils.convertToObjectID(params.siteID);
    } else if (params.search) {
      filters.$or = [
        { 'name': { $regex: Utils.escapeSpecialCharsInRegex(params.search), $options: 'i' } }
      ];
    }
    // Query by companyIDs
    if (params.companyIDs && Array.isArray(params.companyIDs) && params.companyIDs.length > 0) {
      filters.companyID = {
        $in: params.companyIDs.map((company) => Utils.convertToObjectID(company))
      };
    }
    if (params.issuer === true || params.issuer === false) {
      filters.issuer = params.issuer;
    }
    // Auto User Site Assignment
    if (params.withAutoUserAssignment) {
      filters.autoUserSiteAssignment = true;
    }
    // Limit on Site for Basic Users
    if (params.siteIDs && params.siteIDs.length > 0) {
      aggregation.push({
        $match: {
          _id: { $in: params.siteIDs.map((siteID) => Utils.convertToObjectID(siteID)) }
        }
      });
    }
    // Get users
    if (params.userID || params.excludeSitesOfUserID) {
      DatabaseUtils.pushCollectionLookupInAggregation('siteusers',
        { tenantID, aggregation, localField: '_id', foreignField: 'siteID', asField: 'siteusers' }
      );
      if (params.userID) {
        filters['siteusers.userID'] = Utils.convertToObjectID(params.userID);
      }
      if (params.excludeSitesOfUserID) {
        filters['siteusers.userID'] = { $ne: Utils.convertToObjectID(params.excludeSitesOfUserID) };
      }
    }
    // Set filters
    aggregation.push({
      $match: filters
    });
    // Limit records?
    if (!dbParams.onlyRecordCount) {
      aggregation.push({ $limit: Constants.DB_RECORD_COUNT_CEIL });
    }
    // Count Records
    const sitesCountMDB = await global.database.getCollection<any>(tenantID, 'sites')
      .aggregate([...aggregation, { $count: 'count' }], { allowDiskUse: true })
      .toArray();
    // Check if only the total count is requested
    if (dbParams.onlyRecordCount) {
      return {
        count: (sitesCountMDB.length > 0 ? sitesCountMDB[0].count : 0),
        result: []
      };
    }
    // Remove the limit
    aggregation.pop();
    // Add Company
    if (params.withCompany) {
      DatabaseUtils.pushCompanyLookupInAggregation(
        {
          tenantID, aggregation, localField: 'companyID', foreignField: '_id',
          asField: 'company', oneToOneCardinality: true
        });
    }
    // Convert Object ID to string
    DatabaseUtils.pushConvertObjectIDToString(aggregation, 'companyID');
    // Add Last Changed / Created
    DatabaseUtils.pushCreatedLastChangedInAggregation(tenantID, aggregation);
    // Handle the ID
    DatabaseUtils.pushRenameDatabaseID(aggregation);
    // Sort
    if (dbParams.sort) {
      aggregation.push({
        $sort: dbParams.sort
      });
    } else {
      aggregation.push({
        $sort: { name: 1 }
      });
    }
    // Skip
    aggregation.push({
      $skip: skip
    });
    // Limit
    aggregation.push({
      $limit: limit
    });
    // Project
    DatabaseUtils.projectFields(aggregation, projectFields);
    // Read DB
    const sitesMDB = await global.database.getCollection<any>(tenantID, 'sites')
      .aggregate(aggregation, {
        collation: { locale: Constants.DEFAULT_LOCALE, strength: 2 },
        allowDiskUse: true
      })
      .toArray();
    const sites = [];
    // TODO: Handle this coding into the MongoDB request
    if (sitesMDB && sitesMDB.length > 0) {
      // Create
      for (const siteMDB of sitesMDB) {
        // Count Available/Occupied Chargers/Connectors
        if (params.withAvailableChargers) {
          // Get the chargers
          const chargingStations = await ChargingStationStorage.getChargingStations(tenantID,
            { siteIDs: [siteMDB.id], includeDeleted: false }, Constants.DB_PARAMS_MAX_LIMIT);
          // Set the Charging Stations' Connector statuses
          siteMDB.connectorStats = Utils.getConnectorStatusesFromChargingStations(chargingStations.result);
        }
        if (!siteMDB.autoUserSiteAssignment) {
          siteMDB.autoUserSiteAssignment = false;
        }
        // Add
        sites.push(siteMDB);
      }
    }
    // Debug
    Logging.traceEnd(MODULE_NAME, 'getSites', uniqueTimerID, { params });
    return {
      count: (sitesCountMDB.length > 0 ?
        (sitesCountMDB[0].count === Constants.DB_RECORD_COUNT_CEIL ? -1 : sitesCountMDB[0].count) : 0),
      result: sites
    };
  }

  public static async deleteSite(tenantID: string, id: string): Promise<void> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'deleteSite');
    // Delegate
    await SiteStorage.deleteSites(tenantID, [id]);
    // Debug
    Logging.traceEnd(MODULE_NAME, 'deleteSite', uniqueTimerID, { id });
  }

  public static async deleteSites(tenantID: string, ids: string[]): Promise<void> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'deleteSites');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Delete all Site Areas
    await SiteAreaStorage.deleteSiteAreasFromSites(tenantID, ids);
    // Convert
    const cids: ObjectID[] = ids.map((id) => Utils.convertToObjectID(id));
    // Delete Site
    await global.database.getCollection<any>(tenantID, 'sites')
      .deleteMany({ '_id': { $in: cids } });
    // Delete Image
    await global.database.getCollection<any>(tenantID, 'siteimages')
      .deleteMany({ '_id': { $in: cids } });
    // Delete Site's Users
    await global.database.getCollection<any>(tenantID, 'siteusers')
      .deleteMany({ 'siteID': { $in: cids } });
    // Debug
    Logging.traceEnd(MODULE_NAME, 'deleteSites', uniqueTimerID, { ids });
  }

  public static async deleteCompanySites(tenantID: string, companyID: string) {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'deleteCompanySites');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Get Sites of Company
    const siteIDs: string[] = (await global.database.getCollection<{ _id: ObjectID }>(tenantID, 'sites')
      .find({ companyID: Utils.convertToObjectID(companyID) })
      .project({ _id: 1 })
      .toArray())
      .map((site): string => site._id.toHexString());
    // Delete all Site Areas
    await SiteAreaStorage.deleteSiteAreasFromSites(tenantID, siteIDs);
    // Delete Sites
    await SiteStorage.deleteSites(tenantID, siteIDs);
    // Debug
    Logging.traceEnd(MODULE_NAME, 'deleteCompanySites', uniqueTimerID, { companyID });
  }

  public static async siteExists(tenantID: string, siteID: string): Promise<boolean> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'deleteCompanySites');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Exec
    const result = await global.database.getCollection<any>(tenantID, 'sites').findOne({ _id: Utils.convertToObjectID(siteID) });
    // Debug
    Logging.traceEnd(MODULE_NAME, 'deleteCompanySites', uniqueTimerID, { siteID });
    // Check
    if (!result) {
      return false;
    }
    return true;
  }

  public static async siteHasUser(tenantID: string, siteID: string, userID: string): Promise<boolean> {
    // Debug
    const uniqueTimerID = Logging.traceStart(MODULE_NAME, 'siteHasUser');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Exec
    const result = await global.database.getCollection<any>(tenantID, 'siteusers').findOne(
      { siteID: Utils.convertToObjectID(siteID), userID: Utils.convertToObjectID(userID) });
    // Debug
    Logging.traceEnd(MODULE_NAME, 'deleteCompanySites', uniqueTimerID, { siteID });
    // Check
    if (!result) {
      return false;
    }
    return true;
  }
}
