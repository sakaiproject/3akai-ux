/*!
 * Copyright 2018 Apereo Foundation (AF) Licensed under the
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

define(['jquery', 'oae.core'], function($, oae) {
  // When this widget is loaded, the content profile object representing the collaborative spreadsheet
  // that needs to be rendered will be passed in as the widgetData
  return function(uid, showSettings, contentObj) {
    // The widget container
    const $rootel = $('#' + uid);

    /**
     * When the current user is a manager of the collaborative spreadsheet, we join the sheet. This
     * returns a URL that can be used to create the iFrame that will contain the Ethercalc UI.
     */
    const showEditMode = function() {
      $.ajax({
        url: '/api/content/' + contentObj.id + '/join',
        type: 'POST',
        success(data) {
          // We construct an iFrame with the provided URL
          oae.api.util.template().render($('#ethercalc-template', $rootel), data, $('#ethercalc-container', $rootel));
        },
        error() {
          oae.api.util.notification(
            oae.api.i18n.translate('__MSG__CANNOT_EDIT__', 'ethercalc'),
            oae.api.i18n.translate('__MSG__CANNOT_EDIT_THIS_SPREADSHEET__', 'ethercalc'),
            'error'
          );
        }
      });
    };

    /**
     * When the current user is not a manager of the collaborative spreadsheet, we show the spreadsheet's
     * latest published content in view mode.
     */
    const showViewMode = function() {
      const ethercalcHTML = contentObj.latestRevision.ethercalcHtml || '';

      // The Ethercalc content is rendered in view mode. If the sheet is empty, a default message will
      // be shown
      oae.api.util.template().render(
        $('#ethercalc-view-mode-template', $rootel),
        {
          ethercalcHTML,
          isBlank: oae.api.util.isBlank(ethercalcHTML)
        },
        $('#ethercalc-container', $rootel)
      );
    };

    /**
     * Remove the Ethercalc iFrame from the DOM
     */
    const removeEthercalc = function() {
      $('#ethercalc-editor', $rootel).remove();
    };

    /**
     * Set up the Ethercalc widget. Managers of the sheet will be shown the Ethercalc UI (edit mode) and
     * viewers of the sheet will be shown the sheet's content in view mode.
     */
    const setUpEthercalc = function() {
      if (contentObj.isManager || contentObj.isEditor) {
        showEditMode();

        $(window).on('beforeunload', removeEthercalc);
      } else {
        showViewMode();
      }
    };

    setUpEthercalc();
  };
});
