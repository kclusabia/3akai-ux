/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */
/*global $ */

var sakai = sakai || {};

/**
 * @name sakai.embedcontent
 *
 * @class embedcontent
 *
 * @description
 * Initialize the embedcontent widget
 *
 * @version 0.0.1
 * @param {String} tuid Unique id of the widget
 * @param {Boolean} showSettings Show the settings of the widget or not
 */
sakai.embedcontent = function(tuid, showSettings) {

    var $rootel = $("#" + tuid);

    var $embedcontent_main_container = $("#embedcontent_main_container", $rootel);
    var $embedcontent_page_name = $("#embedcontent_page_name", $rootel);


    // Settings Mode
    var $embedcontent_settings = $("#embedcontent_settings", $rootel);
    var $embedcontent_dont_add = $(".embedcontent_dont_add", $rootel);

    // Choose Content tab selectors
    var $embedcontent_tabs = $("#embedcontent_tabs", $rootel);
    var $embedcontent_search_for_content = $("#embedcontent_search_for_content", $rootel);
    var $embedcontent_just_add = $("#embedcontent_just_add", $rootel);
    var $embedcontent_button_goto_display_settings = $("#embedcontent_button_goto_display_settings", $rootel);
    var $embedcontent_content_input = $("#embedcontent_content_input", $rootel);
    var $fileuploadContainer = $("#fileupload_container", $rootel);
    var $uploadContentLink = $("#upload_content", $rootel);

    // Display Settings tab selectors
    var $embedcontent_alternative_display_name_value = $("#embedcontent_alternative_display_name_value", $rootel);
    var $embedcontent_description_value = $("#embedcontent_description_value", $rootel);
    var $embedcontent_page_name_template = $("#embedcontent_page_name_template", $rootel);
    var $embedcontent_button_add_selected_content = $("#embedcontent_button_add_selected_content", $rootel);
    var $embedcontent_display_previews = $("#embedcontent_display_style div.s3d-highlight_area_background", $rootel);
    var $embedcontent_include_inputs = $("#embedcontent_include input", $rootel);
    var $embedcontent_layout_options = $("#embedcontent_choose_layout div", $rootel);
    var $embedcontent_add_title_description_button = $("#embedcontent_add_title_description_button", $rootel);
    var $embedcontent_add_title_description_fields = $("#embedcontent_add_title_description_fields", $rootel);

    // Display mode
    var $embedcontent_content = $("#embedcontent_content", $rootel);
    var $embedcontent_content_html_template = $("#embedcontent_content_html_template", $rootel);


    var selectedItems = [];
    var firstTime = true;
    var widgetData = false;
    var active_content_class = "tab_content_active",
        tab_id_prefix = "embedcontent_tab_",
        active_tab_class = "fl-tabs-active";

    var embedConfig = {
        "name": "Page",
        "limit": false,
        "filter": false,
        "type": "choose"
    };

    /**
     * Render the embed screen
     */
    var renderSettings = function() {
        selectedItems = [];
        $.TemplateRenderer($embedcontent_page_name_template, {"name": embedConfig.name}, $embedcontent_page_name);
        if (firstTime) {
            setupAutoSuggest();
            sakai.api.Widgets.widgetLoader.insertWidgets("embedcontent_settings", false, "#"+tuid);
            firstTime = false;
        } else {
            doReset();
        }
        $("#as-values-" + tuid).val("");
        $(".as-selection-item").remove();
        if (widgetData && widgetData.items && widgetData.items.length) {
            setCurrentFiles();
        }
    };

    var renderWidget = function() {
        $.TemplateRenderer($embedcontent_content_html_template, widgetData, $embedcontent_content);
        sakai.api.Widgets.widgetLoader.insertWidgets("embedcontent_main_container", false, "#"+tuid);
    };

    /**
     * Do a reset of the embed screen
     */
    var doReset = function() {
        $("#as-values-" + tuid).val("");
        $(".as-selection-item").remove();
        // $embedcontent_alternative_display_name_value.val('');
        //         $embedcontent_description_value.val('');
    };

    var toggleButtons = function(doDisable) {
        var elts = [
            $embedcontent_just_add,
            $embedcontent_button_goto_display_settings
        ];
        $.each(elts, function(i,$elt) {
            if (doDisable) {
                $elt.attr("disabled", "disabled");
            } else {
                $elt.removeAttr("disabled");
            }
        });
    };

    /**
     * Get the mimetype of a provided file
     * @param {Object} file File provided to get mimetype of
     */
    var getMimeType = function(file) {
        var mimetype = "";
        mimetype = file["jcr:content"] ? file["jcr:content"]["jcr:mimeType"] : "";
        return mimetype;
    };

    /**
     * Creates an object out of results provided
     * This object contains valuable information about the file like path, name, type,...
     * @param {Object} result results provided (eg through a search)
     * @param {Object} name optional name provided
     */
    var createDataObject = function(result, name) {
        var mimetype = getMimeType(result);
        var dataObj = {
            "value": name || result['jcr:name'],
            "name": result['sakai:pooled-content-file-name'],
            "type": "file",
            "filetype": mimetype.split("/")[0],
            "mimetype": mimetype,
            "description": result["sakai:description"] || "",
            "path": "/p/" + (name || result['jcr:name']),
            "fileSize": sakai.api.Util.convertToHumanReadableFileSize(result["jcr:content"][":jcr:data"]),
            "link": "/p/" + (name || result['jcr:name']) + "/" + result['sakai:pooled-content-file-name'],
            "extension": result['sakai:fileextension']
        };
        return dataObj;
    };

    /**
     * When typing in the suggest box this function is executed to provide the user with a list of possible autocompletions
     */
    var setupAutoSuggest = function() {
        $embedcontent_content_input.autoSuggest("",{
            source: function(query, add) {
                searchUrl = sakai.config.URL.POOLED_CONTENT_MANAGER;
                sakai.api.Server.loadJSON(searchUrl.replace(".json", ""), function(success, data){
                    if (success) {
                        var suggestions = [];
                        $.each(data.results, function(i) {
                            var dataObj = createDataObject(data.results[i]);
                            var doAdd = true;
                            if (embedConfig.filter) {
                                if (dataObj.filetype !== embedConfig.filter) {
                                    doAdd = false;
                                }
                            }
                            if (doAdd) {
                                suggestions.push(dataObj);
                            }
                        });
                        add(suggestions);
                    }
                }, {"q": sakai.api.Server.createSearchString(query), "page": 0, "items": 15});
            },
            retrieveLimit: 10,
            asHtmlID: tuid,
            selectedItemProp: "name",
            searchObjProps: "name",
            selectionLimit: embedConfig.limit,
            resultClick: function(data) {
                selectedItems.push(data.attributes);
                showDisplayOptions();
                toggleButtons();
            },
            selectionRemoved: function(elem) {
                removeItemFromSelected(elem.html().split("</a>")[1]); // get filename
                elem.remove();
                if (selectedItems.length === 0) {
                    toggleButtons(true);
                }
            }
        });
    };

    /**
     * Removes a previously selected item from the list of selected items
     * @param {Object} fileName name of the selected item to be removed from the list
     */
    var removeItemFromSelected = function(fileName) {
        var newItems = [];
        $(selectedItems).each(function(i, val) {
           if (val.name !== fileName) {
               newItems.push(val);
           }
        });
        selectedItems = newItems;
    };

    var setCurrentFiles = function() {
        $.each(widgetData.items, function(i,val) {
            selectedItems.push(val);
            $embedcontent_content_input.autoSuggest.add_selected_item(val, val.value);
        });
        $(".as-original input.as-input").val('').focus();
        toggleButtons();
        showDisplayOptions();
        // $embedcontent_alternative_display_name_value.val(widgetData.title);
        // $embedcontent_description_value.val(widgetData.description);
    };

    /**
     * Called when file(s) are selected in the picker advanced widget and need to be added to the list of files that will be embedded.
     * @param {Object} files Array of files selected in the picker advanced widget
     */
    var addChoicesFromPickeradvanced = function(files) {
        var filesPicked = 0;
        $.each(files, function(i,val) {
            filesPicked++;
        });
        // revisit this next conditional -- right now it'll clear out all selections, not just add up to the limit
        if (embedConfig.limit && filesPicked && ($(".as-selection-item").length + filesPicked) > embedConfig.limit) {
            $("#as-values-" + tuid).val('');
            $(".as-selection-item").remove();
        }
        if (filesPicked > 0) {
            toggleButtons();
        }
        $.each(files, function(i,val) {
            var newObj = createDataObject(val, val["jcr:name"]);
            selectedItems.push(newObj);
            $embedcontent_content_input.autoSuggest.add_selected_item(newObj, newObj.value);
        });
        $("input#" + tuid).val('').focus();
    };

    /**
     * Called when newly uploaded files need to be added to the list of files that will be embedded
     * @param {Object} files Array containing a list of files
     */
    var addChoicesFromFileUpload = function(files) {
      $.each(files, function(i,val) {
          $.ajax({
             url: val.url + ".infinity.json",
             success: function(data) {
                 var newObj = createDataObject(data, val.url.split("/p/")[1]);
                 selectedItems.push(newObj);
                 $embedcontent_content_input.autoSuggest.add_selected_item(newObj, newObj.value);
             }
          });
      });
      $("input#" + tuid).val('').focus();
      toggleButtons();
    };

    /**
     * Shows the options the user has for displaying the content
     */
    var showDisplayOptions = function() {
        // $embedcontent_display_options.show();
    };

    /**
     * Once the content has been placed on the page it has to be associated with the group
     * The group is set as a viewer of the content
     * @param {Object} embeddedItems Array of object containing information about the selected items. Only the path variable is used.
     */
    var associatedEmbeddedItemsWithGroup = function(embeddedItems){
        var data = [];
        for (var embeddedItem in embeddedItems) {
            if (embeddedItems.hasOwnProperty(embeddedItem)) {
                var item = {
                    "url": embeddedItems[embeddedItem].path + ".members.json",
                    "method": "POST",
                    "parameters": {
                        ":viewer": sakai.currentgroup.id
                    }
                };
                data[data.length] = item;
            }
        }

        $.ajax({
            url: sakai.config.URL.BATCH,
            traditional: true,
            type: "POST",
            cache: false,
            data: {
                requests: $.toJSON(data)
            }
        });
    };

    var registerVideo = function(videoBatchData){
        $.ajax({
            url: sakai.config.URL.BATCH,
            traditional: true,
            type: "POST",
            cache: false,
            data: {
                requests: $.toJSON(videoBatchData)
            }
        });
    };

    /**
     * Embed the selected content on the page,
     * Call the function that associates the content with this group
     */
    var doEmbed = function() {
        var embedContentHTML = "";
        var objectData = {
            "embedmethod": $embedcontent_display_options_select.find("option:selected").val(),
            "title": $embedcontent_alternative_display_name_value.val(),
            "description": $embedcontent_description_value.val(),
            "items": selectedItems
        };

        var videoBatchData = [];
        for (var i in objectData.items){
            if(objectData.items.hasOwnProperty(i)){
                if(objectData.items[i].filetype === "video"){
                    // Set random ID to the video
                    objectData.items[i].uId = Math.ceil(Math.random() * 999999999);

                    var itemUrl;
                    if (sakai.currentgroup.data.authprofile) {
                        itemUrl = "/~" + sakai.currentgroup.data.authprofile["sakai:group-title"] + "/pages/_widgets/id" + objectData.items[i].uId + "/video";
                    } else {
                        itemUrl = "/~" + sakai.data.me.user.userid + "/pages/_widgets/id" + objectData.items[i].uId + "/video";
                    }

                    // Create batch request data for the video
                    var item = {
                        "url": itemUrl,
                        "method": "POST",
                        "parameters": {
                            "uid": sakai.data.me.user.userid,
                            "source": " ",
                            "URL": sakai.config.SakaiDomain + objectData.items[i].link + objectData.items[i].extension,
                            "selectedvalue": "video_noSource",
                            "isYoutube": false,
                            "isSakaiVideoPlayer": false
                        }
                    };
                    videoBatchData.push(item);
                }
            }
        }

        registerVideo(videoBatchData);

        if (sakai.currentgroup) {
            // Associate embedded items with the group
            associatedEmbeddedItemsWithGroup(selectedItems);
        }

        if ($embedcontent_metadata_container.is(":visible")) {
            var isValid = $embedcontent_metadata.valid();
            if (isValid) {
                saveWidgetData(objectData);
            }
        } else {
            saveWidgetData(objectData);
        }


    };

    var saveWidgetData = function(data) {
        sakai.api.Widgets.saveWidgetData(tuid, data, function() {
            sakai.api.Widgets.Container.informFinish(tuid, "embedcontent");
        });
    };

    var getWidgetData = function(callback) {
        sakai.api.Widgets.loadWidgetData(tuid, function(success, data) {
            if (success) {
                widgetData = data;
            }

            if ($.isFunction(callback)) {
                callback();
            }
        });
    };

    // Bind Events
    $embedcontent_just_add.bind("click", function() {
        doEmbed();
    });

    $embedcontent_dont_add.bind("click", function() {
        sakai.api.Widgets.Container.informFinish(tuid, "embedcontent");
    });

    $uploadContentLink.bind("click", function() {
        $(window).trigger("sakai-fileupload-init");
        return false;
    });

    var toggleTabs = function(target) {
        $("." + active_tab_class).removeClass(active_tab_class);
        $(target).parent("li").addClass(active_tab_class);
        $("." + active_content_class).hide();
        $("#" + $(target).attr("id") + "_content").addClass(active_content_class).show();
    };

    $embedcontent_tabs.find("li a").bind("click", function(e) {
        var tab = $(e.target).attr("id").split(tab_id_prefix)[1];
        if ($(e.target).parent("li").hasClass(active_tab_class)) {
            return false;
        } else {
            toggleTabs(e.target);
        }
        return false;
    });

    /**
     * Bind to a click on the display preview blocks
     * This should place an outline on the img and check the checkbox
     */
    $embedcontent_display_previews.bind("click", function(e) {
        if ($(this).find("input").attr("checked") === "checked") {
            return true;
        } else {
           $("#embedcontent_display_style img.selected", $rootel).removeClass('selected');
           $(this).find("input").attr("checked", "checked");
           $(this).find("img").addClass('selected');
           return true;
        }
    });

    $embedcontent_display_previews.find("a").bind("click", function(e) {
        // trigger the above event handler
        $(e.target).parent("span").parent("div").parent("div").trigger("click");
        return false;
    });

    /**
     * Bind to a change in the include checkboxes
     * This toggles the preview elements
     */
    $embedcontent_include_inputs.bind("change", function(e) {
        var which = $(this).attr("id").split("_")[1];
        if ($(this).attr("checked")) {
            $(".embedcontent_include_" + which).show();
        } else {
            $(".embedcontent_include_" + which).hide();
        }
    });

    $embedcontent_layout_options.bind("click", function(e) {
        if ($(this).find("input").attr("checked") === "checked") {
            return true;
        } else {
           $("#embedcontent_choose_layout img.selected", $rootel).removeClass('selected');
           $(this).find("input").attr("checked", "checked");
           $(this).find("img").addClass('selected');
           return true;
        }
    });

    $embedcontent_add_title_description_button.bind("click", function(e) {
        if ($(this).find("span.down").length > 0) {
            $(this).find("span.down").removeClass("down").addClass("up");
            $embedcontent_add_title_description_fields.show();
        } else {
            $(this).find("span.up").removeClass("up").addClass("down");
            $embedcontent_add_title_description_fields.hide();
        }
    });

    $(window).unbind("sakai-fileupload-complete");
    $(window).bind("sakai-fileupload-complete", function(e, data) {
        var files = data.files;
        addChoicesFromFileUpload(files);
        showDisplayOptions();
    });

    $(window).unbind("sakai-pickeradvanced-finished");
    $(window).bind("sakai-pickeradvanced-finished", function(e, data) {
        addChoicesFromPickeradvanced(data.toAdd);
        showDisplayOptions();
    });

    $(window).unbind("sakai-pickeradvanced-ready");
    $(window).bind("sakai-pickeradvanced-ready", function(e) {
        $embedcontent_search_for_content.bind("click", function() {
            var pickerConfig = {
                "type": "content"
            };
            if (embedConfig.limit) {
                pickerConfig.limit = embedConfig.limit;
            }
            $(window).trigger("sakai-pickeradvanced-init", {"config": pickerConfig});
            return false;
        });
    });

    // $embedcontent_metadata.validate();

    var doInit = function() {
        getWidgetData(function() {
            if (showSettings) {
                if (sakai.sitespages && sakai.sitespages.site_info && sakai.sitespages.site_info._pages && sakai.sitespages.site_info._pages[sakai.sitespages.selectedpage] && sakai.sitespages.site_info._pages[sakai.sitespages.selectedpage]["pageTitle"]) {
                    embedConfig.name = sakai.sitespages.site_info._pages[sakai.sitespages.selectedpage]["pageTitle"];
                } else {
                    embedConfig.name = "";
                }

                renderSettings();
                $embedcontent_settings.show();
            } else {
                $embedcontent_main_container.show();
                renderWidget();
            }
        });
    };

    doInit();
};
sakai.api.Widgets.widgetLoader.informOnLoad("embedcontent");
