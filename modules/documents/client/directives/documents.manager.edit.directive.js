'use strict';
angular.module('documents')
  .directive('documentMgrEdit', ['$rootScope', '$uibModal', '$log', '_', 'moment', function ($rootScope, $uibModal, $log, _, moment) {
    return {
      restrict: 'A',
      scope: {
        project: '=',
        doc: '=',
        onUpdate: '='
      },
      link: function (scope, element) {
        element.on('click', function () {
          $uibModal.open({
            animation: true,
            templateUrl: 'modules/documents/client/views/document-manager-edit.html',
            resolve: {
              obj: function(Document, FolderModel) {
                if (scope.doc._schemaName === "Document") {
                  return Document.getModel(scope.doc._id);
                } else {
                  return FolderModel.lookup(scope.project._id, scope.doc.model.id);
                }
              }
            },
            controllerAs: 'editFileProperties',
            controller: function ($scope, $uibModalInstance, DocumentMgrService, TreeModel, ProjectModel, Document, obj, CodeLists, FolderModel, AlertService) {
              var self = this;
              self.busy = true;

              $scope.project = scope.project;
              $scope.types = CodeLists.documentTypes.active;
              $scope.inspectionReportFollowupTypes = CodeLists.inspectionReportFollowUpTypes.active;

              $scope.dateOptions = {
                showWeeks: false
              };

              $scope.originalName = obj.displayName || obj.documentFileName || obj.internalOriginalName;
              $scope.doc = obj;
              if ($scope.doc._schemaName === "Document") {
                // Only set the filename extension attribute (fn-extension) if there is an extension.
                var parts = $scope.doc.documentFileName.split('.');
                if (parts.length > 1) {
                  var extension = parts.pop();
                  // Make sure this is really a file extension and not part of the name. If not sure,
                  // then leave it in there.
                  if ($scope.doc.documentFileFormat) {
                    if ($scope.doc.documentFileFormat === extension) {
                      $scope.extension = extension;
                    }
                  } else if ($scope.doc.internalExt) {
                    if ($scope.doc.internalExt === ("." + extension)) {
                      $scope.extension = extension;
                    }
                  }
                }
              }
              // any dates going to the datepicker need to be javascript Date objects...
              $scope.doc.documentDate = _.isEmpty(obj.documentDate) ? null : moment(obj.documentDate).toDate();
              $scope.datePicker = {
                opened: false
              };
              $scope.dateOpen = function() {
                $scope.datePicker.opened = true;
              };
              $scope.doc.dateUploaded = _.isEmpty(obj.dateUploaded) ? moment.now() : moment(obj.dateUploaded).toDate();
              $scope.dateUploadedPicker = {
                opened: false
              };
              $scope.dateUploadedOpen = function() {
                $scope.dateUploadedPicker.opened = true;
              };

              $scope.$watch('doc.documentType',
                function (data) {
                  if (data) {
                    switch(data) {
                    case 'Inspection Report':
                      if (!$scope.doc.inspectionReport) {
                        $scope.doc.inspectionReport = { inspectorInitials: null, followup: null };
                      }
                      break;
                    case 'Certificate':
                      if (!$scope.doc.certificate) {
                        $scope.doc.certificate = {};
                      }
                      break;
                    case 'Certificate Amendment':
                      if (!$scope.doc.certificateAmendment) {
                        $scope.doc.certificateAmendment = {};
                      }
                      break;
                    default:
                      break;
                    }
                  }
                }
              );

              $scope.validate = function() {
                $scope.$broadcast('show-errors-check-validity', 'editFileForm');
              };

              self.canEdit = $scope.doc.userCan.write;

              self.cancel = function () {
                $uibModalInstance.dismiss('cancel');
              };

              self.validationMessage = '';

              self.save = function (isValid) {
                // static copy of new name for validation message
                self.newname = $scope.doc.displayName;
                self.busy = true;
                // should be valid here...
                if (isValid) {
                  if ($scope.doc._schemaName === "Document") {
                    Document.save($scope.doc)
                      .then(function (result) {
                      // somewhere here we need to tell document manager to refresh it's document...
                        if (scope.onUpdate) {
                          scope.onUpdate(result);
                        }
                        self.busy = false;
                        $uibModalInstance.close(result);
                      }, function(/* error */) {
                        self.busy = false;
                      });
                  } else {
                    // Check if the foldername already exists.
                    FolderModel.lookupForProjectIn($scope.project._id, $scope.doc.parentID)
                      .then(function (fs) {
                        if ($scope.originalName === $scope.doc.displayName) {
                        // Skip if we detect the user didn't change the name.
                          return FolderModel.save($scope.doc);
                        } else {
                          self.repeat = null;
                          _.each(fs, function (foldersInDirectory) {
                            if (foldersInDirectory.displayName.toLowerCase() === $scope.doc.displayName.toLowerCase()) {
                              self.repeat = true;
                              return false;
                            }
                          });
                          if (self.repeat) {
                            self.validationMessage = 'Enter a unique name for this folder.';
                            self.busy = false;
                            // refresh scope to apply validation message
                            $scope.$apply();
                            return null;
                          } else {
                            self.validationMessage = '';
                            return FolderModel.save($scope.doc);
                          }
                        }
                      })
                      .then(function (result) {
                        if (result) {
                          DocumentMgrService.renameDirectory($scope.project, scope.doc, $scope.doc.displayName)
                            .then(function (result) {
                              // somewhere here we need to tell document manager to refresh it's document...
                              if (scope.onUpdate) {
                                scope.onUpdate(result);
                              }
                              self.busy = false;
                              $uibModalInstance.close(result);
                            }, function (/* err */) {
                              AlertService.error("Could not rename folder");
                            });
                        }
                      }, function(/* error */) {
                        self.busy = false;
                      });
                  }
                }
              };
              self.busy = false;
            }
          });
        });
      }
    };
  }]);

