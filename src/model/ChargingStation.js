const Utils = require('../utils/Utils');
const ChargingStationClient = require('../client/ChargingStationClient');
const Logging = require('../utils/Logging');
const User = require('./User');
const Transaction = require('./Transaction');
const SiteArea = require('./SiteArea');
const Constants = require('../utils/Constants');
const Database = require('../utils/Database');
const moment = require('moment');
const Configuration = require('../utils/Configuration');
const NotificationHandler = require('../notification/NotificationHandler');
const Authorizations = require('../authorization/Authorizations');
const AppError = require('../exception/AppError');
const ChargingStationStorage = require('../storage/mongodb/ChargingStationStorage');
const SiteAreaStorage = require('../storage/mongodb/SiteAreaStorage');
const TransactionStorage = require('../storage/mongodb/TransactionStorage');
const momentDurationFormatSetup = require("moment-duration-format");
momentDurationFormatSetup(moment);
const _configAdvanced = Configuration.getAdvancedConfig();
const _configChargingStation = Configuration.getChargingStationConfig();

class ChargingStation {
  constructor(chargingStation) {
    // Init model
    this._model = {};
    // Set it
    Database.updateChargingStation(chargingStation, this._model);
  }

  static checkIfChargingStationValid(filteredRequest, request) {
    // Update mode?
    if (request.method !== 'POST' && !filteredRequest.id) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `The Charging Station ID is mandatory`, 500,
        'ChargingStations', 'checkIfChargingStationValid');
    }
  }

  static getChargingStation(id) {
    return ChargingStationStorage.getChargingStation(id);
  }

  static getChargingStations(params, limit, skip, sort) {
    return ChargingStationStorage.getChargingStations(params, limit, skip, sort)
  }

  handleAction(action, params = {}) {
    // Handle Client Requests
    switch (action) {
      // Reset
      case 'Reset':
        return this.requestReset(params);

      // Clear cache
      case 'ClearCache':
        return this.requestClearCache();

      // Get Configuration
      case 'GetConfiguration':
        return this.requestGetConfiguration(params);

      // Set Configuration
      case 'ChangeConfiguration':
        // Change the config
        return this.requestChangeConfiguration(params);

      // Unlock Connector
      case 'UnlockConnector':
        return this.requestUnlockConnector(params);

      // Start Transaction
      case 'StartTransaction':
        return this.requestStartTransaction(params);

      // Stop Transaction
      case 'StopTransaction':
        return this.requestStopTransaction(params);

      // Not Exists!
      default:
        // Log
        Logging.logError({
          source: this.getID(), module: 'ChargingStation', method: 'handleAction',
          message: `Action does not exist: ${action}`
        });
        throw new Error(`Action does not exist: ${action}`);
    }
  }

  getID() {
    return this._model.id;
  }

  setSiteArea(siteArea) {
    if (siteArea) {
      this._model.siteArea = siteArea.getModel();
      this._model.siteAreaID = siteArea.getID();
    } else {
      this._model.siteArea = null;
    }
  }

  async getSiteArea(withSite = false) {
    if (this._model.siteArea) {
      return new SiteArea(this._model.siteArea);
    } else if (this._model.siteAreaID) {
      // Get from DB
      const siteArea = await SiteAreaStorage.getSiteArea(this._model.siteAreaID, false, withSite);
      // Set it
      this.setSiteArea(siteArea);
      // Return
      return siteArea;
    }
  }

  getChargePointVendor() {
    return this._model.chargePointVendor;
  }

  setChargePointVendor(chargePointVendor) {
    this._model.chargePointVendor = chargePointVendor;
  }

  getChargePointModel() {
    return this._model.chargePointModel;
  }

  setChargePointModel(chargePointModel) {
    this._model.chargePointModel = chargePointModel;
  }

  getCFApplicationIDAndInstanceIndex() {
    return this._model.cfApplicationIDAndInstanceIndex;
  }

  setCFApplicationIDAndInstanceIndex(cfApplicationIDAndInstanceIndex) {
    this._model.cfApplicationIDAndInstanceIndex = cfApplicationIDAndInstanceIndex;
  }

  getChargePointSerialNumber() {
    return this._model.chargePointSerialNumber;
  }

  setChargePointSerialNumber(chargePointSerialNumber) {
    this._model.chargePointSerialNumber = chargePointSerialNumber;
  }

  getChargeBoxSerialNumber() {
    return this._model.chargeBoxSerialNumber;
  }

  setChargeBoxSerialNumber(chargeBoxSerialNumber) {
    this._model.chargeBoxSerialNumber = chargeBoxSerialNumber;
  }

  setInactive(inactive) {
    this._model.inactive = inactive;
  }

  isInactive() {
    return this._model.inactive;
  }

  getNumberOfConnectedPhase() {
    return this._model.numberOfConnectedPhase;
  }

  setNumberOfConnectedPhase(numberOfConnectedPhase) {
    this._model.numberOfConnectedPhase = numberOfConnectedPhase;
  }

  getMaximumPower() {
    return this._model.maximumPower;
  }

  setMaximumPower(maximumPower) {
    this._model.maximumPower = maximumPower;
  }

  setCannotChargeInParallel(cannotChargeInParallel) {
    this._model.cannotChargeInParallel = cannotChargeInParallel;
  }

  canChargeInParallel() {
    return !this._model.cannotChargeInParallel;
  }

  getFirmwareVersion() {
    return this._model.firmwareVersion;
  }

  setFirmwareVersion(firmwareVersion) {
    this._model.firmwareVersion = firmwareVersion;
  }

  getIccid() {
    return this._model.iccid;
  }

  setIccid(iccid) {
    this._model.iccid = iccid;
  }

  getImsi() {
    return this._model.imsi;
  }

  setImsi(imsi) {
    this._model.imsi = imsi;
  }

  getMeterType() {
    return this._model.meterType;
  }

  setMeterType(meterType) {
    this._model.meterType = meterType;
  }

  getMeterSerialNumber() {
    return this._model.meterSerialNumber;
  }

  setMeterSerialNumber(meterSerialNumber) {
    this._model.meterSerialNumber = meterSerialNumber;
  }

  getCreatedBy() {
    if (this._model.createdBy) {
      return new User(this._model.createdBy);
    }
    return null;
  }

  setCreatedBy(user) {
    this._model.createdBy = user.getModel();
  }

  getCreatedOn() {
    return this._model.createdOn;
  }

  setCreatedOn(createdOn) {
    this._model.createdOn = createdOn;
  }

  getLastChangedBy() {
    if (this._model.lastChangedBy) {
      return new User(this._model.lastChangedBy);
    }
    return null;
  }

  setLastChangedBy(user) {
    this._model.lastChangedBy = user.getModel();
  }

  getLastChangedOn() {
    return this._model.lastChangedOn;
  }

  setLastChangedOn(lastChangedOn) {
    this._model.lastChangedOn = lastChangedOn;
  }

  getEndPoint() {
    return this._model.endpoint;
  }

  setEndPoint(endpoint) {
    this._model.endpoint = endpoint;
  }

  getChargingStationURL() {
    return this._model.chargingStationURL;
  }

  setChargingStationURL(chargingStationURL) {
    this._model.chargingStationURL = chargingStationURL;
  }

  getOcppVersion() {
    return this._model.ocppVersion;
  }

  setOcppVersion(ocppVersion) {
    this._model.ocppVersion = ocppVersion;
  }

  getOcppProtocol() {
    return this._model.ocppProtocol;
  }

  setOcppProtocol(ocppProtocol) {
    this._model.ocppProtocol = ocppProtocol;
  }

  getChargingStationClient() {
    // Get the client
    return ChargingStationClient.getChargingStationClient(this);
  }

  getLastHeartBeat() {
    return this._model.lastHeartBeat;
  }

  setLastHeartBeat(lastHeartBeat) {
    this._model.lastHeartBeat = lastHeartBeat;
  }

  getConnectors() {
    return this._model.connectors;
  }

  getConnector(identifier) {
    return this._model.connectors[identifier - 1];
  }

  setConnectors(connectors) {
    this._model.connectors = connectors;
  }

  getLastReboot() {
    return this._model.lastReboot;
  }

  setLastReboot(lastReboot) {
    this._model.lastReboot = lastReboot;
  }

  getModel() {
    return this._model;
  }

  save() {
    // Init Connectors
    if (!this.getConnectors()) {
      this.setConnectors([]);
    }
    // Save
    return ChargingStationStorage.saveChargingStation(this.getModel());
  }

  saveHeartBeat() {
    // Save
    return ChargingStationStorage.saveChargingStationHeartBeat(this.getModel());
  }

  saveChargingStationSiteArea() {
    // Save
    return ChargingStationStorage.saveChargingStationSiteArea(this.getModel());
  }

  async handleStatusNotification(statusNotification) {
    // Set the Station ID
    statusNotification.chargeBoxID = this.getID();
    if (!statusNotification.timestamp) {
      statusNotification.timestamp = new Date().toISOString();
    }
    // Update the connector -----------------------------------------
    // Get the connectors
    const connectors = this.getConnectors();
    // Init previous connector status
    for (let i = 0; i < statusNotification.connectorId; i++) {
      // Check if former connector can be set
      if (!connectors[i]) {
        // Init
        connectors[i] = {connectorId: i + 1, currentConsumption: 0, status: 'Unknown', power: 0};
      }
    }
    // Set the status
    connectors[statusNotification.connectorId - 1].connectorId = statusNotification.connectorId;
    // Error Code?
    connectors[statusNotification.connectorId - 1].status = statusNotification.status;
    connectors[statusNotification.connectorId - 1].errorCode = statusNotification.errorCode;
    connectors[statusNotification.connectorId - 1].info = (statusNotification.info ? statusNotification.info : '');
    connectors[statusNotification.connectorId - 1].vendorErrorCode = (statusNotification.vendorErrorCode ? statusNotification.vendorErrorCode : '');
    // Set
    this.setConnectors(connectors);
    if (!connectors[statusNotification.connectorId - 1].power) {
      // Update Connector's Power
      this.updateConnectorsPower();
    }
    // Save Status Notif
    await ChargingStationStorage.saveStatusNotification(statusNotification);
    // Save Connector
    await ChargingStationStorage.saveChargingStationConnector(this.getModel(), statusNotification.connectorId);
    // Log
    Logging.logInfo({
      source: this.getID(),
      module: 'ChargingStation',
      method: 'handleStatusNotification',
      action: 'StatusNotification',
      message: `'${statusNotification.status}' - '${statusNotification.errorCode}' - '${(statusNotification.info ? statusNotification.info : 'N/A')}' on Connector '${statusNotification.connectorId}' has been saved`
    });
    // Notify if error
    if (statusNotification.status === 'Faulted') {
      // Log
      Logging.logError({
        source: this.getID(), module: 'ChargingStation',
        method: 'handleStatusNotification', action: 'StatusNotification',
        message: `Error on connector ${statusNotification.connectorId}: '${statusNotification.status}' - '${statusNotification.errorCode}' - '${statusNotification.info}'`
      });
      // Send Notification
      NotificationHandler.sendChargingStationStatusError(
        Utils.generateGUID(),
        this.getModel(),
        {
          'chargeBoxID': this.getID(),
          'connectorId': statusNotification.connectorId,
          'error': `${statusNotification.status} - ${statusNotification.errorCode} - ${statusNotification.info}`,
          'evseDashboardURL': Utils.buildEvseURL(),
          'evseDashboardChargingStationURL': Utils.buildEvseChargingStationURL(this, statusNotification.connectorId)
        }
      );
    }
  }

  async updateConnectorsPower() {
    let voltageRerefence = 0;
    let current = 0;
    let nbPhase = 0;
    let power = 0;
    let totalPower = 0;

    // Only for Schneider
    if (this.getChargePointVendor() === 'Schneider Electric') {
      // Get the configuration
      const configuration = await this.getConfiguration();
      // Config Provided?
      if (configuration && configuration.configuration) {
        // Search for params
        for (let i = 0; i < configuration.configuration.length; i++) {
          // Check
          switch (configuration.configuration[i].key) {
            // Voltage
            case 'voltagererefence':
              // Get the meter interval
              voltageRerefence = parseInt(configuration.configuration[i].value);
              break;

            // Current
            case 'currentpb1':
              // Get the meter interval
              current = parseInt(configuration.configuration[i].value);
              break;

            // Nb Phase
            case 'nbphase':
              // Get the meter interval
              nbPhase = parseInt(configuration.configuration[i].value);
              break;
          }
        }
        // Override?
        if (this.getNumberOfConnectedPhase()) {
          // Yes
          nbPhase = this.getNumberOfConnectedPhase();
        }
        // Compute it
        if (voltageRerefence && current && nbPhase) {
          // One Phase?
          if (nbPhase == 1) {
            power = Math.floor(230 * current);
          } else {
            power = Math.floor(400 * current * Math.sqrt(nbPhase));
          }
        }
      }
      // Set Power
      for (const connector of this.getConnectors()) {
        if (connector) {
          connector.power = power;
          totalPower += power;
        }
      }
      // Set total power
      if (totalPower && !this.getMaximumPower()) {
        // Set
        this.setMaximumPower(totalPower);
      }
    }
  }

  async handleBootNotification(bootNotification) {
    // Set the Station ID
    bootNotification.chargeBoxID = this.getID();
    // Send Notification
    NotificationHandler.sendChargingStationRegistered(
      Utils.generateGUID(),
      this.getModel(),
      {
        'chargeBoxID': this.getID(),
        'evseDashboardURL': Utils.buildEvseURL(),
        'evseDashboardChargingStationURL': Utils.buildEvseChargingStationURL(this)
      }
    );
    // Save Boot Notification
    await ChargingStationStorage.saveBootNotification(bootNotification);
    // Log
    Logging.logInfo({
      source: this.getID(),
      module: 'ChargingStation', method: 'handleBootNotification',
      action: 'BootNotification', message: `Boot notification saved`
    });
    // Handle the get of configuration later on
    setTimeout(() => {
      // Get config and save it
      this.requestAndSaveConfiguration();
    }, 3000);
  }

  async handleHeartBeat() {
    // Set Heartbeat
    this.setLastHeartBeat(new Date());
    // Save
    await this.saveHeartBeat();
    // Update Charger Max Power?
    if (!this.getMaximumPower()) {
      // Yes
      await this.updateConnectorsPower();
      // Save Charger
      await this.save();
    }
    // Log
    Logging.logInfo({
      source: this.getID(),
      module: 'ChargingStation', method: 'handleHeartBeat',
      action: 'Heartbeat', message: `Heartbeat saved`
    });
  }

  async requestAndSaveConfiguration() {
    let configuration = null;
    try {
      // In case of error. the boot should no be denied
      configuration = await this.requestGetConfiguration({});
      // Log
      Logging.logInfo({
        source: this.getID(), module: 'ChargingStation',
        method: 'requestAndSaveConfiguration', action: 'RequestConfiguration',
        message: `Command sent with success`,
        detailedMessages: configuration
      });
      // Override with Conf
      configuration = {
        'configuration': configuration.configurationKey
      }
    } catch (error) {
      // Log error
      Logging.logActionExceptionMessage('RequestConfiguration', error);
    }
    // Set default?
    if (!configuration) {
      // Check if there is an already existing config
      const existingConfiguration = await this.getConfiguration();
      if (!existingConfiguration) {
        // No config at all: Set default OCCP configuration
        configuration = {
          'configuration': [
            {'key': 'AllowOfflineTxForUnknownId', 'readonly': false, 'value': null},
            {'key': 'AuthorizationCacheEnabled', 'readonly': false, 'value': null},
            {'key': 'AuthorizeRemoteTxRequests', 'readonly': false, 'value': null},
            {'key': 'BlinkRepeat', 'readonly': false, 'value': null},
            {'key': 'ClockAlignedDataInterval', 'readonly': false, 'value': null},
            {'key': 'ConnectionTimeOut', 'readonly': false, 'value': null},
            {'key': 'GetConfigurationMaxKeys', 'readonly': false, 'value': null},
            {'key': 'HeartbeatInterval', 'readonly': false, 'value': null},
            {'key': 'LightIntensity', 'readonly': false, 'value': null},
            {'key': 'LocalAuthorizeOffline', 'readonly': false, 'value': null},
            {'key': 'LocalPreAuthorize', 'readonly': false, 'value': null},
            {'key': 'MaxEnergyOnInvalidId', 'readonly': false, 'value': null},
            {'key': 'MeterValuesAlignedData', 'readonly': false, 'value': null},
            {'key': 'MeterValuesAlignedDataMaxLength', 'readonly': false, 'value': null},
            {'key': 'MeterValuesSampledData', 'readonly': false, 'value': null},
            {'key': 'MeterValuesSampledDataMaxLength', 'readonly': false, 'value': null},
            {'key': 'MeterValueSampleInterval', 'readonly': false, 'value': null},
            {'key': 'MinimumStatusDuration', 'readonly': false, 'value': null},
            {'key': 'NumberOfConnectors', 'readonly': false, 'value': null},
            {'key': 'ResetRetries', 'readonly': false, 'value': null},
            {'key': 'ConnectorPhaseRotation', 'readonly': false, 'value': null},
            {'key': 'ConnectorPhaseRotationMaxLength', 'readonly': false, 'value': null},
            {'key': 'StopTransactionOnEVSideDisconnect', 'readonly': false, 'value': null},
            {'key': 'StopTransactionOnInvalidId', 'readonly': false, 'value': null},
            {'key': 'StopTxnAlignedData', 'readonly': false, 'value': null},
            {'key': 'StopTxnAlignedDataMaxLength', 'readonly': false, 'value': null},
            {'key': 'StopTxnSampledData', 'readonly': false, 'value': null},
            {'key': 'StopTxnSampledDataMaxLength', 'readonly': false, 'value': null},
            {'key': 'SupportedFeatureProfiles', 'readonly': false, 'value': null},
            {'key': 'SupportedFeatureProfilesMaxLength', 'readonly': false, 'value': null},
            {'key': 'TransactionMessageAttempts', 'readonly': false, 'value': null},
            {'key': 'TransactionMessageRetryInterval', 'readonly': false, 'value': null},
            {'key': 'UnlockConnectorOnEVSideDisconnect', 'readonly': false, 'value': null},
            {'key': 'WebSocketPingInterval', 'readonly': false, 'value': null},
            {'key': 'LocalAuthListEnabled', 'readonly': false, 'value': null},
            {'key': 'LocalAuthListMaxLength', 'readonly': false, 'value': null},
            {'key': 'SendLocalListMaxLength', 'readonly': false, 'value': null},
            {'key': 'ReserveConnectorZeroSupported', 'readonly': false, 'value': null},
            {'key': 'ChargeProfileMaxStackLevel', 'readonly': false, 'value': null},
            {'key': 'ChargingScheduleAllowedChargingRateUnit', 'readonly': false, 'value': null},
            {'key': 'ChargingScheduleMaxPeriods', 'readonly': false, 'value': null},
            {'key': 'ConnectorSwitch3to1PhaseSupported', 'readonly': false, 'value': null},
            {'key': 'MaxChargingProfilesInstalled', 'readonly': false, 'value': null}
          ]
        };
      } else {
        // Set default
        configuration = existingConfiguration;
      }
    }
    // Save it
    await this.saveConfiguration(configuration);
    // Ok
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation',
      method: 'requestAndSaveConfiguration', action: 'RequestConfiguration',
      message: `Configuration has been saved`
    });
    // Update connector power
    await this.updateConnectorsPower();
    // Ok
    return {status: 'Accepted'};
  }

  async updateChargingStationConsumption(transactionId) {
    // Get the last transaction first
    const transaction = await TransactionStorage.getTransaction(transactionId);

    if (!transaction) {
      Logging.logError({
        source: this.getID(), module: 'ChargingStation',
        method: 'updateChargingStationConsumption', action: 'ChargingStationConsumption',
        message: `Transaction ID '${transactionId}' not found`
      });
      return;
    }


    const connector = this.getConnector(transaction.connectorId);

    if (transaction.isActive()) {
      const newCurrentConsumption = transaction.currentConsumption;
      const newTotalConsumption = transaction.totalConsumption;
      // Changed?
      if (connector.currentConsumption !== newCurrentConsumption ||
        connector.totalConsumption !== newTotalConsumption) {
        // Set consumption
        connector.currentConsumption = newCurrentConsumption;
        connector.totalConsumption = newTotalConsumption;
        // Log
        Logging.logInfo({
          source: this.getID(), module: 'ChargingStation',
          method: 'updateChargingStationConsumption', action: 'ChargingStationConsumption',
          message: `Connector '${connector.connectorId}' - Consumption changed to ${connector.currentConsumption}, Total: ${connector.totalConsumption}`
        });
      }
      // Update Transaction ID
      connector.activeTransactionID = transactionId;
      // Update Heartbeat
      this.setLastHeartBeat(new Date());
      // Handle End Of charge
      this.handleNotificationEndOfCharge(transaction);
    } else {
      // Set consumption
      connector.currentConsumption = 0;
      connector.totalConsumption = 0;
      // Reset Transaction ID
      connector.activeTransactionID = 0;
      // Log
      Logging.logInfo({
        source: this.getID(), module: 'ChargingStation',
        method: 'updateChargingStationConsumption', action: 'ChargingStationConsumption',
        message: `Connector '${connector.connectorId}' - Consumption changed to ${connector.currentConsumption}, Total: ${connector.totalConsumption}`
      });
    }
  }

  async handleNotificationEndOfCharge(transaction) {
    // Transaction in progress?
    if (transaction && transaction.isActive()) {
      // Has consumption?
      if (transaction.hasMultipleConsumptions()) {
        // --------------------------------------------------------------------
        // Notification END of charge
        // --------------------------------------------------------------------
        if (_configChargingStation.notifEndOfChargeEnabled && transaction.getAverageConsumptionOnLast(2) === 0) {
          // Notify User?
          if (transaction.initiator) {
            // Send Notification
            NotificationHandler.sendEndOfCharge(
              transaction.id + '-EOC',
              transaction.initiator,
              this.getModel(),
              {
                'user': transaction.initiator,
                'chargingBoxID': this.getID(),
                'connectorId': transaction.connectorId,
                'totalConsumption': (this.getConnector(transaction.connectorId).totalConsumption / 1000).toLocaleString(
                  (transaction.initiator.locale ? transaction.initiator.locale.replace('_', '-') : Constants.DEFAULT_LOCALE.replace('_', '-')),
                  {minimumIntegerDigits: 1, minimumFractionDigits: 0, maximumFractionDigits: 2}),
                'totalDuration': this._buildCurrentTransactionDuration(transaction),
                'evseDashboardChargingStationURL': Utils.buildEvseTransactionURL(this, transaction.connectorId, transaction.id),
                'evseDashboardURL': Utils.buildEvseURL()
              },
              transaction.initiator.locale
            );
          }

          // Stop Transaction and Unlock Connector?
          if (_configChargingStation.notifStopTransactionAndUnlockConnector) {
            try {
              // Yes: Stop the transaction
              let result = await this.requestStopTransaction(transaction.id);
              // Ok?
              if (result && result.status === 'Accepted') {
                // Cannot unlock the connector
                Logging.logInfo({
                  source: this.getID(), module: 'ChargingStation', method: 'handleNotificationEndOfCharge',
                  action: 'NotifyEndOfCharge', message: `Transaction ID '${transaction.id}' has been stopped`,
                  detailedMessages: transaction.model
                });
                // Unlock the connector
                result = await this.requestUnlockConnector(transaction.connectorId);
                // Ok?
                if (result && result.status === 'Accepted') {
                  // Cannot unlock the connector
                  Logging.logInfo({
                    source: this.getID(), module: 'ChargingStation', method: 'handleNotificationEndOfCharge',
                    action: 'NotifyEndOfCharge', message: `Connector '${transaction.connectorId}' has been unlocked`,
                    detailedMessages: transaction.model
                  });
                } else {
                  // Cannot unlock the connector
                  Logging.logError({
                    source: this.getID(), module: 'ChargingStation', method: 'handleNotificationEndOfCharge',
                    action: 'NotifyEndOfCharge', message: `Cannot unlock the connector '${transaction.connectorId}'`,
                    detailedMessages: transaction.model
                  });
                }
              } else {
                // Cannot stop the transaction
                Logging.logError({
                  source: this.getID(), module: 'ChargingStation', method: 'handleNotificationEndOfCharge',
                  action: 'NotifyEndOfCharge', message: `Cannot stop the transaction`,
                  detailedMessages: transaction.model
                });
              }
            } catch (error) {
              // Log error
              Logging.logActionExceptionMessage('EndOfCharge', error);
            }
          }
        }
      }
    }
  }

  // Build Inactivity
  _buildCurrentTransactionInactivity(transaction, i18nHourShort = 'h') {
    const totalInactivitySecs = transaction.totalInactivitySecs;

    if (transaction.isActive() || totalInactivitySecs === 0) {
      return `0${i18nHourShort}00 (0%)`;
    }

    const duration = transaction.duration;
    const totalInactivityPercent = Math.round(parseInt(totalInactivitySecs) * 100 / duration.asSeconds());
    return transaction.duration.format(`h[${i18nHourShort}]mm`) + `(${totalInactivityPercent})%`;
  }

  // Build duration
  _buildCurrentTransactionDuration(transaction) {
    return transaction.duration.format(`h[h]mm`);
  }

  async handleMeterValues(meterValues) {
    // Create model
    const newMeterValues = {};
    let meterValuesContext;
    // Check Meter Value Context
    if (meterValues && meterValues.values && meterValues.values.value && !Array.isArray(meterValues.values) && meterValues.values.value.attributes) {
      // Get the Context: Sample.Clock, Sample.Periodic
      meterValuesContext = meterValues.values.value.attributes.context;
    } else {
      // Default
      meterValuesContext = Constants.METER_VALUE_CTX_SAMPLE_PERIODIC;
    }
    // Init
    newMeterValues.values = [];
    // Set the charger ID
    newMeterValues.chargeBoxID = this.getID();
    // Check Connector ID
    if (meterValues.connectorId == 0) {
      // BUG KEBA: Connector ID must be > 0 according OCPP
      Logging.logWarning({
        source: this.getID(), module: 'ChargingStation', method: 'handleMeterValues',
        action: 'MeterValues', message: `Connector ID cannot be equal to '0' and has been reset to '1'`
      });
      // Set to 1 (KEBA has only one connector)
      meterValues.connectorId = 1;
    }
    // Check if the transaction ID matches
    const chargerTransactionId = this.getConnector(meterValues.connectorId).activeTransactionID;
    // Same?
    if (meterValues.hasOwnProperty('transactionId')) {
      // BUG ABB: Check ID
      if (parseInt(meterValues.transactionId) !== parseInt(chargerTransactionId)) {
        // No: Log
        Logging.logWarning({
          source: this.getID(),
          module: 'ChargingStation',
          method: 'handleMeterValues',
          action: 'MeterValues',
          message: `Transaction ID '${meterValues.transactionId}' not found but retrieved from StartTransaction '${chargerTransactionId}'`
        });
        // Override
        meterValues.transactionId = chargerTransactionId;
      }
    } else if (chargerTransactionId > 0) {
      // No Transaction ID, retrieve it
      Logging.logWarning({
        source: this.getID(),
        module: 'ChargingStation',
        method: 'handleMeterValues',
        action: 'MeterValues',
        message: `Transaction ID is not provided but retrieved from StartTransaction '${chargerTransactionId}'`
      });
      // Override
      meterValues.transactionId = chargerTransactionId;
    }
    // Check Transaction
    if (meterValues.transactionId && parseInt(meterValues.transactionId) === 0) {
      // Wrong Transaction ID!
      Logging.logError({
        source: this.getID(), module: 'ChargingStation', method: 'handleMeterValues',
        action: 'MeterValues', message: `Transaction ID must not be equal to '0'`
      });
    }
    // Handle Values
    // Check if OCPP 1.6
    if (meterValues.meterValue) {
      // Set it to 'values'
      meterValues.values = meterValues.meterValue;
    }
    // Only one value?
    if (!Array.isArray(meterValues.values)) {
      // Make it an array
      meterValues.values = [meterValues.values];
    }
    // For each value
    for (const value of meterValues.values) {
      const newMeterValue = {};
      // Set the ID
      newMeterValue.chargeBoxID = newMeterValues.chargeBoxID;
      newMeterValue.connectorId = meterValues.connectorId;
      if (meterValues.transactionId) {
        newMeterValue.transactionId = meterValues.transactionId;
      }
      newMeterValue.timestamp = value.timestamp;

      // Check OCPP 1.6
      if (value.sampledValue) {
        if (Array.isArray(value.sampledValue)) {
          for (const sampledValue of value.sampledValue) {
            // Normalize
            value.value = sampledValue.value;
            newMeterValue.attribute = {};
            newMeterValue.attribute.context = (sampledValue.hasOwnProperty('context') ? sampledValue.context : "Sample.Periodic");
            newMeterValue.attribute.format = (sampledValue.hasOwnProperty('format') ? sampledValue.format : "Raw");
            newMeterValue.attribute.measurand = (sampledValue.hasOwnProperty('measurand') ? sampledValue.measurand : "Energy.Active.Import.Register");
            newMeterValue.attribute.location = (sampledValue.hasOwnProperty('location') ? sampledValue.location : "Outlet");
            newMeterValue.attribute.unit = (sampledValue.hasOwnProperty('unit') ? sampledValue.unit : "Wh");
            newMeterValue.value = parseInt(value.value);
            newMeterValues.values.push(newMeterValue);
          }
        } else {
          // Normalize
          value.value = value.sampledValue;
          newMeterValue.value = parseInt(value.value);
          newMeterValues.values.push(newMeterValue);
        }

      } else if (value.value) { // Values provided?
        // OCCP1.2: Set the values
        if (value.value.$value) {
          // Set
          newMeterValue.value = value.value.$value;
          newMeterValue.attribute = value.value.attributes;
        } else {
          newMeterValue.value = parseInt(value.value);
        }
        // Add
        newMeterValues.values.push(newMeterValue);
      }

    }
    // Compute consumption?
    if (meterValues.transactionId) {
      // Save Meter Values
      await TransactionStorage.saveMeterValues(newMeterValues);
      // Update Charging Station Consumption
      await this.updateChargingStationConsumption(meterValues.transactionId);
      // Save
      await this.save();
      // Log
      Logging.logInfo({
        source: this.getID(),
        module: 'ChargingStation',
        method: 'handleMeterValues',
        action: 'MeterValues',
        message: `'${meterValuesContext}' have been saved for Transaction ID '${meterValues.transactionId}'`,
        detailedMessages: meterValues
      });
    } else {
      // Log
      Logging.logWarning({
        source: this.getID(), module: 'ChargingStation', method: 'handleMeterValues',
        action: 'MeterValues', message: `'${meterValuesContext}' not saved (not linked to a Transaction)`,
        detailedMessages: meterValues
      });
    }
  }

  saveConfiguration(configuration) {
    // Set the charger ID
    configuration.chargeBoxID = this.getID();
    configuration.timestamp = new Date();

    // Save config
    return ChargingStationStorage.saveConfiguration(configuration);
  }

  setDeleted(deleted) {
    this._model.deleted = deleted;
  }

  isDeleted() {
    return this._model.deleted;
  }

  async delete() {
    // Check if the user has a transaction
    const result = await this.hasAtLeastOneTransaction();
    if (result) {
      // Delete logically
      // Set deleted
      this.setDeleted(true);
      // Delete
      await this.save();
    } else {
      // Delete physically
      await ChargingStationStorage.deleteChargingStation(this.getID());
    }
  }

  getActiveTransaction(connectorId) {
    return TransactionStorage.getActiveTransaction(this.getID(), connectorId);
  }

  async handleDataTransfer(dataTransfer) {
    // Set the charger ID
    dataTransfer.chargeBoxID = this.getID();
    dataTransfer.timestamp = new Date();
    // Save it
    await ChargingStationStorage.saveDataTransfer(dataTransfer);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'CharingStation', method: 'handleDataTransfer',
      action: 'DataTransfer', message: `Data Transfer has been saved`
    });
  }

  async handleDiagnosticsStatusNotification(diagnosticsStatusNotification) {
    // Set the charger ID
    diagnosticsStatusNotification.chargeBoxID = this.getID();
    diagnosticsStatusNotification.timestamp = new Date();
    // Save it
    await ChargingStationStorage.saveDiagnosticsStatusNotification(diagnosticsStatusNotification);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation', method: 'handleDiagnosticsStatusNotification',
      action: 'DiagnosticsStatusNotification', message: `Diagnostics Status Notification has been saved`
    });
  }

  async handleFirmwareStatusNotification(firmwareStatusNotification) {
    // Set the charger ID
    firmwareStatusNotification.chargeBoxID = this.getID();
    firmwareStatusNotification.timestamp = new Date();
    // Save it
    await ChargingStationStorage.saveFirmwareStatusNotification(firmwareStatusNotification);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation', method: 'handleFirmwareStatusNotification',
      action: 'FirmwareStatusNotification', message: `Firmware Status Notification has been saved`
    });
  }

  async handleAuthorize(authorize) {
    // Set the charger ID
    authorize.chargeBoxID = this.getID();
    authorize.timestamp = new Date();
    // Execute
    const users = await Authorizations.checkAndGetIfUserIsAuthorizedForChargingStation(
      Constants.ACTION_AUTHORIZE, this, authorize.idTag);
    // Check
    if (users) {
      // Set current user
      authorize.user = users.user;
    }
    // Save
    await ChargingStationStorage.saveAuthorize(authorize);
    // Log
    if (authorize.user) {
      // Log
      Logging.logInfo({
        source: this.getID(), module: 'ChargingStation', method: 'handleAuthorize',
        action: 'Authorize', user: authorize.user.getModel(),
        message: `User has been authorized to use Charging Station`
      });
    } else {
      // Log
      Logging.logInfo({
        source: this.getID(), module: 'ChargingStation', method: 'handleAuthorize',
        action: 'Authorize', message: `Anonymous user has been authorized to use the Charging Station`
      });
    }
  }

  async getSite() {
    // Get Site Area
    const siteArea = await this.getSiteArea();
    // Check Site Area
    if (!siteArea) {
      return null;
    }
    // Get Site
    const site = await siteArea.getSite();
    return site;
  }

  async getCompany() {
    // Get the Site
    const site = await this.getSite();
    // Check Site
    if (!site) {
      return null;
    }
    // Get the Company
    const company = await site.getCompany();
    return company;
  }

  getTransaction(transactionId) {
    // Get the tranasction first (to get the connector id)
    return TransactionStorage.getTransaction(transactionId);
  }

  async handleStartTransaction(transactionData) {
    // Set the charger ID
    transactionData.chargeBoxID = this.getID();
    transactionData.tagID = transactionData.idTag;

    // Check user and save
    const users = await Authorizations.checkAndGetIfUserIsAuthorizedForChargingStation(
      Constants.ACTION_START_TRANSACTION, this, transactionData.tagID);
    // Check
    let user;
    if (users) {
      // Set current user
      user = (users.alternateUser ? users.alternateUser : users.user);
      // Set the user
      transactionData.user = user.getModel();
    }
    let transactionEntity = new Transaction(transactionData);
    await TransactionStorage.cleanupRemainingActiveTransactions(this.getID(), transactionEntity.connectorId);
    transactionEntity = await TransactionStorage.saveTransaction(transactionEntity);

    if (!this.canChargeInParallel()) {
      this.lockAllConnectors();
    }

    await this.updateChargingStationConsumption(transactionEntity.id);
    // Save
    await this.save();
    // Log
    if (transactionEntity.user) {
      // Notify
      NotificationHandler.sendTransactionStarted(
        transactionEntity.id,
        user.getModel(),
        this.getModel(),
        {
          'user': user.getModel(),
          'chargingBoxID': this.getID(),
          'connectorId': transactionEntity.connectorId,
          'evseDashboardURL': Utils.buildEvseURL(),
          'evseDashboardChargingStationURL':
            Utils.buildEvseTransactionURL(this, transactionEntity.connectorId, transactionEntity.id)
        },
        user.getLocale()
      );
      // Log
      Logging.logInfo({
        source: this.getID(), module: 'ChargingStation', method: 'handleStartTransaction',
        action: 'StartTransaction', user: transactionEntity.user,
        message: `Transaction ID '${transactionEntity.id}' has been started on Connector '${transactionEntity.connectorId}'`
      });
    } else {
      // Log
      Logging.logInfo({
        source: this.getID(),
        module: 'ChargingStation',
        method: 'handleStartTransaction',
        action: 'StartTransaction',
        message: `Transaction ID '${transactionEntity.id}' has been started by an anonymous user on Connector '${transactionEntity.connectorId}'`
      });
    }
    // Return
    return transactionEntity;
  }


  lockAllConnectors() {
    this.getConnectors().forEach(async (connector) => {
      // Check
      if (connector.status === Constants.CONN_STATUS_AVAILABLE) {
        // Set Occupied
        connector.status = Constants.CONN_STATUS_OCCUPIED;
      }
    });
  }

  _getStoppingTransactionTagId(stopTransactionData, transactionEntity) {
    if (transactionEntity.isRemotelyStopped()) {
      const secs = moment.duration(moment().diff(
        moment(transactionEntity.remotestop.timestamp))).asSeconds();
      // In a minute
      if (secs < 60) {
        // return tag that remotely stopped the transaction
        return transactionEntity.remotestop.tagID;
      }
    }
    if (stopTransactionData.idTag) {
      // return tag that stopped the transaction
      return stopTransactionData.idTag
    }
    // return tag that started the transaction
    return transactionEntity.tagID;
  }

  async freeConnector(connectorId) {
    const connector = this.getConnector(connectorId);

    connector.currentConsumption = 0;
    connector.totalConsumption = 0;
    connector.activeTransactionID = 0;

    // Check if Charger can charge in //
    if (!this.canChargeInParallel()) {
      // Set all the other connectors to Available
      this.getConnectors().forEach(async (connector) => {
        // Only other Occupied connectors
        if ((connector.status === Constants.CONN_STATUS_OCCUPIED) &&
          (connector.connectorId !== connectorId)) {
          // Set connector Available again
          connector.status = Constants.CONN_STATUS_AVAILABLE;
        }
      });
    }
  }

  async handleStopTransaction(stopTransactionData, isSoftStop = false) {
    // Set the charger ID
    stopTransactionData.chargeBoxID = this.getID();
    // Get the transaction first (to get the connector id)
    let transactionEntity = await this.getTransaction(stopTransactionData.transactionId);
    // Found?
    if (!transactionEntity) {
      throw new Error(`Transaction ID '${stopTransactionData.transactionId}' does not exist`);
    }

    const stoppingTagId = this._getStoppingTransactionTagId(stopTransactionData, transactionEntity);
    let stoppingUserModel = undefined;
    // Check User
    const users = await Authorizations.checkAndGetIfUserIsAuthorizedForChargingStation(
      Constants.ACTION_STOP_TRANSACTION, this, transactionEntity.tagID, stoppingTagId);
    if (users) {
      // Set current user
      const user = (users.alternateUser ? users.alternateUser : users.user);
      // Set the User ID
      stoppingUserModel = user.getModel();
    }

    await this.freeConnector(transactionEntity.connectorId);
    await this.save();

    if (isSoftStop) {
      stopTransactionData.meterStop = transactionEntity._latestMeterValue.value;
    }
    transactionEntity.stop(stoppingUserModel, stoppingTagId, stopTransactionData.meterStop, new Date(stopTransactionData.timestamp));
    transactionEntity = await TransactionStorage.saveTransaction(transactionEntity);

    // Notify User
    if (transactionEntity.initiator) {
      // Send Notification
      NotificationHandler.sendEndOfSession(
        transactionEntity.id + '-EOS',
        transactionEntity.initiator,
        this.getModel(),
        {
          'user': users.user.getModel(),
          'alternateUser': (users.user.getID() != users.alternateUser.getID() ? users.alternateUser.getModel() : null),
          'chargingBoxID': this.getID(),
          'connectorId': transactionEntity.connectorId,
          'totalConsumption': (transactionEntity.totalConsumption / 1000).toLocaleString(
            (transactionEntity.initiator.locale ? transactionEntity.initiator.locale.replace('_', '-') : Constants.DEFAULT_LOCALE.replace('_', '-')),
            {minimumIntegerDigits: 1, minimumFractionDigits: 0, maximumFractionDigits: 2}),
          'totalDuration': this._buildCurrentTransactionDuration(transactionEntity),
          'totalInactivity': this._buildCurrentTransactionInactivity(transactionEntity),
          'evseDashboardChargingStationURL': Utils.buildEvseTransactionURL(this, transactionEntity.connectorId, transactionEntity.id),
          'evseDashboardURL': Utils.buildEvseURL()
        },
        transactionEntity.initiator.locale
      );
    }

    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation', method: 'handleStopTransaction',
      action: 'StopTransaction', user: transactionEntity.finisher,
      actionOnUser: transactionEntity.initiator,
      message: `Transaction ID '${transactionEntity.id}' has been stopped`
    });
    // Publish to Cloud Revenue
    setTimeout(() => {
      // Check Chargers
      if (this.getID() === 'PERNICE-WB-01' ||
        this.getID() === 'HANNO-WB-01' ||
        this.getID() === 'WINTER-WB-01' ||
        this.getID() === 'HANNO-WB-02') {
        // Check Users
        if (transactionEntity.tagID === '5D38ED8F' || // Hanno 1
          transactionEntity.tagID === 'B31FB2DD' || // Hanno 2
          transactionEntity.tagID === 'WJ00001' || // Winter Juergen
          transactionEntity.tagID === 'C3E4B3DD') { // Florent
          // Transfer it to the Revenue Cloud async
          Utils.pushTransactionToRevenueCloud('StopTransaction', transactionEntity,
            transactionEntity.finisher, transactionEntity.initiator);
        }
      }
    }, 3000);
    // Return
    return transactionEntity;
  }

  // Restart the charger
  async requestReset(params) {
    // Get the client
    const chargingStationClient = await this.getChargingStationClient();
    // Restart
    const result = await chargingStationClient.reset(params);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation',
      method: 'requestReset', action: 'Reset',
      message: `Command sent with success`,
      detailedMessages: result
    });
    // Return
    return result;
  }

  // Stop Transaction
  async requestStopTransaction(params) {
    // Get the client
    const chargingStationClient = await this.getChargingStationClient();
    // Stop Transaction
    const result = await chargingStationClient.stopTransaction(params);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation',
      method: 'requestStopTransaction', action: 'StopTransaction',
      message: `Command sent with success`,
      detailedMessages: result
    });
    // Return
    return result;
  }

  // Start Transaction
  async requestStartTransaction(params) {
    // Get the client
    const chargingStationClient = await this.getChargingStationClient();
    // Start Transaction
    const result = await chargingStationClient.startTransaction(params);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation',
      method: 'requestStartTransaction', action: 'StartTransaction',
      message: `Command sent with success`,
      detailedMessages: result
    });
    // Return
    return result;
  }

  // Clear the cache
  async requestClearCache() {
    // Get the client
    const chargingStationClient = await this.getChargingStationClient();
    // Clear
    const result = await chargingStationClient.clearCache();
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation',
      method: 'requestClearCache', action: 'ClearCache',
      message: `Command sent with success`,
      detailedMessages: result
    });
    // Return
    return result;
  }

  // Get the configuration for the EVSE
  async requestGetConfiguration(params) {
    // Get the client
    const chargingStationClient = await this.getChargingStationClient();
    // Get config
    const result = await chargingStationClient.getConfiguration(params);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation',
      method: 'requestGetConfiguration', action: 'GetConfiguration',
      message: `Command sent with success`,
      detailedMessages: result
    });
    // Return
    return result;
  }

  // Get the configuration for the EVSE
  async requestChangeConfiguration(params) {
    // Get the client
    const chargingStationClient = await this.getChargingStationClient();
    // Get config
    const result = await chargingStationClient.changeConfiguration(params);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation',
      method: 'requestChangeConfiguration', action: 'ChangeConfiguration',
      message: `Command sent with success`,
      detailedMessages: result
    });
    // Request the new Configuration?
    if (result.status !== 'Accepted') {
      // Log
      throw new Error(`Cannot set the configuration param ${key} with value ${value} to ${this.getID()}`);
    }
    // Update
    await this.requestAndSaveConfiguration();
    // Return
    return result;
  }

  // Unlock connector
  async requestUnlockConnector(params) {
    // Get the client
    const chargingStationClient = await this.getChargingStationClient();
    // Get config
    const result = await chargingStationClient.unlockConnector(params);
    // Log
    Logging.logInfo({
      source: this.getID(), module: 'ChargingStation',
      method: 'requestUnlockConnector', action: 'UnlockConnector',
      message: `Command sent with success`,
      detailedMessages: result
    });
    // Return
    return result;
  }

  getConfiguration() {
    return ChargingStationStorage.getConfiguration(this.getID());
  }

  getConfigurationParamValue(paramName) {
    return ChargingStationStorage.getConfigurationParamValue(this.getID(), paramName);
  }

  async hasAtLeastOneTransaction() {
    // Get the consumption
    const transactions = await TransactionStorage.getTransactions(
      {'chargeBoxID': this.getID()}, 1);
    // Return
    return (transactions.count > 0);
  }

  async getTransactions(connectorId, startDateTime, endDateTime, withChargeBoxes = false) {
    // Get the consumption
    const transactions = await TransactionStorage.getTransactions(
      {
        'chargeBoxID': this.getID(), 'connectorId': connectorId, 'startDateTime': startDateTime,
        'endDateTime': endDateTime, 'withChargeBoxes': withChargeBoxes
      },
      Constants.NO_LIMIT);
    // Return list of transactions
    return transactions;
  }
}

module.exports = ChargingStation;
