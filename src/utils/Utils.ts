import bcrypt from 'bcryptjs';
import { Request } from 'express';
import fs from 'fs';
import _ from 'lodash';
import { ObjectID } from 'mongodb';
import path from 'path';
import tzlookup from 'tz-lookup';
import url from 'url';
import uuidV4 from 'uuid/v4';
import Authorizations from '../authorization/Authorizations';
import AppError from '../exception/AppError';
import BackendError from '../exception/BackendError';
import TenantStorage from '../storage/mongodb/TenantStorage';
import UserStorage from '../storage/mongodb/UserStorage';
import ChargingStation from '../types/ChargingStation';
import ConnectorStats from '../types/ConnectorStats';
import { HttpUserRequest } from '../types/requests/HttpUserRequest';
import { SettingContent } from '../types/Setting';
import Tenant from '../types/Tenant';
import User from '../types/User';
import UserToken from '../types/UserToken';
import Configuration from './Configuration';
import Constants from './Constants';
import Cypher from './Cypher';
import passwordGenerator = require('password-generator');
import { InactivityStatusLevel } from '../types/UserNotifications';

const _centralSystemFrontEndConfig = Configuration.getCentralSystemFrontEndConfig();
const _tenants = [];

export default class Utils {
  static getEndOfChargeNotificationIntervalMins(chargingStation: ChargingStation, connectorId: number) {
    let intervalMins = 0;
    if (!chargingStation.connectors) {
      return 0;
    }
    const connector = chargingStation.connectors[connectorId - 1];
    if (connector.power <= 3680) {
      // Notifify every 120 mins
      intervalMins = 120;
    } else if (connector.power <= 7360) {
      // Notifify every 60 mins
      intervalMins = 60;
    } else if (connector.power < 50000) {
      // Notifify every 30 mins
      intervalMins = 30;
    } else if (connector.power >= 50000) {
      // Notifify every 15 mins
      intervalMins = 15;
    }
    return intervalMins;
  }

  static getInactivityStatusLevel(chargingStation: ChargingStation, connectorId: number, inactivitySecs: number): InactivityStatusLevel {
    if (!inactivitySecs) {
      return 'info';
    }
    // Get Notification Interval
    let intervalMins = Utils.getEndOfChargeNotificationIntervalMins(chargingStation, connectorId);
    // Check
    if (inactivitySecs < (intervalMins * 60)) {
      return 'info';
    } else if (inactivitySecs < (intervalMins * 60 * 2)){
      return 'warning';      
    } else {
      return 'danger';
    }
  }

  static generateGUID() {
    return uuidV4();
  }

  static generateTagID(name, firstName) {
    let tagID = '';
    if (name && name.length > 0) {
      tagID = name[0].toUpperCase();
    } else {
      tagID = 'S';
    }
    if (firstName && firstName.length > 0) {
      tagID += firstName[0].toUpperCase();
    } else {
      tagID += 'F';
    }
    tagID += Math.floor((Math.random() * 2147483648) + 1);
    return tagID;
  }

  public static isIterable(obj): boolean {
    if (obj) {
      return typeof obj[Symbol.iterator] === 'function';
    }
    return false;
  }

  static getIfChargingStationIsInactive(chargingStation): boolean {
    let inactive = false;
    // Get Heartbeat Interval from conf
    const config = Configuration.getChargingStationConfig();
    if (config) {
      const heartbeatIntervalSecs = config.heartbeatIntervalSecs;
      // Compute against the last Heartbeat
      if (chargingStation.lastHeartBeat) {
        const inactivitySecs = Math.floor((Date.now() - chargingStation.lastHeartBeat.getTime()) / 1000);
        // Inactive?
        if (inactivitySecs > (heartbeatIntervalSecs * 5)) {
          inactive = true;
        }
      }
    }
    return inactive;
  }

  public static getConnectorStatusesFromChargingStations(chargingStations: ChargingStation[]): ConnectorStats {
    const connectorStats: ConnectorStats = {
      totalChargers: 0,
      availableChargers: 0,
      totalConnectors: 0,
      chargingConnectors: 0,
      suspendedConnectors: 0,
      availableConnectors: 0,
      unavailableConnectors: 0,
      preparingConnectors: 0,
      finishingConnectors: 0,
      faultedConnectors: 0
    };
    // Chargers
    for (const chargingStation of chargingStations) {
      // Check not deleted
      if (chargingStation.deleted) {
        continue;
      }
      // Check connectors
      Utils.checkConnectors(chargingStation);
      // Set Inactive flag
      chargingStation.inactive = Utils.getIfChargingStationIsInactive(chargingStation);
      connectorStats.totalChargers++;
      // Handle Connectors
      if (!chargingStation.connectors) {
        chargingStation.connectors = [];
      }
      for (const connector of chargingStation.connectors) {
        if (!connector) {
          continue;
        }
        connectorStats.totalConnectors++;
        // Not Available?
        if (chargingStation.inactive ||
          connector.status === Constants.CONN_STATUS_UNAVAILABLE) {
          connectorStats.unavailableConnectors++;
          // Available?
        } else if (connector.status === Constants.CONN_STATUS_AVAILABLE) {
          connectorStats.availableConnectors++;
          // Suspended?
        } else if (connector.status === Constants.CONN_STATUS_SUSPENDED_EV ||
          connector.status === Constants.CONN_STATUS_SUSPENDED_EVSE) {
          connectorStats.suspendedConnectors++;
          // Charging?
        } else if (connector.status === Constants.CONN_STATUS_CHARGING ||
          connector.status === Constants.CONN_STATUS_OCCUPIED) {
          connectorStats.chargingConnectors++;
          // Faulted?
        } else if (connector.status === Constants.CONN_STATUS_FAULTED ||
          connector.status === Constants.CONN_STATUS_OCCUPIED) {
          connectorStats.faultedConnectors++;
          // Preparing?
        } else if (connector.status === Constants.CONN_STATUS_PREPARING) {
          connectorStats.preparingConnectors++;
          // Finishing?
        } else if (connector.status === Constants.CONN_STATUS_FINISHING) {
          connectorStats.finishingConnectors++;
        }
      }
      // Handle Chargers
      for (const connector of chargingStation.connectors) {
        if (!connector) {
          continue;
        }
        // Check if Available
        if (!chargingStation.inactive && connector.status === Constants.CONN_STATUS_AVAILABLE) {
          connectorStats.availableChargers++;
          break;
        }
      }
    }
    return connectorStats;
  }

  static checkConnectors(chargingStation: ChargingStation) {
    if (chargingStation.cannotChargeInParallel) {
      let lockAllConnectors = false;
      // Check
      for (const connector of chargingStation.connectors) {
        if (!connector) {
          continue;
        }
        if (connector.status !== Constants.CONN_STATUS_AVAILABLE) {
          lockAllConnectors = true;
          break;
        }
      }
      // Lock?
      if (lockAllConnectors) {
        for (const connector of chargingStation.connectors) {
          if (!connector) {
            continue;
          }
          if (connector.status === Constants.CONN_STATUS_AVAILABLE) {
            // Check OCPP Version
            if (chargingStation.ocppVersion === Constants.OCPP_VERSION_15) {
              // Set OCPP 1.5 Occupied
              connector.status = Constants.CONN_STATUS_OCCUPIED;
            } else {
              // Set OCPP 1.6 Unavailable
              connector.status = Constants.CONN_STATUS_UNAVAILABLE;
            }
          }
        }
      }
    }
  }

  // Temporary method for Revenue Cloud concept
  // static async pushTransactionToRevenueCloud(tenantID: string, action: string, transaction: Transaction, user: User, actionOnUser: User) {
  //   // Refund Transaction
  //   const cloudRevenueAuth = new ClientOAuth2({
  //     clientId: 'sb-revenue-cloud!b1122|revenue-cloud!b1532',
  //     clientSecret: 'BtuZkWlC/58HmEMoqBCHc0jBoVg=',
  //     accessTokenUri: 'https://seed-innovation.authentication.eu10.hana.ondemand.com/oauth/token'
  //   });
  //   // Get the token
  //   const authResponse = await cloudRevenueAuth.credentials.getToken();
  //   // Send HTTP request
  //   const result = await axios.post(
  //     'https://eu10.revenue.cloud.sap/api/usage-record/v1/usage-records',
  //     {
  //       'metricId': 'ChargeCurrent_Trial',
  //       'quantity': transaction.stop.totalConsumption / 1000,
  //       'startedAt': transaction.timestamp,
  //       'endedAt': transaction.stop.timestamp,
  //       'userTechnicalId': transaction.tagID
  //     },
  //     {
  //       'headers': {
  //         'Authorization': 'Bearer ' + authResponse.accessToken,
  //         'Content-Type': 'application/json'
  //       }
  //     }
  //   );
  //   // Log
  //   Logging.logSecurityInfo({
  //     user, actionOnUser, action,
  //     tenantID: tenantID,
  //     source: transaction.chargeBoxID,
  //     module: 'Utils', method: 'pushTransactionToRevenueCloud',
  //     message: `Transaction ID '${transaction.id}' has been refunded successfully`,
  //     detailedMessages: result.data
  //   });
  // }

  static getLocaleWith2Digits(localeWith4Digits: string) {
    let locale = Constants.DEFAULT_LANGUAGE;
    // Set the User's locale
    if (localeWith4Digits && localeWith4Digits.length > 2) {
      locale = localeWith4Digits.substring(0, 2);
    }
    return locale;
  }

  static async normalizeAndCheckSOAPParams(headers, req) {
    // Normalize
    Utils._normalizeOneSOAPParam(headers, 'chargeBoxIdentity');
    Utils._normalizeOneSOAPParam(headers, 'Action');
    Utils._normalizeOneSOAPParam(headers, 'To');
    Utils._normalizeOneSOAPParam(headers, 'From.Address');
    Utils._normalizeOneSOAPParam(headers, 'ReplyTo.Address');
    // Parse the request (lower case for fucking charging station DBT URL registration)
    const urlParts = url.parse(decodeURIComponent(req.url.toLowerCase()), true);
    const tenantID = urlParts.query.tenantid as string;
    const token = urlParts.query.token;
    // Check
    await Utils.checkTenant(tenantID);
    // Set the Tenant ID
    headers.tenantID = tenantID;
    headers.token = token;
  }

  static _normalizeOneSOAPParam(headers, name) {
    const val = _.get(headers, name);
    if (val && val.$value) {
      _.set(headers, name, val.$value);
    }
  }

  public static async checkTenant(tenantID: string): Promise<void> {
    if (!tenantID) {
      throw new BackendError({
        source: Constants.CENTRAL_SERVER,
        module: 'Utils',
        method: 'checkTenant',
        message: 'The Tenant ID is mandatory'
      });
    }
    // Check in cache
    if (_tenants.includes(tenantID)) {
      return Promise.resolve(null);
    }
    if (tenantID !== Constants.DEFAULT_TENANT) {
      // Valid Object ID?
      if (!ObjectID.isValid(tenantID)) {
        throw new BackendError({
          source: Constants.CENTRAL_SERVER,
          module: 'Utils',
          method: 'checkTenant',
          message: `Invalid Tenant ID '${tenantID}'`
        });
      }
      // Get the Tenant
      const tenant = await TenantStorage.getTenant(tenantID);
      if (!tenant) {
        throw new BackendError({
          source: Constants.CENTRAL_SERVER,
          module: 'Utils',
          method: 'checkTenant',
          message: `Invalid Tenant ID '${tenantID}'`
        });
      }
    }
    _tenants.push(tenantID);
  }

  static convertToDate(date): Date {
    // Check
    if (!date) {
      return date;
    }
    // Check Type
    if (!(date instanceof Date)) {
      return new Date(date);
    }
    return date;
  }

  static isEmptyJSon(document) {
    // Empty?
    if (!document) {
      return true;
    }
    // Check type
    if (typeof document !== 'object') {
      return true;
    }
    // Check
    return Object.keys(document).length === 0;
  }

  static removeExtraEmptyLines(tab) {
    // Start from the end
    for (let i = tab.length - 1; i > 0; i--) {
      // Two consecutive empty lines?
      if (tab[i].length === 0 && tab[i - 1].length === 0) {
        // Remove the last one
        tab.splice(i, 1);
      }
      // Check last line
      if (i === 1 && tab[i - 1].length === 0) {
        // Remove the first one
        tab.splice(i - 1, 1);
      }
    }
  }

  static isComponentActiveFromToken(userToken: UserToken, componentName: string): boolean {
    return userToken.activeComponents.includes(componentName);
  }

  static convertToObjectID(id): ObjectID {
    let changedID = id;
    // Check
    if (typeof id === 'string') {
      // Create Object
      changedID = new ObjectID(id);
    }
    return changedID;
  }

  static convertToInt(id): number {
    let changedID = id;
    if (!id) {
      return 0;
    }
    // Check
    if (typeof id === 'string') {
      // Create Object
      changedID = parseInt(id);
    }
    return changedID;
  }

  static convertToFloat(id): number {
    let changedID = id;
    if (!id) {
      return 0;
    }
    // Check
    if (typeof id === 'string') {
      // Create Object
      changedID = parseFloat(id);
    }
    return changedID;
  }

  public static convertUserToObjectID(user: User): ObjectID | null { // TODO: Fix this method...
    let userID = null;
    // Check Created By
    if (user) {
      // Check User Model
      if (typeof user === 'object' &&
        user.constructor.name !== 'ObjectID') {
        // This is the User Model
        userID = Utils.convertToObjectID(user.id);
      }
      // Check String
      if (typeof user === 'string') {
        // This is a String
        userID = Utils.convertToObjectID(user);
      }
    }
    return userID;
  }

  public static isEmptyArray(array): boolean {
    if (Array.isArray(array) && array.length > 0) {
      return false;
    }
    return true;
  }

  static buildUserFullName(user: User, withID = true, withEmail = false, inversedName = false) {
    let fullName: string;
    if (!user || !user.name) {
      return 'Unknown';
    }
    if (inversedName) {
      if (user.firstName) {
        fullName = `${user.name}, ${user.firstName}`;
      } else {
        fullName = user.name;
      }
    } else {
      // eslint-disable-next-line no-lonely-if
      if (user.firstName) {
        fullName = `${user.firstName} ${user.name}`;
      } else {
        fullName = user.name;
      }
    }
    if (withID && user.iNumber) {
      fullName += ` (${user.iNumber})`;
    }

    if (withEmail && user.email) {
      fullName += `; ${user.email}`;
    }

    return fullName;
  }

  // Save the users in file
  static saveFile(filename, content) {
    // Save
    fs.writeFileSync(path.join(__dirname, filename), content, 'UTF-8');
  }

  static getRandomInt() {
    return Math.floor((Math.random() * 2147483648) + 1); // INT32 (signed: issue in Schneider)
  }

  static buildEvseURL(subdomain) {
    if (subdomain) {
      return `${_centralSystemFrontEndConfig.protocol}://${subdomain}.${_centralSystemFrontEndConfig.host}:${_centralSystemFrontEndConfig.port}`;
    }
    return `${_centralSystemFrontEndConfig.protocol}://${_centralSystemFrontEndConfig.host}:${
      _centralSystemFrontEndConfig.port}`;
  }

  static buildOCPPServerURL(tenantID: string, ocppProtocol: string, token?: string): string {
    let ocppUrl;
    switch (ocppProtocol) {
      case Constants.OCPP_PROTOCOL_JSON:
        ocppUrl = `${Configuration.getJsonEndpointConfig().baseUrl}/OCPP16/${tenantID}`;
        if (token) {
          ocppUrl += `/${token}`;
        }
        return ocppUrl;
      case Constants.OCPP_PROTOCOL_SOAP:
      default:
        ocppUrl = `${Configuration.getWSDLEndpointConfig().baseUrl}/OCPP15?TenantID=${tenantID}`;
        if (token) {
          ocppUrl += `%26Token=${token}`;
        }
        return ocppUrl;
    }
  }

  static async buildEvseUserURL(tenantID: string, user: User, hash = '') {

    const tenant = await TenantStorage.getTenant(tenantID);
    const _evseBaseURL = Utils.buildEvseURL(tenant.subdomain);
    // Add
    return _evseBaseURL + '/users?UserID=' + user.id + hash;
  }

  static async buildEvseChargingStationURL(tenantID: string, chargingStation: ChargingStation, hash = '') {
    const tenant = await TenantStorage.getTenant(tenantID);
    const _evseBaseURL = Utils.buildEvseURL(tenant.subdomain);

    return _evseBaseURL + '/charging-stations?ChargingStationID=' + chargingStation.id + hash;
  }

  static async buildEvseTransactionURL(tenantID: string, chargingStation: ChargingStation, transactionId, hash = '') {
    const tenant = await TenantStorage.getTenant(tenantID);
    const _evseBaseURL = Utils.buildEvseURL(tenant.subdomain);
    // Add
    return _evseBaseURL + '/transactions?TransactionID=' + transactionId + hash;
  }

  static isServerInProductionMode() {
    const env = process.env.NODE_ENV || 'dev';
    return (env === 'production');
  }

  static hideShowMessage(message): string {
    // Check Prod
    if (Utils.isServerInProductionMode()) {
      return 'An unexpected server error occurred. Check the server\'s logs!';
    }
    return message;
  }

  public static getRequestIP(request): string {
    if (request.ip) {
      return request.ip;
    } else if (request.headers['x-forwarded-for']) {
      return request.headers['x-forwarded-for'];
    } else if (request.connection.remoteAddress) {
      return request.connection.remoteAddress;
    } else if (request.headers.host) {
      const host = request.headers.host.split(':', 2);
      const ip = host[0];
      return ip;
    }
  }

  public static checkRecordLimit(recordLimit: number | string): number {
    // String?
    if (typeof recordLimit === 'string') {
      recordLimit = parseInt(recordLimit);
    }
    // Not provided?
    if (isNaN(recordLimit) || recordLimit < 0 || recordLimit === 0) {
      recordLimit = Constants.DB_RECORD_COUNT_DEFAULT;
    }
    // Check max
    if (recordLimit > Number.MAX_SAFE_INTEGER) {
      recordLimit = Number.MAX_SAFE_INTEGER;
    }
    return recordLimit;
  }

  static roundTo(number, scale) {
    return parseFloat(number.toFixed(scale));
  }

  static firstLetterInUpperCase(value): string {
    return value[0].toUpperCase() + value.substring(1);
  }

  public static checkRecordSkip(recordSkip: number | string): number {
    // String?
    if (typeof recordSkip === 'string') {
      recordSkip = parseInt(recordSkip);
    }
    // Not provided?
    if (isNaN(recordSkip) || recordSkip < 0) {
      // Default
      recordSkip = 0;
    }
    return recordSkip;
  }

  static generateToken(email) {
    return Cypher.hash(`${new Date().toISOString()}~${email}`);
  }

  /**
   * Duplicate a JSON object
   * @param src
   * @returns a copy of the source
   */
  static duplicateJSON(src): any {
    if (!src || typeof src !== 'object') {
      return src;
    }
    // Recreate all of it
    return JSON.parse(JSON.stringify(src));
  }

  static getRoleNameFromRoleID(roleID) {
    switch (roleID) {
      case Constants.ROLE_BASIC:
        return 'Basic';
      case Constants.ROLE_DEMO:
        return 'Demo';
      case Constants.ROLE_ADMIN:
        return 'Admin';
      case Constants.ROLE_SUPER_ADMIN:
        return 'Super Admin';
      default:
        return 'Unknown';
    }
  }

  public static async hashPasswordBcrypt(password: string): Promise<string> {
    // eslint-disable-next-line no-undef
    return await new Promise((fulfill, reject) => {
      // Generate a salt with 15 rounds
      bcrypt.genSalt(10, (err, salt) => {
        // Hash
        bcrypt.hash(password, salt, (err, hash) => {
          // Error?
          if (err) {
            reject(err);
          } else {
            fulfill(hash);
          }
        });
      });
    });
  }

  public static async checkPasswordBCrypt(password, hash): Promise<boolean> {
    // eslint-disable-next-line no-undef
    return await new Promise((fulfill, reject) => {
      // Compare
      bcrypt.compare(password, hash, (err, match) => {
        // Error?
        if (err) {
          reject(err);
        } else {
          fulfill(match);
        }
      });
    });
  }

  static isPasswordStrongEnough(password) {
    const uc = password.match(Constants.PWD_UPPERCASE_RE);
    const lc = password.match(Constants.PWD_LOWERCASE_RE);
    const n = password.match(Constants.PWD_NUMBER_RE);
    const sc = password.match(Constants.PWD_SPECIAL_CHAR_RE);
    return password.length >= Constants.PWD_MIN_LENGTH &&
      uc && uc.length >= Constants.PWD_UPPERCASE_MIN_COUNT &&
      lc && lc.length >= Constants.PWD_LOWERCASE_MIN_COUNT &&
      n && n.length >= Constants.PWD_NUMBER_MIN_COUNT &&
      sc && sc.length >= Constants.PWD_SPECIAL_MIN_COUNT;
  }


  static generatePassword() {
    let password = '';
    const randomLength = Math.floor(Math.random() * (Constants.PWD_MAX_LENGTH - Constants.PWD_MIN_LENGTH)) + Constants.PWD_MIN_LENGTH;
    while (!Utils.isPasswordStrongEnough(password)) {
      // eslint-disable-next-line no-useless-escape
      password = passwordGenerator(randomLength, false, /[\w\d!#\$%\^&\*\.\?\-]/);
    }
    return password;
  }

  public static getStatusDescription(status: string): string {
    switch (status) {
      case Constants.USER_STATUS_PENDING:
        return 'Pending';
      case Constants.USER_STATUS_LOCKED:
        return 'Locked';
      case Constants.USER_STATUS_BLOCKED:
        return 'Blocked';
      case Constants.USER_STATUS_ACTIVE:
        return 'Active';
      case Constants.USER_STATUS_DELETED:
        return 'Deleted';
      case Constants.USER_STATUS_INACTIVE:
        return 'Inactive';
      default:
        return 'Unknown';
    }
  }

  static hashPassword(password) {
    return Cypher.hash(password);
  }

  public static checkIfSiteValid(filteredRequest: any, req: Request): void {
    if (req.method !== 'POST' && !filteredRequest.id) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Site ID is mandatory',
        module: 'SiteService',
        method: '_checkIfSiteValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.name) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Site Name is mandatory',
        module: 'SiteService',
        method: '_checkIfSiteValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.companyID) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Company ID is mandatory for the Site',
        module: 'SiteService',
        method: '_checkIfSiteValid',
        user: req.user.id
      });
    }
  }

  public static checkIfSiteAreaValid(filteredRequest: any, req: Request): void {
    if (req.method !== 'POST' && !filteredRequest.id) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Site Area ID is mandatory',
        module: 'SiteAreaService',
        method: '_checkIfSiteAreaValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.name) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Site Area name is mandatory',
        module: 'SiteAreaService',
        method: '_checkIfSiteAreaValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.siteID) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Site ID is mandatory',
        module: 'SiteAreaService',
        method: '_checkIfSiteAreaValid',
        user: req.user.id
      });
    }
  }

  public static checkIfCompanyValid(filteredRequest: any, req: Request): void {
    if (req.method !== 'POST' && !filteredRequest.id) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Company ID is mandatory',
        module: 'CompanyService',
        method: 'checkIfCompanyValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.name) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Company Name is mandatory',
        module: 'CompanyService',
        method: 'checkIfCompanyValid',
        user: req.user.id
      });
    }
  }

  public static checkIfVehicleValid(filteredRequest, req: Request) {
    // Update model?
    if (req.method !== 'POST' && !filteredRequest.id) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Vehicle ID is mandatory',
        module: 'VehicleService',
        method: 'checkIfVehicleValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.type) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Vehicle Type is mandatory',
        module: 'VehicleService',
        method: 'checkIfVehicleValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.model) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Vehicle Model is mandatory',
        module: 'VehicleService',
        method: 'checkIfVehicleValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.vehicleManufacturerID) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Vehicle Manufacturer is mandatory',
        module: 'VehicleService',
        method: 'checkIfVehicleValid',
        user: req.user.id
      });
    }
  }

  public static checkIfVehicleManufacturerValid(filteredRequest, req) {
    // Update model?
    if (req.method !== 'POST' && !filteredRequest.id) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Vehicle Manufacturer ID is mandatory',
        module: 'VehicleManufacturer',
        method: 'checkIfVehicleManufacturerValid',
        user: req.user.id
      });
    }
    if (!filteredRequest.name) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Vehicle Manufacturer Name is mandatory',
        module: 'VehicleManufacturer',
        method: 'checkIfVehicleManufacturerValid',
        user: req.user.id
      });
    }
  }

  public static async checkIfUserTagIDsAreValid(user: User, tagIDs: string[], req: Request) {
    // Check that the Badge ID is not already used
    if (Authorizations.isAdmin(req.user) || Authorizations.isSuperAdmin(req.user)) {
      for (const tagID of tagIDs) {
        const foundUser = await UserStorage.getUserByTagId(req.user.tenantID, tagID);
        if (foundUser && (!user || (foundUser.id !== user.id))) {
          // Tag already used!
          throw new AppError({
            source: Constants.CENTRAL_SERVER,
            errorCode: Constants.HTTP_USER_TAG_ID_ALREADY_USED_ERROR,
            message: `The Tag ID '${tagID}' is already used by User '${Utils.buildUserFullName(foundUser)}'`,
            module: 'Utils',
            method: 'checkIfUserTagsAreValid',
            user: req.user.id
          });
        }
      }
    }
  }

  public static checkIfUserValid(filteredRequest: Partial<HttpUserRequest>, user: User, req: Request) {
    const tenantID = req.user.tenantID;
    if (!tenantID) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Tenant is mandatory',
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id
      });
    }
    // Update model?
    if (req.method !== 'POST' && !filteredRequest.id) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'User ID is mandatory',
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id
      });
    }
    // Creation?
    if (req.method === 'POST') {
      if (!filteredRequest.role) {
        filteredRequest.role = Constants.ROLE_BASIC;
      }
    } else {
      // Do not allow to change if not Admin
      if (!Authorizations.isAdmin(req.user)) {
        filteredRequest.role = user.role;
      }
    }
    if (req.method === 'POST' && !filteredRequest.status) {
      filteredRequest.status = Constants.USER_STATUS_BLOCKED;
    }
    // Creation?
    if ((filteredRequest.role !== Constants.ROLE_BASIC) && (filteredRequest.role !== Constants.ROLE_DEMO) &&
        !Authorizations.isAdmin(req.user) && !Authorizations.isSuperAdmin(req.user)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: `Only Admins can assign the role '${Utils.getRoleNameFromRoleID(filteredRequest.role)}'`,
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    // Only Basic, Demo, Admin user other Tenants (!== default)
    if (tenantID !== 'default' && filteredRequest.role && filteredRequest.role === Constants.ROLE_SUPER_ADMIN) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'User cannot have the Super Admin role in this Tenant',
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    // Only Admin and Super Admin can use role different from Basic
    if ((filteredRequest.role === Constants.ROLE_ADMIN || filteredRequest.role === Constants.ROLE_SUPER_ADMIN) &&
        !Authorizations.isAdmin(req.user) && !Authorizations.isSuperAdmin(req.user)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: `User without role Admin or Super Admin tried to ${filteredRequest.id ? 'update' : 'create'} an User with the '${Utils.getRoleNameFromRoleID(filteredRequest.role)}' role`,
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    if (!filteredRequest.name) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'User Last Name is mandatory',
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    if (req.method === 'POST' && !filteredRequest.email) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'User Email is mandatory',
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    if (req.method === 'POST' && !Utils._isUserEmailValid(filteredRequest.email)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: `User Email ${filteredRequest.email} is not valid`,
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    if (filteredRequest.password && !Utils.isPasswordValid(filteredRequest.password)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'User Password is not valid',
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    if (filteredRequest.phone && !Utils._isPhoneValid(filteredRequest.phone)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: `User Phone ${filteredRequest.phone} is not valid`,
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    if (filteredRequest.mobile && !Utils._isPhoneValid(filteredRequest.mobile)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: `User Mobile ${filteredRequest.mobile} is not valid`,
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    if (filteredRequest.iNumber && !Utils._isINumberValid(filteredRequest.iNumber)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: `User I-Number ${filteredRequest.iNumber} is not valid`,
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
    if (filteredRequest.tagIDs) {
      // Check
      if (!Array.isArray(filteredRequest.tagIDs)) { // TODO: this piece is not very robust, and mutates filteredRequest even tho it's named "check". Should be changed, honestly
        if (filteredRequest.tagIDs !== '') {
          filteredRequest.tagIDs = filteredRequest.tagIDs.split(',');
        }
      }
      if (!Utils._areTagIDsValid(filteredRequest.tagIDs)) {
        throw new AppError({
          source: Constants.CENTRAL_SERVER,
          errorCode: Constants.HTTP_GENERAL_ERROR,
          message: `User Tags ${filteredRequest.tagIDs} is/are not valid`,
          module: 'UserService',
          method: 'checkIfUserValid',
          user: req.user.id,
          actionOnUser: filteredRequest.id
        });
      }
    }
    // At least one tag ID
    if (!filteredRequest.tagIDs || filteredRequest.tagIDs.length === 0) {
      filteredRequest.tagIDs = [Utils.generateTagID(filteredRequest.name, filteredRequest.firstName)];
    }
    if (filteredRequest.plateID && !Utils._isPlateIDValid(filteredRequest.plateID)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: `User Plate ID ${filteredRequest.plateID} is not valid`,
        module: 'UserService',
        method: 'checkIfUserValid',
        user: req.user.id,
        actionOnUser: filteredRequest.id
      });
    }
  }

  public static getTimezone(lat: number, lon: number) {
    if (lat && lon) {
      return tzlookup(lat, lon);
    }
    return null;
  }

  public static getTenantActiveComponents(tenant: Tenant): string[] {
    const components: string[] = [];
    for (const componentName in tenant.components) {
      if (tenant.components[componentName].active) {
        components.push(componentName);
      }
    }
    return components;
  }

  public static isTenantComponentActive(tenant: Tenant, component: string): boolean {
    for (const componentName in tenant.components) {
      if (componentName === component) {
        return tenant.components[componentName].active;
      }
    }
    return false;
  }

  public static createDefaultSettingContent(activeComponent, currentSettingContent): SettingContent {
    switch (activeComponent.name) {
      // Pricing
      case Constants.COMPONENTS.PRICING:
        if (!currentSettingContent || currentSettingContent.type !== activeComponent.type) {
          // Create default settings
          if (activeComponent.type === Constants.SETTING_PRICING_CONTENT_TYPE_SIMPLE) {
            // Simple Pricing
            return {
              'type': Constants.SETTING_PRICING_CONTENT_TYPE_SIMPLE,
              'simple': {}
            } as SettingContent;
          } else if (activeComponent.type === Constants.SETTING_PRICING_CONTENT_TYPE_CONVERGENT_CHARGING) {
            // SAP CC
            return {
              'type': Constants.SETTING_PRICING_CONTENT_TYPE_CONVERGENT_CHARGING,
              'convergentCharging': {}
            } as SettingContent;
          }
        }
        break;

      // Billing
      case Constants.COMPONENTS.BILLING:
        if (!currentSettingContent || currentSettingContent.type !== activeComponent.type) {
          // Only Stripe
          return {
            'type': Constants.SETTING_BILLING_CONTENT_TYPE_STRIPE,
            'stripe': {}
          } as SettingContent;
        }
        break;

      // Refund
      case Constants.COMPONENTS.REFUND:
        if (!currentSettingContent || currentSettingContent.type !== activeComponent.type) {
          // Only Concur
          return {
            'type': Constants.SETTING_REFUND_CONTENT_TYPE_CONCUR,
            'concur': {}
          } as SettingContent;
        }
        break;

      // Refund
      case Constants.COMPONENTS.OCPI:
        if (!currentSettingContent || currentSettingContent.type !== activeComponent.type) {
          // Only Gireve
          return {
            'type': Constants.SETTING_REFUND_CONTENT_TYPE_GIREVE,
            'ocpi': {}
          } as SettingContent;
        }
        break;

      // SAC
      case Constants.COMPONENTS.ANALYTICS:
        if (!currentSettingContent || currentSettingContent.type !== activeComponent.type) {
          // Only SAP Analytics
          return {
            'type': Constants.SETTING_REFUND_CONTENT_TYPE_SAC,
            'sac': {}
          } as SettingContent;
        }
        break;
    }
  }

  public static isPasswordValid(password: string): boolean {
    // eslint-disable-next-line no-useless-escape
    return /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!#@:;,<>\/''\$%\^&\*\.\?\-_\+\=\(\)])(?=.{8,})/.test(password);
  }

  private static _isUserEmailValid(email: string) {
    return /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
  }

  private static _areTagIDsValid(tagIDs: string[] | string) {
    if (typeof tagIDs === 'string') {
      return /^[A-Za-z0-9,]*$/.test(tagIDs);
    }
    return tagIDs.filter((tagID) => /^[A-Za-z0-9,]*$/.test(tagID)).length === tagIDs.length;
  }

  private static _isPhoneValid(phone: string): boolean {
    return /^\+?([0-9] ?){9,14}[0-9]$/.test(phone);
  }

  private static _isINumberValid(iNumber) {
    return /^[A-Z]{1}[0-9]{6}$/.test(iNumber);
  }

  private static _isPlateIDValid(plateID) {
    return /^[A-Z0-9-]*$/.test(plateID);
  }
}
