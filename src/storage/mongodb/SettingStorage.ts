import { ObjectID } from 'mongodb';
import BackendError from '../../exception/BackendError';
import Constants from '../../utils/Constants';
import Database from '../../utils/Database';
import DatabaseUtils from './DatabaseUtils';
import global from '../../types/GlobalType';
import Logging from '../../utils/Logging';
import Setting from '../../types/Setting';
import Utils from '../../utils/Utils';
import DbParams from '../../types/database/DbParams';

export default class SettingStorage {
  public static async getSetting(tenantID: string, id: string): Promise<Setting> {
    // Debug
    const uniqueTimerID = Logging.traceStart('SettingStorage', 'getSetting');
     // Delegate querying
     let settingMDB = await SettingStorage.getSettings(tenantID, {id: id}, Constants.DB_PARAMS_SINGLE_RECORD);
    // Debug
    Logging.traceEnd('SettingStorage', 'getSetting', uniqueTimerID, { id });
    return settingMDB.count>0 ? settingMDB.result[0] : null;
  }

  public static async getSettingByIdentifier(tenantID: string, identifier: string): Promise<Setting> {
    // Debug
    const uniqueTimerID = Logging.traceStart('SettingStorage', 'getSettingByIdentifier');
    // Delegate querying
    let settingMDB = await SettingStorage.getSettings(tenantID, {identifier: identifier}, Constants.DB_PARAMS_SINGLE_RECORD);
    // Debug
    Logging.traceEnd('SettingStorage', 'getSettingByIdentifier', uniqueTimerID, { identifier });
    return settingMDB.count>0 ? settingMDB.result[0] : null;
  }

  public static async saveSetting(tenantID: string, settingToSave: Partial<Setting>): Promise<string> {
    // Debug
    const uniqueTimerID = Logging.traceStart('SettingStorage', 'saveSetting');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Check if ID is provided
    if (!settingToSave.id && !settingToSave.identifier) {
      // ID must be provided!
      throw new BackendError(
        Constants.CENTRAL_SERVER,
        'Setting has no ID and no Identifier',
        'SettingStorage', 'saveSetting');
    }
    const settingFilter: any = {};
    // Build Request
    if (settingToSave.id) {
      settingFilter._id = Utils.convertToObjectID(settingToSave.id);
    } else {
      settingFilter._id = new ObjectID();
    }
    // Properties to save
    const settingMDB = {
      ...settingToSave,
      _id: settingFilter._id,
      createdBy: settingToSave.createdBy ? settingToSave.createdBy.id : null,
      lastChangedBy: settingToSave.lastChangedBy ? settingToSave.lastChangedBy.id : null
    }
    // Clean up mongo request
    delete settingMDB.id;
    DatabaseUtils.addLastChangedCreatedProps(settingMDB, settingMDB);
    // Modify
    const result = await global.database.getCollection<any>(tenantID, 'settings').findOneAndUpdate(
      settingFilter,
      { $set: settingMDB },
      { upsert: true, returnOriginal: false });
    if (!result.ok) {
      throw new BackendError(
        Constants.CENTRAL_SERVER,
        'Couldn\'t update Setting',
        'SettingStorage', 'saveSetting');
    }
    // Debug
    Logging.traceEnd('SettingStorage', 'saveSetting', uniqueTimerID, { settingToSave });
    // Create
    return settingFilter._id.toHexString();
  }

  public static async getSettings(tenantID: string, params: {identifier?:string, id?:string}, dbParams: DbParams) {
    // Debug
    const uniqueTimerID = Logging.traceStart('SettingStorage', 'getSettings');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Check Limit
    dbParams.limit = Utils.checkRecordLimit(dbParams.limit);
    // Check Skip
    dbParams.skip = Utils.checkRecordSkip(dbParams.skip);
    // Set the filters
    const filters: any = {};
    // Source?
    if(params.id && ObjectID.isValid(params.id)) {
      filters._id = Utils.convertToObjectID(params.id);
    }else if(params.identifier){
      filters.identifier = params.identifier;
    }
    // Create Aggregation
    const aggregation = [];
    // Filters
    if (filters) {
      aggregation.push({
        $match: filters
      });
    }
    // Count Records
    const settingsCountMDB = await global.database.getCollection<any>(tenantID, 'settings')
      .aggregate([...aggregation, { $count: 'count' }])
      .toArray();
    // Add Created By / Last Changed By
    DatabaseUtils.pushCreatedLastChangedInAggregation(tenantID, aggregation);
    // Sort
    if (dbParams.sort) {
      // Sort
      aggregation.push({
        $sort: dbParams.sort
      });
    } else {
      // Default
      aggregation.push({
        $sort: {
          identifier: 1
        }
      });
    }
    // Skip
    aggregation.push({
      $skip: dbParams.skip
    });
    // Limit
    aggregation.push({
      $limit: dbParams.limit
    });
    // Rename ID
    DatabaseUtils.renameDatabaseID(aggregation);
    // Read DB
    const settingsMDB = await global.database.getCollection<Setting>(tenantID, 'settings')
      .aggregate(aggregation, { collation: { locale: Constants.DEFAULT_LOCALE, strength: 2 } })
      .toArray();
    // Debug
    Logging.traceEnd('SettingStorage', 'getSettings', uniqueTimerID, { params, dbParams });
    // Ok
    return {
      count: (settingsCountMDB.length > 0 ? settingsCountMDB[0].count : 0),
      result: settingsMDB
    };
  }

  public static async deleteSetting(tenantID: string, id: string) {
    // Debug
    const uniqueTimerID = Logging.traceStart('SettingStorage', 'deleteSetting');
    // Check Tenant
    await Utils.checkTenant(tenantID);
    // Delete Component
    await global.database.getCollection<any>(tenantID, 'settings')
      .findOneAndDelete({ '_id': Utils.convertToObjectID(id) });
    // Debug
    Logging.traceEnd('SettingStorage', 'deleteSetting', uniqueTimerID, { id });
  }
}
