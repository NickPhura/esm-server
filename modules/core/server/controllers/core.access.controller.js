'use strict';
// =========================================================================
//
// this controller deals with all functions relating to roles and permissions
// over all objects in the system
//
// =========================================================================

var mongoose   = require ('mongoose');
var Role       = mongoose.model ('_Role');
var Permission = mongoose.model ('_Permission');
var _          = require ('lodash');
var helpers    = require ('../controllers/core.helpers.controller');
var runPromise = helpers.runPromise;

var defaultResource = 'application';
var defaultContext  = 'application';
var defaultRole     = 'public';

// -------------------------------------------------------------------------
//
// helper functions
//
// -------------------------------------------------------------------------
var pluckPermissions = function (a) {
	return _.uniq (_.pluck (a, 'permission'));
};
var pivotPermissions = function (a) {
	var ret = {};
	a.map (function (p) {
		if (!ret[p.permission]) ret[p.permission] = [];
		if (p.role !== null) ret[p.permission].push (p.role);
	});
	return ret;
};
var expandPermissions = function (p) {
	var ps = [];
	_.each (p.permissions, function (permission) {
		_.each (p.roles, function (role) {
			ps.push ({
				resource   : p.resource,
				permission : permission,
				role       : role
			});
		});
	});
	return ps;
};
var pluckRoles = function (a) {
	return _.uniq (a.map (function (r) {
		return r.context + ':' + r.role;
	}));
};
var pivotRoles = function (a) {
	var ret = {};
	a.map (function (p) {
		if (!ret[p.role]) ret[p.role] = [];
		if (p.user !== null) ret[p.role].push (p.user);
	});
	return ret;
};
var expandRoles = function (p) {
	var ps = [];
	_.each (p.roles, function (role) {
		_.each (p.users, function (user) {
			ps.push ({
				context : p.context,
				role    : role,
				user    : user
			});
		});
	});
	return ps;
};

// -------------------------------------------------------------------------
//
// wrap the find in a proper promise for both types. Always returns an array
//
// -------------------------------------------------------------------------
var findPermissions = function (q) {
	return new Promise (function (resolve, reject) {
		Permission.find (q).then (resolve, reject);
	});
};
var findRoles = function (q) {
	return new Promise (function (resolve, reject) {
		Role.find (q).then (resolve, reject);
	});
};
// -------------------------------------------------------------------------
//
// pass in a new thing and then make it and save it
//
// -------------------------------------------------------------------------
var createPermission = function (p) {
	return new Promise (function (resolve, reject) {
		console.log ('creating new permission', p);
		(new Permission (p)).save ().then (resolve, reject);
	});
};
var createRole = function (p) {
	return new Promise (function (resolve, reject) {
		(new Role (p)).save ().then (resolve, reject);
	});
};
// =========================================================================
//
// PERMISSIONS
//
// =========================================================================
// -------------------------------------------------------------------------
//
// Add a permission or role, but ONLY if it does not already exist
//
// -------------------------------------------------------------------------
var addPermission = function (p) {
	return new Promise (function (resolve, reject) {
		if (!p.permission) {
			reject ({ message: 'no permission defined in addPermission' });
		}
		else if (!p.resource) {
			reject ({ message: 'no resource defined in addPermission' });
		}
		else {
			findPermissions (p)
			.then (function (r) {
				// console.log ('returned r', r);
				return !r.length ? createPermission (p) : '';
			})
			.then (resolve, reject);
		}
	});
};
var addPermissions = function (p) {
	p.permissions = p.permissions || [];
	p.roles = p.roles || [];
	return Promise.all (expandPermissions(p).map (function (v) {
		return addPermission (v);
	}));
};
// -------------------------------------------------------------------------
//
// remove a role from a permission for a resource
//
// -------------------------------------------------------------------------
var deletePermission = function (p) {
	return new Promise (function (resolve, reject) {
		if (!p.resource) {
			reject ({message:'no resource defined in deletePermission'});
		}
		else if (!p.permission) {
			reject ({message:'no permission defined in deletePermission'});
		}
		else if (typeof p.role === 'undefined') {
			reject ({message:'no role defined in deletePermission'});
		}
		else {
			Permission.remove (p).exec ().then (resolve, reject);
		}
	});
};
var deletePermissions = function (p) {
	p.permissions = p.permissions || [];
	p.roles = p.roles || [];
	return Promise.all (expandPermissions(p).map (function (v) {
		return deletePermission (v);
	}));
};
// -------------------------------------------------------------------------
//
// Add a permission definition
//
// -------------------------------------------------------------------------
var addPermissionDefinition = function (p) {
	p.role = null;
	return addPermission (p);
};
var addPermissionDefinitions = function (o) {
	o.permissions = o.permissions || [];
	return Promise.all (o.permissions.map (function (permission) {
		return addPermission ({
			resource   : o.resource,
			permission : permission,
			role       : null
		});
	}));
};
// -------------------------------------------------------------------------
//
// remove a permission definition
//
// -------------------------------------------------------------------------
var deletePermissionDefinition = function (p) {
	p.role = null;
	return deletePermission (p);
};
var deletePermissionDefinitions = function (o) {
	o.permissions = o.permissions || [];
	return Promise.all (o.permissions.map (function (permission) {
		return deletePermission ({
			resource   : o.resource,
			permission : permission,
			role       : null
		});
	}));
};
// -------------------------------------------------------------------------
//
// get all rows from permissions for a resource
//
// -------------------------------------------------------------------------
var getPermissionsForResource = function (o) {
	return new Promise (function (resolve, reject) {
		if (!o.resource) {
			reject ({message:'no resource defined in getPermissionsForResource'});
		}
		else {
			findPermissions (o)
			.then (resolve, reject);
		}
	});
};
// -------------------------------------------------------------------------
//
// get a list of all the permission definitions for a resource
//
// -------------------------------------------------------------------------
var getPermissionList = function (o) {
	return new Promise (function (resolve, reject) {
		getPermissionsForResource ({
			resource   : o.resource,
			role       : null
		})
		.then (pluckPermissions)
		.then (resolve, reject);
	});
};
// -------------------------------------------------------------------------
//
// get a list of all the permissions for a resource and all the roles
// attached to them
//
// -------------------------------------------------------------------------
var getPermissionRoles = function (o) {
	return new Promise (function (resolve, reject) {
		getPermissionsForResource ({
			resource   : o.resource
		})
		.then (pivotPermissions)
		.then (resolve, reject);
	});
};
// =========================================================================
//
// ROLES
//
// =========================================================================
// -------------------------------------------------------------------------
//
// Add a role or user, but ONLY if it does not already exist
//
// -------------------------------------------------------------------------
var addRole = function (p) {
	return new Promise (function (resolve, reject) {
		if (!p.role) {
			reject ({ message: 'no role defined in addRole' });
		}
		else if (!p.context) {
			reject ({ message: 'no context defined in addRole' });
		}
		else {
			findRoles (p)
			.then (function (r) {
				// console.log ('returned r', r);
				return !r.length ? createRole (p) : '';
			})
			.then (resolve, reject);
		}
	});
};
var addRoles = function (p) {
	p.roles = p.roles || [];
	p.users = p.users || [];
	return Promise.all (expandRoles(p).map (function (v) {
		return addRole (v);
	}));
};
// -------------------------------------------------------------------------
//
// remove a user from a role for a context
//
// -------------------------------------------------------------------------
var deleteRole = function (p) {
	return new Promise (function (resolve, reject) {
		if (!p.context) {
			reject ({message:'no context defined in deleteRole'});
		}
		else if (!p.role) {
			reject ({message:'no role defined in deleteRole'});
		}
		else if (typeof p.user === 'undefined') {
			reject ({message:'no user defined in deleteRole'});
		}
		else {
			Role.remove (p).exec ().then (resolve, reject);
		}
	});
};
var deleteRoles = function (p) {
	p.roles = p.roles || [];
	p.users = p.users || [];
	return Promise.all (expandRoles(p).map (function (v) {
		return deleteRole (v);
	}));
};
// -------------------------------------------------------------------------
//
// Add a role definition
//
// -------------------------------------------------------------------------
var addRoleDefinition = function (p) {
	p.user = null;
	return addRole (p);
};
var addRoleDefinitions = function (o) {
	o.roles = o.roles || [];
	return Promise.all (o.roles.map (function (role) {
		return addRole ({
			context   : o.context,
			role : role,
			user       : null
		});
	}));
};
// -------------------------------------------------------------------------
//
// remove a role definition
//
// -------------------------------------------------------------------------
var deleteRoleDefinition = function (p) {
	p.user = null;
	return deleteRole (p);
};
var deleteRoleDefinitions = function (o) {
	o.roles = o.roles || [];
	return Promise.all (o.roles.map (function (role) {
		return deleteRole ({
			context   : o.context,
			role : role,
			user       : null
		});
	}));
};
// -------------------------------------------------------------------------
//
// get all rows from roles for a context
//
// -------------------------------------------------------------------------
var getRolesForContext = function (o) {
	return new Promise (function (resolve, reject) {
		if (!o.context) {
			reject ({message:'no context defined in getRolesForContext'});
		}
		else {
			findRoles (o)
			.then (resolve, reject);
		}
	});
};
// -------------------------------------------------------------------------
//
// get a list of all the role definitions for a context
//
// -------------------------------------------------------------------------
var getRoleList = function (o) {
	return new Promise (function (resolve, reject) {
		getRolesForContext ({
			context   : o.context,
			user       : null
		})
		.then (pluckRoles)
		.then (resolve, reject);
	});
};
// -------------------------------------------------------------------------
//
// get a list of all the roles for a context and all the roles
// attached to them
//
// -------------------------------------------------------------------------
var getRoleUsers = function (o) {
	return new Promise (function (resolve, reject) {
		getRolesForContext ({
			context   : o.context
		})
		.then (pivotRoles)
		.then (resolve, reject);
	});
};

// =========================================================================
//
// Working stuff
//
// =========================================================================
// -------------------------------------------------------------------------
//
// list user roles within a specific context
//
// -------------------------------------------------------------------------
var getUserRoles = function (p) {
	console.log (p.user);
	if (p.user) {
		return getRolesForContext (p).then (pluckRoles);
	}
	else {
		return Promise.resolve ([]);
	}
};
// -------------------------------------------------------------------------
//
// more complicated, get the entire set of permissions a user has on a
// resource within a context.
//
// -------------------------------------------------------------------------
var userPermissions = function (p) {
	console.log (p.user);
	return new Promise (function (resolve, reject) {
		var roles;
		if (!p.user) {
			//
			// no one, just public
			//
			roles = Promise.resolve (['public']);
		}
		else {
			//
			// get this context as well as the parent (application)
			//
			roles = findRoles ({
				// $or: [
				// 	{context:defaultResource},
				// 	{context:p.context}
				// ],
				context: {$in : [defaultResource, p.context]},
				user:p.user
			})
			.then (pluckRoles);
		}
		//
		// now that we have the set of roles for the user within this
		// context, we can apply those to the set of permissions for
		// the resource in question
		//
		roles
		.then (function (roleSet) {
			return findPermissions ({
				resource : p.resource,
				role : {$in : roleSet}
			});
		})
		.then (pluckPermissions)
		.then (resolve, reject);
	});
};

exports.routes = {
	addPermission : function (req, res) {
		return runPromise (res, addPermission (req.body));
	},
	addPermissions : function (req, res) {
		return runPromise (res, addPermissions (req.body));
	},
	deletePermission : function (req, res) {
		return runPromise (res, deletePermission (req.body));
	},
	deletePermissions : function (req, res) {
		return runPromise (res, deletePermissions (req.body));
	},
	addPermissionDefinition : function (req, res) {
		return runPromise (res, addPermissionDefinition (req.body));
	},
	addPermissionDefinitions : function (req, res) {
		return runPromise (res, addPermissionDefinitions (req.body));
	},
	deletePermissionDefinition : function (req, res) {
		return runPromise (res, deletePermissionDefinition (req.body));
	},
	deletePermissionDefinitions : function (req, res) {
		return runPromise (res, deletePermissionDefinitions (req.body));
	},
	getPermissionList : function (req, res) {
		return runPromise (res, getPermissionList ({resource:req.params.resource}));
	},
	getPermissionRoles : function (req, res) {
		return runPromise (res, getPermissionRoles ({resource:req.params.resource}));
	},

	addRole : function (req, res) {
		return runPromise (res, addRole (req.body));
	},
	addRoles : function (req, res) {
		return runPromise (res, addRoles (req.body));
	},
	deleteRole : function (req, res) {
		return runPromise (res, deleteRole (req.body));
	},
	deleteRoles : function (req, res) {
		return runPromise (res, deleteRoles (req.body));
	},
	addRoleDefinition : function (req, res) {
		return runPromise (res, addRoleDefinition (req.body));
	},
	addRoleDefinitions : function (req, res) {
		return runPromise (res, addRoleDefinitions (req.body));
	},
	deleteRoleDefinition : function (req, res) {
		return runPromise (res, deleteRoleDefinition (req.body));
	},
	deleteRoleDefinitions : function (req, res) {
		return runPromise (res, deleteRoleDefinitions (req.body));
	},
	getRoleList : function (req, res) {
		return runPromise (res, getRoleList ({context:req.params.context}));
	},
	getRoleUsers : function (req, res) {
		return runPromise (res, getRoleUsers ({context:req.params.context}));
	},

	getUserRoles : function (req, res) {
		return runPromise (res, getUserRoles ({
			user    : req.params.username || (req.user ? req.user.username : undefined),
			context : req.params.context
		}));
	},

	userPermissions : function (req, res) {
		return runPromise (res, userPermissions ({
			user     : req.params.username || (req.user ? req.user.username : undefined) ,
			resource : req.params.resource,
			context  : req.params.context
		}));
	},
};
