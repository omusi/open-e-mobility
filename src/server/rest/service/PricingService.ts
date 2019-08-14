import { NextFunction, Request, Response } from 'express';
import AppAuthError from '../../../exception/AppAuthError';
import AppError from '../../../exception/AppError';
import Authorizations from '../../../authorization/Authorizations';
import Constants from '../../../utils/Constants';
import Database from '../../../utils/Database';
import Logging from '../../../utils/Logging';
import PricingSecurity from './security/PricingSecurity';
import PricingStorage from '../../../storage/mongodb/PricingStorage';

export default class PricingService {
  static async handleGetPricing(action: string, req: Request, res: Response, next: NextFunction) {
    try {
      // Check auth
      if (!Authorizations.canReadPricing(req.user)) {
        throw new AppAuthError(
          action, Constants.ENTITY_PRICING,
          null,
          Constants.HTTP_AUTH_ERROR, 'PricingService', 'handleGetPricing',
          req.user);
      }
      // Get the Pricing
      const pricing = await PricingStorage.getPricing(req.user.tenantID);
      // Return
      if (pricing) {
        res.json(
          // Filter
          PricingSecurity.filterPricingResponse(
            pricing, req.user)
        );
      } else {
        res.json(null);
      }
      next();
    } catch (error) {
      // Log
      Logging.logActionExceptionMessageAndSendResponse(action, error, req, res, next);
    }
  }

  static async handleUpdatePricing(action: string, req: Request, res: Response, next: NextFunction) {
    try {
      // Check auth
      if (!Authorizations.canUpdatePricing(req.user)) {
        throw new AppAuthError(
          action, Constants.ENTITY_PRICING,
          null,
          Constants.HTTP_AUTH_ERROR, 'PricingService', 'handleUpdatePricing',
          req.user);
      }
      // Filter
      const filteredRequest = PricingSecurity.filterPricingUpdateRequest(req.body, req.user);
      // Check
      if (!filteredRequest.priceKWH || isNaN(filteredRequest.priceKWH)) {
        // Not Found!
        throw new AppError(
          Constants.CENTRAL_SERVER,
          `The price ${filteredRequest.priceKWH} has not a correct format`, Constants.HTTP_GENERAL_ERROR,
          'PricingService', 'handleUpdatePricing', req.user);
      }
      // Update
      const pricing: any = {};
      Database.updatePricing(filteredRequest, pricing);
      // Set timestamp
      pricing.timestamp = new Date();
      // Get
      await PricingStorage.savePricing(req.user.tenantID, pricing);
      // Log
      Logging.logSecurityInfo({
        tenantID: req.user.tenantID,
        user: req.user, action: action,
        module: 'PricingService',
        method: 'handleUpdatePricing',
        message: `Pricing has been updated to '${req.body.priceKWH} ${req.body.priceUnit}'`,
        detailedMessages: req.body
      });
      // Ok
      res.json(Constants.REST_RESPONSE_SUCCESS);
      next();
    } catch (error) {
      // Log
      Logging.logActionExceptionMessageAndSendResponse(action, error, req, res, next);
    }
  }
}
