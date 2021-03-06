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

define(['jquery', 'oae.core', 'jquery.history'], function($, oae) {

    return function(uid, showSettings, widgetData) {

        // The widget container
        var $rootel = $('#' + uid);

        // Variables that will be used to keep track of the infinite scroll instances for following and followers
        var followingInfinityScroll = false;
        var followersInfinityScroll = false;

        /**
         * Initialize a new infinite scroll container that fetches the users the current user is following.
         * This will detect when a search is happening and will change the endpoint accordingly.
         */
        var getFollowing = function() {
            // Disable the previous infinite scroll
            if (followingInfinityScroll) {
                followingInfinityScroll.kill();
            }

            // Determine if there is an active query
            var query = History.getState().data.query;
            $('.oae-list-header-search-query', $rootel).val(query);

            var url = '/api/following/' + widgetData.context.id + '/following';
            if (query) {
                url = '/api/search/following/' + widgetData.context.id;
            }

             // Set up the list actions
            var initialContent = null;
            if (widgetData.canManage && !query) {
                initialContent = oae.api.util.template().render($('#network-list-actions-template', $rootel));
            }

            // Set up the infinite scroll for the users followed by the current user
            followingInfinityScroll = $('#network-following .oae-list', $rootel).infiniteScroll(url, {
                'limit': 12,
                'q': query
            }, '#following-template', {
                'initialContent': initialContent,
                'postProcessor': function(data) {
                    // Let the template know whether or not the current list
                    // is a main list or a search list, as different paging
                    // keys need to be provided for each
                    data.query = query;
                    data.displayOptions = {
                        'showCheckbox': widgetData.canManage ? true : false
                    };
                    return data;
                },
                'emptyListProcessor': function() {
                    oae.api.util.template().render($('#network-following-noresults-template', $rootel), {
                        'query': query
                    }, $('#network-following .oae-list', $rootel));
                }
            });
        };

        /**
         * Initialize a new infinite scroll container that fetches the current user's followers.
         * This will detect when a search is happening and will change the endpoint accordingly.
         */
        var getFollowers = function() {
            // Disable the previous infinite scroll
            if (followersInfinityScroll) {
                followersInfinityScroll.kill();
            }

            // Determine if there is an active query
            var query = History.getState().data.query;
            $('.oae-list-header-search-query', $rootel).val(query);

            var url = '/api/following/' + widgetData.context.id + '/followers';
            if (query) {
                url = '/api/search/followers/' + widgetData.context.id;
            }

            // Set up the infinite scroll for the content library
            followersInfinityScroll = $('#network-followers .oae-list', $rootel).infiniteScroll(url, {
                'limit': 12,
                'q': query
            }, '#followers-template', {
                'postProcessor': function(data) {
                    // Let the template know whether or not the current list
                    // is a main list or a search list, as different paging
                    // keys need to be provided for each
                    data.query = query;
                    return data;
                },
                'emptyListProcessor': function() {
                    oae.api.util.template().render($('#network-followers-noresults-template', $rootel), {
                        'query': query
                    }, $('#network-followers .oae-list', $rootel));
                }
            });
        };

        /**
         * If the current user is an anonymous user, we don't show any actions. If the user
         * is logged in, we render the list of available actions based on whether or not the
         * user can manage this list.
         */
        var setUpListHeader = function() {
            // Determine which list header actions should be available to the user viewing the list
            var listHeaderActions = [];
            if (widgetData.canManage) {
                listHeaderActions.push({
                    'icon': 'fa-times',
                    'label': oae.api.i18n.translate('__MSG__STOP_FOLLOWING__', 'network'),
                    'trigger': 'oae-trigger-unfollow'
                });
            }

            oae.api.util.template().render($('#network-list-header-template', $rootel), {'actions': listHeaderActions}, $('#network-list-header', $rootel));
        };

        /**
         * Load the list of users followed by the current user or the list of users that is following the
         * current user, depending on the current History.js state. This will also take care of displaying
         * the appropriate list header action buttons
         */
        var loadList = function() {
            // Ensure that all list items are unchecked
            $('.oae-list-selectall', $rootel).prop('checked', false);

            // Extract the list that should be loaded based on what's encoded
            // in the History.js state
            var widgetPath = History.getState().data.widgetPath || 'following';

            // Make the appropriate tab active and show the corresponding list
            $('.nav.nav-tabs > li', $rootel).removeClass('active');
            $('.tab-content > .tab-pane', $rootel).removeClass('active');
            $('#network-tab-' + widgetPath, $rootel).addClass('active');
            $('#network-' + widgetPath, $rootel).addClass('active');

            // Load the correct list and show the correct list header action buttons
            if (widgetPath === 'followers') {
                $('.oae-list-selectall', $rootel).hide();
                $('.oae-trigger-unfollow', $rootel).hide();
                getFollowers();
            } else {
                $('.oae-list-selectall', $rootel).show();
                $('.oae-trigger-unfollow', $rootel).show();
                getFollowing();
            }
        };

        /**
         * Add the different event bindings
         */
        var addBinding = function() {
            // Listen to History.js state changes
            $(window).on('statechange', function() {
                if ($rootel.is(':visible')) {
                    // Reload the selected list
                    loadList();
                }
            });

            // Update the page URL when a tab is clicked
            $('a[data-toggle="tab"]', $rootel).on('shown.bs.tab', function(ev) {
                // Push the new widget path to a new History.js state. We make sure to take the
                // existing state data parameters with us and construct a new URL based on
                // the existing base URL, allowing for page refreshing and bookmarking
                var newState = $.extend({}, History.getState().data, {
                    'widgetPath': $(ev.target).attr('data-type'),
                    'query': ''
                });
                var url = History.getState().data.basePath + '/' + newState.widgetPath;
                History.pushState(newState, $('title').text(), url);
            });

            // Refresh the list of followers and users I follow when users have been unfollowed
            $(document).on('oae.unfollow.done', getFollowing);
        };

        addBinding();
        setUpListHeader();
        loadList();

    };
});
