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

casper.test.begin('Widget - Members', function(test) {
    /**
     * Verify that the members can be searched
     */
    var verifyMembersSearch = function(user) {
        // Search for something that doesn't match any results
        casper.fill('form.form-search', {
            'search-query': '---'
        }, false);
        casper.click('form.form-search button[type="submit"]');
        // Verify that no results come back and a message is shown
        casper.waitForSelector('.oae-list .alert-info', function() {
            test.assertExists('.oae-list .alert-info', 'No results are returned for non-matching search and a message is shown');
            // Search for 'baloons' which should return 1 result
            casper.fill('form.form-search', {
                'search-query': user.displayName
            }, false);
            casper.click('form.form-search button[type="submit"]');
            // Verify one search result comes back
            casper.waitForSelector('.oae-list li', function() {
                test.assertExists('.oae-list li', '1 result is returned for \'' + user.displayName + '\'');
                test.assertSelectorHasText('.oae-list li .oae-tile-metadata a', user.displayName, 'The returned user has the name \'' + user.displayName + '\'');
                // Reset the form
                casper.fill('form.form-search', {
                    'search-query': ''
                }, false);
                casper.click('form.form-search button[type="submit"]');
            });
        });
    };

    /**
     * Verify that the view mode can be changed through the list options
     */
    var verifyMembersViewMode = function() {
        // Toggle the list options
        casper.click('.oae-list-header-toggle');
        // Verify compact list
        casper.click('#members-widget .oae-list-header-actions button[data-type="oae-list-compact"]');
        test.assertExists('.oae-list.oae-list-compact', 'Members can be switched to compact view');
        // Verify details list
        casper.click('#members-widget .oae-list-header-actions button[data-type="oae-list-details"]');
        test.assertExists('.oae-list.oae-list-details', 'Members can be switched to details view');
        // Switch back to grid view
        casper.click('#members-widget .oae-list-header-actions button[data-type="oae-list-grid"]');
        test.assertExists('.oae-list.oae-list-grid', 'Members can be switched to grid view');
    };

    /**
     * Verify if all elements are present in the members widget
     */
    var verifyMembersElements = function() {
        // Verify there is a dummy list item with action buttons
        test.assertExists('#members-widget .oae-list li:first-child', 'Initial dummy list item is present');
        // Verify dummy list item has add members button
        test.assertExists('#members-widget .oae-list li:first-child .group-trigger-manageaccess-add', 'The first list item has a \'Add members\' trigger');
        // Verify add members button triggers manageaccess widget
        casper.click('#members-widget .oae-list li:first-child .group-trigger-manageaccess-add');
        casper.waitForSelector('#manageaccess-modal', function() {
            test.assertExists('#manageaccess-modal #manageaccess-modal-title', 'The manageaccess widget can be triggered to add members');
            casper.click('#manageaccess-modal .close');
        });
        // Verify dummy list item has add members button
        test.assertExists('#members-widget .oae-list li:first-child .group-trigger-manageaccess', 'The first list item has a \'Manage access\' trigger');
        // Verify add members button triggers manageaccess widget
        casper.click('#members-widget .oae-list li:first-child .group-trigger-manageaccess');
        casper.waitForSelector('#manageaccess-modal', function() {
            test.assertExists('#manageaccess-modal #manageaccess-modal-title', 'The manageaccess widget can be triggered to manage access');
            casper.click('#manageaccess-modal .close');
        });
        // Verify list options are there
        test.assertExists('#members-widget .oae-list-header-actions', 'The list options are present');
        // Verify list options contain a switch view button
        test.assertExists('#members-widget .oae-list-header-actions button[data-type="oae-list-compact"]', 'The \'Compact\' list view button is present');
        test.assertExists('#members-widget .oae-list-header-actions button[data-type="oae-list-details"]', 'The \'Details\' list view button is present');
        test.assertExists('#members-widget .oae-list-header-actions button[data-type="oae-list-grid"]', 'The \'Grid\' list view button is present');
        // Verify list options contain a search field
        test.assertExists('#members-widget .oae-list-header-search .oae-list-header-search-query', 'The search box is present');
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a couple of users to test with
        userUtil.createUsers(1, function(user1) {
            // Login with that user
            userUtil.doLogIn(user1.username, user1.password);

            groupUtil.createGroup(null, null, null, null, null, null, function(err, groupProfile) {

                uiUtil.openGroupMembersProfile(groupProfile);

                casper.then(function() {
                    casper.echo('# Verify members elements present', 'INFO');
                    verifyMembersElements();
                });

                casper.then(function() {
                    casper.echo('# Verify members view modes', 'INFO');
                    verifyMembersViewMode();
                });

                casper.then(function() {
                    casper.echo('# Verify members search', 'INFO');
                    casper.wait(configUtil.searchWaitTime, function() {
                        verifyMembersSearch(user1);
                    });
                });

                // Log out at the end of the test
                userUtil.doLogOut();
            });
        });
    });

    casper.run(function() {
        test.done();
    });
});
