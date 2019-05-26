const sanitize = require('mongo-sanitize');
const Authorizations = require('../../../../authorization/Authorizations');
const Constants = require('../../../../utils/Constants');
const UtilsSecurity = require('./UtilsSecurity');

class TransactionSecurity {
  // eslint-disable-next-line no-unused-vars
  static filterTransactionsRefund(request, loggedUser) {
    const filteredRequest = {};
    // Set
    filteredRequest.transactionIds = request.transactionIds.map(id => sanitize(id));
    return filteredRequest;
  }

  // eslint-disable-next-line no-unused-vars
  static filterTransactionDelete(request, loggedUser) {
    const filteredRequest = {};
    // Set
    filteredRequest.ID = sanitize(request.ID);
    return filteredRequest;
  }

  // eslint-disable-next-line no-unused-vars
  static filterTransactionSoftStop(request, loggedUser) {
    const filteredRequest = {};
    // Set
    filteredRequest.transactionId = sanitize(request.transactionId);
    return filteredRequest;
  }

  // eslint-disable-next-line no-unused-vars
  static filterTransactionRequest(request, loggedUser) {
    const filteredRequest = {};
    // Set
    filteredRequest.ID = sanitize(request.ID);
    return filteredRequest;
  }

  // eslint-disable-next-line no-unused-vars
  static filterTransactionsActiveRequest(request, loggedUser) {
    const filteredRequest = {};
    filteredRequest.ChargeBoxID = sanitize(request.ChargeBoxID);
    filteredRequest.ConnectorId = sanitize(request.ConnectorId);
    filteredRequest.SiteAreaID = sanitize(request.SiteAreaID);
    if (request.UserID) {
      filteredRequest.UserID = sanitize(request.UserID);
    }
    UtilsSecurity.filterSkipAndLimit(request, filteredRequest);
    UtilsSecurity.filterSort(request, filteredRequest);
    return filteredRequest;
  }

  // eslint-disable-next-line no-unused-vars
  static filterTransactionsCompletedRequest(request, loggedUser) {
    const filteredRequest = {};
    // Handle picture
    filteredRequest.ChargeBoxID = sanitize(request.ChargeBoxID);
    filteredRequest.StartDateTime = sanitize(request.StartDateTime);
    filteredRequest.EndDateTime = sanitize(request.EndDateTime);
    filteredRequest.SiteID = sanitize(request.SiteID);
    filteredRequest.SiteAreaID = sanitize(request.SiteAreaID);
    filteredRequest.Search = sanitize(request.Search);
    filteredRequest.Type = sanitize(request.Type);
    filteredRequest.MinimalPrice = sanitize(request.MinimalPrice);
    if (request.UserID) {
      filteredRequest.UserID = sanitize(request.UserID);
    }
    UtilsSecurity.filterSkipAndLimit(request, filteredRequest);
    UtilsSecurity.filterSort(request, filteredRequest);
    return filteredRequest;
  }

  static filterTransactionsInErrorRequest(request) {
    const filteredRequest = {};
    // Handle picture
    filteredRequest.ChargeBoxID = sanitize(request.ChargeBoxID);
    filteredRequest.StartDateTime = sanitize(request.StartDateTime);
    filteredRequest.EndDateTime = sanitize(request.EndDateTime);
    filteredRequest.SiteID = sanitize(request.SiteID);
    filteredRequest.SiteAreaID = sanitize(request.SiteAreaID);
    filteredRequest.Search = sanitize(request.Search);
    filteredRequest.ErrorType = sanitize(request.ErrorType);
    if (request.UserID) {
      filteredRequest.UserID = sanitize(request.UserID);
    }
    UtilsSecurity.filterSkipAndLimit(request, filteredRequest);
    UtilsSecurity.filterSort(request, filteredRequest);
    return filteredRequest;
  }

  // Transaction
  /**
   *
   * @param transaction {Transaction}
   * @param loggedUser
   * @returns {*}
   */
  static filterTransactionResponse(transaction, loggedUser) {
    let filteredTransaction;

    if (!transaction) {
      return null;
    }
    // Check auth
    if (Authorizations.canReadTransaction(loggedUser, transaction)) {
      // Set only necessary info
      filteredTransaction = {};
      filteredTransaction.id = transaction.getID();
      if (transaction.getModel().errorCode) {
        filteredTransaction.uniqueId = transaction.getModel().uniqueId;
        filteredTransaction.errorCode = transaction.getModel().errorCode;
      }
      filteredTransaction.chargeBoxID = transaction.getChargeBoxID();
      filteredTransaction.siteID = transaction.getSiteID();
      filteredTransaction.siteAreaID = transaction.getSiteAreaID();
      filteredTransaction.connectorId = transaction.getConnectorId();
      filteredTransaction.meterStart = transaction.getMeterStart();
      filteredTransaction.timestamp = transaction.getStartDate();
      filteredTransaction.timezone = transaction.getTimezone();
      // if (Authorizations.isAdmin(loggedUser) && transaction.getModel().hasOwnProperty('price')) {
      if (transaction.hasStartPrice()) {
        filteredTransaction.price = transaction.getStartPrice();
        filteredTransaction.roundedPrice = transaction.getStartRoundedPrice();
        filteredTransaction.priceUnit = transaction.getStartPriceUnit();
        filteredTransaction.pricingSource = transaction.getStartPricingSource();
      }
      // Runime Data
      if (transaction.isActive()) {
        filteredTransaction.currentConsumption = transaction.getCurrentConsumption();
        filteredTransaction.currentTotalConsumption = transaction.getCurrentTotalConsumption();
        filteredTransaction.currentTotalInactivitySecs = transaction.getCurrentTotalInactivitySecs();
        filteredTransaction.currentTotalDurationSecs = transaction.getCurrentTotalDurationSecs();
        filteredTransaction.currentCumulatedPrice = transaction.getCurrentCumulatedPrice();
        filteredTransaction.currentStateOfCharge = transaction.getCurrentStateOfCharge();
        filteredTransaction.currentStateOfCharge = transaction.getCurrentStateOfCharge();
      }
      filteredTransaction.status = transaction.getChargerStatus();
      filteredTransaction.isLoading = transaction.isLoading();
      filteredTransaction.stateOfCharge = transaction.getStateOfCharge();
      filteredTransaction.refundData = transaction.getRefundData();
      // Demo user?
      if (Authorizations.isDemo(loggedUser)) {
        filteredTransaction.tagID = Constants.ANONIMIZED_VALUE;
      } else {
        filteredTransaction.tagID = transaction.getTagID();
      }
      // Filter user
      filteredTransaction.user = TransactionSecurity._filterUserInTransactionResponse(
        transaction.getUserJson(), loggedUser);
      // Transaction Stop
      if (transaction.isFinished()) {
        filteredTransaction.stop = {};
        filteredTransaction.stop.meterStop = transaction.getStopMeter();
        filteredTransaction.stop.timestamp = transaction.getStopDate();
        filteredTransaction.stop.totalConsumption = transaction.getStopTotalConsumption();
        filteredTransaction.stop.totalInactivitySecs = transaction.getStopTotalInactivitySecs() + transaction.getStopExtraInactivitySecs();
        filteredTransaction.stop.totalDurationSecs = transaction.getStopTotalDurationSecs();
        filteredTransaction.stop.stateOfCharge = transaction.getStopStateOfCharge();
        // if (Authorizations.isAdmin(loggedUser) && transaction.hasStopPrice()) {
        if (transaction.hasStopPrice()) {
          filteredTransaction.stop.price = transaction.getStopPrice();
          filteredTransaction.stop.roundedPrice = transaction.getStopRoundedPrice();
          filteredTransaction.stop.priceUnit = transaction.getStopPriceUnit();
          filteredTransaction.stop.pricingSource = transaction.getStopPricingSource();
        }
        // Demo user?
        if (Authorizations.isDemo(loggedUser)) {
          filteredTransaction.stop.tagID = Constants.ANONIMIZED_VALUE;
        } else {
          filteredTransaction.stop.tagID = transaction.getStopTagID();
        }
        // Stop User
        if (transaction.getStopUserJson()) {
          // Filter user
          filteredTransaction.stop.user = TransactionSecurity._filterUserInTransactionResponse(
            transaction.getStopUserJson(), loggedUser);
        }
      }
    }
    return filteredTransaction;
  }

  static filterTransactionsResponse(transactions, loggedUser) {
    const filteredTransactions = [];
    if (!transactions.result) {
      return null;
    }
    // Filter result
    for (const transaction of transactions.result) {
      // Filter
      const filteredTransaction = TransactionSecurity.filterTransactionResponse(transaction, loggedUser);
      // Ok?
      if (filteredTransaction) {
        filteredTransactions.push(filteredTransaction);
      }
    }
    transactions.result = filteredTransactions;
  }

  static _filterUserInTransactionResponse(user, loggedUser) {
    const userID = {};

    if (!user) {
      return null;
    }
    // Check auth
    if (Authorizations.canReadUser(loggedUser, user)) {
      // Demo user?
      if (Authorizations.isDemo(loggedUser)) {
        userID.id = null;
        userID.name = Constants.ANONIMIZED_VALUE;
        userID.firstName = Constants.ANONIMIZED_VALUE;
      } else {
        userID.id = user.id;
        userID.name = user.name;
        userID.firstName = user.firstName;
      }
    }
    return userID;
  }

  // eslint-disable-next-line no-unused-vars
  static filterChargingStationConsumptionFromTransactionRequest(request, loggedUser) {
    const filteredRequest = {};
    // Set
    filteredRequest.TransactionId = sanitize(request.TransactionId);
    filteredRequest.StartDateTime = sanitize(request.StartDateTime);
    filteredRequest.EndDateTime = sanitize(request.EndDateTime);
    return filteredRequest;
  }

  // eslint-disable-next-line no-unused-vars
  static filterChargingStationTransactionsRequest(request, loggedUser) {
    const filteredRequest = {};
    // Set
    filteredRequest.ChargeBoxID = sanitize(request.ChargeBoxID);
    filteredRequest.ConnectorId = sanitize(request.ConnectorId);
    filteredRequest.StartDateTime = sanitize(request.StartDateTime);
    filteredRequest.EndDateTime = sanitize(request.EndDateTime);
    UtilsSecurity.filterSkipAndLimit(request, filteredRequest);
    UtilsSecurity.filterSort(request, filteredRequest);
    return filteredRequest;
  }

  /**
   *
   * @param transaction {Transaction}
   * @param consumptions {Consumption[]}
   * @param loggedUser
   * @returns {*}
   */
  static filterConsumptionsFromTransactionResponse(transaction, consumptions, loggedUser) {
    if (!consumptions) {
      consumptions = [];
    }
    // Check Authorisation
    if (transaction.getUserJson()) {
      if (!Authorizations.canReadUser(loggedUser, transaction.getUserJson())) {
        return null;
      }
    } else {
      if (!Authorizations.isAdmin(loggedUser)) {
        return null;
      }
    }
    const filteredTransaction = this.filterTransactionResponse(transaction, loggedUser);
    // Admin?
    if (Authorizations.isAdmin(loggedUser)) {
      // Set them all
      filteredTransaction.values = consumptions.map(consumption => consumption.getModel()).map(consumption => ({
        ...consumption,
        date: consumption.endedAt,
        value: consumption.instantPower,
        cumulated: consumption.cumulatedConsumption
      }));
    } else {
      // Clean
      filteredTransaction.values = consumptions.map(consumption => consumption.getModel()).map(consumption => ({
        endedAt: consumption.endedAt,
        instantPower: consumption.instantPower,
        cumulatedConsumption: consumption.cumulatedConsumption,
        stateOfCharge: consumption.stateOfCharge,
        date: consumption.endedAt,
        value: consumption.instantPower,
        cumulated: consumption.cumulatedConsumption
      }));
    }
    return filteredTransaction;
  }
}

module.exports = TransactionSecurity;
