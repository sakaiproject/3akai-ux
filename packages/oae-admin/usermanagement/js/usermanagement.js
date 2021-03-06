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

define(['jquery', 'oae.core', 'underscore'], function($, oae, _) {

    return function(uid, showSettings, widgetData) {

        // The widget container
        var $rootel = $('#' + uid);

        // Variable that will be used to keep track of the current infinite scroll instance
        var infinityScroll = false;

        // Variable that will be used to keep track of how many total search results there are
        var totalUsers = null;

        /**
         * Set up the list header for the user list
         */
        var setUpListHeader = function() {
            oae.api.util.template().render($('#usermanagement-list-header-template', $rootel), null, $('#usermanagement-list-header', $rootel));
        };

        /**
         * Initialize a new infinite scroll container that fetches the users in the tenant.
         * This will detect when a search is happening and will change the endpoint accordingly.
         */
        var getUserList = function() {
            // Disable the previous infinite scroll
            if (infinityScroll) {
                infinityScroll.kill();
            }

            // Detect whether or not we need to do a search by checking if
            // the History.js state has a query parameter
            var query = History.getState().data.query;
            $('.oae-list-header-search-query', $rootel).val(query);

            // Set up the list actions
            var initialContent = null;
            if (!query) {
                initialContent = oae.api.util.template().render($('#usermanagement-list-actions-template', $rootel), {
                    'context': widgetData.context
                });
            }

            // Set up the infinite scroll
            infinityScroll = $('.oae-list', $rootel).infiniteScroll('/api/search/general', {
                'limit': 12,
                'scope': widgetData.context.alias,
                'q': query,
                'resourceTypes': 'user'
            }, '#usermanagement-list-template', {
                'initialContent': initialContent,
                'postProcessor': function(data) {
                    // Let the template know whether or not the current list
                    // is a main list or a search list, as different paging
                    // keys need to be provided for each
                    data.query = query;
                    data.displayOptions = {
                        'addLink': false
                    };
                    return data;
                },
                'postRenderer': function(data) {
                    // If it was a partial update, then there will be no `data.total` and the total
                    // number of items should not change
                    if (_.isNumber(data.total)) {
                        totalUsers = data.total;
                        updateTotalUsers();
                    }
                },
                'emptyListProcessor': function() {
                    oae.api.util.template().render($('#usermanagement-noresults-template', $rootel), {
                        'query': query
                    }, $('.oae-list', $rootel));
                }
            });
        };

        /**
         * Update the total number of results in the list header
         */
        var updateTotalUsers = function() {
            var l10nTotalUsers = oae.api.l10n.transformNumber(totalUsers);
            $('.oae-list-header-badge', $rootel).text(l10nTotalUsers).show();
        };

        /**
         * Prepend created/updated users to the list. It is not possible to just reload the list to
         * see the latest changes, as search is used to populate the user list. There's no guarantee
         * that the new/updated user will be indexed by the time we reload the list
         *
         * @param  {User}   updateResult    The user to add or update in the search list
         */
        var updateUserList = function(user) {
            // Prepend new users to the user result list while updating existing entries in place
            infinityScroll.prependItems({'results': [user]}, true);
        };

        /**
         * Add the different event bindings
         */
        var addBinding = function() {
            // Listen to History.js state changes and refresh the user list when searches happen
            $(window).on('statechange', getUserList);

            // Listen to the `oae.createuser.done` event to refresh the user list after a new user
            // has been created
            $(document).on('oae.createuser.done', function(ev, createdUser) {
                updateUserList(createdUser);
            });

            // Listen to the `oae.manageuser.done` event to refresh the user list after a user has
            // been updated or deleted
            $(document).on('oae.manageuser.done', function(ev, updateResult) {
                if (updateResult.updated) {
                    // When a user is updated, we update their entry in the user list
                    updateUserList(updateResult.updated);
                } else if (updateResult.deleted) {
                    // When a user is deleted, we remove them from the user list
                    infinityScroll.removeItems(updateResult.deleted.id);
                    totalUsers--;
                    updateTotalUsers();
                }
            });

            // Trigger the create user dialog and pass the context data to it
            $rootel.on('click', '#usermanagement-createuser', function() {
                $(document).trigger('oae.trigger.createuser', widgetData);
            });

            // Trigger the import users dialog and pass the context data to it
            $rootel.on('click', '#usermanagement-importusers', function() {
                $(document).trigger('oae.trigger.importusers', widgetData);
            });

            // Trigger the manageuser widget when a list item (that is not a list actions container)
            // is clicked
            $rootel.on('click', '.oae-list-container > ul > li:not(.oae-list-actions)', function() {
                var userId = $(this).find('[data-id]').attr('data-id');
                $(document).trigger('oae.trigger.manageuser', {
                    'userId': userId,
                    'context': widgetData.context
                });
            });
        };

        addBinding();
        setUpListHeader();
        getUserList();

    };
});
