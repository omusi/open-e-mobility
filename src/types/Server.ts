
export enum ServerAction {
  UNKNOWN_ACTION = 'Unknown',

  SAP_CONCUR_REQUEST = 'SapConcurRequest',
  RECAPTCHA_REQUEST = 'RecaptchaRequest',
  GREENCOM_REQUEST = 'GreencomRequest',
  STRIPE_REQUEST = 'StripeRequest',
  IOTHINK_REQUEST = 'IOThinkRequest',
  LACROIX_REQUEST = 'LacroixRequest',
  EV_DATABASE_REQUEST = 'EVDatabaseRequest',
  WIT_REQUEST = 'WitRequest',
  SAP_SMART_CHARGING_REQUEST = 'SapSmartChargingRequest',

  DEPRECATED_REST_ENDPOINT = 'DeprecatedRestEndpoint',
  LOGIN = 'Login',
  LOGOUT = 'Logout',
  PASSWORD_RESET = 'Reset',
  PING = 'Ping',
  CHECK_CONNECTION = 'CheckConnection',

  OBJECT_CLONE = 'ObjectClone',

  CHARGING_STATION_RESET = 'OcppReset',
  CHARGING_STATION_CLEAR_CACHE = 'OcppClearCache',
  CHARGING_STATION_TRIGGER_DATA_TRANSFER = 'OcppDataTransfer',
  CHARGING_STATION_GET_CONFIGURATION = 'OcppGetConfiguration',
  CHARGING_STATION_CHANGE_CONFIGURATION = 'OcppChangeConfiguration',
  CHARGING_STATION_DATA_TRANSFER = 'OcppChangeDataTransfer',
  CHARGING_STATION_REMOTE_START_TRANSACTION = 'OcppRemoteStartTransaction',
  CHARGING_STATION_REMOTE_STOP_TRANSACTION = 'OcppRemoteStopTransaction',
  CHARGING_STATION_UNLOCK_CONNECTOR = 'OcppUnlockConnector',
  CHARGING_STATION_SET_CHARGING_PROFILE = 'OcppSetChargingProfile',
  CHARGING_STATION_GET_COMPOSITE_SCHEDULE = 'OcppGetCompositeSchedule',
  CHARGING_STATION_CLEAR_CHARGING_PROFILE = 'OcppClearChargingProfile',
  CHARGING_STATION_GET_DIAGNOSTICS = 'OcppGetDiagnostics',
  CHARGING_STATION_UPDATE_FIRMWARE = 'OcppUpdateFirmware',
  CHARGING_STATION_CHANGE_AVAILABILITY = 'OcppChangeAvailability',

  CHARGING_STATION_REQUEST_OCPP_PARAMETERS = 'ChargingStationRequestOcppParameters',
  CHARGING_STATION_CLIENT_INITIALIZATION = 'ChargingStationClientInitialization',
  CHARGING_STATION_DOWNLOAD_QR_CODE_PDF = 'ChargingStationDownloadQrCodePdf',
  CHARGING_STATIONS_EXPORT = 'ChargingStationsExport',
  CHARGING_STATIONS_OCPP_PARAMS_EXPORT = 'ChargingStationsOcppParamsExport',
  CHARGING_STATION = 'ChargingStation',
  CHARGING_STATIONS_OCPP_PARAMETERS = 'ChargingStationOcppParameters',
  CHARGING_STATIONS_IN_ERROR = 'ChargingStationsInError',
  CHARGING_STATION_UPDATE_PARAMS = 'ChargingStationUpdateParams',
  CHARGING_STATION_LIMIT_POWER = 'ChargingStationLimitPower',
  CHARGING_STATION_DELETE = 'ChargingStationDelete',
  CHARGING_STATION_RESERVE_NOW = 'ChargingStationReserveNow',
  CHARGING_STATION_CANCEL_RESERVATION = 'ChargingStationCancelReservation',

  CHECK_SMART_CHARGING_CONNECTION = 'CheckSmartChargingConnection',
  TRIGGER_SMART_CHARGING = 'TriggerSmartCharging',

  REGISTRATION_TOKEN = 'RegistrationToken',
  REGISTRATION_TOKENS = 'RegistrationTokens',
  REGISTRATION_TOKEN_DELETE = 'RegistrationTokenDelete',
  REGISTRATION_TOKEN_REVOKE = 'RegistrationTokenRevoke',
  REGISTRATION_TOKEN_UPDATE = 'RegistrationTokenUpdate',

  CHARGING_STATION_TEMPLATE = 'ChargingStationTemplate',
  CHARGING_STATION_TEMPLATES = 'ChargingStationTemplates',
  CHARGING_STATION_TEMPLATE_DELETE = 'ChargingStationTemplateDelete',
  CHARGING_STATION_TEMPLATE_UPDATE = 'ChargingStationTemplateUpdate',
  CHARGING_STATION_TEMPLATE_CREATE = 'ChargingStationTemplateCreate',

  BOOT_NOTIFICATIONS = 'BootNotifications',
  STATUS_NOTIFICATIONS = 'StatusNotifications',

  TRANSACTION_START = 'TransactionStart',
  TRANSACTION_STOP = 'TransactionStop',
  TRANSACTION_SOFT_STOP = 'TransactionSoftStop',
  TRANSACTION_DELETE = 'TransactionDelete',
  TRANSACTIONS_DELETE = 'TransactionsDelete',
  UPDATE_TRANSACTION = 'UpdateTransaction',

  LOGS = 'Logs',
  LOG = 'Log',
  LOGS_EXPORT = 'LogsExport',

  CHARGING_STATIONS = 'ChargingStations',

  CAR_CATALOGS = 'CarCatalogs',
  CAR_CATALOG = 'CarCatalog',
  CAR_CATALOG_IMAGE = 'CarCatalogImage',
  CAR_CATALOG_IMAGES = 'CarCatalogImages',
  CAR_MAKERS = 'CarMakers',
  CAR_CREATE = 'CarCreate',
  CAR_UPDATE = 'CarUpdate',
  CAR_DELETE = 'CarDelete',
  CARS = 'Cars',
  CAR = 'Car',
  SYNCHRONIZE_CAR_CATALOGS = 'SynchronizeCarCatalogs',

  GET_CONNECTOR_CURRENT_LIMIT = 'GetConnectorCurrentLimit',
  REGISTER_USER = 'RegisterUser',
  CHARGING_PROFILES = 'ChargingProfiles',
  CHARGING_PROFILE_DELETE = 'ChargingProfileDelete',
  CHARGING_PROFILE_UPDATE = 'ChargingProfileUpdate',
  CHARGING_PROFILE_CREATE = 'ChargingProfileCreate',
  GENERATE_QR_CODE_FOR_CONNECTOR = 'GenerateQrCodeForConnector',
  OCPP_PARAM_UPDATE = 'OcppParamUpdate',
  RESEND_VERIFICATION_MAIL = 'ResendVerificationEmail',
  END_USER_LICENSE_AGREEMENT = 'EndUserLicenseAgreement',
  CHECK_END_USER_LICENSE_AGREEMENT = 'CheckEndUserLicenseAgreement',
  VERIFY_EMAIL = 'VerifyEmail',
  FIRMWARE_DOWNLOAD = 'FirmwareDownload',

  OFFLINE_CHARGING_STATION = 'OfflineChargingStation',

  MISSING_CONFIGURATION = 'MissingConfiguration',

  LOGS_CLEANUP = 'LogsCleanup',
  PERFORMANCES_CLEANUP = 'PerformancesCleanup',
  PERFORMANCES = 'Performances',

  SCHEDULER = 'Scheduler',
  ASYNC_TASK = 'AsyncTask',

  REMOTE_PUSH_NOTIFICATION = 'RemotePushNotification',
  EMAIL_NOTIFICATION = 'EmailNotification',
  END_USER_REPORT_ERROR = 'EndUserReportError',

  SYNCHRONIZE_REFUND = 'RefundSynchronize',

  REGISTRATION_TOKEN_CREATE = 'RegistrationTokenCreate',

  INTEGRATION_CONNECTION_CREATE = 'IntegrationConnectionCreate',
  INTEGRATION_CONNECTIONS = 'IntegrationConnections',
  INTEGRATION_CONNECTION = 'IntegrationConnection',
  INTEGRATION_CONNECTION_DELETE = 'IntegrationConnectionDelete',

  ROAMING = 'Roaming',

  OCPI_SETTINGS = 'OcpiSettings',
  OCPI_CLIENT_INITIALIZATION = 'OcpiClientInitialization',
  OCPI_ENDPOINT_CREATE = 'OcpiEndpointCreate',
  OCPI_ENDPOINT_PING = 'OcpiEndpointPing',
  OCPI_ENDPOINT_CHECK_CDRS = 'OcpiEndpointCheckCdrs',
  OCPI_ENDPOINT_CHECK_LOCATIONS = 'OcpiEndpointCheckLocations',
  OCPI_ENDPOINT_CHECK_SESSIONS = 'OcpiEndpointCheckSessions',
  OCPI_ENDPOINT_PULL_CDRS = 'OcpiEndpointPullCdrs',
  OCPI_ENDPOINT_PULL_LOCATIONS = 'OcpiEndpointPullLocations',
  OCPI_ENDPOINT_PULL_SESSIONS = 'OcpiEndpointPullSessions',
  OCPI_ENDPOINT_PULL_TOKENS = 'OcpiEndpointPullTokens',
  OCPI_ENDPOINT_SEND_EVSE_STATUSES = 'OcpiEndpointSendEVSEStatuses',
  OCPI_ENDPOINT_SEND_TOKENS = 'OcpiEndpointSendTokens',
  OCPI_ENDPOINT_GENERATE_LOCAL_TOKEN = 'OcpiEndpointGenerateLocalToken',
  OCPI_ENDPOINT_UPDATE = 'OcpiEndpointUpdate',
  OCPI_ENDPOINT_REGISTER = 'OcpiEndpointRegister',
  OCPI_ENDPOINT_UNREGISTER = 'OcpiEndpointUnregister',
  OCPI_ENDPOINT_CREDENTIALS = 'OcpiEndpointCredentials',
  OCPI_ENDPOINT_DELETE = 'OcpiEndpointDelete',
  OCPI_ENDPOINTS = 'OcpiEndpoints',
  OCPI_ENDPOINT = 'OcpiEndpoint',
  OCPI_REGISTER = 'OcpiRegister',
  OCPI_UNREGISTER = 'OcpiUnregister',
  OCPI_GET_VERSIONS = 'OcpiGetVersions',
  OCPI_GET_ENDPOINT_VERSIONS = 'OcpiGetEndpointVersions',
  OCPI_CREATE_CREDENTIALS = 'OcpiCreateCredentials',
  OCPI_UPDATE_CREDENTIALS = 'OcpiUpdateCredentials',
  OCPI_DELETE_CREDENTIALS = 'OcpiDeleteCredentials',

  OCPI_CPO_REQUEST = 'OcpiCpoRequest',
  OCPI_CPO_GET_SERVICES = 'OcpiCpoGetServices',
  OCPI_CPO_COMMAND = 'OcpiCpoCommand',
  OCPI_CPO_UPDATE_STATUS = 'OcpiCpoUpdateStatus',
  OCPI_CPO_CHECK_CDRS = 'OcpiCpoCheckCdrs',
  OCPI_CPO_CHECK_SESSIONS = 'OcpiCpoCheckSessions',
  OCPI_CPO_GET_SESSIONS = 'OcpiCpoGetSessions',
  OCPI_CPO_PUSH_SESSIONS = 'OcpiCpoPushSessions',
  OCPI_CPO_START_SESSION = 'OcpiCpoStartSession',
  OCPI_CPO_STOP_SESSION = 'OcpiCpoStopSession',
  OCPI_CPO_CHECK_LOCATIONS = 'OcpiCpoCheckLocations',
  OCPI_CPO_GET_LOCATIONS = 'OcpiCpoGetLocations',
  OCPI_CPO_GET_CDRS = 'OcpiCpoGetCdrs',
  OCPI_CPO_PUSH_EVSE_STATUSES = 'OcpiCpoPushEVSEStatuses',
  OCPI_CPO_PUSH_CDRS = 'OcpiCpoPushCdrs',
  OCPI_CPO_GET_TOKENS = 'OcpiCpoGetTokens',
  OCPI_CPO_GET_TOKEN = 'OcpiCpoGetToken',
  OCPI_CPO_UPDATE_TOKEN = 'OcpiCpoUpdateToken',
  OCPI_CPO_AUTHORIZE_TOKEN = 'OcpiCpoAuthorizeToken',
  OCPI_CPO_GET_TARIFFS = 'OcpiCpoGetTariffs',

  OCPI_EMSP_REQUEST = 'OcpiEmspRequest',
  OCPI_EMSP_GET_SERVICES = 'OcpiEmspGetServices',
  OCPI_EMSP_COMMAND = 'OcpiEmspCommand',
  OCPI_EMSP_AUTHORIZE_TOKEN = 'OcpiEmspAuthorizeToken',
  OCPI_EMSP_UPDATE_LOCATION = 'OcpiEmspUpdateLocation',
  OCPI_EMSP_GET_LOCATIONS = 'OcpiEmspGetLocations',
  OCPI_EMSP_GET_SESSIONS = 'OcpiEmspGetSessions',
  OCPI_EMSP_GET_SESSION = 'OcpiEmspGetSession',
  OCPI_EMSP_UPDATE_SESSION = 'OcpiEmspUpdateSession',
  OCPI_EMSP_START_SESSION = 'OcpiEmspStartSession',
  OCPI_EMSP_STOP_SESSION = 'OcpiEmspStopSession',
  OCPI_EMSP_UPDATE_TOKENS = 'OcpiEmspUpdateTokens',
  OCPI_EMSP_GET_CDR = 'OcpiEmspGetCdr',
  OCPI_EMSP_GET_CDRS = 'OcpiEmspGetCdrs',
  OCPI_EMSP_GET_TOKENS = 'OcpiEmspGetTokens',
  OCPI_EMSP_CREATE_CDR = 'OcpiEmspCreateCdr',
  OCPI_EMSP_RESERVE_NOW = 'OcpiEmspReserveNow',
  OCPI_EMSP_UNLOCK_CONNECTOR = 'OcpiEmspUnlockConnector',
  OCPI_EMSP_GET_TARIFF = 'OcpiEmspGetTariff',

  OICP_CPO_REQUEST = 'OicpCpoRequest',
  OICP_SETTINGS = 'OicpSettings',
  OICP_ENDPOINT_CREATE = 'OicpEndpointCreate',
  OICP_ENDPOINT_PING = 'OicpEndpointPing',
  OICP_ENDPOINT = 'OicpEndpoint',
  OICP_ENDPOINTS = 'OicpEndpoints',
  OICP_ENDPOINT_START = 'OicpEndpointStart',
  OICP_PUSH_EVSE_DATA = 'OicpPushEvseData',
  OICP_PUSH_EVSE_STATUSES = 'OicpPushEvseStatuses',
  OICP_UPDATE_EVSE_STATUS = 'OicpUpdateEvseStatus',
  OICP_AUTHORIZE_START = 'OicpAuthorizeStart',
  OICP_AUTHORIZE_STOP = 'OicpAuthorizeStop',
  OICP_AUTHORIZE_REMOTE_START = 'OicpAuthorizeRemoteStart',
  OICP_AUTHORIZE_REMOTE_STOP = 'OicpAuthorizeRemoteStop',
  OICP_PUSH_CDRS = 'OicpPushCdrs',
  OICP_PUSH_EVSE_PRICING = 'OicpPushEvsePricing',
  OICP_PUSH_PRICING_PRODUCT_DATA = 'OicpPushPricingProductData',
  OICP_SEND_CHARGING_NOTIFICATION_START = 'OicpSendChargingNotificationStart',
  OICP_SEND_CHARGING_NOTIFICATION_PROGRESS = 'OicpSendChargingNotificationProgress',
  OICP_SEND_CHARGING_NOTIFICATION_END = 'OicpSendChargingNotificationEnd',
  OICP_SEND_CHARGING_NOTIFICATION_ERROR = 'OicpSendChargingNotificationError',
  OICP_ENDPOINT_SEND_EVSE_STATUSES = 'OicpEndpointSendEVSEStatuses',
  OICP_ENDPOINT_SEND_EVSES = 'OicpEndpointSendEVSEs',
  OICP_PUSH_SESSIONS = 'OicpPushSessions',
  OICP_CREATE_AXIOS_INSTANCE = 'OicpCreateAxiosInstance',
  OICP_ENDPOINT_UPDATE = 'OicpEndpointUpdate',
  OICP_ENDPOINT_REGISTER = 'OicpEndpointRegister',
  OICP_ENDPOINT_UNREGISTER = 'OicpEndpointUnregister',
  OICP_ENDPOINT_DELETE = 'OicpEndpointDelete',

  OCPP_SERVICE = 'OcppService',

  AUTHORIZATIONS = 'Authorizations',

  DB_WATCH = 'DBWatch',
  DB_MONITOR = 'DBMonitor',
  MONITORING = 'Monitoring',

  EXPRESS_SERVER = 'ExpressServer',
  ODATA_SERVER = 'ODataServer',

  LOCKING = 'Locking',

  STARTUP = 'Startup',

  BOOTSTRAP_STARTUP = 'BootstrapStartup',

  OCPP_BOOT_NOTIFICATION = 'OcppBootNotification',
  OCPP_AUTHORIZE = 'OcppAuthorize',
  OCPP_HEARTBEAT = 'OcppHeartbeat',
  OCPP_DIAGNOSTICS_STATUS_NOTIFICATION = 'OcppDiagnosticsStatusNotification',
  OCPP_FIRMWARE_STATUS_NOTIFICATION = 'OcppFirmwareStatusNotification',
  OCPP_STATUS_NOTIFICATION = 'OcppStatusNotification',
  OCPP_START_TRANSACTION = 'OcppStartTransaction',
  OCPP_STOP_TRANSACTION = 'OcppStopTransaction',
  OCPP_METER_VALUES = 'OcppMeterValues',
  OCPP_DATA_TRANSFER = 'OcppDataTransfer',

  EXTRA_INACTIVITY = 'ExtraInactivity',

  CONSUMPTION = 'Consumption',
  REBUILD_TRANSACTION_CONSUMPTIONS = 'RebuildTransactionConsumptions',

  WS_SERVER_MESSAGE = 'WsServerMessage',
  WS_SERVER_CONNECTION = 'WsServerConnection',
  WS_SERVER_CONNECTION_PING = 'WsServerConnectionPing',
  WS_SERVER_CONNECTION_CLOSE = 'WsServerConnectionClose',
  WS_SERVER_CONNECTION_OPEN = 'WsServerConnectionOpen',
  WS_SERVER_CONNECTION_ERROR = 'WsServerConnectionError',

  WS_CLIENT_ERROR = 'WsClientError',
  WS_CLIENT_MESSAGE = 'WsClientMessage',
  WS_CLIENT_CONNECTION = 'WsClientConnection',
  WS_CLIENT_CONNECTION_CLOSE = 'WsClientConnectionClose',
  WS_CLIENT_CONNECTION_OPEN = 'WsClientConnectionOpen',
  WS_CLIENT_CONNECTION_ERROR = 'WsClientConnectionError',

  NOTIFICATION = 'Notification',
  CHARGING_STATION_STATUS_ERROR = 'ChargingStationStatusError',
  CHARGING_STATION_REGISTERED = 'ChargingStationRegistered',
  END_OF_CHARGE = 'EndOfCharge',
  OPTIMAL_CHARGE_REACHED = 'OptimalChargeReached',
  END_OF_SESSION = 'EndOfSession',
  REQUEST_PASSWORD = 'RequestPassword',
  USER_ACCOUNT_STATUS_CHANGED = 'UserAccountStatusChanged',
  NEW_REGISTERED_USER = 'NewRegisteredUser',
  UNKNOWN_USER_BADGED = 'UnknownUserBadged',
  TRANSACTION_STARTED = 'TransactionStarted',
  VERIFICATION_EMAIL_USER_IMPORT = 'VerificationEmailUserImport',
  PATCH_EVSE_STATUS_ERROR = 'PatchEVSEStatusError',
  PATCH_EVSE_ERROR = 'PatchEVSEError',
  USER_ACCOUNT_INACTIVITY = 'UserAccountInactivity',
  PREPARING_SESSION_NOT_STARTED = 'PreparingSessionNotStarted',
  OFFLINE_CHARGING_STATIONS = 'OfflineChargingStations',
  BILLING_USER_SYNCHRONIZATION_FAILED = 'BillingUserSynchronizationFailed',
  BILLING_INVOICE_SYNCHRONIZATION_FAILED = 'BillingInvoiceSynchronizationFailed',
  USER_ACCOUNT_VERIFICATION = 'UserAccountVerification',
  USER_CREATE_PASSWORD = 'UserCreatePassword',
  ADMIN_ACCOUNT_VERIFICATION = 'AdminAccountVerificationNotification',

  UPDATE_LOCAL_CAR_CATALOGS = 'UpdateLocalCarCatalogs',
  CAR_CATALOG_SYNCHRONIZATION_FAILED = 'CarCatalogSynchronizationFailed',
  CAR_CATALOG_SYNCHRONIZATION = 'CarCatalogSynchronization',
  SESSION_NOT_STARTED_AFTER_AUTHORIZE = 'SessionNotStartedAfterAuthorize',

  UPDATE_CHARGING_STATION_WITH_TEMPLATE = 'UpdateChargingStationWithTemplate',
  UPDATE_CHARGING_STATION_TEMPLATES = 'UpdateChargingStationTemplates',

  MIGRATION = 'Migration',

  SESSION_HASH_SERVICE = 'SessionHashService',

  CLEANUP_TRANSACTION = 'CleanupTransaction',
  TRANSACTIONS_COMPLETED = 'TransactionsCompleted',
  TRANSACTIONS_TO_REFUND = 'TransactionsToRefund',
  TRANSACTIONS_TO_REFUND_EXPORT = 'TransactionsToRefundExport',
  TRANSACTIONS_TO_REFUND_REPORTS = 'TransactionsRefundReports',
  TRANSACTIONS_EXPORT = 'TransactionsExport',
  TRANSACTIONS_ACTIVE = 'TransactionsActive',
  TRANSACTIONS_IN_ERROR = 'TransactionsInError',
  TRANSACTION_YEARS = 'TransactionYears',
  TRANSACTION = 'Transaction',
  TRANSACTIONS = 'Transactions',
  TRANSACTION_CONSUMPTION = 'TransactionConsumption',

  TRANSACTION_OCPI_CDR_EXPORT = 'TransactionOcpiCdrExport',

  CHARGING_STATION_CONSUMPTION_STATISTICS = 'ChargingStationConsumptionStatistics',
  CHARGING_STATION_USAGE_STATISTICS = 'ChargingStationUsageStatistics',
  CHARGING_STATION_INACTIVITY_STATISTICS = 'ChargingStationInactivityStatistics',
  CHARGING_STATION_TRANSACTIONS_STATISTICS = 'ChargingStationTransactionsStatistics',
  CHARGING_STATION_PRICING_STATISTICS = 'ChargingStationPricingStatistics',
  STATISTICS_EXPORT = 'StatisticsExport',
  USER_CONSUMPTION_STATISTICS = 'UserConsumptionStatistics',
  USER_USAGE_STATISTICS = 'UserUsageStatistics',
  USER_INACTIVITY_STATISTICS = 'UserInactivityStatistics',
  USER_TRANSACTIONS_STATISTICS = 'UserTransactionsStatistics',
  USER_PRICING_STATISTICS = 'UserPricingStatistics',

  CHARGING_STATION_TRANSACTIONS = 'ChargingStationTransactions',

  ADD_CHARGING_STATIONS_TO_SITE_AREA = 'AddChargingStationsToSiteArea',
  REMOVE_CHARGING_STATIONS_FROM_SITE_AREA = 'RemoveChargingStationsFromSiteArea',

  ADD_ASSET_TO_SITE_AREA = 'AddAssetsToSiteArea',
  REMOVE_ASSET_TO_SITE_AREA = 'RemoveAssetsFromSiteArea',
  ASSET_CREATE = 'AssetCreate',
  ASSETS = 'Assets',
  ASSET = 'Asset',
  ASSET_IMAGE = 'AssetImage',
  ASSETS_IN_ERROR = 'AssetsInError',
  ASSET_UPDATE = 'AssetUpdate',
  ASSET_DELETE = 'AssetDelete',
  CHECK_ASSET_CONNECTION = 'CheckAssetConnection',
  RETRIEVE_ASSET_CONSUMPTION = 'RetrieveAssetConsumption',
  ASSET_CONSUMPTION = 'AssetConsumption',

  TENANT_CREATE = 'TenantCreate',
  TENANTS = 'Tenants',
  TENANT = 'Tenant',
  TENANT_UPDATE = 'TenantUpdate',
  TENANT_DELETE = 'TenantDelete',
  TENANT_LOGO = 'TenantLogo',

  COMPANY_CREATE = 'CompanyCreate',
  COMPANIES = 'Companies',
  COMPANY = 'Company',
  COMPANY_LOGO = 'CompanyLogo',
  COMPANY_UPDATE = 'CompanyUpdate',
  COMPANY_DELETE = 'CompanyDelete',

  SITE_CREATE = 'SiteCreate',
  ADD_SITES_TO_USER = 'AddSitesToUser',
  REMOVE_SITES_FROM_USER = 'RemoveSitesFromUser',
  SITES = 'Sites',
  SITE = 'Site',
  SITE_IMAGE = 'SiteImage',
  SITE_USERS = 'SiteUsers',
  SITE_UPDATE = 'SiteUpdate',
  SITE_USER_ADMIN = 'SiteUserAdmin',
  SITE_OWNER = 'SiteOwner',
  SITE_DELETE = 'SiteDelete',

  SITE_AREA_CREATE = 'SiteAreaCreate',
  SITE_AREAS = 'SiteAreas',
  SITE_AREA = 'SiteArea',
  SITE_AREA_IMAGE = 'SiteAreaImage',
  SITE_AREA_CONSUMPTION = 'SiteAreaConsumption',
  SITE_AREA_UPDATE = 'SiteAreaUpdate',
  SITE_AREA_DELETE = 'SiteAreaDelete',

  TRANSACTIONS_REFUND = 'TransactionsRefund',
  TRANSACTION_PUSH_CDR = 'TransactionPushCdr',
  SYNCHRONIZE_REFUNDED_TRANSACTIONS = 'SynchronizeRefundedTransactions',

  SETTING_CREATE = 'SettingCreate',
  SETTING_BY_IDENTIFIER = 'SettingByIdentifier',
  SETTINGS = 'Settings',
  SETTING = 'Setting',
  SETTING_UPDATE = 'SettingUpdate',
  SETTING_DELETE = 'SettingDelete',

  ADD_USERS_TO_SITE = 'AddUsersToSite',
  REMOVE_USERS_FROM_SITE = 'RemoveUsersFromSite',

  REFUND = 'Refund',
  CAR_CONNECTOR = 'CarConnector',

  USER_READ = 'UserRead',
  USER_CREATE = 'UserCreate',
  USER_DELETE = 'UserDelete',
  USER_UPDATE = 'UserUpdate',
  USER_UPDATE_MOBILE_TOKEN = 'UpdateUserMobileToken',
  USERS = 'Users',
  USER_SITES = 'UserSites',
  USERS_IN_ERROR = 'UsersInError',
  USER_IMAGE = 'UserImage',
  TAGS = 'Tags',
  TAG = 'Tag',
  TAG_BY_VISUAL_ID= 'TagByVisualID',
  USER_DEFAULT_TAG_CAR = 'UserDefaultTagCar',
  TAG_CREATE = 'TagCreate',
  TAG_UPDATE = 'TagUpdate',
  TAG_UPDATE_BY_VISUAL_ID = 'TagUpdateByVisualID',
  TAG_DELETE = 'TagDelete',
  TAGS_UNASSIGN = 'TagsUnassign',
  TAG_UNASSIGN = 'TagUnassign',
  TAG_ASSIGN = 'TagAssign',
  TAGS_DELETE = 'TagsDelete',
  TAGS_IMPORT = 'TagsImport',
  TAGS_EXPORT = 'TagsExport',
  USER = 'User',
  USERS_EXPORT = 'UsersExport',
  USERS_IMPORT = 'UsersImport',

  NOTIFICATIONS = 'Notifications',

  BILLING = 'Billing',
  BILLING_TRANSACTION = 'BillingTransaction',
  BILLING_SYNCHRONIZE_USER = 'BillingSynchronizeUser',
  BILLING_FORCE_SYNCHRONIZE_USER = 'BillingForceSynchronizeUser',
  CHECK_BILLING_CONNECTION = 'CheckBillingConnection',
  BILLING_TAXES = 'BillingTaxes',
  BILLING_INVOICES = 'BillingInvoices',
  BILLING_INVOICE = 'BillingInvoice',
  BILLING_PERFORM_OPERATIONS = 'BillingPeriodicOperations',
  BILLING_DOWNLOAD_INVOICE = 'BillingDownloadInvoice',
  BILLING_NEW_INVOICE = 'BillingNewInvoice',
  BILLING_SETUP_PAYMENT_METHOD = 'BillingSetupPaymentMethod',
  BILLING_PAYMENT_METHODS = 'BillingPaymentMethods',
  BILLING_DELETE_PAYMENT_METHOD = 'BillingDeletePaymentMethod',
  BILLING_CHARGE_INVOICE = 'BillingChargeInvoice',
  BILLING_TEST_DATA_CLEANUP = 'BillingTestDataCleanup',
  BILLING_BILL_PENDING_TRANSACTION = 'BillingBillPendingTransaction',
  BILLING_SUB_ACCOUNT_CREATE = 'BillingSubAccountCreate',
  BILLING_SUB_ACCOUNT_ACTIVATE = 'BillingSubAccountActivate',

  PRICING = 'Pricing',
  PRICING_DEFINITION = 'PricingDefinition',
  PRICING_DEFINITIONS = 'PricingDefinitions',
  PRICING_DEFINITION_CREATE = 'PricingDefinitionCreate',
  PRICING_DEFINITION_UPDATE = 'PricingDefinitionUpdate',
  PRICING_DEFINITION_DELETE = 'PricingDefinitionDelete',
  PRICING_MODEL_RESOLVE = 'PricingModelResolve',

  MONGO_DB = 'MongoDB',

  CHECK_AND_APPLY_SMART_CHARGING = 'CheckAndApplySmartCharging',
  COMPUTE_AND_APPLY_CHARGING_PROFILES_FAILED = 'ComputeAndApplyChargingProfilesFailed',
  SMART_CHARGING = 'SmartCharging',

  INSTANTIATE_DUMMY_MODULE = 'InstantiateDummyModule',

  HTTP_REQUEST = 'HttpRequest',
  HTTP_RESPONSE = 'HttpResponse',
  HTTP_ERROR = 'HttpError',

  EXPORT_TO_CSV = 'ExportToCSV'
}

// RESTful API
export enum RESTServerRoute {
  REST_SIGNIN = 'signin',
  REST_SIGNON = 'signon',
  REST_SIGNOUT = 'signout',
  REST_PASSWORD_RESET = 'password/reset',
  REST_END_USER_LICENSE_AGREEMENT = 'eula',
  REST_END_USER_LICENSE_AGREEMENT_CHECK = 'eula/check',
  REST_MAIL_CHECK = 'mail/check',
  REST_MAIL_RESEND = 'mail/resend',

  REST_CHARGING_STATION_TEMPLATES = 'charging-station-templates',
  REST_CHARGING_STATION_TEMPLATE = 'charging-station-templates/:id',

  REST_CHARGING_STATIONS = 'charging-stations',
  REST_CHARGING_STATION = 'charging-stations/:id',

  REST_CHARGING_STATIONS_RESET = 'charging-stations/:id/reset',
  REST_CHARGING_STATIONS_CACHE_CLEAR = 'charging-stations/:id/cache/clear',
  REST_CHARGING_STATIONS_TRIGGER_DATA_TRANSFER = 'charging-stations/:id/data/transfer',
  REST_CHARGING_STATIONS_RETRIEVE_CONFIGURATION = 'charging-stations/:id/configuration/retrieve',
  REST_CHARGING_STATIONS_CHANGE_CONFIGURATION = 'charging-stations/:id/configuration',
  REST_CHARGING_STATIONS_REMOTE_START = 'charging-stations/:id/remote/start',
  REST_CHARGING_STATIONS_REMOTE_STOP = 'charging-stations/:id/remote/stop',
  REST_CHARGING_STATIONS_UNLOCK_CONNECTOR = 'charging-stations/:id/connectors/:connectorId/unlock',
  REST_CHARGING_STATIONS_GET_COMPOSITE_SCHEDULE = 'charging-stations/:id/composite-schedule/get',
  REST_CHARGING_STATIONS_GET_DIAGNOSTICS = 'charging-stations/:id/diagnostics/get',
  REST_CHARGING_STATIONS_FIRMWARE_UPDATE = 'charging-stations/:id/firmware/update',
  REST_CHARGING_STATIONS_CHANGE_AVAILABILITY = 'charging-stations/:id/availability/change',
  REST_CHARGING_STATIONS_RESERVE_NOW = 'charging-stations/:id/reserve/now',
  REST_CHARGING_STATIONS_CANCEL_RESERVATION = 'charging-stations/:id/reservation/cancel',

  REST_CHARGING_STATIONS_DOWNLOAD_FIRMWARE = 'charging-stations/firmware/download',
  REST_CHARGING_STATIONS_QRCODE_GENERATE = 'charging-stations/:id/connectors/:connectorId/qrcode/generate',
  REST_CHARGING_STATIONS_QRCODE_DOWNLOAD = 'charging-stations/qrcode/download',

  REST_CHARGING_STATION_GET_OCPP_PARAMETERS = 'charging-stations/:id/ocpp/parameters',
  REST_CHARGING_STATIONS_REQUEST_OCPP_PARAMETERS = 'charging-stations/ocpp/parameters',
  REST_CHARGING_STATIONS_EXPORT_OCPP_PARAMETERS = 'charging-stations/ocpp/parameters/export',

  REST_CHARGING_STATIONS_UPDATE_PARAMETERS = 'charging-stations/:id/parameters',
  REST_CHARGING_STATIONS_POWER_LIMIT = 'charging-stations/:id/power/limit',
  REST_CHARGING_STATIONS_TRANSACTIONS = 'charging-stations/:id/transactions',
  REST_CHARGING_STATIONS_IN_ERROR = 'charging-stations/status/in-error',
  REST_CHARGING_STATIONS_EXPORT = 'charging-stations/action/export',
  REST_CHARGING_STATIONS_BOOT_NOTIFICATIONS = 'charging-stations/notifications/boot',
  REST_CHARGING_STATIONS_STATUS_NOTIFICATIONS = 'charging-stations/notifications/status',

  REST_CHARGING_STATION_CHECK_SMART_CHARGING_CONNECTION = 'charging-stations/smartcharging/connection/check',
  REST_CHARGING_STATION_TRIGGER_SMART_CHARGING = 'charging-stations/smartcharging/trigger',

  REST_CHARGING_PROFILES = 'charging-profiles',
  REST_CHARGING_PROFILE = 'charging-profiles/:id',

  REST_TRANSACTIONS = 'transactions',
  REST_TRANSACTIONS_IN_ERROR = 'transactions/status/in-error',
  REST_TRANSACTIONS_ACTIVE = 'transactions/status/active',
  REST_TRANSACTIONS_COMPLETED = 'transactions/status/completed',
  REST_TRANSACTION = 'transactions/:id',
  REST_TRANSACTIONS_EXPORT = 'transactions/action/export',
  REST_TRANSACTION_CDR = 'transactions/:id/ocpi/cdr',
  REST_TRANSACTION_CDR_EXPORT = 'transactions/:id/ocpi/cdr/export',
  REST_TRANSACTION_CONSUMPTIONS = 'transactions/:id/consumptions',
  REST_TRANSACTION_CONSUMPTIONS_FOR_ADVENIR = 'transactions/:id/consumptions-for-advenir',
  REST_TRANSACTION_START = 'transactions/start',
  REST_TRANSACTION_STOP = 'transactions/:id/stop',
  REST_TRANSACTION_SOFT_STOP = 'transactions/:id/soft-stop',
  REST_TRANSACTIONS_REFUND_ACTION = 'transactions/action/refund',
  REST_TRANSACTIONS_REFUND = 'transactions/status/refund',
  REST_TRANSACTIONS_REFUND_EXPORT = 'transactions/status/refund/export',
  REST_TRANSACTIONS_SYNCHRONIZE_REFUNDED = 'transactions/status/refund/synchronize',
  REST_TRANSACTIONS_REFUND_REPORTS = 'transactions/status/refund/reports',

  REST_USERS = 'users',
  REST_USER = 'users/:id',
  REST_USER_DEFAULT_TAG_CAR = 'users/:id/default-car-tag',
  REST_USER_SITES = 'users/:id/sites',
  REST_USER_UPDATE_MOBILE_TOKEN = 'users/:id/mobile-token',
  REST_USER_IMAGE = 'users/:id/image',
  REST_USERS_IN_ERROR = 'users/status/in-error',
  REST_USERS_IMPORT = 'users/action/import',
  REST_USERS_EXPORT = 'users/action/export',

  REST_TAGS = 'tags',
  REST_TAG = 'tags/:id',
  REST_TAG_ASSIGN = 'tags/:id/assign',
  REST_TAG_UNASSIGN = 'tags/:id/unassign',
  REST_TAGS_UNASSIGN = 'tags/unassign',
  REST_TAGS_IMPORT = 'tags/action/import',
  REST_TAGS_EXPORT = 'tags/action/export',

  REST_ASSETS = 'assets',
  REST_ASSET = 'assets/:id',
  REST_ASSETS_IN_ERROR = 'assets/status/in-error',
  REST_ASSET_CHECK_CONNECTION = 'assets/connectors/:id/connection/check',
  REST_ASSET_RETRIEVE_CONSUMPTION = 'assets/:id/connector/consumption/retrieve-last',
  REST_ASSET_CONSUMPTIONS = 'assets/:id/consumptions',
  REST_ASSET_IMAGE = 'assets/:id/image',

  REST_CARS = 'cars',
  REST_CAR = 'cars/:id',
  REST_CAR_CATALOGS = 'car-catalogs',
  REST_CAR_CATALOG = 'car-catalogs/:id',
  REST_CAR_CATALOG_IMAGES = 'car-catalogs/:id/images',
  REST_CAR_CATALOG_IMAGE = 'car-catalogs/:id/image',
  REST_CAR_CATALOG_SYNCHRONIZE = 'car-catalogs/action/synchronize',
  REST_CAR_MAKERS = 'car-makers',

  REST_PING = 'ping',

  REST_TENANTS = 'tenants',
  REST_TENANT = 'tenants/:id',
  REST_TENANT_LOGO = 'tenants/logo',

  REST_COMPANIES = 'companies',
  REST_COMPANY = 'companies/:id',
  REST_COMPANY_LOGO = 'companies/:id/logo',

  REST_CONNECTIONS = 'connections',
  REST_CONNECTION = 'connections/:id',

  REST_LOGS = 'logs',
  REST_LOG = 'logs/:id',
  REST_LOGS_EXPORT = 'logs/action/export',

  REST_NOTIFICATIONS = 'notifications',
  REST_NOTIFICATIONS_END_USER_REPORT_ERROR = 'notifications/action/end-user/report-error',

  REST_OCPI_ENDPOINT_PING = 'ocpi/endpoints/:id/ping',
  REST_OCPI_ENDPOINT_CHECK_CDRS = 'ocpi/endpoints/:id/cdrs/check',
  REST_OCPI_ENDPOINT_CHECK_LOCATIONS = 'ocpi/endpoints/:id/locations/check',
  REST_OCPI_ENDPOINT_CHECK_SESSIONS = 'ocpi/endpoints/:id/sessions/check',
  REST_OCPI_ENDPOINT_PULL_CDRS = 'ocpi/endpoints/:id/cdrs/pull',
  REST_OCPI_ENDPOINT_PULL_LOCATIONS = 'ocpi/endpoints/:id/locations/pull',
  REST_OCPI_ENDPOINT_PULL_SESSIONS = 'ocpi/endpoints/:id/sessions/pull',
  REST_OCPI_ENDPOINT_PULL_TOKENS = 'ocpi/endpoints/:id/tokens/pull',
  REST_OCPI_ENDPOINT_SEND_EVSE_STATUSES = 'ocpi/endpoints/:id/evses/statuses/send',
  REST_OCPI_ENDPOINT_SEND_TOKENS = 'ocpi/endpoints/:id/tokens/send',
  REST_OCPI_ENDPOINT_GENERATE_LOCAL_TOKEN = 'ocpi/endpoints/tokens/generate',
  REST_OCPI_ENDPOINTS = 'ocpi/endpoints',
  REST_OCPI_ENDPOINT = 'ocpi/endpoints/:id',
  REST_OCPI_ENDPOINT_REGISTER = 'ocpi/endpoints/:id/register',
  REST_OCPI_ENDPOINT_UNREGISTER = 'ocpi/endpoints/:id/unregister',
  REST_OCPI_ENDPOINT_CREDENTIALS = 'ocpi/endpoints/:id/credentials',

  REST_OICP_ENDPOINTS = 'oicp/endpoints',
  REST_OICP_ENDPOINT = 'oicp/endpoints/:id',
  REST_OICP_ENDPOINT_PING = 'oicp/endpoints/:id/ping',
  REST_OICP_ENDPOINT_SEND_EVSE_STATUSES = 'oicp/endpoints/:id/evses/statuses/send',
  REST_OICP_ENDPOINT_SEND_EVSES = 'oicp/endpoints/:id/evses/send',
  REST_OICP_ENDPOINT_REGISTER = 'oicp/endpoints/:id/register',
  REST_OICP_ENDPOINT_UNREGISTER = 'oicp/endpoints/:id/unregister',

  REST_SETTINGS = 'settings',
  REST_SETTING = 'settings/:id',

  REST_REGISTRATION_TOKENS = 'registration-tokens',
  REST_REGISTRATION_TOKEN = 'registration-tokens/:id',
  REST_REGISTRATION_TOKEN_REVOKE = 'registration-tokens/:id/revoke',

  REST_SITE_AREAS = 'site-areas',
  REST_SITE_AREA = 'site-areas/:id',
  REST_SITE_AREA_CONSUMPTION = 'site-areas/:id/consumptions',
  REST_SITE_AREA_IMAGE = 'site-areas/:id/image',
  REST_SITE_AREA_ASSIGN_CHARGING_STATIONS = 'site-areas/:id/charging-stations/assign',
  REST_SITE_AREA_REMOVE_CHARGING_STATIONS = 'site-areas/:id/charging-stations/unassign',
  REST_SITE_AREA_ASSIGN_ASSETS = 'site-areas/:id/assets/assign',
  REST_SITE_AREA_REMOVE_ASSETS = 'site-areas/:id/assets/unassign',

  REST_SITES = 'sites',
  REST_SITE = 'sites/:id',
  REST_SITE_USERS = 'sites/:id/users',
  REST_SITE_ADD_USERS = 'sites/:id/users/assign',
  REST_SITE_REMOVE_USERS = 'sites/:id/users/unassign',
  REST_SITE_ADMIN = 'sites/:id/users/admin',
  REST_SITE_OWNER = 'sites/:id/users/owner',
  REST_SITE_IMAGE = 'sites/:id/image',

  REST_STATISTICS_EXPORT = 'statistics/action/export',
  REST_CHARGING_STATION_CONSUMPTION_STATISTICS = 'statistics/charging-stations/consumption',
  REST_CHARGING_STATION_USAGE_STATISTICS = 'statistics/charging-stations/usage',
  REST_CHARGING_STATION_INACTIVITY_STATISTICS = 'statistics/charging-stations/inactivity',
  REST_CHARGING_STATION_TRANSACTIONS_STATISTICS = 'statistics/charging-stations/transaction',
  REST_CHARGING_STATION_PRICING_STATISTICS = 'statistics/charging-stations/pricing',
  REST_USER_CONSUMPTION_STATISTICS = 'statistics/users/consumption',
  REST_USER_USAGE_STATISTICS = 'statistics/users/usage',
  REST_USER_INACTIVITY_STATISTICS = 'statistics/users/inactivity',
  REST_USER_TRANSACTIONS_STATISTICS = 'statistics/users/transaction',
  REST_USER_PRICING_STATISTICS = 'statistics/users/pricing',
  REST_TRANSACTION_YEARS = 'statistics/transactions/years',

  // BILLING URLs for CRUD operations on PAYMENT METHODS
  REST_BILLING_PAYMENT_METHODS = 'users/:userID/payment-methods',
  REST_BILLING_PAYMENT_METHOD = 'users/:userID/payment-methods/:paymentMethodID',

  // BILLING URLs for Non-CRUD Operations on PAYMENT METHODS
  REST_BILLING_PAYMENT_METHOD_SETUP = 'users/:userID/payment-methods/setup',
  REST_BILLING_PAYMENT_METHOD_ATTACH = 'users/:userID/payment-methods/:paymentMethodID/attach',
  REST_BILLING_PAYMENT_METHOD_DETACH = 'users/:userID/payment-methods/:paymentMethodID/detach',

  REST_BILLING_SETTING = 'billing-setting', // GET and PUT
  REST_BILLING_CHECK = 'billing/check',
  REST_BILLING_CLEAR_TEST_DATA = 'billing/clearTestData',

  REST_BILLING_TAXES = 'billing/taxes',

  REST_BILLING_SUB_ACCOUNTS = 'billing/sub-accounts',
  REST_BILLING_SUB_ACCOUNT_ACTIVATE = 'billing/sub-accounts/:id/activate',

  // BILLING URLs for CRUD operations on INVOICES
  REST_BILLING_INVOICES = 'invoices',
  REST_BILLING_INVOICE = 'invoices/:invoiceID',

  // BILLING URLs for Non-CRUD operations on INVOICES
  REST_BILLING_DOWNLOAD_INVOICE = 'invoices/:invoiceID/download',

  // PRICING URLs for CRUD operations
  REST_PRICING_DEFINITIONS = 'pricing-definitions',
  REST_PRICING_DEFINITION = 'pricing-definitions/:id',

  // PRICING URLs for Non-CRUD operations
  REST_PRICING_MODEL_RESOLVE = 'pricing-model/resolve',
}

export enum OCPIServerRoute {
  OCPI_CREDENTIALS = 'credentials',
  OCPI_LOCATIONS = 'locations',
  OCPI_TOKENS = 'tokens',
  OCPI_SESSIONS = 'sessions',
  OCPI_CDRS = 'cdrs',
  OCPI_COMMANDS = 'commands',
  OCPI_TARIFFS = 'tariffs',
  OCPI_VERSIONS = 'versions',
}

export enum OCPIServerRouteVersions {
  VERSION_211 = '2.1.1'
}

export enum ServerProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  WS = 'ws',
  WSS = 'wss'
}

export enum ServerType {
  REST_SERVER = 'Rest',
  SOAP_SERVER = 'Soap',
  JSON_SERVER = 'Json',
  OCPI_SERVER = 'Ocpi',
  OICP_SERVER = 'Oicp',
  ODATA_SERVER = 'OData',
  BATCH_SERVER = 'Batch',
  MONITORING_SERVER = 'Monitoring',
  CENTRAL_SERVER = 'CentralServer',
}

export enum WSServerProtocol {
  OCPP16 = 'ocpp1.6',
  REST = 'rest'
}
