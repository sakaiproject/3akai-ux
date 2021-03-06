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

define(['jquery', 'oae.core'], function ($, oae) {

    return function (uid) {

        // The widget container
        var $rootel = $('#' + uid);

        // Variable that keeps track of the discussion profile
        var discussionProfile = null;

        /**
         * Render the edit discussion form and initialize its validation
         */
        var setUpEditDiscussion = function() {
            // Render the form elements
            oae.api.util.template().render($('#editdiscussion-template', $rootel), {
                'discussion': discussionProfile
            }, $('.modal-body', $rootel));

            // Initialize jQuery validate on the form
            var validateOpts = {
                'submitHandler': editDiscussion
            };
            oae.api.util.validation().validate($('#editdiscussion-form', $rootel), validateOpts);
        };

        /**
         * Edit the discussion
         */
        var editDiscussion = function() {
            // Disable the form
            $('#editdiscussion-form *', $rootel).prop('disabled', true);

            var params = {
                'displayName': $.trim($('#editdiscussion-name', $rootel).val()),
                'description': $.trim($('#editdiscussion-topic', $rootel).val())
            };

            oae.api.discussion.updateDiscussion(discussionProfile.id, params, function (err, data) {
                // If the update succeeded, trigger the `oae.editdiscussion.done` event,
                // show a success notification and close the modal
                if (!err) {
                    $('#editdiscussion-modal', $rootel).modal('hide');
                    oae.api.util.notification(
                        oae.api.i18n.translate('__MSG__DISCUSSION_EDITED__', 'editdiscussion'),
                        oae.api.i18n.translate('__MSG__DISCUSSION_EDIT_SUCCESS__', 'editdiscussion'));
                    $(document).trigger('oae.editdiscussion.done', data);
                // If the update failed, enable the form and show an error notification
                } else {
                    oae.api.util.notification(
                        oae.api.i18n.translate('__MSG__DISCUSSION_NOT_EDITED__', 'editdiscussion'),
                        oae.api.i18n.translate('__MSG__DISCUSSION_EDIT_FAIL__', 'editdiscussion'),
                        'error');
                    // Enable the form
                    $('#editdiscussion-form *', $rootel).prop('disabled', false);
                }
            });

            // Avoid default form submit behavior
            return false;
        };

        /**
         * Reset the widget to its original state when the modal dialog is opened and closed.
         * Ideally this would only be necessary when the modal is hidden, but IE10+ fires `input`
         * events while Bootstrap is rendering the modal, and those events can "undo" parts of the
         * reset. Hooking into the `shown` event provides the chance to compensate.
         */
        var setUpReset = function() {
            $('#editdiscussion-modal', $rootel).on('shown.bs.modal hidden.bs.modal', function() {
                // Reset the form
                var $form = $('#editdiscussion-form', $rootel);
                $form[0].reset();
                oae.api.util.validation().clear($form);
                // Enable the form and disable the submit button
                $('#editdiscussion-form *', $rootel).prop('disabled', false);
                $('#editdiscussion-form button[type="submit"]', $rootel).prop('disabled', true);
            });
        };

        /**
         * Initialize the edit discussion modal dialog
         */
        var setUpEditDiscussionModal = function() {
            $(document).on('click', '.oae-trigger-editdiscussion', function() {
                $('#editdiscussion-modal', $rootel).modal({
                    'backdrop': 'static'
                });
                $(document).trigger('oae.context.get', 'editdiscussion');
            });

            $(document).on('oae.context.send.editdiscussion', function(ev, data) {
                discussionProfile = data;
                setUpEditDiscussion();
            });

            // Detect changes in the form and enable the submit button
            $('#editdiscussion-form', $rootel).on(oae.api.util.getFormChangeEventNames(), function() {
                $('#editdiscussion-form button[type="submit"]', $rootel).prop('disabled', false);
            });

            $('#editdiscussion-modal', $rootel).on('shown.bs.modal', function() {
                // Set focus to the discussion topic field
                $('#editdiscussion-name', $rootel).focus();
            });
        };

        setUpReset();
        setUpEditDiscussionModal();

    };
});
