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

casper.test.begin('Widget - Unfollow', function(test) {

    /**
     * Open the delete resources modal with assertions
     */
    var verifyUnfollowingModal = function() {
        casper.waitForSelector('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]', function() {
            casper.click('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]');
            test.assertExists('#network-widget .oae-list-header-actions button.oae-trigger-unfollow:not([disabled])', 'Verify that the unfollow button is enabled after user selection');
            casper.click('#network-widget .oae-list-header-actions button.oae-trigger-unfollow');
            casper.waitUntilVisible('#unfollow-modal', function() {
                test.assertVisible('#unfollow-modal', 'Verify that the unfollow pane is showing after trigger');
                casper.click('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]');
            });
        });
    };

    /**
     * Open the delete resources modal
     */
    var openUnfollowingModal = function() {
        casper.waitForSelector('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]', function() {
            casper.click('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]');
            casper.click('#network-widget .oae-list-header-actions button.oae-trigger-unfollow');
            casper.waitUntilVisible('#unfollow-modal', function() {
                casper.click('li.oae-list-actions + li .oae-list-grid-item input[type="checkbox"]');
            });
        });
    };

    /**
     * Verify that the unfollow elements are present
     */
    var verifyUnfollowingElements = function() {
        // Verify that the users that will be unfollowed are listed
        test.assertExists('#unfollow-modal #unfollow-selected-container li', 'Verify that the users that will be unfollowed are listed');
        // Verify there is a confirmation message shown in the UI
        test.assertExists('#unfollow-modal #unfollow-list-container h4', 'Verify that a confirmation message is shown before unfollowing the users');
        // Verify the cancel button is present
        test.assertExists('#unfollow-modal .modal-footer button[data-dismiss="modal"]', 'Verify that the cancel button is present');
        // Verify the unfollow button is present
        test.assertExists('#unfollow-modal .modal-footer button#unfollow-unfollow', 'Verify that the \'Unfollow\' button is present');
    };

    /**
     * Verify unfollowing a user
     */
    var verifyUnfollowingUser = function() {
        casper.click('#unfollow-modal .modal-footer button#unfollow-unfollow');
        casper.waitForSelector('#oae-notification-container .alert', function() {
            test.assertDoesntExist('#oae-notification-container .alert.alert-error', 'Verify a user can be unfollowed');
            // Verify that the user is removed from the list when unfollowed
            test.assertDoesntExist('#network-widget #network-following .oae-list li:first-child + li', 'Verify an unfollowed user is removed from the following list');
        });
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a couple of users to test with
        userUtil.createUsers(2, function(user1, user2) {
            // Login with that user
            userUtil.doLogIn(user1.username, user1.password);

            casper.then(function() {
                // User1 follows user 2
                followUtil.follow(user2.id, function() {

                    uiUtil.openMyNetwork();

                    casper.then(function() {
                        casper.echo('# Verify unfollowing modal', 'INFO');
                        casper.waitForSelector('#network-widget .oae-list.oae-list-grid li', verifyUnfollowingModal);
                    });

                    casper.then(function() {
                        casper.echo('# Verify unfollowing elements', 'INFO');
                        verifyUnfollowingElements();
                    });

                    casper.then(function() {
                        casper.echo('# Verify unfollowing a user', 'INFO');
                        verifyUnfollowingUser();
                    });

                    // Log out at the end of the test
                    userUtil.doLogOut();
                });
            });
        });
    });

    casper.run(function() {
        test.done();
    });
});
