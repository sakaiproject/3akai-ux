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

casper.test.begin('Widget - User management', function(test) {

    /**
     * Verify that all user management elements are present
     */
    var verifyUserManagementElements = function() {
        // Verify there is a dummy list item with action buttons
        test.assertExists('#usermanagement-widget .oae-list li:first-child', 'Initial dummy list item is present');
        // Verify dummy list item has create new button
        test.assertExists('#usermanagement-widget .oae-list li:first-child #usermanagement-createuser', 'The first list item has a \'Create new\' trigger');
        // Verify dummy list item has import csv button
        test.assertExists('#usermanagement-widget .oae-list li:first-child #usermanagement-importusers', 'The first list item has a \'Import CSV\' trigger');
        // Verify create new button triggers createuser widget
        casper.click('#usermanagement-widget .oae-list li:first-child #usermanagement-createuser');
        casper.waitForSelector('#createuser-modal', function() {
            test.assertExists('#createuser-modal #createuser-modal-title', 'The createuser widget can be triggered from the dummy list item');
            casper.click('#createuser-modal .close');
        });
        // Verify import csv button triggers importusers widget
        casper.click('#usermanagement-widget .oae-list li:first-child #usermanagement-importusers');
        casper.waitForSelector('#importusers-modal', function() {
            test.assertExists('#importusers-modal #importusers-modal-title', 'The importusers widget can be triggered from the dummy list item');
            casper.click('#importusers-modal .close');
        });
        // Verify a user tile triggers manageuser widget
        casper.click('#usermanagement-widget .oae-list > li:first-child + li');
        casper.waitForSelector('#manageuser-modal', function() {
            test.assertExists('#manageuser-modal #manageuser-modal-title', 'The manageuser widget can be triggered from the user list items');
            casper.click('#manageuser-modal .close');
        });
        // Verify list options are there
        test.assertExists('#usermanagement-widget .oae-list-header-actions', 'The list options are present');
        // Verify list options contain a switch view button
        test.assertExists('#usermanagement-widget .oae-list-header-actions button[data-type="oae-list-compact"]', 'The \'Compact\' list view button is present');
        test.assertExists('#usermanagement-widget .oae-list-header-actions button[data-type="oae-list-details"]', 'The \'Details\' list view button is present');
        test.assertExists('#usermanagement-widget .oae-list-header-actions button[data-type="oae-list-grid"]', 'The \'Grid\' list view button is present');
        // Verify list options contain a search field
        test.assertExists('#usermanagement-widget .oae-list-header-search .oae-list-header-search-query', 'The search box is present');
    };

    /**
     * Verify that the users can be searched
     *
     * @param  {User}    user    User profile object to test with
     */
    var verifyUserManagementSearch = function(user) {
        // Search for something that doesn't match any results
        casper.fill('#usermanagement-widget form.form-search', {
            'search-query': '\'\'\''
        }, true);
        // Verify that no results come back and a message is shown
        casper.waitForSelector('#usermanagement-widget .oae-list .alert-info', function() {
            test.assertExists('#usermanagement-widget .oae-list .alert-info', 'No results are returned for non-matching search and a message is shown');
            // Search for the user which should return 1 result
            casper.fill('#usermanagement-widget form.form-search', {
                'search-query': user.displayName
            }, true);
            // Verify one search result comes back
            casper.waitForSelector('#usermanagement-widget .oae-list li[data-id="' + user.id + '"]', function() {
                test.assertExists('#usermanagement-widget .oae-list li[data-id="' + user.id + '"]', '1 result is returned for \'' + user.displayName + '\'');
                test.assertSelectorHasText('#usermanagement-widget .oae-list li[data-id="' + user.id + '"] .oae-tile-metadata h3 span', user.displayName, 'The returned user has the name \'' + user.displayName + '\'');
                // Reset the form
                casper.fill('#usermanagement-widget form.form-search', {
                    'search-query': ''
                }, false);
                casper.click('#usermanagement-widget form.form-search button[type="submit"]');
            });
        });
    };

    /**
     * Verify that the view mode can be changed through the list options
     */
    var verifyUserManagementViewMode = function() {
        // Toggle the list options
        casper.click('#usermanagement-widget .oae-list-header-toggle');
        // Verify compact list
        casper.click('#usermanagement-widget .oae-list-header-actions button[data-type="oae-list-compact"]');
        test.assertExists('#usermanagement-widget .oae-list.oae-list-compact', 'User management list can be switched to compact view');
        // Verify details list
        casper.click('#usermanagement-widget .oae-list-header-actions button[data-type="oae-list-details"]');
        test.assertExists('#usermanagement-widget .oae-list.oae-list-details', 'User management list can be switched to details view');
        // Switch back to grid view
        casper.click('#usermanagement-widget .oae-list-header-actions button[data-type="oae-list-grid"]');
        test.assertExists('#usermanagement-widget .oae-list.oae-list-grid', 'User management list can be switched to grid view');
    };

    casper.start(configUtil.tenantUI, function() {

        // Create a user to test with
        var user = null;
        userUtil.createUsers(1, function(users) {
            user = users[0];

            uiUtil.openAdminUserManagement(configUtil.tenantAlias);

            casper.then(function() {
                casper.echo('# Verify that the user management elements are present', 'INFO');
                userUtil.doLogIn(configUtil.adminUsername, configUtil.adminPassword);
                casper.waitForSelector('#usermanagement-widget', verifyUserManagementElements);
            });

            casper.then(function() {
                casper.echo('# Verify the user management search functionality', 'INFO');
                verifyUserManagementSearch(user);
            });

            casper.then(function() {
                casper.echo('# Verify the user management view modes', 'INFO');
                verifyUserManagementViewMode();
            });
        });

        // Log out the admin user
        userUtil.doLogOut();
    });

    casper.run(function() {
        test.done();
    });
});
