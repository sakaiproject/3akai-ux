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

define(['jquery', 'oae.core', 'activityadapter'], function($, oae, ActivityAdapter) {

    return function(uid, showSettings, widgetData) {

        // Cache the widget container
        var $rootel = $('#' + uid);

        // Get the authentication strategy info for the tenant
        var authStrategyInfo = oae.api.authentication.getStrategyInfo();

        // Get the redirect URL
        var signInRedirectUrl = oae.api.authentication.getLoginRedirectUrl();

        // Variable that keeps track of the invitation info that is available in the page context,
        // if any
        var invitationInfo = null;

        // Default widget data to an empty object
        widgetData = widgetData || {};

        ////////////////////
        // Initialization //
        ////////////////////

        /**
         * Initialize the top navigation by setting up all of the menu items, submenus and
         * institutional logos
         */
        var initTopNavigation = function() {
            // Initialize the invitation in the redirect url, if any
            var parsedSignInRedirectUrl = oae.api.util.url(signInRedirectUrl);
            invitationInfo = {
                'token': parsedSignInRedirectUrl.param('invitationToken'),
                'email': parsedSignInRedirectUrl.param('invitationEmail')
            };

            initLeftMenu();
            initRightMenu();
            initInstitutionalLogo();

            // If there is a sign in redirect url and auto-login is enabled, automatically trigger
            // the signin action
            if (signInRedirectUrl && widgetData.autologin) {
                $('.topnavigation-signin-action').click();
            }
        };

        /**
         * Initialize the left hand side of the navigation. There will be different options for logged in and logged out
         * users
         */
        var initLeftMenu = function() {
            var $template = oae.data.me.anon ? $('#topnavigation-left-anonymous-template') : $('#topnavigation-left-loggedin-template');
            oae.api.util.template().render($template, {
                'authStrategyInfo': authStrategyInfo,
                'redirectUrl': signInRedirectUrl || oae.api.util.url().attr('relative')
            }, $('#topnavigation-left', $rootel));
        };

        /**
         * Initialize the right hand side of the top navigation. For anonymous users, this will contain a Sign In link
         * and Sign in dropdown. For logged in users, this will show the logout button
         */
        var initRightMenu = function() {
            if (oae.data.me.anon) {
                $('#topnavigation-right', $rootel).append(oae.api.util.template().render($('#topnavigation-right-anonymous-template', $rootel), {
                    'authStrategyInfo': authStrategyInfo,
                    'redirectUrl': signInRedirectUrl || oae.api.util.url().attr('relative'),
                    'invitationInfo': invitationInfo
                }));
            } else {
                $('#topnavigation-right', $rootel).append(oae.api.util.template().render($('#topnavigation-right-loggedin-template', $rootel)));
            }

            $('#logout-button').submit(function(e) {
                e.preventDefault();
                var self = this;
                oae.api.authentication.removeLoggedInTenanciesCookie(oae.data.me.tenant, function(err, data) {
                    self.submit();
                });
            });
        };

        /**
         * Render the institutional logos. There will be a small logos that is displayed on small screen resolutions
         * and a large logo that will be displayed on larger screens
         */
        var initInstitutionalLogo = function() {
            oae.api.util.template().render($('#topnavigation-institutional-logo-template', $rootel),
                null, $('#topnavigation-institutional-logo-container', $rootel));
        };

        ////////////////////////
        // Push notifications //
        ////////////////////////

        /**
         * Subscribe to notification push notifications, allowing for notifications that happen after the initial
         * pageload to be reflected in the unread notifications count. Alternatively, when the notification widget
         * is already open, it can be the notifications stream straight away
         */
        var setUpPushNotifications = function() {
            if (!oae.data.me.anon) {
                oae.api.push.subscribe(oae.data.me.id, 'notification', oae.data.me.signature, 'activitystreams', true, false, function(activities, message) {
                    if (message.numNewActivities && message.numNewActivities !== 0) {
                        oae.data.me.notificationsUnread = oae.data.me.notificationsUnread || 0;
                        oae.data.me.notificationsUnread += message.numNewActivities;
                    }

                    // Update the unread notification count in the top navigation
                    $('#topnavigation-notification-count', $rootel).text(oae.data.me.notificationsUnread);

                    // Update the unread notifications favicon bubble
                    oae.api.util.favicon().setBubble(oae.data.me.notificationsUnread);

                    // Show a notification about the activity when the notifications popover is not visible
                    if ($('.oae-trigger-notifications + .popover:visible', $rootel).length === 0) {
                        var sanitization = oae.api.util.security();
                        var adaptedActivities = ActivityAdapter.adapt(oae.data.me.id, oae.data.me, activities, sanitization);
                        _.each(adaptedActivities, function(adaptedActivity) {
                            var notificationBody = oae.api.util.template().render($('#topnavigation-push-notification-summary', $rootel), {'activity': adaptedActivity});
                            oae.api.util.notification(null, notificationBody, null, adaptedActivity.originalActivity['oae:activityType'] + '#' + adaptedActivity.originalActivity.published);
                        });
                    }
                });
            }
        };

        ///////////////////
        // Accessibility //
        ///////////////////

        /**
         * Set up the skip links that can be used by screenreader and keyboard users
         * to jump past the top navigation
         */
        var setUpSkipLinks = function() {
            // Focus on the target element when clicking
            // a skip link
            $rootel.on('click', '.oae-skip-link', function() {
                $($(this).attr('href')).focus();
                return false;
            });
        };


        ////////////
        // Search //
        ////////////

        /**
         * Set up the top navigation search form. When the form is submitted, the user will be
         * redirected to the search page using the entered search query
         */
        var setUpSearch = function() {
            $(document).on('submit', '#topnavigation-search-form', function() {
                var query = $.trim($('#topnavigation-search-query', $(this)).val());
                // Remove all hash characters from the search query. History.js expects to be in
                // full control of the URL hash and adding one  into the URL ourself would interfere with that
                // @see https://github.com/oaeproject/3akai-ux/issues/3872
                query = query.replace(/#/g, '');

                var defaultTab = (oae.data.me.anon) ? 'all' : 'my';
                window.location = '/search/' + defaultTab + '?q=' + oae.api.util.security().encodeForURL(query);
                return false;
            });
        };

        initTopNavigation();
        setUpSkipLinks();
        setUpSearch();
        setUpPushNotifications();
    };
});
