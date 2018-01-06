const SecurityRestObjectFiltering = require('../SecurityRestObjectFiltering');
const CentralRestServerAuthorization = require('../CentralRestServerAuthorization');
const Logging = require('../../../utils/Logging');
const AppError = require('../../../exception/AppError');
const AppAuthError = require('../../../exception/AppAuthError');
const Users = require('../../../utils/Users');
const User = require('../../../model/User');
const Utils = require('../../../utils/Utils');
const Database = require('../../../utils/Database');

class UserService {
	static handleDeleteUser(action, req, res, next) {
		Logging.logSecurityInfo({
			user: req.user, action: action,
			module: "UserService",
			method: "handleDeleteUser",
			message: `Delete User with ID '${req.query.ID}'`,
			detailedMessages: req.query
		});
		// Filter
		let filteredRequest = SecurityRestObjectFiltering.filterUserDeleteRequest(req.query, req.user);
		// Check Mandatory fields
		if(!filteredRequest.ID) {
			Logging.logActionExceptionMessageAndSendResponse(action, new Error(`The user's ID must be provided`), req, res, next);
			return;
		}
		// Check email
		let user;
		global.storage.getUser(filteredRequest.ID).then((foundUser) => {
			user = foundUser;
			if (!user) {
				throw new AppError(`The user with ID ${filteredRequest.id} does not exist anymore`,
					500, "UserService", "restServiceSecured");
			}
			// Check authchargingStation
			if (!CentralRestServerAuthorization.canDeleteUser(req.user, user.getModel())) {
				// Not Authorized!
				throw new AppAuthError(req.user, CentralRestServerAuthorization.ACTION_DELETE,
					CentralRestServerAuthorization.ENTITY_USER, user.getID(),
					500, "UserService", "restServiceSecured");
			}
			// Delete
			return user.delete();
		}).then(() => {
			// Log
			Logging.logSecurityInfo({
				user: req.user, source: "Central Server", module: "CentralServerRestService", method: "restServiceSecured",
				message: `User '${user.getFullName()}' with Email '${user.getEMail()}' and ID '${user.getID()}' has been deleted successfully`,
				action: action, detailedMessages: user});
			// Ok
			res.json({status: `Success`});
			next();
		}).catch((err) => {
			// Log
			Logging.logActionExceptionMessageAndSendResponse(action, err, req, res, next);
		});
	}

	static handleUpdateUser(action, req, res, next) {
		Logging.logSecurityInfo({
			user: req.user, action: action,
			module: "UserService",
			method: "handleUpdateUser",
			message: `Update User '${Utils.buildUserFullName(req.body, false)}' (ID '${req.body.id}')`,
			detailedMessages: req.body
		});
		let statusHasChanged=false;
		// Filter
		let filteredRequest = SecurityRestObjectFiltering.filterUserUpdateRequest( req.body, req.user );
		// Check Mandatory fields
		if (Users.checkIfUserValid("UserUpdate", filteredRequest, req, res, next)) {
			let userWithId;
			// Check email
			global.storage.getUser(filteredRequest.id).then((user) => {
				if (!user) {
					throw new AppError(`The user with ID ${filteredRequest.id} does not exist anymore`,
						550, "UserService", "restServiceSecured");
				}
				// Keep
				userWithId = user;
				return user;
			}).then((user) => {
				// Check email
				return global.storage.getUserByEmail(filteredRequest.email);
			}).then((userWithEmail) => {
				if (userWithEmail && userWithId.getID() !== userWithEmail.getID()) {
					throw new AppError(`The email ${filteredRequest.email} already exists`,
						510, "UserService", "restServiceSecured");
				}
				// Generate a password
				return Users.hashPasswordBcrypt(filteredRequest.password);
			}).then((newPasswordHashed) => {
				// Check auth
				if (!CentralRestServerAuthorization.canUpdateUser(req.user, userWithId.getModel())) {
					// Not Authorized!
					Logging.logActionUnauthorizedMessageAndSendResponse(
						CentralRestServerAuthorization.ACTION_UPDATE, CentralRestServerAuthorization.ENTITY_USER, Utils.buildUserFullName(userWithId.getModel()), req, res, next);
					return;
				}
				// Check if Role is provided and has been changed
				if (filteredRequest.role && filteredRequest.role !== userWithId.getRole() && req.user.role !== Users.USER_ROLE_ADMIN) {
					// Role provided and not an Admin
					Logging.logError({
						user: req.user, source: "Central Server", module: "CentralServerRestService", method: "UpdateUser",
						message: `User ${Utils.buildUserFullName(req.user)} with role '${req.user.role}' tried to change the role of the user ${Utils.buildUserFullName(userWithId.getModel())} to '${filteredRequest.role}' without having the Admin priviledge` });
					// Override it
					filteredRequest.role = userWithId.getRole();
				}
				// Check if Role is provided
				if (filteredRequest.status && filteredRequest.status !== userWithId.getStatus()) {
					// Right to change?
					if (req.user.role !== Users.USER_ROLE_ADMIN) {
						// Role provided and not an Admin
						Logging.logError({
							user: req.user, source: "Central Server", module: "CentralServerRestService", method: "UpdateUser",
							message: `User ${Utils.buildUserFullName(req.user)} with role '${req.user.role}' tried to update the status of the user ${Utils.buildUserFullName(userWithId.getModel())} to '${filteredRequest.status}' without having the Admin priviledge` });
						// Ovverride it
						filteredRequest.status = userWithId.getStatus();
					} else {
						// Status changed
						statusHasChanged = true;
					}
				}
				// Update
				Database.updateUser(filteredRequest, userWithId.getModel());
				// Set the locale
				userWithId.setLocale(req.locale);
				// Update timestamp
				userWithId.setLastChangedBy(`${Utils.buildUserFullName(req.user)}`);
				userWithId.setLastChangedOn(new Date());
				// Check the password
				if (filteredRequest.password && filteredRequest.password.length > 0) {
					// Update the password
					userWithId.setPassword(newPasswordHashed);
				}
				// Update
				return userWithId.save();
			}).then((updatedUser) => {
				// Log
				Logging.logSecurityInfo({
					user: req.user, source: "Central Server", module: "CentralServerRestService", method: "restServiceSecured",
					message: `User '${updatedUser.getFullName()}' with Email '${updatedUser.getEMail()}' and ID '${req.user.id}' has been updated successfully`,
					action: action, detailedMessages: updatedUser});
				// Notify
				if (statusHasChanged) {
					// Send notification
					NotificationHandler.sendUserAccountStatusChanged(
						Utils.generateGUID(),
						updatedUser.getModel(),
						{
							"user": updatedUser.getModel(),
							"evseDashboardURL" : Utils.buildEvseURL()
						},
						req.locale);
				}
				// Ok
				res.json({status: `Success`});
				next();
			}).catch((err) => {
				// Log
				Logging.logActionExceptionMessageAndSendResponse(action, err, req, res, next);
			});
		}
	}

	static handleGetUser(action, req, res, next) {
		Logging.logSecurityInfo({
			user: req.user, action: action,
			module: "UserService",
			method: "handleGetUser",
			message: `Read User ID '${req.query.ID}'`,
			detailedMessages: req.query
		});
		// Filter
		let filteredRequest = SecurityRestObjectFiltering.filterUserRequest(req.query, req.user);
		// User mandatory
		if(!filteredRequest.ID) {
			Logging.logActionExceptionMessageAndSendResponse(action, new Error(`The User's ID is mandatory`), req, res, next);
			return;
		}
		// Get the user
		global.storage.getUser(filteredRequest.ID).then((user) => {
			if (user) {
				// Set the user
				res.json(
					// Filter
					SecurityRestObjectFiltering.filterUserResponse(
						user.getModel(), req.user)
				);
			} else {
				res.json({});
			}
			next();
		}).catch((err) => {
			// Log
			Logging.logActionExceptionMessageAndSendResponse(action, err, req, res, next);
		});
	}

	static handleGetUsers(action, req, res, next) {
		Logging.logSecurityInfo({
			user: req.user, action: action,
			module: "UserService",
			method: "handleGetUsers",
			message: `Read All Users`
		});
		// Check auth
		if (!CentralRestServerAuthorization.canListUsers(req.user)) {
			// Not Authorized!
			Logging.logActionUnauthorizedMessageAndSendResponse(
				CentralRestServerAuthorization.ACTION_LIST, CentralRestServerAuthorization.ENTITY_USERS, null, req, res, next);
			return;
		}
		// Filter
		let filteredRequest = SecurityRestObjectFiltering.filterUsersRequest(req.query, req.user);
		// Get users
		global.storage.getUsers(filteredRequest.Search, 200, filteredRequest.WithPicture).then((users) => {
			var usersJSon = [];
			users.forEach((user) => {
				// Set the model
				usersJSon.push(user.getModel());
			});
			// Return
			res.json(
				// Filter
				SecurityRestObjectFiltering.filterUsersResponse(
					usersJSon, req.user)
			);
			next();
		}).catch((err) => {
			// Log
			Logging.logActionExceptionMessageAndSendResponse(action, err, req, res, next);
		});
	}

	static handleCreateUser(action, req, res, next) {
		Logging.logSecurityInfo({
			user: req.user, action: action,
			module: "UserService",
			method: "handleCreateUser",
			message: `Create User '${Utils.buildUserFullName(req.body, false)}' with Email '${req.body.email}'`,
			detailedMessages: req.body
		});
		// Check auth
		if (!CentralRestServerAuthorization.canCreateUser(req.user)) {
			// Not Authorized!
			Logging.logActionUnauthorizedMessageAndSendResponse(
				CentralRestServerAuthorization.ACTION_CREATE, CentralRestServerAuthorization.ENTITY_USER, null, req, res, next);
			return;
		}
		// Filter
		let filteredRequest = SecurityRestObjectFiltering.filterUserCreateRequest( req.body, req.user );
		// Check Mandatory fields
		if (Users.checkIfUserValid("UserCreate", filteredRequest, req, res, next)) {
			let loggedUserGeneral;
			// Get the logged user
			global.storage.getUser(req.user.id).then((loggedUser) => {
				// Set
				loggedUserGeneral = loggedUser;
				// Get the email
				return global.storage.getUserByEmail(filteredRequest.email);
			}).then((foundUser) => {
				if (foundUser) {
					throw new AppError(`The email ${filteredRequest.email} already exists`,
						510, "UserService", "restServiceSecured");
				}
				// Generate a hash for the given password
				return Users.hashPasswordBcrypt(filteredRequest.password);
			}).then((newPasswordHashed) => {
				// Create user
				var newUser = new User(filteredRequest);
				// Set the locale
				newUser.setLocale(req.locale);
				// Update timestamp
				newUser.setCreatedBy(Utils.buildUserFullName(loggedUserGeneral.getModel(), Users.WITHOUT_ID));
				newUser.setCreatedOn(new Date());
				// Set the password
				if (filteredRequest.password) {
					// Generate a hash
					newUser.setPassword(newPasswordHashed);
				}
				// Save
				return newUser.save();
			}).then((createdUser) => {
				Logging.logSecurityInfo({
					user: req.user, source: "Central Server", module: "CentralServerRestService", method: "restServiceSecured",
					message: `User '${createdUser.getFullName()}' with email '${createdUser.getEMail()}' has been created successfully`,
					action: action, detailedMessages: createdUser});
				// Ok
				res.json({status: `Success`});
				next();
			}).catch((err) => {
				// Log
				Logging.logActionExceptionMessageAndSendResponse(action, err, req, res, next);
			});
		}
	}
}

module.exports = UserService;
