(function($) {

    $.fn.dataGrid = function(options) {

        var gridDefaults = {
            pageOption: undefined,
            columns: [],
            data: [],
            allowReorderColumns: false,
            sortColumn: undefined,
            sortField: undefined,
            sortAsc: true,
            onCellClicked: undefined,
            onRowClicked: undefined,
            onRowDblClicked: undefined
        };

        var columnDefaults = {
            id: undefined,
            title: '',
            field: undefined,
            width: 100,
            sortable: false,
            dataType: 'text'
        };
        var pageDefaults = {
            pageItemCount: 10,
            currentPage: 1
        };
        var settings = $.extend(gridDefaults, options);
        var dataCache = $.extend([], settings.data);
        var columnsCache = $.extend([], settings.columns);

        var pageOption;
        if (settings.pageOption)
            pageOption = $.extend({}, pageDefaults, settings.pageOption);
        var sortLib = {
            number: {
                cmp: function(a, b) {
                    a = a[settings.sortField], b = b[settings.sortField];
                    if (typeof a === 'string') {
                        a = (a + '').replace(',', '');
                        a = formatFloat(a);
                    }
                    if (typeof b === 'string') {
                        b = (b + '').replace(',', '');
                        b = formatFloat(b);
                    }
                    return (settings.sortAsc) ? a - b : b - a;
                }
            },
            text: {
                cmp: function(a, b) {
                    var aValue, bValue;
                    if (!a || !a[settings.sortField])
                        aValue = '';
                    else
                        aValue = a[settings.sortField] + '';
                    if (!b || !b[settings.sortField])
                        bValue = '';
                    else
                        bValue = b[settings.sortField] + '';
                    a = $.trim(aValue.toLowerCase());
                    b = $.trim(bValue.toLowerCase());
                    return (settings.sortAsc) ? natCaseSort(a, b) : natCaseSort(b, a);
                }
            }
        };
        // http://my.opera.com/GreyWyvern/blog/show.dml/1671288
        function natCaseSort(a, b) {
            function chunkify(t) {
                var tz = [], x = 0, y = -1, n = 0, i, j;
                while (i = (j = t.charAt(x++)).charCodeAt(0)) {
                    var m = (i == 46 || (i >= 48 && i <= 57));
                    if (m !== n) {
                        tz[++y] = "";
                        n = m;
                    }
                    tz[y] += j;
                }
                return tz;
            }

            var aa = (a) ? chunkify(a.toLowerCase()) : [];
            var bb = (b) ? chunkify(b.toLowerCase()) : [];
            for (x = 0; aa[x] && bb[x]; x++) {
                if (aa[x] !== bb[x]) {
                    var c = Number(aa[x]), d = Number(bb[x]);
                    if (c == aa[x] && d == bb[x]) {
                        return c - d;
                    }
                    else
                        return (aa[x] > bb[x]) ? 1 : -1;
                }
            }
            return aa.length - bb.length;
        }


        var _this = this;
        var tableDiv;
        var headerDiv;
        var dataDiv;
        var dataContentDiv;
        var dataContentPartDiv;

        this.refresh = function() {
            tableDiv = $('<div class="data-grid"></div>').appendTo(this);
            headerDiv = $('<div class="data-grid-headers"></div>').appendTo(tableDiv);
            dataDiv = $('<div class="data-grid-data"></div>').appendTo(tableDiv);
            _this.refreshHeader();
            _this.refreshData();
        };

        this.refreshHeader = function() {
            headerDiv.html('');
            var columnInfos = [];
            for (var columnIdx in columnsCache) {
                var column = columnsCache[columnIdx];
                var columnInfo = $.extend({}, columnDefaults, column);
                columnInfos.push(columnInfo);
                var columnHeaderDiv = $('<div class="data-grid-header"></div>').appendTo(headerDiv);
                $('<div class="data-grid-header-title">' + columnInfo.title + '</div>').appendTo(columnHeaderDiv);
                columnHeaderDiv.data('column-id', columnInfo.id);
                columnHeaderDiv.width(columnInfo.width);
                if (columnInfo.sortable || settings.allowReorderColumns) {
                    columnHeaderDiv.addClass('data-grid-header-special');
                }

                //For Sorting
                $(columnHeaderDiv).click(function() {
                    var columnId = $(this).data('column-id');
                    var columns = columnsCache.filter(function(column) {
                        return column.id === columnId && column.sortable;
                    });
                    if (columns.length === 0)
                        return;
                    $('.data-grid-sort').remove();
                    var sortDiv = $('<div class="data-grid-sort"></div>').appendTo(this);
                    $('.data-grid-header-sort').removeClass('data-grid-header-sort');
                    $(this).addClass('data-grid-header-sort');
                    for (var sortColumnIdx in columns) {
                        var sortColumn = columns[sortColumnIdx];
                        if (sortColumn.id === settings.sortColumn) {
                            settings.sortAsc = !settings.sortAsc;
                        } else {
                            settings.sortColumn = sortColumn.id;
                            settings.sortField = sortColumn.field;
                            settings.sortAsc = true;
                        }
                        if (!settings.sortAsc)
                            sortDiv.append('&#x25BC;');
                        else
                            sortDiv.append('&#x25B2;');
                        _this.sortData(sortColumn.id);
                    }
                    $(dataDiv).scrollTop(0);
                });
            }
            columnsCache = $.extend([], columnInfos);
            //For Header Reorder
            $(headerDiv).sortable({
                tolerance: 'pointer',
                axis: 'x',
                helper: 'clone',
                update: function(event, ui) {
                    var prev = ui.item.prev('.data-grid-header');
                    var next = ui.item.next('.data-grid-header');
                    var columnReorderIdx;
                    for (var columnIdx in columnsCache) {
                        if (columnsCache[columnIdx].id === ui.item.data('column-id')) {
                            columnReorderIdx = columnIdx;
                            break;
                        }
                    }
                    columnsCache.splice($('.data-grid-header').index(ui.item), 0, columnsCache.splice(columnReorderIdx, 1)[0]);
                    tableDiv.find('.data-grid-cell').filter(function(index) {
                        return $(this).data('column-id') === ui.item.data('column-id');
                    }).each(function() {
                        var cellDiv = $(this);
                        if (prev.data('column-id')) {
                            $(this).siblings('.data-grid-cell').filter(function(index) {
                                return $(this).data('column-id') === prev.data('column-id');
                            }).each(function() {
                                $(cellDiv).insertAfter($(this));
                            });
                        } else {
                            $(this).siblings('.data-grid-cell').filter(function(index) {
                                return $(this).data('column-id') === next.data('column-id');
                            }).each(function() {
                                $(cellDiv).insertBefore($(this));
                            });
                        }
                    });
                }
            });
            $(headerDiv).disableSelection();
            //$(headerDiv).width($(_this).innerWidth());
        };

        this.drawDataItem = function(itemIdx) {
            var item = dataCache[itemIdx];
            var columnDataRowDiv = $('<div class="data-grid-row"></div>').appendTo(dataContentPartDiv);
            columnDataRowDiv.data('row', itemIdx);
            for (var columnInfoIdx in columnsCache) {
                var columnInfo = columnsCache[columnInfoIdx];
                var cellDiv = $('<div class="data-grid-cell"></div>').appendTo(columnDataRowDiv);
                cellDiv.data('column-id', columnInfo.id);
                cellDiv.data('column', columnInfoIdx);
                cellDiv.data('row', itemIdx);
                if (columnInfo.field) {
                    cellDiv.html(item[columnInfo.field]);
                    cellDiv.data('value', item[columnInfo.field]);
                    cellDiv.width(columnInfo.width);
                }
                //Hook Cell events

                cellDiv.click(function(e) {
                    $('.data-grid-cell-selected').removeClass('data-grid-cell-selected');
                    $(this).addClass('data-grid-cell-selected');
                    if (settings.onCellClicked) {
                        settings.onCellClicked($(this).data('value'), parseInt(cellDiv.data('row')), parseInt(cellDiv.data('column')));
                    }
                });

                if (settings.onCellDblClicked) {
                    cellDiv.dblclick(function(e) {
                        settings.onCellDblClicked($(this).data('value'), parseInt(cellDiv.data('row')), parseInt(cellDiv.data('column')));
                    });
                }
            }

            //Hook Row evets

            columnDataRowDiv.click(function(e) {
                $('.data-grid-row-selected').removeClass('data-grid-row-selected');
                $(this).addClass('data-grid-row-selected');
                if (settings.onRowClicked) {
                    settings.onRowClicked(dataCache[parseInt(cellDiv.data('row'))], parseInt(cellDiv.data('row')));
                }
            });

            if (settings.onRowDblClicked) {
                columnDataRowDiv.dblclick(function(e) {
                    settings.onRowDblClicked(dataCache[parseInt(cellDiv.data('row'))], parseInt(cellDiv.data('row')));
                });
            }

            if (itemIdx % 2 === 0) {
                columnDataRowDiv.addClass('data-grid-row-odd');
            } else {
                columnDataRowDiv.addClass('data-grid-row-even');
            }

            return columnDataRowDiv;
        };

        this.refreshDataItems = function(scrollTop) {
            $(dataContentDiv).html('');
            if (dataCache.length === 0)
                return;
            dataContentPartDiv = $('<div class="data-grid-view-data"></div>').appendTo(dataContentDiv);
            var firstItem = _this.drawDataItem(0);
            $(dataContentDiv).innerHeight($(firstItem).outerHeight() * dataCache.length);
            $(dataContentPartDiv).outerHeight($(dataDiv).outerHeight());
            $(dataContentPartDiv).css('top', parseInt(scrollTop / $(firstItem).outerHeight()) * $(firstItem).outerHeight());
            var noOfRows = Math.round($(dataContentPartDiv).innerHeight() / $(firstItem).outerHeight()) + 1;
            if (scrollTop !== 0) {
                var firstIdx = parseInt(scrollTop / $(firstItem).outerHeight());
                for (var dataIdx = firstIdx; dataIdx < noOfRows + firstIdx && dataIdx < dataCache.length; dataIdx++) {
                    _this.drawDataItem(dataIdx);
                }
                $(firstItem).remove();
            } else {
                for (var dataIdx = 1; dataIdx < noOfRows; dataIdx++) {
                    _this.drawDataItem(dataIdx);
                }
            }
        };

        this.refreshData = function() {
            dataDiv.html('');
            var timer;
            $(dataDiv).scroll(function() {
                clearTimeout(timer);
                timer = setTimeout(function() {
                    _this.refreshDataItems($(dataDiv).scrollTop());
                }, 100);

            });
            $(dataDiv).height($(_this).innerHeight() - $(headerDiv).outerHeight());
            //$(dataDiv).width($(_this).innerWidth());
            dataContentDiv = $('<div class="data-grid-content"></div>').appendTo(dataDiv);
            _this.refreshDataItems($(dataDiv).scrollTop());
        };

        this.sortData = function(columnId) {
            for (var columnIdx in columnsCache) {
                var column = columnsCache[columnIdx];
                if (column.id === columnId) {
                    var sortFunction = sortLib.text.cmp;
                    switch (column.dataType) {
                        case 'number':
                            sortFunction = sortLib.number.cmp;
                            break;
                        default:
                            sortFunction = sortLib.text.cmp;
                    }
                    dataCache.sort(sortFunction);
                    break;
                }
            }
            _this.refreshDataItems($(dataContentDiv).scrollTop());
        };

        return this.each(function() {
            _this.refresh();
        });
    };

}(jQuery));