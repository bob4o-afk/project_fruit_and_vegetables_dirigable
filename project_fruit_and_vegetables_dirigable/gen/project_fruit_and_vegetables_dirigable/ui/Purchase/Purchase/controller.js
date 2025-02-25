angular.module('page', ["ideUI", "ideView", "entityApi"])
	.config(["messageHubProvider", function (messageHubProvider) {
		messageHubProvider.eventIdPrefix = 'project_fruit_and_vegetables_dirigable.Purchase.Purchase';
	}])
	.config(["entityApiProvider", function (entityApiProvider) {
		entityApiProvider.baseUrl = "/services/ts/project_fruit_and_vegetables_dirigable/gen/project_fruit_and_vegetables_dirigable/api/Purchase/PurchaseService.ts";
	}])
	.controller('PageController', ['$scope', '$http', 'messageHub', 'entityApi', 'Extensions', function ($scope, $http, messageHub, entityApi, Extensions) {

		$scope.dataPage = 1;
		$scope.dataCount = 0;
		$scope.dataOffset = 0;
		$scope.dataLimit = 10;
		$scope.action = "select";

		//-----------------Custom Actions-------------------//
		Extensions.get('dialogWindow', 'project_fruit_and_vegetables_dirigable-custom-action').then(function (response) {
			$scope.pageActions = response.filter(e => e.perspective === "Purchase" && e.view === "Purchase" && (e.type === "page" || e.type === undefined));
		});

		$scope.triggerPageAction = function (action) {
			messageHub.showDialogWindow(
				action.id,
				{},
				null,
				true,
				action
			);
		};
		//-----------------Custom Actions-------------------//

		function refreshData() {
			$scope.dataReset = true;
			$scope.dataPage--;
		}

		function resetPagination() {
			$scope.dataReset = true;
			$scope.dataPage = 1;
			$scope.dataCount = 0;
			$scope.dataLimit = 10;
		}

		//-----------------Events-------------------//
		messageHub.onDidReceiveMessage("clearDetails", function (msg) {
			$scope.$apply(function () {
				$scope.selectedEntity = null;
				$scope.action = "select";
			});
		});

		messageHub.onDidReceiveMessage("entityCreated", function (msg) {
			refreshData();
			$scope.loadPage($scope.dataPage, $scope.filter);
		});

		messageHub.onDidReceiveMessage("entityUpdated", function (msg) {
			refreshData();
			$scope.loadPage($scope.dataPage, $scope.filter);
		});

		messageHub.onDidReceiveMessage("entitySearch", function (msg) {
			resetPagination();
			$scope.filter = msg.data.filter;
			$scope.filterEntity = msg.data.entity;
			$scope.loadPage($scope.dataPage, $scope.filter);
		});
		//-----------------Events-------------------//

		$scope.loadPage = function (pageNumber, filter) {
			if (!filter && $scope.filter) {
				filter = $scope.filter;
			}
			if (!filter) {
				filter = {};
			}
			$scope.selectedEntity = null;
			entityApi.count(filter).then(function (response) {
				if (response.status != 200) {
					messageHub.showAlertError("Purchase", `Unable to count Purchase: '${response.message}'`);
					return;
				}
				if (response.data) {
					$scope.dataCount = response.data;
				}
				$scope.dataPages = Math.ceil($scope.dataCount / $scope.dataLimit);
				filter.$offset = ($scope.dataPage - 1) * $scope.dataLimit;
				filter.$limit = $scope.dataLimit;
				if ($scope.dataReset) {
					filter.$offset = 0;
					filter.$limit = $scope.dataPage * $scope.dataLimit;
				}

				entityApi.search(filter).then(function (response) {
					if (response.status != 200) {
						messageHub.showAlertError("Purchase", `Unable to list/filter Purchase: '${response.message}'`);
						return;
					}
					if ($scope.data == null || $scope.dataReset) {
						$scope.data = [];
						$scope.dataReset = false;
					}

					response.data.forEach(e => {
						if (e.Date) {
							e.Date = new Date(e.Date);
						}
					});

					$scope.data = $scope.data.concat(response.data);
					$scope.dataPage++;
				});
			});
		};
		$scope.loadPage($scope.dataPage, $scope.filter);

		$scope.selectEntity = function (entity) {
			$scope.selectedEntity = entity;
			messageHub.postMessage("entitySelected", {
				entity: entity,
				selectedMainEntityId: entity.Id,
				optionsCurrency: $scope.optionsCurrency,
				optionsCustomer: $scope.optionsCustomer,
				optionsEmployee: $scope.optionsEmployee,
				optionsItemInStore: $scope.optionsItemInStore,
				optionsPurchaseStatus: $scope.optionsPurchaseStatus,
			});
		};

		$scope.createEntity = function () {
			$scope.selectedEntity = null;
			$scope.action = "create";

			messageHub.postMessage("createEntity", {
				entity: {},
				optionsCurrency: $scope.optionsCurrency,
				optionsCustomer: $scope.optionsCustomer,
				optionsEmployee: $scope.optionsEmployee,
				optionsItemInStore: $scope.optionsItemInStore,
				optionsPurchaseStatus: $scope.optionsPurchaseStatus,
			});
		};

		$scope.updateEntity = function () {
			$scope.action = "update";
			messageHub.postMessage("updateEntity", {
				entity: $scope.selectedEntity,
				optionsCurrency: $scope.optionsCurrency,
				optionsCustomer: $scope.optionsCustomer,
				optionsEmployee: $scope.optionsEmployee,
				optionsItemInStore: $scope.optionsItemInStore,
				optionsPurchaseStatus: $scope.optionsPurchaseStatus,
			});
		};

		$scope.deleteEntity = function () {
			let id = $scope.selectedEntity.Id;
			messageHub.showDialogAsync(
				'Delete Purchase?',
				`Are you sure you want to delete Purchase? This action cannot be undone.`,
				[{
					id: "delete-btn-yes",
					type: "emphasized",
					label: "Yes",
				},
				{
					id: "delete-btn-no",
					type: "normal",
					label: "No",
				}],
			).then(function (msg) {
				if (msg.data === "delete-btn-yes") {
					entityApi.delete(id).then(function (response) {
						if (response.status != 204) {
							messageHub.showAlertError("Purchase", `Unable to delete Purchase: '${response.message}'`);
							return;
						}
						refreshData();
						$scope.loadPage($scope.dataPage, $scope.filter);
						messageHub.postMessage("clearDetails");
					});
				}
			});
		};

		$scope.openFilter = function (entity) {
			messageHub.showDialogWindow("Purchase-filter", {
				entity: $scope.filterEntity,
				optionsCurrency: $scope.optionsCurrency,
				optionsCustomer: $scope.optionsCustomer,
				optionsEmployee: $scope.optionsEmployee,
				optionsItemInStore: $scope.optionsItemInStore,
				optionsPurchaseStatus: $scope.optionsPurchaseStatus,
			});
		};

		//----------------Dropdowns-----------------//
		$scope.optionsCurrency = [];
		$scope.optionsCustomer = [];
		$scope.optionsEmployee = [];
		$scope.optionsItemInStore = [];
		$scope.optionsPurchaseStatus = [];


		$http.get("/services/ts/codbex-currencies/gen/codbex-currencies/api/Currencies/CurrencyService.ts").then(function (response) {
			$scope.optionsCurrency = response.data.map(e => {
				return {
					value: e.Id,
					text: e.Code
				}
			});
		});

		$http.get("/services/ts/codbex-partners/gen/codbex-partners/api/Customers/CustomerService.ts").then(function (response) {
			$scope.optionsCustomer = response.data.map(e => {
				return {
					value: e.Id,
					text: e.Name
				}
			});
		});

		$http.get("/services/ts/codbex-employees/gen/codbex-employees/api/Employees/EmployeeService.ts").then(function (response) {
			$scope.optionsEmployee = response.data.map(e => {
				return {
					value: e.Id,
					text: e.FirstName
				}
			});
		});

		$http.get("/services/ts/project_fruit_and_vegetables_dirigable/gen/project_fruit_and_vegetables_dirigable/api/Item/ItemInStoreService.ts").then(function (response) {
			$scope.optionsItemInStore = response.data.map(e => {
				return {
					value: e.Id,
					text: e.Name
				}
			});
		});

		$http.get("/services/ts/project_fruit_and_vegetables_dirigable/gen/project_fruit_and_vegetables_dirigable/api/Settings/PurchaseStatusService.ts").then(function (response) {
			$scope.optionsPurchaseStatus = response.data.map(e => {
				return {
					value: e.Id,
					text: e.Name
				}
			});
		});

		$scope.optionsCurrencyValue = function (optionKey) {
			for (let i = 0; i < $scope.optionsCurrency.length; i++) {
				if ($scope.optionsCurrency[i].value === optionKey) {
					return $scope.optionsCurrency[i].text;
				}
			}
			return null;
		};
		$scope.optionsCustomerValue = function (optionKey) {
			for (let i = 0; i < $scope.optionsCustomer.length; i++) {
				if ($scope.optionsCustomer[i].value === optionKey) {
					return $scope.optionsCustomer[i].text;
				}
			}
			return null;
		};
		$scope.optionsEmployeeValue = function (optionKey) {
			for (let i = 0; i < $scope.optionsEmployee.length; i++) {
				if ($scope.optionsEmployee[i].value === optionKey) {
					return $scope.optionsEmployee[i].text;
				}
			}
			return null;
		};
		$scope.optionsItemInStoreValue = function (optionKey) {
			for (let i = 0; i < $scope.optionsItemInStore.length; i++) {
				if ($scope.optionsItemInStore[i].value === optionKey) {
					return $scope.optionsItemInStore[i].text;
				}
			}
			return null;
		};
		$scope.optionsPurchaseStatusValue = function (optionKey) {
			for (let i = 0; i < $scope.optionsPurchaseStatus.length; i++) {
				if ($scope.optionsPurchaseStatus[i].value === optionKey) {
					return $scope.optionsPurchaseStatus[i].text;
				}
			}
			return null;
		};
		//----------------Dropdowns-----------------//

	}]);
