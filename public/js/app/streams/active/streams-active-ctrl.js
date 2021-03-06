webuiApp.controller('streamsActiveCtrl', ['$uibModal', '$scope', '$http', '$timeout', '$window', '$base64', '$route', '$routeParams', '$location', function ($uibModal, $scope, $http, $timeout, $window, $base64, $route, $routeParams, $location) {

    //Select the Tab
    $scope.activeTab = '/active';

    //Select the Inbound Stream Table
    $scope.streamTypeSelected = 'inbound';
    $scope.bsTableControlPageSize = 0;
    $scope.bsTableControlPageNumber = 0;


    var vm = this;

    vm.disabled = false;
    vm.searchEnabled = true;

    /*
     * Dropdown
     */
    $scope.streamTypeList = [
        {
            value: "inbound",
            text: "Inbound Streams ",
            description: "“inbound” will refer to any stream coming into the EMS"
        },
        {
            value: "outbound",
            text: "Outbound Streams ",
            description: "“outbound” will refer to any stream leaving the EMS"
        },
        {
            value: "http",
            text: "Adaptive HTTP Streams",
            description: "existing HTTP streaming technologies, such as HLS, DASH, MSS, HDS"
        }
    ];

    $scope.streamType = {
        "list": $scope.streamTypeList,
        "default": {
            selected: {
                value: "inbound",
                text: "Inbound Streams ",
                description: "“inbound” will refer to any stream coming into the EMS"
            }
        },
    };

    /*
     * List the Stream and Build Table
     */

    //Initialize the stream information for the table
    $scope.streamData = {
        inbound: {
            columnCollection: [
                {field: 'streamId', sortable: true, title: 'Stream ID'},
                {field: 'streamFormat', sortable: true, title: 'Stream Format'},
                {field: 'localStreamName', sortable: true, title: 'LocalStreamName'},
                {field: 'sourceURI', sortable: true, title: 'Source URI'},
                {field: 'audioCodec', sortable: true, title: 'Audio Codec'},
                {field: 'videoCodec', sortable: true, title: 'Video Codec'},
                {
                    field: 'operate',
                    title: 'Actions',
                    align: 'center',
                    width: '180',
                    clickToSelect: false,
                    formatter: actionFormatter,
                    events: {
                        'click .info': function (e, value, row, index) {
                            $scope.infoModal(row);
                        },
                        'click .delete': function (e, value, row, index) {
                            $scope.deleteModal(row);
                        },
                        'click .play': function (e, value, row, index) {
                            $scope.playNewWindow(row);
                        }
                    }
                }
            ]
        },
        outbound: {
            columnCollection: [
                {field: 'streamId', sortable: true, title: 'Stream ID'},
                {field: 'streamFormat', sortable: true, title: 'Stream Format'},
                {field: 'sourceStreamName', sortable: true, title: 'Source Stream Name'},
                {field: 'farIp', sortable: true, title: 'Destination IP'},
                {field: 'audioCodec', sortable: true, title: 'Audio Codec'},
                {field: 'videoCodec', sortable: true, title: 'Video Codec'},
                {
                    field: 'operate',
                    title: 'Actions',
                    align: 'center',
                    width: '180',
                    clickToSelect: false,
                    formatter: actionFormatter,
                    events: {
                        'click .info': function (e, value, row, index) {
                            $scope.infoModal(row);
                        },
                        'click .delete': function (e, value, row, index) {
                            $scope.deleteModal(row);
                        }
                    }
                }
            ]
        },
        http: {
            columnCollection: [
                {field: 'streamId', sortable: true, title: 'Stream ID'},
                {field: 'streamFormat', sortable: true, title: 'Stream Format'},
                {field: 'sourceStreamName', sortable: true, title: 'Source Stream Name'},
                {field: 'groupName', sortable: true, title: 'Group Name'},
                {field: 'audioCodec', sortable: true, title: 'Audio Codec'},
                {field: 'videoCodec', sortable: true, title: 'Video Codec'},
                {
                    field: 'operate',
                    title: 'Actions',
                    align: 'center',
                    width: '180',
                    clickToSelect: false,
                    formatter: actionFormatter,
                    events: {
                        'click .info': function (e, value, row, index) {
                            $scope.infoModal(row);

                        },
                        'click .delete': function (e, value, row, index) {
                            $scope.deleteModal(row);
                        },
                        'click .play': function (e, value, row, index) {
                            $scope.playNewWindow(row);
                        }
                    }
                }
            ]
        }
    };

    $scope.streamData.inbound.rowCollection = [];
    $scope.streamData.outbound.rowCollection = [];
    $scope.streamData.http.rowCollection = [];

    var streamsActiveCtrlSocket = io.connect($location.protocol() + '://' + $location.host() + ':' + $location.port());

    streamsActiveCtrlSocket.on('startListstreamsMap', function (response) {

        //Get from socket.io
        $scope.streamData.inbound.rowCollection = response.inbound.rowCollection;
        $scope.streamData.outbound.rowCollection = response.outbound.rowCollection;
        $scope.streamData.http.rowCollection = response.http.rowCollection;


        listStreams($scope.streamTypeSelected);
        $scope.$apply();

    });




    streamsActiveCtrlSocket.on('updateListstreamsMap', function (response) {

        //Get from socket.io
        $scope.streamData.inbound.rowCollection = response.inbound.rowCollection;
        $scope.streamData.outbound.rowCollection = response.outbound.rowCollection;
        $scope.streamData.http.rowCollection = response.http.rowCollection;


        listStreams($scope.streamTypeSelected);
        $scope.$apply();

    });

    //Load using routeParameters
    if ($routeParams.streamTypeSelected != null) {

        if ($routeParams.streamTypeSelected == 'inbound') {
            $scope.streamTypeSelected = $routeParams.streamTypeSelected;
            $scope.streamType.default = {
                selected: $scope.streamTypeList[0]
            };
        } else if ($routeParams.streamTypeSelected == 'outbound') {
            $scope.streamTypeSelected = $routeParams.streamTypeSelected;
            $scope.streamType.default = {
                selected: $scope.streamTypeList[1]
            };
        } else if ($routeParams.streamTypeSelected == 'http') {
            $scope.streamTypeSelected = $routeParams.streamTypeSelected;
            $scope.streamType.default = {
                selected: $scope.streamTypeList[2]
            };
        }

        listStreams($routeParams.streamTypeSelected);


    } else {
        //Load Default Inbound Stream Table
        listStreams($scope.streamTypeSelected);
    }

    $scope.selectedStreamType = function () {

        $scope.streamTypeSelected = $scope.streamType.default.selected.value;
        listStreams($scope.streamType.default.selected.value);

    };


    function listStreams(streamTypeSelected) {

        var bsTableData = null;

        if (streamTypeSelected == 'inbound') {
            bsTableData = $scope.streamData.inbound;
        } else if (streamTypeSelected == 'outbound') {
            bsTableData = $scope.streamData.outbound;
        } else if (streamTypeSelected == 'http') {
            bsTableData = $scope.streamData.http;
        }

        var pageSize = 5;
        var pageNumber = 1;

        if ($scope.bsTableControl) {
            if (typeof $scope.bsTableControl.state !== 'undefined') {
                if (typeof $scope.bsTableControl.state.pageSize !== 'undefined') {

                    pageSize = $scope.bsTableControl.state.pageSize;
                    pageNumber = $scope.bsTableControl.state.pageNumber;

                    $scope.bsTableControlPageSize = pageSize;
                    $scope.bsTableControlPageNumber = pageNumber;
                }

                if ($scope.bsTableControlPageSize != 0) {
                    pageSize = $scope.bsTableControlPageSize;
                    pageNumber = $scope.bsTableControlPageNumber;
                }
            }
        } else {
            pageSize = 5;
            pageNumber = 1;
        }

        //Set to bsTable
        $scope.bsTableControl = {
            options: {
                data: bsTableData.rowCollection,
                rowStyle: function (row, index) {
                    return {classes: 'none'};
                },
                cache: false,
                height: 600,
                striped: true,
                pagination: true,
                pageSize: pageSize,
                pageNumber: pageNumber,
                pageList: [5, 10, 25, 50, 100, 200],
                savePages: true,
                search: true,
                showColumns: false,
                showRefresh: false,
                minimumCountColumns: 2,
                clickToSelect: false,
                showToggle: false,
                maintainSelected: true,
                dataSortOrder: "desc",
                columns: bsTableData.columnCollection
            }
        };

    }

    function actionFormatter(value, row, index) {

        var actionFormatterValue = [
            '<a class="info ml10" href="javascript:void(0)"  title="Details">',
            '<i class="glyphicon glyphicon-info-sign"></i>',
            '</a>',
            '<a class="play ml10"  href="javascript:void(0)"  title="Play">',
            '<i class="glyphicon glyphicon-play"></i>',
            '</a>',
            '<a class="delete ml10" href="javascript:void(0)"  title="Delete">',
            '<i class="glyphicon glyphicon-trash"></i>',
            '</a>',
        ].join('&nbsp;&nbsp;');

        if ($scope.streamTypeSelected == 'outbound') {
            actionFormatterValue = [
                '<a class="info ml10" href="javascript:void(0)"  title="Details">',
                '<i class="glyphicon glyphicon-info-sign"></i>',
                '</a>',
                '<a class="delete ml10" href="javascript:void(0)"  title="Delete">',
                '<i class="glyphicon glyphicon-trash"></i>',
                '</a>',
            ].join('&nbsp;&nbsp;');
        }

        if ($scope.streamTypeSelected == 'file') {
            actionFormatterValue = [
                '<a class="info ml10" href="javascript:void(0)"  title="Details">',
                '<i class="glyphicon glyphicon-info-sign"></i>',
                '</a>',
                '<a class="play ml10"  href="javascript:void(0)"  title="Play">',
                '<i class="glyphicon glyphicon-play"></i>',
                '</a>',
            ].join('&nbsp;&nbsp;');
        }

        return actionFormatterValue;
    }

    $scope.infoModal = function (row) {

        var uniqueid = row.streamId;

        //get stream info using unique id
        $http.get("/ems/api/getstreaminfo?uniqueid=" + uniqueid).then(function (response) {

            var listStreamsData = response.data.data;

            var streamType = $scope.streamType.default.selected.value;

            var modalInstance = $uibModal.open({
                templateUrl: 'js/app/streams/active/modals/info-streams-active.html',
                controller: 'activeInfoModalCtrl',
                size: 'lg',
                resolve: {
                    streamRowHeaders: function () {

                        var streamRowHeaders = {};

                        if (streamType != 'file') {
                            for (var i in row) {
                                if ((row.audioCodec == row[i]) || (row.videoCodec == row[i])) {
                                    continue;
                                } else {
                                    streamRowHeaders[i] = row[i];
                                }
                            }
                        }


                        return streamRowHeaders;
                    },
                    streamRow: function () {

                        var streamRowTemp = listStreamsData;

                        return streamRowTemp;
                    },
                    streamRowAudio: function () {

                        var streamRowAudio = [];

                        streamRowAudio.header = 'Audio';
                        streamRowAudio.content = listStreamsData.audio;

                        return streamRowAudio;
                    },
                    streamRowVideo: function () {

                        var streamRowVideo = [];
                        streamRowVideo.header = 'Video';
                        streamRowVideo.content = listStreamsData.video;

                        return streamRowVideo;

                    },
                    streamRowSettings: function () {

                        var streamRowTemp = listStreamsData;
                        var streamRowSettings = [];
                        streamRowSettings.content = [];

                        if (streamRowTemp.hasOwnProperty('pullSettings')) {
                            streamRowSettings.header = 'pullSettings';
                        } else if (streamRowTemp.hasOwnProperty('pushSettings')) {
                            streamRowSettings.header = 'pushSettings';
                        } else if (streamRowTemp.hasOwnProperty('hlsSettings')) {
                            streamRowSettings.header = 'hlsSettings';
                        } else if (streamRowTemp.hasOwnProperty('hdsSettings')) {
                            streamRowSettings.header = 'hdsSettings';
                        } else if (streamRowTemp.hasOwnProperty('dashSettings')) {
                            streamRowSettings.header = 'dashSettings';
                        } else if (streamRowTemp.hasOwnProperty('mssSettings')) {
                            streamRowSettings.header = 'mssSettings';
                        }

                        streamRowSettings.content = streamRowTemp[streamRowSettings.header];

                        for (var i in streamRowSettings.content) {
                            if (i.charAt(0) == '_') {
                                streamRowSettings.content[i] = null;
                                delete streamRowSettings.content[i];
                            }
                        }

                        return streamRowSettings;
                    }
                }
            });

            modalInstance.result.then(function (selectedItem) {
                $route.reload();
            }, function () {

            });

        });

    };

    $scope.deleteModal = function (row) {

        var uniqueid = row.streamId;

        //get stream info using unique id
        $http.get("/ems/api/getstreaminfo?uniqueid=" + uniqueid).then(function (response) {

            var listStreamsData = response.data.data;
            
            var modalInstance = $uibModal.open({
                templateUrl: 'js/app/streams/active/modals/delete-streams-active.html',
                controller: 'activeConfirmDeleteModalCtrl',
                resolve: {
                    uniqueId: function () {

                        var uniqueId = row.streamId;

                        return uniqueId;
                    },
                    configId: function () {

                        var streamRowTemp = listStreamsData;
                        var configId = 0;

                        if (streamRowTemp.hasOwnProperty('pullSettings')) {
                            configId = streamRowTemp.pullSettings.configId;
                        } else if (streamRowTemp.hasOwnProperty('pushSettings')) {
                            configId = streamRowTemp.pushSettings.configId;
                        } else if (streamRowTemp.hasOwnProperty('hlsSettings')) {
                            configId = streamRowTemp.hlsSettings.configId;
                        } else if (streamRowTemp.hasOwnProperty('hdsSettings')) {
                            configId = streamRowTemp.hdsSettings.configId;
                        } else if (streamRowTemp.hasOwnProperty('dashSettings')) {
                            configId = streamRowTemp.dashSettings.configId;
                        } else if (streamRowTemp.hasOwnProperty('mssSettings')) {
                            configId = streamRowTemp.mssSettings.configId;
                        }

                        $scope.deleteConfigId = configId;

                        return configId;
                    },
                    deleteMessage: function () {

                        var streamRowTemp = listStreamsData;
                        var deleteMessage = '';

                        if (streamRowTemp.hasOwnProperty('pullSettings')) {
                            deleteMessage = 'stream ' + streamRowTemp.pullSettings.localStreamName;
                        } else if (streamRowTemp.hasOwnProperty('pushSettings')) {
                            deleteMessage = 'stream ' + streamRowTemp.pushSettings.localStreamName;
                        } else if (streamRowTemp.hasOwnProperty('hlsSettings')) {
                            deleteMessage = 'groupname ' + streamRowTemp.hlsSettings.groupName;
                        } else if (streamRowTemp.hasOwnProperty('hdsSettings')) {
                            deleteMessage = 'groupname ' + streamRowTemp.hdsSettings.groupName;
                        } else if (streamRowTemp.hasOwnProperty('dashSettings')) {
                            deleteMessage = 'groupname ' + streamRowTemp.dashSettings.groupName;
                        } else if (streamRowTemp.hasOwnProperty('mssSettings')) {
                            deleteMessage = 'groupname ' + streamRowTemp.mssSettings.groupName;
                        } else{
                            deleteMessage = 'stream with id ' +uniqueid;
                        }

                        $scope.deleteMessage = deleteMessage;

                        return deleteMessage;
                    }
                }
            });

            modalInstance.result.then(function (result) {

            }, function () {

            });

        });
    };


    $scope.playNewWindow = function (row) {
        var info = $base64.encode(JSON.stringify(row));

        $window.open("/streams/play?info=" + info, 'windowOpenTab' + info, 'scrollbars=0,resizable=0,width=800,height=630,left=0,top=0');
    };


}]);


webuiApp.controller('activeConfirmDeleteModalCtrl', ['$scope', '$uibModalInstance', '$http', 'uniqueId', 'configId', 'deleteMessage', function ($scope, $uibModalInstance, $http, uniqueId, configId, deleteMessage) {

    $scope.deleteConfigId = configId;
    $scope.deleteUniqueId = uniqueId;
    $scope.confirmDeleteMessage = deleteMessage;

    $scope.deleteMessage = deleteMessage;

    $scope.delete = function () {


        if(configId > 0){
            $http.get("/ems/api/removeconfig?configid=" + configId).then(function (response) {

                $uibModalInstance.close();

            });
        }else{
            $http.get("/ems/api/shutdownstream?uniqueid=" + uniqueId).then(function (response) {

                $uibModalInstance.close();

            });
        }


    };

    $scope.cancel = function () {

        $uibModalInstance.dismiss('cancel');
    };

}]);


webuiApp.controller('activeInfoModalCtrl', ['$scope', '$uibModal', '$uibModalInstance', '$window', 'streamRowHeaders', 'streamRow', 'streamRowAudio', 'streamRowVideo', 'streamRowSettings', '$base64', function ($scope, $uibModal, $uibModalInstance, $window, streamRowHeaders, streamRow, streamRowAudio, streamRowVideo, streamRowSettings, $base64) {

    $scope.streamRowNoArray = [];
    $scope.streamRowNoArray.content = {};

    for (var i in streamRow) {
        if ((streamRow.audio == streamRow[i]) || (streamRow.video == streamRow[i]) || (streamRow[streamRowSettings.header] == streamRow[i])) {
            continue;
        } else {
            $scope.streamRowNoArray['content'][i] = streamRow[i];
        }
    }

    $scope.streamRowHeaders = streamRowHeaders;
    $scope.streamRowAudio = streamRowAudio;
    $scope.streamRowVideo = streamRowVideo;
    $scope.streamRowSettings = streamRowSettings;

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.play = function ($event) {
        var info = $base64.encode(JSON.stringify($scope.streamRowHeaders));

        $event.preventDefault();

        $window.open("/streams/play?info=" + info, 'windowOpenTab' + info, 'scrollbars=yes,resizable=0,width=800,height=630,left=0,top=0');

    };

    $scope.delete = function () {

        var modalInstance = $uibModal.open({
            templateUrl: 'js/app/streams/active/modals/delete-streams-active.html',
            controller: 'activeConfirmDeleteModalCtrl',
            resolve: {
                configId: function () {

                    var streamRowTemp = streamRow;
                    var configId = null;

                    if (streamRowTemp.hasOwnProperty('pullSettings')) {
                        configId = streamRowTemp.pullSettings.configId;
                    } else if (streamRowTemp.hasOwnProperty('pushSettings')) {
                        configId = streamRowTemp.pushSettings.configId;
                    } else if (streamRowTemp.hasOwnProperty('hlsSettings')) {
                        configId = streamRowTemp.hlsSettings.configId;
                    } else if (streamRowTemp.hasOwnProperty('hdsSettings')) {
                        configId = streamRowTemp.hdsSettings.configId;
                    } else if (streamRowTemp.hasOwnProperty('dashSettings')) {
                        configId = streamRowTemp.dashSettings.configId;
                    } else if (streamRowTemp.hasOwnProperty('mssSettings')) {
                        configId = streamRowTemp.mssSettings.configId;
                    }

                    return configId;
                },
                deleteMessage: function () {

                    var streamRowTemp = streamRow;
                    var deleteMessage = '';

                    if (streamRowTemp.hasOwnProperty('pullSettings')) {
                        deleteMessage = 'stream ' + streamRowTemp.pullSettings.localStreamName;
                    } else if (streamRowTemp.hasOwnProperty('pushSettings')) {
                        deleteMessage = 'stream ' + streamRowTemp.pushSettings.localStreamName;
                    } else if (streamRowTemp.hasOwnProperty('hlsSettings')) {
                        deleteMessage = 'groupname ' + streamRowTemp.hlsSettings.groupName;
                    } else if (streamRowTemp.hasOwnProperty('hdsSettings')) {
                        deleteMessage = 'groupname ' + streamRowTemp.hdsSettings.groupName;
                    } else if (streamRowTemp.hasOwnProperty('dashSettings')) {
                        deleteMessage = 'groupname ' + streamRowTemp.dashSettings.groupName;
                    } else if (streamRowTemp.hasOwnProperty('mssSettings')) {
                        deleteMessage = 'groupname ' + streamRowTemp.mssSettings.groupName;
                    }

                    $scope.deleteMessage = deleteMessage;

                    return deleteMessage;
                }
            }
        });

        modalInstance.result.then(function (result) {
            $uibModalInstance.close();
        }, function () {

        });

    };

}]);