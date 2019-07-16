import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import AppAuthError from '../../../exception/AppAuthError';
import AppError from '../../../exception/AppError';
import Authorizations from '../../../authorization/Authorizations';
import Constants from '../../../utils/Constants';
import ERPService from '../../../integration/pricing/convergent-charging/ERPService';
import { HttpUserRequest } from '../../../types/requests/HttpUserRequest';
import Logging from '../../../utils/Logging';
import NotificationHandler from '../../../notification/NotificationHandler';
import RatingService from '../../../integration/pricing/convergent-charging/RatingService';
import SettingStorage from '../../../storage/mongodb/SettingStorage';
import SiteStorage from '../../../storage/mongodb/SiteStorage';
import TenantStorage from '../../../storage/mongodb/TenantStorage';
import User from '../../../types/User';
import UserSecurity from './security/UserSecurity';
import UserStorage from '../../../storage/mongodb/UserStorage';
import Utils from '../../../utils/Utils';
import UtilsService from './UtilsService';

export default class UserService {

  public static async handleAssignSitesToUser(action: string, req: Request, res: Response, next: NextFunction) {
    await UtilsService.assertComponentIsActive(
      req.user.tenantID, Constants.COMPONENTS.ORGANIZATION,
      Constants.ACTION_UPDATE, Constants.ENTITY_SITES, 'SiteService', 'handleAssignSitesToUser');
    // Filter
    const filteredRequest = UserSecurity.filterAssignSitesToUserRequest(req.body, req.user);
    // Check Mandatory fields
    if (!filteredRequest.userID) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User\'s ID must be provided', Constants.HTTP_GENERAL_ERROR,
        'UserService', 'handleAssignSitesToUser', req.user);
    }
    if (!filteredRequest.siteIDs || (filteredRequest.siteIDs && filteredRequest.siteIDs.length <= 0)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'Site\'s IDs must be provided', Constants.HTTP_GENERAL_ERROR,
        'UserService', 'handleAssignSitesToUser', req.user);
    }
    // Check auth
    if (!Authorizations.canUpdateUser(req.user, filteredRequest.userID)) {
      throw new AppAuthError(
        Constants.ACTION_UPDATE,
        Constants.ENTITY_USER,
        filteredRequest.userID,
        Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleAssignSitesToUser',
        req.user);
    }
    // Get the User
    const user = await UserStorage.getUser(req.user.tenantID, filteredRequest.userID);
    if (!user) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${filteredRequest.userID}' does not exist anymore`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleAssignSitesToUser', req.user);
    }
    // Get Sites
    for (const siteID of filteredRequest.siteIDs) {
      if (!SiteStorage.siteExists(req.user.tenantID, siteID)) {
        throw new AppError(
          Constants.CENTRAL_SERVER,
          `Site with ID '${siteID}' does not exist anymore`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
          'UserService', 'handleAssignSitesToUser', req.user);
      }
      // Check auth
      if (!Authorizations.canUpdateSite(req.user, siteID)) {
        throw new AppAuthError(
          Constants.ACTION_UPDATE,
          Constants.ENTITY_SITE,
          siteID,
          Constants.HTTP_AUTH_ERROR,
          'UserService', 'handleAssignSitesToUser',
          req.user, user);
      }
    }
    // Save
    if(action.toLowerCase().includes('add')) {
      await UserStorage.addSitesToUser(req.user.tenantID, filteredRequest.userID, filteredRequest.siteIDs);
    }else{
      await UserStorage.removeSitesFromUser(req.user.tenantID, filteredRequest.userID, filteredRequest.siteIDs);
    }
    // Log
    Logging.logSecurityInfo({
      tenantID: req.user.tenantID,
      user: req.user, module: 'UserService', method: 'handleAssignSitesToUser',
      message: 'User\'s Sites have been assigned successfully', action: action
    });
    // Ok
    res.json(Constants.REST_RESPONSE_SUCCESS);
    next();
  }

  public static async handleDeleteUser(action: string, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Filter
    const id = UserSecurity.filterUserByIDRequest(req.query);
    // Check Mandatory fields
    if (!id) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User\'s ID must be provided', Constants.HTTP_GENERAL_ERROR,
        'UserService', 'handleDeleteUser', req.user);
    }
    // Check auth
    if (!Authorizations.canDeleteUser(req.user, id)) {
      throw new AppAuthError(
        Constants.ACTION_DELETE,
        Constants.ENTITY_USER,
        id,
        Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleDeleteUser',
        req.user);
    }
    // Check Mandatory fields
    if (id === req.user.id) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User cannot delete himself', Constants.HTTP_GENERAL_ERROR,
        'UserService', 'handleDeleteUser', req.user);
    }
    // Check user
    const user = await UserStorage.getUser(req.user.tenantID, id);
    if (!user) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${id}' does not exist anymore`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleDeleteUser', req.user);
    }
    // Deleted
    if (user.deleted) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${id}' is already deleted`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleDeleteUser', req.user);
    }
    if(req.user.activeComponents.includes(Constants.COMPONENTS.ORGANIZATION)){
      // Delete from site
      // TODO: lots of useless information queried here, could be made faster...
      const siteIDs: string[] = (await UserStorage.getSites(req.user.tenantID, { userID: id }, { limit: Constants.MAX_DB_RECORD_COUNT, skip: 0 })).result.map(
        (siteUser) => {
          return siteUser.site.id;
        }
      );
      UserStorage.removeSitesFromUser(req.user.tenantID, user.id, siteIDs);
    }
    // Delete User
    await UserStorage.deleteUser(req.user.tenantID, user.id);
    // Log
    Logging.logSecurityInfo({
      tenantID: req.user.tenantID,
      user: req.user, actionOnUser: user,
      module: 'UserService', method: 'handleDeleteUser',
      message: `User with ID '${user.id}' has been deleted successfully`,
      action: action
    });
    // Ok
    res.json(Constants.REST_RESPONSE_SUCCESS);
    next();
  }

  public static async handleUpdateUser(action: string, req: Request, res: Response, next: NextFunction) {
    let statusHasChanged = false;
    // Filter
    const filteredRequest = UserSecurity.filterUserUpdateRequest(req.body, req.user);
    // Check Mandatory fields
    if (!filteredRequest.id) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User\'s ID must be provided', Constants.HTTP_GENERAL_ERROR,
        'UserService', 'handleDeleteUser', req.user);
    }
    // Check auth
    if (!Authorizations.canUpdateUser(req.user, filteredRequest.id)) {
      throw new AppAuthError(
        Constants.ACTION_UPDATE,
        Constants.ENTITY_USER,
        filteredRequest.id,
        Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleUpdateUser',
        req.user);
    }
    // Get User
    const user = await UserStorage.getUser(req.user.tenantID, filteredRequest.id);
    if (!user) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${filteredRequest.id}' does not exist anymore`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleUpdateUser', req.user);
    }
    // Deleted?
    if (user.deleted) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${filteredRequest.id}' is logically deleted`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleUpdateUser', req.user);
    }
    // Check email
    const userWithEmail = await UserStorage.getUserByEmail(req.user.tenantID, filteredRequest.email);
    // Check if EMail is already taken
    if (userWithEmail && user.id !== userWithEmail.id) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `Email '${filteredRequest.email}' already exists`, Constants.HTTP_USER_EMAIL_ALREADY_EXIST_ERROR,
        'UserService', 'handleUpdateUser', req.user);
    }
    // Check if Status has been changed
    if (filteredRequest.status &&
      filteredRequest.status !== user.status) {
      // Status changed
      statusHasChanged = true;
    }
    // Check the password
    if (filteredRequest.password && filteredRequest.password.length > 0) {
      // Generate the password hash
      const newPasswordHashed = await Utils.hashPasswordBcrypt(filteredRequest.password);
      // Update the password
      filteredRequest.password = newPasswordHashed;
    }
    // Update timestamp
    filteredRequest.lastChangedBy = { id: req.user.id };
    filteredRequest.lastChangedOn = new Date();
    // Clean up request
    delete filteredRequest.passwords;
    // Check Mandatory fields
    UserService._checkIfUserValid(filteredRequest, user, req);
    // Update User
    const newTagIDs = (typeof filteredRequest.tagIDs === 'string') ? [] : filteredRequest.tagIDs;
    const updatedUserId = await UserStorage.saveUser(req.user.tenantID, { ...filteredRequest, tagIDs: newTagIDs }, true); // Careful: Last changed by is not a proper user here! TODO (it wasnt before either tho)
    // Log
    Logging.logSecurityInfo({
      tenantID: req.user.tenantID,
      user: req.user, actionOnUser: user,
      module: 'UserService', method: 'handleUpdateUser',
      message: 'User has been updated successfully',
      action: action
    });
    // Notify
    if (statusHasChanged) {
      // Send notification
      NotificationHandler.sendUserAccountStatusChanged(
        req.user.tenantID,
        Utils.generateGUID(),
        user,
        {
          'user': user,
          'evseDashboardURL': Utils.buildEvseURL((await TenantStorage.getTenant(req.user.tenantID)).getSubdomain())
        },
        user.locale
      );
    }
    // Ok
    res.json(Constants.REST_RESPONSE_SUCCESS);
    next();
  }

  public static async handleGetUser(action: string, req: Request, res: Response, next: NextFunction) {
    // Filter
    const id = UserSecurity.filterUserByIDRequest(req.query);
    // User mandatory
    if (!id) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User\'s ID must be provided', Constants.HTTP_GENERAL_ERROR,
        'UserService', 'handleGetUser', req.user);
    }
    // Check auth
    if (!Authorizations.canReadUser(req.user, id)) {
      throw new AppAuthError(
        Constants.ACTION_READ,
        Constants.ENTITY_USER,
        id,
        Constants.HTTP_AUTH_ERROR, 'UserService', 'handleGetUser',
        req.user);
    }
    // Get the user
    const user = await UserStorage.getUser(req.user.tenantID, id);
    if (!user) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${id}' does not exist anymore`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleGetUser', req.user);
    }
    // Deleted?
    if (user.deleted) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${id}' is logically deleted`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleGetUser', req.user);
    }
    // Ok
    res.json(
      // Filter
      UserSecurity.filterUserResponse(
        user, req.user)
    );
    next();
  }

  public static async handleGetUserImage(action: string, req: Request, res: Response, next: NextFunction) {
    // Filter
    const filteredRequest = { ID: UserSecurity.filterUserByIDRequest(req.query) };
    // User mandatory
    if (!filteredRequest.ID) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User\'s ID must be provided', Constants.HTTP_GENERAL_ERROR,
        'UserService', 'handleGetUser', req.user);
    }
    // Check auth
    if (!Authorizations.canReadUser(req.user, filteredRequest.ID)) {
      throw new AppAuthError(
        Constants.ACTION_READ,
        Constants.ENTITY_USER,
        filteredRequest.ID,
        Constants.HTTP_AUTH_ERROR, 'UserService', 'handleGetUserImage',
        req.user);
    }
    // Get the logged user
    const user = await UserStorage.getUser(req.user.tenantID, filteredRequest.ID);
    if (!user) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${filteredRequest.ID}' does not exist anymore`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleGetUserImage', req.user);
    }
    // Deleted?
    if (user.deleted) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${filteredRequest.ID}' is logically deleted`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleGetUserImage', req.user);
    }
    // Get the user image
    const userImage = await UserStorage.getUserImage(req.user.tenantID, filteredRequest.ID);
    // Ok
    res.json(userImage);
    next();
  }

  public static async handleGetUserImages(action: string, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check auth
    if (!Authorizations.canListUsers(req.user)) {
      throw new AppAuthError(
        Constants.ACTION_LIST,
        Constants.ENTITY_USERS,
        null,
        Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleGetUserImages',
        req.user);
    }
    // Get the user image
    const userImages = await UserStorage.getUserImages(req.user.tenantID);
    // Ok
    res.json(userImages);
    next();
  }

  public static async handleGetUsers(action: string, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check auth
    if (!Authorizations.canListUsers(req.user)) {
      throw new AppAuthError(
        Constants.ACTION_LIST,
        Constants.ENTITY_USERS,
        null,
        Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleGetUsers',
        req.user);
    }
    // Filter
    const filteredRequest = UserSecurity.filterUsersRequest(req.query, req.user);
    // Check component
    if(filteredRequest.SiteID || filteredRequest.ExcludeSiteID) {
      await UtilsService.assertComponentIsActive(req.user.tenantID, 
        Constants.COMPONENTS.ORGANIZATION, Constants.ACTION_READ, Constants.ENTITY_USER, 'UserService', 'handleGetUsers');
    }
    // Get users
    const users = await UserStorage.getUsers(req.user.tenantID,
      {
        search: filteredRequest.Search,
        siteID: filteredRequest.SiteID,
        role: filteredRequest.Role,
        statuses: filteredRequest.Status ? [filteredRequest.Status] : null,
        excludeSiteID: filteredRequest.ExcludeSiteID,
      },
      {
        limit: filteredRequest.Limit,
        skip: filteredRequest.Skip,
        sort: filteredRequest.Sort,
        onlyRecordCount: filteredRequest.OnlyRecordCount
      }
    );
    // Filter
    UserSecurity.filterUsersResponse(users, req.user);
    // Ok
    res.json(users);
    next();
  }

  public static async handleGetUsersInError(action: string, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check auth
    if (!Authorizations.canListUsers(req.user)) {
      throw new AppAuthError(
        Constants.ACTION_LIST,
        Constants.ENTITY_USERS,
        null,
        Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleGetUsersInError',
        req.user);
    }
    // Filter
    const filteredRequest = UserSecurity.filterUsersRequest(req.query, req.user);
    // Check component
    if(filteredRequest.SiteID || filteredRequest.ExcludeSiteID) {
      await UtilsService.assertComponentIsActive(req.user.tenantID, 
        Constants.COMPONENTS.ORGANIZATION, Constants.ACTION_READ, Constants.ENTITY_USER, 'UserService', 'handleGetUsersInError');
    }
    // Get users
    const users = await UserStorage.getUsers(req.user.tenantID,
      {
        'search': filteredRequest.Search,
        'siteID': filteredRequest.SiteID,
        'role': filteredRequest.Role,
        statuses: [Constants.USER_STATUS_BLOCKED, Constants.USER_STATUS_INACTIVE, Constants.USER_STATUS_LOCKED, Constants.USER_STATUS_PENDING]
      },
      {
        limit: filteredRequest.Limit,
        onlyRecordCount: filteredRequest.OnlyRecordCount,
        skip: filteredRequest.Skip,
        sort: filteredRequest.Sort
      }
    );
    // Filter
    UserSecurity.filterUsersResponse(users, req.user);
    // Return
    res.json(users);
    next();
  }

  public static async handleCreateUser(action: string, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check auth
    if (!Authorizations.canCreateUser(req.user)) {
      throw new AppAuthError(
        Constants.ACTION_CREATE,
        Constants.ENTITY_USER,
        null,
        Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleCreateUser',
        req.user);
    }
    // Filter
    const filteredRequest = UserSecurity.filterUserCreateRequest(req.body, req.user);
    // Check Mandatory fields
    UserService._checkIfUserValid(filteredRequest, null, req);
    // Get the email
    const foundUser = await UserStorage.getUserByEmail(req.user.tenantID, filteredRequest.email);
    if (foundUser) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `Email '${filteredRequest.email}' already exists`, Constants.HTTP_USER_EMAIL_ALREADY_EXIST_ERROR,
        'UserService', 'handleCreateUser', req.user);
    }
    // Clean request
    delete filteredRequest.passwords;
    // Set the password
    if (filteredRequest.password) {
      // Generate a hash for the given password
      const newPasswordHashed = await Utils.hashPasswordBcrypt(filteredRequest.password);
      // Generate a hash
      filteredRequest.password = newPasswordHashed;
    }
    // Set timestamp
    filteredRequest.createdBy = { id: req.user.id } as User;
    filteredRequest.createdOn = new Date();
    // Set default
    if (!filteredRequest.notificationsActive) {
      filteredRequest.notificationsActive = true;
    }
    filteredRequest.createdOn = new Date();
    // Save User
    let newTagIDs: string[];
    if (typeof filteredRequest.tagIDs === 'string') {
      newTagIDs = [];
    } else {
      newTagIDs = filteredRequest.tagIDs;
    }
    const newUserId = await UserStorage.saveUser(req.user.tenantID, { ...filteredRequest, tagIDs: newTagIDs }, true);
    // Log
    Logging.logSecurityInfo({
      tenantID: req.user.tenantID,
      user: req.user, actionOnUser: filteredRequest,
      module: 'UserService', method: 'handleCreateUser',
      message: `User with ID '${newUserId}' has been created successfully`,
      action: action
    });
    // Ok
    res.json(Object.assign({ id: newUserId }, Constants.REST_RESPONSE_SUCCESS));
    next();
  }

  public static async handleGetUserInvoice(action: string, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Filter
    const id = UserSecurity.filterUserByIDRequest(req.query);
    // User mandatory
    if (!id) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User\'s ID must be provided', Constants.HTTP_GENERAL_ERROR,
        'UserService', 'handleGetUserInvoice', req.user);
    }
    // Check auth
    if (!Authorizations.canReadUser(req.user, id)) {
      throw new AppAuthError(
        Constants.ACTION_READ,
        Constants.ENTITY_USER,
        id,
        Constants.HTTP_AUTH_ERROR, 'UserService', 'handleGetUserInvoice',
        req.user);
    }
    // Get the user
    const user = await UserStorage.getUser(req.user.tenantID, id);
    if (!user) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${id}' does not exist anymore`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleGetUserInvoice', req.user);
    }
    // Deleted?
    if (user.deleted) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User with ID '${id}' is logically deleted`, Constants.HTTP_OBJECT_DOES_NOT_EXIST_ERROR,
        'UserService', 'handleGetUserInvoice', req.user);
    }
    // Get the settings
    let setting = await SettingStorage.getSettingByIdentifier(req.user.tenantID, Constants.COMPONENTS.PRICING);
    setting = setting.getContent().convergentCharging;
    if (!setting) {
      Logging.logException({ 'message': 'Convergent Charging setting is missing' }, 'UserInvoice', Constants.CENTRAL_SERVER, 'UserService', 'handleGetUserInvoice', req.user.tenantID, req.user);
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'An issue occurred while creating the invoice', Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleGetUserInvoice', req.user);
    }
    // Create services
    const ratingService = new RatingService(setting.url, setting.user, setting.password);
    const erpService = new ERPService(setting.url, setting.user, setting.password);
    let invoiceNumber;
    try {
      await ratingService.loadChargedItemsToInvoicing();
      invoiceNumber = await erpService.createInvoice(req.user.tenantID, user);
    } catch (exception) {
      Logging.logException(exception, 'UserInvoice', Constants.CENTRAL_SERVER, 'UserService', 'handleGetUserInvoice', req.user.tenantID, req.user);
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'An issue occurred while creating the invoice', Constants.HTTP_AUTH_ERROR,
        'UserService', 'handleGetUserInvoice', req.user);
    }
    if (!invoiceNumber) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'No invoices available', 404,
        'UserService', 'handleGetUserInvoice', req.user);
    }
    try {
      const invoiceHeader = await erpService.getInvoiceDocumentHeader(invoiceNumber);
      let invoice = await erpService.getInvoiceDocument(invoiceHeader, invoiceNumber);
      if (!invoice) {
        // Retry to get invoice
        invoice = await erpService.getInvoiceDocument(invoiceHeader, invoiceNumber);
      }
      if (!invoice) {
        throw new AppError(
          Constants.CENTRAL_SERVER,
          `An error occurred while requesting invoice ${invoiceNumber}`,
          Constants.HTTP_PRICING_REQUEST_INVOICE_ERROR,
          'UserService', 'handleGetUserInvoice', req.user);
      }
      const filename = 'invoice.pdf';
      fs.writeFile(filename, invoice, (err) => { // TODO: potential problem at sccale; two pple generating invoice at same time?
        if (err) {
          throw err;
        }
        res.download(filename, (err) => {
          if (err) {
            throw err;
          }
          fs.unlink(filename, (err) => {
            if (err) {
              throw err;
            }
          });
        });
      });
    } catch (e) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `An error occurred while requesting invoice ${invoiceNumber}`,
        Constants.HTTP_PRICING_REQUEST_INVOICE_ERROR,
        'UserService', 'handleGetUserInvoice', req.user);
    }
  }

  public static _checkIfUserValid(filteredRequest: Partial<HttpUserRequest>, user: User, req: Request) {
    const tenantID = req.user.tenantID;
    if (!tenantID) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'Tenant is mandatory', Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid');
    }
    // Update model?
    if (req.method !== 'POST' && !filteredRequest.id) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User ID is mandatory', Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid',
        req.user.id);
    }
    // Creation?
    if (req.method === 'POST') {
      if (!filteredRequest.role) {
        filteredRequest.role = Constants.ROLE_BASIC;
      }
    } else {
      // Do not allow to change if not Admin
      if (!Authorizations.isAdmin(req.user.role)) {
        filteredRequest.role = user.role;
      }
    }
    if (req.method === 'POST' && !filteredRequest.status) {
      filteredRequest.status = Constants.USER_STATUS_BLOCKED;
    }
    // Creation?
    if ((filteredRequest.role !== Constants.ROLE_BASIC) && (filteredRequest.role !== Constants.ROLE_DEMO) &&
        !Authorizations.isAdmin(req.user.role) && !Authorizations.isSuperAdmin(req.user.role)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `Only Admins can assign the role '${Utils.getRoleNameFromRoleID(filteredRequest.role)}'`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    // Only Admin user can change role
    if (tenantID === 'default' && filteredRequest.role && filteredRequest.role !== Constants.ROLE_SUPER_ADMIN) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User cannot have the role '${Utils.getRoleNameFromRoleID(filteredRequest.role)}' in the Super Tenant`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    // Only Super Admin user in Super Tenant (default)
    if (tenantID === 'default' && filteredRequest.role && filteredRequest.role !== Constants.ROLE_SUPER_ADMIN) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User cannot have the role '${Utils.getRoleNameFromRoleID(filteredRequest.role)}' in the Super Tenant`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    // Only Basic, Demo, Admin user other Tenants (!== default)
    if (tenantID !== 'default' && filteredRequest.role && filteredRequest.role === Constants.ROLE_SUPER_ADMIN) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User cannot have the Super Admin role in this Tenant', Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    // Only Admin and Super Admin can use role different from Basic
    if (filteredRequest.role === Constants.ROLE_ADMIN && filteredRequest.role === Constants.ROLE_SUPER_ADMIN &&
        !Authorizations.isAdmin(req.user.role) && !Authorizations.isSuperAdmin(req.user.role)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User without role Admin or Super Admin tried to ${filteredRequest.id ? 'update' : 'create'} an User with the '${Utils.getRoleNameFromRoleID(filteredRequest.role)}' role`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    if (!filteredRequest.name) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User Last Name is mandatory', Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    if (req.method === 'POST' && !filteredRequest.email) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User Email is mandatory', Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    if (req.method === 'POST' && !UserService.isUserEmailValid(filteredRequest.email)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User Email ${filteredRequest.email} is not valid`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    if (filteredRequest.password && !UserService.isPasswordValid(filteredRequest.password)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        'User Password is not valid', Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    if (filteredRequest.phone && !UserService.isPhoneValid(filteredRequest.phone)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User Phone ${filteredRequest.phone} is not valid`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    if (filteredRequest.mobile && !UserService.isPhoneValid(filteredRequest.mobile)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User Mobile ${filteredRequest.mobile} is not valid`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    if (filteredRequest.iNumber && !UserService.isINumberValid(filteredRequest.iNumber)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User I-Number ${filteredRequest.iNumber} is not valid`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
    if (filteredRequest.tagIDs) {
      // Check
      if (!Array.isArray(filteredRequest.tagIDs)) { // TODO: this piece is not very robust, and mutates filteredRequest even tho it's named "check". Should be changed, honestly
        if (filteredRequest.tagIDs !== '') {
          filteredRequest.tagIDs = filteredRequest.tagIDs.split(',');
        }
      }
      if (!UserService.areTagIDsValid(filteredRequest.tagIDs)) {
        throw new AppError(
          Constants.CENTRAL_SERVER,
          `User Tags ${filteredRequest.tagIDs} is/are not valid`, Constants.HTTP_GENERAL_ERROR,
          'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
      }
    }
    // At least one tag ID
    if (!filteredRequest.tagIDs || filteredRequest.tagIDs.length === 0) {
      filteredRequest.tagIDs = [Utils.generateTagID(filteredRequest.name, filteredRequest.firstName)];
    }
    if (filteredRequest.plateID && !UserService.isPlateIDValid(filteredRequest.plateID)) {
      throw new AppError(
        Constants.CENTRAL_SERVER,
        `User Plate ID ${filteredRequest.plateID} is not valid`, Constants.HTTP_GENERAL_ERROR,
        'Users', 'checkIfUserValid', req.user.id, filteredRequest.id);
    }
  }

  public static isPasswordValid(password: string): boolean {
    // eslint-disable-next-line no-useless-escape
    return /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!#@:;,<>\/''\$%\^&\*\.\?\-_\+\=\(\)])(?=.{8,})/.test(password);
  }

  public static isUserEmailValid(email: string) {
    return /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
  }

  public static areTagIDsValid(tagIDs: string[]|string) {
    if (typeof tagIDs === 'string') {
      return /^[A-Za-z0-9,]*$/.test(tagIDs);
    }
    return tagIDs.filter((tagID) => {
      return /^[A-Za-z0-9,]*$/.test(tagID);
    }).length === tagIDs.length;
  }

  public static isPhoneValid(phone: string): boolean {
    return /^\+?([0-9] ?){9,14}[0-9]$/.test(phone);
  }

  static isINumberValid(iNumber) {
    return /^[A-Z]{1}[0-9]{6}$/.test(iNumber);
  }

  static isPlateIDValid(plateID) {
    return /^[A-Z0-9-]*$/.test(plateID);
  }

}
