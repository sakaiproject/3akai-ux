/*!
 * Copyright 2014 Apereo Foundation (AF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

define(['jquery', 'oae.core', 'jquery.spectrum'], function($, oae) {

    return function(uid, showSettings, widgetData) {

        // The widget container
        var $rootel = $('#' + uid);

        // Variable that will cache the default skin for the current tenant
        var defaultSkin = {};

        // Variable that will cache the current skin values
        var activeSkin = {};

        /**
         * Save the new skin values. The back-end requires us to send all skin values
         * that are different than the default values
         *
         * @param  {Object}      nonDefaultValues    Object of skin values that override default skin values. e.g., `{institutional-logo-url: "'/shared/oae/img/oae-logo.png'"}`
         * @param  {Function}    callback            Standard callback function
         * @param  {Object}      callback.err        Error object containing error code and error message
         */
        var saveSkin = function(nonDefaultValues, callback) {
            // Return straight away when no overrides have been provided
            if (_.keys(nonDefaultValues).length === 0) {
                return callback();
            }

            var data = {};
            // Create the JSON object to be sent to the server containing all non-default values
            $.each(nonDefaultValues, function(changedProperty, change) {
                data['oae-ui/skin/variables/' + changedProperty] = change;
            });

            var url = '/api/config';
            // Append the tenant alias when we're not on the tenant server itself
            if (widgetData.context.isTenantOnGlobalAdminServer) {
                url += '/' + widgetData.context.alias;
            }

            // Save the skin values
            $.ajax({
                'url': url,
                'type': 'POST',
                'data': data,
                'success': function() {
                    callback();
                },
                'error': function(jqXHR, textStatus) {
                    callback({'code': jqXHR.status, 'msg': jqXHR.responseText});
                }
            });
        };

        /**
         * Revert all skin values that have been reverted/changed back to the default skin value
         *
         * @param  {String[]}    revertedValues    Array of skin values to be reverted to the default
         * @param  {Function}    callback          Standard callback function
         * @param  {Object}      callback.err      Error object containing error code and error message
         */
        var revertSkin = function(revertedValues, callback) {
            // Return straight away when no reverted values have been provided
            if (revertedValues.length === 0) {
                return callback();
            }

            var data = [];
            // Create the JSON object to be sent to the server containing all values to reset
            $.each(revertedValues, function(propertyIndex, property) {
                data.push('oae-ui/skin/variables/' + property);
            });

            // When we are on the tenant server itself, we don't need
            // to add the tenant alias to the endpoint
            var url = '/api/config/clear';
            if (widgetData.context.isTenantOnGlobalAdminServer) {
                url = '/api/config/' + widgetData.context.alias + '/clear';
            }

            // Revert the skin values
            $.ajax({
                'url': url,
                'type': 'POST',
                'data': {
                    'configFields': data
                },
                'success': function() {
                    callback();
                },
                'error': function(jqXHR, textStatus) {
                    callback({'code': jqXHR.status, 'msg': jqXHR.responseText});
                }
            });
        };

        /**
         * Update active skin values to match the entered values
         */
        var refreshActiveSkin = function() {
            $('#skinning-form input').each(function(index, input) {
                activeSkin[$(input).attr('name')] = $.trim($(input).val());
            });
        };

        /**
         * Compare the selected skin values against the default skin and return the changed values only.
         * @return {Object}  changedValues                     The skinning values that have been changed or reverted
         * @return {Object}  changedValues.nonDefaultValues    The skinning values that have been changed (i.e. are different to the default skin)
         * @return {Object}  changedValues.revertedValues      The skinning values that should be reverted to the default skin values
         */
        var getSkinChanges = function() {
            var nonDefaultValues = {};
            var revertedValues = [];

            // Loop over the form input fields to see which values need to be stored or reverted
            $('#skinning-form input').each(function(index, input) {

                // Get the ID and data type of the skin element
                var name = $(input).attr('name');
                var type = $(input).attr('data-type');

                // Get the default, active, and new values
                var defaultValue = defaultSkin[name];
                var activeValue = activeSkin[name];
                var newValue = $.trim($(input).val());

                // If the field is a color, match as colors
                if (type === 'color') {
                    // If the color is different to the default skin color, its name and
                    // current value are added to the non-default list
                    if (!tinycolor.equals(newValue, defaultValue)) {
                        nonDefaultValues[name] = newValue;
                    // If the user changed a non-default color back to the default
                    // value, its name is added to the reverted list
                    } else if (!tinycolor.equals(activeValue, defaultValue)) {
                        revertedValues.push(name);
                    }
                // The only other choice is an input field, handle as string
                } else {
                    // If the value is different to the default value, its name and current
                    // value are added to the non-default list
                    if (newValue !== defaultValue) {
                        nonDefaultValues[name] = newValue;
                    // If the user changed a non-default value back to the default
                    // value, its name is added to the reverted list
                    } else if (activeValue !== defaultValue) {
                        revertedValues.push(name);
                    }
                }
            });

            // Returns the object of skin values to be saved and reverted
            return {
                'nonDefaultValues': nonDefaultValues,
                'revertedValues': revertedValues
            };
        };

        /**
         * Persist the new skin. All values that override default skin values will be saved as the
         * skin overrides. All values that have been reverted back to the default value will be reverted.
         */
        var applySkinChanges = function() {
            // Retrieve the skin changes
            var skinChanges = getSkinChanges();

            // Save the skin overrides
            saveSkin(skinChanges.nonDefaultValues, function(saveSkinErr) {
                // Revert the reverted skin values
                revertSkin(skinChanges.revertedValues, function(revertSkinErr) {
                    // Show a success/error notification and update state
                    if (saveSkinErr || revertSkinErr) {
                        oae.api.util.notification(
                            oae.api.i18n.translate('__MSG__SKIN_NOT_SAVED__', 'skinning'),
                            oae.api.i18n.translate('__MSG__SKIN_COULD_NOT_BE_SAVED__', 'skinning'),
                            'error');
                    } else {
                        refreshActiveSkin();
                        oae.api.util.notification(
                            oae.api.i18n.translate('__MSG__SKIN_SAVED__', 'skinning'),
                            oae.api.i18n.translate('__MSG__SKIN_SUCCESSFULLY_SAVED__', 'skinning'));
                    }
                });
            });

            // Return false to avoid default form submit behavior
            return false;
        };

        /**
         * Revert a skin value back to its original value as defined in the
         * base LESS file. Therefore, this will not necessarily revert the
         * value back to its previous value.
         */
        var revertSkinValue = function() {
            var $input = $('input', $(this).parents('.form-group'));
            var defaultValue = defaultSkin[$input.attr('name')];
            // If the variable is a color, we use the set method provided by jQuery spectrum
            if ($input.attr('data-type') === 'color') {
                $input.spectrum('set', defaultValue);
            } else {
                $input.val(defaultValue);
            }
        };

        /**
         * Initialize the list of available skinning variables and their values
         */
        var loadSkin = function() {
            $.ajax({
                'url': '/api/ui/skin/variables',
                'data': {
                    'tenant': widgetData.context.alias
                },
                'success': function(data) {
                    // The stored skin values for the current tenant can be found in the configuration
                    // object. This will be stored as a stringified JSON object, so we need to parse this first
                    var configuredSkin = {};
                    if (widgetData.configuration['oae-ui'].skin.variables) {
                        configuredSkin = widgetData.configuration['oae-ui'].skin.variables;
                    }

                    // For all of the values in the available skin variables, we check if the current tenant
                    // has a stored value that overrides the default value. If the tenant doesn't have a value
                    // for a variable, the default value will be used
                    $.each(data.results, function(configSectionIndex, configSection) {
                        $.each(configSection.subsections, function(configSubsectionIndex, configSubsection) {
                            $.each(configSubsection.variables, function(variableIndex, variable) {
                                variable.value = configuredSkin[variable.name] || variable.defaultValue;
                                defaultSkin[variable.name] = variable.defaultValue;
                                activeSkin[variable.name] = variable.value;
                            });
                        });
                    });

                    // Render the editable skin values
                    oae.api.util.template().render($('#skinning-template', $rootel), data, $('#skinning-container', $rootel));

                    // Initialize the jQuery.spectrum color pickers
                    $('[data-type="color"]').spectrum({
                        'preferredFormat': 'rgb',
                        'showAlpha': true,
                        'showButtons': false,
                        'showInitial': true,
                        'showInput': true
                    });
                }
            });
        };

        var uploadLogo = function(e) {
            e.preventDefault();

            // Get the extension of the selected file and match it against supported types
            var extension = $('#skinning-logo-upload')[0].files[0].name.split('.').pop();
            var validType = extension.match(/(gif|jpe?g|png)$/i);

            // If no valid image type has been submitted, show a notification
            if (!validType) {
                oae.api.util.notification(
                    oae.api.i18n.translate('__MSG__INVALID_LOGO__', 'skinning'),
                    oae.api.i18n.translate('__MSG__SELECT_A_VALID_LOGO__', 'skinning'),
                    'error'
                );
            } else {
                var formData = new FormData(this);
                formData.append('tenant', widgetData.context.alias);
                $.ajax({
                    'url': '/api/ui/skin/logo',
                    'data': formData,
                    'type': 'POST',
                    'processData': false,
                    'contentType': false,
                    'success': function(data) {
                        saveSkin({'institutional-logo-url': '\''+ data.url +'\''}, function(err) {
                            if (err) {
                                oae.api.util.notification(
                                    oae.api.i18n.translate('__MSG__SKIN_NOT_SAVED__', 'skinning'),
                                    oae.api.i18n.translate('__MSG__SKIN_COULD_NOT_BE_SAVED__', 'skinning'),
                                    'error');
                            } else {
                                oae.api.util.notification(
                                    oae.api.i18n.translate('__MSG__SKIN_SAVED__', 'skinning'),
                                    oae.api.i18n.translate('__MSG__SKIN_SUCCESSFULLY_SAVED__', 'skinning'));
                                loadSkin();
                            }
                        });
                    }
                });
            }
        };

        /**
         * Add event binding for the skinning related functionality
         */
        var addBinding = function() {
            // Revert skin value
            $rootel.on('click', '.skinning-revert', revertSkinValue);
            // Change skin
            $rootel.on('submit', '#skinning-form', applySkinChanges);
            // Upload logo
            $rootel.on('submit', '#logo-upload-form', uploadLogo);
        };

        addBinding();
        loadSkin();
    };
});
