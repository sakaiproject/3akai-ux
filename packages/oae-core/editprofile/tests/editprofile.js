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

casper.test.begin('Widget - Edit profile', function(test) {

    /**
     * Open the edit profile modal with assertions
     */
    var openEditProfile = function() {
        casper.waitForSelector('#me-clip-container .oae-clip-content > button', function() {
            casper.click('#me-clip-container .oae-clip-content > button');
            test.assertExists('.oae-trigger-editprofile', 'Edit profile trigger exists');
            casper.click('.oae-trigger-editprofile');
            casper.waitUntilVisible('#editprofile-modal', function() {
                test.assertVisible('#editprofile-modal', 'Edit profile pane is showing after trigger');
                casper.click('#me-clip-container .oae-clip-content > button');
            });
        });
    };

    /**
     * Goes through the workflow of editing the user profile
     */
    var verifyEditProfile = function() {
        // Verify the form is present
        test.assertExists('form#editprofile-form', 'The edit profile form is present');
        test.assertExists('#editprofile-name', 'The edit profile name field is present');
        test.assertExists('#editprofile-email', 'The edit profile email field is present');
        test.assertExists('input[type="radio"][name="oae-visibility-group"]', 'The edit profile visibility field is present');

        // Fill the form
        casper.fill('form#editprofile-form', {
            'editprofile-name': 'CasperJS test user',
            'editprofile-email': 'test@example.com'
        }, false);

        // Verify the 'edit details' button is present
        test.assertExists('#editprofile-form button[type="submit"]', 'The \'Edit details\' button is present');
        // Click the submit button
        casper.click('#editprofile-form button[type="submit"]');
        // Verify that editing the profile details worked
        casper.waitForSelector('#oae-notification-container .alert', function() {
            test.assertDoesntExist('#oae-notification-container .alert.alert-error', 'Profile successfully edited');
            casper.click('#oae-notification-container .close');
        });
    };

    /**
     * Verify the form validation by checking the following:
     *     - Try submitting a form without putting in an empty form
     *     - Try submitting a form without putting in a name
     *     - Try submitting a form without putting in an email address
     *     - Try submitting a form while putting in an invalid email address
     */
    var verifyEditProfileValidation = function() {
        // Submit an empty form
        // Fill the form
        casper.fill('form#editprofile-form', {
            'editprofile-name': '',
            'editprofile-email': ''
        }, false);
        // Click the submit button
        casper.click('#editprofile-form button[type="submit"]');
        // Verify that an error label is shown
        test.assertExists('#editprofile-name-error', 'Edit profile form successfully validated empty form');

        // Submit a form without a name
        // Fill the form
        casper.fill('form#editprofile-form', {
            'editprofile-name': '',
            'editprofile-email': 'test@example.com'
        }, false);
        // Click the submit button
        casper.click('#editprofile-form button[type="submit"]');
        // Verify that an error label is shown
        test.assertExists('#editprofile-name-error', 'Edit profile form successfully validated empty name');

        // Submit a form without email address
        // Fill the form
        casper.fill('form#editprofile-form', {
            'editprofile-name': 'Roy Trenneman',
            'editprofile-email': ''
        }, false);
        // Click the submit button
        casper.click('#editprofile-form button[type="submit"]');
        // Verify that an error label is shown
        test.assertExists('#editprofile-email-error', 'Edit profile form successfully validated empty email');

        // Submit a form with invalid email address
        // Fill the form
        casper.fill('form#editprofile-form', {
            'editprofile-name': 'Roy Trenneman',
            'editprofile-email': 'incorrect.com'
        }, false);
        // Click the submit button
        casper.click('#editprofile-form button[type="submit"]');
        // Verify that an error label is shown
        test.assertExists('#editprofile-email-error', 'Edit profile form successfully validated incorrect email');
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a couple of users to test editprofile with
        userUtil.createUsers(1, function(user1) {
            // Login with that user
            userUtil.doLogIn(user1.username, user1.password);

            uiUtil.openMe();

            // Open the editprofile modal
            casper.then(function() {
                casper.echo('# Verify open edit profile modal', 'INFO');
                openEditProfile();
            });

            // Edit the profile
            casper.then(function() {
                casper.echo('# Verify edit profile', 'INFO');
                verifyEditProfile();
            });

            // Verify the edit profile form validation
            uiUtil.openMe();
            casper.then(function() {
                casper.echo('# Verify edit profile validation', 'INFO');
                casper.then(openEditProfile);
                casper.then(verifyEditProfileValidation);
            });

            // Log out at the end of the test
            userUtil.doLogOut();
        });
    });

    casper.run(function() {
        test.done();
    });
});
