'use strict';

angular.module('activity')
  .controller('controllerActivity', controllerActivity);

// -----------------------------------------------------------------------------------
//
// CONTROLLER: Activity EAO
//
// -----------------------------------------------------------------------------------
controllerActivity.$inject = ['$scope', '$state', '$uibModal', 'sActivity', 'Project'];
/* @ngInject */
function controllerActivity($scope, $state, $uibModal, sActivity, Project) {
  var actBase = this;
  //
  // Get Activity

  Project.getProject({id: $state.params.project}).then( function(res) {
    actBase.project = res.data;
  });

  sActivity.getActivity({id: $state.params.activity}).then(function(res) {
    actBase.activity = res.data;
  });
}
