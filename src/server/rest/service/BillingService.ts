import { NextFunction, Request, Response } from 'express';
import AppAuthError from '../../../exception/AppAuthError';
import AppError from '../../../exception/AppError';
import Authorizations from '../../../authorization/Authorizations';
import BillingFactory from '../../../integration/billing/BillingFactory';
import BillingSecurity from './security/BillingSecurity';
import { BillingUserData, Tax } from '../../../types/Billing';
import Constants from '../../../utils/Constants';
import { HttpBillingRequest } from '../../../types/requests/HttpBillingRequest';
import Logging from '../../../utils/Logging';
import TenantStorage from '../../../storage/mongodb/TenantStorage';
import User from '../../../types/User';
import UserStorage from '../../../storage/mongodb/UserStorage';
import Utils from '../../../utils/Utils';
import { DataResult } from '../../../types/DataResult';
import * as fs from 'fs';

export default class BillingService {

  public static async handleGetBillingConnection(action: string, req: Request, res: Response, next: NextFunction) {
    if (!Authorizations.canCheckConnectionBilling(req.user)) {
      throw new AppAuthError({
        errorCode: Constants.HTTP_AUTH_ERROR,
        user: req.user,
        action: Constants.ACTION_CHECK_CONNECTION_BILLING,
        entity: Constants.ENTITY_USER,
        module: 'BillingService',
        method: 'handleGetBillingConnection',
      });
    }
    const tenant = await TenantStorage.getTenant(req.user.tenantID);
    if (!Utils.isTenantComponentActive(tenant, Constants.COMPONENTS.BILLING) ||
      !Utils.isTenantComponentActive(tenant, Constants.COMPONENTS.PRICING)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Billing or Pricing not active in this Tenant',
        module: 'BillingService',
        method: 'handleSynchronizeUsers',
        action: action,
        user: req.user
      });
    }
    const billingImpl = await BillingFactory.getBillingImpl(req.user.tenantID);
    if (billingImpl) {
      if (!Authorizations.canCheckConnectionBilling(req.user)) {
        throw new AppAuthError({
          errorCode: Constants.HTTP_AUTH_ERROR,
          user: req.user,
          action: Constants.ACTION_CHECK_CONNECTION_BILLING,
          entity: Constants.ENTITY_BILLING,
          module: 'BillingService',
          method: 'handleGetBillingConnection',
        });
      }
      const checkResult = await billingImpl.checkConnection();
      if (checkResult.success) {
        Logging.logSecurityInfo({
          tenantID: tenant.id,
          user: req.user,
          module: 'BillingService',
          method: 'handleGetBillingConnection',
          message: checkResult.message,
          action: action,
          detailedMessages: 'Successfully checking connection to Billing application'
        });
      } else {
        Logging.logSecurityWarning({
          tenantID: tenant.id,
          user: req.user,
          module: 'BillingService',
          method: 'handleGetBillingConnection',
          message: checkResult.message,
          action: action,
          detailedMessages: 'Error when checking connection to Billing application'
        });
      }
      res.json(Object.assign({ connectionIsValid: checkResult.success }, Constants.REST_RESPONSE_SUCCESS));
    } else {
      Logging.logSecurityWarning({
        tenantID: tenant.id,
        user: req.user,
        module: 'BillingService',
        method: 'handleGetBillingConnection',
        message: 'Billing (or Pricing) not active or Billing not fully implemented',
        action: action,
        detailedMessages: 'Error when checking connection to Billing application'
      });
      res.json(Object.assign({ connectionIsValid: false }, Constants.REST_RESPONSE_SUCCESS));
    }
    next();
  }

  public static async handleSynchronizeUsers(action: string, req: Request, res: Response, next: NextFunction) {
    if (!Authorizations.canSynchronizeUsersBilling(req.user)) {
      throw new AppAuthError({
        errorCode: Constants.HTTP_AUTH_ERROR,
        user: req.user,
        action: Constants.ACTION_SYNCHRONIZE_BILLING,
        entity: Constants.ENTITY_USER,
        module: 'BillingService',
        method: 'handleSynchronizeUsers',
      });
    }
    const tenant = await TenantStorage.getTenant(req.user.tenantID);
    if (!Utils.isTenantComponentActive(tenant, Constants.COMPONENTS.BILLING) ||
        !Utils.isTenantComponentActive(tenant, Constants.COMPONENTS.PRICING)) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Billing or Pricing not active in this Tenant',
        module: 'BillingService',
        method: 'handleSynchronizeUsers',
        action: action,
        user: req.user
      });
    }
    // Get Billing implementation from factory
    const billingImpl = await BillingFactory.getBillingImpl(tenant.id);
    if (!billingImpl) {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: 'Billing settings are not configured',
        module: 'BillingService',
        method: 'handleSynchronizeUsers',
        action: action,
        user: req.user
      });
    }
    // Check
    const actionsDone = {
      synchronized: 0,
      error: 0
    };
      // First step: Get recently updated customers from Billing application
    let usersChangedInBilling = await billingImpl.getUpdatedUsersInBillingForSynchronization();
    // Second step: Treat all not-synchronized users from own database
    const usersNotSynchronized = await UserStorage.getUsers(tenant.id,
      { 'statuses': [Constants.USER_STATUS_ACTIVE], 'notSynchronizedBillingData': true },
      { ...Constants.DB_PARAMS_MAX_LIMIT, sort: { 'userID': 1 } });
    if (usersNotSynchronized.count > 0) {
      // Process them
      Logging.logInfo({
        tenantID: tenant.id,
        source: Constants.CENTRAL_SERVER,
        action: Constants.ACTION_SYNCHRONIZE_BILLING,
        module: 'BillingService',
        method: 'handleSynchronizeUsers',
        message: `${usersNotSynchronized.count} changed active users are going to be synchronized with Billing application`
      });
      for (const user of usersNotSynchronized.result) {
        try {
          const newBillingUserData = await billingImpl.synchronizeUser(user);
          if (newBillingUserData.customerID) {
            // Delete duplicate customers
            if (usersChangedInBilling && usersChangedInBilling.length > 0) {
              usersChangedInBilling = usersChangedInBilling.filter((id) => id !== newBillingUserData.customerID);
            }
            await UserStorage.saveUserBillingData(tenant.id, user.id, newBillingUserData);
            actionsDone.synchronized++;
          } else {
            actionsDone.error++;
          }
        } catch (error) {
          actionsDone.error++;
          Logging.logActionExceptionMessage(tenant.id, Constants.ACTION_SYNCHRONIZE_BILLING, error);
        }
      }
    }
    // Third step : synchronize users with old BillingData from own database
    let usersOldBillingData = await UserStorage.getUsers(tenant.id,
      { 'statuses': [Constants.USER_STATUS_ACTIVE] },
      { ...Constants.DB_PARAMS_MAX_LIMIT, sort: { 'userID': 1 } });
    const usersInBilling: Partial<User>[] = await billingImpl.getUsers();
    for (const userMDB of usersOldBillingData.result) {
      let userInBillingImpl = false;
      for (const userBilling of usersInBilling) {
        if (userMDB.billingData && userMDB.billingData.customerID === userBilling.billingData.customerID) {
          userInBillingImpl = true;
          break;
        }
      }
      if (!userInBillingImpl) {
        try {
          const createReq = { ...req } as Request;
          createReq.body = { ...req.body, ...userMDB };
          const newBillingUserData: BillingUserData = await billingImpl.createUser(createReq);
          if (newBillingUserData.customerID) {
            // Keep method found in own database
            if (userMDB.billingData && userMDB.billingData.method) {
              newBillingUserData.method = userMDB.billingData.method;
            }
            await UserStorage.saveUserBillingData(tenant.id, userMDB.id, newBillingUserData);
            // Delete duplicate customers
            if (usersChangedInBilling && usersChangedInBilling.length > 0) {
              usersChangedInBilling = usersChangedInBilling.filter((id) => id !== newBillingUserData.customerID);
            }
            actionsDone.synchronized++;
          } else {
            actionsDone.error++;
          }
        } catch (e) {
          Logging.logError({
            tenantID: tenant.id,
            source: Constants.CENTRAL_SERVER,
            action: Constants.ACTION_SYNCHRONIZE_BILLING,
            module: 'BillingService',
            method: 'handleSynchronizeUsers',
            message: `Unable to create billing customer with ID '${userMDB.billingData.customerID}`,
            detailedMessages: `Synchronization failed for customer ID '${userMDB.billingData.customerID}' from database for reason : ${e}`
          });
          actionsDone.error++;
        }
      }
    }
    // Fourth step: synchronize remaining customers from Billing
    if (usersChangedInBilling && usersChangedInBilling.length > 0) {
      Logging.logInfo({
        tenantID: tenant.id,
        source: Constants.CENTRAL_SERVER,
        action: Constants.ACTION_SYNCHRONIZE_BILLING,
        module: 'BillingService',
        method: 'handleSynchronizeUsers',
        message: `Users are going to be synchronized for ${usersChangedInBilling.length} changed Billing customers`
      });
      for (const changedBillingCustomer of usersChangedInBilling) {
        const billingUsers = await billingImpl.getUsers();
        let userStillExistsInStripe = false;
        for (const billingUser of billingUsers) {
          if (billingUser.id === changedBillingCustomer) {
            userStillExistsInStripe = true;
          }
        }
        if (!userStillExistsInStripe) {
          continue;
        }
        usersOldBillingData = await UserStorage.getUsers(tenant.id,
          { billingCustomer: changedBillingCustomer },
          Constants.DB_PARAMS_SINGLE_RECORD);
        if (usersOldBillingData.count > 0) {
          try {
            const updatedBillingUserData = await billingImpl.synchronizeUser(usersOldBillingData.result[0]);
            if (updatedBillingUserData.customerID) {
              await UserStorage.saveUserBillingData(tenant.id, usersOldBillingData.result[0].id, updatedBillingUserData);
              actionsDone.synchronized++;
            } else {
              actionsDone.error++;
            }
          } catch (error) {
            actionsDone.error++;
            Logging.logActionExceptionMessage(tenant.id, Constants.ACTION_SYNCHRONIZE_BILLING, error);
          }
        } else {
          Logging.logError({
            tenantID: tenant.id,
            source: Constants.CENTRAL_SERVER,
            action: Constants.ACTION_SYNCHRONIZE_BILLING,
            module: 'BillingService',
            method: 'handleSynchronizeUsers',
            message: `No user exists for billing customer ID '${changedBillingCustomer}`,
            detailedMessages: `Synchronization failed for customer ID '${changedBillingCustomer}' from the Billing application. No user exists for this customer ID`
          });
          actionsDone.error++;
        }
      }
    }
    // Final step
    await billingImpl.finalizeSynchronization();
    res.json(Object.assign(actionsDone, Constants.REST_RESPONSE_SUCCESS));
    next();
  }

  public static async handleGetCountryTaxes(action: string, req: Request, res: Response, next: NextFunction) {
    try {
      if (!Authorizations.isAdmin(req.user)) {
        throw new AppAuthError({
          errorCode: Constants.HTTP_AUTH_ERROR,
          user: req.user,
          action: Constants.ACTION_UPDATE,
          entity: Constants.ENTITY_USER,
          module: 'BillingService',
          method: 'handleSynchronizeUsers',
        });
      }

      const tenant = await TenantStorage.getTenant(req.user.tenantID);
      if (!Utils.isTenantComponentActive(tenant, Constants.COMPONENTS.BILLING) ||
        !Utils.isTenantComponentActive(tenant, Constants.COMPONENTS.PRICING)) {
        throw new AppError({
          source: Constants.CENTRAL_SERVER,
          errorCode: Constants.HTTP_GENERAL_ERROR,
          message: 'Billing or Pricing not active in this Tenant',
          module: 'BillingService',
          method: 'handleSynchronizeUsers',
          action: action,
          user: req.user
        });
      }
    } catch (error) {
      Logging.logActionExceptionMessageAndSendResponse(action, error, req, res, next);
    }

    // TODO find a better way to store taxes
    const dataPath = './src/assets/billing/tva.json';
    let response: DataResult<Tax>;
    if (fs.existsSync(dataPath)) {
      const tvaFromFile = JSON.parse(fs.readFileSync(dataPath).toString());
      const taxes = [] as Tax[];
      tvaFromFile.taxes.forEach((tax) => taxes.push(tax));
      taxes.sort((a, b) => (a.countryCode > b.countryCode) ? 1 : (a.countryCode < b.countryCode) ? -1 : 0);
      response = { result: taxes, count: taxes.length };
    } else {
      throw new AppError({
        source: Constants.CENTRAL_SERVER,
        errorCode: Constants.HTTP_GENERAL_ERROR,
        message: `Unable to find file : ${dataPath}`,
        module: 'BillingService',
        method: 'handleGetCountryTaxes',
        action: action,
        user: req.user
      });
    }

    res.json(Object.assign(response, Constants.REST_RESPONSE_SUCCESS));
  }
}
