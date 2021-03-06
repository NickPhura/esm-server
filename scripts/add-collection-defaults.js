'use strict';

var MongoClient = require('mongodb').MongoClient;
var Promise     = require('promise');

var defaultConnectionString = 'mongodb://localhost:27017/mean-dev';
var username                = '';
var password                = '';
var host                    = '';
var db                      = '';
var url                     = '';

var args = process.argv.slice(2);
if (args.length !== 4) {
	console.log('Using default localhost connection:', defaultConnectionString);
	url = defaultConnectionString;
} else {
	username = args[0];
	password = args[1];
	host     = args[2];
	db       = args[3];
	url      = 'mongodb://' + username + ':' + password + '@' + host + ':27017/' + db;
}

var insertDefaults = function(docs) {
	return new Promise(function(resolve, reject) {
		MongoClient.connect(url, function(err, db) {

			var collection = db.collection('_defaults');

			collection.insertMany(docs, {}, function(err, result) {
				db.close();
				if (err) {
					reject(err);
				} else {
					console.log('inserted ' + result.insertedCount + ' document(s) into _defaults');
					resolve(result);
				}
			});

		});
	});
};

var run = function() {
	return new Promise(function (resolve, reject) {
		console.log('start');
		Promise.resolve()
			.then(function() {
				console.log('1 - add collection and collectiondocument to default permissions');
				var roles = {
					'project-system-admin' : ['assessment-ceaa', 'proponent-lead', 'proponent-team', 'assessment-admin', 'project-eao-staff', 'project-intake', 'assessment-lead', 'assessment-team', 'assistant-dm', 'project-epd', 'assistant-dmo', 'associate-dm', 'minister', 'minister-office', 'associate-dmo', 'project-qa-officer', 'compliance-lead', 'compliance-officer', 'aboriginal-group', 'project-working-group', 'project-technical-working-group', 'project-participant', 'project-system-admin', 'public'],
				};
				var permissions = {
					'read'      : ['assessment-admin', 'project-intake', 'assessment-lead', 'assessment-team', 'assistant-dm', 'project-epd', 'assistant-dmo', 'associate-dm', 'associate-dmo', 'compliance-lead', 'compliance-officer', 'project-system-admin'],
					'write'     : ['assessment-admin', 'project-system-admin'],
					'delete'    : ['assessment-admin', 'project-system-admin'],
					'publish'   : ['assessment-admin', 'project-system-admin'],
					'unPublish' : ['assessment-admin', 'project-system-admin']
				};
				var entries = [{
					context: 'project',
					resource: 'collection',
					level: 'global',
					type: 'default-permissions',
					defaults: {
						roles: roles,
						permissions: permissions
					}
				}, {
					context: 'project',
					resource: 'collectiondocument',
					level: 'global',
					type: 'default-permissions',
					defaults: {
						roles: roles,
						permissions: permissions
					}
				}];
				return insertDefaults(entries);
			})
			.then(function(data) {
				console.log('end');
				resolve(':)');
			}, function(err) {
				console.log('ERROR: end');
				console.log('ERROR: end err = ', JSON.stringify(err));
				reject(err);
			});
	});
};


run().then(function(success) {
	console.log('success ', success);
	process.exit();
}).catch(function(error) {
	console.error('error ', error);
	process.exit();
});
